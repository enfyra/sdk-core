import { HttpClient } from '../client/HttpClient';
import { EnfyraError } from '../errors/EnfyraError';

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expTime: number;
}

export interface LoginCredentials {
  email: string;
  password: string;
}

export interface UserInfo {
  id: string;
  email: string;
  name: string;
  [key: string]: any;
}

export class AuthManager {
  private http: HttpClient;
  private tokens: AuthTokens | null = null;
  private refreshThreshold: number = 2 * 60 * 1000;

  constructor(http: HttpClient) {
    this.http = http;
    this.loadTokens();
  }

  private decodeToken(token: string): { exp?: number; iat?: number } | null {
    try {
      const base64Url = token.split('.')[1];
      if (!base64Url) return null;
      
      const base64 = base64Url.replace(/-/g, '+').replace(/_/g, '/');
      const jsonPayload = decodeURIComponent(
        atob(base64).split('').map(c => 
          '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2)
        ).join('')
      );
      return JSON.parse(jsonPayload);
    } catch {
      return null;
    }
  }

  private loadTokens(): void {
    if (typeof document === 'undefined') return;

    const cookies = document.cookie.split(';').reduce((acc: Record<string, string>, cookie: string) => {
      const separatorIndex = cookie.trim().indexOf('=');
      if (separatorIndex === -1) return acc;
      const key = cookie.trim().substring(0, separatorIndex);
      const value = cookie.trim().substring(separatorIndex + 1);
      acc[key] = decodeURIComponent(value);
      return acc;
    }, {});

    const { accessToken, refreshToken, expTime } = cookies;

    if (accessToken && refreshToken && expTime) {
      this.tokens = {
        accessToken,
        refreshToken,
        expTime: parseInt(expTime),
      };

      this.http.setHeader('Authorization', `Bearer ${accessToken}`);
    }
  }

  private clearTokens(): void {
    this.tokens = null;
  }

  private setCookies(accessToken: string, refreshToken: string, expTime: number): void {
    if (typeof document === 'undefined') return;

    const maxAge = Math.max(0, Math.floor((expTime - Date.now()) / 1000));
    const expires = new Date(expTime).toUTCString();
    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureAttr = isSecure ? '; Secure' : '';

    const encodedAccessToken = encodeURIComponent(accessToken);
    const encodedRefreshToken = encodeURIComponent(refreshToken);

    document.cookie = `accessToken=${encodedAccessToken}; path=/; max-age=${maxAge}; expires=${expires}; SameSite=Lax${secureAttr}`;
    document.cookie = `refreshToken=${encodedRefreshToken}; path=/; max-age=${maxAge}; expires=${expires}; SameSite=Lax${secureAttr}`;
    document.cookie = `expTime=${expTime}; path=/; max-age=${maxAge}; expires=${expires}; SameSite=Lax${secureAttr}`;
  }

  private clearCookies(): void {
    if (typeof document === 'undefined') return;

    const isSecure = typeof window !== 'undefined' && window.location.protocol === 'https:';
    const secureAttr = isSecure ? '; Secure' : '';

    // Clear cookies by setting max-age=0 and empty value
    document.cookie = `accessToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttr}`;
    document.cookie = `refreshToken=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttr}`;
    document.cookie = `expTime=; path=/; max-age=0; expires=Thu, 01 Jan 1970 00:00:00 GMT; SameSite=Lax${secureAttr}`;

    // Also remove Authorization header
    this.http.removeHeader('Authorization');
  }

  private isTokenExpiringSoon(): boolean {
    if (!this.tokens) return false;
    const now = Date.now();
    return this.tokens.expTime - now < this.refreshThreshold;
  }

  private isTokenValid(): boolean {
    if (!this.tokens) return false;
    const now = Date.now();
    return this.tokens.expTime > now;
  }

  async login(credentials: LoginCredentials): Promise<AuthTokens> {
    try {
      const response = await this.http.post<AuthTokens>('/auth/login', credentials);
      
      const { accessToken, refreshToken } = response.data;
      
      const decoded = this.decodeToken(accessToken);
      let expTime: number;
      
      if (decoded?.exp) {
        expTime = decoded.exp * 1000;
      } else {
        expTime = Date.now() + 15 * 60 * 1000;
      }
      
      this.tokens = {
        accessToken,
        refreshToken,
        expTime,
      };

      this.setCookies(accessToken, refreshToken, expTime);
      this.http.setHeader('Authorization', `Bearer ${accessToken}`);

      return this.tokens;
    } catch (error: any) {
      throw new EnfyraError({
        code: 'UNAUTHORIZED',
        message: 'Login failed. Please check your credentials.',
        statusCode: 401,
        details: error?.data || error,
      });
    }
  }

  async logout(): Promise<void> {
    try {
      if (this.tokens?.refreshToken) {
        await this.http.post('/auth/logout', {
          refreshToken: this.tokens.refreshToken
        });
      }
    } catch {
    } finally {
      this.clearTokens();
      this.clearCookies();
    }
  }

  async refreshToken(): Promise<AuthTokens> {
    if (!this.tokens?.refreshToken) {
      throw new EnfyraError({
        code: 'UNAUTHORIZED',
        message: 'No refresh token available',
        statusCode: 401,
      });
    }

    try {
      const response = await this.http.post<AuthTokens>('/auth/refresh-token', {
        refreshToken: this.tokens.refreshToken,
      });
      
      const { accessToken, refreshToken } = response.data;
      
      const decoded = this.decodeToken(accessToken);
      let expTime: number;
      
      if (decoded?.exp) {
        expTime = decoded.exp * 1000;
      } else {
        expTime = Date.now() + 15 * 60 * 1000;
      }
      
      this.tokens = {
        accessToken,
        refreshToken: refreshToken || this.tokens.refreshToken,
        expTime,
      };

      this.setCookies(accessToken, refreshToken || this.tokens.refreshToken, expTime);
      this.http.setHeader('Authorization', `Bearer ${accessToken}`);

      return this.tokens;
    } catch (error: any) {
      this.clearTokens();
      this.clearCookies();

      throw new EnfyraError({
        code: 'UNAUTHORIZED',
        message: 'Token refresh failed. Please login again.',
        statusCode: 401,
        details: error?.data || error,
      });
    }
  }

  async getToken(): Promise<string | null> {
    if (!this.tokens) return null;
    
    if (this.isTokenExpiringSoon()) {
      await this.refreshToken();
    }
    
    if (!this.isTokenValid()) {
      await this.refreshToken();
    }
    
    return this.tokens?.accessToken || null;
  }

  isAuthenticated(): boolean {
    if (!this.tokens) return false;
    
    const now = Date.now();
    const timeUntilExpiry = this.tokens.expTime - now;
    
    return timeUntilExpiry > 60 * 1000;
  }

  async getMe(): Promise<UserInfo> {
    try {
      const response = await this.http.get<UserInfo>('/me');
      return response.data;
    } catch (error: any) {
      throw error;
    }
  }

  getTokens(): AuthTokens | null {
    return this.tokens;
  }

  setTokens(accessToken: string, refreshToken: string): void {
    const decoded = this.decodeToken(accessToken);
    let expTime: number;
    
    if (decoded?.exp) {
      expTime = decoded.exp * 1000;
    } else {
      expTime = Date.now() + 15 * 60 * 1000;
    }
    
    this.tokens = {
      accessToken,
      refreshToken,
      expTime,
    };

    this.setCookies(accessToken, refreshToken, expTime);
    this.http.setHeader('Authorization', `Bearer ${accessToken}`);
  }
}
