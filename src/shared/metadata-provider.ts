/**
 * ArcadeX Provider-Agnostic Game Metadata Architecture
 *
 * This defines the standard abstraction for external metadata providers (e.g. IGDB, Steam, OpenVGDB).
 *
 * NOTE ON SECURITY & CREDENTIALS:
 * To prevent security risks, third-party client secrets (e.g. Twitch/IGDB client secrets)
 * MUST NEVER be hardcoded into the client app. Instead, external requests should either use
 * public endpoints or route through an authenticated backend proxy configured via:
 * - ARCADEX_METADATA_PROXY_URL
 * - ARCADEX_METADATA_CLIENT_ID
 */

export interface MetadataGameSummary {
  id: string;
  title: string;
  coverUrl?: string | null;
  releaseYear?: number | null;
  genres?: string[];
  platforms?: string[];
  developer?: string | null;
  publisher?: string | null;
  rating?: number | null;
  summary?: string | null;
}

export interface MetadataGameDetails extends MetadataGameSummary {
  description?: string | null;
  screenshots?: string[];
  backgroundUrl?: string | null;
  websites?: { category: string; url: string }[];
  tags?: string[];
}

export interface MetadataSearchOptions {
  limit?: number;
  offset?: number;
  platforms?: string[];
  genres?: string[];
  tags?: string[];
  sortBy?: "popularity" | "releaseDate" | "title" | "rating";
  sortOrder?: "asc" | "desc";
}

export interface IMetadataProvider {
  readonly name: string;
  readonly isConfigured: boolean;

  searchGames(
    query: string,
    options?: MetadataSearchOptions
  ): Promise<{ results: MetadataGameSummary[]; totalCount: number }>;

  getGameDetails(id: string): Promise<MetadataGameDetails | null>;

  getGameScreenshots(id: string): Promise<string[]>;
}

/**
 * Default local-first fallback provider when no external metadata service is configured.
 */
export class LocalMetadataProvider implements IMetadataProvider {
  public readonly name = "Local";
  public readonly isConfigured = true;

  public async searchGames(
    _query: string,
    _options?: MetadataSearchOptions
  ): Promise<{ results: MetadataGameSummary[]; totalCount: number }> {
    return { results: [], totalCount: 0 };
  }

  public async getGameDetails(_id: string): Promise<MetadataGameDetails | null> {
    return null;
  }

  public async getGameScreenshots(_id: string): Promise<string[]> {
    return [];
  }
}
