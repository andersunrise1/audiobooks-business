const { app, BrowserWindow, ipcMain, Notification, Menu } = require('electron');
const path = require('path');
const { pathToFileURL } = require('url');
const db = require('./db');
const { syncNow } = require('./sync');
const audioCache = require('./audioCache');

const isDev = !app.isPackaged;
const DEV_SERVER_URL = process.env.VITE_DEV_SERVER_URL || 'http://localhost:5173';
const SYNC_INTERVAL_MS = 60_000;

let mainWindow = null;
let syncTimer = null;
let session = { apiUrl: null, token: null };

// Dia 65: Electron's default application menu binds Cmd/Ctrl+R to Reload
// (and Cmd/Ctrl+P has no default binding, but View>Reload's accelerator
// would otherwise fire before - or instead of - our own in-app Cmd/Ctrl+R
// "flashcard review" shortcut (useKeyboardShortcuts.js). In production
// there's no reason for an end user to see a native menu bar at all (the
// app is its own UI chrome); in dev, keep a minimal one with reload/devtools
// moved to accelerators that don't collide with our own shortcuts.
function setAppMenu() {
  if (!isDev) {
    Menu.setApplicationMenu(null);
    return;
  }

  Menu.setApplicationMenu(
    Menu.buildFromTemplate([
      {
        label: 'Developer',
        submenu: [
          { label: 'Reload', accelerator: 'CmdOrCtrl+Shift+R', role: 'reload' },
          { label: 'Toggle DevTools', accelerator: 'CmdOrCtrl+Shift+I', role: 'toggleDevTools' },
        ],
      },
    ]),
  );
}

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1200,
    height: 800,
    minWidth: 800,
    minHeight: 600,
    title: 'TechSpeak',
    show: false,
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
    },
  });

  mainWindow.once('ready-to-show', () => {
    mainWindow.show();
  });

  // Dia 78-79: on macOS the app stays alive after the window closes
  // (window-all-closed doesn't quit there) - without this, mainWindow kept
  // pointing at a destroyed BrowserWindow, and the 60s auto-sync's
  // triggerSync() would call .webContents.send on it and throw.
  mainWindow.on('closed', () => {
    mainWindow = null;
  });

  const win = mainWindow;

  if (isDev) {
    win.loadURL(DEV_SERVER_URL);
  } else {
    // Reaproveita o build de packages/web (mesmo React usado na versao web)
    win.loadFile(path.join(__dirname, '..', '..', 'web', 'dist', 'index.html'));
  }
}

async function triggerSync() {
  const status = await syncNow(session);
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send('sync:status', status);
  }

  // sync.js computes *which* notifications should fire and persists them
  // (packages/desktop's notification center) but stays Electron-free/
  // testable via plain Node - showing the actual native OS toast happens
  // only here, the one place that's allowed to depend on Electron's API.
  if (Notification.isSupported()) {
    for (const event of status.notifications ?? []) {
      new Notification({ title: event.title, body: event.body }).show();
    }
  }

  return status;
}

function startAutoSync() {
  clearInterval(syncTimer);
  syncTimer = setInterval(triggerSync, SYNC_INTERVAL_MS);
}

ipcMain.handle('app:getVersion', () => app.getVersion());

ipcMain.handle('auth:setSession', (_event, newSession) => {
  session = { apiUrl: newSession?.apiUrl ?? null, token: newSession?.token ?? null };
  if (session.token) {
    triggerSync();
  }
});

ipcMain.handle('cache:getProgress', () => db.getCachedProgress());
ipcMain.handle('cache:getFlashcards', () => db.getCachedFlashcards());

ipcMain.handle('cache:queueProgress', (_event, chapterId, payload) => {
  db.queueProgressUpdate(chapterId, payload);
  triggerSync();
});

ipcMain.handle('cache:queueReview', (_event, flashcardId, quality) => {
  db.queueReview(flashcardId, quality);
  triggerSync();
});

ipcMain.handle('sync:now', () => triggerSync());

ipcMain.handle('notifications:getAll', () => db.getNotifications());
ipcMain.handle('notifications:markRead', (_event, id) => db.markNotificationRead(id));

ipcMain.handle('cache:getCachedAudioPath', (_event, chapterId) => {
  const filePath = audioCache.getCachedAudioPath(chapterId);
  return filePath ? pathToFileURL(filePath).toString() : null;
});

ipcMain.handle('cache:downloadChapterAudio', async (_event, chapterId, audioUrl) => {
  const filePath = await audioCache.downloadChapterAudio(chapterId, audioUrl);
  return pathToFileURL(filePath).toString();
});

const gotSingleInstanceLock = app.requestSingleInstanceLock();

if (!gotSingleInstanceLock) {
  app.quit();
} else {
  app.on('second-instance', () => {
    if (mainWindow) {
      if (mainWindow.isMinimized()) mainWindow.restore();
      mainWindow.focus();
    }
  });

  app.whenReady().then(() => {
    db.init(app.getPath('userData'));
    audioCache.init(app.getPath('userData'));
    setAppMenu();
    createWindow();
    startAutoSync();
  });

  app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') app.quit();
  });

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });

  app.on('before-quit', () => {
    clearInterval(syncTimer);
    db.close();
  });
}
