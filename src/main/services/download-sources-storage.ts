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

  // 1. Purge stale duplicate keys from previous migrations/runs
  try {
    const existingEntries: Array<{ key: string; value: DownloadSource }> = [];
    for await (const [key, value] of downloadSourcesSublevel.iterator()) {
      existingEntries.push({ key, value });
    }

    const groupedByName = new Map<string, Array<{ key: string; value: DownloadSource }>>();
    for (const entry of existingEntries) {
      const normName = (entry.value.name || "").toLowerCase().trim();
      if (!groupedByName.has(normName)) {
        groupedByName.set(normName, []);
      }
      groupedByName.get(normName)!.push(entry);
    }

    for (const [_name, entries] of groupedByName) {
      if (entries.length > 1) {
        // Sort: keep the one with Matched status or highest downloadCount
        entries.sort((a, b) => {
          const aCount = a.value.downloadCount || 0;
          const bCount = b.value.downloadCount || 0;
          return bCount - aCount;
        });

        const duplicates = entries.slice(1);
        for (const dup of duplicates) {
          logger.info(`[DownloadSourcesStorage] Purging duplicate source key: ${dup.key} (${dup.value.name})`);
          await downloadSourcesSublevel.del(dup.key).catch(() => {});
        }
      }
    }
  } catch (err) {
    logger.warn("[DownloadSourcesStorage] Error during duplicate source cleanup:", err);
  }

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
  if (!title) return "";
  let cleaned = title;
  // Clean release tags without wiping actual game titles
  cleaned = cleaned.replace(/\[(fitgirl|dodi|repack|steamrip|gog|onlinefix|scene|p2p|rune|tenoke|elamigos|xatab)[^\]]*\]/gi, " ");
  cleaned = cleaned.replace(/\((fitgirl|dodi|repack|steamrip|gog|onlinefix|scene|p2p|rune|tenoke|elamigos|xatab)[^)]*\)/gi, " ");
  // Strip trademark/copyright symbols and colons before Unicode normalization to prevent '™' -> 'TM' and '®' -> '(R)'
  cleaned = cleaned.replace(/[®™©:]/g, " ");
  // If the whole title is wrapped in outer brackets like [ECHOSTASIS], unwrap outer brackets
  cleaned = cleaned.replace(/^\[(.*?)\]$/, "$1");
  cleaned = cleaned.replace(/^\((.*?)\)$/, "$1");
  return cleaned
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
};

const EDITION_STOP_WORDS = new Set([
  "edition",
  "goty",
  "remastered",
  "remaster",
  "definitive",
  "deluxe",
  "enhanced",
  "director",
  "directors",
  "cut",
  "anniversary",
  "complete",
  "bundle",
  "repack",
  "steam",
  "pc",
  "digital",
  "collection",
  "anthology",
  "trilogy",
  "version",
  "update"
]);

