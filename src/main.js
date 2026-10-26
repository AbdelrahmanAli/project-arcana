import { Application, Assets, Sprite, Texture, Rectangle, Graphics, Container, TilingSprite } from 'pixi.js';
import { Match, WEAPONS, W, H, RIVER, TOWER_TIMING, TOWER_ACTIVE_HEIGHT, TOWER_GEOMETRY, GRENADE_ARC_HEIGHT, GRENADE_STUN_DURATION, LASER_CHARGE_TIME, DODGE_DURATION, DODGE_COOLDOWN, BLAST_RADIUS, BARREL_BLAST_RADIUS, TOWER_BASE_Y, towerArmExtension, towerShieldBounds } from './model.js';
import { Sound } from './audio.js';
import { isolatedRollFrames } from './roll-sprites.js';
import './style.css';
import './hud.css';
import './arcana.css';
import './compact-landscape.css';
import './phase3.css';

const $=id=>document.getElementById(id);
const sound=new Sound();
let game=new Match(),started=false,paused=false,finishedShown=false;
const input={x:0,y:0,pistol:false,special:false,dodge:false};
const keys=new Set(),firePointers={pistol:null,special:null};let stick=null,toastUntil=0;
let textures=[],rollFrames=[],flameFrames=[],blastFrames=[],hatchFrames=[],wasteFrames=[],mushroomFrames=[],crateFrames=[],barrelFrames=[],laserTexture,stunLauncherTexture,stunGrenadeTexture,missileLauncherTexture,missileTexture,nuclearLauncherTexture,nuclearGrenadeTexture,deathFrames=[],deathFrameSizes=[],app,world,draw,projectileDraw,frontProjectileDraw,aerialProjectileDraw,aerialSpriteLayer,groundDraw,scarsDraw,stunDraw,marksDrawnRevision=-1,waterDraw,waterTile,towerWater,baseWaterDraw,baseVentDraw,baseLightDraw,muzzleDraw,shieldGlass,shieldDraw,fireSmoke,flameLayer,jetLayer,hazardLayer,debrisLayer,obstacleLayer,pickupFlightLayer,joystickDraw,tower,towerMask,cap,capFront,openCap,hatchContainer,hatchCurrent,hatchNext,soldiers=[],corpses=[],dropSprites=new Map(),aerialSprites=new Map(),wasteSprites=new Map(),obstacleSprites=new Map(),flameSprites=[],jetSprites=[],blastSprites=new Map();
let sceneDirty=true,lastTowerMaskHalfWidth=NaN;
const BASE_Y=TOWER_BASE_Y, BASE_WIDTH=175, BASE_HEIGHT=126;
const DEATH_CROPS=[
  [[262,24,378,488],[924,127,409,385],[129,611,615,353],[810,512,661,474]],
  [[120,91,430,525],[684,196,405,394],[87,774,486,392],[629,726,589,462]],
];
const DEATH_FRAME_STEP=.18,DEATH_BLEND=.12;
const DEATH_ART_SCALES=[
  [.12,.12,.10,.095],
  [.105,.12,.12,.10],
];
const WEAPON_ART_BOUNDS={
  rifle:[1254,1254,29,706,271,146],shotgun:[1254,1254,341,710,266,114],pistol:[1254,1254,399,1004,141,139],
  laser:[1536,1024,33,418,1200,486],
};
function fitWeaponIcon(icon,type){
  const fitKey=`${type}:${window.innerWidth}x${window.innerHeight}`;
  if(icon.dataset.fitKey===fitKey)return;
  const art=WEAPON_ART_BOUNDS[type],width=icon.clientWidth,height=icon.clientHeight;
  if(!art||!width||!height)return;
  const [sourceW,sourceH,x,y,w,h]=art,scale=Math.min((width-6)/w,(height-3)/h);
  icon.style.setProperty('background-size',`${sourceW*scale}px ${sourceH*scale}px`,'important');
  icon.style.setProperty('background-position',`${width/2-(x+w/2)*scale}px ${height/2-(y+h/2)*scale}px`,'important');
  icon.dataset.fitKey=fitKey;
}
function clearWeaponIconFit(icon){
  if(!icon.dataset.fitKey)return;
  delete icon.dataset.fitKey;
  icon.style.removeProperty('background-size');
  icon.style.removeProperty('background-position');
}
const healthCells=new Map(),lastHealth=new Map();
for(const id of ['player-hp','opponent-hp']){
  const cells=Array.from({length:20},()=>{const cell=document.createElement('span');cell.className='health-cell';cell.setAttribute('aria-hidden','true');cell.appendChild(document.createElement('i'));$(id).appendChild(cell);return cell.firstElementChild;});
  healthCells.set(id,cells);
}
function updateHealth(id,hp){
  if(lastHealth.get(id)===hp)return;
  lastHealth.set(id,hp);
  healthCells.get(id).forEach((fill,i)=>fill.style.transform=`scaleX(${Math.max(0,Math.min(1,(hp-i*5)/5))})`);
  $(id).setAttribute('aria-valuenow',Math.ceil(hp));
}
const rect=(g,x,y,w,h,color,alpha=1)=>g.rect(x,y,w,h).fill({color,alpha});
const circle=(g,x,y,r,color,alpha=1)=>g.circle(x,y,r).fill({color,alpha});
function line(g,a,b,width,color,alpha=1){g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width,color,alpha});}
const laserWhitePhase=(time,ready)=>Math.sin(time*(ready?28:16))>0;
// Source-pixel centers of the painted ground burst in each 543 x 724 frame.
const MUSHROOM_IMPACT_POINTS=[[254,593],[260,594],[269,595],[285,594]];
function projectedArc(g,x,y,rx,ry,start,end,width,color,alpha,wobble=0){
  const steps=12;
  for(let i=0;i<=steps;i++){
    const angle=start+(end-start)*i/steps,rough=1+wobble*Math.sin(angle*9+rx);
    const px=x+Math.cos(angle)*rx*rough,py=y+3+Math.sin(angle)*ry*rough;
    if(i===0)g.moveTo(px,py);else g.lineTo(px,py);
  }
  g.stroke({color,width,alpha});
}
const AREA_COLORS={
  missile:{fill:0x9b1524,halo:0xe71129,edge:0xff5445,spark:0xff9e55,center:0xffa46e},
  grenade:{fill:0x0c4e9e,halo:0x0b73dd,edge:0x69d8ff,spark:0xa1eeff,center:0xc2f7ff},
  nuclear:{fill:0x255c13,halo:0x4fbd16,edge:0xa8f75a,spark:0xe4ff85,center:0xf2ffac},
};
function drawBlastZone(g,x,y,radius,progress,type){
  const colors=AREA_COLORS[type]||AREA_COLORS.missile;
  const fade=Math.max(0,1-progress),spread=radius*(.8+.2*Math.min(1,progress*5));
  g.ellipse(x,y+3,spread,spread*.72).fill({color:colors.fill,alpha:fade*.13});
  for(let i=0;i<5;i++){
    const start=i*Math.PI*2/5+.09,end=start+.9;
    projectedArc(g,x,y,spread+5,(spread+5)*.72,start,end,9,colors.halo,fade*.22,.025);
    projectedArc(g,x,y,spread,spread*.72,start,end,2.5,colors.edge,fade*.9,.025);
  }
  for(let i=0;i<9;i++){
    const angle=i*Math.PI*2/9+progress*.3,px=x+Math.cos(angle)*spread,py=y+3+Math.sin(angle)*spread*.72;
    line(g,{x:px,y:py},{x:px+Math.cos(angle)*6,y:py+Math.sin(angle)*4},1.5,colors.spark,fade*.65);
  }
}
function drawTargetLock(g,x,y,radius,time,type){
  const colors=AREA_COLORS[type]||AREA_COLORS.missile;
  const pulse=.72+.2*Math.sin(time*9),phase=time*.3;
  g.ellipse(x,y+3,radius,radius*.72).fill({color:colors.fill,alpha:.07*pulse});
  for(let i=0;i<4;i++){
    const start=i*Math.PI/2+phase+.08,end=start+1.18;
    projectedArc(g,x,y,radius+4,(radius+4)*.72,start,end,8,colors.halo,.16*pulse);
    projectedArc(g,x,y,radius,radius*.72,start,end,2,colors.edge,.86*pulse);
  }
  projectedArc(g,x,y,radius*.38,radius*.27,phase*2,phase*2+.85,2,colors.spark,.55*pulse);
  g.ellipse(x,y+3,9,6).stroke({color:colors.center,width:1.3,alpha:.7*pulse});
  line(g,{x:x-5,y:y+3},{x:x+5,y:y+3},1,colors.center,pulse);
  line(g,{x,y:y-2},{x,y:y+8},1,colors.center,pulse);
}
function createShieldGlass(){
  const canvas=document.createElement('canvas');canvas.width=canvas.height=512;
  const ctx=canvas.getContext('2d');
  ctx.beginPath();ctx.arc(256,256,250,0,Math.PI*2);ctx.clip();
  const glass=ctx.createRadialGradient(256,256,0,256,256,250);
  glass.addColorStop(0,'rgba(115,205,237,.025)');glass.addColorStop(.7,'rgba(106,195,234,.035)');
  glass.addColorStop(.91,'rgba(141,222,255,.16)');glass.addColorStop(1,'rgba(192,240,255,.35)');
  ctx.fillStyle=glass;ctx.fillRect(0,0,512,512);
  const glint=ctx.createRadialGradient(150,112,8,162,130,225);
  glint.addColorStop(0,'rgba(255,255,255,.30)');glint.addColorStop(.32,'rgba(225,249,255,.15)');glint.addColorStop(1,'rgba(230,255,255,0)');
  ctx.fillStyle=glint;ctx.fillRect(0,0,512,512);
  const shade=ctx.createRadialGradient(383,373,8,365,366,200);
  shade.addColorStop(0,'rgba(14,57,113,.19)');shade.addColorStop(1,'rgba(14,57,113,0)');
  ctx.fillStyle=shade;ctx.fillRect(0,0,512,512);
  return Texture.from(canvas);
}
function effectNoise(seed,n){return Math.sin(seed*631+n*93.3)*43758.5453%1;}
function drawBloodMark(g,mark){
  const {x,y,size,seed}=mark;
  for(const [scale,dx,dy,color,alpha] of [[1,0,0,0x4d080d,.88],[.69,-2,-1,0xa50e1b,.86]]){
    const rx=14*size*scale,ry=6*size*scale;
    for(let n=0;n<16;n++){
      const angle=n*Math.PI/8,ripple=.74+.17*Math.sin(n*6.3+seed*23)+.1*Math.cos(n*10.1+seed*9);
      const px=x+dx*size+Math.cos(angle)*rx*ripple,py=y+dy*size+Math.sin(angle)*ry*ripple;
      if(n===0)g.moveTo(px,py);else g.lineTo(px,py);
    }
    g.closePath().fill({color,alpha});
  }
  for(let n=0;n<12;n++){
    const angle=n*2.4+seed*13,spread=.6+.65*Math.abs(Math.sin(n*7.9+seed*5));
    const px=x+Math.cos(angle)*18*size*spread,py=y+Math.sin(angle)*9*size*spread;
    rect(g,px,py,(n%3===0?3:2)*size,Math.max(1,(n%4===0?2:1)*size),n%3===0?0xd32932:0x870b14,.88);
  }
}
function drawScorchMark(g,mark){
  const {x,y,size,seed}=mark;
  for(const [scale,dx,dy,color,alpha] of [[1,0,0,0x191713,.76],[.68,-2,-1,0x090a09,.67]]){
    const rx=20*size*scale,ry=8*size*scale;
    for(let n=0;n<14;n++){
      const angle=n*Math.PI/7,ripple=.82+.16*Math.sin(n*5.7+seed*19)+.08*Math.cos(n*9.1+seed*7);
      const px=x+dx*size+Math.cos(angle)*rx*ripple,py=y+dy*size+Math.sin(angle)*ry*ripple;
      if(n===0)g.moveTo(px,py);else g.lineTo(px,py);
    }
    g.closePath().fill({color,alpha});
  }
  for(let n=0;n<16;n++){
    const angle=n*2.4+seed*11,spread=.56+.54*Math.abs(Math.sin(n*8.7+seed*5));
    const px=x+Math.cos(angle)*20*size*spread,py=y+Math.sin(angle)*8*size*spread;
    rect(g,px,py,(n%3===0?3:2)*size,Math.max(1,size),n%4===0?0x554e42:0x10100e,n%4===0?.36:.58);
  }
}
function point(e){const r=$('arena').getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
function releaseFire(mode,cancel=false){
  const held=firePointers[mode]!==null||keys.has(mode==='pistol'?'Space':'KeyE');
  const player=game.players[0];
  if(mode==='special'&&!cancel&&input.special&&!held&&!paused&&started&&player.slot?.type==='laser')game.fire(player,player.charge,'special');
  input[mode]=held;
  if(mode==='special'&&!held)player.charge=0;
  $(`${mode}-fire`).classList.toggle('pressed',held);
}
function clearInput(){
  keys.clear();stick=null;firePointers.pistol=null;firePointers.special=null;
  input.x=0;input.y=0;input.pistol=false;input.special=false;input.dodge=false;game.players[0].charge=0;
  $('pistol-fire').classList.remove('pressed');$('special-fire').classList.remove('pressed');
}
function clearSpriteMap(map){for(const sprite of map.values())sprite.destroy();map.clear();}
function reset(){
  game=new Match();marksDrawnRevision=-1;sceneDirty=true;started=true;paused=false;finishedShown=false;clearInput();sound.init();
  document.querySelectorAll('.damage-number').forEach(label=>label.remove());
  $('menu').classList.add('hidden');$('overlay').classList.add('hidden');$('overlay').classList.remove('result');
  document.querySelector('.game-unit').classList.remove('ended','paused','menu-open');$('pause').textContent='Ⅱ';
  for(const map of [dropSprites,aerialSprites,wasteSprites,obstacleSprites,blastSprites])clearSpriteMap(map);
  for(const sprite of [...flameSprites,...jetSprites])sprite.visible=false;
  toastUntil=0;$('toast').style.opacity=0;$('opponent-toast').style.opacity=0;$('opponent-toast').dataset.until='0';
  updateHud();app.ticker.start();
}
function pause(){if(!started||game.finished)return;paused=!paused;sceneDirty=true;clearInput();document.querySelector('.game-unit').classList.toggle('paused',paused);if(paused){sound.stop();showOverlay('TAKE A<br><em>BREATHER.</em>','The Tower will wait.','RESUME');app.ticker.stop();}else{$('overlay').classList.add('hidden');sound.init();app.ticker.start();}$('pause').textContent=paused?'▶':'Ⅱ';}
function showOverlay(title,copy,button,omen=''){$('overlay-title').innerHTML=title;$('overlay-omen').textContent=omen;$('overlay-omen').hidden=!omen;$('overlay-copy').textContent=copy;$('start').textContent=button;$('overlay').classList.remove('hidden');}
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+1700;$('toast').style.opacity=1;}
function showDamage(playerId,amount){
  const p=game.players[playerId],label=document.createElement('span');
  label.className=playerId===1?'damage-number opponent':'damage-number';
  label.textContent=`-${Math.max(1,Math.round(amount))}`;
  label.setAttribute('aria-hidden','true');
  label.style.left=`${(p.x+25)/W*100}%`;
  label.style.top=`${(p.y+(playerId===1?36:-20))/H*100}%`;
  label.addEventListener('animationend',()=>label.remove(),{once:true});
  $('arena').appendChild(label);
}
$('start').addEventListener('click',()=>{if(paused)pause();else reset();});
$('pause').addEventListener('click',pause);
function openMenu(){started=false;paused=false;sceneDirty=true;clearInput();sound.stop();app.ticker.stop();document.querySelectorAll('.damage-number').forEach(label=>label.remove());document.querySelector('.game-unit').classList.remove('paused');document.querySelector('.game-unit').classList.add('menu-open');$('overlay').classList.add('hidden');$('menu').classList.remove('hidden');$('menu-home').classList.remove('hidden');$('settings-panel').classList.add('hidden');}
$('menu-play').addEventListener('click',reset);
$('menu-open').addEventListener('click',openMenu);
$('result-menu').addEventListener('click',openMenu);
$('menu-settings').addEventListener('click',()=>{$('menu-home').classList.add('hidden');$('settings-panel').classList.remove('hidden');});
$('settings-back').addEventListener('click',()=>{$('settings-panel').classList.add('hidden');$('menu-home').classList.remove('hidden');});
function toggleSound(){const muted=sound.toggle();for(const id of ['sound','settings-sound'])$(id).textContent=muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');}
$('sound').addEventListener('click',toggleSound);$('settings-sound').addEventListener('click',toggleSound);
$('arena').addEventListener('pointerdown',e=>{
  if(e.target.closest('.overlay, .main-menu, .fire-controls')||!started||paused||game.finished||game.ending>0||stick)return;
  e.preventDefault();const p=point(e);stick={id:e.pointerId,x:p.x,y:p.y,dx:0,dy:0};$('arena').setPointerCapture(e.pointerId);
});
$('arena').addEventListener('pointermove',e=>{if(stick?.id===e.pointerId){const p=point(e);stick.dx=p.x-stick.x;stick.dy=p.y-stick.y;const l=Math.hypot(stick.dx,stick.dy);if(l>43){stick.dx*=43/l;stick.dy*=43/l;}}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('arena').addEventListener(name,e=>{if(stick?.id===e.pointerId)stick=null;});
for(const mode of ['pistol','special']){
  const button=$(`${mode}-fire`);
  button.addEventListener('pointerdown',e=>{
    if(e.button!==0||!started||paused||game.finished||game.ending>0||firePointers[mode]!==null)return;
    e.preventDefault();e.stopPropagation();
    if(mode==='special'&&!game.players[0].slot){sound.play('empty');return;}
    const wasFiring=input[mode];firePointers[mode]=e.pointerId;button.setPointerCapture(e.pointerId);input[mode]=true;
    if(!wasFiring&&(mode==='pistol'||game.weapon(game.players[0])!=='laser'))game.fire(game.players[0],0,mode);
    button.classList.add('pressed');
  });
  button.addEventListener('pointerup',e=>{if(e.pointerId===firePointers[mode]){firePointers[mode]=null;releaseFire(mode);}});
  for(const name of ['pointercancel','lostpointercapture'])button.addEventListener(name,e=>{if(e.pointerId===firePointers[mode]){firePointers[mode]=null;releaseFire(mode,true);}});
}
function queueDodge(){
  const p=game.players[0];
  if(input.dodge||p.dodgeTime>0||p.dodgeCooldown>0||p.stun>0){sound.play('dodgeDenied');return;}
  input.dodge=true;
}
const dodgeButton=$('dodge-fire');
dodgeButton.addEventListener('pointerdown',e=>{
  if(e.button!==0||!started||paused||game.finished||game.ending>0)return;
  e.preventDefault();e.stopPropagation();
  queueDodge();
});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.game-unit'))e.preventDefault();});
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight','ShiftLeft','ShiftRight'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'&&!e.repeat){pause();return;}
  if(!started||paused||game.finished||game.ending>0)return;
  if((e.code==='ShiftLeft'||e.code==='ShiftRight')&&!e.repeat)queueDodge();
  const mode=e.code==='Space'?'pistol':e.code==='KeyE'?'special':null;
  if(mode==='special'&&!game.players[0].slot){if(!e.repeat)sound.play('empty');return;}
  const wasFiring=mode&&input[mode];keys.add(e.code);
  if(mode&&(mode==='pistol'||game.players[0].slot)){
    input[mode]=true;
    if(!wasFiring&&!e.repeat&&(mode==='pistol'||game.weapon(game.players[0])!=='laser'))game.fire(game.players[0],0,mode);
    $(`${mode}-fire`).classList.add('pressed');
  }
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')releaseFire('pistol');if(e.code==='KeyE')releaseFire('special');});
window.addEventListener('blur',()=>{clearInput();if(started&&!paused&&!game.finished)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(started&&!paused&&!game.finished)pause();}});
window.addEventListener('resize',()=>{
  sceneDirty=true;
  // The ticker sleeps on menu, pause, and result screens; redraw their HUD once
  // so a phone rotation also refits weapon icons and the opponent badge.
  if(app?.ticker&&!app.ticker.started)app.ticker.start();
});

function updateHud(){
  const p=game.players[0],enemy=game.players[1];
  const dodge=$('dodge-fire');
  dodge.classList.toggle('rolling',p.dodgeTime>0);
  dodge.classList.toggle('cooldown',p.dodgeCooldown>0&&p.dodgeTime<=0);
  $('dodge-cooldown').textContent=p.dodgeCooldown>0&&p.dodgeTime<=0?p.dodgeCooldown.toFixed(1):'';
  $('dodge-meter').style.strokeDasharray=`${Math.max(0,Math.min(100,(1-p.dodgeCooldown/DODGE_COOLDOWN)*100))} 100`;
  dodge.setAttribute('aria-label',p.dodgeCooldown>0?`Dive roll ready in ${p.dodgeCooldown.toFixed(1)} seconds`:'Dive roll');
  const special=$('special-fire'),specialArt=special.querySelector('.fire-control-art'),slot=p.slot;
  special.classList.toggle('empty',!slot);special.classList.toggle('laser-equipped',slot?.type==='laser');
  special.classList.toggle('laser-charging',slot?.type==='laser'&&p.charge>0);
  special.classList.toggle('laser-ready',slot?.type==='laser'&&p.charge>=1);
  special.dataset.weapon=slot?.type||'';
  special.setAttribute('aria-disabled',slot?'false':'true');
  special.setAttribute('aria-label',slot?`Fire ${WEAPONS[slot.type].name}, ${slot.ammo} shots remaining`:'No Tower weapon');
  special.style.setProperty('--meter-color',slot?`#${WEAPONS[slot.type].color.toString(16).padStart(6,'0')}`:'#e9bb70');
  $('special-meter').style.strokeDasharray=`${slot?Math.max(0,Math.min(100,slot.ammo/(slot.ammoReceived??WEAPONS[slot.type].ammo)*100)):0} 100`;
  $('special-ammo').textContent=slot?slot.ammo:'';
  $('special-label').textContent=slot?.type==='laser'?(p.charge>=1?'RELEASE':p.charge>0?`${Math.round(p.charge*100)}%`:'HOLD'):slot?'SPECIAL':'EMPTY';
  $('charge').style.height=slot?.type==='laser'?`${p.charge*100}%`:'0';
  for(const type of ['laser','grenade','missile','nuclear'])specialArt.classList.toggle(({grenade:'stun',laser:'laser',missile:'missile',nuclear:'nuclear'})[type]+'-icon',slot?.type===type);
  specialArt.classList.toggle('atlas-icon',slot?.type==='rifle'||slot?.type==='shotgun');
  if(slot&&WEAPON_ART_BOUNDS[slot.type])fitWeaponIcon(specialArt,slot.type);else clearWeaponIconFit(specialArt);
  $('health-value').textContent=Math.ceil(p.hp);updateHealth('player-hp',p.hp);updateHealth('opponent-hp',enemy.hp);
  const hud=$('opponent-hud'),scale=$('arena').clientWidth/W;
  hud.style.setProperty('--hud-scale',scale);
  hud.style.left=`${Math.max(44,Math.min(W-44,enemy.x))/W*100}%`;hud.style.top=`${(enemy.y-30)/H*100}%`;
  hud.style.display=enemy.hp>0?'flex':'none';
  const enemyWeapon=game.weapon(enemy),equipped=WEAPONS[enemyWeapon],badge=$('opponent-weapon');
  badge.title=equipped.name;badge.setAttribute('aria-label',`Opponent equipped weapon: ${equipped.name}${enemyWeapon==='laser'&&enemy.charge>0?`, charging ${Math.round(enemy.charge*100)} percent`:''}`);
  badge.firstElementChild.classList.toggle('atlas-icon',enemyWeapon==='pistol'||enemyWeapon==='rifle'||enemyWeapon==='shotgun');
  badge.firstElementChild.classList.toggle('laser-icon',enemyWeapon==='laser');
  badge.firstElementChild.classList.toggle('stun-icon',enemyWeapon==='grenade');
  badge.firstElementChild.classList.toggle('missile-icon',enemyWeapon==='missile');
  badge.firstElementChild.classList.toggle('nuclear-icon',enemyWeapon==='nuclear');
  badge.classList.toggle('charging',enemyWeapon==='laser'&&enemy.charge>0);
  badge.classList.toggle('laser-white',enemyWeapon==='laser'&&enemy.charge>0&&laserWhitePhase(game.time,enemy.charge>=1));
  $('opponent-charge').style.width=`${enemy.charge*100}%`;
  if(WEAPON_ART_BOUNDS[enemyWeapon])fitWeaponIcon(badge.firstElementChild,enemyWeapon);
  else clearWeaponIconFit(badge.firstElementChild);
  $('opponent-toast').style.left=`${enemy.x/W*100}%`;$('opponent-toast').style.top=`${(enemy.y+40)/H*100}%`;
}
function render(){
  draw.clear();projectileDraw.clear();frontProjectileDraw.clear();aerialProjectileDraw.clear();groundDraw.clear();stunDraw.clear();waterDraw.clear();towerWater.clear();baseWaterDraw.clear();baseLightDraw.clear();muzzleDraw.clear();shieldDraw.clear();fireSmoke.clear();joystickDraw.clear();
  waterTile.tilePosition.x=game.time*19;
  waterTile.tilePosition.y=Math.sin(game.time*.72)*1.5;
  // A few foam crests drift with the textured current.
  for(let i=0;i<15;i++){
    const y=RIVER.top+18+(i*47)%(RIVER.bottom-RIVER.top-44);
    const x=(i*97+game.time*13)%(W+45)-25;
    const length=8+(i%4)*4;
    waterDraw.moveTo(x,y).bezierCurveTo(x+length*.3,y-1,x+length*.7,y+1,x+length,y).stroke({color:0xb1e2cf,width:1,alpha:.11+.06*Math.sin(game.time+i)});
  }
  if(marksDrawnRevision!==game.marksRevision){
    marksDrawnRevision=game.marksRevision;scarsDraw.clear();
    for(const mark of game.marks){
      if(mark.type==='blood')drawBloodMark(scarsDraw,mark);
      else drawScorchMark(scarsDraw,mark);
    }
  }
  const liveWaste=new Set();
  for(const waste of game.waste){
    liveWaste.add(waste.id);
    let sprite=wasteSprites.get(waste.id);
    if(!sprite){sprite=new Sprite(wasteFrames[0]);sprite.anchor.set(.5);sprite.width=76;sprite.height=76;hazardLayer.addChild(sprite);wasteSprites.set(waste.id,sprite);}
    sprite.texture=wasteFrames[Math.floor(game.time*7+waste.id)%wasteFrames.length];
    sprite.position.set(waste.x,waste.y+2);sprite.alpha=.85+.12*Math.sin(game.time*7);
  }
  for(const [id,sprite] of wasteSprites)if(!liveWaste.has(id)){sprite.destroy();wasteSprites.delete(id);}
  const liveObstacles=new Set();
  for(const obstacle of game.obstacles){
    liveObstacles.add(obstacle.id);
    let sprite=obstacleSprites.get(obstacle.id);
    const layer=obstacle.destroyed?debrisLayer:obstacleLayer;
    if(!sprite){sprite=new Sprite((obstacle.type==='crate'?crateFrames:barrelFrames)[0]);sprite.anchor.set(.5);layer.addChild(sprite);obstacleSprites.set(obstacle.id,sprite);}
    else if(sprite.parent!==layer)layer.addChild(sprite);
    const crate=obstacle.type==='crate',frames=crate?crateFrames:barrelFrames;
    sprite.texture=frames[obstacle.destroyed?(crate?2:obstacle.flash>0?1:2):crate&&obstacle.hits>0?1:0];
    sprite.width=crate?40:44;sprite.height=crate?40:54;
    sprite.position.set(obstacle.x,obstacle.y+(crate?3:-5));sprite.zIndex=obstacle.destroyed?-1:obstacle.y+(crate?16:17);
    sprite.alpha=!obstacle.destroyed&&game.players.some(player=>player.hp>0&&player.y<obstacle.y-(crate?4:3)&&player.y>obstacle.y-(crate?30:38)&&Math.abs(player.x-obstacle.x)<(crate?22:20)) ? .68 : 1;
  }
  for(const [id,sprite] of obstacleSprites)if(!liveObstacles.has(id)){sprite.destroy();obstacleSprites.delete(id);}
  const t=game.tower;
  // Open the hatch as the shaft starts moving and close it at the end of descent.
  const hatchOpen=t.phase==='rise'?Math.min(1,t.progress/1.05):t.phase==='lower'?Math.min(1,Math.max(0,TOWER_TIMING.lower-t.progress)/1.05):t.phase==='rest'?0:1;
  openCap.alpha=hatchOpen;
  const hatchFrame=hatchOpen*3,frame=Math.min(3,Math.floor(hatchFrame));
  hatchCurrent.texture=hatchFrames[frame];
  hatchNext.texture=hatchFrames[Math.min(3,frame+1)];
  hatchNext.alpha=hatchFrame-frame;
  hatchContainer.alpha=Math.min(1,hatchOpen*5);
  // The central column clears the hatch before its launcher arms extend. After
  // firing, the arms fold away during delivery, before descent begins.
  const armEase=towerArmExtension(t);
  const {apertureTop,apertureBottom}=TOWER_GEOMETRY;
  const halfWidth=29+61*armEase;
  if(halfWidth!==lastTowerMaskHalfWidth){
    lastTowerMaskHalfWidth=halfWidth;
    towerMask.clear()
      .rect(RIVER.x-halfWidth,RIVER.y-165,halfWidth*2,apertureTop-(RIVER.y-165)).fill(0xffffff)
      .rect(RIVER.x-28,apertureTop,56,apertureBottom-apertureTop).fill(0xffffff);
  }
  // The stationary rear footing and foreground lip make the shaft emerge through the base.
  const waterline=BASE_Y+27,baseY=TOWER_GEOMETRY.shaftBaseY+(1-t.height)*TOWER_GEOMETRY.shaftHeight;
  tower.position.set(RIVER.x,baseY);
  const waterStrength=Math.min(1,t.height*5);
  for(let n=0;n<3;n++){
    const phase=(game.time*.42+n/3)%1;
    waterDraw.ellipse(RIVER.x,BASE_Y+27,72+phase*24,16+phase*7).stroke({color:0x94dcd7,width:1.5,alpha:(1-phase)*(.2+.12*t.height)});
  }
  if(waterStrength>0){
    // Rings behind the tower keep the base embedded in the river.
    for(let n=0;n<3;n++){
      const phase=(game.time*.7+n/3)%1;
      waterDraw.ellipse(RIVER.x,waterline-8,47+phase*24,11+phase*10).stroke({color:0xa9e8de,width:1.5,alpha:(1-phase)*.55*waterStrength});
    }
    // Each visible launcher has one drain directly beneath its outlet. A single
    // shaft drain remains after the launchers retract.
    const streams=[
      {side:-1,offset:63,ledge:105,width:4,launcher:true},
      {side:1,offset:63,ledge:105,width:4,launcher:true},
      {dx:15,ledge:110,width:3,launcher:false}
    ];
    for(let n=0;n<streams.length;n++){
      const stream=streams[n];
      const dx=stream.launcher?stream.side*(28+(stream.offset-28)*armEase):stream.dx;
      const sourceY=baseY-stream.ledge,endY=waterline-3+Math.abs(dx)*.08;
      const opacity=waterStrength*(t.phase==='deliver'?.78:.95)*(stream.launcher?armEase:1);
      if(sourceY>=endY||opacity<=.04)continue;
      const x=RIVER.x+dx,length=endY-sourceY,flow=game.time*160+(stream.launcher?0:17),width=stream.width;
      const drift=(stream.side||1)*Math.sin(game.time*3.1)*2;
      const pathX=f=>x+drift*(f*f*(3-2*f));
      towerWater.moveTo(x,sourceY).bezierCurveTo(x,sourceY+length*.3,x+drift,sourceY+length*.7,x+drift,endY).stroke({color:0x247d95,width:width+2,alpha:opacity*.58});
      towerWater.moveTo(x+1,sourceY).bezierCurveTo(x+1,sourceY+length*.3,x+drift+1,sourceY+length*.7,x+drift+1,endY).stroke({color:0x9aebea,width:Math.max(1,width-2),alpha:opacity*.52});
      for(let j=0;j<3;j++){
        const offset=(flow+j*23)%(length+10);
        if(offset<length)rect(towerWater,pathX(offset/length),sourceY+offset,2,Math.min(7,length-offset),0xe3ffed,opacity*.8);
      }
      const landingX=x+drift,splashPhase=(game.time*3+(stream.launcher?0:.27))%1;
      towerWater.ellipse(landingX,endY+1,3+splashPhase*5,1+splashPhase*2).stroke({color:0xc7f5e9,width:1.3,alpha:(1-splashPhase)*opacity});
      for(let j=0;j<2;j++){
        const k=(game.time*2.1+(stream.launcher?0:.19)+j/3)%1;
        rect(towerWater,landingX+(j-1)*k*9,endY-Math.sin(k*Math.PI)*(4+j),2,2,0xcff7ed,(1-k)*opacity);
      }
    }
  }
  const sway=Math.sin(game.time*2.8)*1.5, foam=.43+.18*t.height;
  baseWaterDraw.moveTo(RIVER.x-79,BASE_Y+23+sway).bezierCurveTo(RIVER.x-57,BASE_Y+49+sway,RIVER.x+57,BASE_Y+49-sway,RIVER.x+79,BASE_Y+23-sway).stroke({color:0x195b69,width:5,alpha:.38});
  baseWaterDraw.moveTo(RIVER.x-80,BASE_Y+23+sway).bezierCurveTo(RIVER.x-57,BASE_Y+45+sway,RIVER.x+57,BASE_Y+45-sway,RIVER.x+80,BASE_Y+23-sway).stroke({color:0xc5f6e9,width:2,alpha:foam});
  for(const side of [-1,1]){
    if(armEase<=.08)continue;
    const x=RIVER.x+side*82,phase=(game.time*.85+(side+1)/4)%1;
    baseWaterDraw.ellipse(x,BASE_Y+27,6+phase*8,2+phase*3).stroke({color:0xb8eee7,width:1.5,alpha:(1-phase)*foam*armEase});
    circle(baseWaterDraw,x+side*5,BASE_Y+19-Math.sin(phase*Math.PI)*7,1.5,0xd6fff1,(1-phase)*foam*armEase);
  }
  if(t.phase==='rise'){
    const blink=(Math.sin(game.time*10)>0?1:.06)*Math.min(1,t.progress/.25);
    for(const [dx,dy] of [[-32,-13],[32,-13],[-34,10],[0,21],[34,10]]){
      const x=RIVER.x+dx,y=BASE_Y+dy;
      baseLightDraw.ellipse(x,y,15,7).fill({color:0xff1726,alpha:.32*blink});
      baseLightDraw.ellipse(x,y,6,3.3).fill({color:0xe90019,alpha:.96*blink});
      baseLightDraw.ellipse(x,y-1,2.4,1.2).fill({color:0xffd0c0,alpha:blink});
    }
  }
  if(t.shield){
    const {x,y,rx,ry}=towerShieldBounds(t),pulse=t.shieldPulse/.3;
    const wobble=Math.sin(game.time*2.4)*.8;
    shieldGlass.visible=true;shieldGlass.position.set(x,y);shieldGlass.width=rx*2;shieldGlass.height=ry*2;shieldGlass.alpha=.83+pulse*.17;
    shieldDraw.ellipse(x,y,rx+wobble,ry).fill({color:0x84d7ee,alpha:.075+pulse*.04});
    shieldDraw.ellipse(x+rx*.16,y+ry*.11,rx*.72,ry*.78).fill({color:0x17476e,alpha:.065});
    shieldDraw.ellipse(x-rx*.23,y-ry*.16,rx*.61,ry*.73).fill({color:0xc7f6ff,alpha:.032});
    for(let i=0;i<5;i++)shieldDraw.ellipse(x,y,rx-i*1.7+wobble,ry-i*1.7).stroke({color:i<2?0xa0e2fb:0x569fce,width:1.6,alpha:(.14+pulse*.06)*(1-i*.12)});
    shieldDraw.ellipse(x,y,rx+wobble,ry).stroke({color:0xc7f1ff,width:1.8,alpha:.72+pulse*.22});
    shieldDraw.moveTo(x-rx*.8,y-ry*.38).bezierCurveTo(x-rx*.86,y-ry*.69,x-rx*.42,y-ry*.96,x-rx*.06,y-ry*.98).stroke({color:0xf0ffff,width:4,alpha:.22+pulse*.18});
    shieldDraw.moveTo(x-rx*.74,y-ry*.52).bezierCurveTo(x-rx*.56,y-ry*.85,x-rx*.27,y-ry*.91,x+rx*.02,y-ry*.94).stroke({color:0xffffff,width:2,alpha:.65+pulse*.2});
    shieldDraw.moveTo(x+rx*.7,y-ry*.56).bezierCurveTo(x+rx*.96,y-ry*.23,x+rx*.98,y+ry*.3,x+rx*.76,y+ry*.58).stroke({color:0x86d9f9,width:3,alpha:.32});
    shieldDraw.moveTo(x-rx*.48,y+ry*.85).bezierCurveTo(x-rx*.18,y+ry*1.01,x+rx*.38,y+ry*.99,x+rx*.65,y+ry*.7).stroke({color:0xddffff,width:2,alpha:.43});
    shieldDraw.ellipse(x-rx*.36,y-ry*.72,rx*.095,ry*.036).fill({color:0xf7ffff,alpha:.26+pulse*.12});
    circle(shieldDraw,x+rx*.62,y+ry*.31,2,0xecffff,.73);
  }else shieldGlass.visible=false;
  let jetCount=0;
  for(const f of game.flames){
    const alpha=f.endAge===null?1:Math.max(0,1-(f.age-f.endAge)/.34);
    if(alpha<=0)continue;
    // The fixed side vents belong to the base, so the rising shaft never drags
    // the ignition point or leaves a barrel floating in front of it.
    muzzleDraw.ellipse(f.x,f.y,8,5).fill({color:0xe36522,alpha:.96*alpha});
    const tip=19+Math.sin(game.time*24)*4,nx=-f.dy,ny=f.dx;
    muzzleDraw.moveTo(f.x+nx*7,f.y+ny*7).lineTo(f.x+f.dx*tip,f.y+f.dy*tip).lineTo(f.x-nx*7,f.y-ny*7).closePath().fill({color:0xff9c32,alpha:.8*alpha});
    circle(muzzleDraw,f.x+f.dx*6,f.y+f.dy*6,4,0xffedab,alpha);
    for(let d=8;d<=f.reach;d+=12){
      const x=f.x+f.dx*d,y=f.y+f.dy*d;
      if(x<0||x>W||y<0||y>H)continue;
      let s=jetSprites[jetCount];
      if(!s){s=new Sprite(flameFrames[0]);s.anchor.set(.5,.65);s.width=25;s.height=34;jetLayer.addChild(s);jetSprites.push(s);}
      const phase=game.time*22-d*.085+f.id;
      const taper=Math.min(1,(d+15)/55,(f.reach-d+35)/60);
      const sway=Math.sin(phase)*Math.min(5,1+d*.015);
      s.visible=true;s.texture=flameFrames[(Math.floor(game.time*17+d/17))%8];
      s.position.set(x-f.dy*sway,y+f.dx*sway);
      s.width=18+8*taper+Math.sin(phase*1.7)*2;s.height=26+8*taper;
      s.rotation=Math.atan2(f.dy,f.dx)+Math.PI/2+Math.sin(phase)*.09;
      s.alpha=alpha*(.67+.27*taper);jetCount++;
    }
  }
  for(let i=jetCount;i<jetSprites.length;i++)jetSprites[i].visible=false;
  let flameCount=0;
  for(const f of game.flames)for(let d=40;d<f.reach;d+=19){
    const x=f.x+f.dx*d,y=f.y+f.dy*d;
    if(x<0||x>W||y<0||y>H||!(y<RIVER.top-6||y>RIVER.bottom+6))continue;
    let s=flameSprites[flameCount];if(!s){s=new Sprite(flameFrames[0]);s.anchor.set(.5,.85);s.width=35;s.height=46;flameLayer.addChild(s);flameSprites.push(s);}
    const phase=game.time*9+d*.14+f.id;
    s.visible=true;s.texture=flameFrames[(Math.floor(game.time*13+d/19))%8];
    s.position.set(x+Math.sin(phase)*2,y-Math.cos(phase)*2);
    s.width=30+Math.sin(phase)*4;s.height=39+Math.cos(phase*.9)*6;
    s.rotation=Math.sin(phase*.7)*.08;s.alpha=Math.min(1,f.life*1.4);flameCount++;
    groundDraw.ellipse(x,y+2,13,4).fill({color:0x391916,alpha:.55});
    if(d%3<1)circle(fireSmoke,x+Math.sin(game.time*7+d)*7,y-29-(game.time*17+d)%14,2,0xc6aaa0,.27);
  }
  for(let i=flameCount;i<flameSprites.length;i++)flameSprites[i].visible=false;
  const active=new Set();
  for(const item of game.pickups){
    const isStun=item.type==='grenade',isMissile=item.type==='missile',isLaser=item.type==='laser',isNuclear=item.type==='nuclear';
    active.add(item.id);let s=dropSprites.get(item.id);
    if(!s){const art=isLaser?laserTexture:isStun?stunLauncherTexture:isMissile?missileLauncherTexture:isNuclear?nuclearLauncherTexture:textures[WEAPONS[item.type].frame];s=new Sprite(art);s.anchor.set(.5);s.width=isLaser?66:isMissile?58:isStun?56:isNuclear?60:62;s.height=isLaser?27:isMissile?29:isStun?37:isNuclear?40:62;pickupFlightLayer.addChild(s);dropSprites.set(item.id,s);}
    // Airborne drops cross above fighters; landed drops share their ground-depth
    // order with soldiers and cover. They stay visible at the landing point.
    const layer=item.flight>0?pickupFlightLayer:obstacleLayer;
    if(s.parent!==layer)layer.addChild(s);
    let x=item.x,y=item.y;
    if(item.flight>0){const k=1-item.flight/.75;x=item.sx+(item.x-item.sx)*k;y=item.sy+(item.y-item.sy)*k-Math.sin(k*Math.PI)*70;s.rotation=Math.sin(k*Math.PI)*.6;}
    else{s.rotation=0;s.zIndex=item.y+19;groundDraw.ellipse(x,y+(isMissile||isLaser?8:isStun||isNuclear?10:12),isLaser?26:isMissile?24:isStun||isNuclear?23:21,5).fill({color:0x121a18,alpha:.4});y+=Math.sin(game.time*3+item.id)*2-(isLaser?4:isMissile||isStun||isNuclear?7:0);}
    s.position.set(x,y);s.visible=true;s.alpha=item.flight>0||item.ttl>3||Math.floor(item.ttl*6)%2===0?1:.22;
  }
  for(const [id,s] of dropSprites)if(!active.has(id)){s.destroy();dropSprites.delete(id);}
  for(const p of game.players){
    const s=soldiers[p.id],base=p.id===0?0:4;
    const corpse=corpses[p.id];
    if(p.hp>0){
      let frame=base;if(p.flash>0)frame=base+3;else if(p.moving)frame=base+1+Math.floor(p.walk*9)%2;
      const hazardTint=p.burning>0?0xff5750:p.radiated>0?0x80ff68:null;
      const hazardBlink=Math.sin(game.time*21+p.id*.4)>0;
      const rolling=p.dodgeTime>0;
      const rollFrame=rolling?Math.min(3,Math.floor((1-p.dodgeTime/DODGE_DURATION)*4)):0;
      s.visible=true;s.texture=rolling?rollFrames[p.id][p.dodgeDir][rollFrame]:textures[frame];s.position.set(p.x,p.y);s.width=rolling?68:78;s.height=rolling?68:78;s.rotation=0;s.alpha=1;s.tint=rolling?0xffffff:hazardTint?(hazardBlink?hazardTint:0xffffff):p.hurt>0?0xffaaa0:0xffffff;s.zIndex=p.y+20;
      corpse.visible=false;
      // Roll poses touch the ground directly; the standing oval looks detached beside them.
      if(!rolling)groundDraw.ellipse(p.x,p.y+25,17,5).fill({color:0x17221b,alpha:.4});
      if(p.flash>0)rect(draw,p.x+10,p.y,3,2,0xffdb7f);
      if(game.weapon(p)==='laser'&&p.charge>0){
        const power=p.charge,ready=power>=1,white=laserWhitePhase(game.time,ready);
        circle(draw,p.x,p.y-6,7+power*4,white?0xffe9e4:0xff1631,ready?.28:.2);
        circle(draw,p.x,p.y-6,2.5+power*1.5,white?0xffffff:0xff263d,1);
        if(p.id===0){
          draw.roundRect(p.x-19,p.y-50,38,6,2).fill({color:0x220c10,alpha:.9});
          draw.roundRect(p.x-18,p.y-49,36*power,4,1).fill({color:white?0xffffff:ready?0xff5262:0xff263d,alpha:1});
        }
      }
    }else{
      const age=p.deathAge,blue=p.id===0;
      const frame=Math.min(3,Math.floor(age/DEATH_FRAME_STEP));
      const next=Math.min(3,frame+1);
      const blend=frame===next?1:Math.min(1,(age-frame*DEATH_FRAME_STEP)/DEATH_BLEND);
      const progress=Math.min(1,age/.65),slide=1-(1-progress)*(1-progress);
      const x=p.x+(blue?10:6)*slide,y=p.y+(blue?12:7)*slide;
      const pose=(sprite,index,alpha)=>{
        sprite.texture=deathFrames[p.id][index];
        sprite.width=deathFrameSizes[p.id][index][0];sprite.height=deathFrameSizes[p.id][index][1];
        sprite.position.set(x,y);sprite.rotation=0;sprite.alpha=alpha;sprite.tint=0xffffff;
      };
      s.visible=frame<3&&blend<1;
      if(s.visible)pose(s,frame,1-blend);
      corpse.visible=true;pose(corpse,next,blend);corpse.zIndex=p.y+20;
      groundDraw.ellipse(p.x,p.y+24,29,7).fill({color:0x211917,alpha:.45*Math.min(1,age/.65)});
    }
    if(p.stun>0&&p.hp>0){
      const pulse=.72+.22*Math.sin(game.time*22+p.id);
      stunDraw.ellipse(p.x,p.y-24,20,7).stroke({color:0xffefae,width:2,alpha:pulse});
      for(let n=0;n<4;n++){
        const a=game.time*5+n*Math.PI/2+p.id;
        circle(stunDraw,p.x+Math.cos(a)*18,p.y-25+Math.sin(a)*5,2+n%2,0xfff4be,pulse);
      }
    }
  }
  const activeAerialProjectiles=new Set();
  for(const b of game.bullets){
    if(b.type==='missile'||b.type==='grenade'||b.type==='nuclear')drawTargetLock(groundDraw,b.tx,b.ty,BLAST_RADIUS[b.type],game.time,b.type);
    if(b.type==='missile'){
      groundDraw.ellipse(b.x,b.y+3,7,3).fill({color:0x142526,alpha:.35});
    }
    if(b.type==='grenade'||b.type==='nuclear'){
      const arc=Math.sin(b.t/b.duration*Math.PI)*GRENADE_ARC_HEIGHT;
      groundDraw.ellipse(b.x,b.y,8,3).fill({color:b.type==='nuclear'?0x284716:0x1c241b,alpha:.4});
      activeAerialProjectiles.add(b.id);
      let sprite=aerialSprites.get(b.id);
      if(!sprite){sprite=new Sprite(b.type==='nuclear'?nuclearGrenadeTexture:stunGrenadeTexture);sprite.anchor.set(.5);sprite.width=b.type==='nuclear'?28:25;sprite.height=b.type==='nuclear'?22:23;aerialSpriteLayer.addChild(sprite);aerialSprites.set(b.id,sprite);}
      sprite.position.set(b.x,b.y-arc);
      sprite.rotation=Math.sin(b.t*9)*.16;
    }
    else{const v=Math.hypot(b.vx,b.vy),ux=b.vx/v,uy=b.vy/v;
      const shotDraw=b.type==='missile'?aerialProjectileDraw:t.height<TOWER_ACTIVE_HEIGHT||b.y>BASE_Y-39?frontProjectileDraw:projectileDraw;
      if(b.type==='missile'){
        const flight=Math.min(1,b.travel/b.targetDistance),altitude=Math.sin(flight*Math.PI)*105;
        const a=Math.atan2(uy,ux),cos=Math.cos(a),sin=Math.sin(a);
        const pt=(forward,side)=>({x:b.x+cos*forward-sin*side,y:b.y-altitude+sin*forward+cos*side});
        activeAerialProjectiles.add(b.id);
        let sprite=aerialSprites.get(b.id);
        if(!sprite){sprite=new Sprite(missileTexture);sprite.anchor.set(.5);sprite.width=34;sprite.height=13;aerialSpriteLayer.addChild(sprite);aerialSprites.set(b.id,sprite);}
        sprite.position.set(b.x,b.y-altitude);sprite.rotation=a;
        circle(shotDraw,pt(-18,0).x,pt(-18,0).y,5,0xff992e,.85);
        for(let n=0;n<3;n++)circle(shotDraw,pt(-20-n*7,Math.sin(game.time*16+n)*3).x,pt(-20-n*7,Math.sin(game.time*16+n)*3).y,4+n,0xb8ad95,.35-n*.08);
      }else{line(shotDraw,{x:b.x-ux*14,y:b.y-uy*14},b,5,b.color);circle(shotDraw,b.x,b.y,3,0xfff1b3,.9);}
    }
  }
  for(const [id,sprite] of aerialSprites)if(!activeAerialProjectiles.has(id)){sprite.destroy();aerialSprites.delete(id);}
  for(const b of game.beams){
    const alpha=1-b.age/b.life,power=b.power??0,shotDraw=t.height<TOWER_ACTIVE_HEIGHT?frontProjectileDraw:projectileDraw;
    const start={x:b.x,y:b.y},end={x:b.x,y:b.endY};
    line(shotDraw,start,end,8+16*power,0xa70f22,alpha*(.24+.18*power));
    line(shotDraw,start,end,4+8*power,0xff283d,alpha);
    line(shotDraw,start,end,1.5+3*power,0xffffff,alpha);
    circle(draw,b.x,b.endY,3+8*power,0xff3647,alpha*.7);
    if(power>.8)circle(draw,b.x,b.endY,2+4*power,0xfff3e9,alpha);
  }
  for(const e of game.effects){
    const k=e.age/e.life;
    if(e.type==='nuclearBlast'){
      const radius=9+k*BLAST_RADIUS.nuclear;
      drawBlastZone(groundDraw,e.x,e.y,BLAST_RADIUS.nuclear,k,'nuclear');
      groundDraw.ellipse(e.x,e.y+4,radius,radius*.38).stroke({color:0x9dff48,width:3,alpha:(1-k)*.9});
      groundDraw.ellipse(e.x,e.y+3,radius*.58,radius*.22).fill({color:0x6bd822,alpha:(1-k)*.34});
      let cloud=blastSprites.get(e.id);
      if(!cloud){cloud=new Sprite(mushroomFrames[0]);world.addChild(cloud);blastSprites.set(e.id,cloud);}
      const frame=k<.11?0:k<.29?1:k<.64?2:3;
      cloud.texture=mushroomFrames[frame];
      cloud.anchor.set(MUSHROOM_IMPACT_POINTS[frame][0]/543,MUSHROOM_IMPACT_POINTS[frame][1]/724);
      cloud.position.set(e.x,e.y+7);cloud.width=130;cloud.height=160;
      cloud.alpha=k<.72?1:Math.max(0,(1-k)/.28);
      if(k<.18)circle(draw,e.x,e.y-8,8+k*34,0xeaffaa,(.18-k)*2.8);
      for(let n=0;n<12;n++){const a=n*Math.PI/6+e.seed;rect(draw,e.x+Math.cos(a)*radius*.8,e.y-8+Math.sin(a)*radius*.55,3,3,n%3?0x83f53a:0xe5ff8c,1-k);}
    }else if(e.type==='stunBlast'){
      const radius=8+k*BLAST_RADIUS.grenade;
      drawBlastZone(groundDraw,e.x,e.y,BLAST_RADIUS.grenade,k,'grenade');
      groundDraw.ellipse(e.x,e.y+3,radius,radius*.32).stroke({color:0x5bcaff,width:3,alpha:(1-k)*.9});
      groundDraw.ellipse(e.x,e.y+3,radius*.62,radius*.19).fill({color:0x1266cb,alpha:(1-k)*.34});
      circle(draw,e.x,e.y-9,10+k*25,0x3195ff,(1-k)*.44);
      circle(draw,e.x,e.y-9,4+k*12,0xc9f8ff,(1-k)*.75);
      for(let n=0;n<10;n++){
        const a=n*Math.PI/5+e.seed;
        rect(draw,e.x+Math.cos(a)*radius*.82,e.y-8+Math.sin(a)*radius*.48,3,3,n%2?0x59bbff:0xb6f4ff,1-k);
      }
    }else if(e.type==='explosion'||e.type==='towerImpact'||e.type==='barrelBlast'){
      let s=blastSprites.get(e.id);if(!s){s=new Sprite(blastFrames[0]);s.anchor.set(.5);world.addChild(s);blastSprites.set(e.id,s);}
      const towerHit=e.type==='towerImpact';
      const barrelHit=e.type==='barrelBlast';
      s.texture=blastFrames[Math.min(7,Math.floor(k*8))];s.position.set(e.x,e.y-(towerHit?2:11)*k);s.width=towerHit?52:barrelHit?126:112;s.height=towerHit?52:barrelHit?126:112;s.alpha=1-k*.28;
      if(!towerHit){
        const radius=8+k*(barrelHit?BARREL_BLAST_RADIUS:BLAST_RADIUS.missile);
        drawBlastZone(groundDraw,e.x,e.y,barrelHit?BARREL_BLAST_RADIUS:BLAST_RADIUS.missile,k,'missile');
        if(barrelHit){
          groundDraw.ellipse(e.x,e.y+4,radius*.64,radius*.28).fill({color:0xff612e,alpha:(1-k)*.22});
        }else{
          groundDraw.ellipse(e.x,e.y+4,radius,radius*.27).stroke({color:0xf3c477,width:2,alpha:(1-k)*.65});
          groundDraw.ellipse(e.x,e.y+4,radius*.65,radius*.17).fill({color:0x6b3d24,alpha:(1-k)*.15});
        }
      }
      for(let n=0;n<7;n++){const a=n*2.4+e.seed;rect(draw,e.x+Math.cos(a)*k*43,e.y+Math.sin(a)*k*43,3,3,0xffb65c,1-k);}
    }else if(e.type==='crateHit'){
      for(let n=0;n<5;n++){const a=n*2.4+e.seed;rect(draw,e.x+Math.cos(a)*k*12,e.y-6+Math.sin(a)*k*8,2+n%2,2,n%2?0xb67b3d:0xe1b377,1-k);}
    }else if(e.type==='crateBreak'){
      for(let n=0;n<12;n++){
        const a=n*2.4+e.seed,travel=k*(22+n%4*4);
        rect(draw,e.x+Math.cos(a)*travel,e.y-7+Math.sin(a)*travel*.6,4+n%3,2+n%2,n%4?0x8f6235:0xd7a05e,1-k);
      }
    }else if(e.type==='smoke'){
      for(let n=0;n<5;n++){
        const drift=effectNoise(e.seed,n)*14,age=e.age/e.life;
        circle(fireSmoke,e.x+drift+Math.sin(game.time*2+n)*3,e.y-8-age*(18+n*3),4+n%3+age*5,0x454b47,(1-age)*.26);
      }
    }else if(e.type==='landing'){
      const radius=7+k*28;
      groundDraw.ellipse(e.x,e.y+12,radius,3+k*7).stroke({color:0xd7c29a,width:1.5,alpha:(1-k)*.7});
      for(let n=0;n<5;n++){
        const a=n*Math.PI*2/5+e.seed;
        circle(groundDraw,e.x+Math.cos(a)*radius*.8,e.y+10+Math.sin(a)*radius*.2,2+k*2,0x9e9576,(1-k)*.38);
      }
    }else if(e.type==='launch'){
      circle(draw,e.x,e.y,4+13*k,0xffb45a,(1-k)*.55);
      circle(draw,e.x,e.y,3+5*k,0xfff0bb,1-k);
      for(let n=0;n<5;n++){const a=n*Math.PI*2/5+e.seed;rect(draw,e.x+Math.cos(a)*k*17,e.y+Math.sin(a)*k*17,3,3,0xffc06e,1-k);}
    }else if(e.type==='shieldHit'){
      const radius=4+21*k;
      draw.ellipse(e.x,e.y,radius,radius*.6).stroke({color:0xd4faff,width:2.5,alpha:1-k});
      circle(draw,e.x,e.y,4+7*k,0x9deaff,(1-k)*.45);
      for(let n=0;n<5;n++){const a=n*Math.PI*2/5+e.seed;rect(draw,e.x+Math.cos(a)*k*20,e.y+Math.sin(a)*k*20,2,3,0xeaffff,1-k);}
    }else if(e.type==='death'){
      const age=e.age,pool=Math.min(1,Math.max(0,(age-.48)/1.1));
      if(pool>0)drawBloodMark(groundDraw,{x:e.x,y:e.y+17,size:.35+pool*1.8,seed:e.seed});
      if(age<.7)for(let i=0;i<14;i++){
        const a=i*2.4+e.seed,travel=age*75*(.6+Math.abs(effectNoise(e.seed,i))*.7);
        rect(draw,e.x+Math.cos(a)*travel,e.y-11+Math.sin(a)*travel*.62,2+i%3,2+i%2,i%3?0x940e19:0xd32a31,Math.max(0,1-age/.7));
      }
      if(age>=.48&&age<1.25)for(let i=0;i<7;i++){
        const q=(age-.48)/.77,a=i*Math.PI*2/7+e.seed;
        circle(draw,e.x+Math.cos(a)*q*31,e.y+18+Math.sin(a)*q*11,2+q*3,0xc9bba0,(1-q)*.28);
      }
    }else if(e.type==='blood'){
      for(let i=0;i<10;i++){const a=i*2.4+e.seed,spread=23*Math.min(1,k*3)*(1+effectNoise(e.seed,i)*.4);const x=e.x+Math.cos(a)*spread,y=e.y+Math.sin(a)*spread;rect(groundDraw,x,y,3+i%4,2+i%3,i%3?0x8c0c17:0xd12730,1-k*.35);}
    }else{for(let n=0;n<6;n++){const a=n*1.05;rect(draw,e.x+Math.cos(a)*k*30,e.y+Math.sin(a)*k*30,3,3,0xffdf92,1-k);}}
  }
  const activeBlast=new Set(game.effects.filter(e=>e.type==='explosion'||e.type==='towerImpact'||e.type==='barrelBlast'||e.type==='nuclearBlast').map(e=>e.id));
  for(const [id,s]of blastSprites)if(!activeBlast.has(id)){s.destroy();blastSprites.delete(id);}
  if(stick){
    joystickDraw.circle(stick.x,stick.y,43).fill({color:0x10272a,alpha:.22}).stroke({color:0xf0dfb4,alpha:.25,width:1});
    joystickDraw.circle(stick.x+stick.dx,stick.y+stick.dy,17).fill({color:0xf0d58f,alpha:.25}).stroke({color:0xffe6ae,alpha:.6,width:1});
  }
}
async function boot(){
  app=new Application();await app.init({width:W,height:H,background:'#394e45',antialias:false,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true,preference:'webgl'});
  app.ticker.maxFPS=60;
  app.canvas.style.width='100%';app.canvas.style.height='100%';$('arena').prepend(app.canvas);
  const [bg,atlas,towerArt,capArt,openCapArt,hatchArt,flameArt,blastArt,laserArt,stunLauncherArt,stunGrenadeArt,missileLauncherArt,missileArt,blueDeath,redDeath,rockArt,dodgeBlueArt,dodgeRedArt,nuclearLauncherArt,nuclearGrenadeArt,wasteArt,mushroomArt,crateArt,barrelArt]=await Promise.all([
    ...['arena.png','sprites.png','tower-v2.png','tower-cap.png','tower-base-open.png','tower-hatch-frames.png','flames.png','explosions.png','laser-gun.png','stun-launcher-blue.png','stun-grenade-blue.png','smart-missile-launcher.png','smart-missile.png','death-blue-frames.png','death-red-frames.png','rock-barrier.png','dodge-blue.png?v=20261026','dodge-red.png?v=20261026'].map(src=>Assets.load(`${import.meta.env.BASE_URL}art/${src}`)),
    ...['nuclear-launcher.png','nuclear-grenade.png','nuclear-waste-frames.png','nuclear-mushroom-frames.png','breakable-crate-depth-frames.png','oil-barrel-frames.png'].map(src=>Assets.load(`${import.meta.env.BASE_URL}art/phase2/${src}`)),
  ]);
  for(const art of [bg,atlas,towerArt,capArt,openCapArt,hatchArt,flameArt,blastArt,laserArt,stunLauncherArt,stunGrenadeArt,missileLauncherArt,missileArt,blueDeath,redDeath,rockArt,dodgeBlueArt,dodgeRedArt,nuclearLauncherArt,nuclearGrenadeArt,wasteArt,mushroomArt,crateArt,barrelArt])art.source.scaleMode='nearest';
  deathFrames=[blueDeath,redDeath].map((art,player)=>DEATH_CROPS[player].map(([x,y,w,h])=>new Texture({source:art.source,frame:new Rectangle(x,y,w,h)})));
  deathFrameSizes=DEATH_CROPS.map((frames,player)=>frames.map(([, ,w,h],frame)=>{
    const scale=DEATH_ART_SCALES[player][frame];
    return [w*scale,h*scale];
  }));
  const cellW=atlas.width/4,cellH=atlas.height/4;
  textures=Array.from({length:16},(_,i)=>new Texture({source:atlas.source,frame:new Rectangle(i%4*cellW,Math.floor(i/4)*cellH,cellW,cellH)}));
  rollFrames=[dodgeBlueArt,dodgeRedArt].map(isolatedRollFrames);
  const cut=(art,cols,rows)=>Array.from({length:cols*rows},(_,i)=>new Texture({source:art.source,frame:new Rectangle(i%cols*art.width/cols,Math.floor(i/cols)*art.height/rows,art.width/cols,art.height/rows)}));
  flameFrames=cut(flameArt,4,2);blastFrames=cut(blastArt,4,2);hatchFrames=cut(hatchArt,4,1);
  wasteFrames=cut(wasteArt,4,1);mushroomFrames=cut(mushroomArt,4,1);crateFrames=cut(crateArt,3,1);barrelFrames=cut(barrelArt,3,1);
  laserTexture=new Texture({source:laserArt.source,frame:new Rectangle(33,418,1200,486)});stunLauncherTexture=stunLauncherArt;stunGrenadeTexture=stunGrenadeArt;missileLauncherTexture=missileLauncherArt;missileTexture=missileArt;nuclearLauncherTexture=nuclearLauncherArt;nuclearGrenadeTexture=nuclearGrenadeArt;
  world=new Container();app.stage.addChild(world);
  // Rebalance the existing arena art: extend the upper bank and use the
  // original lower edge instead of placing a second wall across playable sand.
  const artTop=bg.height*248/720,artBottom=bg.height*410/720;
  for(const [sourceY,sourceHeight,destY,destHeight] of [
    [0,artTop,0,RIVER.top],
    [artTop,artBottom-artTop,RIVER.top,RIVER.bottom-RIVER.top],
    [artBottom,bg.height-artBottom,RIVER.bottom,H-RIVER.bottom],
  ]){
    const section=new Sprite(new Texture({source:bg.source,frame:new Rectangle(0,sourceY,bg.width,sourceHeight)}));
    section.position.set(0,destY);section.width=W;section.height=destHeight;world.addChild(section);
  }
  // Position the opaque part of the wall inside the arena. The source art has
  // transparent padding above and below the stones.
  const farBarrier=new Sprite(rockArt);farBarrier.width=W;farBarrier.height=100;
  farBarrier.position.set(0,-32);world.addChild(farBarrier);
  const waterTexture=new Texture({source:bg.source,frame:new Rectangle(60,548,904,300)});
  waterTile=new TilingSprite({texture:waterTexture,width:W,height:142});waterTile.position.set(0,RIVER.top+9);waterTile.tileScale.set(W/904);waterTile.alpha=.72;world.addChild(waterTile);
  waterDraw=new Graphics();scarsDraw=new Graphics();groundDraw=new Graphics();hazardLayer=new Container();debrisLayer=new Container();obstacleLayer=new Container();obstacleLayer.sortableChildren=true;pickupFlightLayer=new Container();flameLayer=new Container();jetLayer=new Container();fireSmoke=new Graphics();projectileDraw=new Graphics();world.addChild(waterDraw,scarsDraw,groundDraw,hazardLayer,debrisLayer,flameLayer,jetLayer,fireSmoke,projectileDraw,obstacleLayer,pickupFlightLayer);
  tower=new Sprite(new Texture({source:towerArt.source,frame:new Rectangle(0,0,towerArt.width,1120)}));tower.anchor.set(.5,1);tower.width=170;tower.height=TOWER_GEOMETRY.shaftHeight;
  towerMask=new Graphics();
  cap=new Sprite(capArt);cap.anchor.set(.5);cap.width=BASE_WIDTH;cap.height=BASE_HEIGHT;cap.position.set(RIVER.x,BASE_Y);
  const capCut=Math.floor(capArt.height*.525);
  capFront=new Sprite(new Texture({source:capArt.source,frame:new Rectangle(0,capCut,capArt.width,capArt.height-capCut)}));
  capFront.anchor.set(.5,0);capFront.width=BASE_WIDTH;capFront.height=BASE_HEIGHT*(capArt.height-capCut)/capArt.height;
  capFront.position.set(RIVER.x,BASE_Y-BASE_HEIGHT/2+BASE_HEIGHT*capCut/capArt.height);
  // The open art has a slightly larger opaque silhouette; match its visible bounds
  // to the closed art before revealing only the hatch inside the fixed outer shell.
  openCap=new Sprite(openCapArt);openCap.anchor.set(.5);openCap.width=BASE_WIDTH*(1154/1198);openCap.height=BASE_HEIGHT*(711/733);openCap.position.set(RIVER.x,BASE_Y+1);openCap.alpha=0;
  const hatchMask=new Graphics().ellipse(RIVER.x,BASE_Y-21,61,32).fill(0xffffff);
  openCap.mask=hatchMask;
  hatchContainer=new Container();
  for(const sprite of [hatchCurrent=new Sprite(hatchFrames[0]),hatchNext=new Sprite(hatchFrames[1])]){
    sprite.anchor.set(.5);sprite.width=BASE_WIDTH;sprite.height=BASE_HEIGHT;sprite.position.set(RIVER.x,BASE_Y);
    hatchContainer.addChild(sprite);
  }
  hatchContainer.alpha=0;
  const hatchSpriteMask=new Graphics().ellipse(RIVER.x,BASE_Y-21,59,30).fill(0xffffff);
  hatchContainer.mask=hatchSpriteMask;
  frontProjectileDraw=new Graphics();
  world.addChild(cap,openCap,hatchMask,hatchContainer,hatchSpriteMask,tower,towerMask,capFront,frontProjectileDraw);tower.mask=towerMask;
  towerWater=new Graphics();baseWaterDraw=new Graphics();baseVentDraw=new Graphics();baseLightDraw=new Graphics();muzzleDraw=new Graphics();shieldGlass=new Sprite(createShieldGlass());shieldGlass.anchor.set(.5);shieldGlass.visible=false;shieldDraw=new Graphics();aerialProjectileDraw=new Graphics();aerialSpriteLayer=new Container();world.addChild(towerWater,baseWaterDraw,baseVentDraw,baseLightDraw,aerialProjectileDraw,aerialSpriteLayer);
  for(const side of [-1,1]){
    const x=RIVER.x+side*TOWER_GEOMETRY.fireVentOffsetX,y=TOWER_GEOMETRY.fireVentY;
    baseVentDraw.ellipse(x-side*3,y+2,17,11).fill({color:0x121d20,alpha:.96});
    baseVentDraw.ellipse(x-side*3,y,13,8).stroke({color:0xa5793e,width:2,alpha:.9});
    baseVentDraw.ellipse(x,y,8,5).fill({color:0x45291f,alpha:.95});
  }
  for(let i=0;i<2;i++){const s=new Sprite(textures[i*4]);s.anchor.set(.5);soldiers.push(s);obstacleLayer.addChild(s);}
  for(let i=0;i<2;i++){const s=new Sprite(deathFrames[i][0]);s.anchor.set(.5);s.visible=false;corpses.push(s);obstacleLayer.addChild(s);}
  stunDraw=new Graphics();world.addChild(stunDraw);
  // The front surface of the bubble must veil a fighter or corpse behind it.
  world.addChild(muzzleDraw,shieldGlass,shieldDraw);
  // The lower wall covers only a fighter's feet at the back edge.
  const nearBarrier=new Sprite(rockArt);nearBarrier.width=W;nearBarrier.height=100;
  nearBarrier.position.set(W,H-78);nearBarrier.scale.x*=-1;world.addChild(nearBarrier);
  draw=new Graphics();joystickDraw=new Graphics();app.stage.addChild(draw,joystickDraw);
  $('start').disabled=false;$('start').textContent='PLAY AGAIN';$('menu-play').disabled=false;$('menu-play').textContent='VS COMPUTER · PLAY';
  let accumulator=0,hudTime=0;
  app.ticker.add(ticker=>{
    const dt=Math.min(ticker.deltaMS/1000,.05);
    if(started&&!paused&&!game.finished){
      input.x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      input.y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
      if(stick){input.x=stick.dx/43;input.y=stick.dy/43;}
      accumulator+=dt;
      while(accumulator>=1/120){game.update(1/120,input);input.dodge=false;accumulator-=1/120;}
      const damageByPlayer=[0,0];
      for(const event of game.events){
        if(event.type==='damage'){damageByPlayer[event.player]+=event.amount;continue;}
        if(event.type==='shot')sound.play(event.weapon,event.x);
        else if(event.type!=='rise'&&event.type!=='lower')sound.play(event.type,event.x);
        if(event.type==='pickup'&&event.player===0)toast(event.ammoAdded?`${WEAPONS[event.weapon].name} +${event.ammoAdded} AMMO`:`${WEAPONS[event.weapon].name} COLLECTED`);
        if(event.type==='pickup'&&event.player===1){const label=$('opponent-toast');label.textContent=event.ammoAdded?`${WEAPONS[event.weapon].name} +${event.ammoAdded} AMMO`:`${WEAPONS[event.weapon].name} ACQUIRED`;label.style.opacity=1;label.dataset.until=String(performance.now()+1600);}
        if(event.type==='stun'&&event.player===0)toast(`STUNNED · ${GRENADE_STUN_DURATION.toFixed(1)}S`);
        if(event.type==='stun'&&event.player===1){const label=$('opponent-toast');label.textContent='STUNNED';label.style.opacity=1;label.dataset.until=String(performance.now()+1800);}
      }
      damageByPlayer.forEach((amount,playerId)=>{if(amount>0)showDamage(playerId,amount);});
      game.events=[];
      sound.burn(game.flames.length>0);
      sound.tower(game.tower.phase,game.tower.height,game.tower.progress);
    } else accumulator=0;
    if(performance.now()>Number($('opponent-toast').dataset.until||0))$('opponent-toast').style.opacity=0;
    if(game.finished&&!finishedShown){
      finishedShown=true;sceneDirty=true;clearInput();sound.stop();
      const won=game.winner===0,drawn=game.winner==='draw';
      $('overlay').classList.add('result');document.querySelector('.game-unit').classList.add('ended');
      const outcome=drawn?'DRAW':won?'VICTORY':'DEFEAT';
      const omen=drawn?'The Tower spared neither of you.':won?'The Tower took the other. You remain.':'The Tower took you. The other remains.';
      showOverlay(drawn?'BOTH<br><em>FELL.</em>':won?'YOU<br><em>ADAPTED.</em>':'YOU<br><em>FELL.</em>',`${outcome} · ${Math.floor(game.time)} seconds · ${game.players[0].shots} shots fired · ${game.launches} tower drops`,'PLAY AGAIN',omen);
    }
    const animating=started&&!paused&&!game.finished;
    if(animating||sceneDirty){render();if(!animating)updateHud();sceneDirty=false;}
    hudTime+=dt;if(animating&&hudTime>.05){updateHud();hudTime=0;}
    if(performance.now()>toastUntil&&$('toast').style.opacity!=='0')$('toast').style.opacity=0;
    if(!animating){app.renderer.render(app.stage);app.ticker.stop();}
  });
  // Read-only diagnostics for development and reproducible manual QA.
  if(import.meta.env.DEV)window.arcana={snapshot:()=>JSON.parse(JSON.stringify({time:game.time,started,paused,finished:game.finished,players:game.players,tower:game.tower,pickups:game.pickups,bullets:game.bullets.length,flames:game.flames.length})),renderer:app.renderer.type};
}
boot().catch(error=>{console.error(error);$('menu').classList.add('hidden');$('overlay').classList.remove('hidden');$('overlay-title').textContent='LOAD FAILED';$('overlay-copy').textContent=import.meta.env.DEV?String(error):'The game could not load its graphics. Please reload in a browser with WebGL enabled.';$('start').textContent='RELOAD';$('start').disabled=false;$('start').onclick=()=>location.reload();});
