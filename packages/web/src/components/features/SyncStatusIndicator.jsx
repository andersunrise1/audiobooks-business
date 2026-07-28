import { useEffect, useState } from 'react';
import { isDesktop, onSyncStatusChange, syncNow } from '../../services/desktopBridge.js';

// Dia 61-62: the desktop app has synced silently in the background since
// Dia 20 (a 60s timer in packages/desktop/public/main.js) with no UI ever
// showing whether it succeeded, failed, or is pending - this is the first
// visible surface for it. Renders nothing outside the desktop app.
function SyncStatusIndicator() {
  const [status, setStatus] = useState(null);
  const [syncing, setSyncing] = useState(false);

  useEffect(() => {
    if (!isDesktop) return undefined;
    return onSyncStatusChange(setStatus);
  }, []);

  if (!isDesktop) return null;

  async function handleSyncNow() {
    setSyncing(true);
    try {
      const result = await syncNow();
      setStatus(result);
    } finally {
      setSyncing(false);
    }
  }

  let label = 'Sincronizando...';
  let className = 'text-slate-500 dark:text-stone-400';

  if (!syncing && status) {
    if (status.ok) {
      label = `Sincronizado${status.pushed ? ` (${status.pushed} enviado${status.pushed > 1 ? 's' : ''})` : ''}`;
      className = 'text-green-600';
    } else {
      label = 'Erro de sincronização';
      className = 'text-red-600 dark:text-red-400';
    }
  } else if (!syncing && !status) {
    label = 'Aguardando primeira sincronização';
  }

  return (
    <div className="flex items-center gap-2 text-xs">
      <span className={className}>{label}</span>
      <button
        type="button"
        onClick={handleSyncNow}
        disabled={syncing}
        className="underline text-slate-500 dark:text-stone-400 disabled:opacity-50 touch-manipulation"
      >
        Sincronizar agora
      </button>
    </div>
  );
}

export default SyncStatusIndicator;
