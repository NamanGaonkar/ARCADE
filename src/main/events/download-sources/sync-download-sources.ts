import { seedDownloadSources } from "@main/services/download-sources-storage";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";

const syncDownloadSources = async (_event: Electron.IpcMainInvokeEvent) => {
  try {
    logger.info("[syncDownloadSources] Syncing download sources via seed routine");
    await seedDownloadSources();
  } catch (error) {
    logger.error("[syncDownloadSources] Error during sync:", error);
  }
};

registerEvent("syncDownloadSources", syncDownloadSources);
