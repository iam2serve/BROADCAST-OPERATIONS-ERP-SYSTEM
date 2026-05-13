import { CanActivate, ExecutionContext, Injectable, ForbiddenException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import type { Permission } from '@broadcast/auth';

import { permissionsKey } from '../decorators/permissions.decorator.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class PermissionsGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const requiredPermissions = this.reflector.getAllAndOverride<Permission[]>(permissionsKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!requiredPermissions?.length) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principal = request.user;

    if (!principal) {
      return false;
    }

    const allowed = requiredPermissions.every((permission) =>
      principal.permissions.includes(permission),
    );

    if (!allowed) {
      throw new ForbiddenException({
        code: 'MISSING_PERMISSION',
        message: 'You do not have permission to perform this action.',
        details: { requiredPermissions },
      });
    }

    return true;
  }
}
