import { Module } from '@nestjs/common';
import { PrismaModule } from '../prisma/prisma.module';
import { FirefliesModule } from '../fireflies/fireflies.module';
import { MeetingController } from './meeting.controller';
import { MeetingService } from './meeting.service';

@Module({
  imports: [PrismaModule, FirefliesModule],
  controllers: [MeetingController],
  providers: [MeetingService],
  exports: [MeetingService],
})
export class MeetingModule {}