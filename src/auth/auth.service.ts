import {
  BadRequestException,
  ConflictException,
  ForbiddenException,
  Inject,
  Injectable,
  Logger,
  NotFoundException,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtService } from '@nestjs/jwt';
import { createHmac } from 'crypto';
import { StringValue } from 'ms';

import jwtConfig from '../config/jwt.config';
import { PrismaService } from '../prisma/prisma.service';
import { RedisService } from '../redis/redis.service';
import { publicUserSelect } from '../users/users.select';
import { AuthErrors } from './auth.errors';
import {
  AuthTokensResponse,
  TokenPair,
  TokenSubject,
} from './auth.types';
import { BcryptService } from './bcrypt.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { JwtPayload } from './strategies/jwt.strategy';
import { RegisterDto } from './dto/register.dto';

@Injectable()
export class AuthService {
  private readonly logger = new Logger(AuthService.name);

  constructor(
    @Inject(jwtConfig.KEY)
    private readonly jwtConfiguration: ConfigType<typeof jwtConfig>,
    private readonly prismaService: PrismaService,
    private readonly bcryptService: BcryptService,
    private readonly jwtService: JwtService,
    private readonly redisService: RedisService,
  ) {}

  async login(loginDto: LoginDto): Promise<AuthTokensResponse> {
    const user = await this.prismaService.user.findUnique({
      where: { email: this.normalizeEmail(loginDto.email) },
      select: {
        id: true,
        email: true,
        role: true,
        password_hash: true,
        is_active: true,
        token_version: true,
      },
    });

    if (!user) throw new UnauthorizedException(AuthErrors.INVALID_CREDENTIALS);
    if (!user.is_active)
      throw new ForbiddenException(AuthErrors.ACCOUNT_INACTIVE);

    const isPasswordValid = await this.bcryptService.compare(
      loginDto.password,
      user.password_hash,
    );
    if (!isPasswordValid)
      throw new UnauthorizedException(AuthErrors.INVALID_CREDENTIALS);

    const tokens = await this.getTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    });

    const [updatedUser] = await Promise.all([
      this.prismaService.user.update({
        where: { id: user.id },
        data: {
          hashed_refresh_token: this.hashRefreshTokenFast(tokens.refreshToken),
          last_login: new Date(),
        },
        select: publicUserSelect,
      }),
      this.redisService.syncSessionState(user.id, user.token_version, true),
    ]);

    return { ...tokens, user: updatedUser as any };
  }
 

  async register(registerDto: RegisterDto): Promise<AuthTokensResponse> {
  const exists = await this.prismaService.user.findUnique({
    where: { email: this.normalizeEmail(registerDto.email) },
  });

  if (exists) throw new ConflictException(AuthErrors.EMAIL_ALREADY_EXISTS);

  const passwordHash = await this.bcryptService.hash(registerDto.password);

  const user = await this.prismaService.user.create({
    data: {
      email: this.normalizeEmail(registerDto.email),
      password_hash: passwordHash,
      name: registerDto.name,
    },
    select: {
      id: true,
      email: true,
      role: true,
      token_version: true,
    },
  });

  const tokens = await this.getTokens({
    id: user.id,
    email: user.email,
    role: user.role,
    token_version: user.token_version,
  });

  const hashedRefreshToken = this.hashRefreshTokenFast(tokens.refreshToken);

  await this.prismaService.user.update({
    where: { id: user.id },
    data: { hashed_refresh_token: hashedRefreshToken },
  });

  await this.redisService.syncSessionState(user.id, user.token_version, true);

  const publicUser = await this.prismaService.user.findUnique({
    where: { id: user.id },
    select: publicUserSelect,
  });

  return { ...tokens, user: publicUser as any };
}

  async refreshTokens(refreshToken: string): Promise<AuthTokensResponse> {
    const payload = await this.verifyRefreshToken(refreshToken);

    const user = await this.prismaService.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        token_version: true,
        hashed_refresh_token: true,
      },
    });

    if (!user || !user.is_active || !user.hashed_refresh_token) {
      throw new UnauthorizedException(AuthErrors.INVALID_REFRESH_TOKEN);
    }

    if (user.token_version !== payload.token_version) {
      throw new UnauthorizedException(AuthErrors.SESSION_VERSION_INVALID);
    }

    const isRefreshTokenValid = this.compareRefreshToken(
      refreshToken,
      user.hashed_refresh_token,
    );

    if (!isRefreshTokenValid) {
      throw new UnauthorizedException(AuthErrors.INVALID_REFRESH_TOKEN);
    }

    const tokens = await this.getTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    });

    const [updatedUser] = await Promise.all([
      this.prismaService.user.update({
        where: { id: user.id },
        data: {
          hashed_refresh_token: this.hashRefreshTokenFast(tokens.refreshToken),
        },
        select: publicUserSelect,
      }),
      this.redisService.syncSessionState(user.id, user.token_version, true),
    ]);

    return { ...tokens, user: updatedUser as any };
  }

  async logout(userId: string): Promise<{ message: string }> {
    try {
      const updatedUser = await this.prismaService.user.update({
        where: { id: userId },
        data: {
          hashed_refresh_token: null,
          token_version: { increment: 1 },
        },
        select: { id: true, token_version: true, is_active: true },
      });

      await this.redisService.syncSessionState(
        updatedUser.id,
        updatedUser.token_version,
        updatedUser.is_active,
      );
    } catch (error) {
      this.logger.warn(
        `Logout failed silently for user ${userId}: ${(error as Error).message}`,
      );
    }

    return { message: 'Logged out successfully' };
  }

  async changePassword(
    userId: string,
    changePasswordDto: ChangePasswordDto,
  ): Promise<AuthTokensResponse & { message: string }> {
    if (changePasswordDto.oldPassword === changePasswordDto.newPassword) {
      throw new BadRequestException(
        AuthErrors.NEW_PASSWORD_MUST_BE_DIFFERENT,
      );
    }

    const user = await this.prismaService.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        is_active: true,
        token_version: true,
        password_hash: true,
      },
    });

    if (!user) {
      throw new NotFoundException(AuthErrors.USER_NOT_FOUND);
    }

    if (!user.is_active) {
      throw new ForbiddenException(AuthErrors.ACCOUNT_INACTIVE);
    }

    const isOldPasswordValid = await this.bcryptService.compare(
      changePasswordDto.oldPassword,
      user.password_hash,
    );

    if (!isOldPasswordValid) {
      throw new BadRequestException(AuthErrors.PASSWORD_INCORRECT);
    }

    const nextTokenVersion = user.token_version + 1;
    const passwordHash = await this.bcryptService.hash(
      changePasswordDto.newPassword,
    );

    const tokens = await this.getTokens({
      id: user.id,
      email: user.email,
      role: user.role,
      token_version: nextTokenVersion,
    });

    const hashedRefreshToken = this.hashRefreshTokenFast(tokens.refreshToken);
    const updatedUser = await this.prismaService.user.update({
      where: {
        id: user.id,
      },
      data: {
        password_hash: passwordHash,
        hashed_refresh_token: hashedRefreshToken,
        token_version: nextTokenVersion,
      },
      select: publicUserSelect,
    });

    await this.redisService.syncSessionState(user.id, nextTokenVersion, true);

    return {
      message: 'Password changed successfully',
      ...tokens,
      user: updatedUser as any,
    };
  }

  async getTokens(user: TokenSubject): Promise<TokenPair> {
    const payload: JwtPayload = {
      sub: user.id,
      email: user.email,
      role: user.role,
      token_version: user.token_version,
    };

    const [accessToken, refreshToken] = await Promise.all([
      this.jwtService.signAsync(payload, {
        secret: this.jwtConfiguration.accessTokenSecret,
        expiresIn: this.jwtConfiguration.accessTokenTtl as StringValue,
      }),
      this.jwtService.signAsync(payload, {
        secret: this.jwtConfiguration.refreshTokenSecret,
        expiresIn: this.jwtConfiguration.refreshTokenTtl as StringValue,
      }),
    ]);

    return {
      accessToken,
      refreshToken,
    };
  }

  private async verifyRefreshToken(refreshToken: string): Promise<JwtPayload> {
    try {
      return await this.jwtService.verifyAsync<JwtPayload>(refreshToken, {
        secret: this.jwtConfiguration.refreshTokenSecret,
      });
    } catch {
      throw new UnauthorizedException(AuthErrors.INVALID_REFRESH_TOKEN);
    }
  }

  private normalizeEmail(email: string): string {
    return email.trim().toLowerCase();
  }

  private hashRefreshTokenFast(token: string): string {
    return createHmac('sha256', this.jwtConfiguration.refreshTokenSecret)
      .update(token)
      .digest('hex');
  }

  private compareRefreshToken(token: string, hashedToken: string): boolean {
    return this.hashRefreshTokenFast(token) === hashedToken;
  }
}