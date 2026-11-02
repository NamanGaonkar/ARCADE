import axios from "axios";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";
import {
  findDownloadsForGame,
  getMatchingSourceNamesForGame,
} from "@main/services/download-sources-storage";
import { getSteamAppDetails } from "@main/services/steam";
import {
  gamesShopCacheSublevel,
  gamesShopAssetsSublevel,
  gamesSublevel,
} from "@main/level";
import { levelKeys } from "@main/level/sublevels/keys";
import type { ShopAssets, CatalogueSearchResult, GameShop } from "@types";

interface HydraApiCallPayload {
  method:
    | "get"
    | "getResponse"
    | "post"
    | "postResponse"
    | "put"
    | "patch"
    | "delete";
  url: string;
  data?: any;
  params?: any;
}

let cachedCategories: any = null;
let lastCategoriesFetch = 0;
const CATEGORIES_CACHE_TTL = 5 * 60 * 1000;

async function getSteamFeaturedCategories(): Promise<any> {
  const now = Date.now();
  if (cachedCategories && now - lastCategoriesFetch < CATEGORIES_CACHE_TTL) {
    return cachedCategories;
  }

  try {
    const res = await axios.get(
      "https://store.steampowered.com/api/featuredcategories/?l=english&cc=US",
      {
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.3",
        },
        timeout: 15000,
      }
    );
    cachedCategories = res.data;
    lastCategoriesFetch = now;
    return cachedCategories;
  } catch (error) {
    logger.error("[hydraApiCall] Error fetching steam featuredcategories", error);
    return cachedCategories || {};
  }
}

const isNonGameItem = (item: any): boolean => {
  if (!item || !item.name) return true;
  const name = String(item.name).toLowerCase();
  return (
    item.type === "hardware" ||
    name.includes("steam frame") ||
    name.includes("steam controller") ||
    name.includes("steam deck") ||
    name.includes("valve index") ||
    name.includes("steam link")
  );
};

async function mapSteamItemToShopAssets(item: any): Promise<ShopAssets> {
  const objectId = String(item.id);
  const headerUrl =
    item.header_image ||
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/header.jpg`;

  const sources = await getMatchingSourceNamesForGame(item.name).catch(() => []);

  return {
    objectId,
    shop: "steam",
    title: item.name,
    iconUrl: headerUrl,
    libraryHeroImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/library_hero.jpg`,
    libraryImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/library_600x900.jpg`,
    logoImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/logo.png`,
    coverImageUrl: headerUrl,
    logoPosition: null,
    downloadSources: sources,
  };
}

