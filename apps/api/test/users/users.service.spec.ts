import { ConflictException, ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { UsersService } from '../../src/modules/users/users.service.js';
import { UpdateUserStatus } from '../../src/modules/users/dto/update-user-status.dto.js';

const principal: AuthenticatedPrincipal = {
  userId: 'admin-user',
  organizationId: 'org-1',
  roleId: 'SUPER_ADMIN',
  permissions: [permissions.usersInvite, permissions.usersUpdate, permissions.usersManageStatus],
  sessionId: 'session-1',
};

describe('UsersService', () => {
  it('prevents invitations when an active user already exists for the email', async () => {
    const prisma = {
      user: { findFirst: vi.fn().mockResolvedValue({ id: 'existing' }) },
    };
    const service = new UsersService(prisma as never, { record: vi.fn() } as never, {} as never);

    await expect(
      service.invite(
        principal,
        { email: 'a@example.com', fullName: 'A User', roleId: 'role-1' },
        {},
      ),
    ).rejects.toBeInstanceOf(ConflictException);
  });

  it('prevents users from disabling their own account', async () => {
    const service = new UsersService({} as never, { record: vi.fn() } as never, {} as never);

    await expect(
      service.updateStatus(
        { ...principal, userId: 'same-user' },
        'same-user',
        { status: UpdateUserStatus.SUSPENDED },
        {},
      ),
    ).rejects.toBeInstanceOf(ForbiddenException);
  });
});
