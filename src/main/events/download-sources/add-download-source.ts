import axios from "axios";
import { net } from "electron";
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
  const cleanUrl = (url || "").trim();
  if (!cleanUrl) {
    throw new Error("Invalid URL provided");
  }

  try {
    const existingSources = await downloadSourcesSublevel.values().all();
    const urlExists = existingSources.some((source) => source.url === cleanUrl);

    if (urlExists) {
      throw new Error("Download source with this URL already exists");
    }

    logger.info(`[addDownloadSource] Fetching source from: ${cleanUrl}`);

    let data: any = null;

    // First attempt: Electron native net.fetch (uses Chromium network stack and TLS fingerprint)
    try {
      const netRes = await net.fetch(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 ArcadeX/1.0.9",
          Accept: "application/json, text/plain, */*",
        },
      });

      if (netRes.ok) {
        data = await netRes.json();
      } else {
        logger.warn(
          `[addDownloadSource] net.fetch returned HTTP ${netRes.status}, falling back to axios`
        );
      }
    } catch (netErr) {
      logger.warn("[addDownloadSource] net.fetch failed, falling back to axios", netErr);
    }

    // Fallback attempt: axios
    if (!data) {
      const response = await axios.get(cleanUrl, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36 ArcadeX/1.0.9",
          Accept: "application/json, text/plain, */*",
        },
        timeout: 25000,
      });

      data =
        typeof response.data === "string"
          ? JSON.parse(response.data)
          : response.data;
    }

    if (!data || (typeof data !== "object" && !Array.isArray(data))) {
      throw new Error("The source did not return a valid JSON payload");
    }

    let name = "Custom Source";
    let downloads: DownloadSourceDownload[] = [];

    if (Array.isArray(data)) {
      downloads = data;
      try {
        name =
          new URL(cleanUrl).pathname.split("/").pop()?.replace(".json", "") ||
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
      url: cleanUrl,
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
