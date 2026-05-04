import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { ConfigModule } from '@nestjs/config';
import { FirefliesService } from './fireflies.service';

@Module({
  imports: [HttpModule, ConfigModule],
  providers: [FirefliesService],
  exports: [FirefliesService],
})
export class FirefliesModule {}