import { useEffect, useState } from 'react';
import {
  isDesktop,
  getDesktopNotifications,
  markDesktopNotificationRead,
  onSyncStatusChange,
} from '../../services/desktopBridge.js';

// Dia 63-64: every native OS toast sync.js's checkForNotifications decides
// to fire (packages/desktop/public/sync.js) is persisted, so this is the
// in-app record of them - useful if a toast was missed, or just to see
// history. Renders nothing outside the desktop app.
function NotificationCenter() {
  const [notifications, setNotifications] = useState([]);
  const [open, setOpen] = useState(false);

  function loadNotifications() {
    getDesktopNotifications().then(setNotifications);
  }

  useEffect(() => {
    if (!isDesktop) return undefined;
    loadNotifications();
    // Reload after every sync cycle, since that's when new notifications
    // (if any) get recorded.
    return onSyncStatusChange(loadNotifications);
  }, []);

  if (!isDesktop) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  function handleMarkRead(id) {
    markDesktopNotificationRead(id).then(loadNotifications);
  }

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative px-2 py-1 touch-manipulation"
        aria-label="Notificações"
      >
        🔔
        {unreadCount > 0 && (
          <span className="absolute -top-1 -right-1 bg-red-500 text-white text-[10px] leading-none rounded-full px-1.5 py-0.5">
            {unreadCount}
          </span>
        )}
      </button>

      {open && (
        <div className="absolute right-0 mt-2 w-72 max-h-80 overflow-y-auto bg-white dark:bg-stone-800 border border-slate-200 dark:border-stone-700 rounded-lg shadow-lg z-10 text-sm">
          {notifications.length === 0 ? (
            <p className="p-3 text-slate-400">Nenhuma notificação ainda.</p>
          ) : (
            notifications.map((n) => (
              <button
                key={n.id}
                type="button"
                onClick={() => handleMarkRead(n.id)}
                className={`w-full text-left p-3 border-b border-slate-100 dark:border-stone-700 last:border-0 touch-manipulation ${
                  n.read ? 'text-slate-400' : 'bg-slate-50 dark:bg-stone-700'
                }`}
              >
                <p className="font-semibold">{n.title}</p>
                <p className="text-xs">{n.body}</p>
              </button>
            ))
          )}
        </div>
      )}
    </div>
  );
}

export default NotificationCenter;
