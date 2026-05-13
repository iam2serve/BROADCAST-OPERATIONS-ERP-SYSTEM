import { SetMetadata } from '@nestjs/common';

import type { Permission } from '@broadcast/auth';

export const permissionsKey = 'permissions';

export const RequirePermissions = (...permissions: Permission[]) =>
  SetMetadata(permissionsKey, permissions);
