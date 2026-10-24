export const W = 480, H = 720;
export const RIVER = { top: 273, bottom: 435, x: 240, y: 355 };
export const BANK_BOUNDS = [
  { minY: 458, maxY: 680 },
  { minY: 30, maxY: 252 },
];
export const TOWER_BASE_Y = RIVER.y+19;
export const TOWER_TIMING = { rise: 5.2, deliver: 2.0, lower: 5.4, rest: 4.8 };
export const TOWER_GEOMETRY = {
  shaftHeight: 190,
  shaftBaseY: RIVER.y+35,
  apertureTop: TOWER_BASE_Y-39,
  apertureBottom: RIVER.y+22,
  fireVentOffsetX: 64,
  fireVentY: TOWER_BASE_Y-18,
};
// The head remains visible inside the open hatch after the exposed shaft retracts.
export const TOWER_ACTIVE_HEIGHT = .12;
export const GRENADE_ARC_HEIGHT = 235;
export const BLAST_RADIUS = { grenade: 78, missile: 58, nuclear: 52 };
export const GRENADE_STUN_DURATION = 2.2;
export const WASTE_RADIUS = 24, WASTE_DURATION = 4, WASTE_DAMAGE_PER_SECOND = 6;
export const BARREL_BLAST_RADIUS = 45, BARREL_DAMAGE = 22;
export const FLAME_SPEED = 330;
export const DEATH_DURATION = 4.4;
const easeLift = t => { const x=Math.max(0,Math.min(1,t)); return x*x*x*(x*(x*6-15)+10); };
export const WEAPONS = {
  pistol: { name: 'SERVICE PISTOL', ammo: Infinity, damage: 5, speed: 540, cooldown: .48, frame: 13, color: 0xffdc80 },
  rifle: { name: 'ASSAULT RIFLE', ammo: 12, damage: 7, speed: 650, cooldown: .15, frame: 8, color: 0xffdd77 },
  shotgun: { name: 'TACTICAL SHOTGUN', ammo: 4, damage: 5, speed: 560, cooldown: .7, frame: 9, color: 0xffae58 },
  grenade: { name: 'STUN LAUNCHER', ammo: 3, damage: 8, cooldown: 1.1, frame: 10, color: 0x59bbff },
  missile: { name: 'SMART MISSILE', ammo: 2, damage: 30, speed: 430, cooldown: 1, frame: 11, color: 0xff7548 },
  laser: { name: 'LASER GUN', ammo: 2, damage: 16, cooldown: .75, frame: 12, color: 0xff414c },
  nuclear: { name: 'NUCLEAR LAUNCHER', ammo: 2, damage: 10, cooldown: 1.4, color: 0x9bf53d },
};
export const DROP_TYPES = ['rifle', 'shotgun', 'grenade', 'missile', 'laser', 'nuclear'];
const clamp = (n, a, b) => Math.max(a, Math.min(b, n));
export const distance = (a, b) => Math.hypot(a.x - b.x, a.y - b.y);
function flameReach(x,y,dx,dy) {
  const horizontal=dx>0?(W-x)/dx:dx<0?-x/dx:Infinity;
  const vertical=dy>0?(H-y)/dy:dy<0?-y/dy:Infinity;
  return Math.min(900,horizontal,vertical);
}
export function segmentDistance(p, a, b) {
  const dx = b.x - a.x, dy = b.y - a.y;
  const t = clamp(((p.x-a.x)*dx+(p.y-a.y)*dy)/(dx*dx+dy*dy || 1),0,1);
  return Math.hypot(p.x-a.x-dx*t,p.y-a.y-dy*t);
}
export function towerShieldBounds(tower) {
  const bottom=TOWER_BASE_Y+56,top=TOWER_BASE_Y-54-tower.height*128;
  return {x:RIVER.x,y:(top+bottom)/2,rx:86+tower.height*24,ry:(bottom-top)/2};
}
export function towerBodyBounds(tower) {
  const top=TOWER_GEOMETRY.shaftBaseY-TOWER_GEOMETRY.shaftHeight*tower.height;
  const bottom=TOWER_GEOMETRY.apertureTop;
  return top<bottom?{left:RIVER.x-27,right:RIVER.x+27,top,bottom}:null;
}
export function towerArmExtension(tower) {
  const fraction=tower.phase==='deliver'
    ? clamp((TOWER_TIMING.deliver-.35-tower.progress)/.75,0,1)
    : tower.phase==='rise'?clamp((tower.height-.57)/.28,0,1):0;
  return fraction*fraction*(3-2*fraction);
}
export function towerArmBounds(tower) {
  const extension=towerArmExtension(tower),body=towerBodyBounds(tower);
  if(!body||extension<=.05)return [];
  const reach=28+61*extension,top=body.top+68,bottom=Math.min(body.bottom,body.top+108);
  if(top>=bottom)return [];
  return [
    {left:RIVER.x-reach,right:RIVER.x-24,top,bottom},
    {left:RIVER.x+24,right:RIVER.x+reach,top,bottom},
  ];
}
export function segmentRectHit(a,b,r) {
  if(!r)return null;
  const dx=b.x-a.x,dy=b.y-a.y;
  let enter=0,exit=1;
  for(const [p,q] of [[-dx,a.x-r.left],[dx,r.right-a.x],[-dy,a.y-r.top],[dy,r.bottom-a.y]]) {
    if(Math.abs(p)<1e-9){if(q<0)return null;continue;}
    const t=q/p;
    if(p<0)enter=Math.max(enter,t);else exit=Math.min(exit,t);
    if(enter>exit)return null;
  }
  return {x:a.x+dx*enter,y:a.y+dy*enter};
}
export function segmentTowerHit(a,b,tower) {
  const hits=[towerBodyBounds(tower),...towerArmBounds(tower)]
    .map(bounds=>segmentRectHit(a,b,bounds)).filter(Boolean);
  if(!hits.length)return null;
  return hits.reduce((nearest,hit)=>distance(a,hit)<distance(a,nearest)?hit:nearest);
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
  return { id,x,y,hp:100,stun:0,radiated:0,slots:[null,null,null],selected:-1,cooldown:0,charge:0,flash:0,hurt:0,moving:false,walk:0,shots:0,hits:0,deathAge:0 };
}
const OBSTACLE_HALF={crate:{x:22,y:20},barrel:{x:17,y:20}};
export function obstacleBounds(o){const half=OBSTACLE_HALF[o.type];return {left:o.x-half.x,right:o.x+half.x,top:o.y-half.y,bottom:o.y+half.y};}
function blocksFighter(o,x,y){
  if(o.destroyed)return false;
  const b=obstacleBounds(o),nearX=clamp(x,b.left,b.right),nearY=clamp(y,b.top,b.bottom);
  return Math.hypot(x-nearX,y-nearY)<15;
}
export class Match {
  constructor(random = Math.random) {
    this.random=random; this.time=0; this.id=0; this.players=[soldier(0,190,569),soldier(1,290,141)];
    this.bullets=[]; this.pickups=[]; this.flames=[]; this.effects=[]; this.beams=[]; this.events=[]; this.marks=[]; this.marksRevision=0;this.waste=[];
    this.obstacles=this.makeObstacles();
    this.tower={ phase:'rest', progress:0, height:0, shield:false, shieldPulse:0, cycle:-1 };
    this.nextDrop=2.5; this.aiClock=0; this.aiMove={x:0,y:0}; this.aiFire=false; this.aiCharge=0;
    this.finished=false; this.winner=null; this.ending=0; this.launches=0;
  }
  emit(type, data={}) { this.events.push({type,...data}); }
  makeObstacles(){
    const crateLeft=this.random()<.5,left=95+this.random()*58,right=327+this.random()*58;
    const near=500+this.random()*30,far=609+this.random()*28;
    const south=[{type:crateLeft?'crate':'barrel',x:left,y:near},{type:crateLeft?'barrel':'crate',x:right,y:far}];
    return [...south.map(o=>({...o,id:this.id++,owner:0,destroyed:false,flash:0})),
      ...south.map(o=>({...o,id:this.id++,owner:1,x:W-o.x,y:2*RIVER.y-o.y,destroyed:false,flash:0}))];
  }
  nearestObstacleHit(a,b){
    let nearest=null;
    for(const obstacle of this.obstacles){
      if(obstacle.destroyed)continue;
      const hit=segmentRectHit(a,b,obstacleBounds(obstacle));
      if(hit&&(!nearest||distance(a,hit)<distance(a,nearest.hit)))nearest={obstacle,hit};
    }
    return nearest;
  }
  damageAreaObjects(x,y,radius){
    for(const obstacle of this.obstacles)if(!obstacle.destroyed&&Math.hypot(obstacle.x-x,obstacle.y-y)<radius+Math.min(OBSTACLE_HALF[obstacle.type].x,OBSTACLE_HALF[obstacle.type].y))this.destroyObstacle(obstacle);
  }
  destroyObstacle(obstacle){
    if(obstacle.destroyed)return false;
    obstacle.destroyed=true;obstacle.flash=.15;
    if(obstacle.type==='crate'){
      this.effects.push({id:this.id++,type:'crateBreak',x:obstacle.x,y:obstacle.y,age:0,life:.45,seed:this.random()});
      this.emit('crateBreak',{x:obstacle.x});
    }else{
      this.effects.push({id:this.id++,type:'barrelBlast',x:obstacle.x,y:obstacle.y,age:0,life:.6,seed:this.random()});
      this.effects.push({id:this.id++,type:'smoke',x:obstacle.x,y:obstacle.y,age:0,life:2,seed:this.random()});
      this.mark('scorch',obstacle.x,obstacle.y,1.15);
      for(const player of this.players){
        const d=Math.hypot(player.x-obstacle.x,player.y-obstacle.y);
        if(d<BARREL_BLAST_RADIUS)this.damage(player,BARREL_DAMAGE*(1-.4*d/BARREL_BLAST_RADIUS),obstacle.x,obstacle.y);
      }
      this.emit('barrelBlast',{x:obstacle.x});
      this.damageAreaObjects(obstacle.x,obstacle.y,BARREL_BLAST_RADIUS);
    }
    return true;
  }
  mark(type,x,y,size=1) {
    if(y>=RIVER.top&&y<=RIVER.bottom)return;
    this.marks.push({type,x,y,size,seed:this.random()});
    if(this.marks.length>140)this.marks.shift();
    this.marksRevision++;
  }
  weapon(p) { return p.slots[p.selected]?.type || 'pistol'; }
  select(p,index) { p.selected = index>=0 && p.slots[index] ? (p.selected===index ? -1:index) : -1; p.charge=0; }
  move(p,x,y,dt) {
    if(p.stun>0){p.moving=false;return;}
    const l=Math.hypot(x,y), scale=l>1?1/l:1;
    p.moving=l>.08;
    const nextX=clamp(p.x+x*scale*170*dt,38,W-38);
    if(!this.obstacles.some(o=>blocksFighter(o,nextX,p.y)))p.x=nextX;
    const nextY=clamp(p.y+y*scale*170*dt,BANK_BOUNDS[p.id].minY,BANK_BOUNDS[p.id].maxY);
    if(!this.obstacles.some(o=>blocksFighter(o,p.x,nextY)))p.y=nextY;
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
    if(this.finished || this.ending>0 || p.hp<=0 || p.stun>0 || p.cooldown>0) return false;
    const type=this.weapon(p), def=WEAPONS[type], enemy=this.players[1-p.id];
    const dir=p.id===0?-1:1;
    p.cooldown=def.cooldown; p.flash=.09; p.shots++; p.charge=0;
    const origin={x:p.x,y:p.y+dir*24};
    if(type==='laser') {
      const end={x:origin.x,y:p.id===0?0:H};
      const shieldHit=this.tower.shield?segmentEllipseHit(origin,end,towerShieldBounds(this.tower)):null;
      const bodyHit=!shieldHit?segmentTowerHit(origin,end,this.tower):null;
      const obstacleHit=this.nearestObstacleHit(origin,end);
      const victimHit=enemy.hp>0?segmentRectHit(origin,end,{left:enemy.x-16,right:enemy.x+16,top:enemy.y-16,bottom:enemy.y+16}):null;
      const hits=[shieldHit&&{kind:'tower',hit:shieldHit},bodyHit&&{kind:'tower',hit:bodyHit},obstacleHit&&{kind:'obstacle',hit:obstacleHit.hit,obstacle:obstacleHit.obstacle},victimHit&&{kind:'player',hit:victimHit}].filter(Boolean);
      const first=hits.reduce((nearest,hit)=>!nearest||distance(origin,hit.hit)<distance(origin,nearest.hit)?hit:nearest,null);
      if(first?.kind==='tower')this.hitTower(p.id,first.hit);
      else if(first?.kind==='obstacle')this.destroyObstacle(first.obstacle);
      else if(first?.kind==='player'){this.damage(enemy,def.damage+Math.round(power*30));p.hits++;}
      this.beams.push({id:this.id++,x:origin.x,y:origin.y,endY:first?.hit.y??end.y,owner:p.id,age:0,life:.34});
    } else if(type==='grenade'||type==='nuclear') {
      this.bullets.push({id:this.id++,owner:p.id,type,x:origin.x,y:origin.y,sx:origin.x,sy:origin.y,tx:enemy.x,ty:enemy.y,t:0,duration:type==='nuclear'?1:.9,damage:def.damage,color:def.color,life:1.4});
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
    this.mark('blood',x,y+18,.6+this.random()*.5);
    this.emit('hit',{player:p.id});
  }
  explode(b) {
    const stunGrenade=b.type==='grenade',nuclear=b.type==='nuclear';
    const effect=nuclear?'nuclearBlast':stunGrenade?'stunBlast':'explosion';
    this.effects.push({id:this.id++,type:effect,x:b.x,y:b.y,age:0,life:nuclear?.7:stunGrenade?.65:.55,seed:this.random()});
    this.effects.push({id:this.id++,type:'smoke',x:b.x,y:b.y,age:0,life:nuclear?1.5:stunGrenade?1.2:2.4,seed:this.random()});
    this.mark('scorch',b.x,b.y,nuclear?.8:stunGrenade?.6:1.3);
    const radius=BLAST_RADIUS[b.type];
    this.damageAreaObjects(b.x,b.y,radius);
    const targets=nuclear?this.players:[this.players[1-b.owner]];
    for(const target of targets){
      const d=distance(target,b);
      if(d>=radius)continue;
      this.damage(target,b.damage*(1-.4*d/radius));if(target.id!==b.owner)this.players[b.owner].hits++;
      if(stunGrenade&&target.hp>0){target.stun=Math.max(target.stun,GRENADE_STUN_DURATION);target.charge=0;target.moving=false;this.emit('stun',{player:target.id});}
    }
    if(nuclear)this.waste.push({id:this.id++,x:b.x,y:b.y,age:0,life:WASTE_DURATION});
    this.emit(effect,{x:b.x}); b.life=0;
  }
  hitTower(owner,impact=RIVER) {
    const t=this.tower;
    if(t.phase==='rest'||t.height<=TOWER_ACTIVE_HEIGHT) return false;
    const firstHit=!t.shield;
    t.shield=true;t.shieldPulse=.3;
    if(firstHit) {
      this.effects.push({id:this.id++,type:'towerImpact',x:impact.x,y:impact.y,age:0,life:.48,seed:this.random()});
      const p=this.players[owner],muzzleY=TOWER_GEOMETRY.fireVentY;
      const len=Math.max(1,Math.hypot(p.x-RIVER.x,p.y-muzzleY));
      const dx=(p.x-RIVER.x)/len,dy=(p.y-muzzleY)/len;
      for(const sign of [1,-1]) {
        const x=RIVER.x+sign*TOWER_GEOMETRY.fireVentOffsetX,y=muzzleY,fx=dx*sign,fy=dy*sign;
        this.flames.push({id:this.id++,x,y,dx:fx,dy:fy,age:0,reach:0,maxReach:flameReach(x,y,fx,fy),endAge:null,marked:0,life:4.2});
      }
      this.emit('towerImpact',{x:impact.x});
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
      const type=DROP_TYPES[Math.floor(this.random()*DROP_TYPES.length)];
      let x,y,clear=false;
      for(let attempt=0;attempt<16;attempt++){
        x=55+this.random()*(W-110);y=bounds.minY+margin+this.random()*(bounds.maxY-bounds.minY-2*margin);
        clear=!this.obstacles.some(o=>!o.destroyed&&Math.hypot(x-o.x,y-o.y)<57);
        if(clear)break;
      }
      if(!clear){
        const safe=[{x:240,y:bounds.minY+margin+15},{x:240,y:bounds.maxY-margin-15},{x:W/2,y:(bounds.minY+bounds.maxY)/2}];
        ({x,y}=safe.find(point=>!this.obstacles.some(o=>!o.destroyed&&distance(point,o)<57))||safe[0]);
      }
      this.pickups.push({id:this.id++,owner,type,sx,sy,x,y,flight:.75,ttl:12});
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
    if(p.stun>0){p.moving=false;p.charge=0;return;}
    this.aiClock-=dt;
    if(this.aiClock<=0) {
      this.aiClock=.2+this.random()*.12;
      if(p.selected<0){const idx=p.slots.findIndex(Boolean);if(idx>=0)this.select(p,idx);}
      const bank=BANK_BOUNDS[1];
      let tx=enemy.x,ty=(bank.minY+bank.maxY)/2+Math.sin(this.time*.6)*(bank.maxY-bank.minY)*.28;
      const supplies=this.pickups.filter(i=>i.owner===1&&i.flight<=0&&i.ttl>0).sort((a,b)=>distance(a,p)-distance(b,p));
      if(p.slots.includes(null)&&supplies.length){tx=supplies[0].x;ty=supplies[0].y;}
      for(const obstacle of this.obstacles){
        if(obstacle.owner!==1||obstacle.destroyed||distance(p,obstacle)>170)continue;
        if(segmentDistance(obstacle,p,{x:tx,y:ty})<39){
          const upper=obstacle.y-44,lower=obstacle.y+44;
          ty=upper>=bank.minY+16&&(p.y<obstacle.y||lower>bank.maxY-16)?upper:lower;
          tx=obstacle.x+(p.x<obstacle.x?-42:42);
          break;
        }
      }
      for(const b of this.bullets) {
        if(b.owner===1)continue;
        if((b.type==='grenade'||b.type==='nuclear')&&b.t>.45&&Math.hypot(b.tx-p.x,b.ty-p.y)<BLAST_RADIUS[b.type]+18){tx=p.x+(p.x>b.tx?105:-105);ty=p.y+28;break;}
        if(b.y>p.y&&b.y-p.y<200&&Math.abs(b.x-p.x)<38){tx=p.x+(p.x>W/2?-100:100);break;}
      }
      for(const waste of this.waste)if(Math.hypot(waste.x-p.x,waste.y-p.y)<WASTE_RADIUS+25){tx=p.x+(p.x>waste.x?85:-85);ty=p.y+(p.y>waste.y?45:-45);break;}
      for(const f of this.flames){const end={x:f.x+f.dx*f.maxReach,y:f.y+f.dy*f.maxReach};if(segmentDistance(p,f,end)<50){tx=p.x+(p.x>RIVER.x?95:-95);}}
      const dx=tx-p.x,dy=ty-p.y,l=Math.hypot(dx,dy);
      this.aiMove=l>10?{x:dx/l,y:dy/l}:{x:0,y:0};
      const type=this.weapon(p);
      this.aiFire=['grenade','missile','nuclear'].includes(type)||Math.abs(enemy.x-p.x)<(type==='shotgun'?85:29);
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
      for(const waste of this.waste)waste.age+=dt;
      this.waste=this.waste.filter(w=>w.age<w.life);
      for(const p of this.players)if(p.hp<=0)p.deathAge+=dt;
      for(const f of this.flames){f.age+=dt;f.life-=dt;}
      this.flames=this.flames.filter(f=>f.life>0);
      for(const e of this.effects)e.age+=dt;
      this.effects=this.effects.filter(e=>e.age<e.life);
      for(const b of this.beams)b.age+=dt;
      this.beams=this.beams.filter(b=>b.age<b.life);
      if(this.ending<=0){this.finished=true;this.emit('end');}
      return;
    }
    for(const p of this.players){p.cooldown=Math.max(0,p.cooldown-dt);p.flash=Math.max(0,p.flash-dt);p.hurt=Math.max(0,p.hurt-dt);p.stun=Math.max(0,p.stun-dt);p.radiated=Math.max(0,p.radiated-dt);}
    for(const obstacle of this.obstacles)obstacle.flash=Math.max(0,obstacle.flash-dt);
    this.updateTower(dt); this.move(this.players[0],input.x||0,input.y||0,dt);
    const p=this.players[0];
    if(input.fire&&p.stun<=0){if(this.weapon(p)==='laser')p.charge=Math.min(1,p.charge+dt/1.1);else this.fire(p);}
    this.think(dt);
    for(const i of this.pickups){
      if(i.flight>0){
        i.flight=Math.max(0,i.flight-dt);
        if(i.flight===0){
          this.effects.push({id:this.id++,type:'landing',x:i.x,y:i.y,age:0,life:.42,seed:this.random()});
          this.emit('landing',{x:i.x});
        }
      }else{i.ttl-=dt;this.collect(this.players[i.owner],i);}
    }
    this.pickups=this.pickups.filter(i=>i.ttl>0);
    for(const b of this.bullets){
      if(b.life<=0)continue;
      b.life-=dt;
      const prev={x:b.x,y:b.y};
      if(b.type==='grenade'||b.type==='nuclear') {
        b.t+=dt;const t=clamp(b.t/b.duration,0,1);b.x=b.sx+(b.tx-b.sx)*t;b.y=b.sy+(b.ty-b.sy)*t;
        // Grenades follow a high ballistic arc above the tower and shield.
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
      const bodyHit=segmentTowerHit(prev,b,this.tower);
      const obstacleHit=this.nearestObstacleHit(prev,b);
      const towerHit=shieldHit||bodyHit;
      if(obstacleHit&&(!towerHit||distance(prev,obstacleHit.hit)<=distance(prev,towerHit))){this.destroyObstacle(obstacleHit.obstacle);b.life=0;continue;}
      if(shieldHit){this.hitTower(b.owner,shieldHit);b.life=0;continue;}
      if(bodyHit&&this.hitTower(b.owner,bodyHit)){b.life=0;continue;}
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
    for(const b of this.bullets){
      if(b.life<=0||!standard(b))continue;
      const victim=this.players[1-b.owner];
      if(segmentDistance(victim,{x:b.prevX,y:b.prevY},b)<15){
        this.damage(victim,b.damage);this.players[b.owner].hits++;b.life=0;
      }
    }
    this.bullets=this.bullets.filter(b=>b.life>0);
    for(const waste of this.waste){
      waste.age+=dt;
      for(const player of this.players)if(player.hp>0&&Math.hypot(player.x-waste.x,player.y-waste.y)<WASTE_RADIUS){
        player.hp=Math.max(0,player.hp-WASTE_DAMAGE_PER_SECOND*dt);player.radiated=.14;
      }
    }
    this.waste=this.waste.filter(w=>w.age<w.life);
    for(const f of this.flames){
      f.age+=dt;f.reach=Math.min(f.maxReach,f.reach+FLAME_SPEED*dt);f.life-=dt;
      if(f.endAge===null&&f.reach>=f.maxReach)f.endAge=f.age;
      const end={x:f.x+f.dx*f.reach,y:f.y+f.dy*f.reach};
      for(const obstacle of this.obstacles)if(!obstacle.destroyed&&segmentDistance(obstacle,f,end)<OBSTACLE_HALF[obstacle.type].x+8)this.destroyObstacle(obstacle);
      for(const p of this.players){if(segmentDistance(p,f,end)<21){p.hp=Math.max(0,p.hp-16*dt);p.hurt=.05;}}
      while(f.marked+70<f.reach){
        f.marked+=70;
        const x=f.x+f.dx*f.marked,y=f.y+f.dy*f.marked;
        if(y<RIVER.top||y>RIVER.bottom){
          this.mark('scorch',x,y,.65);
          this.effects.push({id:this.id++,type:'smoke',x,y,age:0,life:1.8,seed:this.random()});
        }
      }
      if(f.life<=0)for(const d of [230,340,450]){
        const x=f.x+f.dx*Math.min(d,f.maxReach),y=f.y+f.dy*Math.min(d,f.maxReach);
        if(y<RIVER.top||y>RIVER.bottom)this.effects.push({id:this.id++,type:'smoke',x,y,age:0,life:2.1,seed:this.random()});
      }
    }
    this.flames=this.flames.filter(f=>f.life>0);
    for(const e of this.effects)e.age+=dt;
    this.effects=this.effects.filter(e=>e.age<e.life);
    for(const b of this.beams)b.age+=dt;
    this.beams=this.beams.filter(b=>b.age<b.life);
    if(this.players.some(p=>p.hp<=0)){
      this.ending=DEATH_DURATION;
      this.winner=this.players[0].hp<=0?(this.players[1].hp<=0?'draw':1):0;
      this.bullets=[];
      for(const f of this.flames){f.endAge=f.age;f.life=Math.min(f.life,.7);}
      for(const p of this.players)if(p.hp<=0)this.effects.push({id:this.id++,type:'death',x:p.x,y:p.y,age:0,life:DEATH_DURATION+1,seed:this.random()});
      for(const p of this.players)if(p.hp<=0)this.mark('blood',p.x,p.y+20,1.5);
      this.emit('death');
    }
  }
}
