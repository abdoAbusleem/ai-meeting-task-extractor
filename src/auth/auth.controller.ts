import {
  Body,
  Controller,
  HttpCode,
  HttpStatus,
  Inject,
  Post,
  Req,
  Res,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import {
  ApiBearerAuth,
  ApiBody,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
  ApiUnauthorizedResponse,
} from '@nestjs/swagger';
import { CookieOptions, Request, Response } from 'express';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { Public } from '../common/decorators/public.decorator';
import appConfig from '../config/app.config';
import { AuthErrors } from './auth.errors';
import { AuthService } from './auth.service';
import { ChangePasswordDto } from './dto/change-password.dto';
import { LoginDto } from './dto/login.dto';
import { RegisterDto } from './dto/register.dto';

@ApiTags('auth')
@Controller('auth')
export class AuthController {
  constructor(
    @Inject(appConfig.KEY)
    private readonly appConfiguration: ConfigType<typeof appConfig>,
    private readonly authService: AuthService,
  ) {}

  @Public()
  @Post('login')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Authenticate a user and issue auth cookies' })
  @ApiBody({ type: LoginDto })
  @ApiOkResponse({ description: 'User authenticated successfully' })
  async login(
    @Body() loginDto: LoginDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.login(loginDto);

    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return {
      message: 'Login successful',
      user: result.user,
    };
  }

  @Public()
@Post('register')
@HttpCode(HttpStatus.CREATED)
@ApiOperation({ summary: 'Register a new user' })
@ApiBody({ type: RegisterDto })
@ApiOkResponse({ description: 'User registered successfully' })
async register(
  @Body() registerDto: RegisterDto,
  @Res({ passthrough: true }) response: Response,
) {
  const result = await this.authService.register(registerDto);

  this.setAuthCookies(response, result.accessToken, result.refreshToken);

  return {
    message: 'Registration successful',
    user: result.user,
  };
}

  @Public()
  @Post('refresh')
  @HttpCode(HttpStatus.OK)
  @ApiOperation({ summary: 'Rotate access and refresh tokens' })
  @ApiOkResponse({ description: 'Tokens refreshed successfully' })
  @ApiUnauthorizedResponse({ description: 'Refresh token is missing or invalid' })
  async refreshTokens(
    @Req() request: Request, 
    @Res({ passthrough: true }) response: Response,
  ) {
    const refreshToken = this.getRefreshTokenFromCookies(request);
    const result = await this.authService.refreshTokens(refreshToken);

    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return {
      message: 'Tokens refreshed successfully',
      user: result.user,
    };
  }

  

  @Post('logout')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Invalidate the current refresh token and clear cookies' })
  @ApiOkResponse({ description: 'User logged out successfully' })
  async logout(
    @CurrentUser('id') userId: string,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.logout(userId);
    this.clearAuthCookies(response);
    return result;
  }

  @Post('change-password')
  @HttpCode(HttpStatus.OK)
  @ApiBearerAuth()
  @ApiOperation({ summary: 'Change the current user password and rotate tokens' })
  @ApiBody({ type: ChangePasswordDto })
  @ApiOkResponse({ description: 'Password changed successfully' })
  async changePassword(
    @CurrentUser('id') userId: string,
    @Body() changePasswordDto: ChangePasswordDto,
    @Res({ passthrough: true }) response: Response,
  ) {
    const result = await this.authService.changePassword(
      userId,
      changePasswordDto,
    );

    this.setAuthCookies(response, result.accessToken, result.refreshToken);

    return {
      message: result.message,
      user: result.user,
    };
  }

  private getBaseCookieOptions(): CookieOptions {
    return {
      httpOnly: true,
      secure: this.appConfiguration.cookieSecure,
      sameSite: this.appConfiguration.cookieSameSite,
      domain: this.appConfiguration.cookieDomain,
      path: '/',
    };
  }

  private getAuthCookieOptions(type: 'access' | 'refresh'): CookieOptions {
    return {
      ...this.getBaseCookieOptions(),
      maxAge:
        type === 'access'
          ? this.appConfiguration.accessCookieMaxAgeMs
          : this.appConfiguration.refreshCookieMaxAgeMs,
    };
  }

  private setAuthCookies(
    response: Response,
    accessToken: string,
    refreshToken: string,
  ) {
    response.cookie(
      this.appConfiguration.accessCookieName,
      accessToken,
      this.getAuthCookieOptions('access'),
    );

    response.cookie(
      this.appConfiguration.refreshCookieName,
      refreshToken,
      this.getAuthCookieOptions('refresh'),
    );
  }

  private clearAuthCookies(response: Response) {
    response.clearCookie(
      this.appConfiguration.accessCookieName,
      this.getBaseCookieOptions(),
    );

    response.clearCookie(
      this.appConfiguration.refreshCookieName,
      this.getBaseCookieOptions(),
    );
  }

  private getRefreshTokenFromCookies(request: Request): string {
    const refreshToken =
      request.cookies?.[this.appConfiguration.refreshCookieName];

    if (!refreshToken) {
      throw new UnauthorizedException(AuthErrors.REFRESH_TOKEN_REQUIRED);
    }

    return refreshToken;
  }
}