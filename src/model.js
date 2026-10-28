import { CHARACTER_BY_ID, resolveLineup } from './characters.js';
import { W, H, RIVER } from './arena-geometry.js';
import { ashCloudVisuals } from './phase5-visuals.js';

export { W, H, RIVER };
export const BANK_BOUNDS = [
  { minY: 590, maxY: 870 },
  { minY: 70, maxY: 350 },
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
export const BLAST_RADIUS = { grenade: 60, missile: 58, nuclear: 52 };
export const GRENADE_STUN_DURATION = 2.2;
export const DODGE_DURATION = .46, DODGE_DISTANCE = 112, DODGE_COOLDOWN = 1;
export const LASER_CHARGE_TIME = 1.1, LASER_BONUS_DAMAGE = 30;
export const WASTE_RADIUS = 24, WASTE_DAMAGE_PER_SECOND = 5;
export const BARREL_BLAST_RADIUS = 65, BARREL_DAMAGE = 22;
export const FLAME_SPEED = 330, FLAME_DAMAGE_PER_SECOND = 20;
export const TOWER_VOLLEY = { riseAt:2.45, lowerAt:1.45, warning:.5, lightningSpeed:620, lightningWidth:22, lightningDamage:14, icicleSpeed:440, icicleWidth:20, icicleDamage:10 };
export const DEATH_DURATION = 4.4;
const easeLift = t => { const x=Math.max(0,Math.min(1,t)); return x*x*x*(x*(x*6-15)+10); };
export const WEAPONS = {
  pistol: { name: 'SERVICE PISTOL', ammo: Infinity, damage: 5, speed: 540, cooldown: .48, frame: 13, color: 0xffdc80 },
  rifle: { name: 'ASSAULT RIFLE', ammo: 10, damage: 6, speed: 650, cooldown: .18, frame: 8, color: 0xffdd77 },
  shotgun: { name: 'TACTICAL SHOTGUN', ammo: 4, damage: 7, speed: 560, cooldown: .8, frame: 9, color: 0xffae58 },
  grenade: { name: 'STUN LAUNCHER', ammo: 2, damage: 7, cooldown: 1.1, frame: 10, color: 0x59bbff },
  missile: { name: 'SMART MISSILE', ammo: 2, damage: 28, speed: 430, cooldown: 1, frame: 11, color: 0xff7548 },
  laser: { name: 'LASER GUN', ammo: 1, damage: 16, cooldown: .75, frame: 12, color: 0xff414c },
  nuclear: { name: 'NUCLEAR LAUNCHER', ammo: 2, damage: 16, cooldown: 1.4, color: 0x9bf53d },
};
export const DROP_TYPES = ['rifle', 'shotgun', 'grenade', 'missile', 'laser', 'nuclear'];
export const GAME_MODES = { RANDOM:'random', RANDOM_SAME:'random-same', RANDOM_FIXED:'random-fixed', CHOOSE_FIXED:'choose-fixed' };
export const MAPS = { RIVERSIDE:'riverside', STORM:'storm', MAGMA:'magma', DESERT:'desert', SNOW:'snow' };
export const MAP_TYPES = Object.values(MAPS);
export const HAZARD_RULES = { mudSlow:.55, lightningDamage:18, tornadoDamage:10, tornadoPullRadius:118, tornadoPullMin:.62, tornadoPullMax:1.05, rockDamage:16, volcanicFireDps:12, burningRockDps:10, burningRockRadius:40, burningRockDuration:3.5, rockCoolingDuration:.9 };
export const PHASE6_RULES = { eagleDamage:11, eagleWarning:1.25, eagleRadius:29, quicksandSlow:.52, quicksandPull:.38, quicksandRadius:50, scorpionDamage:8, scorpionSlow:1, scorpionStagger:.32, scorpionWindup:.34, avalancheDamage:14, hailDamage:4, hailFlinch:.22, iceSlip:.85 };
export const AVALANCHE = { warning:1.5, life:4.4, edge:100, halfWidth:205, hitDepth:48, pushSpeed:255 };
export const HAIL_CLUSTER = { radius:33, impactRadius:17, stagger:.11, fall:.58, cloudDuration:9.6, cloudGap:1.2, entry:165, offsets:[[-16,-4],[0,5],[16,-3]] };
export const EAGLE_FLIGHT = { approach:.85, dive:PHASE6_RULES.eagleWarning, recover:.55, retreat:1.3 };
export const SANDSTORM_WAVE_GAP = 150;
export function sandstormCovers(storm,y){
  return !!storm&&(Math.abs(y-storm.y)<115||Math.abs(y-(storm.y-storm.direction*SANDSTORM_WAVE_GAP))<115);
}
export const LIGHTNING_WAVE_DELAY = .55;
export const HEAL_AMOUNT = 20, PICKUP_LIFETIME = 12;
export const TOWER_HEAL_CHANCE = .08;
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
function soldier(id, x, y, team, characterId, controller) {
  return { id,x,y,bank:team,team,characterId,controller,hp:100,stun:0,radiated:0,burning:0,scorpionSlow:0,iceSlip:0,iceSpray:0,iceVX:0,iceVY:0,iceEntryX:0,iceEntryY:0,lastMoveX:0,lastMoveY:0,onIce:false,slot:null,pistolCooldown:0,specialCooldown:0,dodgeTime:0,dodgeCooldown:0,dodgeX:0,dodgeY:0,dodgeDir:0,charge:0,flash:0,hurt:0,moving:false,walk:0,shots:0,hits:0,deathAge:0,hazardDamage:0,hazardPopupClock:0 };
}
const OBSTACLE_HALF={crate:{x:16,y:13},barrel:{x:12,y:20},rock:{x:18,y:14}};
export function obstacleBounds(o){const half=OBSTACLE_HALF[o.type];return {left:o.x-half.x,right:o.x+half.x,top:o.y-half.y,bottom:o.y+half.y};}
function blocksFighter(o,x,y){
  if(o.destroyed||o.type==='barrel')return false;
  if(o.type==='rock')return Math.hypot(x-clamp(x,o.x-18,o.x+18),y-clamp(y,o.y-10,o.y+14))<11;
  // Crates are solid cover; barrels can be walked past while still blocking shots.
  const nearX=clamp(x,o.x-14,o.x+14),nearY=clamp(y,o.y+6,o.y+16);
  return Math.hypot(x-nearX,y-nearY)<11;
}
function pathClear(a,b,crates){
  const steps=Math.max(1,Math.ceil(distance(a,b)/7));
  for(let i=0;i<=steps;i++){
    const t=i/steps,x=a.x+(b.x-a.x)*t,y=a.y+(b.y-a.y)*t;
    if(crates.some(crate=>blocksFighter(crate,x,y)))return false;
  }
  return true;
}
function escapeLane(p,source,dx,dy,reach,bank){
  const end={x:source.x+dx*reach,y:source.y+dy*reach};
  let best=null,bestScore=-Infinity;
  for(const side of [-1,1]){
    const point={x:clamp(p.x+side*dy*110,38,W-38),y:clamp(p.y-side*dx*110,bank.minY,bank.maxY)};
    const travel=distance(p,point);
    const score=segmentDistance(point,source,end)+Math.min(80,travel)*.15-(travel<10?200:0);
    if(score>bestScore){best=point;bestScore=score;}
  }
  return best;
}
function routeAroundCrates(start,target,crates,bank){
  if(!crates.length||pathClear(start,target,crates))return target;
  const columns=24,rows=Math.ceil((bank.maxY-bank.minY)/18)+1,count=columns*rows;
  const nodes=Array.from({length:count},(_,index)=>({
    x:38+(index%columns)*(W-76)/(columns-1),
    y:bank.minY+Math.floor(index/columns)*(bank.maxY-bank.minY)/(rows-1),
  }));
  const free=nodes.map(point=>!crates.some(crate=>blocksFighter(crate,point.x,point.y)));
  const nearest=(point,reachable)=>{
    let best=-1,bestDistance=Infinity;
    for(let i=0;i<count;i++){
      if(!free[i]||(reachable&&!pathClear(start,nodes[i],crates)))continue;
      const d=distance(point,nodes[i]);if(d<bestDistance){best=i;bestDistance=d;}
    }
    return best;
  };
  const first=nearest(start,true),last=nearest(target,false);
  if(first<0||last<0)return start;
  const previous=new Int16Array(count).fill(-1),queue=[first];previous[first]=first;
  for(let head=0;head<queue.length&&previous[last]<0;head++){
    const at=queue[head],cx=at%columns,cy=Math.floor(at/columns);
    for(const [dx,dy] of [[1,0],[-1,0],[0,1],[0,-1],[1,1],[1,-1],[-1,1],[-1,-1]]){
      const nx=cx+dx,ny=cy+dy;if(nx<0||nx>=columns||ny<0||ny>=rows)continue;
      const next=ny*columns+nx;
      if(!free[next]||previous[next]>=0||!pathClear(nodes[at],nodes[next],crates))continue;
      previous[next]=at;queue.push(next);
    }
  }
  if(previous[last]<0)return start;
  const route=[];for(let at=last;at!==first;at=previous[at])route.push(nodes[at]);
  for(const point of route)if(pathClear(start,point,crates))return point;
  return route.at(-1)||target;
}
export class Match {
  constructor(random = Math.random, options = {}) {
    this.random=random; this.time=0; this.id=0;
    this.format=options.format||'1v1';
    const lineup=options.lineup||resolveLineup(()=>0,options.character||'elias',this.format);
    const roster=this.format==='2v2'?[lineup.player,lineup.opponent,lineup.teammate,lineup.opponent2]:[lineup.player,lineup.opponent];
    if(roster.some(id=>!CHARACTER_BY_ID[id])||new Set(roster).size!==roster.length)throw new RangeError('Match lineup must use distinct known characters');
    this.lineup=lineup;
    this.players=[soldier(0,this.format==='2v2'?150:190,760,0,lineup.player,'human'),
      soldier(1,this.format==='2v2'?150:290,240,1,lineup.opponent,'computer')];
    if(this.format==='2v2')this.players.push(
      soldier(2,330,760,0,lineup.teammate,'computer'),
      soldier(3,330,240,1,lineup.opponent2,'computer'));
    this.mode=options.mode||GAME_MODES.RANDOM;
    if(!Object.values(GAME_MODES).includes(this.mode))throw new RangeError('Unknown game mode');
    this.map=options.map||MAPS.RIVERSIDE;
    if(!MAP_TYPES.includes(this.map))throw new RangeError('Unknown map');
    if(this.mode===GAME_MODES.CHOOSE_FIXED&&!DROP_TYPES.includes(options.weapon))throw new RangeError('Choose Fixed Weapon requires a valid weapon');
    this.fixedWeapon=this.mode===GAME_MODES.RANDOM_FIXED?DROP_TYPES[Math.floor(this.random()*DROP_TYPES.length)]:this.mode===GAME_MODES.CHOOSE_FIXED?options.weapon:null;
    this.bullets=[]; this.pickups=[]; this.flames=[]; this.towerAttacks=[]; this.effects=[]; this.beams=[]; this.events=[]; this.marks=[]; this.marksRevision=0;this.waste=[];
    this.mud=[];this.lightning=[];this.tornadoes=[];this.rocksInFlight=[];this.volcanicFire=[];this.ash=null;
    this.sandstorm=null;this.eagles=[];this.quicksand=[];this.mirages=[];this.icePatches=[];this.avalanches=[];this.hail=[];
    this.nextEnvironmentEvent=11;this.environmentCycle=0;this.nextMud=20;
    if(this.map===MAPS.STORM){this.addMudPair(0);this.addMudPair(1);}
    this.obstacles=this.makeObstacles();
    this.placeFighters();
    if(this.map===MAPS.SNOW)this.addIcePatches();
    this.tower={ phase:'rest', progress:0, height:0, riseAttack:false, lowerAttack:false, cycle:-1 };
    this.nextDrop=2.5;
    this.aiState=new Map(this.players.filter(p=>p.controller==='computer').map(p=>[p.id,{clock:0,waypoint:null,target:null,fire:false,lastSeen:null,lastSeenAt:-Infinity}]));
    this.finished=false; this.winner=null; this.ending=0; this.launches=0; this.specialHeld=false;
  }
  emit(type, data={}) { this.events.push({type,...data}); }
  fightersOnBank(bank){return this.players.filter(p=>p.bank===bank&&p.hp>0);}
  opponentsOf(p){return this.players.filter(other=>other.team!==p.team&&other.hp>0);}
  targetFor(p){const opponents=this.opponentsOf(p);return opponents.reduce((best,other)=>!best||distance(p,other)<distance(p,best)?other:best,null);}
  ownerOf(id){return this.players[id];}
  placeFighters(){
    for(const fighter of this.players){
      const bank=BANK_BOUNDS[fighter.bank],preferredX=fighter.x,preferredY=fighter.y;
      const candidates=[0,-35,35,-70,70].flatMap(dy=>[0,-45,45,-90,90].map(dx=>({x:clamp(preferredX+dx,45,W-45),y:clamp(preferredY+dy,bank.minY+20,bank.maxY-20)})));
      const clear=candidate=>this.obstacles.every(obstacle=>obstacle.destroyed||distance(candidate,obstacle)>45)&&
        this.players.every(other=>other===fighter||other.bank!==fighter.bank||other.id>fighter.id||distance(candidate,other)>68);
      const site=candidates.find(clear);
      if(site){fighter.x=site.x;fighter.y=site.y;}
    }
  }
  canSee(observer,target){
    if(target.hp<=0)return false;
    if(distance(observer,target)<90)return true;
    if(this.map===MAPS.DESERT&&(sandstormCovers(this.sandstorm,observer.y)||sandstormCovers(this.sandstorm,target.y)))return false;
    if(this.map===MAPS.MAGMA&&ashCloudVisuals(this.ash).some(cloud=>cloud.alpha>.42&&
      ((target.x-cloud.x)/(cloud.width*.45))**2+((target.y-cloud.y)/(cloud.height*.45))**2<1))return false;
    if(this.map===MAPS.SNOW&&this.avalanches.some(front=>front.age>=front.warning&&
      Math.abs(front.y-target.y)<70&&Math.abs(front.x-target.x)<AVALANCHE.halfWidth))return false;
    return !this.obstacles.some(obstacle=>!obstacle.destroyed&&obstacle.type==='crate'&&
      segmentRectHit(observer,target,obstacleBounds(obstacle)));
  }
  addMudPair(index){
    const sites=[[118,737],[360,790],[305,670],[155,835]];
    const [x,y]=sites[index%sites.length];
    for(const owner of [0,1])this.mud.push({id:this.id++,owner,x:owner===0?x:W-x,y:owner===0?y:2*RIVER.y-y,radius:40});
  }
  addIcePatches(){
    for(const owner of [0,1])for(let index=0;index<2;index++){
      const occupied=this.icePatches.filter(patch=>patch.owner===owner);
      const site=this.environmentalPoint(owner,occupied);
      this.icePatches.push({id:this.id++,owner,...site,radius:39});
    }
  }
  environmentalPoint(owner,occupied=[]){
    const bank=BANK_BOUNDS[owner];
    const clear=point=>this.obstacles.every(o=>o.destroyed||Math.hypot(o.x-point.x,o.y-point.y)>64)&&occupied.every(o=>Math.hypot(o.x-point.x,o.y-point.y)>70);
    for(let attempt=0;attempt<30;attempt++){
      const point={x:85+this.random()*(W-170),y:bank.minY+48+this.random()*(bank.maxY-bank.minY-96)};
      if(clear(point))return point;
    }
    const center=(bank.minY+bank.maxY)/2;
    const fallback=[{x:W/2,y:center},{x:W/2,y:center+95},{x:W/2,y:center-95},{x:105,y:center},{x:W-105,y:center}];
    const safe=fallback.find(clear);
    if(safe)return safe;
    return {x:W/2,y:(bank.minY+bank.maxY)/2};
  }
  startEnvironmentEvent(){
    const kind=this.environmentCycle++%(this.map===MAPS.DESERT?4:this.map===MAPS.SNOW?2:3);
    if(this.map===MAPS.STORM){
      if(kind===2){
        for(const owner of [0,1]){
          const bank=BANK_BOUNDS[owner],y=bank.minY+75+this.random()*(bank.maxY-bank.minY-150);
          const direction=this.random()<.5?1:-1;
          this.tornadoes.push({id:this.id++,owner,x:direction>0?68:W-68,y,dx:direction,age:0,warning:1,life:6,hit:[false,false],pulling:false});
        }
        this.emit('tornado');
      }else{
        for(const wave of [0,1])for(const owner of [0,1]){
          const start=wave*LIGHTNING_WAVE_DELAY,warning=start+1.2;
          const occupied=this.lightning.filter(strike=>strike.owner===owner);
          this.lightning.push({id:this.id++,owner,wave,...this.environmentalPoint(owner,occupied),age:0,start,warning,life:warning+.6,hit:false,charged:wave===0});
        }
        this.emit('lightningCharge');
      }
    }else if(this.map===MAPS.MAGMA){
      if(kind===2){this.ash={age:0,life:8.5};this.emit('ash');}
      else for(const owner of [0,1]){
        const point=this.environmentalPoint(owner,kind===0?this.rocksInFlight:[]);
        const event={id:this.id++,owner,...point,age:0,warning:1.3,hit:false};
        if(kind===0)this.rocksInFlight.push({...event,life:1.75});
        else this.volcanicFire.push({...event,life:5.3});
      }
      if(kind!==2)this.emit(kind===0?'volcanoRockLaunch':'volcanoFireLaunch');
    }else if(this.map===MAPS.DESERT){
      if(kind===0){
        const direction=this.random()<.5?1:-1;
        this.sandstorm={age:0,life:8.5,direction,y:direction>0?-170:H+170};
        this.emit('sandstorm');
      }else if(kind===1){
        for(const owner of [0,1]){
          const p=this.fightersOnBank(owner)[Math.floor(this.random()*this.fightersOnBank(owner).length)]||this.players[owner];
          this.eagles.push({id:this.id++,owner,anchorX:p.x,anchorY:p.y,x:p.x,y:p.y,
            entrySide:this.random()<.5?-1:1,age:0,target1:null,target2:null,target:null,
            firstDone:false,secondDone:false,
            life:EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive*2+EAGLE_FLIGHT.recover+EAGLE_FLIGHT.retreat});
        }
      }else if(kind===2){
        let added=false;
        for(const owner of [0,1])if(this.quicksand.filter(patch=>patch.owner===owner).length<4){
          this.quicksand.push({id:this.id++,owner,...this.environmentalPoint(owner,this.quicksand.filter(patch=>patch.owner===owner)),age:0,open:0,occupied:false,radius:PHASE6_RULES.quicksandRadius});
          added=true;
        }
        if(added)this.emit('quicksand');
      }else{
        for(const owner of [0,1]){
          const type=this.random()<.5?'syringe':this.dropWeaponType();
          this.mirages.push({id:this.id++,owner,...this.environmentalPoint(owner),type,age:0,warning:2,life:12,state:'sun',strikeAge:0});
        }
        this.emit('mirageSun');
      }
    }else if(this.map===MAPS.SNOW){
      if(kind===0){
        for(const owner of [0,1]){
          const bank=BANK_BOUNDS[owner],direction=owner===1?1:-1;
          this.avalanches.push({id:this.id++,owner,x:W/2,
            y:direction>0?bank.minY-AVALANCHE.edge:bank.maxY+AVALANCHE.edge,
            direction,age:0,warning:AVALANCHE.warning,life:AVALANCHE.life,hit:false});
        }
        this.emit('avalanche');
      }else{
        for(const owner of [0,1]){
          const bank=BANK_BOUNDS[owner];
          for(let wave=0;wave<2;wave++){
            const direction=this.random()<.5?1:-1;
            const cloudId=this.id++,cloudStart=wave*HAIL_CLUSTER.cloudGap;
            const cloudLife=cloudStart+HAIL_CLUSTER.cloudDuration;
            const cloudY=this.environmentalPoint(owner,this.hail.filter(h=>h.owner===owner)).y;
            const startX=direction>0?-HAIL_CLUSTER.entry:W+HAIL_CLUSTER.entry;
            const endX=direction>0?W+HAIL_CLUSTER.entry:-HAIL_CLUSTER.entry;
            for(let salvo=0;salvo<3;salvo++){
              const x=direction>0?90+salvo*130:W-90-salvo*130;
              const y=clamp(cloudY+(this.random()-.5)*24,bank.minY+45,bank.maxY-45);
              const warning=cloudStart+(x-startX)/(endX-startX)*HAIL_CLUSTER.cloudDuration;
              this.hail.push({id:this.id++,cloudId,owner,wave,salvo,direction,x,y,cloudY,cloudStart,cloudLife,age:0,start:cloudStart,warning,life:cloudLife,hit:false});
            }
          }
        }
        this.emit('hail');
      }
    }
  }
  updateEnvironment(dt){
    if(this.map===MAPS.RIVERSIDE)return;
    if(this.map===MAPS.STORM&&this.nextMud<=this.time&&this.mud.length<8){this.addMudPair(this.mud.length/2);this.nextMud+=20;}
    if(this.time>=this.nextEnvironmentEvent){this.startEnvironmentEvent();this.nextEnvironmentEvent=this.time+(this.map===MAPS.STORM?14:this.map===MAPS.DESERT?15:this.map===MAPS.SNOW?14:13);}
    for(const strike of this.lightning){
      strike.age+=dt;
      if(!strike.charged&&strike.age>=strike.start){strike.charged=true;if(strike.owner===0)this.emit('lightningCharge',{x:strike.x});}
      if(!strike.hit&&strike.age>=strike.warning){
        strike.hit=true;
        for(const p of this.fightersOnBank(strike.owner))if(distance(p,strike)<39)this.damage(p,HAZARD_RULES.lightningDamage);
        this.damageAreaObjects(strike.x,strike.y,30);
        this.mark('scorch',strike.x,strike.y,.65);
        if(strike.owner===0)this.emit('lightningStrike',{x:strike.x});
      }
    }
    this.lightning=this.lightning.filter(strike=>strike.age<strike.life);
    for(const vortex of this.tornadoes){
      vortex.age+=dt;
      if(vortex.age<vortex.warning)continue;
      vortex.x=clamp(vortex.x+vortex.dx*56*dt,50,W-50);
      for(const p of this.fightersOnBank(vortex.owner)){
      const d=distance(p,vortex);
      const pulling=d<HAZARD_RULES.tornadoPullRadius&&p.dodgeTime<=0&&p.stun<=0;
      if(pulling&&!vortex.pulling)this.emit('tornadoPull',{x:p.x,player:p.id});
      vortex.pulling=pulling;
      if(d<HAZARD_RULES.tornadoPullRadius){
        if(d>15&&p.dodgeTime<=0){
          const strength=HAZARD_RULES.tornadoPullMin+(HAZARD_RULES.tornadoPullMax-HAZARD_RULES.tornadoPullMin)*(1-d/HAZARD_RULES.tornadoPullRadius);
          this.move(p,(vortex.x-p.x)/d,(vortex.y-p.y)/d,dt*strength);
        }
        if(d<23&&!vortex.hit[p.id]){
          vortex.hit[p.id]=true;
          if(this.damage(p,HAZARD_RULES.tornadoDamage)>0)this.move(p,vortex.dx,0,.08);
        }
      }
      }
    }
    this.tornadoes=this.tornadoes.filter(vortex=>vortex.age<vortex.life);
    for(const rock of this.rocksInFlight){
      rock.age+=dt;
      if(!rock.hit&&rock.age>=rock.warning){
        rock.hit=true;
        const caught=this.fightersOnBank(rock.owner).filter(p=>distance(p,rock)<31);
        for(const p of caught)this.damage(p,HAZARD_RULES.rockDamage);
        const clear=!caught.length&&this.obstacles.every(o=>o.destroyed||distance(o,rock)>48)&&this.players.every(f=>f.hp<=0||distance(f,rock)>35);
        if(clear)this.obstacles.push({id:this.id++,type:'rock',owner:rock.owner,x:rock.x,y:rock.y,destroyed:false,hits:0,flash:0,burning:HAZARD_RULES.burningRockDuration,cooling:HAZARD_RULES.rockCoolingDuration,ttl:19.4});
        this.effects.push({id:this.id++,type:'volcanicImpact',x:rock.x,y:rock.y,age:0,life:.6,seed:this.random()});
        this.emit('volcanoRockImpact',{x:rock.x});
      }
    }
    this.rocksInFlight=this.rocksInFlight.filter(rock=>rock.age<rock.life);
    for(const fire of this.volcanicFire){
      fire.age+=dt;
      if(!fire.hit&&fire.age>=fire.warning){
        fire.hit=true;this.damageAreaObjects(fire.x,fire.y,26);
        this.mark('scorch',fire.x,fire.y,.75);this.emit('volcanoFireImpact',{x:fire.x});
      }
    }
    this.volcanicFire=this.volcanicFire.filter(fire=>fire.age<fire.life);
    for(const rock of this.obstacles)if(rock.type==='rock'&&!rock.destroyed){
      rock.ttl-=dt;
      const burning=rock.burning||0;
      rock.burning=Math.max(0,burning-dt);
      rock.cooling=Math.max(0,(rock.cooling||0)-Math.max(0,dt-burning));
      if(rock.ttl<=0)this.destroyObstacle(rock);
    }
    if(this.ash){this.ash.age+=dt;if(this.ash.age>=this.ash.life)this.ash=null;}
    if(this.sandstorm){
      const storm=this.sandstorm;storm.age+=dt;
      const travel=H+340+SANDSTORM_WAVE_GAP;
      storm.y=storm.direction>0?-170+travel*storm.age/storm.life:H+170-travel*storm.age/storm.life;
      if(storm.age>=storm.life)this.sandstorm=null;
    }
    for(const eagle of this.eagles){
      eagle.age+=dt;
      const firstStart=EAGLE_FLIGHT.approach,firstImpact=firstStart+EAGLE_FLIGHT.dive;
      const secondStart=firstImpact+EAGLE_FLIGHT.recover,secondImpact=secondStart+EAGLE_FLIGHT.dive;
      const target=()=>{
        const bank=BANK_BOUNDS[eagle.owner],p=this.fightersOnBank(eagle.owner)[Math.floor(this.random()*this.fightersOnBank(eagle.owner).length)]||this.players[eagle.owner];
        return {x:clamp(p.x+(this.random()-.5)*32,50,W-50),y:clamp(p.y+(this.random()-.5)*28,bank.minY+42,bank.maxY-42)};
      };
      const strike=site=>{
        for(const p of this.fightersOnBank(eagle.owner))if(site&&distance(p,site)<PHASE6_RULES.eagleRadius&&this.damage(p,PHASE6_RULES.eagleDamage)>0)
          this.emit('eagleHit',{x:p.x,player:p.id});
      };
      if(!eagle.target1&&eagle.age>=firstStart){eagle.target1=target();eagle.target=eagle.target1;eagle.x=eagle.target.x;eagle.y=eagle.target.y;if(eagle.owner===0)this.emit('eagleAttack',{x:eagle.x,player:eagle.owner});}
      if(!eagle.firstDone&&eagle.age>=firstImpact){eagle.firstDone=true;strike(eagle.target1);eagle.target=null;}
      if(!eagle.target2&&eagle.age>=secondStart){
        eagle.target2=target();eagle.target=eagle.target2;eagle.x=eagle.target.x;eagle.y=eagle.target.y;
        if(eagle.owner===0)this.emit('eagleAttack',{x:eagle.x,player:eagle.owner});
      }
      if(!eagle.secondDone&&eagle.age>=secondImpact){eagle.secondDone=true;strike(eagle.target2);eagle.target=null;}
    }
    this.eagles=this.eagles.filter(eagle=>eagle.age<eagle.life);
    for(const patch of this.quicksand){
      patch.age+=dt;
      const occupants=this.fightersOnBank(patch.owner).filter(p=>distance(p,patch)<patch.radius);
      patch.occupied=occupants.length>0;
      patch.open=clamp(patch.open+(patch.occupied?dt*2.1:-dt*1.25),0,1);
      for(const p of occupants){const d=distance(p,patch);if(p.dodgeTime<=0&&d>5)this.move(p,(patch.x-p.x)/d,(patch.y-p.y)/d,dt*PHASE6_RULES.quicksandPull);}
    }
    for(const lure of this.mirages){
      lure.age+=dt;
      const p=this.fightersOnBank(lure.owner).find(fighter=>distance(fighter,lure)<40);
      if(lure.state==='sun'&&lure.age>=lure.warning)lure.state='lure';
      if(lure.state==='lure'&&p){
        lure.state='strike';lure.victim=p.id;lure.strikeAge=0;this.emit('scorpionReveal',{x:lure.x});
      }else if(lure.state==='strike'){
        lure.strikeAge+=dt;
        if(lure.strikeAge>=PHASE6_RULES.scorpionWindup){
          const victim=this.players[lure.victim];
          if(victim?.hp>0&&distance(victim,lure)<37&&this.damage(victim,PHASE6_RULES.scorpionDamage)>0){
            victim.scorpionSlow=PHASE6_RULES.scorpionSlow;
            victim.stun=Math.max(victim.stun,PHASE6_RULES.scorpionStagger);
            this.emit('scorpionBite',{x:victim.x,player:victim.id});
          }
          lure.state='retreat';lure.strikeAge=0;
        }
      }else if(lure.state==='retreat')lure.strikeAge+=dt;
    }
    this.mirages=this.mirages.filter(lure=>lure.age<lure.life&&!(lure.state==='retreat'&&lure.strikeAge>.6));
    for(const avalanche of this.avalanches){
      avalanche.age+=dt;
      if(avalanche.age<avalanche.warning)continue;
      if(!avalanche.soundStarted){avalanche.soundStarted=true;if(avalanche.owner===0)this.emit('avalancheRush');}
      const bank=BANK_BOUNDS[avalanche.owner];
      const start=avalanche.direction>0?bank.minY-AVALANCHE.edge:bank.maxY+AVALANCHE.edge;
      const end=avalanche.direction>0?bank.maxY+AVALANCHE.edge:bank.minY-AVALANCHE.edge;
      avalanche.y=start+(end-start)*Math.min(1,(avalanche.age-avalanche.warning)/(avalanche.life-avalanche.warning));
      for(const p of this.fightersOnBank(avalanche.owner))if(Math.abs(p.x-avalanche.x)<AVALANCHE.halfWidth&&Math.abs(p.y-avalanche.y)<AVALANCHE.hitDepth){
        if(p.dodgeTime>0){
          if(!(avalanche.evaded instanceof Set))avalanche.evaded=new Set();
          avalanche.evaded.add(p.id);
          continue;
        }
        if(avalanche.evaded instanceof Set&&avalanche.evaded.has(p.id))continue;
        if(!(avalanche.hit instanceof Set&&avalanche.hit.has(p.id))){
          if(!(avalanche.hit instanceof Set))avalanche.hit=new Set();
          avalanche.hit.add(p.id);
          if(this.damage(p,PHASE6_RULES.avalancheDamage)>0)this.emit('avalancheHit',{x:p.x,player:p.id});
        }
        const beforePush=p.y;
        for(let remaining=AVALANCHE.pushSpeed*dt;remaining>0;remaining-=5){
          const y=clamp(p.y+avalanche.direction*Math.min(5,remaining),bank.minY,bank.maxY);
          if(y===p.y||this.obstacles.some(o=>blocksFighter(o,p.x,y)))break;
          p.y=y;
        }
        if(p.y!==beforePush){p.lastMoveX=0;p.lastMoveY=avalanche.direction;p.moving=true;}
      }
    }
    this.avalanches=this.avalanches.filter(avalanche=>avalanche.age<avalanche.life);
    for(const pellet of this.hail){
      pellet.age+=dt;
      if(!pellet.fallSoundPlayed&&pellet.age>=pellet.warning-HAIL_CLUSTER.fall){
        pellet.fallSoundPlayed=true;this.emit('hailFall',{x:pellet.x});
      }
      const impacts=pellet.impacts??(pellet.impacts=Array(HAIL_CLUSTER.offsets.length).fill(false));
      for(let index=0;index<HAIL_CLUSTER.offsets.length;index++){
        if(impacts[index]||pellet.age<pellet.warning+index*HAIL_CLUSTER.stagger)continue;
        impacts[index]=true;
        const [dx,dy]=HAIL_CLUSTER.offsets[index],x=pellet.x+dx,y=pellet.y+dy;
        for(const p of this.fightersOnBank(pellet.owner))if(!(pellet.damaged instanceof Set&&pellet.damaged.has(p.id))&&Math.hypot(p.x-x,p.y-y)<HAIL_CLUSTER.impactRadius&&this.damage(p,PHASE6_RULES.hailDamage)>0){
          p.stun=Math.max(p.stun,PHASE6_RULES.hailFlinch);
          if(!(pellet.damaged instanceof Set))pellet.damaged=new Set();
          pellet.damaged.add(p.id);
        }
        if(index===0)this.emit('hailImpact',{x});
      }
      pellet.hit=impacts.every(Boolean);
    }
    this.hail=this.hail.filter(pellet=>pellet.age<pellet.life);
  }
  makeObstacles(){
    const formations={
      T:[[-33,0],[0,0],[33,0],[0,17]],
      L:[[0,0],[33,0],[0,17]],
      square:[[0,0],[33,0],[0,17],[33,17]],
    };
    const shapes=Object.keys(formations);
    const south=[80,315].flatMap(originX=>{
      const shape=shapes[Math.floor(this.random()*shapes.length)];
      return formations[shape].map(([dx,dy])=>({type:'crate',x:originX+dx,y:670+dy,formation:shape}));
    });
    const barrelCount=1+Math.floor(this.random()*2);
    const clear=point=>point.x<=355&&Math.hypot(point.x-190,point.y-760)>58&&south.every(o=>Math.hypot(point.x-o.x,point.y-o.y)>58);
    for(let i=0;i<barrelCount;i++){
      let point;
      for(let attempt=0;attempt<24;attempt++){
        const candidate={x:55+this.random()*370,y:650+this.random()*220};
        if(clear(candidate)&&south.filter(o=>o.type==='barrel').every(o=>Math.hypot(candidate.x-o.x,candidate.y-o.y)>52)){point=candidate;break;}
      }
      if(!point){
        const fallback=[{x:240,y:840},{x:240,y:645},{x:170,y:840},{x:310,y:840},{x:170,y:645},{x:310,y:645}];
        point=fallback.find(candidate=>clear(candidate)&&south.filter(o=>o.type==='barrel').every(o=>Math.hypot(candidate.x-o.x,candidate.y-o.y)>52));
      }
      if(point)south.push({type:'barrel',...point});
    }
    return [...south.map(o=>({...o,id:this.id++,owner:0,destroyed:false,hits:0,flash:0})),
      ...south.map(o=>({...o,id:this.id++,owner:1,x:W-o.x,y:2*RIVER.y-o.y,destroyed:false,hits:0,flash:0}))];
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
  hitObstacle(obstacle,shotId){
    if(obstacle.destroyed)return false;
    if(obstacle.type==='rock'&&(obstacle.burning>0||obstacle.cooling>0))return true;
    if(obstacle.type==='crate'&&shotId!==undefined){
      if(obstacle.lastHitShot===shotId)return true;
      obstacle.lastHitShot=shotId;
    }
    if(obstacle.type==='crate'&&(obstacle.hits||0)===0){
      obstacle.hits=1;obstacle.flash=.15;
      this.effects.push({id:this.id++,type:'crateHit',x:obstacle.x,y:obstacle.y,age:0,life:.24,seed:this.random()});
      this.emit('crateHit',{x:obstacle.x});
      return true;
    }
    return this.destroyObstacle(obstacle);
  }
  destroyObstacle(obstacle){
    if(obstacle.destroyed)return false;
    if(obstacle.type==='rock'&&(obstacle.burning>0||obstacle.cooling>0))return false;
    obstacle.destroyed=true;obstacle.hits=obstacle.type==='crate'?2:obstacle.hits;obstacle.flash=.15;
    if(obstacle.type==='crate'){
      this.effects.push({id:this.id++,type:'crateBreak',x:obstacle.x,y:obstacle.y,age:0,life:.45,seed:this.random()});
      this.emit('crateBreak',{x:obstacle.x});
      this.dropCrateLoot(obstacle);
    }else if(obstacle.type==='rock'){
      this.effects.push({id:this.id++,type:'volcanicImpact',x:obstacle.x,y:obstacle.y,age:0,life:.45,seed:this.random()});
      this.emit('rockBreak',{x:obstacle.x});
    }else{
      this.effects.push({id:this.id++,type:'barrelBlast',x:obstacle.x,y:obstacle.y,age:0,life:.9,seed:this.random()});
      this.effects.push({id:this.id++,type:'smoke',x:obstacle.x,y:obstacle.y,age:0,life:2,seed:this.random()});
      this.mark('scorch',obstacle.x,obstacle.y,1.5);
      for(const player of this.players){
        const d=Math.hypot(player.x-obstacle.x,player.y-obstacle.y);
        if(d<BARREL_BLAST_RADIUS)this.damage(player,BARREL_DAMAGE*(1-.4*d/BARREL_BLAST_RADIUS),obstacle.x,obstacle.y);
      }
      this.emit('barrelBlast',{x:obstacle.x});
      this.damageAreaObjects(obstacle.x,obstacle.y,BARREL_BLAST_RADIUS);
    }
    return true;
  }
  dropWeaponType(){return this.fixedWeapon||DROP_TYPES[Math.floor(this.random()*DROP_TYPES.length)];}
  dropCrateLoot(crate){
    const roll=this.random();
    if(roll<.55)return;
    const type=roll<.85?this.dropWeaponType():'syringe';
    const bounds=BANK_BOUNDS[crate.owner];
    const offsets=[[0,-38],[0,38],[-45,0],[45,0],[-45,-34],[45,-34],[-45,34],[45,34],[0,-57],[0,57]];
    const start=Math.floor(this.random()*offsets.length);
    let point=null;
    const free=(x,y)=>{
      if(Math.hypot(x-crate.x,y-crate.y)<26)return false;
      const blocked=this.obstacles.some(o=>!o.destroyed&&(o.type==='crate'?x>o.x-35&&x<o.x+35&&y>o.y-30&&y<o.y+30:Math.hypot(o.x-x,o.y-y)<32));
      const crowded=this.pickups.some(item=>item.owner===crate.owner&&item.ttl>0&&Math.hypot(item.x-x,item.y-y)<32);
      return !blocked&&!crowded;
    };
    for(let i=0;i<offsets.length;i++){
      const [dx,dy]=offsets[(start+i)%offsets.length];
      const x=clamp(crate.x+dx,38,W-38),y=clamp(crate.y+dy,bounds.minY+12,bounds.maxY-12);
      if(free(x,y)){point={x,y};break;}
    }
    if(!point){
      const candidates=[];
      for(let y=bounds.minY+20;y<=bounds.maxY-20;y+=20)for(let x=40;x<=W-40;x+=20)candidates.push({x,y});
      candidates.sort((a,b)=>distance(a,crate)-distance(b,crate));
      point=candidates.find(candidate=>free(candidate.x,candidate.y));
    }
    if(!point)return;
    this.pickups.push({id:this.id++,owner:crate.owner,type,x:point.x,y:point.y,sx:crate.x,sy:crate.y-6,flight:.38,flightDuration:.38,arcHeight:26,ttl:PICKUP_LIFETIME,source:'crate'});
    this.emit('crateLoot',{x:crate.x,itemType:type});
  }
  mark(type,x,y,size=1) {
    if(y>=RIVER.top&&y<=RIVER.bottom)return;
    this.marks.push({type,x,y,size,seed:this.random()});
    if(this.marks.length>140)this.marks.shift();
    this.marksRevision++;
  }
  weapon(p) { return p.slot?.type || 'pistol'; }
  move(p,x,y,dt) {
    if(p.hp<=0){p.moving=false;return;}
    if(p.stun>0){p.moving=false;return;}
    const rolling=p.dodgeTime>0;
    if(rolling){x=p.dodgeX;y=p.dodgeY;}
    if(rolling&&this.map===MAPS.SNOW){
      p.onIce=false;p.iceEntryX=0;p.iceEntryY=0;p.iceSlip=0;
      p.iceVX=x;p.iceVY=y;
    }
    if(this.map===MAPS.SNOW&&!rolling){
      const onIce=this.icePatches.some(patch=>patch.owner===p.bank&&((p.x-patch.x)/(patch.radius*1.18))**2+((p.y-patch.y)/(patch.radius*.72))**2<1);
      if(onIce&&!p.onIce){p.iceSpray=.26;this.emit('iceSlide',{x:p.x});}
      if(onIce){
        if(!p.onIce||(!p.iceEntryX&&!p.iceEntryY)){
          const entryLength=Math.hypot(x,y);
          const vx=p.moving?p.lastMoveX:entryLength>.05?x:p.iceVX;
          const vy=p.moving?p.lastMoveY:entryLength>.05?y:p.iceVY;
          const length=Math.hypot(vx,vy);
          if(length>.05){p.iceEntryX=vx/length;p.iceEntryY=vy/length;}
        }
        p.iceVX=p.iceEntryX;p.iceVY=p.iceEntryY;
        p.iceSlip=PHASE6_RULES.iceSlip;x=p.iceVX;y=p.iceVY;
      }else if(p.iceSlip>0){
        p.iceEntryX=0;p.iceEntryY=0;
        const blend=Math.min(1,dt*(Math.hypot(x,y)>.05?12:3.2));
        p.iceVX+=(x-p.iceVX)*blend;p.iceVY+=(y-p.iceVY)*blend;
        x=p.iceVX;y=p.iceVY;
        p.iceSlip=Math.max(0,p.iceSlip-dt);
      }else{p.iceEntryX=0;p.iceEntryY=0;p.iceVX=x;p.iceVY=y;}
      p.onIce=onIce;
    }
    const l=Math.hypot(x,y), scale=l>1?1/l:1;
    const oldX=p.x,oldY=p.y;
    const inMud=this.map===MAPS.STORM&&this.mud.some(patch=>patch.owner===p.bank&&((p.x-patch.x)/(patch.radius*1.22))**2+((p.y-patch.y)/(patch.radius*.84))**2<1);
    const inQuicksand=this.map===MAPS.DESERT&&this.quicksand.some(patch=>patch.owner===p.bank&&distance(p,patch)<patch.radius);
    const speed=rolling?DODGE_DISTANCE/DODGE_DURATION:170*(inMud?HAZARD_RULES.mudSlow:inQuicksand?PHASE6_RULES.quicksandSlow:p.scorpionSlow>0?.7:1);
    const travelDt=rolling?Math.min(dt,p.dodgeTime):dt;
    const nextX=clamp(p.x+x*scale*speed*travelDt,38,W-38);
    if(!this.obstacles.some(o=>blocksFighter(o,nextX,p.y)))p.x=nextX;
    const nextY=clamp(p.y+y*scale*speed*travelDt,BANK_BOUNDS[p.bank].minY,BANK_BOUNDS[p.bank].maxY);
    if(!this.obstacles.some(o=>blocksFighter(o,p.x,nextY)))p.y=nextY;
    p.moving=Math.hypot(p.x-oldX,p.y-oldY)>dt*2;
    if(p.moving){
      const travel=Math.hypot(p.x-oldX,p.y-oldY);
      p.lastMoveX=(p.x-oldX)/travel;p.lastMoveY=(p.y-oldY)/travel;
      p.walk+=dt;
    }
  }
  dodge(p,x=0,y=0){
    if(this.finished||this.ending>0||p.hp<=0||p.stun>0||p.dodgeTime>0||p.dodgeCooldown>0)return false;
    const length=Math.hypot(x,y);
    p.dodgeX=length>.1?x/length:0;
    p.dodgeY=length>.1?y/length:(p.bank===0?-1:1);
    p.dodgeDir=Math.round(Math.atan2(p.dodgeX,-p.dodgeY)/(Math.PI/4)+8)%8;
    p.dodgeTime=DODGE_DURATION;p.dodgeCooldown=DODGE_COOLDOWN;p.charge=0;
    this.emit('dodge',{player:p.id,x:p.x});
    return true;
  }
  collect(p,item) {
    if(item.owner!==p.bank || item.flight>0 || item.ttl<=0 || p.hp<=0 || distance(p,item)>29) return false;
    if(item.type==='syringe'){
      if(p.hp>=100)return false;
      const amount=Math.min(HEAL_AMOUNT,100-p.hp);
      p.hp+=amount;item.ttl=0;
      this.effects.push({id:this.id++,type:'healBurst',x:p.x,y:p.y,age:0,life:.55,seed:this.random()});
      this.emit('heal',{player:p.id,amount,x:p.x});
      return true;
    }
    if(p.slot&&p.slot.type!==item.type)return false;
    const ammo=WEAPONS[item.type].ammo,stacked=!!p.slot;
    if(stacked){
      p.slot.ammoReceived=(p.slot.ammoReceived??p.slot.ammo)+ammo;
      p.slot.ammo+=ammo;
    }else p.slot={type:item.type,ammo,ammoReceived:ammo};
    item.ttl=0;
    this.emit('pickup',{player:p.id,weapon:item.type,...(stacked?{ammoAdded:ammo}:{})});
    return true;
  }
  fire(p,power=0,mode='auto',aim=null) {
    if(this.finished || this.ending>0 || p.hp<=0 || p.stun>0 || p.dodgeTime>0) return false;
    if(mode==='special'&&!p.slot)return false;
    const special=mode==='special'||(mode==='auto'&&!!p.slot),cooldownKey=special?'specialCooldown':'pistolCooldown';
    if(p[cooldownKey]>0)return false;
    const type=special?p.slot.type:'pistol', def=WEAPONS[type], enemy=aim||this.targetFor(p);
    if(!enemy)return false;
    const charge=type==='laser'?clamp(power,0,1):0;
    const dir=p.bank===0?-1:1;
    p[cooldownKey]=def.cooldown; p.flash=.09;p.lastShotSpecial=special; p.shots++; if(special)p.charge=0;
    const shotId=this.id++;
    const origin={x:p.x,y:p.y+dir*24};
    if(type==='laser') {
      const end={x:origin.x,y:p.bank===0?0:H};
      const bodyHit=segmentTowerHit(origin,end,this.tower);
      const obstacleHit=this.nearestObstacleHit(origin,end);
      const victimHit=this.opponentsOf(p).filter(target=>target.dodgeTime<=0)
        .map(target=>({target,hit:segmentRectHit(origin,end,{left:target.x-16,right:target.x+16,top:target.y-16,bottom:target.y+16})}))
        .filter(result=>result.hit).sort((a,b)=>distance(origin,a.hit)-distance(origin,b.hit))[0];
      const hits=[bodyHit&&{kind:'tower',hit:bodyHit},obstacleHit&&{kind:'obstacle',hit:obstacleHit.hit,obstacle:obstacleHit.obstacle},victimHit&&{kind:'player',hit:victimHit.hit,target:victimHit.target}].filter(Boolean);
      const first=hits.reduce((nearest,hit)=>!nearest||distance(origin,hit.hit)<distance(origin,nearest.hit)?hit:nearest,null);
      if(first?.kind==='tower')this.hitTower(p.id,first.hit);
      else if(first?.kind==='obstacle')this.hitObstacle(first.obstacle,shotId);
      else if(first?.kind==='player'){this.damage(first.target,def.damage+Math.round(charge*LASER_BONUS_DAMAGE));p.hits++;}
      this.beams.push({id:this.id++,x:origin.x,y:origin.y,endY:first?.hit.y??end.y,owner:p.id,power:charge,age:0,life:.34});
    } else if(type==='grenade'||type==='nuclear') {
      this.bullets.push({id:this.id++,owner:p.id,type,x:origin.x,y:origin.y,sx:origin.x,sy:origin.y,tx:enemy.x,ty:enemy.y,t:0,duration:type==='nuclear'?1:.9,damage:def.damage,color:def.color,life:1.4});
    } else {
      let dx=0,dy=dir;
      if(type==='missile') { const d=Math.hypot(enemy.x-origin.x,enemy.y-origin.y); dx=(enemy.x-origin.x)/d; dy=(enemy.y-origin.y)/d; }
      const offsets=type==='shotgun'?[-.10,-.05,0,.05,.10]:[0];
      for(const off of offsets) {
        this.bullets.push({id:this.id++,owner:p.id,shotId,type,x:origin.x,y:origin.y,vx:(dx+off)*def.speed,vy:dy*def.speed,damage:def.damage,color:def.color,life:2.3,travel:0,tx:enemy.x,ty:enemy.y,targetDistance:type==='missile'?Math.hypot(enemy.x-origin.x,enemy.y-origin.y):Infinity});
      }
    }
    if(special && --p.slot.ammo<=0)p.slot=null;
    this.emit('shot',{weapon:type,player:p.id,x:p.x}); return true;
  }
  damage(p,amount,x=p.x,y=p.y) {
    if(p.hp<=0||p.dodgeTime>0) return 0;
    const dealt=Math.min(p.hp,amount);
    p.hp=Math.max(0,p.hp-amount); p.hurt=.13;
    this.effects.push({id:this.id++,type:'blood',x,y,age:0,life:1.1,seed:this.random()});
    this.mark('blood',x,y+18,.6+this.random()*.5);
    this.emit('hit',{player:p.id});
    if(dealt>0)this.emit('damage',{player:p.id,amount:dealt});
    return dealt;
  }
  damageOverTime(p,amount){
    if(p.hp<=0||p.dodgeTime>0)return 0;
    const dealt=Math.min(p.hp,amount);
    p.hp-=dealt;p.hazardDamage+=dealt;
    return dealt;
  }
  flushHazardDamage(dt){
    for(const p of this.players){
      if(p.hazardDamage<=0)continue;
      p.hazardPopupClock+=dt;
      if(p.hazardPopupClock<.4&&p.hp>0)continue;
      const shown=Math.floor(p.hazardDamage+1e-6);
      if(shown>0){this.emit('damage',{player:p.id,amount:shown});p.hazardDamage-=shown;p.hazardPopupClock=0;}
    }
  }
  explode(b) {
    const stunGrenade=b.type==='grenade',nuclear=b.type==='nuclear';
    const effect=nuclear?'nuclearBlast':stunGrenade?'stunBlast':'explosion';
    this.effects.push({id:this.id++,type:effect,x:b.x,y:b.y,age:0,life:nuclear?.95:stunGrenade?.65:.55,seed:this.random()});
    this.effects.push({id:this.id++,type:'smoke',x:b.x,y:b.y,age:0,life:nuclear?1.5:stunGrenade?1.2:2.4,seed:this.random()});
    this.mark('scorch',b.x,b.y,nuclear?.8:stunGrenade?.6:1.3);
    const radius=BLAST_RADIUS[b.type];
    this.damageAreaObjects(b.x,b.y,radius);
    const shooter=this.ownerOf(b.owner);
    const targets=this.players.filter(target=>target.team!==shooter.team);
    for(const target of targets){
      const d=distance(target,b);
      if(d>=radius)continue;
      const dealt=this.damage(target,b.damage*(1-.4*d/radius));
      if(dealt>0)shooter.hits++;
      if(dealt>0&&stunGrenade&&target.hp>0&&target.stun<=0){target.stun=GRENADE_STUN_DURATION;target.charge=0;target.moving=false;this.emit('stun',{player:target.id});}
    }
    if(nuclear)this.waste.push({id:this.id++,x:b.x,y:b.y});
    this.emit(effect,{x:b.x}); b.life=0;
  }
  hitTower(owner,impact=RIVER) {
    const t=this.tower;
    if(t.phase==='rest'||t.height<=TOWER_ACTIVE_HEIGHT) return false;
    this.effects.push({id:this.id++,type:'towerImpact',x:impact.x,y:impact.y,age:0,life:.32,seed:this.random()});
    this.emit('towerImpact',{x:impact.x});
    return true;
  }
  startTowerVolley(phase){
    if(this.map!==MAPS.RIVERSIDE)return;
    const type=['fire','lightning','icicle'][Math.floor(this.random()*3)];
    for(const owner of [0,1]){
      const fighters=this.fightersOnBank(owner);
      if(!fighters.length)continue;
      const p=fighters[Math.floor(this.random()*fighters.length)];
      const bank=BANK_BOUNDS[owner];
      const x=clamp(p.x,35,W-35),y=clamp(p.y,bank.minY+24,bank.maxY-24);
      const sourceX=RIVER.x+(owner===0?-1:1)*TOWER_GEOMETRY.fireVentOffsetX,sourceY=TOWER_GEOMETRY.fireVentY;
      const length=Math.max(1,Math.hypot(x-sourceX,y-sourceY)),dx=(x-sourceX)/length,dy=(y-sourceY)/length;
      const maxReach=flameReach(sourceX,sourceY,dx,dy),speed=type==='lightning'?TOWER_VOLLEY.lightningSpeed:TOWER_VOLLEY.icicleSpeed;
      this.towerAttacks.push({id:this.id++,phase,type,owner,x,y,sourceX,sourceY,dx,dy,maxReach,reach:0,age:0,warning:TOWER_VOLLEY.warning,life:TOWER_VOLLEY.warning+(type==='fire'?.35:maxReach/speed+.35),hit:false,damaged:new Set(),marked:0});
    }
    this.emit(type==='lightning'?'lightningCharge':'towerAim');
  }
  updateTowerAttacks(dt){
    for(const attack of this.towerAttacks){
      attack.age+=dt;
      if(attack.age<attack.warning)continue;
      if(!attack.hit){
        attack.hit=true;
        if(attack.type==='fire')this.flames.push({id:this.id++,x:attack.sourceX,y:attack.sourceY,dx:attack.dx,dy:attack.dy,age:0,reach:0,maxReach:attack.maxReach,endAge:null,marked:0,life:4.2});
        if(attack.owner===0)this.emit(attack.type==='fire'?'towerFire':attack.type==='lightning'?'lightningStrike':'hailFall',{x:attack.sourceX});
      }
      if(attack.type==='fire')continue;
      const speed=attack.type==='lightning'?TOWER_VOLLEY.lightningSpeed:TOWER_VOLLEY.icicleSpeed;
      attack.reach=Math.min(attack.maxReach,attack.reach+speed*dt);
      const tip={x:attack.sourceX+attack.dx*attack.reach,y:attack.sourceY+attack.dy*attack.reach};
      for(const obstacle of this.obstacles)if(!obstacle.destroyed&&segmentDistance(obstacle,{x:attack.sourceX,y:attack.sourceY},tip)<OBSTACLE_HALF[obstacle.type].x+8)this.hitObstacle(obstacle,attack.id);
      const width=attack.type==='lightning'?TOWER_VOLLEY.lightningWidth:TOWER_VOLLEY.icicleWidth;
      for(const p of this.fightersOnBank(attack.owner))if(!attack.damaged.has(p.id)&&segmentDistance(p,{x:attack.sourceX,y:attack.sourceY},tip)<width){
        const damage=attack.type==='lightning'?TOWER_VOLLEY.lightningDamage:TOWER_VOLLEY.icicleDamage;
        if(this.damage(p,damage)>0){
          attack.damaged.add(p.id);
          if(attack.type==='icicle')this.effects.push({id:this.id++,type:'iceBurst',x:p.x,y:p.y,age:0,life:.4,seed:this.random()});
        }
      }
      while(attack.marked+75<attack.reach){
        attack.marked+=75;
        const x=attack.sourceX+attack.dx*attack.marked,y=attack.sourceY+attack.dy*attack.marked;
        if(y<RIVER.top||y>RIVER.bottom){
          if(attack.type==='lightning')this.mark('scorch',x,y,.3);
        }
      }
      if(attack.reach>=attack.maxReach&&attack.owner===0&&!attack.endedSound){attack.endedSound=true;if(attack.type==='icicle')this.emit('hailImpact',{x:tip.x});}
    }
    this.towerAttacks=this.towerAttacks.filter(attack=>attack.age<attack.life);
  }
  launch() {
    this.launches++;
    const pairedType=this.mode===GAME_MODES.RANDOM_SAME?this.dropWeaponType():null;
    const weaponDrops=[];
    for(let owner=0;owner<2;owner++) for(let slot=0;slot<(this.format==='2v2'?2:1);slot++) {
      const sx=RIVER.x+(owner===0?-51:51),sy=RIVER.y-78;
      const bounds=BANK_BOUNDS[owner],margin=20;
      const type=pairedType||this.dropWeaponType();
      let x,y,clear=false;
      for(let attempt=0;attempt<16;attempt++){
        x=55+this.random()*(W-110);y=bounds.minY+margin+this.random()*(bounds.maxY-bounds.minY-2*margin);
        clear=!this.obstacles.some(o=>!o.destroyed&&Math.hypot(x-o.x,y-o.y)<57)&&
          this.pickups.every(item=>item.owner!==owner||distance(item,{x,y})>=60);
        if(clear)break;
      }
      if(!clear){
        const safe=[{x:240,y:bounds.minY+margin+15},{x:240,y:bounds.maxY-margin-15},{x:W/2,y:(bounds.minY+bounds.maxY)/2}];
        ({x,y}=safe.find(point=>!this.obstacles.some(o=>!o.destroyed&&distance(point,o)<57))||safe[0]);
      }
      const weapon={id:this.id++,owner,type,sx,sy,x,y,flight:.75,ttl:PICKUP_LIFETIME};
      this.pickups.push(weapon);weaponDrops.push(weapon);
      this.effects.push({id:this.id++,type:'launch',x:sx,y:sy,age:0,life:.32,seed:owner});
    }
    for(const owner of [0,1]){
      if(this.random()>=TOWER_HEAL_CHANCE)continue;
      const weapon=weaponDrops.find(drop=>drop.owner===owner),bounds=BANK_BOUNDS[owner];
      const clear=point=>point.x>=48&&point.x<=W-48&&point.y>=bounds.minY+20&&point.y<=bounds.maxY-20&&
        this.obstacles.every(o=>o.destroyed||distance(point,o)>=57)&&
        this.pickups.every(item=>item.owner!==owner||distance(point,item)>=38);
      let site=null;
      for(let attempt=0;attempt<16;attempt++){
        const point={x:55+this.random()*(W-110),y:bounds.minY+20+this.random()*(bounds.maxY-bounds.minY-40)};
        if(clear(point)){site=point;break;}
      }
      if(!site)site=[100,240,380].flatMap(x=>[bounds.minY+45,(bounds.minY+bounds.maxY)/2,bounds.maxY-45].map(y=>({x,y}))).find(clear);
      if(!site)continue;
      const sx=weapon.sx+(weapon.owner===0?-15:15),sy=weapon.sy;
      this.pickups.push({id:this.id++,owner,type:'syringe',sx,sy,...site,flight:.82,flightDuration:.82,ttl:PICKUP_LIFETIME});
      this.effects.push({id:this.id++,type:'launch',x:sx,y:sy,age:0,life:.32,seed:owner});
    }
    this.emit('launch');
  }
  updateTower(dt) {
    const t=this.tower;
    if(t.phase==='rest' && this.time>=this.nextDrop){t.phase='rise';t.progress=0;t.riseAttack=false;t.lowerAttack=false;t.cycle++;this.emit('rise');}
    if(t.phase==='rest') return;
    t.progress+=dt;
    if(t.phase==='rise') {t.height=easeLift(t.progress/TOWER_TIMING.rise);if(!t.riseAttack&&t.progress>=TOWER_VOLLEY.riseAt){t.riseAttack=true;this.startTowerVolley('rise');}if(t.progress>=TOWER_TIMING.rise){t.phase='deliver';t.progress=0;this.launch();}}
    else if(t.phase==='deliver') {if(t.progress>=TOWER_TIMING.deliver){t.phase='lower';t.progress=0;this.emit('lower');}}
    else {
      t.height=1-easeLift(t.progress/TOWER_TIMING.lower);
      if(!t.lowerAttack&&t.progress>=TOWER_VOLLEY.lowerAt){t.lowerAttack=true;this.startTowerVolley('lower');}
      if(t.progress>=TOWER_TIMING.lower){t.phase='rest';t.height=0;this.nextDrop=this.time+TOWER_TIMING.rest;}
    }
  }
  think(dt) {
    for(const p of this.players.filter(fighter=>fighter.controller==='computer'&&fighter.hp>0))this.thinkFighter(p,dt);
  }
  thinkFighter(p,dt) {
    const state=this.aiState.get(p.id);
    const visible=this.opponentsOf(p).filter(other=>this.canSee(p,other));
    const sighted=visible.reduce((best,other)=>!best||distance(p,other)<distance(p,best)?other:best,null);
    if(sighted){state.lastSeen={x:sighted.x,y:sighted.y,id:sighted.id};state.lastSeenAt=this.time;}
    const remembered=this.time-state.lastSeenAt<3?state.lastSeen:null;
    const enemy=sighted||remembered||p;
    state.aim=sighted?{x:sighted.x,y:sighted.y}:remembered?{x:remembered.x,y:remembered.y}:null;
    if(!sighted)state.fire=false;
    if(p.stun>0){p.moving=false;p.charge=0;return;}
    if(p.dodgeTime<=0&&p.dodgeCooldown<=0){
      const scorpion=this.mirages.find(lure=>lure.owner===p.bank&&lure.state==='strike'&&distance(p,lure)<48);
      if(scorpion&&this.random()<.55)this.dodge(p,p.x-scorpion.x,p.y-scorpion.y);
      const threat=this.bullets.find(b=>this.ownerOf(b.owner).team!==p.team&&(
        (['grenade','nuclear'].includes(b.type)&&b.t/b.duration>.68&&Math.hypot(b.tx-p.x,b.ty-p.y)<BLAST_RADIUS[b.type]+18)||
        (b.type==='missile'&&b.targetDistance-b.travel<130&&Math.hypot(b.tx-p.x,b.ty-p.y)<BLAST_RADIUS.missile+18)
      ));
      if(threat)this.dodge(p,p.x===threat.tx?(p.x>=W/2?1:-1):p.x-threat.tx,p.y-threat.ty);
    }
    state.clock-=dt;
    if(state.clock<=0) {
      state.clock=.2+this.random()*.12;
      const bank=BANK_BOUNDS[p.bank];
      const sandBlind=!sighted;
      // Patrol almost the full bank depth, including the sand beside the river wall.
      let tx=sandBlind?p.x:enemy.x,ty=bank.minY+(bank.maxY-bank.minY)*(.5+.495*Math.sin(this.time*.6));
      const visibleLures=this.mirages.filter(i=>i.owner===p.bank&&i.state==='lure');
      const supplies=[...this.pickups.filter(i=>i.owner===p.bank&&i.flight<=0&&i.ttl>0),...visibleLures]
        .filter(i=>visibleLures.includes(i)||(i.type==='syringe'?p.hp<100:!p.slot||i.type===p.slot.type))
        .sort((a,b)=>(distance(a,p)-(a.type==='syringe'&&p.hp<=65?90:0))-(distance(b,p)-(b.type==='syringe'&&p.hp<=65?90:0)));
      if(supplies.length){tx=supplies[0].x;ty=supplies[0].y;}
      for(const b of this.bullets) {
        if(this.ownerOf(b.owner).team===p.team)continue;
        if((b.type==='grenade'||b.type==='nuclear')&&b.t>.45&&Math.hypot(b.tx-p.x,b.ty-p.y)<BLAST_RADIUS[b.type]+18){tx=p.x+(p.x>b.tx?105:-105);ty=p.y+28;break;}
        if(b.y>p.y&&b.y-p.y<200&&Math.abs(b.x-p.x)<38){tx=p.x+(p.x>W/2?-100:100);break;}
      }
      for(const waste of this.waste)if(Math.hypot(waste.x-p.x,waste.y-p.y)<WASTE_RADIUS+25){tx=p.x+(p.x>waste.x?85:-85);ty=p.y+(p.y>waste.y?45:-45);break;}
      for(const f of this.flames){const end={x:f.x+f.dx*f.maxReach,y:f.y+f.dy*f.maxReach};if(segmentDistance(p,f,end)<50){const escape=escapeLane(p,f,f.dx,f.dy,f.maxReach,bank);tx=escape.x;ty=escape.y;}}
      const towerTarget=this.towerAttacks.find(a=>a.owner===p.bank&&!a.hit&&segmentDistance(p,{x:a.sourceX,y:a.sourceY},{x:a.sourceX+a.dx*a.maxReach,y:a.sourceY+a.dy*a.maxReach})<55);
      if(towerTarget){
        const source={x:towerTarget.sourceX,y:towerTarget.sourceY};
        const escape=escapeLane(p,source,towerTarget.dx,towerTarget.dy,towerTarget.maxReach,bank);
        tx=escape.x;ty=escape.y;
        if(towerTarget.age>towerTarget.warning-.3&&segmentDistance(p,source,{x:source.x+towerTarget.dx*towerTarget.maxReach,y:source.y+towerTarget.dy*towerTarget.maxReach})<30)this.dodge(p,escape.x-p.x,escape.y-p.y);
      }
      const mapThreat=[...this.lightning.filter(h=>!h.hit&&h.age>=h.start),...this.rocksInFlight.filter(h=>!h.hit),...this.volcanicFire.filter(h=>h.hit||h.age>h.warning*.6),...this.tornadoes.filter(h=>h.age>h.warning*.5),...this.obstacles.filter(h=>h.type==='rock'&&!h.destroyed&&h.burning>0)]
        .find(h=>h.owner===p.bank&&distance(p,h)<(h.dx?HAZARD_RULES.tornadoPullRadius+20:65));
      if(mapThreat){
        tx=p.x+(p.x>=mapThreat.x?145:-145);ty=p.y+(p.y>=mapThreat.y?68:-68);
        if(distance(p,mapThreat)<(mapThreat.dx?60:33)&&mapThreat.age>mapThreat.warning*.7)this.dodge(p,p.x-mapThreat.x,p.y-mapThreat.y);
      }
      const eagle=this.eagles.find(h=>h.owner===p.bank&&h.target&&(
        h.target===h.target1?h.age>EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive-.65:
          h.age>EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive+EAGLE_FLIGHT.recover+EAGLE_FLIGHT.dive-.65)&&distance(p,h.target)<70);
      const avalanche=this.avalanches.find(h=>h.owner===p.bank&&h.age>h.warning-.3&&Math.abs(h.y-p.y)<105&&Math.abs(h.x-p.x)<AVALANCHE.halfWidth);
      const hail=this.hail.find(h=>h.owner===p.bank&&!h.hit&&h.age>=h.warning-.75&&distance(p,h)<55);
      const sand=this.quicksand.find(h=>h.owner===p.bank&&distance(p,h)<80);
      const lateral=avalanche;
      if(lateral){ty=p.y-lateral.direction*110;if(Math.abs(p.y-lateral.y)<65)this.dodge(p,0,-lateral.direction);}
      if(eagle){
        const impact=eagle.target===eagle.target1?EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive:EAGLE_FLIGHT.approach+EAGLE_FLIGHT.dive*2+EAGLE_FLIGHT.recover;
        tx=p.x+(p.x>=eagle.target.x?90:-90);ty=p.y+(p.y>=eagle.target.y?75:-75);
        if(eagle.age>impact-.22&&distance(p,eagle.target)<41)this.dodge(p,p.x-eagle.target.x,p.y-eagle.target.y);
      }
      if(hail||sand){const threat=hail||sand;tx=p.x+(p.x>=threat.x?95:-95);ty=p.y+(p.y>=threat.y?65:-65);if(hail&&distance(p,hail)<30&&hail.age>hail.warning-.25)this.dodge(p,p.x-hail.x,p.y-hail.y);}
      state.target={x:clamp(tx,38,W-38),y:clamp(ty,bank.minY,bank.maxY)};
      const crates=this.obstacles.filter(o=>o.owner===p.bank&&o.type!=='barrel'&&!o.destroyed);
      state.waypoint=routeAroundCrates(p,state.target,crates,bank);
      const type=this.weapon(p);
      state.fire=!!sighted&&(['grenade','missile','nuclear'].includes(type)||Math.abs(enemy.x-p.x)<(type==='shotgun'?85:29));
    }
    const waypoint=state.waypoint||p,dx=waypoint.x-p.x,dy=waypoint.y-p.y,l=Math.hypot(dx,dy);
    this.move(p,l>4?dx/l:0,l>4?dy/l:0,dt);
    if(l<=4&&state.target&&distance(p,state.target)>10)state.clock=0;
    if(p.dodgeTime>0){p.charge=0;return;}
    if(p.slot?.type==='laser') {
      if(state.fire||p.charge>0){p.charge=Math.min(1,p.charge+dt/LASER_CHARGE_TIME);if(p.charge>=1&&state.aim)this.fire(p,1,'auto',state.aim);}
    } else if(p.slot&&state.fire) this.fire(p,0,'auto',state.aim);
    if(sighted&&Math.abs(enemy.x-p.x)<29)this.fire(p,0,'pistol',state.aim);
  }
  update(dt,input={x:0,y:0,pistol:false,special:false}) {
    if(this.finished)return;
    dt=Math.min(dt,1/30); this.time+=dt;
    if(this.ending>0){
      this.ending-=dt;
      for(const attack of this.towerAttacks)attack.age+=dt;
      this.towerAttacks=this.towerAttacks.filter(attack=>attack.hit&&attack.age<attack.life);
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
    for(const p of this.players){p.pistolCooldown=Math.max(0,p.pistolCooldown-dt);p.specialCooldown=Math.max(0,p.specialCooldown-dt);p.dodgeCooldown=Math.max(0,p.dodgeCooldown-dt);p.flash=Math.max(0,p.flash-dt);p.hurt=Math.max(0,p.hurt-dt);p.stun=Math.max(0,p.stun-dt);p.radiated=Math.max(0,p.radiated-dt);p.burning=Math.max(0,p.burning-dt);p.scorpionSlow=Math.max(0,p.scorpionSlow-dt);p.iceSpray=Math.max(0,p.iceSpray-dt);}
    for(const obstacle of this.obstacles)obstacle.flash=Math.max(0,obstacle.flash-dt);
    const specialPressed=!!input.special&&!this.specialHeld;
    this.specialHeld=!!input.special;
    this.updateTower(dt);if(input.dodge)this.dodge(this.players[0],input.x||0,input.y||0);this.move(this.players[0],input.x||0,input.y||0,dt);
    const p=this.players[0];
    if(input.pistol)this.fire(p,0,'pistol');
    if(input.special&&p.slot){if(p.slot.type==='laser'&&p.stun<=0&&p.dodgeTime<=0)p.charge=Math.min(1,p.charge+dt/LASER_CHARGE_TIME);else if(!['grenade','nuclear'].includes(p.slot.type)||specialPressed)this.fire(p);}
    this.think(dt);
    this.updateTowerAttacks(dt);
    this.updateEnvironment(dt);
    for(const i of this.pickups){
      if(i.flight>0){
        i.flight=Math.max(0,i.flight-dt);
        if(i.flight===0){
          this.effects.push({id:this.id++,type:'landing',x:i.x,y:i.y,age:0,life:.42,seed:this.random()});
          if(i.source!=='crate')this.emit('landing',{x:i.x});
        }
      }else{
        i.ttl-=dt;
        for(const fighter of this.fightersOnBank(i.owner))if(this.collect(fighter,i))break;
      }
    }
    this.pickups=this.pickups.filter(i=>i.ttl>0);
    for(const b of this.bullets){
      if(b.life<=0)continue;
      b.life-=dt;
      const prev={x:b.x,y:b.y};
      if(b.type==='grenade'||b.type==='nuclear') {
        b.t+=dt;const t=clamp(b.t/b.duration,0,1);b.x=b.sx+(b.tx-b.sx)*t;b.y=b.sy+(b.ty-b.sy)*t;
        // Grenades follow a high ballistic arc above the tower.
        // Its only impact is at the marked landing point.
        if(t>=1)this.explode(b);continue;
      }
      b.prevX=b.x;b.prevY=b.y;b.x+=b.vx*dt;b.y+=b.vy*dt;b.travel+=Math.hypot(b.vx,b.vy)*dt;
      if(b.type==='missile') {
        // Guided payloads fly above the tower, then strike the
        // marked ground position instead of colliding during flight.
        if(b.travel>=b.targetDistance){b.x=b.tx;b.y=b.ty;this.explode(b);}
        continue;
      }
      const bodyHit=segmentTowerHit(prev,b,this.tower);
      const obstacleHit=this.nearestObstacleHit(prev,b);
      if(obstacleHit&&(!bodyHit||distance(prev,obstacleHit.hit)<=distance(prev,bodyHit))){this.hitObstacle(obstacleHit.obstacle,b.shotId);b.life=0;continue;}
      if(bodyHit&&this.hitTower(b.owner,bodyHit)){b.life=0;continue;}
      if(b.x<0||b.x>W||b.y<0||b.y>H)b.life=0;
    }
    // Opposing conventional rounds cancel when their swept paths meet.
    const standard=b=>['pistol','rifle','shotgun'].includes(b.type);
    for(let i=0;i<this.bullets.length;i++)for(let j=i+1;j<this.bullets.length;j++){
      const a=this.bullets[i],b=this.bullets[j];
      if(a.life<=0||b.life<=0||this.ownerOf(a.owner).team===this.ownerOf(b.owner).team||!standard(a)||!standard(b))continue;
      const first={x:(a.prevX??a.x)-(b.prevX??b.x),y:(a.prevY??a.y)-(b.prevY??b.y)};
      const last={x:a.x-b.x,y:a.y-b.y};
      if(segmentDistance({x:0,y:0},first,last)<12){a.life=0;b.life=0;this.effects.push({id:this.id++,type:'spark',x:(a.x+b.x)/2,y:(a.y+b.y)/2,age:0,life:.22,seed:this.random()});}
    }
    for(const b of this.bullets){
      if(b.life<=0||!standard(b))continue;
      const shooter=this.ownerOf(b.owner);
      for(const victim of this.opponentsOf(shooter)){
        if(victim.dodgeTime<=0&&segmentDistance(victim,{x:b.prevX,y:b.prevY},b)<15){
          if(this.damage(victim,b.damage)>0)shooter.hits++;
          b.life=0;break;
        }
      }
    }
    this.bullets=this.bullets.filter(b=>b.life>0);
    for(const f of this.flames){
      f.age+=dt;f.reach=Math.min(f.maxReach,f.reach+FLAME_SPEED*dt);f.life-=dt;
      if(f.endAge===null&&f.reach>=f.maxReach)f.endAge=f.age;
      const end={x:f.x+f.dx*f.reach,y:f.y+f.dy*f.reach};
      for(const obstacle of this.obstacles)if(!obstacle.destroyed&&segmentDistance(obstacle,f,end)<OBSTACLE_HALF[obstacle.type].x+8)this.hitObstacle(obstacle);
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
    for(const p of this.players){
      const radiated=this.waste.some(waste=>distance(p,waste)<WASTE_RADIUS);
      const towerFire=this.flames.some(f=>segmentDistance(p,f,{x:f.x+f.dx*f.reach,y:f.y+f.dy*f.reach})<21);
      const lavaFire=this.volcanicFire.some(f=>f.hit&&distance(p,f)<34);
      const burningRock=this.obstacles.some(rock=>rock.type==='rock'&&!rock.destroyed&&rock.burning>0&&distance(p,rock)<HAZARD_RULES.burningRockRadius);
      const burning=towerFire||lavaFire||burningRock;
      const groundDps=Math.max(radiated?WASTE_DAMAGE_PER_SECOND:0,towerFire?FLAME_DAMAGE_PER_SECOND:0,lavaFire?HAZARD_RULES.volcanicFireDps:0,burningRock?HAZARD_RULES.burningRockDps:0);
      if(groundDps>0&&this.damageOverTime(p,groundDps*dt)>0){if(radiated)p.radiated=.14;if(burning)p.burning=.14;}
    }
    this.flushHazardDamage(dt);
    for(const p of this.players)p.dodgeTime=Math.max(0,p.dodgeTime-dt);
    for(const e of this.effects)e.age+=dt;
    this.effects=this.effects.filter(e=>e.age<e.life);
    for(const b of this.beams)b.age+=dt;
    this.beams=this.beams.filter(b=>b.age<b.life);
    for(const p of this.players)if(p.hp<=0&&!p.deathRecorded){
      p.deathRecorded=true;
      this.effects.push({id:this.id++,type:'death',x:p.x,y:p.y,age:0,life:DEATH_DURATION+1,seed:this.random()});
      this.mark('blood',p.x,p.y+20,1.5);
      this.emit('fighterDeath',{player:p.id});
    }
    const southAlive=this.fightersOnBank(0).length,northAlive=this.fightersOnBank(1).length;
    if(!southAlive||!northAlive){
      this.ending=DEATH_DURATION;
      this.winner=!southAlive?(!northAlive?'draw':1):0;
      this.bullets=[];
      this.towerAttacks=this.towerAttacks.filter(attack=>attack.hit);
      for(const f of this.flames){f.endAge=f.age;f.life=Math.min(f.life,.7);}
      this.emit('death');
    }
  }
}
