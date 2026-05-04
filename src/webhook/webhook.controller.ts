import {
  Controller,
  Post,
  Body,
  Logger,
} from '@nestjs/common';
import { ApiTags, ApiOperation } from '@nestjs/swagger';
import { Public } from '../common/decorators/public.decorator';
import { WebhookService } from './webhook.service';

@ApiTags('webhook')
@Controller('webhook')
export class WebhookController {
  private readonly logger = new Logger(WebhookController.name);

  constructor(private readonly webhookService: WebhookService) {}

  @Public()
  @Post('fireflies')
  @ApiOperation({ summary: 'Receive Fireflies transcript webhook' })
  async handleFirefliesWebhook(@Body() payload: any) {
    this.logger.log(`Webhook received: ${JSON.stringify(payload)}`);
    return this.webhookService.handleTranscriptReady(payload);
  }
}