import { EnfyraError } from '../errors/EnfyraError';
import type {
  EnfyraErrorCode,
  ErrorTransformer,
  HttpClientConfig,
  HttpRequestOptions,
  HttpResponse,
  HttpResponseType,
  ResponseTransformer,
} from '../types';

type BeforeRequestHook = () => void | Promise<void>;

type RequestFailure = {
  cause?: unknown;
  code?: string;
  data?: unknown;
  message?: string;
  statusCode?: number;
};

export function normalizeEnfyraBaseUrl(value: string): string {
  const trimmed = value.trim();
  if (!trimmed) throw new TypeError('baseUrl is required');
  if (trimmed === '/') return '/api';
  if (!/^https?:\/\//i.test(trimmed))
    return trimmed.replace(/[?#].*$/, '').replace(/\/+$/, '');

  const url = new URL(trimmed);
  url.search = '';
  url.hash = '';
  if (url.pathname === '/') url.pathname = '/api';
  return url.toString().replace(/\/+$/, '');
}

export class HttpClient {
  private readonly fetchImpl: typeof globalThis.fetch;
  private readonly defaultHeaders: Headers;
  private readonly getRequestHeaders?: HttpClientConfig['getHeaders'];
  private readonly onRawResponse?: HttpClientConfig['onRawResponse'];
  private readonly credentials: RequestCredentials;
  private readonly timeout: number;
  private readonly retries: number;
  private readonly retryDelay: number;
  private onBeforeRequest?: BeforeRequestHook;
  private responseTransformers: ResponseTransformer[] = [];
  private errorTransformers: ErrorTransformer[] = [];

  public readonly baseUrl: string;

  constructor(config: HttpClientConfig) {
    const baseUrl = normalizeEnfyraBaseUrl(config.baseUrl);
    if (!config.fetch && typeof globalThis.fetch !== 'function') {
      throw new TypeError('A fetch implementation is required');
    }

    this.baseUrl = baseUrl;
    this.fetchImpl = config.fetch ?? globalThis.fetch.bind(globalThis);
    this.defaultHeaders = new Headers(config.headers);
    this.getRequestHeaders = config.getHeaders;
    this.onRawResponse = config.onRawResponse;
    this.credentials = config.credentials ?? 'same-origin';
    this.timeout = config.timeout ?? 30_000;
    this.retries = config.retries ?? 0;
    this.retryDelay = config.retryDelay ?? 1_000;

    if (config.onResponse) {
      const transformers = Array.isArray(config.onResponse)
        ? config.onResponse
        : [config.onResponse];
      this.responseTransformers.push(...transformers);
    }
    if (config.onError) {
      const transformers = Array.isArray(config.onError)
        ? config.onError
        : [config.onError];
      this.errorTransformers.push(...transformers);
    }
  }

  setOnBeforeRequest(callback: BeforeRequestHook): void {
    this.onBeforeRequest = callback;
  }

  onResponse(transformer: ResponseTransformer): void {
    this.responseTransformers.push(transformer);
  }

  onError(transformer: ErrorTransformer): void {
    this.errorTransformers.push(transformer);
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders.set(key, value);
  }

  removeHeader(key: string): void {
    this.defaultHeaders.delete(key);
  }

  resolveUrl(endpoint: string, query?: Record<string, unknown>): string {
    const cleanEndpoint = endpoint.replace(/^\/+/, '');
    const path = cleanEndpoint
      ? `${this.baseUrl}/${cleanEndpoint}`
      : this.baseUrl;
    const queryString = this.buildQueryString(query);
    return queryString
      ? `${path}${path.includes('?') ? '&' : '?'}${queryString}`
      : path;
  }

  async fetch(
    input: RequestInfo | URL,
    init: RequestInit = {},
  ): Promise<Response> {
    const resolvedInput = this.resolveFetchInput(input);
    const isEnfyraRequest = this.isEnfyraUrl(resolvedInput.url);

    if (isEnfyraRequest && this.onBeforeRequest) {
      await this.onBeforeRequest();
    }

    const sourceHeaders = this.isRequest(input) ? input.headers : undefined;
    const headers = isEnfyraRequest
      ? await this.buildHeaders(sourceHeaders)
      : new Headers(sourceHeaders);
    new Headers(init.headers).forEach((value, key) => headers.set(key, value));

    const response = await this.fetchImpl(resolvedInput.input, {
      ...init,
      headers,
      ...(init.credentials
        ? {}
        : isEnfyraRequest
          ? { credentials: this.credentials }
          : {}),
    });

    if (isEnfyraRequest) await this.onRawResponse?.(response);
    return response;
  }

  isEnfyraUrl(input: RequestInfo | URL): boolean {
    const value = this.getInputUrl(input);
    const base = this.toComparableUrl(this.baseUrl);
    if (
      !this.isAbsoluteUrl(this.baseUrl) &&
      this.isAbsoluteUrl(value) &&
      typeof globalThis.location === 'undefined'
    )
      return false;
    const target = this.toComparableUrl(value);
    if (!base || !target || base.origin !== target.origin) return false;

    const basePath = base.pathname.replace(/\/+$/, '') || '/';
    return (
      target.pathname === basePath ||
      target.pathname.startsWith(`${basePath === '/' ? '' : basePath}/`)
    );
  }

  async request<T>(
    endpoint: string,
    options: HttpRequestOptions = {},
  ): Promise<HttpResponse<T>> {
    const method = options.method ?? 'GET';
    if (
      this.isEnfyraUrl(this.resolveUrl(endpoint, options.query)) &&
      options.auth !== false &&
      this.onBeforeRequest
    ) {
      await this.onBeforeRequest();
    }

    let lastError: RequestFailure | null = null;
    const maxAttempts = this.canRetryMethod(method, options.retryUnsafe)
      ? this.retries + 1
      : 1;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await this.execute<T>(endpoint, options, method);
        let transformed: HttpResponse<T> = response;
        for (const transformer of this.responseTransformers) {
          transformed = (await transformer(transformed)) as HttpResponse<T>;
        }
        if (options.transform) {
          transformed = (await options.transform(
            transformed,
          )) as HttpResponse<T>;
        }
        return transformed;
      } catch (error) {
        lastError = this.toRequestFailure(error);
        if (!this.shouldRetry(lastError, attempt, maxAttempts)) break;
        await this.sleep(this.retryDelay * attempt);
      }
    }

    throw await this.handleError(lastError ?? {});
  }

  private async execute<T>(
    endpoint: string,
    options: HttpRequestOptions,
    method: NonNullable<HttpRequestOptions['method']>,
  ): Promise<HttpResponse<T>> {
    const url = this.resolveUrl(endpoint, options.query);
    const inScope = this.isEnfyraUrl(url);
    const headers = inScope
      ? await this.buildHeaders(options.headers)
      : new Headers(options.headers);
    const body = this.buildBody(options.body, headers);
    const controller = new AbortController();
    const timeout = options.timeout ?? this.timeout;
    let timedOut = false;
    const timer = setTimeout(() => {
      timedOut = true;
      controller.abort();
    }, timeout);
    const abort = () => controller.abort(options.signal?.reason);

    if (options.signal) {
      if (options.signal.aborted) abort();
      else options.signal.addEventListener('abort', abort, { once: true });
    }

    try {
      const response = await this.fetchImpl(url, {
        method,
        headers,
        body,
        ...(options.credentials
          ? { credentials: options.credentials }
          : inScope
            ? { credentials: this.credentials }
            : {}),
        redirect: options.redirect,
        signal: controller.signal,
      });
      if (inScope) await this.onRawResponse?.(response);
      const data = await this.parseResponse(
        response,
        response.ok ? options.responseType : undefined,
      );
      if (!response.ok) {
        throw {
          data,
          message: response.statusText,
          statusCode: response.status,
        } satisfies RequestFailure;
      }

      const envelope = data as
        { data?: T; meta?: HttpResponse<T>['meta'] } | undefined;
      const responseData =
        envelope && Object.prototype.hasOwnProperty.call(envelope, 'data')
          ? envelope.data
          : data;

      return {
        data: responseData as T,
        status: response.status,
        headers: response.headers,
        meta: envelope?.meta,
      };
    } catch (error) {
      if (timedOut) {
        throw {
          cause: error,
          code: 'TIMEOUT',
          message: `Request timed out after ${timeout}ms`,
        } satisfies RequestFailure;
      }
      throw error;
    } finally {
      clearTimeout(timer);
      options.signal?.removeEventListener('abort', abort);
    }
  }

  private async buildHeaders(customHeaders?: HeadersInit): Promise<Headers> {
    const headers = new Headers(this.defaultHeaders);
    const provided = this.getRequestHeaders
      ? new Headers(await this.getRequestHeaders())
      : null;

    provided?.forEach((value, key) => headers.set(key, value));
    new Headers(customHeaders).forEach((value, key) => headers.set(key, value));
    return headers;
  }

  resolveFetchUrl(input: RequestInfo | URL): string {
    const value = this.getInputUrl(input);
    return this.isAbsoluteUrl(value) ? value : this.resolveUrl(value);
  }

  private resolveFetchInput(input: RequestInfo | URL): {
    input: RequestInfo | URL;
    url: string;
  } {
    const value = this.getInputUrl(input);
    if (this.isAbsoluteUrl(value)) return { input, url: value };
    const url = this.resolveUrl(value);
    return { input: url, url };
  }

  private getInputUrl(input: RequestInfo | URL): string {
    if (typeof input === 'string') return input;
    if (input instanceof URL) return input.href;
    return input.url;
  }

  private isRequest(input: RequestInfo | URL): input is Request {
    return typeof Request !== 'undefined' && input instanceof Request;
  }

  private isAbsoluteUrl(value: string): boolean {
    return /^[a-z][a-z\d+.-]*:/i.test(value) || value.startsWith('//');
  }

  private toComparableUrl(value: string): URL | null {
    try {
      if (this.isAbsoluteUrl(value)) {
        const base =
          value.startsWith('//') && typeof globalThis.location !== 'undefined'
            ? globalThis.location.origin
            : undefined;
        return new URL(value, base);
      }
      return new URL(
        value,
        typeof globalThis.location !== 'undefined'
          ? globalThis.location.origin
          : 'https://enfyra.invalid',
      );
    } catch {
      return null;
    }
  }

  private buildBody(body: unknown, headers: Headers): BodyInit | undefined {
    if (body === undefined || body === null) return undefined;
    if (this.isBodyInit(body)) return body;
    if (!headers.has('content-type'))
      headers.set('content-type', 'application/json');
    return JSON.stringify(body);
  }

  private isBodyInit(body: unknown): body is BodyInit {
    return (
      typeof body === 'string' ||
      body instanceof Blob ||
      body instanceof FormData ||
      body instanceof URLSearchParams ||
      body instanceof ArrayBuffer ||
      ArrayBuffer.isView(body) ||
      (typeof ReadableStream !== 'undefined' && body instanceof ReadableStream)
    );
  }

  private async parseResponse(
    response: Response,
    responseType?: HttpResponseType,
  ): Promise<unknown> {
    if (response.status === 204 || response.status === 205) return undefined;
    if (responseType === 'blob') return response.blob();
    if (responseType === 'arrayBuffer') return response.arrayBuffer();
    if (responseType === 'text') return response.text();

    const text = await response.text();
    if (!text) return undefined;
    const contentType = response.headers.get('content-type') ?? '';
    if (responseType === 'json' || contentType.includes('json')) {
      try {
        return JSON.parse(text);
      } catch {
        return text;
      }
    }
    return text;
  }

  private buildQueryString(query?: Record<string, unknown>): string {
    if (!query) return '';
    const params = new URLSearchParams();
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) continue;
      params.append(key, String(value));
    }
    return params.toString();
  }

  private canRetryMethod(method: string, retryUnsafe?: boolean): boolean {
    return method === 'GET' || retryUnsafe === true;
  }

  private shouldRetry(
    error: RequestFailure,
    attempt: number,
    maxAttempts: number,
  ): boolean {
    if (attempt >= maxAttempts || error.code === 'TIMEOUT') return false;
    return !error.statusCode || error.statusCode >= 500;
  }

  private toRequestFailure(error: unknown): RequestFailure {
    if (error instanceof EnfyraError) {
      return {
        cause: error,
        data: error.details,
        message: error.message,
        statusCode: error.statusCode,
      };
    }
    if (error && typeof error === 'object') return error as RequestFailure;
    return { cause: error, message: String(error) };
  }

  private async handleError(error: RequestFailure): Promise<never> {
    const data = error.data as
      | {
          error?: { code?: string; message?: string; details?: unknown };
          code?: string;
          message?: string;
          details?: unknown;
        }
      | undefined;
    const payload = data?.error ?? data;
    const statusCode = error.statusCode;
    let code: EnfyraErrorCode =
      payload?.code ?? this.mapErrorCode(statusCode, error);
    let enfyraError = new EnfyraError({
      code,
      message: payload?.message || error.message || 'Request failed',
      statusCode,
      details: payload?.details,
    });

    for (const transformer of this.errorTransformers) {
      enfyraError = await transformer(enfyraError);
    }
    throw enfyraError;
  }

  private mapErrorCode(
    statusCode: number | undefined,
    error: RequestFailure,
  ): EnfyraErrorCode {
    if (error.code === 'TIMEOUT') return 'TIMEOUT_ERROR';
    if (!statusCode) return 'NETWORK_ERROR';
    if (statusCode === 401) return 'UNAUTHORIZED';
    if (statusCode === 403) return 'FORBIDDEN';
    if (statusCode === 404) return 'NOT_FOUND';
    if (statusCode === 429) return 'RATE_LIMITED';
    if (statusCode >= 400 && statusCode < 500) return 'VALIDATION_ERROR';
    return 'SERVER_ERROR';
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  get<T>(
    endpoint: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(
    endpoint: string,
    body?: unknown,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(
    endpoint: string,
    options?: Omit<HttpRequestOptions, 'method' | 'body'>,
  ): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
