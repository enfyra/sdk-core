import { AuthManager } from '../auth/AuthManager';
import { QueryBuilder } from '../query/QueryBuilder';
import { StorageManager } from '../storage/StorageManager';
import { HttpClient, normalizeEnfyraBaseUrl } from './HttpClient';
import type {
  AxiosErrorLike,
  AxiosHeadersLike,
  AxiosInstanceLike,
  AxiosRequestConfigLike,
  EnfyraFetch,
} from '../types/integrations';
import type {
  EnfyraClientConfig,
  HttpRequestOptions,
  HttpResponse,
} from '../types';

type AxiosAttachment = {
  instance: AxiosInstanceLike;
  requestInterceptorId: number;
  responseInterceptorId: number;
};

const AXIOS_AUTH_RETRY_KEY = '__enfyraAuthRetried';

export class EnfyraClient {
  private readonly http: HttpClient;
  private readonly axiosAttachments = new Map<object, AxiosAttachment>();
  public readonly storage: StorageManager;
  public readonly auth: AuthManager;
  public readonly fetch: EnfyraFetch;

  constructor(config: EnfyraClientConfig) {
    this.http = new HttpClient(config);
    this.storage = new StorageManager(this.http);
    this.auth = new AuthManager(
      this.http,
      config.auth ?? { strategy: 'token' },
    );

    this.http.setOnBeforeRequest(async () => {
      const token = await this.auth.getToken();
      if (token) this.http.setHeader('Authorization', `Bearer ${token}`);
      else if (this.auth.strategy === 'token') {
        this.http.removeHeader('Authorization');
      }
    });
    this.fetch = (input, init) => this.fetchWithAuthRetry(input, init);
  }

  getHttpClient(): HttpClient {
    return this.http;
  }

  from<T = unknown>(table: string): QueryBuilder<T> {
    return new QueryBuilder<T>(this.http, table);
  }

