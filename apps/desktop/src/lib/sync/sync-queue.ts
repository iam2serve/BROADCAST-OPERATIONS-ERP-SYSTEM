import { getLocalDatabase } from '../local-db/sqlite.js';

export type QueuedSyncOperation = {
  id: string;
  clientMutationId: string;
  entityType: string;
  entityId: string;
  operation: 'CREATE' | 'UPDATE' | 'DELETE';
  payload: Record<string, unknown>;
  baseVersion?: string;
};

export async function enqueueSyncOperation(operation: QueuedSyncOperation): Promise<void> {
  const db = await getLocalDatabase();

  await db.execute(
    `INSERT INTO sync_operations
      (id, entity_type, entity_id, operation, payload, status, base_version, client_mutation_id, created_at)
     VALUES ($1, $2, $3, $4, $5, 'QUEUED', $6, $7, $8)`,
    [
      operation.id,
      operation.entityType,
      operation.entityId,
      operation.operation,
      JSON.stringify(operation.payload),
      operation.baseVersion ?? null,
      operation.clientMutationId,
      new Date().toISOString(),
    ],
  );
}

export async function getQueuedSyncOperationCount(): Promise<number> {
  const db = await getLocalDatabase();
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM sync_operations WHERE status = 'QUEUED'",
  );

  return rows[0]?.count ?? 0;
}

export async function getSyncStatus(): Promise<{ queued: number; conflicts: number }> {
  const db = await getLocalDatabase();
  const queued = await getQueuedSyncOperationCount();
  const rows = await db.select<Array<{ count: number }>>(
    "SELECT COUNT(*) as count FROM sync_conflicts WHERE status = 'OPEN'",
  );
  return { queued, conflicts: rows[0]?.count ?? 0 };
}

export async function recoverCorruptedQueue(): Promise<{ recovered: number }> {
  const db = await getLocalDatabase();
  const rows = await db.select<Array<{ id: string }>>(
    "SELECT id FROM sync_operations WHERE status = 'PROCESSING'",
  );
  await db.execute(
    "UPDATE sync_operations SET status = 'QUEUED', retry_count = retry_count + 1 WHERE status = 'PROCESSING'",
  );
  return { recovered: rows.length };
}

export async function applyPulledEntity(entityType: string, entityId: string, payload: Record<string, unknown>): Promise<void> {
  const db = await getLocalDatabase();
  await db.execute(
    `INSERT OR REPLACE INTO offline_entities (entity_type, entity_id, payload, updated_at, dirty)
     VALUES ($1, $2, $3, $4, 0)`,
    [entityType, entityId, JSON.stringify(payload), new Date().toISOString()],
  );
}
