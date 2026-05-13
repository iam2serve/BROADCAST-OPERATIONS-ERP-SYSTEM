import { describe, expect, it } from 'vitest';

import { MetricsService } from '../../src/common/metrics/metrics.service.js';

describe('MetricsService', () => {
  it('records counters and timings', () => {
    const metrics = new MetricsService();
    metrics.increment('requests', { status: 200 });
    metrics.observe('api.duration', 42, { route: '/health' });

    const snapshot = metrics.snapshot();
    expect(snapshot.counters['requests{status=200}']).toBe(1);
    expect(snapshot.timings['api.duration{route=/health}']?.avgMs).toBe(42);
  });
});