  get<T>(
    endpoint: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.http.get<T>(endpoint, options);
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.http.post<T>(endpoint, body, options);
  }

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.http.put<T>(endpoint, body, options);
  }

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.http.patch<T>(endpoint, body, options);
  }

  delete<T>(
    endpoint: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.http.delete<T>(endpoint, options);
  }

  setHeader(key: string, value: string): void {
    this.http.setHeader(key, value);
  }

  removeHeader(key: string): void {
    this.http.removeHeader(key);
  }

  attachAxios<T extends object>(instance: T): T {
    if (this.axiosAttachments.has(instance)) return instance;
    const axios = this.toAxiosInstance(instance);
    if (axios.defaults.baseURL) {
      const normalizedAxiosBaseUrl = normalizeEnfyraBaseUrl(
        axios.defaults.baseURL,
      );
      if (normalizedAxiosBaseUrl === this.http.baseUrl) {
        axios.defaults.baseURL = normalizedAxiosBaseUrl;
      }
    } else {
      axios.defaults.baseURL = this.http.baseUrl;
    }
    const requestInterceptorId = axios.interceptors.request.use(
      async (config) => this.authorizeAxiosRequest(config, axios),
    );
    const responseInterceptorId = axios.interceptors.response.use(
      (response) => response,
      async (error) => {
        const axiosError = error as AxiosErrorLike;
        const config = axiosError.config;
        if (
          axiosError.response?.status !== 401 ||
          !config ||
          config[AXIOS_AUTH_RETRY_KEY] === true ||
          !this.isAxiosEnfyraRequest(config, axios) ||
          this.auth.strategy !== 'token' ||
          !this.auth.getTokens()?.refreshToken
        ) {
          throw error;
        }

        config[AXIOS_AUTH_RETRY_KEY] = true;
        await this.auth.refreshToken();
        await this.authorizeAxiosRequest(config, axios);
        return axios.request(config);
      },
    );

    this.axiosAttachments.set(instance, {
      instance: axios,
      requestInterceptorId,
      responseInterceptorId,
    });
    return instance;
  }

  dispose(): void {
    for (const attachment of this.axiosAttachments.values()) {
      attachment.instance.interceptors.request.eject(
        attachment.requestInterceptorId,
      );
      attachment.instance.interceptors.response.eject(
        attachment.responseInterceptorId,
      );
    }
    this.axiosAttachments.clear();
  }

  private async fetchWithAuthRetry(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): Promise<Response> {
    const [firstInput, retryInput] = this.cloneFetchInput(input);
    const response = await this.http.fetch(firstInput, init);
    if (
      response.status !== 401 ||
      !this.http.isEnfyraUrl(input) ||
      this.hasExplicitAuthorization(input, init) ||
      !this.isReplayableBody(init?.body) ||
      this.auth.strategy !== 'token' ||
      !this.auth.getTokens()?.refreshToken
    ) {
      return response;
    }

    await response.body?.cancel().catch(() => undefined);
    await this.auth.refreshToken();
    return this.http.fetch(retryInput, init);
  }

  private cloneFetchInput(
    input: RequestInfo | URL,
  ): [RequestInfo | URL, RequestInfo | URL] {
    if (typeof Request !== 'undefined' && input instanceof Request) {
      return [input.clone(), input.clone()];
    }
    return [input, input];
  }

  private hasExplicitAuthorization(
    input: RequestInfo | URL,
    init?: RequestInit,
  ): boolean {
    const requestHeaders =
      typeof Request !== 'undefined' && input instanceof Request
        ? input.headers
        : undefined;
    return (
      new Headers(requestHeaders).has('authorization') ||
      new Headers(init?.headers).has('authorization')
    );
  }

  private isReplayableBody(body: BodyInit | null | undefined): boolean {
    return !(
      body &&
      typeof ReadableStream !== 'undefined' &&
      body instanceof ReadableStream
    );
  }

  private async authorizeAxiosRequest(
    config: AxiosRequestConfigLike,
    instance: AxiosInstanceLike,
  ): Promise<AxiosRequestConfigLike> {
    if (!this.isAxiosEnfyraRequest(config, instance)) return config;
    const token = await this.auth.getToken();
    if (!token) return config;

    const headers = config.headers;
    if (this.hasHeaderSetter(headers)) {
      headers.set('Authorization', `Bearer ${token}`);
    } else {
      config.headers = {
        ...(headers as Record<string, string> | undefined),
        Authorization: `Bearer ${token}`,
      };
    }
    return config;
  }

  private isAxiosEnfyraRequest(
    config: AxiosRequestConfigLike,
    instance: AxiosInstanceLike,
  ): boolean {
    const url = config.url ?? '';
    if (/^[a-z][a-z\d+.-]*:/i.test(url) || url.startsWith('//')) {
      return this.http.isEnfyraUrl(url);
    }

    const baseUrl = config.baseURL ?? instance.defaults.baseURL;
    if (!baseUrl) return true;
    if (baseUrl.replace(/\/+$/, '') === this.http.baseUrl) return true;

    const resolved = `${baseUrl.replace(/\/+$/, '')}/${url.replace(/^\/+/, '')}`;
    return /^[a-z][a-z\d+.-]*:/i.test(resolved)
      ? this.http.isEnfyraUrl(resolved)
      : false;
  }

  private hasHeaderSetter(
    headers: AxiosHeadersLike | undefined,
  ): headers is { set(name: string, value: string): unknown } {
    return Boolean(
      headers &&
        typeof headers === 'object' &&
        'set' in headers &&
        typeof headers.set === 'function',
    );
  }

  private toAxiosInstance(instance: object): AxiosInstanceLike {
    const axios = instance as AxiosInstanceLike;
    if (
      !axios.defaults ||
      !axios.interceptors?.request ||
      !axios.interceptors?.response ||
      typeof axios.interceptors.request.use !== 'function' ||
      typeof axios.interceptors.response.use !== 'function' ||
      typeof axios.request !== 'function'
    ) {
      throw new TypeError('attachAxios requires an Axios instance');
    }
    return axios;
  }
}
