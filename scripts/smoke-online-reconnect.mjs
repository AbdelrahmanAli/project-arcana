import assert from 'node:assert/strict';
const origin=process.env.DIVISION_SERVER_URL||'http://127.0.0.1:8787';
const post=async(path,body)=>{const r=await fetch(origin+path,{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});assert.ok(r.ok);return r.json();};
function connect(id,token){
 const socket=new WebSocket(`${origin.replace(/^http/,'ws')}/api/rooms/${id}/connect?token=${token}`),packets=[];
 socket.addEventListener('message',e=>packets.push(JSON.parse(e.data)));
 const ready=new Promise((resolve,reject)=>{socket.addEventListener('open',resolve);socket.addEventListener('error',reject);});
 return {socket,ready,wait:async predicate=>{const end=Date.now()+15000;while(Date.now()<end){const p=packets.find(predicate);if(p)return p;await new Promise(r=>setTimeout(r,25));}throw new Error('Timed out waiting for reconnect state');}};
}
const room=await post('/api/rooms',{format:'1v1',mode:'random',map:'riverside'});
const a=await post(`/api/rooms/${room.id}/join`,{characterId:'elias'}),b=await post(`/api/rooms/${room.id}/join`,{characterId:'dorian'});
const host=connect(room.id,a.token),guest=connect(room.id,b.token);let resumed;
try{
 await Promise.all([host.ready,guest.ready]);
 host.socket.send(JSON.stringify({type:'input',input:{x:1,pistol:true}}));
 const active=await host.wait(p=>p.type==='state'&&p.state.time>.15&&p.state.players[0].shots>0);
 host.socket.close();await guest.wait(p=>p.type==='status'&&p.started&&!p.seats[0].connected);
 resumed=connect(room.id,a.token);await resumed.ready;
 const first=await resumed.wait(p=>p.type==='state'&&p.frame>=active.frame);
 const later=await resumed.wait(p=>p.type==='state'&&p.state.time>first.state.time+.65);
 assert.equal(later.state.players[0].shots,first.state.players[0].shots);
 assert.equal(later.state.players[0].x,first.state.players[0].x);
 console.log('Reconnect cleared held movement and fire; no input was replayed.');
}finally{host.socket.close();guest.socket.close();resumed?.socket.close();}
