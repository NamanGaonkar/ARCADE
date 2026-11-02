import fs from "node:fs";
import path from "node:path";
import axios from "axios";
import { app } from "electron";
import { downloadSourcesSublevel } from "@main/level";
import { DownloadSourceStatus } from "@shared";
import { logger } from "./logger";
import type { DownloadSource, DownloadSourceDownload, GameRepack } from "@types";

export interface SourceSeedConfig {
  name: string;
  url: string;
  mirrors?: string[];
  category: "modern" | "classic" | string;
}

export const INITIAL_SOURCE_CONFIGS: SourceSeedConfig[] = [
  {
    name: "FitGirl Repacks",
    url: "https://hydralinks.cloud/sources/fitgirl.json",
    mirrors: [
      "https://raw.githubusercontent.com/TypeHintsFun/HydraRepacks/main/fitgirl.json",
      "https://web.archive.org/web/20240901000000id_/https://hydralinks.cloud/sources/fitgirl.json",
    ],
    category: "modern",
  },
  {
    name: "DODI Repacks",
    url: "https://hydralinks.cloud/sources/dodi.json",
    mirrors: [
      "https://web.archive.org/web/20240901000000id_/https://hydralinks.cloud/sources/dodi.json",
    ],
    category: "modern",
  },
  {
    name: "SteamRip",
    url: "https://hydralinks.cloud/sources/steamrip.json",
    mirrors: [
      "https://web.archive.org/web/20240901000000id_/https://hydralinks.cloud/sources/steamrip.json",
    ],
    category: "modern",
  },
  {
    name: "GOG",
    url: "https://hydralinks.cloud/sources/gog.json",
    mirrors: [
      "https://raw.githubusercontent.com/TypeHintsFun/HydraRepacks/main/gog.json",
      "https://web.archive.org/web/20240901000000id_/https://hydralinks.cloud/sources/gog.json",
    ],
    category: "modern",
  },
  {
    name: "OnlineFix",
    url: "https://hydralinks.cloud/sources/onlinefix.json",
    mirrors: [
      "https://raw.githubusercontent.com/TypeHintsFun/HydraRepacks/main/onlinefix.json",
      "https://web.archive.org/web/20240901000000id_/https://hydralinks.cloud/sources/onlinefix.json",
    ],
    category: "modern",
  },
  {
    name: "PSX Roms (Retro)",
    url: "https://hydralinks.cloud/sources/psx-roms.json",
    mirrors: [
      "https://raw.githubusercontent.com/TypeHintsFun/HydraRepacks/main/xatab.json",
    ],
    category: "classic",
  },
];

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

// In-memory memory cache for fast searching across catalogue
const inMemoryDownloadsCache = new Map<string, DownloadSourceDownload[]>();

export const saveSourceDownloads = async (
  sourceId: string,
  downloads: DownloadSourceDownload[]
): Promise<void> => {
  try {
    const filePath = getSourceFilePath(sourceId);
    await fs.promises.writeFile(filePath, JSON.stringify(downloads), "utf8");
    inMemoryDownloadsCache.set(sourceId, downloads);
  } catch (error) {
    logger.error(`[DownloadSourcesStorage] Failed to save downloads for source ${sourceId}`, error);
  }
};

export const loadSourceDownloads = async (
  sourceId: string
): Promise<DownloadSourceDownload[]> => {
  if (inMemoryDownloadsCache.has(sourceId)) {
    return inMemoryDownloadsCache.get(sourceId)!;
  }

  try {
    const dir = getSourcesDir();
    let filePath = getSourceFilePath(sourceId);
    if (!fs.existsSync(filePath)) {
      const files = await fs.promises.readdir(dir).catch(() => []);
      const matched = files.find(
        (f) =>
          f.toLowerCase().replace(/\.json$/, "") ===
          sourceId.toLowerCase().replace(/\.json$/, "")
      );
      if (matched) {
        filePath = path.join(dir, matched);
      } else {
        return [];
      }
    }

    const content = await fs.promises.readFile(filePath, "utf8");
    const raw = JSON.parse(content);
    let downloads: DownloadSourceDownload[] = [];
    if (Array.isArray(raw)) {
      downloads = raw;
    } else if (raw && typeof raw === "object" && Array.isArray(raw.downloads)) {
      downloads = raw.downloads;
    }

    inMemoryDownloadsCache.set(sourceId, downloads);
    return downloads;
  } catch (error) {
    logger.error(`[DownloadSourcesStorage] Failed to load downloads for source ${sourceId}`, error);
    return [];
  }
};

