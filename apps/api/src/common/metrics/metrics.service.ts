import { Injectable } from '@nestjs/common';

@Injectable()
export class MetricsService {
  private readonly counters = new Map<string, number>();
  private readonly timings = new Map<string, { count: number; totalMs: number; maxMs: number }>();

  increment(key: string, tags: Record<string, string | number | undefined> = {}, value = 1): void {
    const metricKey = this.key(key, tags);
    this.counters.set(metricKey, (this.counters.get(metricKey) ?? 0) + value);
  }

  observe(key: string, durationMs: number, tags: Record<string, string | number | undefined> = {}): void {
    const metricKey = this.key(key, tags);
    const current = this.timings.get(metricKey) ?? { count: 0, totalMs: 0, maxMs: 0 };
    this.timings.set(metricKey, {
      count: current.count + 1,
      totalMs: current.totalMs + durationMs,
      maxMs: Math.max(current.maxMs, durationMs),
    });
  }

  snapshot() {
    return {
      counters: Object.fromEntries(this.counters),
      timings: Object.fromEntries(
        Array.from(this.timings.entries()).map(([key, value]) => [
          key,
          { ...value, avgMs: value.count === 0 ? 0 : Math.round(value.totalMs / value.count) },
        ]),
      ),
    };
  }

  private key(name: string, tags: Record<string, string | number | undefined>) {
    const suffix = Object.entries(tags)
      .filter(([, value]) => value !== undefined)
      .map(([key, value]) => `${key}=${value}`)
      .sort()
      .join(',');
    return suffix ? `${name}{${suffix}}` : name;
  }
}
