'use strict';

// The Meter popover's bridge. It exposes only the popover's view model and a
// fixed set of commands; no settings writes and no credentials cross here.
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('remexMeter', {
  getState: () => ipcRenderer.invoke('meter:getState'),
  command: (name) => ipcRenderer.send('meter:command', String(name || '')),
  onState: (callback) => {
    const listener = (_event, state) => callback(state);
    ipcRenderer.on('meter:state', listener);
    return () => ipcRenderer.removeListener('meter:state', listener);
  },
  onOpened: (callback) => {
    const listener = () => callback();
    ipcRenderer.on('meter:opened', listener);
    return () => ipcRenderer.removeListener('meter:opened', listener);
  }
});
