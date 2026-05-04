import {
  Injectable,
  Logger,
  BadRequestException,
  NotFoundException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { FirefliesService } from '../fireflies/fireflies.service';
import { CreateMeetingDto } from './dto/create-meeting.dto';

@Injectable()
export class MeetingService {
  private readonly logger = new Logger(MeetingService.name);

  constructor(
    private readonly prismaService: PrismaService,
    private readonly firefliesService: FirefliesService,
  ) {}

  async create(userId: string, dto: CreateMeetingDto) {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        githubToken: true,
        jiraApiToken: true,
      },
    });

    if (!user) throw new NotFoundException('User not found');

    if (!user.githubToken && !user.jiraApiToken) {
      throw new BadRequestException(
        'Please set GitHub or Jira credentials first',
      );
    }

await this.firefliesService.addBotToMeeting(dto.meetingUrl);

    const meeting = await this.prismaService.meeting.create({
      data: {
        meetingUrl: dto.meetingUrl,
        status: 'pending',
        userId,
      },
    });

    this.logger.log(`Meeting created: ${meeting.id}`);

    return {
      message: 'Bot added to meeting successfully',
      meetingId: meeting.id,
    };
  }

  async findAll(userId: string) {
    return this.prismaService.meeting.findMany({
      where: { userId },
      include: { issues: true },
      orderBy: { createdAt: 'desc' },
    });
  }

  async findOne(id: string, userId: string) {
    const meeting = await this.prismaService.meeting.findFirst({
      where: { id, userId },
      include: { issues: true },
    });

    if (!meeting) throw new NotFoundException('Meeting not found');

    return meeting;
  }
}