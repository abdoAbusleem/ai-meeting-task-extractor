import {
  ForbiddenException,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { Role } from '@prisma/client';

import { CurrentUserData } from '../../common/interfaces/current-user.interface';
import { RedisService } from '../../redis/redis.service';
import { AuthErrors } from '../auth.errors';

export interface JwtPayload {
  sub: string;
  email: string;
  role: Role;
  token_version: number;
}

@Injectable()
export class JwtStrategy {
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(private readonly redisService: RedisService) {}

  async validate(payload: JwtPayload): Promise<CurrentUserData> {
    this.assertPayload(payload);

    let redisTokenVersion: number | null = null;
    try {
      redisTokenVersion = await this.redisService.getTokenVersion(payload.sub);
    } catch (error) {
      this.logger.warn(
        `Failed to read Redis token version for user ${payload.sub}: ${(error as Error).message}`,
      );
    }

    if (
      redisTokenVersion !== null &&
      redisTokenVersion !== payload.token_version
    ) {
      throw new UnauthorizedException(AuthErrors.SESSION_VERSION_INVALID);
    }

    try {
      const isUserActive = await this.redisService.getUserActive(payload.sub);
      if (isUserActive === false) {
        throw new ForbiddenException(AuthErrors.ACCOUNT_INACTIVE);
      }
    } catch (error) {
      if (error instanceof ForbiddenException) {
        throw error;
      }

      this.logger.warn(
        `Failed to read Redis active state for user ${payload.sub}: ${(error as Error).message}`,
      );
    }

    return {
      id: payload.sub,
      email: payload.email,
      role: payload.role,
      token_version: payload.token_version,
    };
  }

  private assertPayload(payload: JwtPayload): void {
    if (
      !payload.sub ||
      !payload.email ||
      !payload.role ||
      payload.token_version === undefined ||
      payload.token_version === null
    ) {
      throw new UnauthorizedException(AuthErrors.INVALID_TOKEN_PAYLOAD);
    }
  }
}