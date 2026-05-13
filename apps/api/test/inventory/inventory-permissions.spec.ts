import { describe, expect, it } from 'vitest';

import { permissions } from '@broadcast/auth';

describe('inventory permissions', () => {
  it('defines granular inventory permissions', () => {
    expect(permissions.devicesManageStatus).toBe('devices.manage_status');
    expect(permissions.inventoryTelemetryIngest).toBe('inventory.telemetry.ingest');
    expect(permissions.simsAssign).toBe('sims.assign');
    expect(permissions.routersAssign).toBe('routers.assign');
  });
});
