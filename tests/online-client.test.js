import test from 'node:test';
import assert from 'node:assert/strict';
import { OnlineRoomClient } from '../src/online.js';

test('online client uses a separate HTTPS match origin for native builds', async () => {
  const requests = [];
  const transport = async (url, options) => {
    requests.push({ url, options });
    return { ok: true, json: async () => url.endsWith('/api/rooms') ? { id: 'room-id' } : { seat: 1, token: 'seat-secret' } };
  };
  class Socket {
    constructor(url) { this.url = url; this.readyState = 1; this.handlers = {}; }
    addEventListener(name, handler) { this.handlers[name] = handler; }
    send(message) { this.message = message; }
    close() { this.readyState = 3; }
  }
  const client = new OnlineRoomClient({ url: 'https://match.example.com', transport, Socket });
  await client.create({ format: '1v1' });
  const joined = await client.join('room-id', 'elias');
  const socket = client.connect(joined.token);
  assert.equal(socket.url, 'wss://match.example.com/api/rooms/room-id/connect?token=seat-secret');
  assert.equal(client.sendInput({ x: 1, pistol: true }), true);
  assert.deepEqual(JSON.parse(socket.message), { type: 'input', input: { x: 1, pistol: true } });
  assert.deepEqual(requests.map(request => request.url), [
    'https://match.example.com/api/rooms',
    'https://match.example.com/api/rooms/room-id/join',
  ]);
  client.close();
});
