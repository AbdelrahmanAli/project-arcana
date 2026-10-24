export const W = 480, H = 720;
export const RIVER = { top: 273, bottom: 435, x: 240, y: 355 };
export const BANK_BOUNDS = [
  { minY: 458, maxY: 680 },
  { minY: 30, maxY: 252 },
];
export const TOWER_BASE_Y = RIVER.y+19;
export const TOWER_TIMING = { rise: 5.2, deliver: 2.0, lower: 5.4, rest: 4.8 };
export const TOWER_ACTIVE_HEIGHT = .12;
export const GRENADE_ARC_HEIGHT = 235;
export const DEATH_DURATION = 4.4;
const easeLift = t => { const x=Math.max(0,Math.min(1,t)); return x*x*x*(x*(x*6-15)+10); };
export const WEAPONS = {
  pistol: { name: 'SERVICE PISTOL', ammo: Infinity, damage: 5, speed: 540, cooldown: .48, frame: 13, color: 0xffdc80 },
  rifle: { name: 'ASSAULT RIFLE', ammo: 12, damage: 7, speed: 650, cooldown: .15, frame: 8, color: 0xffdd77 },
  shotgun: { name: 'TACTICAL SHOTGUN', ammo: 4, damage: 5, speed: 560, cooldown: .7, frame: 9, color: 0xffae58 },
  grenade: { name: 'GRENADE LAUNCHER', ammo: 3, damage: 26, cooldown: 1.1, frame: 10, color: 0xffb23f },
  missile: { name: 'SMART MISSILE', ammo: 2, damage: 30, speed: 430, cooldown: 1, frame: 11, color: 0xff7548 },
  laser: { name: 'LASER GUN', ammo: 2, damage: 16, cooldown: .75, frame: 12, color: 0xff414c },
};
export const DROP_TYPES = ['rifle', 'shotgun', 'grenade', 'missile', 'laser'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1),0,1);
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
export function towerShieldBounds(tower) {
  const bottom=TOWER_BASE_Y+56,top=TOWER_BASE_Y-54-tower.height*128;
  return {x:RIVER.x,y:(top+bottom)/2,rx:86+tower.height*24,ry:(bottom-top)/2};
}
export function segmentEllipseHit(a,b,ellipse) {
  const sx=(a.x-ellipse.x)/ellipse.rx,sy=(a.y-ellipse.y)/ellipse.ry;
  const dx=(b.x-a.x)/ellipse.rx,dy=(b.y-a.y)/ellipse.ry;
  const c=sx*sx+sy*sy-1;
  if(c<=0)return {x:a.x,y:a.y};
  const aa=dx*dx+dy*dy,bb=2*(sx*dx+sy*dy),discriminant=bb*bb-4*aa*c;
  if(!aa||discriminant<0)return null;
  const fraction=(-bb-Math.sqrt(discriminant))/(2*aa);
  return fraction>=0&&fraction<=1?{x:a.x+(b.x-a.x)*fraction,y:a.y+(b.y-a.y)*fraction}:null;
}
function soldier(id, x, y) {
  return { id,x,y,hp:100,slots:[null,null,null],selected:-1,cooldown:0,charge:0,flash:0,hurt:0,moving:false,walk:0,shots:0,hits:0,deathAge:0 };
}
export class Match {
  constructor(random = Math.random) {
    this.random=random; this.time=0; this.id=0; this.players=[soldier(0,190,569),soldier(1,290,141)];
    this.bullets=[]; this.pickups=[]; this.flames=[]; this.effects=[]; this.beams=[]; this.events=[];
    this.tower={ phase:'rest', progress:0, height:0, shield:false, shieldPulse:0, cycle:-1 };
    this.nextDrop=2.5; this.aiClock=0; this.aiMove={x:0,y:0}; this.aiFire=false; this.aiCharge=0;
    this.finished=false; this.winner=null; this.ending=0; this.launches=0;
  }
  emit(type, data={}) { this.events.push({type,...data}); }
  weapon(p) { return p.slots[p.selected]?.type || 'pistol'; }
  select(p,index) { p.selected = index>=0 && p.slots[index] ? (p.selected===index ? -1:index) : -1; p.charge=0; }
  move(p,x,y,dt) {
    const l=Math.hypot(x,y), scale=l>1?1/l:1;
    p.moving=l>.08;
    p.x=clamp(p.x+x*scale*170*dt,38,W-38);
    p.y=clamp(p.y+y*scale*170*dt,BANK_BOUNDS[p.id].minY,BANK_BOUNDS[p.id].maxY);
    if(p.moving) p.walk+=dt;
  }
  collect(p,item) {
    if(item.owner!==p.id || item.flight>0 || item.ttl<=0 || distance(p,item)>29) return false;
    const slot=p.slots.indexOf(null);
    if(slot<0) return false;
    p.slots[slot]={type:item.type,ammo:WEAPONS[item.type].ammo}; item.ttl=0;
    this.emit('pickup',{player:p.id,weapon:item.type}); return true;
  }
  fire(p,power=0) {
    if(this.finished || p.hp<=0 || p.cooldown>0) return false;
    const type=this.weapon(p), def=WEAPONS[type], enemy=this.players[1-p.id];
    const dir=p.id===0?-1:1;
    p.cooldown=def.cooldown; p.flash=.09; p.shots++; p.charge=0;
    const origin={x:p.x,y:p.y+dir*24};
    if(type==='laser') {
      const end={x:origin.x,y:p.id===0?0:H};
      const shieldHit=this.tower.shield?segmentEllipseHit(origin,end,towerShieldBounds(this.tower)):null;
      const bodyHit=!shieldHit&&this.tower.height>TOWER_ACTIVE_HEIGHT&&Math.abs(origin.x-RIVER.x)<31;
      if(shieldHit)this.hitTower(p.id,shieldHit);
      else if(bodyHit)this.hitTower(p.id);
      else if(segmentDistance(enemy,origin,end)<17){this.damage(enemy,def.damage+Math.round(power*30));p.hits++;}
      this.beams.push({id:this.id++,x:origin.x,y:origin.y,endY:shieldHit?.y??(bodyHit?RIVER.y:end.y),owner:p.id,age:0,life:.34});
    } else if(type==='grenade') {
      this.bullets.push({id:this.id++,owner:p.id,type,x:origin.x,y:origin.y,sx:origin.x,sy:origin.y,tx:enemy.x,ty:enemy.y,t:0,duration:.9,damage:def.damage,color:def.color,life:1.3});
    } else {
      let dx=0,dy=dir;
      if(type==='missile') { const d=Math.hypot(enemy.x-origin.x,enemy.y-origin.y); dx=(enemy.x-origin.x)/d; dy=(enemy.y-origin.y)/d; }
      const offsets=type==='shotgun'?[-.17,-.085,0,.085,.17]:[0];
      for(const off of offsets) {
        this.bullets.push({id:this.id++,owner:p.id,type,x:origin.x,y:origin.y,vx:(dx+off)*def.speed,vy:dy*def.speed,damage:def.damage,color:def.color,life:2.3,travel:0,tx:enemy.x,ty:enemy.y,targetDistance:type==='missile'?Math.hypot(enemy.x-origin.x,enemy.y-origin.y):Infinity});
      }
    }
    if(p.selected>=0) { const slot=p.slots[p.selected]; slot.ammo--; if(slot.ammo<=0){p.slots[p.selected]=null;p.selected=-1;} }
    this.emit('shot',{weapon:type,player:p.id,x:p.x}); return true;
  }
  damage(p,amount,x=p.x,y=p.y) {
    if(p.hp<=0) return;
    p.hp=Math.max(0,p.hp-amount); p.hurt=.13;
    this.effects.push({id:this.id++,type:'blood',x,y,age:0,life:1.1,seed:this.random()});
    this.emit('hit',{player:p.id});
  }
  explode(b) {
    this.effects.push({id:this.id++,type:'explosion',x:b.x,y:b.y,age:0,life:.55,seed:this.random()});
    const enemy=this.players[1-b.owner];
    const radius=b.type==='grenade'?53:37, d=distance(enemy,b);
    if(d<radius){this.damage(enemy,b.damage*(1-.4*d/radius));this.players[b.owner].hits++;}
    this.emit('explosion'); b.life=0;
  }
  hitTower(owner,impact=RIVER) {
    const t=this.tower;
    if(t.phase==='rest'||t.height<=TOWER_ACTIVE_HEIGHT) return false;
    const firstHit=!t.shield;
    t.shield=true;t.shieldPulse=.3;
    if(firstHit) {
      const p=this.players[owner], len=distance(p,RIVER);
      const dx=(p.x-RIVER.x)/len,dy=(p.y-RIVER.y)/len;
      for(const sign of [1,-1]) this.flames.push({id:this.id++,dx:dx*sign,dy:dy*sign,age:0,reach:0,life:3.5});
      this.emit('retaliation');
    }
    this.effects.push({id:this.id++,type:'shieldHit',x:impact.x,y:impact.y,age:0,life:.3,seed:this.random()});
    return true;
  }
  launch() {
    this.launches++;
    for(let owner=0;owner<2;owner++) {
      const sx=RIVER.x+(owner===0?-51:51),sy=RIVER.y-78;
      const bounds=BANK_BOUNDS[owner],margin=20;
      this.pickups.push({id:this.id++,owner,type:DROP_TYPES[Math.floor(this.random()*DROP_TYPES.length)],sx,sy,x:55+this.random()*(W-110),y:bounds.minY+margin+this.random()*(bounds.maxY-bounds.minY-2*margin),flight:.75,ttl:12});
      this.effects.push({id:this.id++,type:'launch',x:sx,y:sy,age:0,life:.32,seed:owner});
    }
    this.emit('launch');
  }
  updateTower(dt) {
    const t=this.tower;
    t.shieldPulse=Math.max(0,t.shieldPulse-dt);
    if(t.phase==='rest' && this.time>=this.nextDrop){t.phase='rise';t.progress=0;t.shield=false;t.cycle++;this.emit('rise');}
    if(t.phase==='rest') return;
    t.progress+=dt;
    if(t.phase==='rise') {t.height=easeLift(t.progress/TOWER_TIMING.rise);if(t.progress>=TOWER_TIMING.rise){t.phase='deliver';t.progress=0;this.launch();}}
    else if(t.phase==='deliver') {if(t.progress>=TOWER_TIMING.deliver){t.phase='lower';t.progress=0;this.emit('lower');}}
    else {
      t.height=1-easeLift(t.progress/TOWER_TIMING.lower);
      if(t.height<=TOWER_ACTIVE_HEIGHT){t.shield=false;t.shieldPulse=0;}
      if(t.progress>=TOWER_TIMING.lower){t.phase='rest';t.height=0;t.shield=false;t.shieldPulse=0;this.nextDrop=this.time+TOWER_TIMING.rest;}
    }
  }
  think(dt) {
    const p=this.players[1],enemy=this.players[0];
    this.aiClock-=dt;
    if(this.aiClock<=0) {
      this.aiClock=.2+this.random()*.12;
      if(p.selected<0){const idx=p.slots.findIndex(Boolean);if(idx>=0)this.select(p,idx);}
      const bank=BANK_BOUNDS[1];
      let tx=enemy.x,ty=(bank.minY+bank.maxY)/2+Math.sin(this.time*.6)*(bank.maxY-bank.minY)*.28;
      const supplies=this.pickups.filter(i=>i.owner===1&&i.flight<=0&&i.ttl>0).sort((a,b)=>distance(a,p)-distance(b,p));
      if(p.slots.includes(null)&&supplies.length){tx=supplies[0].x;ty=supplies[0].y;}
      for(const b of this.bullets) {
        if(b.owner===1)continue;
        if(b.type==='grenade'&&b.t>.45&&Math.hypot(b.tx-p.x,b.ty-p.y)<70){tx=p.x+(p.x>b.tx?85:-85);ty=p.y+28;break;}
        if(b.y>p.y&&b.y-p.y<200&&Math.abs(b.x-p.x)<38){tx=p.x+(p.x>W/2?-100:100);break;}
      }
      for(const f of this.flames){const end={x:RIVER.x+f.dx*650,y:RIVER.y+f.dy*650};if(segmentDistance(p,RIVER,end)<50){tx=p.x+(p.x>RIVER.x?95:-95);}}
      const dx=tx-p.x,dy=ty-p.y,l=Math.hypot(dx,dy);
      this.aiMove=l>10?{x:dx/l,y:dy/l}:{x:0,y:0};
      const type=this.weapon(p);
      this.aiFire=['grenade','missile'].includes(type)||Math.abs(enemy.x-p.x)<(type==='shotgun'?85:29);
    }
    this.move(p,this.aiMove.x,this.aiMove.y,dt);
    if(this.weapon(p)==='laser') {
      if(this.aiFire||p.charge>0){p.charge=Math.min(1,p.charge+dt/1.1);if(p.charge>=1)this.fire(p,1);}
    } else if(this.aiFire) this.fire(p);
  }
  update(dt,input={x:0,y:0,fire:false}) {
    if(this.finished)return;
    dt=Math.min(dt,1/30); this.time+=dt;
    if(this.ending>0){
      this.ending-=dt;
      for(const p of this.players)if(p.hp<=0)p.deathAge+=dt;
      for(const e of this.effects)e.age+=dt;
      this.effects=this.effects.filter(e=>e.age<e.life);
      for(const b of this.beams)b.age+=dt;
      this.beams=this.beams.filter(b=>b.age<b.life);
      if(this.ending<=0){this.finished=true;this.emit('end');}
      return;
    }
    for(const p of this.players){p.cooldown=Math.max(0,p.cooldown-dt);p.flash=Math.max(0,p.flash-dt);p.hurt=Math.max(0,p.hurt-dt);}
    this.updateTower(dt); this.move(this.players[0],input.x||0,input.y||0,dt);
    const p=this.players[0];
    if(input.fire){if(this.weapon(p)==='laser')p.charge=Math.min(1,p.charge+dt/1.1);else this.fire(p);}
    this.think(dt);
    for(const i of this.pickups){if(i.flight>0)i.flight=Math.max(0,i.flight-dt);else{i.ttl-=dt;this.collect(this.players[i.owner],i);}}
    this.pickups=this.pickups.filter(i=>i.ttl>0);
    for(const b of this.bullets){
      if(b.life<=0)continue;
      b.life-=dt;
      const prev={x:b.x,y:b.y};
      if(b.type==='grenade') {
        b.t+=dt;const t=clamp(b.t/b.duration,0,1);b.x=b.sx+(b.tx-b.sx)*t;b.y=b.sy+(b.ty-b.sy)*t;
        // The grenade follows a high ballistic arc above the tower and shield.
        // Its only impact is at the marked landing point.
        if(t>=1)this.explode(b);continue;
      }
      b.prevX=b.x;b.prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.travel+=Math.hypot(b.vx,b.vy)*dt;
      if(b.type==='missile') {
        // Guided payloads fly above the tower and shield, then strike the
        // marked ground position instead of colliding during flight.
        if(b.travel>=b.targetDistance){b.x=b.tx;b.y=b.ty;this.explode(b);}
        continue;
      }
      const shieldHit=this.tower.shield?segmentEllipseHit(prev,b,towerShieldBounds(this.tower)):null;
      if(shieldHit){this.hitTower(b.owner,shieldHit);b.life=0;continue;}
      if(this.tower.height>TOWER_ACTIVE_HEIGHT && segmentDistance(RIVER,prev,b)<31 && this.hitTower(b.owner,b)){b.life=0;continue;}
      const victim=this.players[1-b.owner];
      if(segmentDistance(victim,prev,b)<15){
        this.damage(victim,b.damage);this.players[b.owner].hits++;b.life=0;
      }
      if(b.x<0||b.x>W||b.y<0||b.y>H)b.life=0;
    }
    // Opposing conventional rounds cancel when their swept paths meet.
    const standard=b=>['pistol','rifle','shotgun'].includes(b.type);
    for(let i=0;i<this.bullets.length;i++)for(let j=i+1;j<this.bullets.length;j++){
      const a=this.bullets[i],b=this.bullets[j];
      if(a.life<=0||b.life<=0||a.owner===b.owner||!standard(a)||!standard(b))continue;
      const first={x:(a.prevX??a.x)-(b.prevX??b.x),y:(a.prevY??a.y)-(b.prevY??b.y)};
      const last={x:a.x-b.x,y:a.y-b.y};
      if(segmentDistance({x:0,y:0},first,last)<12){a.life=0;b.life=0;this.effects.push({id:this.id++,type:'spark',x:(a.x+b.x)/2,y:(a.y+b.y)/2,age:0,life:.22,seed:this.random()});}
    }
    this.bullets=this.bullets.filter(b=>b.life>0);
    for(const f of this.flames){
      f.age+=dt;f.reach=Math.min(650,f.reach+700*dt);f.life-=dt;
      const end={x:RIVER.x+f.dx*f.reach,y:RIVER.y+f.dy*f.reach};
      for(const p of this.players){if(segmentDistance(p,RIVER,end)<21){p.hp=Math.max(0,p.hp-16*dt);p.hurt=.05;}}
    }
    this.flames=this.flames.filter(f=>f.life>0);
    for(const e of this.effects)e.age+=dt;
    this.effects=this.effects.filter(e=>e.age<e.life);
    for(const b of this.beams)b.age+=dt;
    this.beams=this.beams.filter(b=>b.age<b.life);
    if(this.players.some(p=>p.hp<=0)){
      this.ending=DEATH_DURATION;
      this.winner=this.players[0].hp<=0?(this.players[1].hp<=0?'draw':1):0;
      for(const p of this.players)if(p.hp<=0)this.effects.push({id:this.id++,type:'death',x:p.x,y:p.y,age:0,life:DEATH_DURATION+1,seed:this.random()});
      this.emit('death');
    }
  }
}
