export interface WebSocketConfig {
  baseUrl?: string;
  gateway: string;
  path?: string;
  namespacePrefix?: string;
  authToken?: string;
  getAuthToken?: () => string | null | Promise<string | null>;
  withCredentials?: boolean;
  reconnect?: boolean;
  maxReconnectAttempts?: number;
  reconnectInterval?: number;
}

export type WebSocketEvent = 'connect' | 'disconnect' | 'connect_error' | 'error' | (string & {});
export type WebSocketEventHandler = (data?: unknown) => void;
