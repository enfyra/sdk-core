import type { Socket } from 'socket.io-client';
import type {
  WebSocketConfig,
  WebSocketEvent,
  WebSocketEventHandler,
} from '../types';

export class WebSocketClient {
  private ws: Socket | null = null;
  private socketIOClient: typeof import('socket.io-client').io | null = null;
  private connectPromise: Promise<void> | null = null;
  private readonly listeners = new Map<string, Set<WebSocketEventHandler>>();
  private readonly config: Required<
    Pick<
      WebSocketConfig,
      | 'path'
      | 'namespacePrefix'
      | 'withCredentials'
      | 'reconnect'
      | 'maxReconnectAttempts'
      | 'reconnectInterval'
    >
  > &
    WebSocketConfig;

  constructor(config: WebSocketConfig) {
    this.config = {
      path: '/socket.io',
      namespacePrefix: '',
      withCredentials: true,
      reconnect: true,
      maxReconnectAttempts: 5,
      reconnectInterval: 1_000,
      ...config,
    };
  }

  connect(): Promise<void> {
    if (this.ws?.connected) return Promise.resolve();
    if (!this.connectPromise) {
      this.connectPromise = this.createSocket().finally(() => {
        this.connectPromise = null;
      });
    }
    return this.connectPromise;
  }

  emit(event: string, data: unknown): void {
    if (this.ws?.connected) this.ws.emit(event, data);
  }

  on(event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    const handlers = this.listeners.get(event) ?? new Set();
    handlers.add(handler);
    this.listeners.set(event, handlers);
    this.ws?.on(event, handler);
    return () => this.off(event, handler);
  }

  off(event: WebSocketEvent, handler: WebSocketEventHandler): void {
    this.listeners.get(event)?.delete(handler);
    this.ws?.off(event, handler);
  }

  disconnect(): void {
    this.ws?.disconnect();
    this.ws = null;
  }

  private async createSocket(): Promise<void> {
    const io = await this.loadSocketIO();
    const baseUrl = this.config.baseUrl
      ? this.config.baseUrl.replace(/\/+$/, '')
      : typeof window !== 'undefined'
        ? window.location.origin
        : '';
    const namespace = this.buildNamespace();
    this.ws = io(`${baseUrl}${namespace}`, {
      path: this.config.path,
      auth: this.buildAuth(),
      withCredentials: this.config.withCredentials,
      reconnection: this.config.reconnect,
      reconnectionAttempts: this.config.maxReconnectAttempts,
      reconnectionDelay: this.config.reconnectInterval,
    });
    for (const [event, handlers] of this.listeners) {
      for (const handler of handlers) this.ws.on(event, handler);
    }
  }

  private buildNamespace(): string {
    const prefix = this.config.namespacePrefix.replace(/^\/+|\/+$/g, '');
    const gateway = this.config.gateway.replace(/^\/+|\/+$/g, '');
    return `/${[prefix, gateway].filter(Boolean).join('/')}`;
  }

  private buildAuth() {
    if (this.config.getAuthToken) {
      return (callback: (auth: { token?: string }) => void) => {
        void Promise.resolve(this.config.getAuthToken?.())
          .then((token) => callback(token ? { token } : {}))
          .catch(() => callback({}));
      };
    }
    return this.config.authToken
      ? { token: this.config.authToken }
      : undefined;
  }

  private async loadSocketIO(): Promise<typeof import('socket.io-client').io> {
    if (!this.socketIOClient) {
      try {
        const socketIO = await import('socket.io-client');
        this.socketIOClient = socketIO.io;
      } catch {
        throw new Error(
          'socket.io-client is required. Install with: yarn add socket.io-client',
        );
      }
    }
    return this.socketIOClient!;
  }
}
