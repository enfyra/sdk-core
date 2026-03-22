import type { WebSocketConfig, WebSocketEvent, WebSocketEventHandler } from '../types';

interface SocketIO {
  on(event: string, callback: (...args: any[]) => void): void;
  off(event: string, callback?: (...args: any[]) => void): void;
  emit(event: string, ...args: any[]): void;
  disconnect(): void;
  connected: boolean;
}

interface SocketIOClientStatic {
  (url: string, options?: any): SocketIO;
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
        // Try to import socket.io-client (Node.js/browser)
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
        socketUrl = this.config.baseUrl.replace(/\/+$/, ''); // Remove trailing slash
      } else {
        socketUrl = typeof window !== 'undefined' ? window.location.origin : '';
      }

      console.log('[WS] Connecting to:', socketUrl, 'with namespace:', namespace);

      // socket.io-client: connect to namespace by appending to URL
      // e.g., io('http://localhost:3000/chat') connects to /chat namespace
      this.ws = io(socketUrl + namespace, {
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

      // Debug: Log socket.io connection details
      this.ws.on('connect', () => {
        console.log('[WS DEBUG] Connected with transport:', this.ws.io.engine?.transport?.name);
        this.reconnectAttempts = 0;
        this._emitLocal('connect', {});
      });

      this.ws.on('connect_error', (error: any) => {
        console.error('[WS DEBUG] connect_error:', error.message, 'sid:', this.ws.id);
        this._emitLocal('connect_error', error);
      });

      this.ws.on('reconnect', (attempt: number) => {
        console.log('[WS DEBUG] Reconnected after', attempt, 'attempts, new sid:', this.ws.id);
      });

      this.ws.on('reconnect_attempt', (attempt: number) => {
        console.log('[WS DEBUG] Reconnect attempt', attempt, 'with sid:', this.ws.id);
      });

      this.ws.on('reconnect_error', (error: Error) => {
        console.error('[WS DEBUG] Reconnect error:', error.message, 'sid:', this.ws.id);
      });

      this.ws.on('reconnect_failed', () => {
        console.error('[WS DEBUG] Reconnect failed, max attempts reached');
      });

      // Generic message handler - forwards all custom events
      this.ws.onAny((event: string, ...args: any[]) => {
        // Skip Socket.IO reserved events
        if (!['connect', 'connect_error', 'disconnect', 'error', 'reconnect', 'reconnect_attempt'].includes(event)) {
          this._emitLocal(event, args[0]);
        }
      });

      this.ws.on('disconnect', (reason: any) => {
        console.log('[WS DEBUG] Disconnected, reason:', reason, 'sid:', this.ws.id);
        this._emitLocal('disconnect', { reason });
      });

      // Handle backend disconnection/reconnection (from Nuxt relay)
      this.ws.on('backend_disconnected', (data: any) => {
        console.log('[WS DEBUG] Backend disconnected:', data.reason);
        this._emitLocal('backend_disconnected', data);
      });

      this.ws.on('connect_error', (error: any) => {
        this._emitLocal('connect_error', error);
      });

      // Handle backend disconnection/reconnection (from Nuxt relay)
      this.ws.on('backend_disconnected', (data: any) => {
        this._emitLocal('backend_disconnected', data);
      });

      this.ws.on('backend_reconnected', () => {
        this._emitLocal('backend_reconnected', {});
      });

      this.ws.on('backend_connect_error', (data: any) => {
        this._emitLocal('backend_connect_error', data);
      });
    });
  }

  /**
   * Emit an event to the server
   * Note: Reserved events (connect, disconnect, error) cannot be emitted to server
   */
  emit(event: string, data: any): void {
    if (this.ws && this.ws.connected) {
      this.ws.emit(event, data);
    }
  }

  /**
   * Emit an event to local handlers only (not to server)
   * Used for system events like 'connect', 'disconnect', 'error'
   */
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
