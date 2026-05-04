import {
  Injectable,
  Logger,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { FirefliesService } from '../fireflies/fireflies.service';
import { AiService } from '../ai/ai.service';
import { GithubService } from '../github/github.service';
import { JiraService } from '../jira/jira.service';

@Injectable()
export class WebhookService {
  private readonly logger = new Logger(WebhookService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly firefliesService: FirefliesService,
    private readonly aiService: AiService,
    private readonly githubService: GithubService,
    private readonly jiraService: JiraService,
  ) {}

  async handleTranscriptReady(payload: any) {
    const transcriptId = payload?.meetingId || payload?.transcriptId;

    if (!transcriptId) {
      this.logger.warn('Webhook received with no transcriptId');
      return { message: 'No transcriptId found' };
    }

    // ١. جيب آخر Meeting pending من غير transcriptId
    const meeting = await this.prismaService.meeting.findFirst({
      where: {
        status: 'pending',
        transcriptId: null,
      },
      include: {
        user: {
          select: {
            id: true,
            githubToken: true,
            githubOwner: true,
            githubRepo: true,
            jiraHost: true,
            jiraEmail: true,
            jiraApiToken: true,
            jiraProjectKey: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    if (!meeting) {
      this.logger.warn('No pending meeting found');
      return { message: 'Meeting not found' };
    }

    // ٢. احفظ الـ transcriptId وغير الـ Status
    await this.prismaService.meeting.update({
      where: { id: meeting.id },
      data: {
        transcriptId,
        status: 'processing',
      },
    });

    try {
      // ٣. جيب الـ Transcript
      this.logger.log(`Fetching transcript: ${transcriptId}`);
      const transcript = await this.firefliesService.getTranscript(transcriptId);

      // ٤. بعت الـ Transcript للـ AI
      this.logger.log('Sending transcript to AI...');
      const issues = await this.aiService.extractIssues(transcript);

      if (!issues.length) {
        this.logger.log('No issues extracted from transcript');
        await this.prismaService.meeting.update({
          where: { id: meeting.id },
          data: { status: 'completed' },
        });
        return { message: 'No issues found in transcript' };
      }

      // ٥. ارفع الـ Issues
      const { user } = meeting;
      const createdIssues = [];

      for (const issue of issues) {
        // GitHub
        if (user.githubToken && user.githubOwner && user.githubRepo) {
          const githubIssue = await this.githubService.createIssue(
            issue,
            user.githubToken,
            user.githubOwner,
            user.githubRepo,
          );

          await this.prismaService.issue.create({
            data: {
              title: issue.title,
              body: issue.body,
              platform: 'github',
              status: 'created',
              externalId: String(githubIssue.number),
              externalUrl: githubIssue.url,
              meetingId: meeting.id,
            },
          });

          createdIssues.push(githubIssue);
        }

        // Jira
        if (user.jiraApiToken && user.jiraHost && user.jiraEmail && user.jiraProjectKey) {
          const jiraIssue = await this.jiraService.createIssue(
            issue,
            {
              jiraHost: user.jiraHost,
              jiraEmail: user.jiraEmail,
              jiraApiToken: user.jiraApiToken,
              jiraProjectKey: user.jiraProjectKey,
            },
          );

          await this.prismaService.issue.create({
            data: {
              title: issue.title,
              body: issue.body,
              platform: 'jira',
              status: 'created',
              externalId: jiraIssue.key,
              externalUrl: jiraIssue.url,
              meetingId: meeting.id,
            },
          });

          createdIssues.push(jiraIssue);
        }
      }

      // ٦. غير الـ Status لـ completed
      await this.prismaService.meeting.update({
        where: { id: meeting.id },
        data: { status: 'completed' },
      });

      this.logger.log(`Created ${createdIssues.length} issues`);
      return {
        message: 'Issues created successfully',
        count: createdIssues.length,
      };

    } catch (error) {
      this.logger.error('Webhook processing failed', error);
      await this.prismaService.meeting.update({
        where: { id: meeting.id },
        data: { status: 'failed' },
      });
      throw error;
    }
  }
}  