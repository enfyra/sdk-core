export type WebSocketTransport = 'polling' | 'websocket';

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
  reconnectDelayMax?: number;
  transports?: WebSocketTransport[];
  upgrade?: boolean;
}

export type WebSocketEvent = 'connect' | 'disconnect' | 'connect_error' | 'error' | (string & {});
export type WebSocketEventHandler = (data?: unknown) => void;
