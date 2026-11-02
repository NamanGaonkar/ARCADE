import axios from "axios";
import crypto from "node:crypto";
import { registerEvent } from "../register-event";
import { downloadSourcesSublevel } from "@main/level";
import { DownloadSourceStatus } from "@shared";
import type { DownloadSource, DownloadSourceDownload } from "@types";
import { logger } from "@main/services";
import { saveSourceDownloads } from "@main/services/download-sources-storage";

const addDownloadSource = async (
  _event: Electron.IpcMainInvokeEvent,
  url: string
): Promise<DownloadSource> => {
  try {
    const existingSources = await downloadSourcesSublevel.values().all();
    const urlExists = existingSources.some((source) => source.url === url);

    if (urlExists) {
      throw new Error("Download source with this URL already exists");
    }

    logger.info(`[addDownloadSource] Fetching source from: ${url}`);
    const response = await axios.get(url, {
      headers: {
        "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.0",
        Accept: "application/json, text/plain, */*",
      },
      timeout: 20000,
    });

    const data = response.data;
    let name = "Custom Source";
    let downloads: DownloadSourceDownload[] = [];

    if (Array.isArray(data)) {
      downloads = data;
      try {
        name =
          new URL(url).pathname.split("/").pop()?.replace(".json", "") ||
          "Custom Source";
      } catch {
        name = "Custom Source";
      }
    } else if (data && typeof data === "object") {
      name = data.name || data.title || "Custom Source";
      downloads = Array.isArray(data.downloads) ? data.downloads : [];
    }

    const id = crypto.randomUUID();
    const downloadSource: DownloadSource = {
      id,
      name,
      url,
      status: DownloadSourceStatus.Matched,
      downloadCount: downloads.length,
      createdAt: new Date().toISOString(),
    };

    await saveSourceDownloads(id, downloads);
    await downloadSourcesSublevel.put(id, downloadSource);
    logger.info(
      `[addDownloadSource] Added source '${name}' with ${downloads.length} downloads.`
    );

    return downloadSource;
  } catch (error) {
    logger.error("Failed to add download source:", error);
    throw error;
  }
};

registerEvent("addDownloadSource", addDownloadSource);
