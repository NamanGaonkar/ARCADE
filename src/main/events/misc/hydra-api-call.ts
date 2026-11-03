import axios from "axios";
import { registerEvent } from "../register-event";
import { logger } from "@main/services";
import {
  findDownloadsForGame,
  getMatchingSourceNamesForGame,
  loadSourceDownloads,
} from "@main/services/download-sources-storage";
import { LizardByteDBService } from "@main/services/lizardbyte-db";
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
  const id = String(item.id || item.objectId || "");
  const hardwareIds = ["3751950", "353380", "353370", "221410", "1675200", "250820"];

  if (hardwareIds.includes(id)) return true;

  return (
    item.type === "hardware" ||
    item.type === "music" ||
    item.type === "demo" ||
    item.type === "tool" ||
    name.includes("steam machine") ||
    name.includes("steam controller") ||
    name.includes("steam deck") ||
    name.includes("steam link") ||
    name.includes("steam frame") ||
    name.includes("valve index") ||
    name.includes("steamvr") ||
    name.includes("soundtrack") ||
    name.includes("dedicated server") ||
    name.includes("benchmark")
  );
};

async function mapSteamItemToShopAssets(item: any): Promise<ShopAssets> {
  const objectId = String(item.id);
  const headerUrl =
    item.header_image ||
    `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/header.jpg`;

  let libraryHeroImageUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/library_hero.jpg`;
  let libraryImageUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/library_600x900.jpg`;
  let logoImageUrl = `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${objectId}/logo.png`;
  let coverImageUrl = headerUrl;

  const [sources, lbDetails] = await Promise.all([
    getMatchingSourceNamesForGame(item.name).catch(() => []),
    LizardByteDBService.fetchGameByTitle(item.name).catch(() => null),
  ]);

  if (lbDetails) {
    if (lbDetails.heroUrl) libraryHeroImageUrl = lbDetails.heroUrl;
    if (lbDetails.coverUrl) libraryImageUrl = lbDetails.coverUrl;
  }

  const cleanSources = sources.filter(
    (s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)
  );

  return {
    objectId,
    shop: "steam",
    title: item.name,
    iconUrl: coverImageUrl || headerUrl,
    libraryHeroImageUrl,
    libraryImageUrl,
    logoImageUrl,
    coverImageUrl,
    logoPosition: null,
    downloadSources: cleanSources,
  };
}

const KNOWN_STEAM_APP_IDS: Record<string, string> = {
  "Cyberpunk 2077": "1091500",
  "Grand Theft Auto V": "271590",
  "Red Dead Redemption 2": "1174180",
  "Elden Ring": "1245620",
  "Baldur's Gate 3": "1086940",
  "God of War": "1593500",
  "The Witcher 3: Wild Hunt": "292030",
  "Marvel's Spider-Man Remastered": "1817070",
  "Hogwarts Legacy": "990080",
  "Resident Evil 4": "2050650",
  "Sekiro: Shadows Die Twice": "814380",
  "Forza Horizon 5": "1551360",
  "Fallout 4": "377160",
  "The Last of Us Part I": "1888930",
  "Monster Hunter: World": "582010",
  "Horizon Zero Dawn": "1151640",
  "Lies of P": "1627720",
  "Palworld": "1623730",
  "Hades II": "1145350",
  "Alan Wake 2": "2140410",
  "Starfield": "1716740",
  "Days Gone": "1259420",
  "Detroit: Become Human": "1222140",
  "Dark Souls III": "374320",
};

