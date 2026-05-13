import { describe, expect, it } from 'vitest';

import { permissions } from '@broadcast/auth';

describe('event and assignment permissions', () => {
  it('exposes granular event, assignment, and availability permissions', () => {
    expect(permissions.eventsRead).toBe('events.read');
    expect(permissions.eventsCreate).toBe('events.create');
    expect(permissions.eventsUpdate).toBe('events.update');
    expect(permissions.eventsDelete).toBe('events.delete');
    expect(permissions.eventsManageStatus).toBe('events.manage_status');
    expect(permissions.assignmentsCreate).toBe('assignments.create');
    expect(permissions.assignmentsRelease).toBe('assignments.release');
    expect(permissions.assignmentsReassign).toBe('assignments.reassign');
    expect(permissions.assignmentsBulk).toBe('assignments.bulk');
    expect(permissions.availabilityRead).toBe('availability.read');
  });
});
