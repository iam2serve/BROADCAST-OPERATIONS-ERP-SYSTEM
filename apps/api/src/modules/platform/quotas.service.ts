import { Injectable } from '@nestjs/common';

import type { AuthenticatedPrincipal } from '@broadcast/auth';

import { PrismaService } from '../../database/prisma.service.js';

@Injectable()
export class QuotasService {
  constructor(private readonly prisma: PrismaService) {}

  async getForOrganization(principal: AuthenticatedPrincipal) {
    return this.prisma.organizationQuota.upsert({
      where: { organizationId: principal.organizationId },
      update: {},
      create: { organizationId: principal.organizationId },
    });
  }
}
