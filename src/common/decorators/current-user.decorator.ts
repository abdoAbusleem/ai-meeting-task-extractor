import { ExecutionContext, createParamDecorator } from '@nestjs/common';

import { REQUEST_USER_KEY } from '../constants';
import { CurrentUserData } from '../interfaces/current-user.interface';

export const CurrentUser = createParamDecorator(
  (
    field: keyof CurrentUserData | undefined,
    ctx: ExecutionContext,
  ): CurrentUserData | CurrentUserData[keyof CurrentUserData] | undefined => {
    const request = ctx
      .switchToHttp()
      .getRequest<Partial<Record<typeof REQUEST_USER_KEY, CurrentUserData>>>();
    const user = request[REQUEST_USER_KEY] as CurrentUserData | undefined;

    if (!user) {
      return undefined;
    }

    return field ? user?.[field] : user;
  },
);
