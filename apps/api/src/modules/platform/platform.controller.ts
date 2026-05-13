import { Controller, Get, Version } from '@nestjs/common';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { CurrentUser } from '../auth/decorators/current-user.decorator.js';
import { RequirePermissions } from '../auth/decorators/permissions.decorator.js';
import { QuotasService } from './quotas.service.js';

@Controller('platform')
export class PlatformController {
  constructor(private readonly quotas: QuotasService) {}

  @Get('quotas')
  @Version('1')
  @RequirePermissions(permissions.settingsManage)
  quotasForOrg(@CurrentUser() principal: AuthenticatedPrincipal) {
    return this.quotas.getForOrganization(principal);
  }
}
