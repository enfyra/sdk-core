import { EnfyraError } from '../errors/EnfyraError';
import type { HttpClient } from '../client/HttpClient';
import type {
  AuthConfig,
  AuthEndpoints,
  AuthLoginResult,
  AuthTokens,
  LoginCredentials,
  OAuthProvider,
  UserInfo,
} from '../types';

const COOKIE_ENDPOINTS: AuthEndpoints = {
  login: '/login',
  logout: '/logout',
  refresh: '/auth/refresh-token',
  me: '/me',
  apiTokenExchange: '/auth/token/exchange',
  oauthExchange: '/auth/oauth/exchange',
  oauthProviders: '/auth/providers',
};

const TOKEN_ENDPOINTS: AuthEndpoints = {
  ...COOKIE_ENDPOINTS,
  login: '/auth/login',
  logout: '/auth/logout',
};

export class AuthManager {
  private readonly config: AuthConfig;
  private readonly endpoints: AuthEndpoints;
  private tokens: AuthTokens | null = null;
  private refreshPromise: Promise<AuthTokens> | null = null;

  constructor(
    private readonly http: HttpClient,
    config: AuthConfig = { strategy: 'token' },
  ) {
    this.config = config;
    this.endpoints = {
      ...(config.strategy === 'token' ? TOKEN_ENDPOINTS : COOKIE_ENDPOINTS),
      ...('endpoints' in config ? config.endpoints : undefined),
    };
    if (config.strategy === 'token' && config.initialTokens) {
      this.tokens = config.initialTokens;
    }
  }

  get strategy(): AuthConfig['strategy'] {
    return this.config.strategy;
  }

  async login(credentials: LoginCredentials): Promise<AuthLoginResult> {
    if (this.config.strategy === 'none') {
      throw new EnfyraError({
        code: 'VALIDATION_ERROR',
        message: 'Login is not supported with the none strategy',
      });
    }

    const response = await this.http.post<AuthTokens>(
      this.endpoints.login,
      credentials,
      { auth: false },
    );

    if (this.config.strategy !== 'token') {
      return { strategy: 'cookie', authenticated: true };
    }

    const tokens = this.normalizeTokens(response.data);
    this.persistTokens(tokens);
    return { strategy: 'token', tokens };
  }

  async logout(): Promise<void> {
    if (this.config.strategy === 'cookie') {
      await this.http.post(this.endpoints.logout, undefined, { auth: false });
      return;
    }
    if (this.config.strategy !== 'token') return;

    try {
      if (this.tokens?.refreshToken) {
        await this.http.post(this.endpoints.logout, {
          refreshToken: this.tokens.refreshToken,
        });
      }
    } finally {
      this.clearTokens();
    }
  }

  refreshToken(): Promise<AuthTokens> {
    this.requireTokenStrategy('Token refresh');
    if (!this.refreshPromise) {
      this.refreshPromise = this.performRefreshToken().finally(() => {
        this.refreshPromise = null;
      });
    }
    return this.refreshPromise;
  }

