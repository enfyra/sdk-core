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
      reconnectionDelay: 1000,
    });
    expect(mocks.socket.on).toHaveBeenCalledWith('connect', onConnect);
  });
});
