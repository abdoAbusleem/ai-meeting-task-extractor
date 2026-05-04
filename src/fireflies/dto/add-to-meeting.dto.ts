import { IsUrl } from "class-validator";

 export class CreateMeetingDto {
  @IsUrl()
  meetingUrl: string; 
}