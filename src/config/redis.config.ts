import { registerAs } from '@nestjs/config';

export default registerAs('redis', () => ({
  host: process.env.REDIS_HOST,
  port: parseInt(process.env.REDIS_PORT ?? '6379', 10),
  db: parseInt(process.env.REDIS_DATABASE ?? '0', 10),
  keyPrefix: `${process.env.REDIS_KEY_PREFIX ?? 'ai-sprint'}:`,
  ...(process.env.REDIS_USERNAME
    ? {
        username: process.env.REDIS_USERNAME,
      }
    : {}),
  ...(process.env.REDIS_PASSWORD
    ? {
        password: process.env.REDIS_PASSWORD,
      }
    : {}),
}));