  private async performRefreshToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new EnfyraError({
        code: 'UNAUTHORIZED',
        message: 'No refresh token available',
        statusCode: 401,
      });
    }

    try {
      const response = await this.http.post<AuthTokens>(
        this.endpoints.refresh,
        { refreshToken: this.tokens.refreshToken },
        { auth: false },
      );
      const tokens = this.normalizeTokens(
        response.data,
        this.tokens.refreshToken,
      );
      this.persistTokens(tokens);
      return tokens;
    } catch (error) {
      if (
        error instanceof EnfyraError &&
        (error.statusCode === 400 || error.statusCode === 401)
      ) {
        this.clearTokens();
      }
      throw error;
    }
  }

  async exchangeApiToken(apiToken: string): Promise<AuthTokens> {
    this.requireTokenStrategy('API-token exchange');
    const response = await this.http.post<AuthTokens>(
      this.endpoints.apiTokenExchange,
      { apiToken },
      { auth: false },
    );
    const tokens = this.normalizeTokens(response.data);
    this.persistTokens(tokens);
    return tokens;
  }

  async exchangeOAuthCode(code: string): Promise<AuthTokens> {
    this.requireTokenStrategy('OAuth-code exchange');
    const response = await this.http.post<AuthTokens>(
      this.endpoints.oauthExchange,
      { code },
      { auth: false },
    );
    const tokens = this.normalizeTokens(response.data);
    this.persistTokens(tokens);
    return tokens;
  }

  async getToken(): Promise<string | null> {
    if (this.config.strategy !== 'token') return null;
    if (!this.tokens) return null;

    if (this.tokens.expTime <= Date.now()) {
      if (!this.tokens.refreshToken) {
        this.clearTokens();
        return null;
      }
      return (await this.refreshToken()).accessToken;
    }

    const threshold = this.config.refreshThreshold ?? 120_000;
    if (
      this.tokens.refreshToken &&
      this.tokens.expTime - Date.now() < threshold
    ) {
      return (await this.refreshToken()).accessToken;
    }

    return this.tokens.accessToken;
  }

  isAuthenticated(): boolean {
    return Boolean(this.tokens && this.tokens.expTime > Date.now());
  }

  async getMe(): Promise<UserInfo | null> {
    const response = await this.http.get<UserInfo | UserInfo[]>(this.endpoints.me);
    if (Array.isArray(response.data)) return response.data[0] ?? null;
    return response.data;
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  async setTokens(tokens: AuthTokens): Promise<void>;
  async setTokens(
    accessToken: string,
    refreshToken?: string,
    expTime?: number,
  ): Promise<void>;
  async setTokens(
    tokensOrAccessToken: AuthTokens | string,
    refreshToken?: string,
    expTime?: number,
  ): Promise<void> {
    this.requireTokenStrategy('Setting tokens');
    const tokens =
      typeof tokensOrAccessToken === 'string'
        ? this.normalizeTokens({
            accessToken: tokensOrAccessToken,
            refreshToken,
            expTime: expTime ?? this.getTokenExpiry(tokensOrAccessToken),
          })
        : this.normalizeTokens(tokensOrAccessToken);
    this.persistTokens(tokens);
  }

  getOAuthRedirectUrl(provider: OAuthProvider, callbackUrl: string): string {
    if (this.config.strategy !== 'cookie') {
      throw new EnfyraError({
        code: 'VALIDATION_ERROR',
        message: 'OAuth redirects require the cookie bridge strategy',
      });
    }
    const params = new URLSearchParams({ redirect: callbackUrl });
    if (this.config.cookieBridgePrefix) {
      params.set(
        'cookieBridgePrefix',
        this.normalizeBridgePrefix(this.config.cookieBridgePrefix),
      );
    }
    return `${this.http.resolveUrl(`/auth/${provider}`)}?${params.toString()}`;
  }

  async getOAuthProviders(): Promise<OAuthProvider[]> {
    const response = await this.http.get<Array<{ provider: OAuthProvider }>>(
      this.endpoints.oauthProviders,
      { auth: false },
    );
    return response.data.map(({ provider }) => provider);
  }

  private persistTokens(tokens: AuthTokens): void {
    this.tokens = tokens;
  }

  private clearTokens(): void {
    this.tokens = null;
    this.http.removeHeader('Authorization');
  }

  private normalizeTokens(
    tokens: AuthTokens,
    fallbackRefreshToken?: string,
  ): AuthTokens {
    if (!tokens?.accessToken) {
      throw new EnfyraError({
        code: 'UNAUTHORIZED',
        message: 'Authentication response did not include an access token',
      });
    }
    return {
      ...tokens,
      refreshToken: tokens.refreshToken ?? fallbackRefreshToken,
      expTime: tokens.expTime ?? this.getTokenExpiry(tokens.accessToken),
    };
  }

  private getTokenExpiry(token: string): number {
    try {
      const payload = token.split('.')[1];
      if (!payload) return Date.now() + 15 * 60_000;
      const normalized = payload.replace(/-/g, '+').replace(/_/g, '/');
      const decoded =
        typeof Buffer !== 'undefined'
          ? Buffer.from(normalized, 'base64').toString('utf8')
          : decodeURIComponent(
              atob(normalized)
                .split('')
                .map(
                  (character) =>
                    `%${character.charCodeAt(0).toString(16).padStart(2, '0')}`,
                )
                .join(''),
            );
      const parsed = JSON.parse(decoded) as { exp?: number };
      return typeof parsed.exp === 'number'
        ? parsed.exp * 1_000
        : Date.now() + 15 * 60_000;
    } catch {
      return Date.now() + 15 * 60_000;
    }
  }

  private requireTokenStrategy(operation: string): void {
    if (this.config.strategy !== 'token') {
      throw new EnfyraError({
        code: 'VALIDATION_ERROR',
        message: `${operation} requires the token strategy`,
      });
    }
  }

  private normalizeBridgePrefix(prefix: string): string {
    const normalized = `/${prefix}`.replace(/\/{2,}/g, '/').replace(/\/$/, '');
    return normalized || '/';
  }
}
