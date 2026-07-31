export type EnfyraFetch = (
  input: RequestInfo | URL,
  init?: RequestInit,
) => Promise<Response>;

export type AxiosHeadersLike =
  | HeadersInit
  | {
      set(name: string, value: string): unknown;
    };

export interface AxiosRequestConfigLike {
  baseURL?: string;
  headers?: AxiosHeadersLike;
  url?: string;
  [key: string]: unknown;
}

export interface AxiosResponseLike {
  config: AxiosRequestConfigLike;
  status: number;
  [key: string]: unknown;
}

export interface AxiosErrorLike {
  config?: AxiosRequestConfigLike;
  response?: {
    status?: number;
  };
}

export interface AxiosInterceptorManagerLike<T> {
  use(
    fulfilled: (value: T) => T | Promise<T>,
    rejected?: (error: unknown) => unknown,
  ): number;
  eject(id: number): void;
}

export interface AxiosInstanceLike {
  defaults: {
    baseURL?: string;
  };
  interceptors: {
    request: AxiosInterceptorManagerLike<AxiosRequestConfigLike>;
    response: AxiosInterceptorManagerLike<AxiosResponseLike>;
  };
  request(config: AxiosRequestConfigLike): Promise<unknown>;
}
