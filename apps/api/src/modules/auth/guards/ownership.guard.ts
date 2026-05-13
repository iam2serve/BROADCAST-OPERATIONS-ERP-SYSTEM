import { CanActivate, ExecutionContext, ForbiddenException, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';

import { ownershipKey, type OwnershipRule } from '../decorators/ownership.decorator.js';
import type { AuthenticatedRequest } from '../types/authenticated-request.js';

@Injectable()
export class OwnershipGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}

  canActivate(context: ExecutionContext): boolean {
    const rule = this.reflector.getAllAndOverride<OwnershipRule>(ownershipKey, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (!rule) {
      return true;
    }

    const request = context.switchToHttp().getRequest<AuthenticatedRequest>();
    const principalField = rule.principalField ?? 'userId';
    const requestedValue = request.params[rule.param];
    const principalValue = request.user[principalField];

    if (requestedValue && principalValue && requestedValue === principalValue) {
      return true;
    }

    throw new ForbiddenException({
      code: 'OWNERSHIP_REQUIRED',
      message: 'You can only access resources you own.',
    });
  }
}
