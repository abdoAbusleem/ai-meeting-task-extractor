import { registerAs } from '@nestjs/config';

const parseCookieSameSite = (value?: string): 'lax' | 'none' | 'strict' => {
  if (value === 'lax' || value === 'none' || value === 'strict') {
    return value;
  }

  return 'strict';
};

export default registerAs('app', () => ({
  nodeEnv: process.env.NODE_ENV ?? 'development',
  isProduction: (process.env.NODE_ENV ?? 'development') === 'production',
  port: parseInt(process.env.PORT ?? '3000', 10),
  frontendUrl: process.env.FRONTEND_URL ?? 'http://localhost:3000',
  cookieDomain: process.env.COOKIE_DOMAIN || undefined,
  cookieSecure: (process.env.COOKIE_SECURE ?? 'false') === 'true',
  cookieSameSite: parseCookieSameSite(process.env.COOKIE_SAME_SITE),
  accessCookieName: process.env.ACCESS_COOKIE_NAME ?? 'access_token',
  refreshCookieName: process.env.REFRESH_COOKIE_NAME ?? 'refresh_token',
  accessCookieMaxAgeMs: parseInt(
    process.env.ACCESS_COOKIE_MAX_AGE_MS ?? `${15 * 60 * 1000}`,
    10,
  ),
  refreshCookieMaxAgeMs: parseInt(
    process.env.REFRESH_COOKIE_MAX_AGE_MS ?? `${7 * 24 * 60 * 60 * 1000}`,
    10,
  ),
}));
