import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { SystemRole } from '@broadcast/auth';

import { rolesKey } from '../decorators/roles.decorator.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const roles = this.reflector.getAllAndOverride<SystemRole[]>(rolesKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!roles?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();

    if (roles.includes(request.user.roleId as SystemRole)) {
      return true;
    }

    throw new ForbiddenException({
      code: 'MISSING_ROLE',
      message: 'Your role is not allowed to perform this action.',
      details: { roles },
    });
  }
}
