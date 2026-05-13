import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { AuthService } from '../../src/modules/auth/services/auth.service.js';

describe('AuthService', () => {
  it('records failed login audits without revealing whether the user exists', async () => {
    const audit = { record: vi.fn().mockResolvedValue(undefined) };
    const users = { findActiveByEmail: vi.fn().mockResolvedValue(null) };
    const service = new AuthService(
      {} as never,
      users as never,
      audit as never,
      {} as never,
      {} as never,
      {} as never,
    );

    await expect(
      service.login(
        { email: 'Admin@Example.com', password: 'wrong-password' },
        { requestId: 'req-1', ipAddress: '127.0.0.1', userAgent: 'vitest' },
      ),
    ).rejects.toBeInstanceOf(UnauthorizedException);

    expect(audit.record).toHaveBeenCalledWith(
      expect.objectContaining({
        action: 'auth.login_failed',
        entityType: 'User',
        newValues: { email: 'admin@example.com' },
      }),
    );
  });
});
