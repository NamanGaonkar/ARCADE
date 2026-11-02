import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { downloadSourcesSublevel } from "@main/level";
import { logger } from "./logger";
import type { DownloadSourceDownload, GameRepack } from "@types";

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
