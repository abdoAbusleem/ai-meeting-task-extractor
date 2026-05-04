import { Body, Controller, Get, Patch } from '@nestjs/common';
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from '@nestjs/swagger';

import { CurrentUser } from '../common/decorators/current-user.decorator';
import { UpdateIntegrationsDto } from './dto/update-integrations.dto';
import { UsersService } from './users.service';

@ApiTags('users')
@ApiBearerAuth()
@Controller('users')
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get('me')
  @ApiOperation({ summary: 'Get current user profile' })
  @ApiOkResponse({ description: 'User fetched successfully' })
  getMe(@CurrentUser('id') userId: string) {
    return this.usersService.getMe(userId);
  }

  @Patch('integrations')
  @ApiOperation({ summary: 'Update integration keys (GitHub, Jira, Fireflies)' })
  @ApiOkResponse({ description: 'Integrations updated successfully' })
  updateIntegrations(
    @CurrentUser('id') userId: string,
    @Body() dto: UpdateIntegrationsDto,
  ) {
    return this.usersService.updateIntegrations(userId, dto);
  }
}