import { IsUrl } from 'class-validator';
import { ApiProperty } from '@nestjs/swagger';

export class CreateMeetingDto {
  @ApiProperty({ example: 'https://zoom.us/j/123456789' })
  @IsUrl()
  meetingUrl: string;
}