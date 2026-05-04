import {
  Body,
  Controller,
  Get,
  Param,
  Post,
} from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { CreateMeetingDto } from './dto/create-meeting.dto';
import { MeetingService } from './meeting.service';

@ApiTags('meetings')
@ApiBearerAuth()
@Controller('meetings')
export class MeetingController {
  constructor(private readonly meetingService: MeetingService) {}

  @Post()
  @ApiOperation({ summary: 'Add bot to meeting' })
  create(
    @CurrentUser('id') userId: string,
    @Body() dto: CreateMeetingDto,
  ) {
    return this.meetingService.create(userId, dto);
  }

  @Get()
  @ApiOperation({ summary: 'Get all meetings for current user' })
  findAll(@CurrentUser('id') userId: string) {
    return this.meetingService.findAll(userId);
  }

  @Get(':id')
  @ApiOperation({ summary: 'Get meeting by id' })
  findOne(
    @Param('id') id: string,
    @CurrentUser('id') userId: string,
  ) {
    return this.meetingService.findOne(id, userId);
  }
}