import { registerAs } from '@nestjs/config';

export default registerAs('jwt', () => ({
  accessTokenSecret: process.env.JWT_ACCESS_SECRET,
  refreshTokenSecret: process.env.JWT_REFRESH_SECRET,
  accessTokenTtl: process.env.JWT_ACCESS_TOKEN_TTL ?? '15m',
  refreshTokenTtl: process.env.JWT_REFRESH_TOKEN_TTL ?? '7d',
}));
