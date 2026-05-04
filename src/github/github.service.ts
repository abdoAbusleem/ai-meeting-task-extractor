import {
  Injectable,
  Logger,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { firstValueFrom } from 'rxjs';
import { ExtractedIssue } from '../ai/dto/issue.dto';

export interface CreatedGithubIssue {
  number: number;
  url: string;
  title: string;
}

@Injectable()
export class GithubService {
  private readonly logger = new Logger(GithubService.name);
  private readonly API_URL = 'https://api.github.com';

  constructor(private readonly httpService: HttpService) {}

  async createIssue(
    issue: ExtractedIssue,
    token: string,
    owner: string,
    repo: string,
  ): Promise<CreatedGithubIssue> {
    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          `${this.API_URL}/repos/${owner}/${repo}/issues`,
          {
            title: issue.title,
            body: issue.body,
            labels: issue.labels,
          },
          {
            headers: {
              Authorization: `Bearer ${token}`,
              Accept: 'application/vnd.github.v3+json',
            },
          },
        ),
      );

      this.logger.log(`GitHub issue created: #${data.number}`);

      return {
        number: data.number,
        url: data.html_url,
        title: data.title,
      };
    } catch (error) {
      this.logger.error('GitHub API failed', error);
      throw new InternalServerErrorException('Failed to create GitHub issue');
    }
  }
}