const hydraApiCall = async (
  _event: Electron.IpcMainInvokeEvent,
  payload: HydraApiCallPayload
) => {
  const url = payload.url;

  if (url === "/features") {
    return [];
  }

  // Search Suggestions (/catalogue/search/suggestions)
  if (url.startsWith("/catalogue/search/suggestions")) {
    const query = (
      payload.params?.query ||
      payload.params?.title ||
      payload.data?.query ||
      payload.data?.title ||
      ""
    ).trim();

    if (!query) {
      return [];
    }

    try {
      const searchRes = await axios.get(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.3",
          },
          timeout: 10000,
        }
      );

      const items: any[] = (searchRes.data?.items || []).filter(
        (item: any) => !isNonGameItem(item)
      );

      const suggestions = items.slice(0, 8).map((item) => ({
        title: item.name,
        objectId: String(item.id),
        shop: "steam" as GameShop,
        iconUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
      }));

      return suggestions;
    } catch (err) {
      logger.error("[hydraApiCall] Suggestions error:", err);
      return [];
    }
  }

  // Catalogue: Hot, Weekly, Achievements
  if (
    url.startsWith("/catalogue/hot") ||
    url.startsWith("/catalogue/weekly") ||
    url.startsWith("/catalogue/achievements")
  ) {
    const categories = await getSteamFeaturedCategories();
    let rawItems: any[] = [];

    if (url.startsWith("/catalogue/hot")) {
      rawItems =
        categories.top_sellers?.items || categories.featured_win?.items || [];
    } else if (url.startsWith("/catalogue/weekly")) {
      rawItems =
        categories.specials?.items || categories.top_sellers?.items || [];
    } else {
      rawItems =
        categories.new_releases?.items || categories.coming_soon?.items || [];
    }

    const filtered = rawItems.filter((item) => !isNonGameItem(item));
    return Promise.all(filtered.map(mapSteamItemToShopAssets));
  }

  // Similar Games (/catalogue/:shop/:objectId/similar)
  const similarMatch = url.match(/^\/catalogue\/([^/]+)\/([^/]+)\/similar/);
  if (similarMatch) {
    const objectId = similarMatch[2];
    const take = payload.params?.take || 9;

    const categories = await getSteamFeaturedCategories();
    const allCandidates = [
      ...(categories.top_sellers?.items || []),
      ...(categories.featured_win?.items || []),
      ...(categories.specials?.items || []),
    ].filter((item) => String(item?.id) !== objectId && !isNonGameItem(item));

    // Deduplicate
    const seen = new Set<string>();
    const unique = allCandidates.filter((item) => {
      const id = String(item.id);
      if (seen.has(id)) return false;
      seen.add(id);
      return true;
    });

    const sliced = unique.slice(0, take);
    return Promise.all(sliced.map(mapSteamItemToShopAssets));
  }

  // Catalogue search
  if (url.startsWith("/catalogue/search")) {
    const title = (
      payload.params?.title ||
      payload.params?.query ||
      payload.data?.title ||
      payload.data?.query ||
      ""
    ).trim();

    if (title) {
      try {
        const searchRes = await axios.get(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.3",
            },
            timeout: 15000,
          }
        );

        const items: any[] = (searchRes.data?.items || []).filter(
          (item: any) => !isNonGameItem(item)
        );

        const edges: CatalogueSearchResult[] = await Promise.all(
          items.map(async (item) => {
            const sources = await getMatchingSourceNamesForGame(item.name).catch(() => []);
            return {
              id: String(item.id),
              objectId: String(item.id),
              title: item.name,
              shop: "steam",
              genres: [],
              releaseYear: null,
              libraryImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900.jpg`,
              downloadSources: sources,
            };
          })
        );

        return {
          edges,
          count: searchRes.data?.total ?? edges.length,
        };
      } catch (err) {
        logger.error("[hydraApiCall] Error executing storesearch", err);
        return { edges: [], count: 0 };
      }
    }

    // Default catalogue view when no search term provided
    const categories = await getSteamFeaturedCategories();
    const seen = new Set<number>();
    const allItems: any[] = [];

    const lists = [
      categories.top_sellers?.items,
      categories.specials?.items,
      categories.featured_win?.items,
      categories.new_releases?.items,
      categories.coming_soon?.items,
    ];

    for (const list of lists) {
      if (Array.isArray(list)) {
        for (const item of list) {
          if (item?.id && !seen.has(item.id) && !isNonGameItem(item)) {
            seen.add(item.id);
            allItems.push(item);
          }
        }
      }
    }

    const edges: CatalogueSearchResult[] = await Promise.all(
      allItems.map(async (item) => {
        const sources = await getMatchingSourceNamesForGame(item.name).catch(() => []);
        return {
          id: String(item.id),
          objectId: String(item.id),
          title: item.name,
          shop: "steam",
          genres: [],
          releaseYear: null,
          libraryImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900.jpg`,
          downloadSources: sources,
        };
      })
    );

    return {
      edges,
      count: edges.length,
    };
  }

  // Game download sources matching
  const downloadSourcesMatch = url.match(
    /^\/games\/([^/]+)\/([^/]+)\/download-sources/
  );
  if (downloadSourcesMatch) {
    const shop = downloadSourcesMatch[1] as GameShop;
    const objectId = downloadSourcesMatch[2];

    try {
      let gameTitle = "";

      const cached = await gamesShopCacheSublevel
        .get(levelKeys.gameShopCacheItem(shop, objectId, "english"))
        .catch(() => null);

      if (cached?.name) {
        gameTitle = cached.name;
      }

      if (!gameTitle) {
        const stored = await gamesSublevel
          .get(levelKeys.game(shop, objectId))
          .catch(() => null);
        if (stored?.title) {
          gameTitle = stored.title;
        }
      }

      if (!gameTitle) {
        const cachedAssets = await gamesShopAssetsSublevel
          .get(levelKeys.game(shop, objectId))
          .catch(() => null);
        if (cachedAssets?.title) {
          gameTitle = cachedAssets.title;
        }
      }

      if (!gameTitle && shop === "steam") {
        const details = await getSteamAppDetails(objectId, "en").catch(
          () => null
        );
        if (details?.name) {
          gameTitle = details.name;
        }
      }

      if (gameTitle) {
        const repacks = await findDownloadsForGame(gameTitle);
        return repacks;
      }
    } catch (err) {
      logger.error(`[hydraApiCall] Error finding download sources for ${objectId}`, err);
    }

    return [];
  }

  // ProtonDB compatibility lookup
  const protondbMatch = url.match(/^\/games\/steam\/([^/]+)\/protondb/);
  if (protondbMatch) {
    const objectId = protondbMatch[1];
    try {
      const resp = await axios.get(
        `https://www.protondb.com/api/v1/reports/summaries/${objectId}.json`,
        { timeout: 8000 }
      );
      if (resp.data) {
        return resp.data;
      }
    } catch {
      return { tier: "pending", confidence: "low", score: 0, total: 0 };
    }
  }

  if (url.startsWith("/download-sources")) {
    return [];
  }

  // Graceful fallback for any other Hydra endpoints
  logger.info(`[hydraApiCall] Safe local stub for: ${url}`);
  return [];
};

registerEvent("hydraApiCall", hydraApiCall);
