import { registerEvent } from "../register-event";

const syncDownloadSources = async (_event: Electron.IpcMainInvokeEvent) => {
  // Local-first: download sources are managed locally, no remote sync
  return;
};

registerEvent("syncDownloadSources", syncDownloadSources);
