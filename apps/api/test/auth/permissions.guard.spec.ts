import { ForbiddenException } from '@nestjs/common';
import type { Reflector } from '@nestjs/core';
import { describe, expect, it, vi } from 'vitest';

import { permissions } from '@broadcast/auth';

import { PermissionsGuard } from '../../src/modules/auth/guards/permissions.guard.js';

function createExecutionContext(userPermissions: string[]) {
  return {
    getHandler: vi.fn(),
    getClass: vi.fn(),
    switchToHttp: () => ({
      getRequest: () => ({
        user: {
          permissions: userPermissions,
        },
      }),
    }),
  };
}

describe('PermissionsGuard', () => {
  it('allows requests when all required permissions are present', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([permissions.eventsRead]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(guard.canActivate(createExecutionContext([permissions.eventsRead]) as never)).toBe(true);
  });

  it('rejects requests when a required permission is missing', () => {
    const reflector = {
      getAllAndOverride: vi.fn().mockReturnValue([permissions.financeManage]),
    } as unknown as Reflector;
    const guard = new PermissionsGuard(reflector);

    expect(() => guard.canActivate(createExecutionContext([permissions.eventsRead]) as never)).toThrow(
      ForbiddenException,
    );
  });
});
