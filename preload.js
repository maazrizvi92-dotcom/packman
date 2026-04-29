const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('api', {
  generateText: (prompt, tone) => ipcRenderer.invoke('generate-text', prompt, tone)
});
