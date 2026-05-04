import {
  CanActivate,
  ExecutionContext,
  ForbiddenException,
  Injectable,
} from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { Role } from '@prisma/client';
import { Request } from 'express';

import { REQUEST_USER_KEY } from '../constants';
import { ROLES_KEY } from '../decorators/roles.decorator';
import { CurrentUserData } from '../interfaces/current-user.interface';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredRoles = this.reflector.getAllAndOverride<Role[]>(ROLES_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredRoles || requiredRoles.length === 0) {
      return true;
    }

    const request = context.switchToHttp().getRequest<Request>();
    const currentUser = (request as Request & Record<string, CurrentUserData>)[
      REQUEST_USER_KEY
    ];

    if (!currentUser) {
      throw new ForbiddenException('Forbidden resource');
    }

    if (!requiredRoles.includes(currentUser.role)) {
      throw new ForbiddenException('Insufficient permissions');
    }

    return true;
  }
}
