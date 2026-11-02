import { downloadSourcesSublevel } from "@main/level";
import { registerEvent } from "../register-event";
import {
  deleteSourceDownloads,
  clearAllSourceDownloads,
} from "@main/services/download-sources-storage";
import { logger } from "@main/services";

const removeDownloadSource = async (
  _event: Electron.IpcMainInvokeEvent,
  removeAll = false,
  downloadSourceId?: string
) => {
  try {
    if (removeAll) {
      await downloadSourcesSublevel.clear();
      await clearAllSourceDownloads();
      logger.info("[removeDownloadSource] Removed all download sources");
    } else if (downloadSourceId) {
      await downloadSourcesSublevel.del(downloadSourceId);
      await deleteSourceDownloads(downloadSourceId);
      logger.info(`[removeDownloadSource] Removed download source ${downloadSourceId}`);
    }
  } catch (error) {
    logger.error("[removeDownloadSource] Failed to remove download source:", error);
    throw error;
  }
};

registerEvent("removeDownloadSource", removeDownloadSource);
