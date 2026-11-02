import { registerEvent } from "../register-event";

const getAuth = async (_event: Electron.IpcMainInvokeEvent) => null;

registerEvent("getAuth", getAuth);
