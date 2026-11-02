import { DurableObject } from 'cloudflare:workers';
import { Match } from '../src/model.js';
import { availableSeat, bufferInput, consumeTransientInput, fighterCount, fillComputerSeats, humanSeats, lineupFromSeats, matchOptions, snapshot, SNAPSHOT_EVERY_TICKS, TICK_SECONDS, validCharacter } from './room-protocol.js';

const ROOM_ROUTE = /^\/api\/rooms\/([a-f\d-]{36})(?:\/(join|connect))?$/i;
const EMPTY_INPUT = Object.freeze({ x: 0, y: 0, pistol: false, special: false, specialRelease: false, dodge: false });

function json(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { 'content-type': 'application/json; charset=utf-8', 'access-control-allow-origin': '*' },
  });
}

async function body(request) {
  try { return await request.json(); } catch { return null; }
}

export default {
  async fetch(request, env) {
    const url = new URL(request.url);
    if (request.method === 'OPTIONS' && url.pathname.startsWith('/api/')) {
      return new Response(null, { headers: {
        'access-control-allow-origin': '*',
        'access-control-allow-methods': 'GET, POST, OPTIONS',
        'access-control-allow-headers': 'content-type',
      } });
    }
    if (url.pathname === '/api/rooms' && request.method === 'POST') {
      let options;
      try { options = matchOptions(await body(request)); }
      catch (error) { return json({ error: error.message }, 400); }
      const id = crypto.randomUUID();
      const room = env.MATCH_ROOMS.getByName(id);
      const result = await room.fetch(new Request('https://room.internal/create', {
        method: 'POST', body: JSON.stringify(options),
      }));
      if (!result.ok) return result;
      return json({ id, inviteUrl: `${url.origin}/?room=${id}`, ...await result.json() }, 201);
    }
    const match = url.pathname.match(ROOM_ROUTE);
    if (match) {
      const [, id, action] = match;
      const expected = action === 'join' ? 'POST' : 'GET';
      if (request.method !== expected) return json({ error: 'Method not allowed' }, 405);
      return env.MATCH_ROOMS.getByName(id).fetch(request);
    }
    if (url.pathname.startsWith('/api/')) return json({ error: 'Not found' }, 404);
    return env.ASSETS.fetch(request);
  },
};

export class MatchRoom extends DurableObject {
  constructor(ctx, env) {
    super(ctx, env);
    this.room = null;
    this.match = null;
    this.inputs = [];
    this.frame = 0;
    this.timer = null;
    this.sockets = new Map();
    for (const ws of ctx.getWebSockets()) {
      const attachment = ws.deserializeAttachment();
      if (attachment) this.sockets.set(ws, attachment.seat);
    }
    this.ready = ctx.blockConcurrencyWhile(async () => {
      this.room = await ctx.storage.get('room') || null;
      const checkpoint = await ctx.storage.get('checkpoint');
      if (this.room && checkpoint) {
        const restored = new Match(Math.random, this.matchConfig());
        const aiState = restored.aiState;
        this.match = Object.assign(restored, checkpoint.match);
        this.match.random = Math.random;
        this.match.aiState = aiState;
        this.inputs = checkpoint.inputs || [];
        this.frame = checkpoint.frame || 0;
      }
      this.resumeIfReady();
    });
  }

  matchConfig() {
    return {
      ...this.room.options,
      lineup: lineupFromSeats(this.room.seats),
      controllers: this.room.seats.map(seat => seat?.computer ? 'computer' : 'human'),
    };
  }

  publicStatus() {
    return {
      type: 'status',
      options: this.room.options,
      format: this.room.options.format,
      requiredPlayers: humanSeats(this.room.options).length,
      seats: this.room.seats.map((seat, index) => ({
        seat: index,
        characterId: seat?.characterId || null,
        computer: !!seat?.computer,
        connected: !!seat?.computer || [...this.sockets.values()].includes(index),
      })),
      started: !!this.match,
      finished: this.match?.finished || false,
      rematchVotes: this.room.rematchVotes || Array(fighterCount(this.room.options.format)).fill(false),
    };
  }

  broadcast(packet) {
    const message = JSON.stringify(packet);
    for (const ws of this.sockets.keys()) {
      try { ws.send(message); } catch { this.sockets.delete(ws); }
    }
  }

  resumeIfReady() {
    if (!this.room || this.timer || !this.match || this.match.finished) return;
    if (this.sockets.size !== humanSeats(this.room.options).length) return;
    this.timer = setInterval(() => this.tick(), 1000 * TICK_SECONDS);
  }

  stop() {
    if (this.timer) clearInterval(this.timer);
    this.timer = null;
  }

  async startRematchIfReady() {
    const count = fighterCount(this.room.options.format);
    if (!this.match?.finished || this.sockets.size !== humanSeats(this.room.options).length ||
      !humanSeats(this.room.options).every(seat => this.room.rematchVotes?.[seat])) return;
    this.match = new Match(Math.random, this.matchConfig());
    this.inputs = Array.from({ length: count }, () => ({ ...EMPTY_INPUT }));
    this.room.readyAt = Date.now() + 1500;
    this.room.rematchVotes = Array(count).fill(false);
    this.frame++;
    await this.ctx.storage.put('room', this.room);
    await this.saveCheckpoint();
    this.broadcast({ type: 'state', frame: this.frame, state: snapshot(this.match) });
    this.broadcast(this.publicStatus());
    this.resumeIfReady();
  }

  async requestRematch(seat) {
    if (!this.match?.finished || !humanSeats(this.room.options).includes(seat)) return;
    this.room.rematchVotes ||= Array(fighterCount(this.room.options.format)).fill(false);
    if (this.room.rematchVotes[seat]) return;
    this.room.rematchVotes[seat] = true;
    await this.ctx.storage.put('room', this.room);
    this.broadcast(this.publicStatus());
    await this.startRematchIfReady();
  }

