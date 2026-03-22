import type { WebSocketConfig, WebSocketEvent, WebSocketEventHandler } from '../types';

interface SocketIO {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  disconnect(): void;
  connected: boolean;
  id: string;
  io: {
    engine: {
      transport?: {
        name: string;
      };
    };
  };
  onAny(callback: (event: string, ...args: any[]) => void): void;
}

interface SocketIOClientStatic {
  (url: string, options?: any): any;
}

export class WebSocketClient {
  private ws: SocketIO | null = null;
  private config: WebSocketConfig;
  private handlers: Map<string, Set<WebSocketEventHandler>> = new Map();
  private reconnectAttempts = 0;
  private socketIOClient: SocketIOClientStatic | null = null;

  constructor(config: WebSocketConfig) {
    this.config = {
      reconnect: true,
      maxReconnectAttempts: 5,
      reconnectInterval: 1000,
      ...config,
    };
  }

  private async loadSocketIO() {
    if (!this.socketIOClient) {
      try {
        const io = await import('socket.io-client');
        this.socketIOClient = io.io;
      } catch {
        throw new Error('socket.io-client is required. Install with: npm install socket.io-client');
      }
    }
    return this.socketIOClient;
  }

  connect() {
    const namespace = this.config.gateway.startsWith('/')
      ? this.config.gateway
      : `/${this.config.gateway}`;

    this.loadSocketIO().then((io) => {
      let socketUrl: string;

      if (this.config.baseUrl && /^https?:\/\//.test(this.config.baseUrl)) {
        socketUrl = this.config.baseUrl.replace(/\/+$/, '');
      } else {
        socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
      }

      const ws = io(socketUrl + namespace, {
        path: '/socket.io',
        transports: ['polling', 'websocket'],
        query: { reconnect: String(this.config.reconnect) },
        auth: this.config.authToken ? { token: this.config.authToken } : undefined,
        reconnection: this.config.reconnect,
        reconnectionAttempts: this.config.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectInterval,
        reconnectionDelayMax: this.config.reconnectInterval ? this.config.reconnectInterval * 5 : undefined,
        timeout: 20000,
        forceNew: true,
      });

      this.ws = ws;

      ws.on('connect', () => {
        this.reconnectAttempts = 0;
        this._emitLocal('connect', {});
      });

      ws.on('connect_error', (error: any) => {
        this._emitLocal('connect_error', error);
      });

      ws.on('disconnect', (reason: any) => {
        this._emitLocal('disconnect', { reason });
      });

      ws.on('backend_disconnected', (data: any) => {
        this._emitLocal('backend_disconnected', data);
      });

      ws.on('backend_reconnected', () => {
        this._emitLocal('backend_reconnected', {});
      });

      ws.on('backend_connect_error', (data: any) => {
        this._emitLocal('backend_connect_error', data);
      });

      ws.onAny((event: string, ...args: any[]) => {
        if (!['connect', 'connect_error', 'disconnect', 'error', 'reconnect', 'reconnect_attempt'].includes(event)) {
          this._emitLocal(event, args[0]);
        }
      });
    });
  }

  emit(event: string, data: any): void {
    if (this.ws && this.ws.connected) {
      this.ws.emit(event, data);
    }
  }

  private _emitLocal(event: string, data: any): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.forEach(handler => handler(data));
    }
  }

  on(event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    if (!this.handlers.has(event)) {
      this.handlers.set(event, new Set());
    }
    this.handlers.get(event)!.add(handler);

    return () => this.off(event, handler);
  }

  off(event: WebSocketEvent, handler: WebSocketEventHandler): void {
    const eventHandlers = this.handlers.get(event);
    if (eventHandlers) {
      eventHandlers.delete(handler);
    }
  }

  disconnect(): void {
    this.config.reconnect = false;
    this.ws?.disconnect();
    this.ws = null;
    this.handlers.clear();
  }
}
