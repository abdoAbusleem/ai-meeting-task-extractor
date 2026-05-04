import { Module } from '@nestjs/common';
import { HttpModule } from '@nestjs/axios';
import { JiraService } from './jira.service';

@Module({
  imports: [HttpModule],
  providers: [JiraService],
  exports: [JiraService],
})
export class JiraModule {}