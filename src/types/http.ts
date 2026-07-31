import type { AuthConfig } from './auth';
import type { EnfyraError } from '../errors/EnfyraError';

export type KnownEnfyraErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR';

export type EnfyraErrorCode = KnownEnfyraErrorCode | (string & {});

export interface EnfyraErrorData {
  code?: EnfyraErrorCode;
  message: string;
  statusCode?: number;
  details?: unknown;
}

export interface HttpClientConfig {
  baseUrl: string;
  headers?: HeadersInit;
  getHeaders?: () => HeadersInit | Promise<HeadersInit>;
  fetch?: typeof globalThis.fetch;
  onRawResponse?: (response: Response) => void | Promise<void>;
  credentials?: RequestCredentials;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  onResponse?: ResponseTransformer | ResponseTransformer[];
  onError?: ErrorTransformer | ErrorTransformer[];
}

export interface EnfyraClientConfig extends HttpClientConfig {
  auth?: AuthConfig;
}

export type HttpResponseType = 'json' | 'text' | 'blob' | 'arrayBuffer';

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: HeadersInit;
  body?: unknown;
  query?: Record<string, unknown>;
  timeout?: number;
  responseType?: HttpResponseType;
  credentials?: RequestCredentials;
  signal?: AbortSignal;
  auth?: boolean;
  retryUnsafe?: boolean;
  redirect?: RequestRedirect;
  transform?: ResponseTransformer;
}

export interface HttpResponse<T = unknown> {
  data: T;
  status: number;
  headers: Headers;
  meta?: {
    totalCount?: number;
    filterCount?: number;
    page?: number;
    limit?: number;
    aggregate?: Record<string, unknown>;
  };
}

export interface ResponseTransformer {
  (response: HttpResponse): HttpResponse | Promise<HttpResponse>;
}

export interface ErrorTransformer {
  (error: EnfyraError): EnfyraError | Promise<EnfyraError>;
}