export const findDownloadsForGame = async (
  gameTitle: string
): Promise<GameRepack[]> => {
  if (!gameTitle) return [];

  const cleanGameTitle = gameTitle.replace(/[\(（\[【].*?[\)）\]】]/g, "").trim();
  const [rootPart] = cleanGameTitle.split(/[:\-—–|/]/);
  const normalizedRootTitle = normalizeTitle(rootPart || gameTitle);
  const normalizedGameTitle = normalizeTitle(gameTitle);
  if (!normalizedGameTitle || normalizedGameTitle.length < 2) return [];

  const results: GameRepack[] = [];
  const commonStopWords = new Set(["the", "a", "an", "of", "in", "and", "to", "for", "on", "at", "by", "with"]);

  // Extract root tokens (e.g. "Crimson Desert Enhanced: Charting the Unknown" -> "crimson", "desert")
  const rootTokens = (normalizedRootTitle || normalizedGameTitle)
    .split(" ")
    .filter((t) => t.length > 1 && !commonStopWords.has(t) && !EDITION_STOP_WORDS.has(t));

  const queryTokens = normalizedGameTitle
    .split(" ")
    .filter((t) => t.length > 2 || /\d/.test(t));
  const gameNumberTokens = queryTokens.filter((t) => /^\d+$/.test(t));

  try {
    const dir = getSourcesDir();
    const files = await fs.promises.readdir(dir).catch(() => []);

    for (const file of files) {
      if (!file.endsWith(".json")) continue;
      const sourceKey = file.replace(/\.json$/, "");
      // Skip raw UUID orphan files
      if (/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(sourceKey)) {
        continue;
      }
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
      else if (lowerKey.includes("steamrip")) displayName = "SteamRip [Direct Download]";
      else if (lowerKey.includes("gog")) displayName = "GOG [DRM-Free]";
      else if (lowerKey.includes("onlinefix")) displayName = "OnlineFix [Multiplayer]";
      else if (lowerKey.includes("xatab")) displayName = "Xatab Repacks";
      else if (lowerKey.includes("psx")) displayName = "PSX Roms (Retro)";
      else if (/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(displayName)) {
        displayName = "Community Repack";
      }

      downloads.forEach((item, index) => {
        if (!item.title) return;
        const normalizedItemTitle = normalizeTitle(item.title);
        if (!normalizedItemTitle || normalizedItemTitle.length < 2) return;

        const isExact = normalizedItemTitle === normalizedGameTitle;
        const isStartsWith = normalizedItemTitle.startsWith(normalizedGameTitle);
        const itemContainsGame = normalizedItemTitle.includes(normalizedGameTitle);

        // Subtitle & Root match: e.g. "The Witcher 3" matches "The Witcher 3: Wild Hunt"
        const isRootMatch =
          normalizedRootTitle.length >= 3 &&
          (normalizedItemTitle === normalizedRootTitle ||
            normalizedItemTitle.startsWith(normalizedRootTitle));

        // Root token verification: Repack MUST contain the primary franchise / root tokens
        const itemTokens = new Set(normalizedItemTitle.split(" "));
        let hasAllRootTokens = false;
        if (rootTokens.length >= 2) {
          hasAllRootTokens = rootTokens.every((token) => itemTokens.has(token) || normalizedItemTitle.includes(token));
        } else if (rootTokens.length === 1 && rootTokens[0].length >= 3) {
          hasAllRootTokens = itemTokens.has(rootTokens[0]) || normalizedItemTitle.startsWith(rootTokens[0]);
        }

        // Sequence number consistency: "Red Dead Redemption 2" vs "Red Dead Redemption"
        if (gameNumberTokens.length > 0 && !isExact) {
          const hasMissingNumber = gameNumberTokens.some((num) => !itemTokens.has(num));
          if (hasMissingNumber) return;
        } else if (gameNumberTokens.length === 0 && !isExact && rootTokens.length > 0) {
          // If the game has NO sequence number (e.g. Red Dead Redemption 1), do not match a sequel like RDR 2
          const itemNumberTokens = normalizedItemTitle.split(" ").filter((t) => /^\d+$/.test(t));
          if (itemNumberTokens.some((num) => ["2", "3", "4", "5", "6", "7", "8", "9"].includes(num))) {
            return;
          }
        }

        // Mandatory check: Must be exact, root match, contain the full game title, or match all root tokens
        const isCandidate = isExact || isStartsWith || itemContainsGame || isRootMatch || hasAllRootTokens;
        if (!isCandidate) return;

        // Prevent false positives where an unrelated repack shares only a generic subtitle word
        if (!isExact && rootTokens.length > 0 && !hasAllRootTokens && !itemContainsGame) {
          return;
        }

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
      });
    }

    // Sort: exact matches first, then trusted sources (FitGirl, DODI, SteamRip, GOG)
    const trustedOrder = ["fitgirl", "dodi", "steamrip", "gog", "onlinefix"];
    results.sort((a, b) => {
      const aExact = normalizeTitle(a.title) === normalizedGameTitle ? 1 : 0;
      const bExact = normalizeTitle(b.title) === normalizedGameTitle ? 1 : 0;
      if (bExact !== aExact) return bExact - aExact;

      const aSourceLower = (a.downloadSourceName || "").toLowerCase();
      const bSourceLower = (b.downloadSourceName || "").toLowerCase();
      const aRank = trustedOrder.findIndex((t) => aSourceLower.includes(t));
      const bRank = trustedOrder.findIndex((t) => bSourceLower.includes(t));
      const aScore = aRank === -1 ? 99 : aRank;
      const bScore = bRank === -1 ? 99 : bRank;
      return aScore - bScore;
    });

    // Deduplicate repacks by download source + primary URI
    const seenRepacks = new Set<string>();
    const deduplicatedResults: GameRepack[] = [];
    for (const r of results) {
      const primaryUri = r.uris[0] || r.id;
      const key = `${r.downloadSourceName}:${primaryUri}`;
      if (!seenRepacks.has(key)) {
        seenRepacks.add(key);
        deduplicatedResults.push(r);
      }
    }

    return deduplicatedResults;
  } catch (error) {
    logger.error("[DownloadSourcesStorage] Error searching downloads for game", error);
  }

  return results;
};

export const getMatchingSourceNamesForGame = async (
  gameTitle: string
): Promise<string[]> => {
  const repacks = await findDownloadsForGame(gameTitle);
  return Array.from(
    new Set(
      repacks
        .map((r) => r.downloadSourceName)
        .filter(
          (name): name is string =>
            Boolean(name) &&
            !/^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(name)
        )
    )
  );
};
