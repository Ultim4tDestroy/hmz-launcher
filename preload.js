const { contextBridge, ipcRenderer } = require('electron');

const call = async (ch, ...args) => {
  const r = await ipcRenderer.invoke(ch, ...args);
  if (!r.ok) throw new Error(r.error);
  return r.data;
};

contextBridge.exposeInMainWorld('hmz', {
  call,
  on: (ch, fn) => {
    const f = (_e, d) => fn(d);
    ipcRenderer.on(ch, f);
    return () => ipcRenderer.removeListener(ch, f);
  },
});
