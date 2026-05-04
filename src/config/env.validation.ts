import { plainToInstance } from 'class-transformer';
import {
  IsIn,
  IsNotEmpty,
  IsNumber,
  IsOptional,
  IsString,
  validateSync,
} from 'class-validator';

class EnvironmentVariables {
  @IsIn(['development', 'production', 'test'])
  NODE_ENV: string;

  @IsNumber()
  PORT: number;

  @IsString()
  @IsNotEmpty()
  DATABASE_URL: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_SECRET: string;

  @IsString()
  @IsNotEmpty()
  JWT_ACCESS_TOKEN_TTL: string;

  @IsString()
  @IsNotEmpty()
  JWT_REFRESH_TOKEN_TTL: string;

  @IsString()
  @IsNotEmpty()
  FRONTEND_URL: string;

  @IsOptional()
  @IsString()
  COOKIE_DOMAIN?: string;

  @IsIn(['true', 'false'])
  COOKIE_SECURE: string;

  @IsIn(['strict', 'lax', 'none'])
  COOKIE_SAME_SITE: 'strict' | 'lax' | 'none';

  @IsString()
  @IsNotEmpty()
  ACCESS_COOKIE_NAME: string;

  @IsString()
  @IsNotEmpty()
  REFRESH_COOKIE_NAME: string;

  @IsNumber()
  ACCESS_COOKIE_MAX_AGE_MS: number;

  @IsNumber()
  REFRESH_COOKIE_MAX_AGE_MS: number;

  @IsString()
  @IsNotEmpty()
  REDIS_HOST: string;

  @IsNumber()
  REDIS_PORT: number;

  @IsOptional()
  @IsString()
  REDIS_USERNAME?: string;

  @IsOptional()
  @IsString()
  REDIS_PASSWORD?: string;

  @IsNumber()
  REDIS_DATABASE: number;

  @IsString()
  @IsNotEmpty()
  REDIS_KEY_PREFIX: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_SITE_TITLE: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_DOC_TITLE: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_DOC_DESCRIPTION: string;

  @IsString()
  @IsNotEmpty()
  SWAGGER_DOC_VERSION: string;
  
  @IsString()
  @IsNotEmpty()
  FIREFLIES_API_KEY: string;

  @IsString()
  @IsNotEmpty()
  GEMINI_API_KEY: string;
}



export function validate(config: Record<string, unknown>) {
  const validatedConfig = plainToInstance(EnvironmentVariables, config, {
    enableImplicitConversion: true,
  });

  const errors = validateSync(validatedConfig, {
    skipMissingProperties: false,
  });

  if (errors.length > 0) {
    const errorMessage = errors
      .map((error) => Object.values(error.constraints ?? {}).join(', '))
      .join('\n');

    throw new Error(errorMessage);
  }

  return validatedConfig;
}
