import { Inject, Injectable, Logger } from '@nestjs/common';
import { Redis } from 'ioredis';

import { IORedisKey } from './redis.constants';

@Injectable()
export class RedisService {
  private readonly logger = new Logger(RedisService.name);

  constructor(
    @Inject(IORedisKey)
    private readonly redisClient: Redis,
  ) {}

  async get(key: string): Promise<string | null> {
    return this.redisClient.get(key);
  }

  async set(
    key: string,
    value: string | number,
    ttlSeconds?: number,
  ): Promise<void> {
    if (ttlSeconds) {
      await this.redisClient.set(key, value, 'EX', ttlSeconds);
      return;
    }

    await this.redisClient.set(key, value);
  }

  async getNumber(key: string): Promise<number | null> {
    const value = await this.get(key);
    if (value === null) {
      return null;
    }

    const parsedValue = Number(value);
    return Number.isNaN(parsedValue) ? null : parsedValue;
  }

  async delete(key: string): Promise<void> {
    await this.redisClient.del(key);
  }

  async deleteMany(keys: string[]): Promise<void> {
    if (keys.length === 0) {
      return;
    }

    await this.redisClient.del(...keys);
  }

  async deleteByPattern(pattern: string): Promise<void> {
    const keys = await this.redisClient.keys(pattern);
    if (keys.length > 0) {
      await this.redisClient.del(...keys);
    }
  }

  async getTokenVersion(userId: string): Promise<number | null> {
    return this.getNumber(this.getTokenVersionKey(userId));
  }

  async setTokenVersion(
    userId: string,
    tokenVersion: number,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.set(this.getTokenVersionKey(userId), tokenVersion, ttlSeconds);
  }

  async getUserActive(userId: string): Promise<boolean | null> {
    const value = await this.get(this.getUserActiveKey(userId));
    if (value === null) {
      return null;
    }

    return value === '1';
  }

  async setUserActive(
    userId: string,
    isActive: boolean,
    ttlSeconds?: number,
  ): Promise<void> {
    await this.set(this.getUserActiveKey(userId), isActive ? 1 : 0, ttlSeconds);
  }

  async clearAuthState(userId: string): Promise<void> {
    await this.deleteMany([
      this.getTokenVersionKey(userId),
      this.getUserActiveKey(userId),
    ]);
  }

  async syncSessionState(
    userId: string,
    tokenVersion: number,
    isActive: boolean,
    previousIsActive?: boolean,
  ): Promise<void> {
    try {
      await Promise.all([
        this.setTokenVersion(userId, tokenVersion),
        this.setUserActive(userId, isActive),
      ]);
    } catch (error) {
      this.logger.warn(
        `Failed to sync Redis session state for user ${userId}: ${(error as Error).message}`,
      );
      
      if (previousIsActive !== undefined) {
        const fallbackActiveState = isActive && previousIsActive;
        await this.clearAuthState(userId).catch(() => undefined);
        await this.setUserActive(userId, fallbackActiveState).catch(() => undefined);
      }
    }
  }

  async ping(): Promise<string> {
    return this.redisClient.ping();
  }

  async quit(): Promise<void> {
    try {
      await this.redisClient.quit();
    } catch (error) {
      this.logger.warn(`Redis shutdown failed: ${(error as Error).message}`);
    }
  }

  private getTokenVersionKey(userId: string): string {
    return `auth:token-version:${userId}`;
  }

  private getUserActiveKey(userId: string): string {
    return `auth:user-active:${userId}`;
  }
}