import { beforeEach, describe, expect, it, vi } from 'vitest';

const mocks = vi.hoisted(() => ({
  io: vi.fn(),
  socket: {
    connected: false,
    on: vi.fn(),
    off: vi.fn(),
    emit: vi.fn(),
    disconnect: vi.fn(),
  },
}));

vi.mock('socket.io-client', () => ({ io: mocks.io }));

import { WebSocketClient } from '../src/websocket/WebSocketClient';

describe('WebSocketClient', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mocks.io.mockReturnValue(mocks.socket);
  });

  it('cancels a pending lazy connection on disconnect and permits a fresh connect', async () => {
    const client = new WebSocketClient({ gateway: 'chat' });
    const pending = client.connect();
    client.disconnect();
    await pending;
    expect(mocks.io).not.toHaveBeenCalled();
    await client.connect();
    expect(mocks.io).toHaveBeenCalledTimes(1);
    client.disconnect();
  });

  it('retains listeners registered before async connection setup', async () => {
    const onConnect = vi.fn();
    const client = new WebSocketClient({
      baseUrl: 'https://app.example',
      gateway: 'chat',
      path: '/ws/socket.io',
      namespacePrefix: '/ws',
      withCredentials: true,
    });

    client.on('connect', onConnect);
    await client.connect();

    expect(mocks.io).toHaveBeenCalledWith('https://app.example/ws/chat', {
      path: '/ws/socket.io',
      auth: undefined,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 5,
      reconnectionDelay: 2000,
      reconnectionDelayMax: 30000,
      transports: ['polling'],
      upgrade: false,
    });
    expect(mocks.socket.on).toHaveBeenCalledWith('connect', onConnect);
  });

  it('allows callers to override the stable transport defaults', async () => {
    const client = new WebSocketClient({
      baseUrl: 'https://app.example',
      gateway: 'chat',
      maxReconnectAttempts: 3,
      reconnectInterval: 500,
      reconnectDelayMax: 5_000,
      transports: ['websocket'],
      upgrade: true,
    });

    await client.connect();

    expect(mocks.io).toHaveBeenCalledWith('https://app.example/chat', {
      path: '/socket.io',
      auth: undefined,
      withCredentials: true,
      reconnection: true,
      reconnectionAttempts: 3,
      reconnectionDelay: 500,
      reconnectionDelayMax: 5_000,
      transports: ['websocket'],
      upgrade: true,
    });
  });
});
