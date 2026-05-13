import Database from '@tauri-apps/plugin-sql';

const sqliteUrl = 'sqlite:broadcast-operations.db';

let databasePromise: Promise<Database> | undefined;

export function getLocalDatabase(): Promise<Database> {
  databasePromise ??= Database.load(sqliteUrl);
  return databasePromise;
}

export async function bootstrapLocalDatabase(): Promise<void> {
  const db = await getLocalDatabase();

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_operations (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      operation TEXT NOT NULL,
      payload TEXT NOT NULL,
      status TEXT NOT NULL DEFAULT 'QUEUED',
      retry_count INTEGER NOT NULL DEFAULT 0,
      base_version TEXT,
      client_mutation_id TEXT,
      error_message TEXT,
      created_at TEXT NOT NULL,
      processed_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS sync_conflicts (
      id TEXT PRIMARY KEY,
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      server_version TEXT,
      client_version TEXT,
      status TEXT NOT NULL DEFAULT 'OPEN',
      created_at TEXT NOT NULL,
      resolved_at TEXT
    )
  `);

  await db.execute(`
    CREATE TABLE IF NOT EXISTS offline_entities (
      entity_type TEXT NOT NULL,
      entity_id TEXT NOT NULL,
      payload TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      dirty INTEGER NOT NULL DEFAULT 0,
      PRIMARY KEY (entity_type, entity_id)
    )
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS sync_operations_status_idx
    ON sync_operations (status, created_at)
  `);

  await db.execute(`
    CREATE INDEX IF NOT EXISTS sync_conflicts_status_idx
    ON sync_conflicts (status, created_at)
  `);
}
