import type { WebSocketConfig, WebSocketEvent, WebSocketEventHandler } from '../types';
import type { Socket } from 'socket.io-client';

export class WebSocketClient {
  private ws: Socket | null = null;
  private config: WebSocketConfig;
  private socketIOClient: ((url: string, options?: any) => Socket) | null = null;

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

      this.ws = io(socketUrl + namespace, {
        path: '/socket.io',
        auth: this.config.authToken ? { token: this.config.authToken } : undefined,
        reconnection: this.config.reconnect,
        reconnectionAttempts: this.config.maxReconnectAttempts,
        reconnectionDelay: this.config.reconnectInterval,
      });
    });
  }

  emit(event: string, data: any): void {
    if (this.ws && this.ws.connected) {
      this.ws.emit(event, data);
    }
  }

  on(event: WebSocketEvent, handler: WebSocketEventHandler): () => void {
    if (this.ws) {
      this.ws.on(event, handler);
    }
    return () => this.off(event, handler);
  }

  off(event: WebSocketEvent, handler: WebSocketEventHandler): void {
    if (this.ws) {
      this.ws.off(event, handler);
    }
  }

  disconnect(): void {
    this.config.reconnect = false;
    this.ws?.disconnect();
    this.ws = null;
  }
}
