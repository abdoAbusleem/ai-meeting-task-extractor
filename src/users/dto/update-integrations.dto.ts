import { IsOptional, IsString, IsUrl } from 'class-validator';

export class UpdateIntegrationsDto {
  @IsOptional()
  @IsString()
  githubToken?: string;

  @IsOptional()
  @IsString()
  githubOwner?: string;

  @IsOptional()
  @IsString()
  githubRepo?: string;

  @IsOptional()
  @IsUrl()
  jiraHost?: string;

  @IsOptional()
  @IsString()
  jiraEmail?: string;

  @IsOptional()
  @IsString()
  jiraApiToken?: string;

  @IsOptional()
  @IsString()
  jiraProjectKey?: string;
}