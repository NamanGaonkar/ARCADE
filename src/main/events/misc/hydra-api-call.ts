import axios from "axios";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";
import { findDownloadsForGame } from "@main/services/download-sources-storage";
import { getSteamAppDetails } from "@main/services/steam";
import { gamesShopCacheSublevel } from "@main/level";
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
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.0",
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

function mapSteamItemToShopAssets(item: any): ShopAssets {
  const objectId = String(item.id);
  const headerUrl =
    item.header_image ||
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/header.jpg`;

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
    downloadSources: [],
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

    return rawItems.filter((item) => !isNonGameItem(item)).map(mapSteamItemToShopAssets);
  }

  // Catalogue search
  if (url.startsWith("/catalogue/search")) {
    const title = payload.data?.title?.trim();

    if (title) {
      try {
        const searchRes = await axios.get(
          `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
          {
            headers: {
              "User-Agent":
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.0",
            },
            timeout: 15000,
          }
        );

        const items: any[] = (searchRes.data?.items || []).filter(
          (item: any) => !isNonGameItem(item)
        );
        const edges: CatalogueSearchResult[] = items.map((item) => ({
          id: String(item.id),
          objectId: String(item.id),
          title: item.name,
          shop: "steam",
          genres: [],
          releaseYear: null,
          libraryImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900.jpg`,
          downloadSources: [],
        }));

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

    const edges: CatalogueSearchResult[] = allItems.map((item) => ({
      id: String(item.id),
      objectId: String(item.id),
      title: item.name,
      shop: "steam",
      genres: [],
      releaseYear: null,
      libraryImageUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900.jpg`,
      downloadSources: [],
    }));

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
      } else {
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

  if (url.startsWith("/download-sources")) {
    return [];
  }

  // Graceful fallback for any other Hydra endpoints
  logger.info(`[hydraApiCall] Safe local stub for: ${url}`);
  return [];
};

registerEvent("hydraApiCall", hydraApiCall);
