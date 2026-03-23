import { HttpClient } from './HttpClient';
import { QueryBuilder } from '../query/QueryBuilder';
import { StorageManager } from '../storage/StorageManager';
import { AuthManager } from '../auth/AuthManager';
import type { HttpClientConfig } from '../types';

export class EnfyraClient {
  private http: HttpClient;
  public storage: StorageManager;
  public auth: AuthManager;

  constructor(config: HttpClientConfig) {
    this.http = new HttpClient(config);
    this.storage = new StorageManager(this.http);
    this.auth = new AuthManager(this.http);

    this.http.setOnBeforeRequest(async () => {
      await this.auth.getToken();
    });
  }

  /**
   * Get the underlying HttpClient instance
   * Useful for advanced usage like WebSocket initialization
   */
  getHttpClient(): HttpClient {
    return this.http;
  }

  from<T = any>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.http, table);
  }

  async get<T>(endpoint: string, options?: any) {
    return this.http.get<T>(endpoint, options);
  }

  async post<T>(endpoint: string, body?: any, options?: any) {
    return this.http.post<T>(endpoint, body, options);
  }

  async put<T>(endpoint: string, body?: any, options?: any) {
    return this.http.put<T>(endpoint, body, options);
  }

  async patch<T>(endpoint: string, body?: any, options?: any) {
    return this.http.patch<T>(endpoint, body, options);
  }

  async delete<T>(endpoint: string, options?: any) {
    return this.http.delete<T>(endpoint, options);
  }

  setHeader(key: string, value: string): void {
    this.http.setHeader(key, value);
  }

  removeHeader(key: string): void {
    this.http.removeHeader(key);
  }

  setAuthToken(token: string): void {
    this.setHeader('Authorization', `Bearer ${token}`);
  }

  clearAuthToken(): void {
    this.removeHeader('Authorization');
  }
}
