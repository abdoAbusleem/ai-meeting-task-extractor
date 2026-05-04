import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExtractedIssue } from '../ai/dto/issue.dto';

export interface JiraUser {
  jiraHost: string;
  jiraEmail: string;
  jiraApiToken: string;
  jiraProjectKey: string;
}

export interface CreatedJiraIssue {
  key: string;
  url: string;
  title: string;
}

@Injectable()
export class JiraService {
  private readonly logger = new Logger(JiraService.name);

  constructor(private readonly httpService: HttpService) {}

  async createIssue(
    issue: ExtractedIssue,
    user: JiraUser,
  ): Promise<CreatedJiraIssue> {
    const { jiraHost, jiraEmail, jiraApiToken, jiraProjectKey } = user;

    const token = Buffer.from(`${jiraEmail}:${jiraApiToken}`).toString('base64');

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${jiraHost}/rest/api/3/issue`,
          {
            fields: {
              project: { key: jiraProjectKey },
              summary: issue.title,
              description: {
                type: 'doc',
                version: 1,
                content: [
                  {
                    type: 'paragraph',
                    content: [
                      {
                        type: 'text',
                        text: issue.body,
                      },
                    ],
                  },
                ],
              },
              issuetype: { name: this.mapLabelToIssueType(issue.labels) },
            },
          },
          {
            headers: {
              Authorization: `Basic ${token}`,
              'Content-Type': 'application/json',
            },
          },
        ),
      );

      this.logger.log(`Jira issue created: ${data.key}`);

      return {
        key: data.key,
        url: `${jiraHost}/browse/${data.key}`,
        title: issue.title,
      };
    } catch (error) {
      this.logger.error('Jira API failed', error);
      throw new InternalServerErrorException('Failed to create Jira issue');
    }
  }

  private mapLabelToIssueType(labels: string[]): string {
    if (labels.includes('bug')) return 'Bug';
    if (labels.includes('feature')) return 'Story';
    return 'Task';
  }
}