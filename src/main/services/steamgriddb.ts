import axios from "axios";
import { logger } from "./logger";
import type { ShopAssets } from "@types";

const STEAMGRIDDB_API_KEY = "f3465b31b507d8fd7b0cd400b848079c";
const BASE_URL = "https://www.steamgriddb.com/api/v2";

const client = axios.create({
  baseURL: BASE_URL,
  headers: {
    Authorization: `Bearer ${STEAMGRIDDB_API_KEY}`,
  },
  timeout: 10000,
});

const memoryCache = new Map<string, Partial<ShopAssets>>();

export interface SteamGridDBAssets {
  libraryImageUrl: string | null;
  libraryHeroImageUrl: string | null;
  logoImageUrl: string | null;
  iconUrl: string | null;
  coverImageUrl: string | null;
}

export class SteamGridDBService {
  /**
   * Search SteamGridDB for a game and fetch all artwork assets
   */
  public static async fetchArtwork(
    title: string,
    steamAppId?: string | number | null
  ): Promise<SteamGridDBAssets | null> {
    const cacheKey = steamAppId ? `steam:${steamAppId}` : `title:${title.toLowerCase().trim()}`;
    if (memoryCache.has(cacheKey)) {
      return memoryCache.get(cacheKey) as SteamGridDBAssets;
    }

    try {
      let gameId: number | null = null;

      // 1. If steamAppId is provided, attempt direct steam lookup
      if (steamAppId && Number(steamAppId) > 0) {
        try {
          const steamRes = await client.get(`/games/steam/${steamAppId}`);
          if (steamRes.data?.success && steamRes.data?.data?.id) {
            gameId = steamRes.data.data.id;
          }
        } catch {
          // ignore and fall back to title search
        }
      }

      // 2. Fall back to search by title
      if (!gameId && title && title.trim().length > 0) {
        const cleanTitle = title
          .replace(/[®™©:]/g, " ")
          .replace(/\[.*?\]|\(.*?\)/g, " ")
          .replace(/\b(repack|edition|remastered|goty|deluxe|update|definitive|directors cut)\b/gi, "")
          .replace(/\s+/g, " ")
          .trim();

        try {
          const searchRes = await client.get(`/search/autocomplete/${encodeURIComponent(cleanTitle)}`);
          if (searchRes.data?.success && Array.isArray(searchRes.data?.data) && searchRes.data.data.length > 0) {
            gameId = searchRes.data.data[0].id;
          }
        } catch {}

        if (!gameId && cleanTitle.includes(" ")) {
          // Fall back to first 3 words
          const shortTitle = cleanTitle.split(" ").slice(0, 3).join(" ");
          try {
            const shortRes = await client.get(`/search/autocomplete/${encodeURIComponent(shortTitle)}`);
            if (shortRes.data?.success && Array.isArray(shortRes.data?.data) && shortRes.data.data.length > 0) {
              gameId = shortRes.data.data[0].id;
            }
          } catch {}
        }
      }

      if (!gameId) {
        return null;
      }

      // 3. Concurrently fetch grids, heroes, logos, icons
      const [gridsRes, heroesRes, logosRes, iconsRes] = await Promise.allSettled([
        client.get(`/grids/game/${gameId}?dimensions=600x900`),
        client.get(`/heroes/game/${gameId}`),
        client.get(`/logos/game/${gameId}`),
        client.get(`/icons/game/${gameId}`),
      ]);

      let gridUrl =
        gridsRes.status === "fulfilled" && gridsRes.value.data?.success && gridsRes.value.data?.data?.[0]?.url
          ? gridsRes.value.data.data[0].url
          : null;

      // If no 600x900 grid found, query without dimensions
      if (!gridUrl) {
        try {
          const anyGridRes = await client.get(`/grids/game/${gameId}`);
          if (anyGridRes.data?.success && anyGridRes.data?.data?.[0]?.url) {
            gridUrl = anyGridRes.data.data[0].url;
          }
        } catch {}
      }

      const heroUrl =
        heroesRes.status === "fulfilled" && heroesRes.value.data?.success && heroesRes.value.data?.data?.[0]?.url
          ? heroesRes.value.data.data[0].url
          : null;

      const logoUrl =
        logosRes.status === "fulfilled" && logosRes.value.data?.success && logosRes.value.data?.data?.[0]?.url
          ? logosRes.value.data.data[0].url
          : null;

      const iconUrl =
        iconsRes.status === "fulfilled" && iconsRes.value.data?.success && iconsRes.value.data?.data?.[0]?.url
          ? iconsRes.value.data.data[0].url
          : null;

      const result: SteamGridDBAssets = {
        libraryImageUrl: gridUrl,
        libraryHeroImageUrl: heroUrl,
        logoImageUrl: logoUrl,
        iconUrl: iconUrl,
        coverImageUrl: heroUrl || gridUrl,
      };

      memoryCache.set(cacheKey, result);
      return result;
    } catch (error) {
      logger.warn(`[SteamGridDB] Failed to fetch artwork for '${title}' (${steamAppId}):`, error);
      return null;
    }
  }
}
