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
  assert.equal(client.requestRematch(), true);
  assert.deepEqual(JSON.parse(socket.message), { type: 'rematch' });
  assert.deepEqual(requests.map(request => request.url), [
    'https://match.example.com/api/rooms',
    'https://match.example.com/api/rooms/room-id/join',
  ]);
  client.close();
});

test('invite status can be checked before the guest chooses a free fighter', async () => {
  const client = new OnlineRoomClient({
    url: 'https://match.example.com',
    transport: async url => ({ ok: true, json: async () => ({ seats: [{ characterId: 'elias' }, { characterId: null }], url }) }),
  });
  const status = await client.status('room-id');
  assert.equal(status.seats[0].characterId, 'elias');
  assert.equal(status.url, 'https://match.example.com/api/rooms/room-id');
});

test('default browser transport keeps the correct fetch receiver for invite status', async () => {
  const original = globalThis.fetch;
  globalThis.fetch = async function(url) {
    assert.equal(this, globalThis);
    return { ok: true, json: async () => ({ url }) };
  };
  try {
    const client = new OnlineRoomClient({ url: 'https://match.example.com' });
    assert.equal((await client.status('invite-id')).url, 'https://match.example.com/api/rooms/invite-id');
  } finally { globalThis.fetch = original; }
});
