import fs from "node:fs";
import path from "node:path";
import crypto from "node:crypto";
import axios from "axios";
import { app } from "electron";
import { downloadSourcesSublevel } from "@main/level";
import { DownloadSourceStatus } from "@shared";
import { logger } from "./logger";
import type { DownloadSource, DownloadSourceDownload, GameRepack } from "@types";

export interface SourceSeedConfig {
  name: string;
  url: string;
  category: "modern" | "classic" | string;
}

export const INITIAL_SOURCE_CONFIGS: SourceSeedConfig[] = [
  { name: "FitGirl Repacks", url: "https://hydralinks.cloud/sources/fitgirl.json", category: "modern" },
  { name: "DODI Repacks", url: "https://hydralinks.cloud/sources/dodi.json", category: "modern" },
  { name: "SteamRip", url: "https://hydralinks.cloud/sources/steamrip.json", category: "modern" },
  { name: "GOG", url: "https://hydralinks.cloud/sources/gog.json", category: "modern" },
  { name: "OnlineFix", url: "https://hydralinks.cloud/sources/onlinefix.json", category: "modern" },
  { name: "PSX Roms (Retro)", url: "https://hydralinks.cloud/sources/psx-roms.json", category: "classic" }
];

export const seedDownloadSources = async (
  configs: SourceSeedConfig[] = INITIAL_SOURCE_CONFIGS
): Promise<void> => {
  logger.info("[DownloadSourcesStorage] Starting initial sources seeding routine...");

  for (const config of configs) {
    try {
      const existingSources = await downloadSourcesSublevel.values().all();
      const existing = existingSources.find((s) => s.url === config.url);
      if (existing) {
        logger.info(`[DownloadSourcesStorage] Source '${config.name}' already seeded. Skipping.`);
        continue;
      }

      logger.info(`[DownloadSourcesStorage] Fetching source schema: ${config.name} (${config.url})`);
      const response = await axios.get(config.url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
        },
        timeout: 20000,
      });

      const data = response.data;
      let downloads: DownloadSourceDownload[] = [];

      if (Array.isArray(data)) {
        downloads = data;
      } else if (data && typeof data === "object") {
        downloads = Array.isArray(data.downloads) ? data.downloads : [];
      }

      // Evaluate if metadata category equals 'classic', and conditionally inject tags: ['classic']
      const isClassic =
        config.category === "classic" ||
        (data && typeof data === "object" && data.category === "classic");

      if (isClassic) {
        downloads = downloads.map((item) => ({
          ...item,
          tags: Array.isArray(item.tags)
            ? Array.from(new Set([...item.tags, "classic"]))
            : ["classic"],
        }));
      }

      const sourceId = crypto.randomUUID();
      // Local serialization to disk
      await saveSourceDownloads(sourceId, downloads);

      const sourceRecord: DownloadSource = {
        id: sourceId,
        name: config.name,
        url: config.url,
        status: DownloadSourceStatus.Matched,
        downloadCount: downloads.length,
        createdAt: new Date().toISOString(),
      };

      await downloadSourcesSublevel.put(sourceId, sourceRecord);
      logger.info(
        `[DownloadSourcesStorage] Successfully seeded '${config.name}' with ${downloads.length} downloads (category: ${config.category}).`
      );
    } catch (error) {
      logger.error(
        `[DownloadSourcesStorage] Failed to seed source '${config.name}' from ${config.url}:`,
        error
      );
    }
  }
};

const getSourcesDir = () => {
  const dir = path.join(app.getPath("userData"), "download-sources");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getSourceFilePath = (sourceId: string) => {
  return path.join(getSourcesDir(), `${sourceId}.json`);
};

export const saveSourceDownloads = async (
  sourceId: string,
  downloads: DownloadSourceDownload[]
): Promise<void> => {
  try {
    const filePath = getSourceFilePath(sourceId);
    await fs.promises.writeFile(filePath, JSON.stringify(downloads), "utf8");
  } catch (error) {
    logger.error(`[DownloadSourcesStorage] Failed to save downloads for source ${sourceId}`, error);
  }
};

export const loadSourceDownloads = async (
  sourceId: string
): Promise<DownloadSourceDownload[]> => {
  try {
    const filePath = getSourceFilePath(sourceId);
    if (!fs.existsSync(filePath)) return [];
    const content = await fs.promises.readFile(filePath, "utf8");
    return JSON.parse(content) as DownloadSourceDownload[];
  } catch (error) {
    logger.error(`[DownloadSourcesStorage] Failed to load downloads for source ${sourceId}`, error);
    return [];
  }
};

export const deleteSourceDownloads = async (sourceId: string): Promise<void> => {
  try {
    const filePath = getSourceFilePath(sourceId);
    if (fs.existsSync(filePath)) {
      await fs.promises.unlink(filePath);
    }
  } catch (error) {
    logger.error(`[DownloadSourcesStorage] Failed to delete downloads for source ${sourceId}`, error);
  }
};

export const clearAllSourceDownloads = async (): Promise<void> => {
  try {
    const dir = getSourcesDir();
    if (fs.existsSync(dir)) {
      const files = await fs.promises.readdir(dir);
      for (const file of files) {
        if (file.endsWith(".json")) {
          await fs.promises.unlink(path.join(dir, file));
        }
      }
    }
  } catch (error) {
    logger.error("[DownloadSourcesStorage] Failed to clear all source downloads", error);
  }
};

const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/\[.*?\]|\(.*?\)|<.*?>/g, " ")
    .replace(/[^a-z0-9]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
};

export const findDownloadsForGame = async (
  gameTitle: string
): Promise<GameRepack[]> => {
  if (!gameTitle) return [];

  const normalizedGameTitle = normalizeTitle(gameTitle);
  if (!normalizedGameTitle) return [];

  const results: GameRepack[] = [];

  try {
    const sources = await downloadSourcesSublevel.values().all();

    for (const source of sources) {
      const downloads = await loadSourceDownloads(source.id);

      downloads.forEach((item, index) => {
        const normalizedItemTitle = normalizeTitle(item.title);
        const isMatch =
          normalizedItemTitle === normalizedGameTitle ||
          normalizedItemTitle.includes(normalizedGameTitle) ||
          normalizedGameTitle.includes(normalizedItemTitle);

        if (isMatch) {
          results.push({
            id: `${source.id}-${index}`,
            title: item.title,
            fileSize: item.fileSize ?? null,
            uris: Array.isArray(item.uris) ? item.uris : [],
            uriGroups: Array.isArray(item.uriGroups) ? item.uriGroups : undefined,
            unavailableUris: [],
            uploadDate: item.uploadDate ?? null,
            downloadSourceId: source.id,
            downloadSourceName: source.name,
            createdAt: source.createdAt || new Date().toISOString(),
          });
        }
      });
    }
  } catch (error) {
    logger.error("[DownloadSourcesStorage] Error searching downloads for game", error);
  }

  return results;
};
