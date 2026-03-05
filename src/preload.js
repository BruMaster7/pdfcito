const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
    getFileInfo: (filePath) => ipcRenderer.invoke('get-file-info', filePath),
    compressPDF: (inputPath, quality) => ipcRenderer.invoke('compress-pdf', { inputPath, quality }),
    openFileLocation: (filePath) => ipcRenderer.invoke('open-file-location', filePath),
    selectFile: () => ipcRenderer.invoke('select-file')
});
