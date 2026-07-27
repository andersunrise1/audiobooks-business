const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('techspeak', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('app:getVersion'),

  auth: {
    setSession: (session) => ipcRenderer.invoke('auth:setSession', session),
  },

  cache: {
    getProgress: () => ipcRenderer.invoke('cache:getProgress'),
    getFlashcards: () => ipcRenderer.invoke('cache:getFlashcards'),
    queueProgress: (chapterId, payload) =>
      ipcRenderer.invoke('cache:queueProgress', chapterId, payload),
    queueReview: (flashcardId, quality) =>
      ipcRenderer.invoke('cache:queueReview', flashcardId, quality),
    getCachedAudioPath: (chapterId) => ipcRenderer.invoke('cache:getCachedAudioPath', chapterId),
    downloadChapterAudio: (chapterId, audioUrl) =>
      ipcRenderer.invoke('cache:downloadChapterAudio', chapterId, audioUrl),
  },

  sync: {
    now: () => ipcRenderer.invoke('sync:now'),
    onStatusChange: (callback) => {
      const handler = (_event, status) => callback(status);
      ipcRenderer.on('sync:status', handler);
      return () => ipcRenderer.removeListener('sync:status', handler);
    },
  },
});