  async fetch(request) {
    await this.ready;
    const url = new URL(request.url);
    if (url.pathname === '/create' && request.method === 'POST') {
      if (this.room) return json({ error: 'Room already exists' }, 409);
      let options;
      try { options = matchOptions(await body(request)); }
      catch (error) { return json({ error: error.message }, 400); }
      this.room = { options, seats: Array(fighterCount(options.format)).fill(null),
        rematchVotes: Array(fighterCount(options.format)).fill(false), createdAt: Date.now() };
      await this.ctx.storage.put('room', this.room);
      return json({ status: this.publicStatus() }, 201);
    }
    if (!this.room) return json({ error: 'Room not found' }, 404);
    if (url.pathname.endsWith('/join') && request.method === 'POST') {
      const data = await body(request);
      if (data?.token) {
        const seat = this.room.seats.findIndex(entry => entry?.token === data.token);
        if (seat < 0) return json({ error: 'Invalid seat token' }, 403);
        return json({ seat, token: data.token, status: this.publicStatus() });
      }
      if (this.match) return json({ error: 'Match already started' }, 409);
      if (!validCharacter(data?.characterId)) return json({ error: 'Choose a known fighter' }, 400);
      if (this.room.seats.some(entry => entry?.characterId === data.characterId)) {
        return json({ error: 'Fighter already chosen' }, 409);
      }
      const requestedTeam = data?.team;
      if (requestedTeam !== undefined && requestedTeam !== 0 && requestedTeam !== 1) {
        return json({ error: 'Choose a valid team' }, 400);
      }
      const seat = availableSeat(this.room.seats, this.room.options, requestedTeam);
      if (seat < 0) return json({ error: 'Room or selected team is full' }, 409);
      const token = crypto.randomUUID();
      this.room.seats[seat] = { characterId: data.characterId, token };
      await this.ctx.storage.put('room', this.room);
      this.broadcast(this.publicStatus());
      return json({ seat, token, status: this.publicStatus() }, 201);
    }
    if (url.pathname.endsWith('/connect')) {
      if (request.headers.get('Upgrade')?.toLowerCase() !== 'websocket') return json({ error: 'WebSocket required' }, 426);
      const token = url.searchParams.get('token');
      const seat = this.room.seats.findIndex(entry => entry?.token === token);
      if (seat < 0) return json({ error: 'Invalid seat token' }, 403);
      for (const [existing, occupiedSeat] of this.sockets) {
        if (occupiedSeat === seat) { existing.close(4000, 'Reconnected'); this.sockets.delete(existing); }
      }
      const [client, server] = Object.values(new WebSocketPair());
      this.ctx.acceptWebSocket(server);
      server.serializeAttachment({ seat });
      this.sockets.set(server, seat);
      server.send(JSON.stringify({ type: 'welcome', seat, status: this.publicStatus() }));
      if (!this.match && this.sockets.size === humanSeats(this.room.options).length) {
        this.room.seats = fillComputerSeats(this.room.seats, this.room.options);
        this.match = new Match(Math.random, this.matchConfig());
        this.room.readyAt = Date.now() + 1500;
        this.inputs = Array(fighterCount(this.room.options.format)).fill(null).map(() => ({ ...EMPTY_INPUT }));
        await this.ctx.storage.put('room', this.room);
        this.ctx.waitUntil(this.saveCheckpoint());
      }
      if (this.match?.finished) await this.startRematchIfReady();
      this.broadcast(this.publicStatus());
      if (this.match) this.broadcast({ type: 'state', frame: this.frame, state: snapshot(this.match) });
      this.resumeIfReady();
      return new Response(null, { status: 101, webSocket: client });
    }
    if (request.method === 'GET') return json(this.publicStatus());
    return json({ error: 'Not found' }, 404);
  }

  tick() {
    if (!this.match) return;
    if (Date.now() < (this.room.readyAt || 0)) return;
    this.match.update(TICK_SECONDS, this.inputs);
    this.frame++;
    for (const input of this.inputs) consumeTransientInput(input);
    if (this.frame % SNAPSHOT_EVERY_TICKS === 0 || this.match.finished) {
      this.broadcast({ type: 'state', frame: this.frame, state: snapshot(this.match) });
      this.match.events = [];
    }
    if (this.frame % 60 === 0 || this.match.finished) this.ctx.waitUntil(this.saveCheckpoint());
    if (this.match.finished) this.stop();
  }

  async saveCheckpoint() {
    if (!this.match) return;
    await this.ctx.storage.put('checkpoint', {
      match: JSON.parse(JSON.stringify(this.match)), inputs: this.inputs, frame: this.frame,
    });
  }

  webSocketMessage(ws, message) {
    const seat = this.sockets.get(ws);
    if (seat === undefined || typeof message !== 'string' || message.length > 512) return;
    if (message === 'ping') { ws.send('pong'); return; }
    let packet;
    try { packet = JSON.parse(message); } catch { return; }
    if (packet?.type === 'rematch') {
      this.ctx.waitUntil(this.requestRematch(seat));
      return;
    }
    if (packet?.type !== 'input') return;
    const input = bufferInput(this.inputs[seat], packet.input);
    if (input) this.inputs[seat] = input;
  }

  webSocketClose(ws) {
    if (!this.sockets.delete(ws)) return;
    if (this.sockets.size < humanSeats(this.room.options).length) this.stop();
    if (this.room) this.broadcast(this.publicStatus());
    if (this.match) this.ctx.waitUntil(this.saveCheckpoint());
  }

  webSocketError(ws) { this.webSocketClose(ws); }
}
