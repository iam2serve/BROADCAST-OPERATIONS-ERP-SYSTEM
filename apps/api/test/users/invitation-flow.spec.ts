import { UnauthorizedException } from '@nestjs/common';
import { describe, expect, it, vi } from 'vitest';

import { UsersService } from '../../src/modules/users/users.service.js';

describe('Invitation flow', () => {
  it('rejects invalid invitation tokens', async () => {
    const service = new UsersService(
      {
        userInvitation: {
          findMany: vi.fn().mockResolvedValue([{ tokenHash: 'hashed-token' }]),
        },
      } as never,
      { record: vi.fn() } as never,
      { verify: vi.fn().mockResolvedValue(false) } as never,
    );

    await expect(
      service.acceptInvite({ token: 'bad-token-value-that-is-long', password: 'StrongPassword123' }, {}),
    ).rejects.toBeInstanceOf(UnauthorizedException);
  });
});
