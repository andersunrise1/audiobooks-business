const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('techspeak', {
  platform: process.platform,
  getVersion: () => ipcRenderer.invoke('app:getVersion'),
});
