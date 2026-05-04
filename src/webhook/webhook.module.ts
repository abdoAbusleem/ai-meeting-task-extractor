import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FirefliesModule } from '../fireflies/fireflies.module';
import { AiModule } from '../ai/ai.module';
import { GithubModule } from '../github/github.module';
import { JiraModule } from '../jira/jira.module';
import { WebhookController } from './webhook.controller';
import { WebhookService } from './webhook.service';

@Module({
  imports: [
    PrismaModule,
    FirefliesModule,
    AiModule,
    GithubModule,
    JiraModule,
  ],
  controllers: [WebhookController],
  providers: [WebhookService],
})
export class WebhookModule {}