import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Inject,
  Injectable,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { Reflector } from '@nestjs/core';
import { JwtService } from '@nestjs/jwt';
import { Request } from 'express';

import { JwtPayload, JwtStrategy } from '../../auth/strategies/jwt.strategy';
import appConfig from '../../config/app.config';
import jwtConfig from '../../config/jwt.config';
import { REQUEST_USER_KEY } from '../constants';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator';
import { CurrentUserData } from '../interfaces/current-user.interface';

@Injectable()
export class JwtAuthGuard implements CanActivate {
  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    @Inject(appConfig.KEY)
    private readonly appConfiguration: ConfigType<typeof appConfig>,
    private readonly jwtService: JwtService,
    private readonly reflector: Reflector,
    private readonly jwtStrategy: JwtStrategy,
  ) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const token = this.getAccessToken(request);

    if (!token) {
      throw new UnauthorizedException('Access token is required');
    }

    try {
      const payload = await this.jwtService.verifyAsync<JwtPayload>(token, {
        secret: this.jwtConfiguration.accessTokenSecret,
      });

      const currentUser = await this.jwtStrategy.validate(payload);
      (request as Request & Record<string, CurrentUserData>)[REQUEST_USER_KEY] =
        currentUser;
    } catch (error) {
      if (
        error instanceof UnauthorizedException ||
        error instanceof ForbiddenException
      ) {
        throw error;
      }

      throw new UnauthorizedException('Invalid or expired access token');
    }

    return true;
  }

  private getAccessToken(request: Request): string | undefined {
    const cookieToken = request.cookies?.[this.appConfiguration.accessCookieName];
    if (cookieToken) {
      return cookieToken;
    }

    const [type, token] = request.headers.authorization?.split(' ') ?? [];
    if (type === 'Bearer' && token) {
      return token;
    }

    return undefined;
  }
}
