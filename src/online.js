// Shared by browser and Capacitor clients. The server owns match state; clients send inputs only.
function serverOrigin(configured) {
  const origin = configured || import.meta.env?.VITE_MATCH_SERVER_URL || globalThis.location?.origin;
  if (!origin) throw new Error('Match server URL is required');
  const url = new URL(origin);
  if (!['https:', 'http:'].includes(url.protocol)) throw new Error('Match server must use HTTP or HTTPS');
  return url.origin;
}

async function post(origin, path, payload, transport) {
  const response = await transport(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(data.error || `Match server returned ${response.status}`);
  return data;
}

export class OnlineRoomClient {
  constructor({ url, transport = fetch, Socket = WebSocket } = {}) {
    this.origin = serverOrigin(url);
    this.transport = transport;
    this.Socket = Socket;
    this.socket = null;
    this.seat = null;
    this.roomId = null;
  }

  async create(options) {
    const room = await post(this.origin, '/api/rooms', options, this.transport);
    this.roomId = room.id;
    return room;
  }

  async join(roomId, characterId, token) {
    const seat = await post(this.origin, `/api/rooms/${encodeURIComponent(roomId)}/join`,
      token ? { token } : { characterId }, this.transport);
    this.roomId = roomId;
    this.seat = seat.seat;
    return seat;
  }

  async status(roomId) {
    const response = await this.transport(`${this.origin}/api/rooms/${encodeURIComponent(roomId)}`);
    const data = await response.json();
    if (!response.ok) throw new Error(data.error || `Match server returned ${response.status}`);
    return data;
  }

  connect(token, onPacket) {
    if (!this.roomId || this.seat === null) throw new Error('Join a room before connecting');
    this.close();
    const endpoint = new URL(`/api/rooms/${encodeURIComponent(this.roomId)}/connect`, this.origin);
    endpoint.protocol = endpoint.protocol === 'https:' ? 'wss:' : 'ws:';
    endpoint.searchParams.set('token', token);
    const socket = new this.Socket(endpoint.href);
    socket.addEventListener('message', event => {
      let packet;
      try { packet = JSON.parse(event.data); } catch { return; }
      onPacket?.(packet);
    });
    this.socket = socket;
    return socket;
  }

  sendInput(input) {
    if (this.socket?.readyState !== 1) return false;
    this.socket.send(JSON.stringify({ type: 'input', input }));
    return true;
  }

  close() {
    if (this.socket && this.socket.readyState < 2) this.socket.close();
    this.socket = null;
  }
}
