import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';

import { AuthModule } from './auth/auth.module';
import {
  appConfig,
  jwtConfig,
  redisConfig,
  swaggerConfig,
  validate,
} from './config';
import { JwtAuthGuard } from './common/guards/jwt-auth.guard';
import { RolesGuard } from './common/guards/roles.guard';
import { PrismaModule } from './prisma/prisma.module';
import { RedisModule } from './redis/redis.module';
import { UsersModule } from './users/users.module';
import { MeetingModule } from './meeting/meeting.module';
import { FirefliesModule } from './fireflies/fireflies.module';
import { AiModule } from './ai/ai.module';
import { WebhookModule } from './webhook/webhook.module';
import { ThrottlerModule, ThrottlerGuard } from '@nestjs/throttler';
import { GithubModule } from './github/github.module';
import { JiraModule } from './jira/jira.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig, jwtConfig, redisConfig, swaggerConfig],
      validate,
    }),
    ThrottlerModule.forRoot([{
      ttl: 60000, 
      limit: 10,  
    }]),
    PrismaModule,
    RedisModule,
    AuthModule,
    UsersModule,
    MeetingModule,
    FirefliesModule,
    AiModule,
    WebhookModule,
    GithubModule,
    JiraModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: JwtAuthGuard,
    },
    {
      provide: APP_GUARD,
      useClass: RolesGuard,
    },
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
export class AppModule {}