export const deleteSourceDownloads = async (sourceId: string): Promise<void> => {
  try {
    inMemoryDownloadsCache.delete(sourceId);
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
    inMemoryDownloadsCache.clear();
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

const fetchSourceWithFallback = async (urls: string[]): Promise<any> => {
  for (const url of urls) {
    try {
      logger.info(`[DownloadSourcesStorage] Fetching source from: ${url}`);
      const res = await axios.get(url, {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/126.0.0.0 Safari/537.36",
          Accept: "application/json, text/plain, */*",
        },
        timeout: 25000,
        maxRedirects: 5,
      });

      if (res.data && (Array.isArray(res.data) || typeof res.data === "object")) {
        return res.data;
      }
    } catch (err: any) {
      logger.warn(`[DownloadSourcesStorage] Fetch failed for ${url}: ${err?.message || err}`);
    }
  }
  throw new Error(`All mirrors failed for URLs: ${urls.join(", ")}`);
};

export const seedDownloadSources = async (
  configs: SourceSeedConfig[] = INITIAL_SOURCE_CONFIGS
): Promise<void> => {
  logger.info("[DownloadSourcesStorage] Starting initial sources seeding routine...");

  const dir = getSourcesDir();
  const existingFiles = await fs.promises.readdir(dir).catch(() => []);

  for (const config of configs) {
    try {
      const existingSources = await downloadSourcesSublevel.values().all();
      const existing = existingSources.find(
        (s) => s.url === config.url || s.name === config.name
      );

      const slug = config.name.toLowerCase().replace(/[^a-z0-9]/g, "");
      let sourceId = existing ? existing.id : slug;
      let filePath = getSourceFilePath(sourceId);

      // Check if file already exists on disk under slug or name or uuid
      const matchedFile = existingFiles.find((f) => {
        const base = f.toLowerCase().replace(/\.json$/, "");
        return (
          base === slug ||
          base === sourceId ||
          config.name.toLowerCase().includes(base) ||
          base.includes(slug.slice(0, 4))
        );
      });

      if (matchedFile) {
        filePath = path.join(dir, matchedFile);
        sourceId = matchedFile.replace(/\.json$/, "");
        try {
          const raw = JSON.parse(await fs.promises.readFile(filePath, "utf8"));
          const items: any[] = Array.isArray(raw) ? raw : raw.downloads || [];
          if (items.length > 0) {
            inMemoryDownloadsCache.set(sourceId, items);
            await downloadSourcesSublevel.put(sourceId, {
              id: sourceId,
              name: config.name,
              url: config.url,
              status: DownloadSourceStatus.Matched,
              downloadCount: items.length,
              createdAt: existing?.createdAt || new Date().toISOString(),
            });
            logger.info(
              `[DownloadSourcesStorage] Synced local source '${config.name}' (${items.length} downloads) to LevelDB.`
            );
            continue;
          }
        } catch {}
      }

      const initialRecord: DownloadSource = {
        id: sourceId,
        name: config.name,
        url: config.url,
        status: DownloadSourceStatus.PendingMatching,
        downloadCount: 0,
        createdAt: existing?.createdAt || new Date().toISOString(),
      };
      await downloadSourcesSublevel.put(sourceId, initialRecord);

      const urlsToTry = [config.url, ...(config.mirrors || [])];
      try {
        const data = await fetchSourceWithFallback(urlsToTry);
        let downloads: DownloadSourceDownload[] = [];

        if (Array.isArray(data)) {
          downloads = data.map((item: any) => ({
            title: item.title || item.name || "",
            fileSize: item.fileSize || item.packed || item.original || "N/A",
            uploadDate: item.uploadDate || item.date || "",
            uris: Array.isArray(item.uris)
              ? item.uris
              : item.magnet
              ? [item.magnet]
              : item.link
              ? [item.link]
              : [],
            uriGroups: Array.isArray(item.uriGroups) ? item.uriGroups : undefined,
          }));
        } else if (data && typeof data === "object") {
          downloads = Array.isArray(data.downloads) ? data.downloads : [];
        }

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

        await saveSourceDownloads(sourceId, downloads);

        const sourceRecord: DownloadSource = {
          id: sourceId,
          name: config.name,
          url: config.url,
          status: DownloadSourceStatus.Matched,
          downloadCount: downloads.length,
          createdAt: initialRecord.createdAt,
        };

        await downloadSourcesSublevel.put(sourceId, sourceRecord);
        logger.info(
          `[DownloadSourcesStorage] Successfully seeded '${config.name}' with ${downloads.length} downloads.`
        );
      } catch (fetchErr) {
        logger.warn(
          `[DownloadSourcesStorage] Network fetch delayed for '${config.name}', keeping initial source entry:`,
          fetchErr
        );
        await downloadSourcesSublevel.put(sourceId, {
          ...initialRecord,
          status: DownloadSourceStatus.Matched,
        });
      }
    } catch (error) {
      logger.error(
        `[DownloadSourcesStorage] Failed to seed source '${config.name}':`,
        error
      );
    }
  }
};

const normalizeTitle = (title: string): string => {
  return title
    .toLowerCase()
    .replace(/[®™©:]/g, " ")
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
  const queryTokens = normalizedGameTitle.split(" ").filter((t) => t.length > 2);

  try {
    const dir = getSourcesDir();
    const files = await fs.promises.readdir(dir).catch(() => []);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const sourceKey = file.replace(/\.json$/, "");
      const filePath = path.join(dir, file);

      let downloads = inMemoryDownloadsCache.get(sourceKey);
      let sourceName = sourceKey;

      if (!downloads) {
        try {
          const content = await fs.promises.readFile(filePath, "utf8");
          const raw = JSON.parse(content);
          if (Array.isArray(raw)) {
            downloads = raw;
          } else if (raw && typeof raw === "object") {
            downloads = Array.isArray(raw.downloads) ? raw.downloads : [];
            if (raw.name) sourceName = raw.name;
          }
          if (downloads) {
            inMemoryDownloadsCache.set(sourceKey, downloads);
          }
        } catch {
          continue;
        }
      }

      if (!downloads || !Array.isArray(downloads)) continue;

      const lowerKey = sourceKey.toLowerCase();
      let displayName = sourceName;
      if (lowerKey.includes("fitgirl")) displayName = "FitGirl Repacks";
      else if (lowerKey.includes("dodi")) displayName = "DODI Repacks";
      else if (lowerKey.includes("steamrip")) displayName = "SteamRip";
      else if (lowerKey.includes("gog")) displayName = "GOG";
      else if (lowerKey.includes("onlinefix")) displayName = "OnlineFix";
      else if (lowerKey.includes("psx") || lowerKey.includes("xatab"))
        displayName = "PSX Roms (Retro)";

      downloads.forEach((item, index) => {
        if (!item.title) return;
        const normalizedItemTitle = normalizeTitle(item.title);

        const isExactOrSubstring =
          normalizedItemTitle === normalizedGameTitle ||
          normalizedItemTitle.includes(normalizedGameTitle) ||
          normalizedGameTitle.includes(normalizedItemTitle);

        let isTokenMatch = false;
        if (!isExactOrSubstring && queryTokens.length >= 2) {
          isTokenMatch = queryTokens.every((token) =>
            normalizedItemTitle.includes(token)
          );
        }

        if (isExactOrSubstring || isTokenMatch) {
          results.push({
            id: `${sourceKey}-${index}`,
            title: item.title,
            fileSize: item.fileSize ?? null,
            uris: Array.isArray(item.uris) ? item.uris : [],
            uriGroups: Array.isArray(item.uriGroups)
              ? item.uriGroups
              : undefined,
            unavailableUris: [],
            uploadDate: item.uploadDate ?? null,
            downloadSourceId: sourceKey,
            downloadSourceName: displayName,
            createdAt: new Date().toISOString(),
          });
        }
      });
    }
  } catch (error) {
    logger.error("[DownloadSourcesStorage] Error searching downloads for game", error);
  }

  return results;
};

export const getMatchingSourceNamesForGame = async (
  gameTitle: string
): Promise<string[]> => {
  const repacks = await findDownloadsForGame(gameTitle);
  return Array.from(new Set(repacks.map((r) => r.downloadSourceName)));
};
