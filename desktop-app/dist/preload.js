const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('albumApi', {
  chooseRoot: () => ipcRenderer.invoke('album:select-root'),
  readTree: (rootPath) => ipcRenderer.invoke('album:read-tree', rootPath),
});
