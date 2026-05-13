import { existsSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

describe('Docker production config', () => {
  it('uses non-root production Dockerfiles and production profiles', () => {
    const root = join(__dirname, '../../../..');
    const apiDockerfile = readFileSync(join(root, 'docker/api.Dockerfile'), 'utf8');
    const compose = readFileSync(join(root, 'docker-compose.yml'), 'utf8');

    expect(apiDockerfile).toContain('USER app');
    expect(compose).toContain('profiles: ["production"]');
    expect(existsSync(join(root, 'scripts/backup-postgres.sh'))).toBe(true);
  });
});