function resolveSmartGenres(title: string, lbGenres?: string[]): string[] {
  if (lbGenres && lbGenres.length > 0) return lbGenres;
  const nameLower = (title || "").toLowerCase();
  if (
    nameLower.includes("cyberpunk") ||
    nameLower.includes("sci-fi") ||
    nameLower.includes("future")
  ) {
    return ["Action", "Sci-Fi", "RPG"];
  }
  if (
    nameLower.includes("auto") ||
    nameLower.includes("racing") ||
    nameLower.includes("drive") ||
    nameLower.includes("forza")
  ) {
    return ["Action", "Open World", "Racing"];
  }
  if (
    nameLower.includes("red dead") ||
    nameLower.includes("witcher") ||
    nameLower.includes("ring") ||
    nameLower.includes("souls") ||
    nameLower.includes("rpg")
  ) {
    return ["Action", "RPG", "Open World"];
  }
  if (
    nameLower.includes("resident evil") ||
    nameLower.includes("silent hill") ||
    nameLower.includes("horror") ||
    nameLower.includes("dead")
  ) {
    return ["Action", "Horror", "Survival"];
  }
  if (
    nameLower.includes("call of duty") ||
    nameLower.includes("battlefield") ||
    nameLower.includes("shooter") ||
    nameLower.includes("war")
  ) {
    return ["Action", "FPS", "Multiplayer"];
  }
  if (
    nameLower.includes("god of war") ||
    nameLower.includes("blade") ||
    nameLower.includes("spiderman") ||
    nameLower.includes("spider-man")
  ) {
    return ["Action", "Adventure"];
  }
  return ["Action", "Adventure"];
}

const CURATED_FEATURED_TITLES = {
  hot: [
    "Cyberpunk 2077",
    "Grand Theft Auto V",
    "Red Dead Redemption 2",
    "Elden Ring",
    "Baldur's Gate 3",
    "God of War",
    "The Witcher 3: Wild Hunt",
    "Marvel's Spider-Man Remastered",
  ],
  weekly: [
    "Hogwarts Legacy",
    "Resident Evil 4",
    "Sekiro: Shadows Die Twice",
    "Forza Horizon 5",
    "Fallout 4",
    "The Last of Us Part I",
    "Monster Hunter: World",
    "Horizon Zero Dawn",
  ],
  achievements: [
    "Lies of P",
    "Palworld",
    "Hades II",
    "Alan Wake 2",
    "Starfield",
    "Days Gone",
    "Detroit: Become Human",
    "Dark Souls III",
  ],
};

