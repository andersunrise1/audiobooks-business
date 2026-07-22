const { contextBridge } = require('electron');

contextBridge.exposeInMainWorld('techspeak', {
  platform: process.platform,
});
