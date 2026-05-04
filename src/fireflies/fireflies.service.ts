import {
  Injectable,
  Logger,
  BadRequestException,
  InternalServerErrorException,
} from '@nestjs/common';
import { HttpService } from '@nestjs/axios';
import { ConfigService } from '@nestjs/config';
import { firstValueFrom } from 'rxjs';

@Injectable()
export class FirefliesService {
  private readonly logger = new Logger(FirefliesService.name);
  private readonly API_URL = 'https://api.fireflies.ai/graphql';
  private readonly apiKey: string;

  constructor(
    private readonly httpService: HttpService,
    private readonly configService: ConfigService,
  ) {
    this.apiKey = this.configService.getOrThrow('FIREFLIES_API_KEY');
  }

  async addBotToMeeting(meetingUrl: string): Promise<string> {
    const query = `
      mutation AddToLiveMeeting($url: String!) {
        addToLiveMeeting(meeting_link: $url) {
          message
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          this.API_URL,
          { query, variables: { url: meetingUrl } },
          { headers: { Authorization: `Bearer ${this.apiKey}` } },
        ),
      );

      if (data.errors) {
        this.logger.error('Fireflies API error', data.errors);
        throw new BadRequestException('Failed to add bot to meeting');
      }

      return data.data.addToLiveMeeting.message;

    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Fireflies request failed', error);
      throw new InternalServerErrorException('Fireflies service unavailable');
    }
  }

  async getTranscript(transcriptId: string): Promise<string> {
    const query = `
      query GetTranscript($id: String!) {
        transcript(id: $id) {
          sentences {
            speaker_name
            text
          }
        }
      }
    `;

    try {
      const { data } = await firstValueFrom(
        this.httpService.post(
          this.API_URL,
          { query, variables: { id: transcriptId } },
          { headers: { Authorization: `Bearer ${this.apiKey}` } },
        ),
      );

      if (data.errors) {
        this.logger.error('Fireflies transcript error', data.errors);
        throw new BadRequestException('Failed to fetch transcript');
      }

      const sentences = data.data.transcript.sentences;
      return sentences
        .map((s: { speaker_name: string; text: string }) =>
          `${s.speaker_name}: ${s.text}`,
        )
        .join('\n');

    } catch (error) {
      if (error instanceof BadRequestException) throw error;
      this.logger.error('Fireflies transcript request failed', error);
      throw new InternalServerErrorException('Failed to get transcript');
    }
  }
}