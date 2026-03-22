import { $fetch } from 'ofetch';
import { EnfyraError } from '../errors/EnfyraError';
import type { HttpClientConfig, HttpRequestOptions, HttpResponse, EnfyraErrorCode, ResponseTransformer, ErrorTransformer } from '../types';

export class HttpClient {
  private baseUrl: string;
  private defaultHeaders: Record<string, string>;
  private timeout: number;
  private retries: number;
  private retryDelay: number;
  private onBeforeRequest?: () => Promise<void>;
  private responseTransformers: ResponseTransformer[] = [];
  private errorTransformers: ErrorTransformer[] = [];

  constructor(config: HttpClientConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.defaultHeaders = config.headers || {};
    this.timeout = config.timeout || 30000;
    this.retries = config.retries || 0;
    this.retryDelay = config.retryDelay || 1000;
  }

  setOnBeforeRequest(callback: () => Promise<void>): void {
    this.onBeforeRequest = callback;
  }

  onResponse(transformer: ResponseTransformer): void {
    this.responseTransformers.push(transformer);
  }

  onError(transformer: ErrorTransformer): void {
    this.errorTransformers.push(transformer);
  }

  setHeader(key: string, value: string): void {
    this.defaultHeaders[key] = value;
  }

  removeHeader(key: string): void {
    delete this.defaultHeaders[key];
  }

  private buildUrl(endpoint: string, query?: Record<string, any>): string {
    const cleanEndpoint = endpoint.replace(/^\//, '');
    const url = new URL(`${this.baseUrl}/${cleanEndpoint}`);
    
    if (query) {
      Object.entries(query).forEach(([key, value]) => {
        if (value !== undefined && value !== null) {
          url.searchParams.append(key, value);
        }
      });
    }
    
    return url.toString();
  }

  private getHeaders(customHeaders?: Record<string, string>, skipContentType?: boolean): Record<string, string> {
    const headers: Record<string, string> = {
      ...this.defaultHeaders,
      ...customHeaders,
    };

    if (!skipContentType) {
      headers['Content-Type'] = 'application/json';
    }

    return headers;
  }

  private sleep(ms: number): Promise<void> {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  async request<T>(
    endpoint: string,
    options: HttpRequestOptions = {}
  ): Promise<HttpResponse<T>> {
    const {
      method = 'GET',
      headers: customHeaders,
      body,
      query,
      timeout = this.timeout,
    } = options;

    if (this.onBeforeRequest) {
      await this.onBeforeRequest();
    }

    const url = this.buildUrl(endpoint, query);
    
    const isFormData = typeof FormData !== 'undefined' && body instanceof FormData;
    const headers = this.getHeaders(customHeaders, isFormData);

    let lastError: any = null;
    let attempts = 0;

    while (attempts <= this.retries) {
      try {
        const fullResponse = await $fetch<any>(url, {
          method,
          headers,
          body,
          timeout,
          credentials: 'include',
        });

        const responseData = fullResponse.data || fullResponse;
        const meta = fullResponse.meta;

        let response: HttpResponse<T> = {
          data: responseData,
          status: fullResponse.statusCode || 200,
          headers: new Headers(),
          meta,
        };

        // Apply response transformers
        for (const transformer of this.responseTransformers) {
          response = await transformer(response);
        }

        return response;
      } catch (error: any) {
        lastError = error;
        attempts++;

        if (error.statusCode && error.statusCode >= 400 && error.statusCode < 500) {
          break;
        }

        if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
          break;
        }

        if (attempts <= this.retries) {
          await this.sleep(this.retryDelay * attempts);
        }
      }
    }

    throw this.handleError(lastError);
  }

  private async handleError(error: any): Promise<never> {
    const statusCode = error.statusCode || error.status;

    let code: EnfyraErrorCode = 'SERVER_ERROR';

    if (error.code === 'TIMEOUT' || error.message?.includes('timeout')) {
      code = 'TIMEOUT_ERROR';
    } else if (!statusCode) {
      code = 'NETWORK_ERROR';
    } else if (statusCode === 401) {
      code = 'UNAUTHORIZED';
    } else if (statusCode === 403) {
      code = 'FORBIDDEN';
    } else if (statusCode === 404) {
      code = 'NOT_FOUND';
    } else if (statusCode === 429) {
      code = 'RATE_LIMITED';
    } else if (statusCode >= 400 && statusCode < 500) {
      code = 'VALIDATION_ERROR';
    }

    let enfyraError = new EnfyraError({
      code,
      message: error.message || error.data?.message || 'Request failed',
      statusCode,
      details: error.data || error.response,
    });

    // Apply error transformers
    for (const transformer of this.errorTransformers) {
      enfyraError = await transformer(enfyraError);
    }

    throw enfyraError;
  }

  get<T>(endpoint: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'GET' });
  }

  post<T>(endpoint: string, body?: any, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'POST', body });
  }

  put<T>(endpoint: string, body?: any, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PUT', body });
  }

  patch<T>(endpoint: string, body?: any, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'PATCH', body });
  }

  delete<T>(endpoint: string, options?: Omit<HttpRequestOptions, 'method' | 'body'>): Promise<HttpResponse<T>> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' });
  }
}
