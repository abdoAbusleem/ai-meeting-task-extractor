import {
  Injectable,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';

import { PrismaService } from '../prisma/prisma.service';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { UserErrorMessages } from './users.errors';
import { PublicUser, publicUserSelect } from './users.select';

@Injectable()
export class UsersService {
  constructor(private readonly prismaService: PrismaService) {}

  async getMe(userId: string): Promise<PublicUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: publicUserSelect,
    });

    if (!user) throw new NotFoundException(UserErrorMessages.USER_NOT_FOUND);
    if (!user.is_active)
      throw new UnauthorizedException(UserErrorMessages.USER_ACCOUNT_INACTIVE);

    return user;
  }

  async updateIntegrations(
    userId: string,
    dto: UpdateIntegrationsDto,
  ): Promise<PublicUser> {
    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
    });

    if (!user) throw new NotFoundException(UserErrorMessages.USER_NOT_FOUND);

    return this.prismaService.user.update({
      where: { id: userId },
      data: {
        ...(dto.githubToken && { githubToken: dto.githubToken }),
        ...(dto.githubOwner && { githubOwner: dto.githubOwner }),
        ...(dto.githubRepo && { githubRepo: dto.githubRepo }),
        ...(dto.jiraHost && { jiraHost: dto.jiraHost }),
        ...(dto.jiraEmail && { jiraEmail: dto.jiraEmail }),
        ...(dto.jiraApiToken && { jiraApiToken: dto.jiraApiToken }),
        ...(dto.jiraProjectKey && { jiraProjectKey: dto.jiraProjectKey }),
      },
      select: publicUserSelect,
    });
  }
}