import { SetMetadata } from '@nestjs/common';

export const ownershipKey = 'ownership';

export type OwnershipRule = {
  param: string;
  principalField?: 'userId' | 'organizationId' | 'branchId';
};

export const AllowOwner = (rule: OwnershipRule) => SetMetadata(ownershipKey, rule);
