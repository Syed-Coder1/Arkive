const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  onMenuAction: (callback) => {
    ipcRenderer.on('menu-new-receipt', callback);
    ipcRenderer.on('menu-export', callback);
  },
  
  removeAllListeners: (channel) => {
    ipcRenderer.removeAllListeners(channel);
  }
});