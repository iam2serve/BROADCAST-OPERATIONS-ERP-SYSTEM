import type { Request } from 'express';

import type { AuthenticatedPrincipal } from '@broadcast/auth';

export type AuthenticatedRequest = Request & {
  user: AuthenticatedPrincipal;
};
