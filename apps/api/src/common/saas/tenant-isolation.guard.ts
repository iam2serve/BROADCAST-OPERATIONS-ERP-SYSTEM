import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import type { Request } from 'express';

@Injectable()
export class TenantIsolationGuard implements CanActivate {
  canActivate(context: ExecutionContext): boolean {
    const request = context.switchToHttp().getRequest<Request>();
    const requestedOrganizationId = request.header('x-organization-id');
    return !requestedOrganizationId || requestedOrganizationId === request.user?.organizationId;
  }
}
