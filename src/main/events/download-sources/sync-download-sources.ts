import axios from "axios";
import { downloadSourcesSublevel } from "@main/level";
import { registerEvent } from "../register-event";
import { DownloadSourceStatus } from "@shared";
import type { DownloadSourceDownload } from "@types";
import { saveSourceDownloads } from "@main/services/download-sources-storage";
import { logger } from "@main/services";

const syncDownloadSources = async (_event: Electron.IpcMainInvokeEvent) => {
  try {
    const allSources = await downloadSourcesSublevel.values().all();
    logger.info(`[syncDownloadSources] Syncing ${allSources.length} sources`);

    for (const source of allSources) {
      try {
        const response = await axios.get(source.url, {
          headers: {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.0",
            Accept: "application/json, text/plain, */*",
          },
          timeout: 20000,
        });

        const data = response.data;
        let downloads: DownloadSourceDownload[] = [];
        let name = source.name;

        if (Array.isArray(data)) {
          downloads = data;
        } else if (data && typeof data === "object") {
          name = data.name || data.title || source.name;
          downloads = Array.isArray(data.downloads) ? data.downloads : [];
        }

        await saveSourceDownloads(source.id, downloads);
        await downloadSourcesSublevel.put(source.id, {
          ...source,
          name,
          downloadCount: downloads.length,
          status: DownloadSourceStatus.Matched,
        });
      } catch (err) {
        logger.error(`[syncDownloadSources] Failed to sync source ${source.name} (${source.url})`, err);
        await downloadSourcesSublevel.put(source.id, {
          ...source,
          status: DownloadSourceStatus.Failed,
        });
      }
    }
  } catch (error) {
    logger.error("[syncDownloadSources] Error during sync:", error);
  }
};

registerEvent("syncDownloadSources", syncDownloadSources);
