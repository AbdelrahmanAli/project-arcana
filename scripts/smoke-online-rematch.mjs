// Run against `pnpm online:dev` to verify a complete server-owned rematch.
const origin = process.env.DIVISION_SERVER_URL || 'http://127.0.0.1:8787';
const post = async (path, body) => {
  const response = await fetch(`${origin}${path}`, {
    method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body),
  });
  const data = await response.json();
  if (!response.ok) throw new Error(`${response.status}: ${JSON.stringify(data)}`);
  return data;
};
function connect(roomId, token) {
  const socket = new WebSocket(`${origin.replace(/^http/, 'ws')}/api/rooms/${roomId}/connect?token=${token}`);
  const packets = [], waiters = [];
  socket.addEventListener('message', event => {
    const packet = JSON.parse(event.data); packets.push(packet);
    for (const waiter of [...waiters]) if (waiter.predicate(packet)) {
      clearTimeout(waiter.timer); waiters.splice(waiters.indexOf(waiter), 1); waiter.resolve(packet);
    }
  });
  const ready = new Promise((resolve, reject) => {
    socket.addEventListener('open', resolve, { once: true });
    socket.addEventListener('error', reject, { once: true });
  });
  const wait = (predicate, timeoutMs = 15000) => {
    const existing = packets.find(predicate);
    if (existing) return Promise.resolve(existing);
    return new Promise((resolve, reject) => {
      const waiter = { predicate, resolve, timer: setTimeout(() => {
        waiters.splice(waiters.indexOf(waiter), 1);
        reject(new Error(`Timed out waiting for packet; last ${JSON.stringify(packets.at(-1))?.slice(0, 400)}`));
      }, timeoutMs) };
      waiters.push(waiter);
    });
  };
  return { socket, ready, packets, wait, send: packet => socket.send(JSON.stringify(packet)) };
}

const room = await post('/api/rooms', { format: '1v1', mode: 'random', map: 'riverside' });
const hostSeat = await post(`/api/rooms/${room.id}/join`, { characterId: 'elias' });
const guestSeat = await post(`/api/rooms/${room.id}/join`, { characterId: 'dorian' });
const host = connect(room.id, hostSeat.token), guest = connect(room.id, guestSeat.token);
try {
  await Promise.all([host.ready, guest.ready]);
  host.socket.addEventListener('message', event => {
    const packet = JSON.parse(event.data);
    if (packet.type !== 'state' || packet.state.finished) return;
    const [player, opponent] = packet.state.players;
    host.send({ type: 'input', input: {
      x: Math.abs(player.x - opponent.x) > 6 ? Math.sign(opponent.x - player.x) : 0,
      y: player.y > 630 ? -1 : 0,
      pistol: true,
    } });
  });
  guest.send({ type: 'input', input: { x: 0, y: 0, pistol: false } });
  const ended = await host.wait(packet => packet.type === 'state' && packet.state.finished, 90000);
  const oldFrame = ended.frame;
  await guest.wait(packet => packet.type === 'state' && packet.state.finished, 10000);

  guest.send({ type: 'rematch' });
  const voted = await host.wait(packet => packet.type === 'status' && packet.rematchVotes?.[1]);
  if (!voted.finished || voted.rematchVotes[0]) throw new Error('One vote restarted the match');
  host.send({ type: 'rematch' });
  const fresh = await host.wait(packet => packet.type === 'state' && packet.frame > oldFrame &&
    !packet.state.finished && packet.state.time === 0);
  await guest.wait(packet => packet.type === 'state' && packet.frame === fresh.frame, 10000);
  if (fresh.state.players.some(player => player.hp !== 100)) throw new Error('Rematch did not reset fighter health');
  console.log(`Online rematch passed: round ended at frame ${oldFrame}, both votes started frame ${fresh.frame}`);
} finally {
  host.socket.close(); guest.socket.close();
}