async function getCuratedShopAssets(titles: string[]): Promise<ShopAssets[]> {
  const results = await Promise.all(
    titles.map(async (title) => {
      try {
        const steamId = KNOWN_STEAM_APP_IDS[title];
        const [lb, sources] = await Promise.all([
          LizardByteDBService.fetchGameByTitle(title).catch(() => null),
          getMatchingSourceNamesForGame(title).catch(() => []),
        ]);

        const objectId =
          steamId ||
          String(
            lb?.id ??
              Math.abs(
                title
                  .split("")
                  .reduce((a, b) => (a << 5) - a + b.charCodeAt(0), 0)
              )
          );

        const cleanSources = sources.filter(
          (s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)
        );

        const heroArt = steamId
          ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_hero.jpg`
          : lb?.heroUrl ||
            lb?.artworkUrls?.[0] ||
            lb?.screenshotUrls?.[0] ||
            "";

        const coverArt = steamId
          ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/header.jpg`
          : lb?.heroUrl || lb?.artworkUrls?.[0] || heroArt;

        const libraryArt = steamId
          ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/library_600x900.jpg`
          : lb?.coverUrl || "";

        const logoArt = steamId
          ? `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${steamId}/logo.png`
          : lb?.heroUrl || "";

        return {
          objectId,
          shop: "steam" as const,
          title: lb?.name || title,
          iconUrl: coverArt,
          libraryHeroImageUrl: heroArt,
          libraryImageUrl: libraryArt,
          logoImageUrl: logoArt,
          coverImageUrl: coverArt,
          logoPosition: null,
          downloadSources: cleanSources,
        };
      } catch {
        return null;
      }
    })
  );

  return results.filter(Boolean) as ShopAssets[];
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

    const suggestions: Array<{
      title: string;
      objectId: string;
      shop: GameShop;
      iconUrl: string | null;
    }> = [];
    const seen = new Set<string>();

    // 1. Parallel Steam store search first (returns official games with banners)
    try {
      const searchRes = await axios.get(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(query)}&l=english&cc=US`,
        {
          headers: {
            "User-Agent":
              "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.4",
          },
          timeout: 4000,
        }
      );

      const items: any[] = (searchRes.data?.items || []).filter(
        (item: any) => !isNonGameItem(item)
      );

      for (const item of items) {
        const tLower = String(item.name).toLowerCase();
        if (!seen.has(tLower)) {
          seen.add(tLower);
          suggestions.push({
            title: item.name,
            objectId: String(item.id),
            shop: "steam" as GameShop,
            iconUrl: `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/header.jpg`,
          });
          if (suggestions.length >= 8) break;
        }
      }
    } catch (err) {
      logger.info("[hydraApiCall] Storesearch timeout or fallback to local");
    }

    // 2. Supplement with clean local matches only if needed
    if (suggestions.length < 8) {
      try {
        const localMatches = await findDownloadsForGame(query).catch(() => []);
        for (const m of localMatches) {
          const cleanTitle = m.title
            .replace(/\[.*?\]/g, "")
            .replace(/\(.*?\)/g, "")
            .replace(/v[0-9]+(\.[0-9]+)*/gi, "")
            .replace(
              /\b(repack|fitgirl|dodi|steamrip|gog|multi\d+|dlc|bonus)\b/gi,
              ""
            )
            .replace(/\s+/g, " ")
            .trim();

          const tLower = cleanTitle.toLowerCase();
          if (cleanTitle && !seen.has(tLower)) {
            seen.add(tLower);
            suggestions.push({
              title: cleanTitle,
              objectId: m.id,
              shop: "custom" as GameShop,
              iconUrl: null,
            });
            if (suggestions.length >= 8) break;
          }
        }
      } catch {}
    }

    return suggestions.slice(0, 10);
  }

  // Catalogue: Hot, Weekly, Achievements
  if (
    url.startsWith("/catalogue/hot") ||
    url.startsWith("/catalogue/weekly") ||
    url.startsWith("/catalogue/achievements")
  ) {
    let categoryKey: "hot" | "weekly" | "achievements" = "hot";
    if (url.startsWith("/catalogue/weekly")) categoryKey = "weekly";
    else if (url.startsWith("/catalogue/achievements")) categoryKey = "achievements";

    const curatedPromise = getCuratedShopAssets(CURATED_FEATURED_TITLES[categoryKey]);

    const categories = await getSteamFeaturedCategories();
    let rawItems: any[] = [];

    if (categoryKey === "hot") {
      rawItems =
        categories.top_sellers?.items || categories.featured_win?.items || [];
    } else if (categoryKey === "weekly") {
      rawItems =
        categories.specials?.items || categories.top_sellers?.items || [];
    } else {
      rawItems =
        categories.new_releases?.items || categories.coming_soon?.items || [];
    }

    const filtered = rawItems.filter((item) => !isNonGameItem(item));
    const [curatedList, steamMapped] = await Promise.all([
      curatedPromise,
      Promise.all(filtered.map(mapSteamItemToShopAssets)),
    ]);

    const seen = new Set<string>();
    const combined: ShopAssets[] = [];

    // Prioritize curated titles first (verified repacks + 1080p hero art)
    for (const item of curatedList) {
      const lower = item.title.toLowerCase().trim();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(item);
      }
    }

    // Add steam items that have download sources
    for (const item of steamMapped) {
      const lower = item.title.toLowerCase().trim();
      if (!seen.has(lower)) {
        seen.add(lower);
        combined.push(item);
      }
    }

    // Sort so games with available download sources always appear first
    combined.sort((a, b) => {
      const aHas = (a.downloadSources?.length || 0) > 0 ? 1 : 0;
      const bHas = (b.downloadSources?.length || 0) > 0 ? 1 : 0;
      return bHas - aHas;
    });

    return combined.slice(0, 16);
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
    const isClassics =
      payload.data?.shops?.includes("launchbox") ||
      payload.data?.mode === "classics" ||
      payload.params?.mode === "classics";

    const title = (
      payload.params?.title ||
      payload.params?.query ||
      payload.data?.title ||
      payload.data?.query ||
      ""
    ).trim();

    const skip = Number(payload.data?.skip || payload.params?.skip || 0);
    const take = Number(payload.data?.take || payload.params?.take || 30);
    const sortBy = payload.data?.sortBy || payload.params?.sortBy || "";
    const sortOrder = payload.data?.sortOrder || payload.params?.sortOrder || "desc";
    const sort = String(
      payload.data?.sort ||
      payload.params?.sort ||
      (sortBy ? `${sortBy}:${sortOrder}` : "popularity:desc")
    );

    const sortEdges = (list: CatalogueSearchResult[]) => {
      if (sort === "alphabetical:asc" || (sortBy === "alphabetical" && sortOrder === "asc")) {
        list.sort((a, b) => a.title.localeCompare(b.title));
      } else if (sort === "alphabetical:desc" || (sortBy === "alphabetical" && sortOrder === "desc")) {
        list.sort((a, b) => b.title.localeCompare(a.title));
      } else if (sort.startsWith("releaseDate:desc") || (sortBy === "releaseDate" && sortOrder === "desc")) {
        list.sort((a, b) => (b.releaseYear || 0) - (a.releaseYear || 0));
      } else if (sort.startsWith("releaseDate:asc") || (sortBy === "releaseDate" && sortOrder === "asc")) {
        list.sort((a, b) => (a.releaseYear || 9999) - (b.releaseYear || 9999));
      } else {
        // Default / Popularity: Sort games with verified download sources to top
        list.sort((a, b) => (b.downloadSources?.length || 0) - (a.downloadSources?.length || 0));
      }
    };

    // Handling Classics Mode (ROMs)
    if (isClassics) {
      try {
        let classicItems = await loadSourceDownloads("psxromsretro").catch(() => []);
        if (classicItems.length === 0) {
          classicItems = await loadSourceDownloads("psx-roms").catch(() => []);
        }

        let filtered = classicItems;
        if (title) {
          const tLower = title.toLowerCase();
          filtered = filtered.filter((item) =>
            item.title.toLowerCase().includes(tLower)
          );
        }

        if (sort === "alphabetical:asc") {
          filtered.sort((a, b) => a.title.localeCompare(b.title));
        } else if (sort === "alphabetical:desc") {
          filtered.sort((a, b) => b.title.localeCompare(a.title));
        }

        const sliced = filtered.slice(skip, skip + take);
        const edges: CatalogueSearchResult[] = sliced.map((item) => ({
          id: String((item as any).id || item.title),
          objectId: String((item as any).id || item.title),
          title: item.title,
          shop: "launchbox",
          genres: ["PlayStation", "Classic"],
          releaseYear: 1998,
          libraryImageUrl: (item as any).coverUrl || "",
          downloadSources: ["PSX Roms (Retro)"],
        }));

        return {
          edges,
          count: filtered.length,
        };
      } catch (err) {
        logger.error("[hydraApiCall] Error handling classics catalogue search", err);
        return { edges: [], count: 0 };
      }
    }

    // Modern Games Search
    if (title) {
      try {
        const [localMatches, searchRes] = await Promise.all([
          findDownloadsForGame(title).catch(() => []),
          axios
            .get(
              `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(title)}&l=english&cc=US`,
              {
                headers: {
                  "User-Agent":
                    "Mozilla/5.0 (Windows NT 10.0; Win64; x64) ArcadeX/1.0.4",
                },
                timeout: 8000,
              }
            )
            .catch(() => ({ data: { items: [], total: 0 } })),
        ]);

        const items: any[] = (searchRes.data?.items || []).filter(
          (item: any) => !isNonGameItem(item)
        );

        const seen = new Set<string>();
        const edges: CatalogueSearchResult[] = [];

        // 1. Add Steam matched items with verified download sources
        const steamEdges = await Promise.all(
          items.slice(0, 30).map(async (item) => {
            const [sources, lb] = await Promise.all([
              getMatchingSourceNamesForGame(item.name).catch(() => []),
              LizardByteDBService.fetchGameByTitle(item.name).catch(() => null),
            ]);

            const cleanSources = sources.filter(
              (s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)
            );

            const genres = resolveSmartGenres(item.name, lb?.genres);
            const releaseYear = lb?.releaseDate
              ? new Date(lb.releaseDate).getFullYear()
              : null;

            return {
              id: String(item.id),
              objectId: String(item.id),
              title: item.name,
              shop: "steam" as const,
              genres,
              releaseYear,
              libraryImageUrl:
                lb?.coverUrl ||
                `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900.jpg`,
              downloadSources: cleanSources,
            };
          })
        );

        for (const edge of steamEdges) {
          const tLower = edge.title.toLowerCase().trim();
          if (!seen.has(tLower)) {
            seen.add(tLower);
            edges.push(edge);
          }
        }

        // 2. Only if Steam returned no games, supplement with local matches with valid artwork
        if (edges.length === 0) {
          for (const m of localMatches.slice(0, 20)) {
            const tLower = m.title.toLowerCase().trim();
            if (!seen.has(tLower)) {
              seen.add(tLower);
              const lb = await LizardByteDBService.fetchGameByTitle(m.title).catch(() => null);
              const sourceLabel =
                (m as any).repacker ||
                (m as any).sourceName ||
                (m as any).downloadSourceName ||
                "Verified Repack";
              const cleanSourceLabel = /^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(sourceLabel)
                ? "Community Repack"
                : sourceLabel;
              edges.push({
                id: m.id,
                objectId: m.id,
                title: m.title,
                shop: "custom",
                genres: resolveSmartGenres(m.title, lb?.genres),
                releaseYear: lb?.releaseDate ? new Date(lb.releaseDate).getFullYear() : null,
                libraryImageUrl: lb?.coverUrl || "",
                downloadSources: [cleanSourceLabel],
              });
            }
          }
        }

        sortEdges(edges);

        return {
          edges: edges.slice(skip, skip + take),
          count: edges.length,
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
      allItems.slice(0, 40).map(async (item) => {
        const [sources, lb] = await Promise.all([
          getMatchingSourceNamesForGame(item.name).catch(() => []),
          LizardByteDBService.fetchGameByTitle(item.name).catch(() => null),
        ]);
        const cleanSources = sources.filter(
          (s) => !/^[0-9a-f]{8}-[0-9a-f]{4}-/i.test(s)
        );
        const genres = resolveSmartGenres(item.name, lb?.genres);
        return {
          id: String(item.id),
          objectId: String(item.id),
          title: item.name,
          shop: "steam" as const,
          genres,
          releaseYear: lb?.releaseDate ? new Date(lb.releaseDate).getFullYear() : null,
          libraryImageUrl:
            lb?.coverUrl ||
            `https://shared.akamai.steamstatic.com/store_item_assets/steam/apps/${item.id}/library_600x900.jpg`,
          downloadSources: cleanSources,
        };
      })
    );

    sortEdges(edges);

    return {
      edges: edges.slice(skip, skip + take),
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
      let gameTitle = (payload.params?.title as string) || "";

      if (!gameTitle) {
        const cached = await gamesShopCacheSublevel
          .get(levelKeys.gameShopCacheItem(shop, objectId, "english"))
          .catch(() => null);

        if (cached?.name) {
          gameTitle = cached.name;
        }
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
