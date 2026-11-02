import type { HydraApiAuthContext } from "./hydra-auth-context";

export interface HydraApiOptions {
  needsAuth?: boolean;
  needsSubscription?: boolean;
  ifModifiedSince?: Date;
  ifNoneMatch?: string;
  validateStatus?: (status: number) => boolean;
  signal?: AbortSignal;
  logResponseBody?: boolean;
  timeout?: number;
  authContext?: HydraApiAuthContext | null;
}

/**
 * HydraApi stub for ArcadeX.
 * ArcadeX is local-first: no remote Hydra accounts, authentication, subscriptions, or sync.
 */
export class HydraApi {
  public static get userAuth(): {
    authToken: string;
    refreshToken: string;
    expirationTimestamp: number;
    subscription: null;
  } {
    return {
      authToken: "",
      refreshToken: "",
      expirationTimestamp: 0,
      subscription: null,
    };
  }

  public static isLoggedIn(): boolean {
    return false;
  }

  public static hasActiveSubscription(): boolean {
    return false;
  }

  public static async setupApi(): Promise<void> {
    return;
  }

  public static getAuthContext(): HydraApiAuthContext | null {
    return {
      environment: "local",
      userId: "local-player",
      generation: 0,
    };
  }

  public static isAuthContextCurrent(_context?: unknown): boolean {
    return true;
  }

  public static onAuthContextChanged(_listener: () => void): () => void {
    return () => {};
  }

  public static async handleUserSignOut(): Promise<void> {
    return;
  }

  public static async handleSignOut(callback?: () => Promise<void>): Promise<void> {
    if (callback) {
      await callback();
    }
  }

  public static async handleExternalAuth(_payload?: unknown): Promise<void> {
    return;
  }

  public static async persistUserCache(..._args: unknown[]): Promise<void> {
    return;
  }

  public static updateUserSubscription(..._args: unknown[]): void {
    return;
  }

  public static async authenticate(): Promise<void> {
    throw new Error("ArcadeX does not require or support online accounts.");
  }

  public static async refreshToken(): Promise<{ accessToken: string; expiresIn: number }> {
    throw new Error("ArcadeX local-only mode: remote token refresh is disabled.");
  }

  public static async get<T>(_url: string, _params?: unknown, _options?: HydraApiOptions): Promise<T> {
    if (_url === "/features") {
      return [] as unknown as T;
    }
    throw new Error(`ArcadeX local-only mode: remote GET '${_url}' is disabled.`);
  }

  public static async post<T>(_url: string, _data?: unknown, _options?: HydraApiOptions): Promise<T> {
    throw new Error(`ArcadeX local-only mode: remote POST '${_url}' is disabled.`);
  }

  public static async put<T>(_url: string, _data?: unknown, _options?: HydraApiOptions): Promise<T> {
    throw new Error(`ArcadeX local-only mode: remote PUT '${_url}' is disabled.`);
  }

  public static async patch<T>(_url: string, _data?: unknown, _options?: HydraApiOptions): Promise<T> {
    throw new Error(`ArcadeX local-only mode: remote PATCH '${_url}' is disabled.`);
  }

  public static async delete<T>(_url: string, _options?: HydraApiOptions): Promise<T> {
    throw new Error(`ArcadeX local-only mode: remote DELETE '${_url}' is disabled.`);
  }

  public static async getResponse<T>(
    _url: string,
    _params?: unknown,
    _options?: HydraApiOptions
  ): Promise<{ status: number; data: T; headers: Record<string, string> }> {
    throw new Error(`ArcadeX local-only mode: remote GET response '${_url}' is disabled.`);
  }

  public static async postResponse<T>(
    _url: string,
    _data?: unknown,
    _options?: HydraApiOptions
  ): Promise<{ status: number; data: T; headers: Record<string, string> }> {
    throw new Error(`ArcadeX local-only mode: remote POST response '${_url}' is disabled.`);
  }

  public static async checkDownloadSourcesChanges(): Promise<unknown[]> {
    return [];
  }
}
