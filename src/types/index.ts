export type EnfyraErrorCode =
  | 'UNAUTHORIZED'
  | 'FORBIDDEN'
  | 'NOT_FOUND'
  | 'VALIDATION_ERROR'
  | 'RATE_LIMITED'
  | 'SERVER_ERROR'
  | 'NETWORK_ERROR'
  | 'TIMEOUT_ERROR';

export interface EnfyraErrorData {
  code?: EnfyraErrorCode;
  message: string;
  statusCode?: number;
  details?: Record<string, any>;
}

export interface HttpClientConfig {
  baseUrl: string;
  headers?: Record<string, string>;
  timeout?: number;
  retries?: number;
  retryDelay?: number;
  cookiePath?: string; // Custom cookie path (default: '/')
}

export interface HttpRequestOptions {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  headers?: Record<string, string>;
  body?: any;
  query?: Record<string, any>;
  timeout?: number;
}

export interface HttpResponse<T = any> {
  data: T;
  status: number;
  headers: Headers;
  meta?: {
    totalCount?: number;
    filterCount?: number;
  };
}

export interface FilterOperators {
  _eq?: any;
  _neq?: any;
  _gt?: any;
  _gte?: any;
  _lt?: any;
  _lte?: any;
  _in?: any[];
  _nin?: any[];
  _contains?: string;
  _icontains?: string;
  _starts_with?: string;
  _ends_with?: string;
  _is_null?: boolean;
  _between?: [any, any];
}

export type FilterValue = any | FilterOperators;

export interface FilterObject {
  [key: string]: FilterValue | FilterObject;
  _and?: FilterObject[];
  _or?: FilterObject[];
}

export interface QueryConfig {
  select?: string;
  filter?: FilterObject;
  sort?: string;
  limit?: number;
  page?: number;
  deep?: Record<string, any>;
  meta?: ('totalCount' | 'filterCount')[];
}

export interface ExecuteResult<T = any> {
  data: T | T[];
  meta?: {
    totalCount?: number;
    filterCount?: number;
    page?: number;
    limit?: number;
  };
}

export interface UploadFileParams {
  file: File | Blob;
  folder?: number;
  title?: string;
  description?: string;
}

export interface WebSocketConfig {
  baseUrl: string;
  gateway: string;
  authToken?: string;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export type WebSocketEvent = 'connect' | 'disconnect' | 'error' | string;
export type WebSocketEventHandler = (data: any) => void;

export interface ResponseTransformer<T = any> {
  (response: HttpResponse<T>): HttpResponse<T> | Promise<HttpResponse<T>>;
}

export interface ErrorTransformer {
  (error: any): any | Promise<any>;
}

// Auth types
export { AuthTokens, LoginCredentials, UserInfo } from '../auth/AuthManager';
