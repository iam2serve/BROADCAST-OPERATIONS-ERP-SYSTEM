import { StrictMode, useEffect, useState } from 'react';
import { createRoot } from 'react-dom/client';

import { bootstrapLocalDatabase } from './lib/local-db/sqlite.js';
import { getSyncStatus } from './lib/sync/sync-queue.js';
import './styles.css';

function App() {
  const [status, setStatus] = useState<{ queued: number; conflicts: number }>({ queued: 0, conflicts: 0 });

  useEffect(() => {
    void getSyncStatus().then(setStatus);
  }, []);

  return (
    <main className="desktop-shell">
      <section className="desktop-panel">
        <p className="eyebrow">Offline Sync Ready</p>
        <h1>Broadcast Operations ERP Desktop</h1>
        <p>SQLite persistence, queued mutations, pulled entities, retry metadata, and conflict storage are ready for field workflows.</p>
        <div className="sync-grid">
          <span>Queued mutations: {status.queued}</span>
          <span>Open conflicts: {status.conflicts}</span>
        </div>
      </section>
    </main>
  );
}

const root = document.getElementById('root');

if (!root) {
  throw new Error('Root element was not found.');
}

void bootstrapLocalDatabase().then(() => {
  createRoot(root).render(
    <StrictMode>
      <App />
    </StrictMode>,
  );
});
