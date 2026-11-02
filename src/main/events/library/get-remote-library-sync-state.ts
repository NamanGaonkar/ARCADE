import { registerEvent } from "../register-event";

const getRemoteLibrarySyncState = async () => false;

registerEvent("getRemoteLibrarySyncState", getRemoteLibrarySyncState);
