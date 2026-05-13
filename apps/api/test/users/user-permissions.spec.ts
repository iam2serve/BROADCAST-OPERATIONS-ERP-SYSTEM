import { ForbiddenException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { permissions, type AuthenticatedPrincipal } from '@broadcast/auth';

import { UsersService } from '../../src/modules/users/users.service.js';
import { ThemePreferenceDto } from '../../src/modules/users/dto/update-preferences.dto.js';

describe('User preference permissions', () => {
  it('rejects preference updates for another user without users.update', async () => {
    const principal: AuthenticatedPrincipal = {
      userId: 'user-1',
      organizationId: 'org-1',
      roleId: 'OPERATOR',
      permissions: [permissions.notificationsRead],
      sessionId: 'session-1',
    };
    const service = new UsersService({} as never, { record: vi.fn() } as never, {} as never);

    await expect(service.updatePreferences(principal, 'user-2', { theme: ThemePreferenceDto.DARK })).rejects.toBeInstanceOf(
      ForbiddenException,
    );
  });
});
