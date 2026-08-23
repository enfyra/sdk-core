export type OAuthProvider = 'google' | 'facebook' | 'github';

export interface AuthTokens {
  accessToken: string;
  refreshToken?: string;
  expTime: number;
  loginProvider?: string | null;
}

export interface LoginCredentials {
  email: string;
  password: string;
  remember?: boolean;
}

export interface OAuthRedirectOptions {
  state?: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  [key: string]: unknown;
}

export interface AuthEndpoints {
  login: string;
  logout: string;
  refresh: string;
  me: string;
  apiTokenExchange: string;
  oauthExchange: string;
  oauthProviders: string;
}

export interface CookieAuthConfig {
  strategy: 'cookie';
  cookieBridgePrefix?: string;
  endpoints?: Partial<AuthEndpoints>;
}

export interface TokenAuthConfig {
  strategy: 'token';
  initialTokens?: AuthTokens;
  refreshThreshold?: number;
  endpoints?: Partial<AuthEndpoints>;
}

export interface NoAuthConfig {
  strategy: 'none';
}

export type AuthConfig = CookieAuthConfig | TokenAuthConfig | NoAuthConfig;

export type AuthLoginResult =
  | { strategy: 'cookie'; authenticated: true }
  | { strategy: 'token'; tokens: AuthTokens };
