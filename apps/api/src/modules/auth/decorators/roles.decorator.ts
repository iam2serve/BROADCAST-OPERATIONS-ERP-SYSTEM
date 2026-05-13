import { SetMetadata } from '@nestjs/common';

import type { SystemRole } from '@broadcast/auth';

export const rolesKey = 'roles';

export const RequireRoles = (...roles: SystemRole[]) => SetMetadata(rolesKey, roles);
