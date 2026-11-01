// Run against `pnpm online:dev` to check the real Worker and Durable Object path.
import { DODGE_COOLDOWN, DODGE_DURATION } from '../src/model.js';
const origin = process.env.DIVISION_SERVER_URL || 'http://127.0.0.1:8787';
const timeout = (promise, label) => Promise.race([
  promise,
  new Promise((_, reject) => setTimeout(() => reject(new Error(`Timed out: ${label}`)), 8000)),
]);
const request = async (path, payload) => {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(payload),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
};

for (const format of ['1v1', '2v2']) {
  const room = await request('/api/rooms', { format, mode: 'random', map: 'riverside' });
  const characters = ['elias', 'dorian', 'nadia', 'imani'].slice(0, format === '2v2' ? 4 : 2);
  const seats = [];
  for (const characterId of characters) {
    seats.push(await request(`/api/rooms/${room.id}/join`, { characterId }));
  }
  if (seats.some((seat, index) => seat.seat !== index)) throw new Error('Seats were assigned incorrectly');

  const sockets = [];
  let state;
  for (const seat of seats) {
    const socket = new WebSocket(`${origin.replace(/^http/, 'ws')}/api/rooms/${room.id}/connect?token=${seat.token}`);
    await timeout(new Promise((resolve, reject) => {
      socket.addEventListener('open', resolve, { once: true });
      socket.addEventListener('error', reject, { once: true });
    }), 'connection');
    sockets.push(socket);
    if (sockets.length === 1) {
      state = timeout(new Promise(resolve => {
        socket.addEventListener('message', event => {
          const packet = JSON.parse(event.data);
          if (packet.type === 'state' && packet.frame >= 3 &&
            packet.state.players.every(player => player.shots >= 1)) resolve(packet);
        });
      }), 'live snapshot');
    }
  }
  sockets.forEach((socket, index) => socket.send(JSON.stringify({
    type: 'input', input: { x: index % 2 ? -1 : 1, pistol: true },
  })));
  const packet = await state;
  if (packet.state.players.length !== seats.length) throw new Error('Wrong fighter count');
  console.log(`${format} room ${room.id}: ${seats.length} live fighters, frame ${packet.frame}`);
  if (format === '1v1') {
    const rollFrames = [];
    sockets[0].addEventListener('message', event => {
      const update = JSON.parse(event.data);
      if (update.type === 'state') rollFrames.push({ time: update.state.time, roll: update.state.players[0].dodgeTime > 0 });
    });
    sockets[0].send(JSON.stringify({ type: 'input', input: { x: 1, y: 0, dodge: true } }));
    const rolled = await timeout(new Promise(resolve => {
      sockets[0].addEventListener('message', event => {
        const update = JSON.parse(event.data);
        if (update.type === 'state' && update.state.players[0].dodgeTime > 0) resolve(update);
      });
    }), 'first dodge');
    sockets[0].send(JSON.stringify({ type: 'input', input: { x: 0, y: 0, dodge: false } }));
    await timeout(new Promise(resolve => {
      sockets[0].addEventListener('message', event => {
        const update = JSON.parse(event.data);
        if (update.type === 'state' && update.state.time > rolled.state.time + DODGE_DURATION + DODGE_COOLDOWN + .5) resolve();
      });
    }), 'dodge cooldown');
    const rolls = rollFrames.reduce((count, frame, index) => count + (frame.roll && !rollFrames[index - 1]?.roll ? 1 : 0), 0);
    if (rolls !== 1) throw new Error(`One dodge input caused ${rolls} rolls`);
    console.log('Single dodge stayed single after its cooldown');
  }
  sockets.forEach(socket => socket.close());
}
