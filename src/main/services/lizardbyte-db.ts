import axios from "axios";
import fs from "node:fs";
import path from "node:path";
import { app } from "electron";
import { logger } from "./logger";

export interface LizardByteGameDetails {
  id: number;
  name: string;
  summary?: string;
  storyline?: string;
  coverUrl?: string;
  heroUrl?: string;
  artworkUrls: string[];
  screenshotUrls: string[];
  genres: string[];
  developers: string[];
  releaseDate?: string;
  videos: { title: string; url: string; thumb?: string }[];
}

const BASE_URL = "https://app.lizardbyte.dev/GameDB";

const memoryBucketCache = new Map<string, Record<string, { name: string }>>();
const memoryGameCache = new Map<number, LizardByteGameDetails>();

const getCacheDir = () => {
  const dir = path.join(app.getPath("userData"), "gamedb-cache");
  if (!fs.existsSync(dir)) {
    fs.mkdirSync(dir, { recursive: true });
  }
  return dir;
};

const getBucketKey = (title: string): string => {
  const clean = title.toLowerCase().replace(/[^a-z0-9]/g, "");
  if (clean.length === 0) return "@";
  if (clean.length === 1) return clean;
  return clean.slice(0, 2);
};

export class LizardByteDBService {
  /**
   * Fetch a bucket search index (e.g. 'cy.json')
   */
  public static async getBucket(bucketKey: string): Promise<Record<string, { name: string }>> {
    if (memoryBucketCache.has(bucketKey)) {
      return memoryBucketCache.get(bucketKey)!;
    }

    const localPath = path.join(getCacheDir(), `bucket_${bucketKey}.json`);
    if (fs.existsSync(localPath)) {
      try {
        const raw = await fs.promises.readFile(localPath, "utf8");
        const parsed = JSON.parse(raw);
        memoryBucketCache.set(bucketKey, parsed);
        return parsed;
      } catch {
        // Fall through to network
      }
    }

    try {
      const res = await axios.get(`${BASE_URL}/buckets/${bucketKey}.json`, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0 ArcadeX/1.0.3" },
      });
      if (res.data && typeof res.data === "object") {
        memoryBucketCache.set(bucketKey, res.data);
        fs.promises.writeFile(localPath, JSON.stringify(res.data), "utf8").catch(() => {});
        return res.data;
      }
    } catch (err) {
      logger.warn(`[LizardByteDB] Failed to load bucket ${bucketKey}:`, err);
    }

    return {};
  }

  /**
   * Search for game by title
   */
  public static async searchGame(title: string): Promise<number | null> {
    if (!title) return null;

    const cleanTitle = title
      .toLowerCase()
      .replace(/[®™©:]/g, " ")
      .replace(/\[.*?\]|\(.*?\)/g, " ")
      .replace(/\b(repack|edition|remastered|goty|deluxe|update|definitive|directors cut)\b/gi, "")
      .replace(/\s+/g, " ")
      .trim();

    if (!cleanTitle) return null;

    const bucketKey = getBucketKey(cleanTitle);
    const bucket = await this.getBucket(bucketKey);

    // 1. Exact match
    for (const [idStr, entry] of Object.entries(bucket)) {
      if (entry.name && entry.name.toLowerCase().trim() === cleanTitle) {
        return Number(idStr);
      }
    }

    // 2. Contains match
    for (const [idStr, entry] of Object.entries(bucket)) {
      if (!entry.name) continue;
      const entryLower = entry.name.toLowerCase().trim();
      if (entryLower.includes(cleanTitle) || cleanTitle.includes(entryLower)) {
        return Number(idStr);
      }
    }

    // 3. First word match if multi-word
    const firstWord = cleanTitle.split(" ")[0];
    if (firstWord && firstWord.length >= 3) {
      for (const [idStr, entry] of Object.entries(bucket)) {
        if (!entry.name) continue;
        const entryLower = entry.name.toLowerCase();
        if (entryLower.startsWith(firstWord)) {
          return Number(idStr);
        }
      }
    }

    return null;
  }

  /**
   * Fetch deep metadata for a game ID
   */
  public static async getGameDetails(id: number): Promise<LizardByteGameDetails | null> {
    if (memoryGameCache.has(id)) {
      return memoryGameCache.get(id)!;
    }

    const localPath = path.join(getCacheDir(), `game_${id}.json`);
    if (fs.existsSync(localPath)) {
      try {
        const raw = await fs.promises.readFile(localPath, "utf8");
        const parsed = JSON.parse(raw);
        memoryGameCache.set(id, parsed);
        return parsed;
      } catch {
        // Fall through
      }
    }

    try {
      const res = await axios.get(`${BASE_URL}/games/${id}.json`, {
        timeout: 10000,
        headers: { "User-Agent": "Mozilla/5.0 ArcadeX/1.0.3" },
      });

      const d = res.data;
      if (!d || !d.id) return null;

      const formatIgdbImage = (url?: string, size = "t_cover_big") => {
        if (!url) return undefined;
        let formatted = url.startsWith("//") ? `https:${url}` : url;
        return formatted.replace(/t_[a-z0-9_]+/, size);
      };

      const coverUrl = formatIgdbImage(d.cover?.url, "t_cover_big");
      const artworkUrls: string[] = Array.isArray(d.artworks)
        ? d.artworks.map((a: any) => formatIgdbImage(a?.url, "t_1080p")).filter(Boolean)
        : [];
      const screenshotUrls: string[] = Array.isArray(d.screenshots)
        ? d.screenshots.map((s: any) => formatIgdbImage(s?.url, "t_1080p")).filter(Boolean)
        : [];

      const heroUrl = artworkUrls[0] || screenshotUrls[0] || coverUrl;

      const genres: string[] = Array.isArray(d.genres)
        ? d.genres.map((g: any) => g?.name).filter(Boolean)
        : [];

      const developers: string[] = Array.isArray(d.involved_companies)
        ? d.involved_companies
            .filter((c: any) => c?.developer)
            .map((c: any) => c?.company?.name)
            .filter(Boolean)
        : [];

      let releaseDate: string | undefined;
      if (Array.isArray(d.release_dates) && d.release_dates.length > 0) {
        const dateObj = d.release_dates[0];
        if (dateObj.date) {
          releaseDate = new Date(dateObj.date * 1000).toLocaleDateString("en-US", {
            year: "numeric",
            month: "short",
            day: "numeric",
          });
        }
      }

      const videos: { title: string; url: string; thumb?: string }[] = Array.isArray(d.videos)
        ? d.videos.map((v: any) => ({
            title: v.name || v.title || "Trailer",
            url: v.url || `https://www.youtube.com/watch?v=${v.video_id}`,
            thumb: v.thumb,
          }))
        : [];

      const details: LizardByteGameDetails = {
        id: d.id,
        name: d.name || "",
        summary: d.summary || "",
        storyline: d.storyline || "",
        coverUrl,
        heroUrl,
        artworkUrls,
        screenshotUrls,
        genres,
        developers,
        releaseDate,
        videos,
      };

      memoryGameCache.set(id, details);
      fs.promises.writeFile(localPath, JSON.stringify(details), "utf8").catch(() => {});

      return details;
    } catch (err) {
      logger.warn(`[LizardByteDB] Failed to load game ${id}:`, err);
      return null;
    }
  }

  /**
   * Search for game by title and fetch its deep details
   */
  public static async fetchGameByTitle(title: string): Promise<LizardByteGameDetails | null> {
    const id = await this.searchGame(title);
    if (!id) return null;
    return this.getGameDetails(id);
  }
}
