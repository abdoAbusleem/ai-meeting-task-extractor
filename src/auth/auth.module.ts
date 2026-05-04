import { Module } from '@nestjs/common';
import { ConfigType } from '@nestjs/config';
import { JwtModule } from '@nestjs/jwt';
import { StringValue } from 'ms';

import jwtConfig from '../config/jwt.config';
import { PrismaModule } from '../prisma/prisma.module';
import { RedisModule } from '../redis/redis.module';
import { AuthController } from './auth.controller';
import { AuthService } from './auth.service';
import { BcryptService } from './bcrypt.service';
import { JwtStrategy } from './strategies/jwt.strategy';

@Module({
  imports: [
    PrismaModule,
    RedisModule,
    JwtModule.registerAsync({
      inject: [jwtConfig.KEY],
      useFactory: (configuration: ConfigType<typeof jwtConfig>) => ({
        secret: configuration.accessTokenSecret,
        signOptions: {
          expiresIn: configuration.accessTokenTtl as StringValue,
        },
      }),
    }),
  ],
  controllers: [AuthController],
  providers: [AuthService, JwtStrategy, BcryptService], 
  exports: [AuthService, JwtModule, JwtStrategy, BcryptService],
})
export class AuthModule {}   




