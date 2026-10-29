import { Application, Assets, Sprite, Texture, Rectangle, Graphics, Container, TilingSprite } from 'pixi.js';
import { Match, WEAPONS, DROP_TYPES, GAME_MODES, MAPS, MAP_TYPES, W, H, RIVER, BANK_BOUNDS, GRENADE_ARC_HEIGHT, GRENADE_STUN_DURATION, LASER_CHARGE_TIME, DODGE_DURATION, DODGE_COOLDOWN, BLAST_RADIUS, BARREL_BLAST_RADIUS, HAZARD_RULES, EAGLE_FLIGHT, HAIL_CLUSTER, SANDSTORM_WAVE_GAP, sandstormCovers } from './model.js';
import { Sound } from './audio.js';
import {PLATFORM_GEOMETRY,platformPose,platformContactEdgeY,platformContactSway} from './platform.js';
import { CHARACTERS, CHARACTER_BY_ID, resolveLineup } from './characters.js';
import { isolatedRollFrames } from './roll-sprites.js';
import { fighterFacing, fighterMotion, WALK_SEQUENCE } from './fighter-animation.js';
import { directShotDepth, laserDepthSegments } from './projectile-depth.js';
import { ashCloudVisuals } from './phase5-visuals.js';
import './style.css';
import './hud.css';
import './arcana.css';
import './compact-landscape.css';
import './phase3.css';
import './phase4.css';
import './phase5.css';
import './phase7.css';

const $=id=>document.getElementById(id);
const sound=new Sound();
let game=new Match(),started=false,starting=false,countdownElapsed=0,countdownStage='',countdownSuspended=false,paused=false,finishedShown=false;
let selectedMode=GAME_MODES.RANDOM,selectedWeapon=null,selectedMap=MAPS.RIVERSIDE;
let selectedFormat='1v1',selectedCharacter='elias',lineupSelections={opponent:'random',teammate:'random',opponent2:'random'},resolvedLineup=null;
try {const saved=localStorage.getItem('tower-deal-character-v1');if(CHARACTER_BY_ID[saved])selectedCharacter=saved;}catch { /* Storage is optional. */ }
const input={x:0,y:0,pistol:false,special:false,dodge:false};
const keys=new Set(),firePointers={pistol:null,special:null};let stick=null,toastUntil=0;
const PISTOL_AUTO_HOLD_MS=500;
const PISTOL_PREF_KEY='tower-deal-auto-pistol-v1';
let pistolAutoOnStart=true;
try {const saved=localStorage.getItem(PISTOL_PREF_KEY);if(saved!==null)pistolAutoOnStart=saved==='true';}
catch { /* Private browsing may deny storage. */ }
let pistolAuto=false,pistolHoldStart=0,pistolHoldTimer=null,pistolCancelKeyUntilRelease=false;
let pistolHintTimer=null;
let textures=[],flameFrames=[],blastFrames=[],platformFrames=[],launchFxFrames=[],wasteFrames=[],mushroomFrames=[],crateFrames=[],barrelFrames=[],laserTexture,stunLauncherTexture,stunGrenadeTexture,missileLauncherTexture,missileTexture,nuclearLauncherTexture,nuclearGrenadeTexture,syringeTexture,app,world,draw,projectileDraw,fighterFrontProjectileDraw,frontProjectileDraw,aerialProjectileDraw,rearAerialSpriteLayer,aerialSpriteLayer,groundDraw,scarsDraw,stunDraw,marksDrawnRevision=-1,waterDraw,waterTile,platformContactDraw,muzzleDraw,fireSmoke,flameLayer,jetLayer,hazardLayer,debrisLayer,obstacleLayer,groundBlastLayer,pickupFlightLayer,joystickDraw,screenHitDraw,platformSprite,platformBlendSprite,soldiers=[],corpses=[],dropSprites=new Map(),aerialSprites=new Map(),wasteSprites=new Map(),obstacleSprites=new Map(),platformAttackSprites=new Map(),flameSprites=[],jetSprites=[],blastSprites=new Map(),launchFxSprites=new Map();
const characterFrames=new Map();
const characterSideFrames=new Map();
const characterRollFrames=new Map();
const characterDeathFrames=new Map();
let arenaGroups={},waterTiles={},farBarrier,nearBarrier,rockBarrierTexture,snowBarrierTexture,volcanoVents=[],volcanicRockTexture,tornadoFrames=[],lightningFrames=[],mudTexture,ashCloudTexture,lavaProjectileFrames=[],lavaPoolFrames=[],burningRockFlightFrames=[],burningRockGroundFrames=[],rockCoolingFrames=[],mudLayer,environmentGround,environmentSky,lightningLayer,ashCloudLayer,ashPuffs=[],ashVentPuffs=[],rockFlightSprites=new Map(),tornadoSprites=new Map(),lightningSprites=new Map(),volcanicFireSprites=new Map(),mudSprites=new Map();
let phase6Frames={},phase6Sprites=new Map(),phase6WeatherLayer,phase6WeatherDraw,sandstormSprites=[];
let sceneDirty=true;
const BASE_Y=PLATFORM_GEOMETRY.y;
const PLATFORM_SIDE_FOAM_RISE=8;
// Fighters are tall sprites anchored at their center; sort by their boots, not their torso.
const FIGHTER_DEPTH_OFFSET=36;
const DEATH_FRAME_STEP=.18,DEATH_BLEND=.12;
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
function shotGraphics(depth){return depth==='rear'?projectileDraw:depth==='between'?fighterFrontProjectileDraw:frontProjectileDraw;}
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
  lightning:{fill:0x0c4e9e,halo:0x0b73dd,edge:0x69d8ff,spark:0xa1eeff,center:0xc2f7ff},
  icicle:{fill:0x215d78,halo:0x64c8ed,edge:0xb8efff,spark:0xe1faff,center:0xffffff},
  fire:{fill:0x9b3215,halo:0xe75517,edge:0xffa045,spark:0xffd675,center:0xffedac},
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
function hidePistolHint(){
  if(pistolHintTimer!==null)clearTimeout(pistolHintTimer);
  pistolHintTimer=null;$('pistol-hint').classList.remove('visible');$('pistol-hint').setAttribute('aria-hidden','true');
}
function showPistolHint(message,duration=2600){
  hidePistolHint();
  const hint=$('pistol-hint');hint.textContent=message;hint.setAttribute('aria-hidden','false');hint.classList.add('visible');
  pistolHintTimer=setTimeout(hidePistolHint,duration);
}
function syncPistolButton(){
  const button=$('pistol-fire'),held=firePointers.pistol!==null||keys.has('Space');
  button.classList.toggle('auto',pistolAuto);
  button.classList.toggle('pressed',held||pistolAuto);
  button.setAttribute('aria-pressed',String(pistolAuto));
  button.setAttribute('aria-label',pistolAuto?'Stop automatic pistol fire':'Fire pistol; hold to enable automatic fire');
  $('pistol-label').textContent=pistolAuto?'AUTO':'PISTOL';
}
function cancelPistolHoldTimer(){if(pistolHoldTimer!==null)clearTimeout(pistolHoldTimer);pistolHoldTimer=null;}
function armPistolAuto(){
  if(pistolHoldStart)return;
  pistolHoldStart=performance.now();
  pistolHoldTimer=setTimeout(()=>{
    pistolHoldTimer=null;
    if(!started||paused||game.finished||game.ending>0||!(firePointers.pistol!==null||keys.has('Space')))return;
    pistolAuto=true;input.pistol=true;syncPistolButton();showPistolHint('AUTO ON · TAP TO STOP');
  },PISTOL_AUTO_HOLD_MS);
}
function stopPistolAuto(){pistolAuto=false;input.pistol=firePointers.pistol!==null||keys.has('Space');syncPistolButton();showPistolHint('AUTO OFF · HOLD TO RESTART');}
function releaseFire(mode,cancel=false){
  const held=firePointers[mode]!==null||keys.has(mode==='pistol'?'Space':'KeyE');
  const player=game.players[0];
  if(mode==='special'&&!cancel&&input.special&&!held&&!paused&&started&&player.slot?.type==='laser')game.fire(player,player.charge,'special');
  if(mode==='pistol'){
    if(!held){
      cancelPistolHoldTimer();
      if(cancel)pistolAuto=false;
      else if(!pistolAuto&&pistolHoldStart&&performance.now()-pistolHoldStart>=PISTOL_AUTO_HOLD_MS){pistolAuto=true;showPistolHint('AUTO ON · TAP TO STOP');}
      pistolHoldStart=0;
    }
    input.pistol=held||pistolAuto;syncPistolButton();return;
  }
  input[mode]=held;
  if(mode==='special'&&!held)player.charge=0;
  $(`${mode}-fire`).classList.toggle('pressed',held);
}
function clearInput(preservePistolAuto=false){
  const keepAuto=preservePistolAuto&&pistolAuto;
  cancelPistolHoldTimer();hidePistolHint();pistolAuto=keepAuto;pistolHoldStart=0;pistolCancelKeyUntilRelease=false;
  keys.clear();stick=null;firePointers.pistol=null;firePointers.special=null;
  input.x=0;input.y=0;input.pistol=keepAuto&&!paused;input.special=false;input.dodge=false;game.players[0].charge=0;
  syncPistolButton();$('special-fire').classList.remove('pressed');
}
function clearSpriteMap(map){for(const sprite of map.values())sprite.destroy({children:true});map.clear();}
const menuPanels=['menu-home','format-panel','mode-panel','weapon-panel','map-panel','map-deal-panel','deal-panel','lineup-panel','settings-panel'];
const MAP_ART={riverside:'art/arena.png',storm:'art/arena-storm.webp',magma:'art/arena-magma.webp',desert:'art/phase6/arena-desert.webp',snow:'art/phase6/arena-snow.webp'};
let dealTimer=null,dealRun=0,mapDealTimer=null,mapDealRun=0;
function cancelDealAnimation(){
  dealRun++;
  if(dealTimer!==null)clearTimeout(dealTimer);
  dealTimer=null;
  $('deal-preview').classList.remove('rolling');
  $('menu-open').disabled=false;
}
function cancelMapDealAnimation(){
  mapDealRun++;
  if(mapDealTimer!==null)clearTimeout(mapDealTimer);
  mapDealTimer=null;
  $('map-deal-preview').classList.remove('rolling');
  $('menu-open').disabled=false;
}
function showMenuPanel(id){
  if(id!=='deal-panel')cancelDealAnimation();
  if(id!=='map-deal-panel')cancelMapDealAnimation();
  for(const panel of menuPanels)$(panel).classList.toggle('hidden',panel!==id);
}
function setWeaponPicture(icon,type){
  icon.className='weapon-picture';
  icon.classList.add(({pistol:'atlas-icon',rifle:'atlas-icon',shotgun:'atlas-icon',laser:'laser-icon',grenade:'stun-icon',missile:'missile-icon',nuclear:'nuclear-icon'})[type]);
  icon.dataset.weapon=type;
  clearWeaponIconFit(icon);
  if(WEAPON_ART_BOUNDS[type])requestAnimationFrame(()=>{if(icon.dataset.weapon===type)fitWeaponIcon(icon,type);});
}
function showDealWeapon(type){
  $('deal-weapon-name').textContent=WEAPONS[type].name;
  setWeaponPicture($('deal-preview').querySelector('.weapon-picture'),type);
}
function animateDeal(){
  cancelDealAnimation();
  sound.init();
  const run=dealRun,chosen=game.fixedWeapon,start=Math.floor(Math.random()*DROP_TYPES.length);
  const preview=$('deal-preview'),status=$('deal-status');
  preview.classList.remove('settled');preview.classList.add('rolling');
  preview.setAttribute('aria-live','off');
  $('menu-open').disabled=true;
  status.textContent='THE TOWER IS DEALING…';
  const countDown=remaining=>{
    if(run!==dealRun)return;
    if(remaining===0){dealTimer=null;beginMatch();return;}
    status.textContent=`MATCH STARTS IN ${remaining}`;
    dealTimer=setTimeout(()=>countDown(remaining-1),900);
  };
  let step=0;
  const tick=()=>{
    if(run!==dealRun)return;
    if(step===17){
      dealTimer=null;preview.classList.remove('rolling');preview.classList.add('settled');
      preview.setAttribute('aria-live','polite');showDealWeapon(chosen);
      sound.play('dealSettle');
      countDown(3);
      return;
    }
    let type=DROP_TYPES[(start+step)%DROP_TYPES.length];
    if(step>=15&&type===chosen)type=DROP_TYPES[(start+step+1)%DROP_TYPES.length];
    showDealWeapon(type);
    sound.play('dealTick',undefined,1+step*.012);
    dealTimer=setTimeout(tick,55+step*step*.7);
    step++;
  };
  tick();
}
function showDealMap(map){
  const picture=$('map-deal-picture');
  picture.className=`map-thumb ${map}`;
  picture.style.backgroundImage=`url("${import.meta.env.BASE_URL}${MAP_ART[map]}")`;
  $('map-deal-name').textContent=map.toUpperCase();
}
function animateMapDeal(chosen,onReady=openLineup){
  cancelMapDealAnimation();
  sound.init();
  const run=mapDealRun,start=Math.floor(Math.random()*MAP_TYPES.length);
  const preview=$('map-deal-preview'),status=$('map-deal-status');
  preview.classList.remove('settled');preview.classList.add('rolling');
  preview.setAttribute('aria-live','off');
  $('menu-open').disabled=true;
  status.textContent='THE TOWER IS CHOOSING…';
  let step=0;
  const tick=()=>{
    if(run!==mapDealRun)return;
    if(step===17){
      mapDealTimer=null;preview.classList.remove('rolling');preview.classList.add('settled');
      preview.setAttribute('aria-live','polite');showDealMap(chosen);
      sound.play('dealSettle');
      status.textContent=onReady===openLineup?'LINEUP IN 2':'MATCH STARTS IN 2';
      mapDealTimer=setTimeout(()=>{
        if(run!==mapDealRun)return;
        status.textContent=onReady===openLineup?'LINEUP IN 1':'MATCH STARTS IN 1';
        mapDealTimer=setTimeout(()=>{if(run===mapDealRun)onReady(chosen);},900);
      },900);
      return;
    }
    let map=MAP_TYPES[(start+step)%MAP_TYPES.length];
    if(step>=15&&map===chosen)map=MAP_TYPES[(start+step+1)%MAP_TYPES.length];
    showDealMap(map);
    sound.play('dealTick',undefined,1+step*.012);
    mapDealTimer=setTimeout(tick,55+step*step*.7);
    step++;
  };
  tick();
}
function configureArena(){
  for(const [map,group] of Object.entries(arenaGroups))group.visible=map===game.map;
  waterTile=waterTiles[game.map];
  if(farBarrier){
    farBarrier.texture=nearBarrier.texture=game.map===MAPS.SNOW?snowBarrierTexture:rockBarrierTexture;
    farBarrier.width=nearBarrier.width=W;farBarrier.height=nearBarrier.height=100;
    farBarrier.scale.x=Math.abs(farBarrier.scale.x);nearBarrier.scale.x=-Math.abs(nearBarrier.scale.x);
    farBarrier.tint=nearBarrier.tint=game.map===MAPS.STORM?0x8bacc2:game.map===MAPS.MAGMA?0xc78e78:game.map===MAPS.DESERT?0xd4aa68:0xffffff;
  }
  for(const vent of volcanoVents)vent.visible=game.map===MAPS.MAGMA;
}
function prepareMatch(mapOverride=null){
  cancelDealAnimation();
  cancelMapDealAnimation();
  sound.stop();
  const map=mapOverride||selectedMap;
  game=new Match(Math.random,{mode:selectedMode,weapon:selectedWeapon,map,format:selectedFormat,lineup:resolvedLineup});configureArena();marksDrawnRevision=-1;sceneDirty=true;started=false;starting=false;paused=false;finishedShown=false;clearInput();
  document.querySelectorAll('.damage-number').forEach(label=>label.remove());
  $('overlay').classList.add('hidden');$('overlay').classList.remove('result');$('pause').textContent='Ⅱ';
  document.querySelector('.game-unit').classList.remove('ended','paused');
  document.querySelector('.game-unit').classList.add('menu-open');
  for(const map of [dropSprites,aerialSprites,wasteSprites,obstacleSprites,blastSprites,launchFxSprites,rockFlightSprites,tornadoSprites,lightningSprites,volcanicFireSprites,mudSprites,phase6Sprites,platformAttackSprites])clearSpriteMap(map);
  for(const sprite of sandstormSprites)sprite.visible=false;
  for(const sprite of [...flameSprites,...jetSprites])sprite.visible=false;
  toastUntil=0;$('toast').style.opacity=0;
  document.querySelectorAll('.opponent-toast').forEach(label=>{label.style.opacity=0;label.dataset.until='0';});
  updateHud();app.ticker.start();
}
function beginMatch(){
  cancelDealAnimation();
  cancelMapDealAnimation();
  started=false;starting=true;countdownElapsed=0;countdownStage='ready';countdownSuspended=false;sceneDirty=true;sound.init();clearInput();
  $('match-countdown').hidden=false;$('match-countdown').classList.remove('fight');$('countdown-word').textContent='READY!';
  $('menu').classList.add('hidden');$('overlay').classList.add('hidden');
  document.querySelector('.game-unit').classList.remove('ended','paused','menu-open');
  document.querySelector('.game-unit').classList.add('counting-down');$('pause').disabled=true;
  sound.play('ready');
  updateHud();app.ticker.start();
}
function finishCountdown(){
  starting=false;started=true;countdownStage='';sceneDirty=true;
  $('match-countdown').hidden=true;document.querySelector('.game-unit').classList.remove('counting-down');$('pause').disabled=false;
  pistolAuto=pistolAutoOnStart;input.pistol=pistolAuto;syncPistolButton();
  showPistolHint(pistolAuto?'AUTO ON · TAP TO STOP\nHOLD TO RESTART':'TAP TO FIRE · HOLD FOR AUTO',5200);
}
function reset(){
  if(selectedMap==='random'){
    const chosen=MAP_TYPES[Math.floor(Math.random()*MAP_TYPES.length)];
    $('overlay').classList.add('hidden');$('menu').classList.remove('hidden');
    document.querySelector('.game-unit').classList.add('menu-open');
    showMenuPanel('map-deal-panel');animateMapDeal(chosen);
    return;
  }
  openLineup(selectedMap);
}
function replay(){
  resolvedLineup=resolveLineup(Math.random,selectedCharacter,selectedFormat,lineupSelections);
  if(selectedMap==='random'){
    const chosen=MAP_TYPES[Math.floor(Math.random()*MAP_TYPES.length)];
    $('overlay').classList.add('hidden');$('menu').classList.remove('hidden');
    document.querySelector('.game-unit').classList.add('menu-open');
    showMenuPanel('map-deal-panel');animateMapDeal(chosen,startPreparedMatch);
  }else startPreparedMatch(selectedMap);
}
let revealedMap=MAPS.RIVERSIDE;
function openLineup(map){
  revealedMap=map;
  $('lineup-map').textContent=`${map.toUpperCase()} · ${selectedFormat.toUpperCase()} · ${selectedMode.replaceAll('-',' ').toUpperCase()}`;
  renderLineup();showMenuPanel('lineup-panel');$('menu').classList.remove('hidden');
}
function renderLineup(){
  const choices=$('lineup-choices');
  const slots=selectedFormat==='2v2'?['teammate','opponent','opponent2']:['opponent'];
  const previousScroll=Object.fromEntries([...choices.querySelectorAll('.lineup-options')].map(row=>[row.dataset.slot,row.scrollLeft]));
  choices.replaceChildren();
  const player=document.createElement('div');player.className='lineup-player';
  const playerPortrait=document.createElement('span');playerPortrait.className=`character-portrait ${selectedCharacter}`;playerPortrait.setAttribute('aria-hidden','true');
  const playerName=document.createElement('span');playerName.textContent=`YOU · ${CHARACTER_BY_ID[selectedCharacter].name}`;
  player.append(playerPortrait,playerName);choices.appendChild(player);
  for(const slot of slots){
    const name=({teammate:'TEAMMATE',opponent:selectedFormat==='2v2'?'OPPONENT 1':'OPPONENT',opponent2:'OPPONENT 2'})[slot];
    const section=document.createElement('section');section.className='lineup-slot';
    const heading=document.createElement('h3');heading.textContent=name;section.appendChild(heading);
    const row=document.createElement('div');row.className='lineup-options';row.dataset.slot=slot;row.setAttribute('role','group');row.setAttribute('aria-label',`Choose ${name.toLowerCase()}`);
    for(const character of [{id:'random',name:'Random',color:'#e9bb70'},...CHARACTERS]){
      if(character.id===selectedCharacter)continue;
      const picked=lineupSelections[slot]||'random';
      const taken=character.id!=='random'&&slots.some(other=>other!==slot&&lineupSelections[other]===character.id);
      const button=document.createElement('button');button.type='button';button.className='lineup-option';button.dataset.character=character.id;
      button.style.setProperty('--character-color',character.color);button.setAttribute('aria-pressed',String(picked===character.id));
      button.setAttribute('aria-label',`${character.name} for ${name.toLowerCase()}${taken?' (already chosen)':''}`);
      button.disabled=taken;
      const portrait=document.createElement('span');portrait.className=character.id==='random'?'lineup-random':`character-portrait ${character.id}`;
      portrait.textContent=character.id==='random'?'?':'';portrait.setAttribute('aria-hidden','true');
      const label=document.createElement('strong');label.textContent=character.name;
      button.append(portrait,label);
      button.addEventListener('click',()=>{
        lineupSelections[slot]=character.id;$('lineup-error').textContent='';renderLineup();
        const selected=choices.querySelector(`.lineup-options[data-slot="${slot}"] [data-character="${character.id}"]`);
        selected?.focus({preventScroll:true});
      });
      row.appendChild(button);
    }
    section.appendChild(row);choices.appendChild(section);row.scrollLeft=previousScroll[slot]||0;
  }
}
function startPreparedMatch(map){
  prepareMatch(map);
  if(selectedMode===GAME_MODES.RANDOM_FIXED){
    showMenuPanel('deal-panel');$('menu').classList.remove('hidden');
    animateDeal();
  }else beginMatch();
}
function pause(){if(!started||game.finished)return;paused=!paused;sceneDirty=true;clearInput(true);document.querySelector('.game-unit').classList.toggle('paused',paused);if(paused){sound.stop();showOverlay('TAKE A<br><em>BREATHER.</em>','The fight will wait.','RESUME');app.ticker.stop();}else{$('overlay').classList.add('hidden');sound.init();app.ticker.start();}$('pause').textContent=paused?'▶':'Ⅱ';}
function showOverlay(title,copy,button,omen=''){$('overlay-title').innerHTML=title;$('overlay-omen').textContent=omen;$('overlay-omen').hidden=!omen;$('overlay-copy').textContent=copy;$('start').textContent=button;$('overlay').classList.remove('hidden');}
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+1700;$('toast').style.opacity=1;}
function fighterToast(playerId,text,duration=1600){
  let label=playerId===1?$('opponent-toast'):$(`fighter-${playerId}-toast`);
  if(!label){label=document.createElement('div');label.id=`fighter-${playerId}-toast`;label.className='opponent-toast';$('arena').appendChild(label);}
  label.textContent=text;label.style.opacity=1;label.dataset.until=String(performance.now()+duration);
}
function showNumber(playerId,amount,healing=false){
  const p=game.players[playerId],label=document.createElement('span');
  label.className=`damage-number${p.bank===1?' opponent':''}${healing?' heal-number':''}`;
  label.textContent=`${healing?'+':'-'}${Math.max(1,Math.round(amount))}`;
  label.setAttribute('aria-hidden','true');
  label.style.left=`${(p.x+25)/W*100}%`;
  label.style.top=`${(p.y+(p.bank===1?36:-20))/H*100}%`;
  label.addEventListener('animationend',()=>label.remove(),{once:true});
  $('arena').appendChild(label);
}
$('start').addEventListener('click',()=>{if(paused)pause();else replay();});
$('pause').addEventListener('click',pause);
function openMenu(){cancelDealAnimation();cancelMapDealAnimation();started=false;starting=false;paused=false;sceneDirty=true;clearInput();sound.stop();app.ticker.stop();document.querySelectorAll('.damage-number').forEach(label=>label.remove());document.querySelector('.game-unit').classList.remove('paused','counting-down');document.querySelector('.game-unit').classList.add('menu-open');$('match-countdown').hidden=true;$('pause').disabled=false;$('overlay').classList.add('hidden');$('menu').classList.remove('hidden');showMenuPanel('menu-home');}
$('menu-play').addEventListener('click',()=>showMenuPanel('format-panel'));
document.querySelectorAll('.format-choice').forEach(button=>button.addEventListener('click',()=>{selectedFormat=button.dataset.format;showMenuPanel('mode-panel');}));
$('format-back').addEventListener('click',()=>showMenuPanel('menu-home'));
$('mode-back').addEventListener('click',()=>showMenuPanel('format-panel'));
$('weapon-back').addEventListener('click',()=>showMenuPanel('mode-panel'));
$('weapon-start').addEventListener('click',()=>{if(selectedWeapon)showMenuPanel('map-panel');});
$('map-back').addEventListener('click',()=>showMenuPanel(selectedMode===GAME_MODES.CHOOSE_FIXED?'weapon-panel':'mode-panel'));
$('lineup-back').addEventListener('click',()=>showMenuPanel('map-panel'));
$('lineup-start').addEventListener('click',()=>{
  try{resolvedLineup=resolveLineup(Math.random,selectedCharacter,selectedFormat,lineupSelections);$('lineup-error').textContent='';startPreparedMatch(revealedMap);}
  catch{$('lineup-error').textContent='Each fighter must be different. Choose another character.';}
});
document.querySelectorAll('.map-choice').forEach(button=>button.addEventListener('click',()=>{selectedMap=button.dataset.map;reset();}));
function refreshWeaponChoices(){
  for(const button of $('weapon-choices').children){
    button.classList.toggle('selected',button.dataset.weapon===selectedWeapon);
    button.setAttribute('aria-pressed',String(button.dataset.weapon===selectedWeapon));
    if(WEAPON_ART_BOUNDS[button.dataset.weapon])fitWeaponIcon(button.querySelector('.weapon-picture'),button.dataset.weapon);
  }
  $('weapon-start').disabled=!selectedWeapon;
}
function buildWeaponChoices(){
  for(const type of DROP_TYPES){
    const button=document.createElement('button'),picture=document.createElement('span'),name=document.createElement('span');
    button.type='button';button.className='weapon-choice';button.dataset.weapon=type;
    picture.setAttribute('aria-hidden','true');name.textContent=WEAPONS[type].name;
    button.append(picture,name);$('weapon-choices').appendChild(button);
    setWeaponPicture(picture,type);
    button.addEventListener('click',()=>{selectedWeapon=type;refreshWeaponChoices();});
  }
  refreshWeaponChoices();
}
document.querySelectorAll('#mode-panel .mode-choice').forEach(button=>button.addEventListener('click',()=>{
  selectedMode=button.dataset.mode;
  if(selectedMode===GAME_MODES.CHOOSE_FIXED){showMenuPanel('weapon-panel');requestAnimationFrame(refreshWeaponChoices);}
  else showMenuPanel('map-panel');
}));
$('menu-open').addEventListener('click',openMenu);
$('result-menu').addEventListener('click',openMenu);
$('menu-settings').addEventListener('click',()=>showMenuPanel('settings-panel'));
$('settings-back').addEventListener('click',()=>showMenuPanel('menu-home'));
function renderCharacterChoices(){
  const list=$('character-choices');list.replaceChildren();
  for(const character of CHARACTERS){
    const button=document.createElement('button');button.type='button';button.className='character-choice';
    button.dataset.character=character.id;button.setAttribute('aria-pressed',String(character.id===selectedCharacter));
    button.style.setProperty('--character-color',character.color);
    const portrait=document.createElement('span');portrait.className=`character-portrait ${character.id}`;portrait.setAttribute('aria-hidden','true');
    const name=document.createElement('strong');name.textContent=character.name;
    button.append(portrait,name);button.addEventListener('click',()=>{
      selectedCharacter=character.id;
      for(const slot of ['teammate','opponent','opponent2'])if(lineupSelections[slot]===selectedCharacter)lineupSelections[slot]='random';
      try{localStorage.setItem('tower-deal-character-v1',selectedCharacter);}catch { /* Storage is optional. */ }
      renderCharacterChoices();
    });list.appendChild(button);
  }
}
renderCharacterChoices();
document.addEventListener('click',event=>{
  const button=event.target.closest('button');
  if(!button||button.disabled||!button.closest('#menu, #overlay, .game-top'))return;
  sound.init();sound.play('menuClick');
});
function syncSoundSettings(){
  for(const id of ['sound','settings-sound'])$(id).textContent=sound.muted?'SOUND OFF':'SOUND ON';
  $('sound').setAttribute('aria-label',sound.muted?'Enable sound':'Mute sound');
}
function toggleSound(){sound.toggle();syncSoundSettings();}
$('sound').addEventListener('click',toggleSound);$('settings-sound').addEventListener('click',toggleSound);
$('auto-pistol').checked=pistolAutoOnStart;
$('auto-pistol').addEventListener('change',event=>{
  pistolAutoOnStart=event.target.checked;
  try {localStorage.setItem(PISTOL_PREF_KEY,String(pistolAutoOnStart));}catch { /* Keep the choice for this session. */ }
  sound.init();sound.play('menuClick');
});
syncSoundSettings();
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
    if(mode==='pistol'&&pistolAuto){stopPistolAuto();return;}
    if(mode==='special'&&!game.players[0].slot){sound.play('empty');return;}
    const wasFiring=input[mode];firePointers[mode]=e.pointerId;button.setPointerCapture(e.pointerId);input[mode]=true;
    if(mode==='pistol')armPistolAuto();
    if(!wasFiring&&(mode==='pistol'||game.weapon(game.players[0])!=='laser'))game.fire(game.players[0],0,mode);
    if(mode==='pistol')syncPistolButton();else button.classList.add('pressed');
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
  if(mode==='pistol'&&pistolCancelKeyUntilRelease)return;
  if(mode==='pistol'&&pistolAuto){if(!e.repeat){pistolCancelKeyUntilRelease=true;stopPistolAuto();}return;}
  if(mode==='special'&&!game.players[0].slot){if(!e.repeat)sound.play('empty');return;}
  const wasFiring=mode&&input[mode];keys.add(e.code);
  if(mode&&(mode==='pistol'||game.players[0].slot)){
    input[mode]=true;
    if(mode==='pistol')armPistolAuto();
    if(!wasFiring&&!e.repeat&&(mode==='pistol'||game.weapon(game.players[0])!=='laser'))game.fire(game.players[0],0,mode);
    if(mode==='pistol')syncPistolButton();else $(`${mode}-fire`).classList.add('pressed');
  }
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space'){pistolCancelKeyUntilRelease=false;releaseFire('pistol');}if(e.code==='KeyE')releaseFire('special');});
function pauseOnFocusLoss(){
  if(starting){countdownSuspended=true;clearInput();app.ticker.stop();return;}
  if(started&&!paused&&!game.finished)pause();
  else clearInput(paused);
}
window.addEventListener('blur',pauseOnFocusLoss);
window.addEventListener('focus',()=>{if(starting&&!document.hidden){countdownSuspended=false;app.ticker.start();}});
document.addEventListener('visibilitychange',()=>{if(document.hidden)pauseOnFocusLoss();else if(starting){countdownSuspended=false;app.ticker.start();}});
window.addEventListener('resize',()=>{
  sceneDirty=true;
  // The ticker sleeps on menu, pause, and result screens; redraw their HUD once
  // so a phone rotation also refits weapon icons and the opponent badge.
  if(app?.ticker&&!app.ticker.started&&!countdownSuspended)app.ticker.start();
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
  special.setAttribute('aria-label',slot?`Fire ${WEAPONS[slot.type].name}, ${slot.ammo} shots remaining`:'No special weapon');
  special.style.setProperty('--meter-color',slot?`#${WEAPONS[slot.type].color.toString(16).padStart(6,'0')}`:'#e9bb70');
  $('special-meter').style.strokeDasharray=`${slot?Math.max(0,Math.min(100,slot.ammo/(slot.ammoReceived??WEAPONS[slot.type].ammo)*100)):0} 100`;
  $('special-ammo').textContent=slot?slot.ammo:'';
  $('special-label').textContent=slot?.type==='laser'?(p.charge>=1?'RELEASE':p.charge>0?`${Math.round(p.charge*100)}%`:'HOLD'):slot?'SPECIAL':'EMPTY';
  $('charge').style.height=slot?.type==='laser'?`${p.charge*100}%`:'0';
  for(const type of ['laser','grenade','missile','nuclear'])specialArt.classList.toggle(({grenade:'stun',laser:'laser',missile:'missile',nuclear:'nuclear'})[type]+'-icon',slot?.type===type);
  specialArt.classList.toggle('atlas-icon',slot?.type==='rifle'||slot?.type==='shotgun');
  if(slot&&WEAPON_ART_BOUNDS[slot.type])fitWeaponIcon(specialArt,slot.type);else clearWeaponIconFit(specialArt);
  $('health-value').textContent=Math.ceil(p.hp);updateHealth('player-hp',p.hp);updateHealth('opponent-hp',enemy.hp);
  const hud=$('opponent-hud'),playerHud=$('player-hud');
  playerHud.style.display=p.hp>0?'flex':'none';
  hud.style.display=enemy.hp>0&&game.canSee(p,enemy,true)?'flex':'none';
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
  for(const fighter of game.players.slice(2)){
    const label=$(`fighter-${fighter.id}-toast`);
    if(label){label.style.left=`${fighter.x/W*100}%`;label.style.top=`${(fighter.y+40)/H*100}%`;}
  }
  $('opponent-hud').dataset.name=`ENEMY · ${CHARACTER_BY_ID[enemy.characterId]?.name||''}`;
  $('player-hud').querySelector('.player-hud-label').firstChild.textContent=`YOU · ${CHARACTER_BY_ID[p.characterId]?.name||''} `;
  for(const fighter of game.players.slice(2)){
    const id=`fighter-${fighter.id}-hp`;
    let hud=$(`fighter-${fighter.id}-hud`);
    if(!hud){
      hud=document.createElement('div');hud.id=`fighter-${fighter.id}-hud`;hud.className='opponent-hud phase7-fighter-hud';
      const name=document.createElement('span');name.className='phase7-fighter-name';hud.appendChild(name);
      const hp=document.createElement('div');hp.id=id;hp.className='health-segments';hp.setAttribute('role','progressbar');hp.setAttribute('aria-label',`${fighter.team===0?'Ally':'Enemy'} health`);hp.setAttribute('aria-valuemin','0');hp.setAttribute('aria-valuemax','100');
      const cells=Array.from({length:20},()=>{const cell=document.createElement('span');cell.className='health-cell';const fill=document.createElement('i');cell.appendChild(fill);hp.appendChild(cell);return fill;});
      healthCells.set(id,cells);hud.appendChild(hp);
      const badge=document.createElement('div');badge.className='opponent-weapon phase7-weapon';
      const picture=document.createElement('span'),chargeLabel=document.createElement('span'),chargeTrack=document.createElement('span');
      chargeLabel.className='opponent-charge-label';chargeLabel.textContent='CHARGING';chargeTrack.className='opponent-charge-track';chargeTrack.appendChild(document.createElement('i'));
      badge.append(picture,chargeLabel,chargeTrack);hud.appendChild(badge);
      $('arena').appendChild(hud);
    }
    hud.querySelector('.phase7-fighter-name').textContent=`${fighter.team===0?'ALLY':'ENEMY'} · ${CHARACTER_BY_ID[fighter.characterId]?.name||''}`;
    hud.style.display=fighter.hp>0&&(fighter.team===p.team||game.canSee(p,fighter,true))?'flex':'none';
    updateHealth(id,fighter.hp);
    const badge=hud.querySelector('.phase7-weapon'),type=game.weapon(fighter),picture=badge.firstElementChild;
    if(picture.dataset.weapon!==type)setWeaponPicture(picture,type);
    badge.classList.toggle('charging',type==='laser'&&fighter.charge>0);
    badge.classList.toggle('laser-white',type==='laser'&&fighter.charge>0&&laserWhitePhase(game.time,fighter.charge>=1));
    badge.title=WEAPONS[type].name;badge.setAttribute('aria-label',`${fighter.team===0?'Ally':'Enemy'} equipped weapon: ${WEAPONS[type].name}`);
    badge.querySelector('.opponent-charge-track i').style.width=`${fighter.charge*100}%`;
  }
  for(const id of [2,3])if(!game.players[id]&&$(`fighter-${id}-hud`))$(`fighter-${id}-hud`).style.display='none';
  syncHudPositions();
}
function syncHudPositions(){
  const scale=$('arena').clientWidth/W;
  for(const fighter of game.players){
    const hud=$(fighter.id===0?'player-hud':fighter.id===1?'opponent-hud':`fighter-${fighter.id}-hud`);
    if(!hud)continue;
    hud.style.setProperty('--hud-scale',scale);
    hud.style.left=`${Math.max(50,Math.min(W-50,fighter.x))/W*100}%`;
    hud.style.top=`${(fighter.y-(fighter.id===0?38:30))/H*100}%`;
  }
}
function sheetLoop(time,fps,count){const span=count*2-2,step=Math.floor(time*fps)%span;return step<count?step:span-step;}
function pickupLook(type){
  const art=type==='syringe'?syringeTexture:type==='laser'?laserTexture:type==='grenade'?stunLauncherTexture:type==='missile'?missileLauncherTexture:type==='nuclear'?nuclearLauncherTexture:textures[WEAPONS[type].frame];
  const [width,height,lift,shadowWidth,shadowY]={
    syringe:[68,47,6,18,7],laser:[66,27,4,26,8],missile:[58,29,7,24,8],
    grenade:[56,37,7,23,10],nuclear:[60,40,7,23,10],rifle:[62,62,0,21,12],shotgun:[62,62,0,21,12],
  }[type];
  return {art,width,height,lift,shadowWidth,shadowY};
}
function renderPhase6Environment(){
  phase6WeatherDraw.clear();
  const active=new Set();
  const sprite=(key,frames,layer,x,y,w,h,frame,alpha=1)=>{
    active.add(key);
    let item=phase6Sprites.get(key);
    if(!item){item=new Sprite(frames[0]);item.anchor.set(.5);layer.addChild(item);phase6Sprites.set(key,item);}
    if(item.parent!==layer)layer.addChild(item);
    item.texture=frames[Math.max(0,Math.min(frames.length-1,frame))];
    item.position.set(x,y);item.width=w;item.height=h;item.alpha=alpha;
    return item;
  };
  if(game.map===MAPS.DESERT){
    const storm=game.sandstorm;
    for(let i=0;i<sandstormSprites.length;i++){
      const cloud=sandstormSprites[i];cloud.visible=!!storm;
      if(storm){
        const lane=i%3,wave=Math.floor(i/6);
        // Each wave has an aligned duplicate for density; the trailing wave
        // extends the storm without a hard rectangular front.
        cloud.texture=phase6Frames.sandstorm[sheetLoop(storm.age+lane*.23-wave*.18,8,6)];
        cloud.position.set(W*(lane+.5)/3,storm.y-wave*storm.direction*SANDSTORM_WAVE_GAP+(lane%2?26:-18));
        cloud.width=W*.53;cloud.height=210;
        cloud.alpha=.68+Math.sin(storm.age*5+lane)*.05;
      }
    }
    if(storm)for(let i=0;i<18;i++){
      const drift=Math.sin(storm.age*2.1+i*1.7)*13;
      const lane=i%9,wave=Math.floor(i/9);
      const x=(lane+.5)*W/9+Math.sin(storm.age*.9+i)*11;
      const y=storm.y-wave*storm.direction*SANDSTORM_WAVE_GAP+(lane%3-1)*35+drift;
      phase6WeatherDraw.ellipse(x,y,43+i%3*12,36+i%4*9).fill({color:0xb78b52,alpha:.06});
    }
    for(const patch of game.quicksand){
      const blend=patch.open*2,step=Math.min(1,Math.floor(blend)),fraction=blend-step;
      const frames=[3,1,2],width=patch.radius*2.5,height=patch.radius*1.75;
      sprite(`sand-${patch.id}`,phase6Frames.quicksand,hazardLayer,patch.x,patch.y,width,height,frames[step],1-fraction);
      if(fraction>.01)sprite(`sand-transition-${patch.id}`,phase6Frames.quicksand,hazardLayer,patch.x,patch.y,width,height,frames[step+1],fraction);
    }
    for(const eagle of game.eagles){
      const {approach,dive,recover,retreat}=EAGLE_FLIGHT;
      const firstImpact=approach+dive,secondStart=firstImpact+recover,secondImpact=secondStart+dive;
      const first=eagle.target1||{x:eagle.anchorX,y:eagle.anchorY},second=eagle.target2||first;
      const fromX=eagle.entrySide<0?-40:W+40,approachX=Math.max(50,Math.min(W-50,eagle.anchorX+eagle.entrySide*75));
      const recoverX=Math.max(50,Math.min(W-50,first.x-eagle.entrySide*75));
      const ease=t=>t*t*(3-2*t),mix=(a,b,t)=>a+(b-a)*ease(t);
      let flightX,flightY,scale,alpha=1,shadow=null,shadowProgress=0,shadowFade=1;
      if(eagle.age<approach){
        const t=eagle.age/approach;
        flightX=mix(fromX,approachX,t);flightY=mix(eagle.anchorY-135,eagle.anchorY-110,t);scale=.52+.18*t;
      }else if(eagle.age<firstImpact){
        const t=(eagle.age-approach)/dive;
        flightX=mix(approachX,first.x,t);flightY=mix(eagle.anchorY-110,first.y-25,t);scale=.7+.3*t;
        shadow=first;shadowProgress=t;shadowFade=Math.min(1,t*8);
      }else if(eagle.age<secondStart){
        const t=(eagle.age-firstImpact)/recover;
        flightX=mix(first.x,recoverX,t);flightY=mix(first.y-25,first.y-110,t);scale=1-.3*t;
        if(t<.25){shadow=first;shadowProgress=1;shadowFade=1-t*4;}
      }else if(eagle.age<secondImpact){
        const t=(eagle.age-secondStart)/dive;
        flightX=mix(recoverX,second.x,t);flightY=mix(first.y-110,second.y-25,t);scale=.7+.3*t;
        shadow=second;shadowProgress=t;shadowFade=Math.min(1,t*8);
      }else{
        const t=Math.min(1,(eagle.age-secondImpact)/retreat),exitX=eagle.entrySide<0?W+100:-100;
        flightX=mix(second.x,exitX,t);flightY=mix(second.y-25,second.y-95,t);scale=1-.3*t;
        if(t<.2){shadow=second;shadowProgress=1;shadowFade=1-t*5;}
      }
      if(shadow){
        const radius=61-32*shadowProgress;
        for(let ring=0;ring<4;ring++)environmentGround.ellipse(shadow.x,shadow.y,radius*(1-ring*.15),radius*(1-ring*.15)*.68)
          .fill({color:0x17130b,alpha:(.09+shadowProgress*.06)*shadowFade});
        environmentGround.ellipse(shadow.x,shadow.y,radius,radius*.68).stroke({color:0x422b17,width:1.5,alpha:(.2+shadowProgress*.3)*shadowFade});
      }
      const bird=sprite(`eagle-${eagle.id}`,phase6Frames.eagle,lightningLayer,flightX,flightY,90*scale,85*scale,sheetLoop(eagle.age,12,6),alpha);
      bird.scale.x=Math.abs(bird.scale.x)*(eagle.entrySide<0?1:-1);
      bird.rotation=Math.sin(eagle.age*3)*.1;
    }
    for(const lure of game.mirages){
      if(lure.state==='sun'){
        phase6WeatherDraw.rect(0,0,W,H).fill({color:0xffd56d,alpha:.075+.065*Math.sin(lure.age*9)});
      }else if(lure.state==='lure'){
        sprite(`mirage-${lure.id}`,phase6Frames.mirage,hazardLayer,lure.x,lure.y,86,66,sheetLoop(game.time,8,4),.35);
        const look=pickupLook(lure.type);
        groundDraw.ellipse(lure.x,lure.y+look.shadowY,look.shadowWidth,5).fill({color:0x121a18,alpha:.4});
        sprite(`bait-${lure.id}`,[look.art],obstacleLayer,lure.x,lure.y+Math.sin(game.time*3+lure.id)*2-look.lift,look.width,look.height,0,.94+.06*Math.sin(game.time*.8+lure.id)).zIndex=lure.y+19;
      }else{
        const frame=lure.state==='strike'?Math.min(4,Math.floor(lure.strikeAge*14)):5;
        sprite(`scorpion-${lure.id}`,phase6Frames.scorpion,obstacleLayer,lure.x,lure.y,90,86,frame,lure.state==='retreat'?Math.max(0,1-lure.strikeAge/.6):1).zIndex=lure.y+19;
      }
    }
  }else{
    for(const cloud of sandstormSprites)cloud.visible=false;
    for(const patch of game.icePatches){
      sprite(`ice-${patch.id}`,phase6Frames.ice,hazardLayer,patch.x,patch.y,patch.radius*2.55,patch.radius*1.75,sheetLoop(game.time+patch.id*.21,2,4),.92);
    }
    for(const avalanche of game.avalanches){
      if(avalanche.age<avalanche.warning)continue;
      for(let part=0;part<3;part++){
        const wall=sprite(`avalanche-${avalanche.id}-${part}`,phase6Frames.avalanche,lightningLayer,
          avalanche.x+(part-1)*155,avalanche.y-avalanche.direction*58,210,175,
          sheetLoop(avalanche.age-avalanche.warning+part*.11,9,4));
        wall.scale.y=Math.abs(wall.scale.y)*(avalanche.direction>0?1:-1);
      }
    }
    const drawnHailClouds=new Set();
    for(const pellet of game.hail){
      if(pellet.age<pellet.start)continue;
      const cloudId=pellet.cloudId??pellet.id;
      if(!drawnHailClouds.has(cloudId)){
        drawnHailClouds.add(cloudId);
        const direction=pellet.direction||1;
        const startX=direction>0?-HAIL_CLUSTER.entry:W+HAIL_CLUSTER.entry;
        const endX=direction>0?W+HAIL_CLUSTER.entry:-HAIL_CLUSTER.entry;
        const progress=Math.max(0,Math.min(1,(pellet.age-(pellet.cloudStart??pellet.start))/((pellet.cloudLife??pellet.life)-(pellet.cloudStart??pellet.start))));
        const cloudX=startX+(endX-startX)*progress;
        sprite(`hail-cloud-${cloudId}`,phase6Frames.hailCloud,lightningLayer,cloudX,(pellet.cloudY??pellet.y)-125,280,170,sheetLoop(pellet.age,6,4),.94);
      }
      const markerStart=pellet.warning-HAIL_CLUSTER.fall;
      const markerEnd=pellet.warning+HAIL_CLUSTER.stagger*(HAIL_CLUSTER.offsets.length-1);
      if(pellet.age>=markerStart&&pellet.age<markerEnd){
        const fade=Math.min(1,(pellet.age-markerStart)/.12);
        const pulse=(.75+.15*Math.sin(game.time*8+pellet.id))*fade;
        const r=HAIL_CLUSTER.radius;
        environmentGround.ellipse(pellet.x,pellet.y,r+6,r*.78+5)
          .fill({color:0x397da5,alpha:.22*fade})
          .stroke({color:0x387ca5,width:4,alpha:.6*pulse});
        environmentGround.ellipse(pellet.x,pellet.y,r,r*.78)
          .fill({color:0x7bc8e8,alpha:.25*fade})
          .stroke({color:0xe5fbff,width:2.2,alpha:.9*pulse});
        for(const [dx,dy] of HAIL_CLUSTER.offsets)
          environmentGround.ellipse(pellet.x+dx,pellet.y+dy,2.4,1.8).fill({color:0x1d678c,alpha:.8*fade});
      }
      for(let index=0;index<HAIL_CLUSTER.offsets.length;index++){
        const [dx,dy]=HAIL_CLUSTER.offsets[index];
        const impactAt=pellet.warning+index*HAIL_CLUSTER.stagger;
        if(pellet.age<impactAt-HAIL_CLUSTER.fall||pellet.age>=impactAt+.42)continue;
        const frame=pellet.age<impactAt
          ?Math.min(3,Math.floor((pellet.age-impactAt+HAIL_CLUSTER.fall)/HAIL_CLUSTER.fall*4))
          :Math.min(5,4+Math.floor((pellet.age-impactAt)/.21));
        const alpha=pellet.age>impactAt+.26?Math.max(0,(impactAt+.42-pellet.age)/.16):1;
        sprite(`hail-icicle-${pellet.id}-${index}`,phase6Frames.hailIcicle,lightningLayer,
          pellet.x+dx,pellet.y+dy-39,42,78,frame,alpha);
      }
    }
    for(let i=0;i<110;i++){
      const x=(i*73+game.time*(14+i%5*6))%(W+30)-15,y=(i*157+game.time*(64+i%7*10))%(H+40)-20;
      const radius=1.1+i%4*.22;
      phase6WeatherDraw.circle(x+.5,y+.5,radius+.4).fill({color:0x577e99,alpha:.2});
      phase6WeatherDraw.circle(x,y,radius).fill({color:0xffffff,alpha:.55+i%4*.07});
    }
    for(const avalanche of game.avalanches)if(avalanche.age<avalanche.warning){
      const bank=BANK_BOUNDS[avalanche.owner];
      const intensity=Math.min(1,avalanche.age/.85);
      const depth=bank.maxY-bank.minY;
      for(let i=0;i<130;i++){
        const x=(i*97+game.time*(19+i%4*5)+W*4)%W;
        const drift=(i*71+game.time*(78+i%5*9))%depth;
        const y=avalanche.direction>0?bank.minY+drift:bank.maxY-drift;
        const radius=1.4+i%5*.2;
        const alpha=(.43+i%4*.08)*intensity;
        phase6WeatherDraw.circle(x+.5,y+.5,radius+.45).fill({color:0x5685a4,alpha:alpha*.43});
        phase6WeatherDraw.circle(x,y,radius).fill({color:0xffffff,alpha});
        if(i%5===0)phase6WeatherDraw.moveTo(x-1,y-avalanche.direction*3).lineTo(x,y).stroke({color:0xffffff,width:.8,alpha:alpha*.75});
      }
    }
  }
  for(const [key,item] of phase6Sprites)if(!active.has(key)){item.destroy();phase6Sprites.delete(key);}
}
function renderPlatformAttacks(){
  const live=new Set();
  const attackSprite=(key,frames,anchorY)=>{
    live.add(key);
    let sprite=platformAttackSprites.get(key);
    if(!sprite){sprite=new Sprite(frames[0]);sprite.anchor.set(.5,anchorY);jetLayer.addChild(sprite);platformAttackSprites.set(key,sprite);}
    return sprite;
  };
  for(const attack of game.platformAttacks){
    if(attack.age<0)continue;
    const progress=Math.min(1,attack.age/attack.warning);
    const endX=attack.sourceX+attack.dx*attack.maxReach,endY=attack.sourceY+attack.dy*attack.maxReach;
    if(!attack.hit){
      const color=AREA_COLORS[attack.type];
      const pulse=.68+.22*Math.sin(game.time*13+attack.id);
      environmentGround.moveTo(attack.sourceX,attack.sourceY).lineTo(endX,endY)
        .stroke({color:color.fill,width:attack.type==='fire'?25:20,alpha:(.1+.1*progress)*pulse});
      environmentGround.moveTo(attack.sourceX,attack.sourceY).lineTo(endX,endY)
        .stroke({color:color.edge,width:2,alpha:(.4+.4*progress)*pulse});
      for(let d=95;d<attack.maxReach;d+=85){
        const x=attack.sourceX+attack.dx*d,y=attack.sourceY+attack.dy*d;
        environmentGround.ellipse(x,y,3,2).fill({color:color.center,alpha:.65*pulse});
      }
    }
    if(attack.type==='fire'||!attack.hit||attack.reach<8)continue;
    const tipX=attack.sourceX+attack.dx*attack.reach,tipY=attack.sourceY+attack.dy*attack.reach;
    const fade=Math.max(0,Math.min(1,(attack.life-attack.age)/.35));
    if(attack.type==='lightning'){
      const sprite=attackSprite(`lightning-${attack.id}`,lightningFrames,1);
      sprite.texture=lightningFrames[Math.floor((attack.age-attack.warning)*16)%lightningFrames.length];
      sprite.position.set(tipX,tipY);sprite.width=74;sprite.height=attack.reach;
      sprite.rotation=Math.atan2(-attack.dx,attack.dy);
      sprite.alpha=fade;
    }else{
      environmentGround.moveTo(attack.sourceX,attack.sourceY).lineTo(tipX,tipY)
        .stroke({color:0x62c8f0,width:5,alpha:.32*fade});
      for(let d=24,index=0;d<=attack.reach;d+=32,index++){
        const sprite=attackSprite(`icicle-${attack.id}-${index}`,phase6Frames.hailIcicle,.68);
        sprite.texture=phase6Frames.hailIcicle[1+Math.floor(game.time*10+index)%3];
        sprite.position.set(attack.sourceX+attack.dx*d,attack.sourceY+attack.dy*d);
        sprite.width=54;sprite.height=73;sprite.rotation=Math.atan2(-attack.dx,attack.dy);
        sprite.alpha=fade*(.86+.12*Math.sin(game.time*11-index));
      }
    }
  }
  for(const [id,sprite] of platformAttackSprites)if(!live.has(id)){sprite.destroy();platformAttackSprites.delete(id);}
}
function renderEnvironment(){
  environmentGround.clear();environmentSky.clear();
  for(const puff of [...ashPuffs,...ashVentPuffs])puff.visible=false;
  if(game.map!==MAPS.DESERT&&game.map!==MAPS.SNOW){phase6WeatherDraw.clear();for(const cloud of sandstormSprites)cloud.visible=false;}
  if(game.map===MAPS.RIVERSIDE){renderPlatformAttacks();return;}
  if(game.map===MAPS.DESERT||game.map===MAPS.SNOW){renderPhase6Environment();return;}
  if(game.map===MAPS.STORM){
    const liveMud=new Set();
    for(const patch of game.mud){
      liveMud.add(patch.id);
      let sprite=mudSprites.get(patch.id);
      if(!sprite){sprite=new Sprite(mudTexture);sprite.anchor.set(.5);sprite.width=patch.radius*2.6;sprite.height=patch.radius*1.7;mudLayer.addChild(sprite);mudSprites.set(patch.id,sprite);}
      sprite.position.set(patch.x,patch.y);sprite.alpha=.94+.05*Math.sin(game.time*2+patch.id);
      environmentGround.ellipse(patch.x,patch.y,patch.radius*1.2,patch.radius*.82).stroke({color:0x8caeb7,width:1,alpha:.24+.07*Math.sin(game.time*3+patch.id)});
    }
    for(const [id,sprite] of mudSprites)if(!liveMud.has(id)){sprite.destroy();mudSprites.delete(id);}
    const liveLightning=new Set();
    for(const strike of game.lightning){
      if(strike.age<strike.start)continue;
      if(strike.hit){
        liveLightning.add(strike.id);
        const fade=Math.max(0,Math.min(1,(strike.life-strike.age)/.24));
        let bolt=lightningSprites.get(strike.id);
        if(!bolt){bolt=new Sprite(lightningFrames[0]);bolt.anchor.set(.5,1);lightningLayer.addChild(bolt);lightningSprites.set(strike.id,bolt);}
        bolt.texture=lightningFrames[Math.min(lightningFrames.length-1,Math.floor((strike.age-strike.warning)*10))];
        bolt.position.set(strike.x,strike.y+12);bolt.width=127;bolt.height=195;
        bolt.alpha=fade;
        circle(environmentSky,strike.x,strike.y,30,0xa5deff,fade*.3);
      }else{
        const pulse=.55+.35*Math.sin(game.time*17+strike.id);
        environmentGround.ellipse(strike.x,strike.y,40,29).fill({color:0x16477a,alpha:.25*pulse}).stroke({color:0x9fdbff,width:3,alpha:.75*pulse});
        environmentGround.ellipse(strike.x,strike.y,26,18).stroke({color:0xe2f8ff,width:1.5,alpha:pulse});
        for(let n=0;n<5;n++){const a=n*1.26+game.time*2;circle(environmentGround,strike.x+Math.cos(a)*37,strike.y+Math.sin(a)*27,2,0xd3f5ff,pulse);}
      }
    }
    for(const [id,sprite] of lightningSprites)if(!liveLightning.has(id)){sprite.destroy();lightningSprites.delete(id);}
    const live=new Set();
    for(const vortex of game.tornadoes){
      live.add(vortex.id);
      const warning=vortex.age<vortex.warning;
      environmentGround.ellipse(vortex.x,vortex.y,warning?50:62,warning?27:35).stroke({color:0x9cb9c5,width:warning?2:3,alpha:warning?.4:.6});
      for(let segment=0;segment<4;segment++){
        const start=segment*Math.PI/2+game.time*.65+vortex.id*.3;
        for(let point=0;point<7;point++){
          const angle=start+point*.12,x=vortex.x+Math.cos(angle)*118,y=vortex.y+Math.sin(angle)*118;
          if(point===0)environmentGround.moveTo(x,y);else environmentGround.lineTo(x,y);
        }
        environmentGround.stroke({color:0xb4d4de,width:1.4,alpha:warning?.28:.21});
      }
      if(warning)continue;
      let sprite=tornadoSprites.get(vortex.id);
      if(!sprite){sprite=new Sprite(tornadoFrames[0]);sprite.anchor.set(.5,.82);obstacleLayer.addChild(sprite);tornadoSprites.set(vortex.id,sprite);}
      sprite.texture=tornadoFrames[Math.floor((vortex.age-vortex.warning)*12+vortex.id)%tornadoFrames.length];
      sprite.width=85;sprite.height=91;sprite.position.set(vortex.x,vortex.y+8);
      sprite.alpha=Math.min(1,(vortex.age-vortex.warning)*3,(vortex.life-vortex.age)*2);sprite.zIndex=vortex.y+32;
    }
    for(const [id,sprite] of tornadoSprites)if(!live.has(id)){sprite.destroy();tornadoSprites.delete(id);}
    for(let i=0;i<96;i++){
      const x=(i*79+game.time*(60+i%5*9))%(W+100)-50,y=(i*157+game.time*(250+i%7*25))%(H+70)-35;
      const length=17+i%4*3;
      phase6WeatherDraw.moveTo(x+1,y).lineTo(x-4,y+length).stroke({color:0x173c50,width:2.2,alpha:.35});
      phase6WeatherDraw.moveTo(x,y).lineTo(x-5,y+length).stroke({color:0xbde8ff,width:i%4===0?1.6:1.2,alpha:.48+i%3*.06});
    }
    return;
  }
  const liveRocks=new Set(),liveFire=new Set();
  for(const rock of game.obstacles)if(rock.type==='rock'&&!rock.destroyed&&rock.burning>0){
    const pulse=.48+.12*Math.sin(game.time*10+rock.id);
    environmentGround.ellipse(rock.x,rock.y,40,26).fill({color:0xbd3b09,alpha:.18}).stroke({color:0xff8b29,width:2.5,alpha:pulse});
  }
  for(const rock of game.rocksInFlight){
    if(rock.hit)continue;
    liveRocks.add(rock.id);
    const k=Math.min(1,rock.age/rock.warning),pulse=.55+.28*Math.sin(game.time*15+rock.id);
    environmentGround.ellipse(rock.x,rock.y,31,22).fill({color:0x6f351b,alpha:.2}).stroke({color:0xffbc6b,width:2.5,alpha:pulse});
    let sprite=rockFlightSprites.get(rock.id);
    if(!sprite){sprite=new Sprite(burningRockFlightFrames[0]);sprite.anchor.set(.5);aerialSpriteLayer.addChild(sprite);rockFlightSprites.set(rock.id,sprite);}
    sprite.texture=burningRockFlightFrames[Math.floor(rock.age*12)%burningRockFlightFrames.length];
    sprite.width=30+k*27;sprite.height=30+k*27;
    const sourceX=rock.owner===0?48:W-48;
    sprite.position.set(sourceX+(rock.x-sourceX)*k,RIVER.y+(rock.y-RIVER.y)*k-Math.sin(k*Math.PI)*130);
    sprite.rotation=k*1.5;sprite.alpha=Math.min(1,.5+k);
  }
  for(const [id,sprite] of rockFlightSprites)if(!liveRocks.has(id)){sprite.destroy();rockFlightSprites.delete(id);}
  for(const fire of game.volcanicFire){
    liveFire.add(fire.id);
    let sprite=volcanicFireSprites.get(fire.id);
    if(!sprite){sprite=new Sprite(lavaProjectileFrames[0]);sprite.anchor.set(.5);volcanicFireSprites.set(fire.id,sprite);}
    const k=Math.min(1,fire.age/fire.warning);
    if(!fire.hit){
      environmentGround.ellipse(fire.x,fire.y,35,24).fill({color:0x9d200b,alpha:.16}).stroke({color:0xff6132,width:3,alpha:.7+.2*Math.sin(game.time*16)});
      if(sprite.parent!==aerialSpriteLayer)aerialSpriteLayer.addChild(sprite);
      const sourceX=fire.owner===0?48:W-48;
      const fx=sourceX+(fire.x-sourceX)*k,fy=RIVER.y+(fire.y-RIVER.y)*k-Math.sin(k*Math.PI)*110;
      sprite.position.set(fx,fy);
      sprite.texture=lavaProjectileFrames[Math.floor(fire.age*13)%lavaProjectileFrames.length];sprite.width=37+k*12;sprite.height=42+k*9;sprite.rotation=fire.owner===0?-.18:Math.PI-.18;sprite.alpha=1;
      circle(aerialProjectileDraw,fx,fy-12,8,0xff6a20,.29);
      circle(aerialProjectileDraw,fx,fy-12,3,0xffed9a,.8);
    }else{
      // Burning lava covers broken debris while staying behind live fighters.
      if(sprite.parent!==flameLayer)flameLayer.addChild(sprite);
      sprite.texture=lavaPoolFrames[Math.floor((fire.age-fire.warning)*9)%lavaPoolFrames.length];sprite.rotation=0;sprite.position.set(fire.x,fire.y+3);
      sprite.width=91+Math.sin(game.time*8+fire.id)*3;sprite.height=49;
      const fade=Math.min(1,(fire.life-fire.age)*1.4);
      environmentGround.ellipse(fire.x,fire.y,35,25).fill({color:0x9e2609,alpha:.37*fade}).stroke({color:0xff7433,width:2,alpha:.8*fade});
      for(let n=0;n<7;n++){
        const a=n*2.4+fire.id,drift=17+5*Math.sin(game.time*4+n);
        circle(environmentGround,fire.x+Math.cos(a)*drift,fire.y+Math.sin(a)*drift*.65,2+n%2,n%2?0xffb041:0xff5924,fade*.7);
      }
      sprite.alpha=fade;
    }
  }
  for(const [id,sprite] of volcanicFireSprites)if(!liveFire.has(id)){sprite.destroy();volcanicFireSprites.delete(id);}
  if(game.ash){
    const clouds=ashCloudVisuals(game.ash);
    const strength=Math.max(0,Math.min(1,game.ash.age/.7,(2.6-game.ash.age)/.8));
    for(let owner=0;owner<2;owner++){
      const sprite=ashVentPuffs[owner];sprite.visible=true;
      sprite.position.set(owner===0?48:W-48,RIVER.y-20-Math.sin(game.time*2+owner)*4);
      sprite.width=92+Math.sin(game.time*1.9+owner)*5;sprite.height=53;
      sprite.alpha=strength*(.38+.08*Math.sin(game.time*3+owner));
    }
    for(let i=0;i<clouds.length;i++){
      const cloud=clouds[i],back=ashPuffs[i*2],front=ashPuffs[i*2+1],sway=Math.sin(game.time*1.7+i)*4;
      back.visible=true;back.position.set(cloud.x+sway-10,cloud.y+5);
      back.width=cloud.width*1.08;back.height=cloud.height*1.05;back.alpha=cloud.alpha*.82;
      front.visible=true;front.position.set(cloud.x+sway,cloud.y);
      front.width=cloud.width;front.height=cloud.height;front.alpha=cloud.alpha;
      back.rotation=front.rotation=Math.sin(game.time*.6+i)*.025;
    }
  }
}
function renderPlatformContact(){
  const wet=game.map===MAPS.RIVERSIDE||game.map===MAPS.STORM;
  if(!wet)return;
  const x=PLATFORM_GEOMETRY.x,y=BASE_Y,time=game.time;
  // The near rim is partly submerged. The wash covers only its lowest pixels;
  // side wakes stay in waterDraw behind the armor.
  platformContactDraw.moveTo(x-88,y+25);
  for(let offset=-80;offset<=80;offset+=16){
    platformContactDraw.lineTo(x+offset,y+platformContactEdgeY(time,offset));
  }
  platformContactDraw.lineTo(x+88,y+25).lineTo(x+102,y+70).lineTo(x-102,y+70).closePath()
    .fill({color:0x086071,alpha:.58});
  const sway=platformContactSway(time);
  for(const side of [-1,1]){
    waterDraw.moveTo(x+side*80,y+24-PLATFORM_SIDE_FOAM_RISE+sway)
      .quadraticCurveTo(x+side*97,y+31-PLATFORM_SIDE_FOAM_RISE+sway,x+side*85,y+39-PLATFORM_SIDE_FOAM_RISE+sway)
      .stroke({color:0x7bd8dd,width:3,alpha:.67});
    waterDraw.moveTo(x+side*92,y+30-PLATFORM_SIDE_FOAM_RISE+sway).lineTo(x+side*108,y+34-PLATFORM_SIDE_FOAM_RISE+sway)
      .stroke({color:0xd5f8ee,width:1.5,alpha:.32});
  }
  for(let index=0;index<4;index++){
    const offset=8+index*17,phase=time*3.2+index*2.1;
    const edgeY=y+platformContactEdgeY(time,offset)+4+Math.sin(phase)*.5;
    const crest=5+index%3*3;
    for(const side of [-1,1]){
      platformContactDraw.moveTo(x+side*offset,edgeY).lineTo(x+side*(offset+crest),edgeY+Math.sin(phase+.8))
        .stroke({color:index%3===0?0xe0fbf0:0x92e3df,width:index%3===0?2:1,alpha:.48+.25*Math.sin(phase)**2});
    }
  }
}
function render(){
  draw.clear();projectileDraw.clear();fighterFrontProjectileDraw.clear();frontProjectileDraw.clear();aerialProjectileDraw.clear();groundDraw.clear();stunDraw.clear();waterDraw.clear();platformContactDraw.clear();muzzleDraw.clear();fireSmoke.clear();joystickDraw.clear();screenHitDraw.clear();
  if(game.map===MAPS.DESERT){
    groundDraw.moveTo(RIVER.x-34,BASE_Y+17).lineTo(RIVER.x+34,BASE_Y+17).lineTo(RIVER.x+29,RIVER.bottom-3).lineTo(RIVER.x-29,RIVER.bottom-3).closePath().fill({color:0x292d2c,alpha:.97}).stroke({color:0x8d7251,width:2,alpha:.8});
    for(const dx of [-24,-10,10,24])groundDraw.moveTo(RIVER.x+dx,BASE_Y+31).lineTo(RIVER.x+dx,RIVER.bottom-5).stroke({color:0x9b7547,width:3,alpha:.7});
  }
  waterTile.tilePosition.x=game.time*(game.map===MAPS.MAGMA?6:game.map===MAPS.DESERT||game.map===MAPS.SNOW?0:19);
  waterTile.tilePosition.y=Math.sin(game.time*.72)*1.5;
  // A few foam crests drift with the textured current.
  for(let i=0;i<(game.map===MAPS.DESERT||game.map===MAPS.SNOW?0:15);i++){
    const y=RIVER.top+18+(i*47)%(RIVER.bottom-RIVER.top-44);
    const x=(i*97+game.time*13)%(W+45)-25;
    const length=8+(i%4)*4;
    waterDraw.moveTo(x,y).bezierCurveTo(x+length*.3,y-1,x+length*.7,y+1,x+length,y).stroke({color:game.map===MAPS.MAGMA?0xffaa42:0xb1e2cf,width:1,alpha:.11+.06*Math.sin(game.time+i)});
  }
  if(game.map===MAPS.MAGMA){
    const pulse=.22+.08*Math.sin(game.time*3);
    waterDraw.ellipse(RIVER.x,BASE_Y+20,82,27).stroke({color:0xff7327,width:4,alpha:pulse});
    waterDraw.ellipse(RIVER.x,BASE_Y+22,91,31).stroke({color:0xffbd56,width:1.5,alpha:pulse*.8});
    if(game.platform.phase!=='idle')for(let i=0;i<7;i++){
      const side=i%2?1:-1,x=RIVER.x+side*(32+i*3),y=BASE_Y-10-(game.time*25+i*37)%45;
      circle(waterDraw,x,y,1+i%2,0xff8e37,.3+.16);
    }
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
    if(!sprite){sprite=new Sprite(obstacle.type==='rock'?volcanicRockTexture:(obstacle.type==='crate'?crateFrames:barrelFrames)[0]);sprite.anchor.set(.5);layer.addChild(sprite);obstacleSprites.set(obstacle.id,sprite);}
    else if(sprite.parent!==layer)layer.addChild(sprite);
    const crate=obstacle.type==='crate',rock=obstacle.type==='rock',frames=crate?crateFrames:barrelFrames;
    const coolingFrame=Math.min(rockCoolingFrames.length-1,Math.floor((1-(obstacle.cooling||0)/HAZARD_RULES.rockCoolingDuration)*rockCoolingFrames.length));
    sprite.texture=rock?(obstacle.burning>0&&!obstacle.destroyed?burningRockGroundFrames[Math.floor(game.time*9+obstacle.id)%burningRockGroundFrames.length]:obstacle.cooling>0&&!obstacle.destroyed?rockCoolingFrames[coolingFrame]:volcanicRockTexture):frames[obstacle.destroyed?(crate?2:obstacle.flash>0?1:2):crate&&obstacle.hits>0?1:0];
    sprite.width=rock?(obstacle.destroyed?34:obstacle.burning>0||obstacle.cooling>0?87:57):crate?40:44;sprite.height=rock?(obstacle.destroyed?24:obstacle.burning>0||obstacle.cooling>0?73:49):crate?40:54;
    sprite.position.set(obstacle.x,obstacle.y+(rock?-3:crate?3:-5));sprite.zIndex=obstacle.destroyed?-1:obstacle.y+(crate?16:17);
    const obstacleDepth=obstacle.y+(crate?16:17);
    sprite.alpha=rock&&obstacle.destroyed ? .55 : !obstacle.destroyed&&game.players.some(player=>player.hp>0&&player.y+FIGHTER_DEPTH_OFFSET<obstacleDepth&&player.y>obstacle.y-(crate?30:38)&&Math.abs(player.x-obstacle.x)<(crate?22:20)) ? .68 : 1;
  }
  for(const [id,sprite] of obstacleSprites)if(!liveObstacles.has(id)){sprite.destroy();obstacleSprites.delete(id);}
  const platformState=game.platform;
  const platformArt=platformPose(platformState.phase,platformState.progress);
  platformSprite.texture=platformFrames[platformArt.from];
  platformBlendSprite.texture=platformFrames[platformArt.to];
  platformBlendSprite.alpha=platformArt.blend;
  if(game.map===MAPS.RIVERSIDE||game.map===MAPS.STORM){
    waterDraw.ellipse(PLATFORM_GEOMETRY.x,BASE_Y+27,98,40).fill({color:0x073c48,alpha:.28});
    const strength=platformState.phase==='idle'?.25:.48;
    for(const side of [-1,1]){
      for(let wake=0;wake<3;wake++){
        const progress=(game.time*.55+wake/3)%1;
        const x=RIVER.x+side*(83+progress*30),sway=Math.sin(game.time*2.2+wake)*2;
        waterDraw.moveTo(x-side*9,BASE_Y+21-PLATFORM_SIDE_FOAM_RISE+sway+wake*8).lineTo(x+side*8,BASE_Y+22-PLATFORM_SIDE_FOAM_RISE+sway+wake*8)
          .stroke({color:0xc7f7ef,width:1.5,alpha:(1-progress)*strength});
      }
    }
  }else if(game.map===MAPS.SNOW){
    waterDraw.ellipse(RIVER.x,BASE_Y+20,92,28).stroke({color:0xe1f7ff,width:2,alpha:.38});
  }else if(game.map===MAPS.MAGMA){
    waterDraw.ellipse(RIVER.x,BASE_Y+22,88,27)
      .stroke({color:0xff8e31,width:3,alpha:.25+.09*Math.sin(game.time*3)});
  }
  renderPlatformContact();
  const activeLane=game.platformAttacks.find(attack=>!attack.hit&&attack.age>=0);
  const indicatorColor=activeLane?AREA_COLORS[activeLane.type].edge:0xffb553;
  const indicatorAlpha=platformState.phase==='idle'?.08+.07*Math.sin(game.time*2.5)**2:.12+.2*Math.sin(game.time*10)**2;
  for(const vent of PLATFORM_GEOMETRY.attackVents){
    muzzleDraw.ellipse(vent.x,vent.y,7,3).fill({color:indicatorColor,alpha:indicatorAlpha});
  }
  let jetCount=0;
  for(const f of game.flames){
    const alpha=f.endAge===null?1:Math.max(0,1-(f.age-f.endAge)/.34);
    if(alpha<=0)continue;
    // Fixed vents keep the ignition point attached to the platform.
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
    const look=pickupLook(item.type);
    active.add(item.id);let s=dropSprites.get(item.id);
    if(!s){s=new Sprite(look.art);s.anchor.set(.5);s.width=look.width;s.height=look.height;pickupFlightLayer.addChild(s);dropSprites.set(item.id,s);}
    // Airborne drops cross above the platform and fighters; landed drops share their ground-depth
    // order with soldiers and cover. They stay visible at the landing point.
    const layer=item.flight>0?pickupFlightLayer:obstacleLayer;
    if(s.parent!==layer)layer.addChild(s);
    let x=item.x,y=item.y;
    if(item.flight>0){const k=1-item.flight/(item.flightDuration||.75);x=item.sx+(item.x-item.sx)*k;y=item.sy+(item.y-item.sy)*k-Math.sin(k*Math.PI)*(item.arcHeight||70);s.rotation=Math.sin(k*Math.PI)*(item.source==='crate'?.24:.6);}
    else{s.rotation=0;s.zIndex=item.y+19;groundDraw.ellipse(x,y+look.shadowY,look.shadowWidth,5).fill({color:0x121a18,alpha:.4});y+=Math.sin(game.time*3+item.id)*2-look.lift;}
    s.position.set(x,y);s.visible=true;s.alpha=item.flight>0||item.ttl>3||Math.floor(item.ttl*6)%2===0?1:.22;
  }
  for(const [id,s] of dropSprites)if(!active.has(id)){s.destroy();dropSprites.delete(id);}
  for(const p of game.players){
    const s=soldiers[p.id],frames=characterFrames.get(p.characterId),facing=fighterFacing(p.bank);
    const corpse=corpses[p.id];
    if(p.hp>0){
      const motion=fighterMotion(p),rolling=motion.pose==='roll',walking=motion.walking,sideways=motion.pose==='side';
      // Two planted poses between alternating steps stop the feet from skating.
      const frame=walking?WALK_SEQUENCE[motion.step]:motion.pose==='fire'?3:0;
      const hazardTint=p.burning>0?0xff5750:p.radiated>0?0x80ff68:null;
      const hazardBlink=Math.sin(game.time*21+p.id*.4)>0;
      const rollFrame=rolling?Math.min(3,Math.floor((1-p.dodgeTime/DODGE_DURATION)*4)):0;
      const actionFrames=p.bank===0?frames.specialNorth:frames.specialSouth;
      const sideArt=characterSideFrames.get(p.characterId);
      const pose=motion.pose==='stun'?actionFrames[3]:motion.pose==='hurt'?actionFrames[2]:motion.pose==='fire'?(p.lastShotSpecial?actionFrames[0]:frames[facing][3]):sideways?sideArt.frames[motion.step]:motion.pose==='charge'&&p.characterId!=='tomas'?actionFrames[1]:frames[facing][frame];
      s.visible=true;s.texture=rolling?characterRollFrames.get(p.characterId)[p.dodgeDir][rollFrame]:pose;s.position.set(p.x,p.y-(walking&&frame!==0?1:0));s.width=rolling?68:sideways?sideArt.width:78;s.height=rolling?68:78;s.scale.x=Math.abs(s.scale.x)*(sideways&&p.lastMoveX<0?-1:1);s.rotation=0;s.alpha=1;s.tint=rolling?0xffffff:p.laserHit>0?(Math.sin(game.time*42)>0?0xff3038:0xffffff):hazardTint?(hazardBlink?hazardTint:0xffffff):p.hurt>0?0xffaaa0:0xffffff;s.zIndex=p.y+FIGHTER_DEPTH_OFFSET;
      corpse.visible=false;
      // Roll poses touch the ground directly; the standing oval looks detached beside them.
      if(!rolling)groundDraw.ellipse(p.x,p.y+25,17,5).fill({color:0x17221b,alpha:.4});
      if(game.map===MAPS.SNOW&&!rolling&&p.moving&&(p.onIce||p.iceSlip>0)){
        const vx=p.lastMoveX,vy=p.lastMoveY,sideX=-vy,sideY=vx;
        const burst=Math.min(1,p.iceSpray/.26);
        for(const side of [-1,1]){
          const x=p.x+sideX*side*7-vx*7,y=p.y+22+sideY*side*4-vy*7;
          groundDraw.moveTo(x,y).lineTo(x-vx*19,y-vy*19).stroke({color:0x4c7892,width:2.2,alpha:.66});
          groundDraw.moveTo(x+sideX,y-1).lineTo(x-vx*13+sideX,y-vy*13-1).stroke({color:0xe5faff,width:1.1,alpha:.82});
        }
        for(let i=0;i<7;i++){
          const drift=10+i*4,spread=(i-3)*(2.2+burst);
          const x=p.x-vx*drift+sideX*spread,y=p.y+19-vy*drift+sideY*spread;
          groundDraw.circle(x,y,1.2+(i%2)*.6+burst*.6).fill({color:i%2?0x7bb3cd:0xffffff,alpha:.32+burst*.42});
        }
      }
      if(game.weapon(p)==='laser'&&p.charge>0){
        const power=p.charge,ready=power>=1,white=laserWhitePhase(game.time,ready);
        const dotX=p.x+(p.bank===0?5:-5),dotY=p.y-10;
        circle(draw,dotX,dotY,6+power*3,white?0xffe9e4:0xff1631,ready?.35:.24);
        circle(draw,dotX,dotY,3+power*1.5,white?0xffffff:0xff263d,1);
        if(p.id===0){
          draw.roundRect(p.x-19,p.y-36,38,6,2).fill({color:0x220c10,alpha:.9});
          draw.roundRect(p.x-18,p.y-35,36*power,4,1).fill({color:white?0xffffff:ready?0xff5262:0xff263d,alpha:1});
        }
      }
    }else{
      const age=p.deathAge,blue=p.bank===0,death=characterDeathFrames.get(p.characterId),deathFacing=blue?'north':'south';
      const frame=Math.min(3,Math.floor(age/DEATH_FRAME_STEP));
      const next=Math.min(3,frame+1);
      const blend=frame===next?1:Math.min(1,(age-frame*DEATH_FRAME_STEP)/DEATH_BLEND);
      const progress=Math.min(1,age/.65),slide=1-(1-progress)*(1-progress);
      const x=p.x+(blue?10:6)*slide,y=p.y+(blue?12:7)*slide;
      const pose=(sprite,index,alpha)=>{
        const art=death[deathFacing][index];
        sprite.texture=art.texture;
        sprite.width=art.width;sprite.height=art.height;
        sprite.position.set(x,y);sprite.rotation=0;sprite.alpha=alpha;sprite.tint=0xffffff;
      };
      s.visible=frame<3&&blend<1;
      if(s.visible)pose(s,frame,1-blend);
      corpse.visible=true;pose(corpse,next,blend);corpse.zIndex=p.y+FIGHTER_DEPTH_OFFSET;
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
  // The pool always has four sprites, but 1v1 uses only the first two.
  for(let i=game.players.length;i<soldiers.length;i++){
    soldiers[i].visible=false;
    corpses[i].visible=false;
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
      const layer=game.players[b.owner].bank===0&&b.t<.055?rearAerialSpriteLayer:aerialSpriteLayer;
      if(sprite.parent!==layer)layer.addChild(sprite);
      sprite.position.set(b.x,b.y-arc);
      sprite.rotation=Math.sin(b.t*9)*.16;
    }
    else{const v=Math.hypot(b.vx,b.vy),ux=b.vx/v,uy=b.vy/v;
      const missileBehindShooter=b.type==='missile'&&game.players[b.owner].bank===0&&b.travel<40;
      const shotDraw=b.type==='missile'?(missileBehindShooter?projectileDraw:aerialProjectileDraw):shotGraphics(directShotDepth(b,game.players[b.owner].bank));
      if(b.type==='missile'){
        const flight=Math.min(1,b.travel/b.targetDistance),altitude=Math.sin(flight*Math.PI)*105;
        const a=Math.atan2(uy,ux),cos=Math.cos(a),sin=Math.sin(a);
        const pt=(forward,side)=>({x:b.x+cos*forward-sin*side,y:b.y-altitude+sin*forward+cos*side});
        activeAerialProjectiles.add(b.id);
        let sprite=aerialSprites.get(b.id);
        if(!sprite){sprite=new Sprite(missileTexture);sprite.anchor.set(.5);sprite.width=34;sprite.height=13;aerialSpriteLayer.addChild(sprite);aerialSprites.set(b.id,sprite);}
        const layer=missileBehindShooter?rearAerialSpriteLayer:aerialSpriteLayer;
        if(sprite.parent!==layer)layer.addChild(sprite);
        sprite.position.set(b.x,b.y-altitude);sprite.rotation=a;
        circle(shotDraw,pt(-18,0).x,pt(-18,0).y,5,0xff992e,.85);
        for(let n=0;n<3;n++)circle(shotDraw,pt(-20-n*7,Math.sin(game.time*16+n)*3).x,pt(-20-n*7,Math.sin(game.time*16+n)*3).y,4+n,0xb8ad95,.35-n*.08);
      }else{line(shotDraw,{x:b.x-ux*14,y:b.y-uy*14},b,5,b.color);circle(shotDraw,b.x,b.y,3,0xfff1b3,.9);}
    }
  }
  for(const [id,sprite] of aerialSprites)if(!activeAerialProjectiles.has(id)){sprite.destroy();aerialSprites.delete(id);}
  for(const b of game.beams){
    const alpha=1-b.age/b.life,power=b.power??0;
    for(const segment of laserDepthSegments(b.y,b.endY)){
      const shotDraw=shotGraphics(segment.depth),start={x:b.x,y:segment.from},end={x:b.x,y:segment.to};
      line(shotDraw,start,end,8+16*power,0xa70f22,alpha*(.24+.18*power));
      line(shotDraw,start,end,4+8*power,0xff283d,alpha);
      line(shotDraw,start,end,1.5+3*power,0xffffff,alpha);
    }
    circle(draw,b.x,b.endY,3+8*power,0xff3647,alpha*.7);
    if(power>.8)circle(draw,b.x,b.endY,2+4*power,0xfff3e9,alpha);
  }
  for(const e of game.effects){
    const k=e.age/e.life;
    if(e.type==='healBurst'){
      const radius=8+k*25,alpha=1-k;
      draw.ellipse(e.x,e.y-18,radius,radius*.52).stroke({color:0xa2ff8e,width:2,alpha:alpha*.75});
      for(let n=0;n<8;n++){const a=n*Math.PI/4+e.seed;circle(draw,e.x+Math.cos(a)*radius,e.y-22+Math.sin(a)*radius*.7,2+n%2,0xb9ff92,alpha);}
    }else if(e.type==='nuclearBlast'){
      const radius=9+k*BLAST_RADIUS.nuclear;
      drawBlastZone(groundDraw,e.x,e.y,BLAST_RADIUS.nuclear,k,'nuclear');
      groundDraw.ellipse(e.x,e.y+4,radius,radius*.38).stroke({color:0x9dff48,width:3,alpha:(1-k)*.9});
      groundDraw.ellipse(e.x,e.y+3,radius*.58,radius*.22).fill({color:0x6bd822,alpha:(1-k)*.34});
      let cloud=blastSprites.get(e.id);
      if(!cloud){cloud=new Sprite(mushroomFrames[0]);groundBlastLayer.addChild(cloud);blastSprites.set(e.id,cloud);}
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
    }else if(e.type==='explosion'||e.type==='barrelBlast'){
      let s=blastSprites.get(e.id);if(!s){s=new Sprite(blastFrames[0]);s.anchor.set(.5);groundBlastLayer.addChild(s);blastSprites.set(e.id,s);}
      const barrelHit=e.type==='barrelBlast';
      s.texture=blastFrames[Math.min(7,Math.floor(k*8))];s.position.set(e.x,e.y-11*k);s.width=barrelHit?126:112;s.height=barrelHit?126:112;s.alpha=1-k*.28;
      const radius=8+k*(barrelHit?BARREL_BLAST_RADIUS:BLAST_RADIUS.missile);
      drawBlastZone(groundDraw,e.x,e.y,barrelHit?BARREL_BLAST_RADIUS:BLAST_RADIUS.missile,k,'missile');
      if(barrelHit){
        groundDraw.ellipse(e.x,e.y+4,radius*.64,radius*.28).fill({color:0xff612e,alpha:(1-k)*.22});
      }else{
        groundDraw.ellipse(e.x,e.y+4,radius,radius*.27).stroke({color:0xf3c477,width:2,alpha:(1-k)*.65});
        groundDraw.ellipse(e.x,e.y+4,radius*.65,radius*.17).fill({color:0x6b3d24,alpha:(1-k)*.15});
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
      let fx=launchFxSprites.get(e.id);
      if(!fx){fx=new Sprite(launchFxFrames[0]);fx.anchor.set(.5,.8);pickupFlightLayer.addChild(fx);launchFxSprites.set(e.id,fx);}
      fx.texture=launchFxFrames[Math.min(7,Math.floor(k*8))];
      fx.position.set(e.x,e.y);fx.width=43;fx.height=50;fx.alpha=1-k*.25;
    }else if(e.type==='iceBurst'){
      groundDraw.ellipse(e.x,e.y+3,8+k*26,4+k*12).stroke({color:0x9ce5ff,width:2,alpha:1-k});
      for(let n=0;n<11;n++){
        const a=n*Math.PI*2/11+e.seed,travel=k*(18+n%4*4);
        rect(draw,e.x+Math.cos(a)*travel,e.y-9+Math.sin(a)*travel*.65,2+n%3,4+n%3,n%3?0xb6efff:0xffffff,1-k);
      }
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
  const activeBlast=new Set(game.effects.filter(e=>e.type==='explosion'||e.type==='barrelBlast'||e.type==='nuclearBlast').map(e=>e.id));
  for(const [id,s]of blastSprites)if(!activeBlast.has(id)){s.destroy();blastSprites.delete(id);}
  const activeLaunch=new Set(game.effects.filter(e=>e.type==='launch').map(e=>e.id));
  for(const [id,s]of launchFxSprites)if(!activeLaunch.has(id)){s.destroy();launchFxSprites.delete(id);}
  renderEnvironment();
  if(stick){
    joystickDraw.circle(stick.x,stick.y,43).fill({color:0x10272a,alpha:.22}).stroke({color:0xf0dfb4,alpha:.25,width:1});
    joystickDraw.circle(stick.x+stick.dx,stick.y+stick.dy,17).fill({color:0xf0d58f,alpha:.25}).stroke({color:0xffe6ae,alpha:.6,width:1});
  }
  const flash=game.players[0].criticalLaserHit;
  if(flash>0&&Math.sin((.55-flash)*42)>-.15){
    const fade=Math.min(1,flash/.15);
    rect(screenHitDraw,0,0,W,H,0xb90724,.13*fade);
    screenHitDraw.rect(8,8,W-16,H-16).stroke({color:0xff3040,width:16,alpha:.36*fade});
  }
}
async function boot(){
  const coreArt=['arena.png','sprites.png','flames.png','explosions.png','laser-gun.png','stun-launcher-blue.png','stun-grenade-blue.png','smart-missile-launcher.png','smart-missile.png','rock-barrier.png','healing-syringe.png'];
  const phase8Art=['platform-frames.webp','platform-launch-fx-frames.webp'];
  const phase2Art=['nuclear-launcher.png','nuclear-grenade.png','nuclear-waste-frames.png','nuclear-mushroom-frames.png','breakable-crate-depth-frames.png','oil-barrel-frames.png'];
  const phase5Art=['arena-storm.webp','arena-magma.webp','phase5-volcanic-rock.png','phase5-tornado-frames.png','phase5-volcano-vent.png','phase5-mud.png','phase5-lightning-frames.png','phase5-ash-cloud.png','phase5-lava-projectile-frames.png','phase5-lava-pool-frames.png','phase5-burning-rock-frames.png','phase5-burning-rock-ground-frames.png','phase5-rock-cooling-frames.png'];
  const phase6Art=['arena-desert.webp','arena-snow.webp','rock-barrier-snow.png','eagle-frames.png','scorpion-frames.png','quicksand-frames.png','avalanche-river-frames.png','hail-cloud-frames.png','hail-icicle-frames.png','ice-patch-frames.png','sandstorm-frames.png','mirage-frames.png'];
  const fighterIds=CHARACTERS.map(character=>character.id);
  const phase7Art=[...fighterIds.map(id=>`${id}-frontfire.webp`),...fighterIds.map(id=>`${id}-roll.webp`),...fighterIds.map(id=>`${id}-death.webp`)];
  const phase7SideArt=fighterIds.map(id=>`${id}-sidewalk.webp`);
  const artCount=coreArt.length+phase8Art.length+phase2Art.length+phase5Art.length+phase6Art.length+phase7Art.length+phase7SideArt.length;
  let artLoaded=0;
  const loadArt=async(folder,path)=>{
    const art=await Assets.load(`${import.meta.env.BASE_URL}art/${folder}${path}`);
    const percent=Math.round(++artLoaded/artCount*100);
    $('art-progress-fill').style.width=`${percent}%`;
    $('art-progress').setAttribute('aria-valuenow',String(percent));
    $('art-progress-label').textContent=`${percent}%`;
    return art;
  };
  app=new Application();await app.init({width:W,height:H,background:'#394e45',antialias:false,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true,preference:'webgl'});
  app.ticker.maxFPS=60;
  app.canvas.style.width='100%';app.canvas.style.height='100%';$('arena').prepend(app.canvas);
  const [bg,atlas,flameArt,blastArt,laserArt,stunLauncherArt,stunGrenadeArt,missileLauncherArt,missileArt,rockArt,healArt,nuclearLauncherArt,nuclearGrenadeArt,wasteArt,mushroomArt,crateArt,barrelArt]=await Promise.all([
    ...coreArt.map(path=>loadArt('',path)),
    ...phase2Art.map(path=>loadArt('phase2/',path)),
  ]);
  const [platformArt,launchFxArt]=await Promise.all(phase8Art.map(path=>loadArt('phase8/',path)));
  const [stormBg,magmaBg,volcanicRockArt,tornadoAnimationArt,ventArt,mudArt,lightningAnimationArt,ashCloudArt,lavaProjectileArt,lavaPoolArt,burningRockFlightArt,burningRockGroundArt,rockCoolingArt]=await Promise.all(
    phase5Art.map(path=>loadArt('',path))
  );
  const [desertBg,snowBg,snowBarrierArt,eagleArt,scorpionArt,quicksandArt,avalancheArt,hailCloudArt,hailIcicleArt,icePatchArt,sandstormArt,mirageArt]=await Promise.all(
    phase6Art.map(path=>loadArt('phase6/',path))
  );
  const phase7Sheets=await Promise.all(phase7Art.map(path=>loadArt('phase7/',path)));
  const sideSheets=await Promise.all(phase7SideArt.map(path=>loadArt('phase7/',path)));
  for(const art of [bg,atlas,flameArt,blastArt,laserArt,stunLauncherArt,stunGrenadeArt,missileLauncherArt,missileArt,rockArt,healArt,nuclearLauncherArt,nuclearGrenadeArt,wasteArt,mushroomArt,crateArt,barrelArt])art.source.scaleMode='nearest';
  for(const art of [stormBg,magmaBg,volcanicRockArt,tornadoAnimationArt,ventArt,mudArt,lightningAnimationArt,ashCloudArt,lavaProjectileArt,lavaPoolArt,burningRockFlightArt,burningRockGroundArt,rockCoolingArt])art.source.scaleMode='nearest';
  for(const art of [desertBg,snowBg,snowBarrierArt,eagleArt,scorpionArt,quicksandArt,avalancheArt,hailCloudArt,hailIcicleArt,icePatchArt,sandstormArt,mirageArt])art.source.scaleMode='nearest';
  for(const art of [platformArt,launchFxArt])art.source.scaleMode='nearest';
  for(const art of phase7Sheets)art.source.scaleMode='nearest';
  for(const art of sideSheets)art.source.scaleMode='nearest';
  rockBarrierTexture=rockArt;snowBarrierTexture=snowBarrierArt;
  volcanicRockTexture=volcanicRockArt;mudTexture=mudArt;
  ashCloudTexture=ashCloudArt;
  const cellW=atlas.width/4,cellH=atlas.height/4;
  textures=Array.from({length:16},(_,i)=>new Texture({source:atlas.source,frame:new Rectangle(i%4*cellW,Math.floor(i/4)*cellH,cellW,cellH)}));
  for(const [index,id] of fighterIds.entries()){
    const art=phase7Sheets[index],width=art.width/4,height=art.height/4;
    const frames=Array.from({length:16},(_,i)=>new Texture({source:art.source,frame:new Rectangle(i%4*width,Math.floor(i/4)*height,width,height)}));
    characterFrames.set(id,{south:frames.slice(0,4),north:frames.slice(4,8),specialSouth:frames.slice(8,12),specialNorth:frames.slice(12,16)});
  }
  for(const [index,id] of fighterIds.entries()){
    const art=sideSheets[index],width=art.width/4;
    const frames=Array.from({length:4},(_,frame)=>new Texture({source:art.source,frame:new Rectangle(frame*width,0,width,art.height)}));
    characterSideFrames.set(id,{frames,width:78*width/art.height});
  }
  for(const [index,id] of fighterIds.entries())characterRollFrames.set(id,isolatedRollFrames(phase7Sheets[index+fighterIds.length]));
  for(const [index,id] of fighterIds.entries()){
    const art=phase7Sheets[index+fighterIds.length*2],rowHeight=art.height/2,scale=78/rowHeight*CHARACTER_BY_ID[id].deathScale;
    const rows=CHARACTER_BY_ID[id].deathCuts.map((cuts,row)=>{
      const edges=[0,...cuts,art.width];
      return Array.from({length:4},(_,frame)=>{
        const left=edges[frame],width=edges[frame+1]-left;
        return {texture:new Texture({source:art.source,frame:new Rectangle(left,row*rowHeight,width,rowHeight)}),width:width*scale,height:rowHeight*scale};
      });
    });
    characterDeathFrames.set(id,{south:rows[0],north:rows[1]});
  }
  const cut=(art,cols,rows)=>Array.from({length:cols*rows},(_,i)=>new Texture({source:art.source,frame:new Rectangle(i%cols*art.width/cols,Math.floor(i/cols)*art.height/rows,art.width/cols,art.height/rows)}));
  tornadoFrames=cut(tornadoAnimationArt,8,1);
  lightningFrames=cut(lightningAnimationArt,6,1);
  lavaProjectileFrames=cut(lavaProjectileArt,6,1);lavaPoolFrames=cut(lavaPoolArt,6,1);
  burningRockFlightFrames=cut(burningRockFlightArt,6,1);burningRockGroundFrames=cut(burningRockGroundArt,6,1);
  rockCoolingFrames=cut(rockCoolingArt,6,1);
  phase6Frames={eagle:cut(eagleArt,6,1),scorpion:cut(scorpionArt,6,1),quicksand:cut(quicksandArt,4,1),avalanche:cut(avalancheArt,4,1),hailCloud:cut(hailCloudArt,4,1),hailIcicle:cut(hailIcicleArt,6,1),ice:cut(icePatchArt,4,1),sandstorm:cut(sandstormArt,6,1),mirage:cut(mirageArt,4,1)};
  flameFrames=cut(flameArt,4,2);blastFrames=cut(blastArt,4,2);platformFrames=cut(platformArt,4,2);launchFxFrames=cut(launchFxArt,4,2);
  wasteFrames=cut(wasteArt,4,1);mushroomFrames=cut(mushroomArt,4,1);crateFrames=cut(crateArt,3,1);barrelFrames=cut(barrelArt,3,1);
  laserTexture=new Texture({source:laserArt.source,frame:new Rectangle(33,418,1200,486)});stunLauncherTexture=stunLauncherArt;stunGrenadeTexture=stunGrenadeArt;missileLauncherTexture=missileLauncherArt;missileTexture=missileArt;nuclearLauncherTexture=nuclearLauncherArt;nuclearGrenadeTexture=nuclearGrenadeArt;syringeTexture=healArt;
  world=new Container();app.stage.addChild(world);
  // Every map uses the same physical slices, so the banks and platform stay aligned.
  for(const [map,art] of [[MAPS.RIVERSIDE,bg],[MAPS.STORM,stormBg],[MAPS.MAGMA,magmaBg],[MAPS.DESERT,desertBg],[MAPS.SNOW,snowBg]]){
    const group=new Container(),artTop=art.height*248/720,artBottom=art.height*410/720;
    for(const [sourceY,sourceHeight,destY,destHeight] of [
      [0,artTop,0,RIVER.top],
      [artTop,artBottom-artTop,RIVER.top,RIVER.bottom-RIVER.top],
      [artBottom,art.height-artBottom,RIVER.bottom,H-RIVER.bottom],
    ]){
      const section=new Sprite(new Texture({source:art.source,frame:new Rectangle(0,sourceY,art.width,sourceHeight)}));
      section.position.set(0,destY);section.width=W;section.height=destHeight;group.addChild(section);
    }
    const texture=new Texture({source:art.source,frame:new Rectangle(60,548,904,300)});
    const flow=new TilingSprite({texture,width:W,height:142});flow.position.set(0,RIVER.top+9);flow.tileScale.set(W/904);flow.alpha=map===MAPS.MAGMA?.28:map===MAPS.DESERT||map===MAPS.SNOW?0:.72;group.addChild(flow);
    waterTiles[map]=flow;arenaGroups[map]=group;group.visible=map===MAPS.RIVERSIDE;world.addChild(group);
  }
  // Position the opaque part of the wall inside the arena. The source art has
  // transparent padding above and below the stones.
  farBarrier=new Sprite(rockArt);farBarrier.width=W;farBarrier.height=100;
  farBarrier.position.set(0,-32);world.addChild(farBarrier);
  waterTile=waterTiles[MAPS.RIVERSIDE];
  for(const x of [48,W-48]){
    const vent=new Sprite(ventArt);vent.anchor.set(.5);vent.width=105;vent.height=84;
    vent.position.set(x,RIVER.y);vent.visible=false;volcanoVents.push(vent);world.addChild(vent);
  }
  waterDraw=new Graphics();platformContactDraw=new Graphics();scarsDraw=new Graphics();groundDraw=new Graphics();environmentGround=new Graphics();mudLayer=new Container();hazardLayer=new Container();debrisLayer=new Container();obstacleLayer=new Container();obstacleLayer.sortableChildren=true;pickupFlightLayer=new Container();flameLayer=new Container();jetLayer=new Container();fireSmoke=new Graphics();projectileDraw=new Graphics();fighterFrontProjectileDraw=new Graphics();rearAerialSpriteLayer=new Container();groundBlastLayer=new Container();
  platformSprite=new Sprite(platformFrames[0]);platformBlendSprite=new Sprite(platformFrames[0]);
  for(const part of [platformSprite,platformBlendSprite]){
    part.anchor.set(.5);part.position.set(PLATFORM_GEOMETRY.x,PLATFORM_GEOMETRY.y);
    part.width=PLATFORM_GEOMETRY.width;part.height=PLATFORM_GEOMETRY.height;
  }
  platformBlendSprite.alpha=0;
  // The deck sits below every projectile pass; it never occludes a crossing shot.
  world.addChild(waterDraw,scarsDraw,groundDraw,mudLayer,environmentGround,hazardLayer,debrisLayer,flameLayer,fireSmoke,platformSprite,platformBlendSprite,platformContactDraw,jetLayer,projectileDraw,rearAerialSpriteLayer,obstacleLayer,fighterFrontProjectileDraw,groundBlastLayer);
  frontProjectileDraw=new Graphics();muzzleDraw=new Graphics();aerialProjectileDraw=new Graphics();aerialSpriteLayer=new Container();
  world.addChild(frontProjectileDraw,aerialProjectileDraw,aerialSpriteLayer);
  for(let i=0;i<4;i++){const s=new Sprite(textures[i%2*4]);s.anchor.set(.5);s.visible=false;soldiers.push(s);obstacleLayer.addChild(s);}
  for(let i=0;i<4;i++){const s=new Sprite(characterDeathFrames.get(fighterIds[i]).south[0].texture);s.anchor.set(.5);s.visible=false;corpses.push(s);obstacleLayer.addChild(s);}
  stunDraw=new Graphics();world.addChild(stunDraw);
  world.addChild(muzzleDraw);
  // The lower wall covers only a fighter's feet at the back edge.
  nearBarrier=new Sprite(rockArt);nearBarrier.width=W;nearBarrier.height=100;
  nearBarrier.position.set(W,H-78);nearBarrier.scale.x*=-1;world.addChild(nearBarrier);
  // Platform and wall art sit behind a weapon while it is being thrown.
  // On landing, its sprite moves back to obstacleLayer for ground depth sorting.
  world.addChild(pickupFlightLayer);
  environmentSky=new Graphics();lightningLayer=new Container();ashCloudLayer=new Container();
  world.addChild(environmentSky,lightningLayer);
  for(let i=0;i<6;i++){
    const back=new Sprite(ashCloudTexture);back.anchor.set(.5);back.tint=0x202528;back.visible=false;ashPuffs.push(back);ashCloudLayer.addChild(back);
    const front=new Sprite(ashCloudTexture);front.anchor.set(.5);front.visible=false;ashPuffs.push(front);ashCloudLayer.addChild(front);
  }
  for(let i=0;i<2;i++){
    const puff=new Sprite(ashCloudTexture);puff.anchor.set(.5);puff.visible=false;ashVentPuffs.push(puff);ashCloudLayer.addChildAt(puff,0);
  }
  draw=new Graphics();joystickDraw=new Graphics();screenHitDraw=new Graphics();phase6WeatherLayer=new Container();phase6WeatherDraw=new Graphics();phase6WeatherLayer.addChild(phase6WeatherDraw);
  for(let i=0;i<12;i++){const cloud=new Sprite(phase6Frames.sandstorm[0]);cloud.anchor.set(.5);cloud.visible=false;sandstormSprites.push(cloud);phase6WeatherLayer.addChild(cloud);}
  app.stage.addChild(draw,ashCloudLayer,phase6WeatherLayer,joystickDraw,screenHitDraw);
  buildWeaponChoices();
  $('art-loading').hidden=true;
  $('start').disabled=false;$('start').textContent='PLAY AGAIN';$('menu-play').disabled=false;$('menu-play').textContent='VS COMPUTER';
  let accumulator=0,hudTime=0;
  app.ticker.add(ticker=>{
    const dt=Math.min(ticker.deltaMS/1000,.05);
    if(starting&&!countdownSuspended){
      countdownElapsed+=dt;
      if(countdownStage==='ready'&&countdownElapsed>=.85){
        countdownStage='fight';$('countdown-word').textContent='FIGHT!';$('match-countdown').classList.add('fight');
        $('countdown-word').animate([{opacity:0,transform:'scale(.72)'},{opacity:1,transform:'scale(1)'}],{duration:300,easing:'ease-out'});
        sound.play('fight');
      }
      if(countdownElapsed>=1.5)finishCountdown();
    }
    if(started&&!paused&&!game.finished){
      input.x=(keys.has('KeyD')||keys.has('ArrowRight')?1:0)-(keys.has('KeyA')||keys.has('ArrowLeft')?1:0);
      input.y=(keys.has('KeyS')||keys.has('ArrowDown')?1:0)-(keys.has('KeyW')||keys.has('ArrowUp')?1:0);
      if(stick){input.x=stick.dx/43;input.y=stick.dy/43;}
      accumulator+=dt;
      while(accumulator>=1/120){game.update(1/120,input);input.dodge=false;accumulator-=1/120;}
      const damageByPlayer=Array(game.players.length).fill(0);
      for(const event of game.events){
        if(event.type==='damage'){damageByPlayer[event.player]+=event.amount;continue;}
        if(event.type==='shot')sound.play(event.weapon,event.x);
        else if(event.type==='fighterDeath')sound.play(`death-${event.characterId}`,event.x);
        else if(event.type!=='sandstorm'&&event.type!=='hail')sound.play(event.type,event.x);
        if(event.type==='heal'){
          showNumber(event.player,event.amount,true);
          if(event.player===0)toast(`HEALED +${Math.ceil(event.amount)}`);
          else fighterToast(event.player,`HEALED +${Math.ceil(event.amount)}`);
        }
        if(event.type==='pickup'&&event.player===0)toast(event.ammoAdded?`${WEAPONS[event.weapon].name} +${event.ammoAdded} AMMO`:`${WEAPONS[event.weapon].name} COLLECTED`);
        if(event.type==='pickup'&&event.player!==0)fighterToast(event.player,event.ammoAdded?`${WEAPONS[event.weapon].name} +${event.ammoAdded} AMMO`:`${WEAPONS[event.weapon].name} ACQUIRED`);
        if(event.type==='stun'&&event.player===0)toast(`STUNNED · ${GRENADE_STUN_DURATION.toFixed(1)}S`);
        if(event.type==='stun'&&event.player!==0)fighterToast(event.player,'STUNNED',1800);
        if(event.type==='fighterDeath'&&event.player===0&&selectedFormat==='2v2'&&game.fightersOnBank(0).length)toast('YOU FELL · YOUR ALLY FIGHTS ON');
      }
      damageByPlayer.forEach((amount,playerId)=>{if(amount>0)showNumber(playerId,amount);});
      game.events=[];
      sound.burn(game.flames.length>0||game.volcanicFire.some(f=>f.hit)||game.obstacles.some(o=>o.type==='rock'&&!o.destroyed&&o.burning>0));
      sound.environment(game.map,!!game.sandstorm);
      sound.platform(game.platform.phase,game.map);
    } else accumulator=0;
    for(const label of document.querySelectorAll('.opponent-toast'))if(performance.now()>Number(label.dataset.until||0))label.style.opacity=0;
    if(game.finished&&!finishedShown){
      finishedShown=true;sceneDirty=true;clearInput();sound.stop();
      const won=game.winner===0,drawn=game.winner==='draw';
      $('overlay').classList.add('result');document.querySelector('.game-unit').classList.add('ended');
      const outcome=drawn?'DRAW':won?'VICTORY':'DEFEAT';
      const survivors=game.players.filter(fighter=>fighter.hp>0).map(fighter=>CHARACTER_BY_ID[fighter.characterId]?.name).join(' & ');
      const omen=drawn?'Neither team survived.':won?game.players[0].hp>0?'The other side fell. You remain.':`Your ally ${survivors} survived the fight.`:'Your side fell. The other team remains.';
      showOverlay(drawn?'BOTH<br><em>FELL.</em>':won?game.players[0].hp>0?'YOU<br><em>ADAPTED.</em>':'YOUR TEAM<br><em>SURVIVED.</em>':'YOU<br><em>FELL.</em>',`${outcome}${survivors?` · ${survivors} survived`:''} · ${Math.floor(game.time)} seconds · ${game.players[0].shots} shots fired · ${game.launches} supply launches`,'PLAY AGAIN',omen);
    }
    const animating=starting||started&&!paused&&!game.finished;
    if(animating||sceneDirty){render();if(animating)syncHudPositions();else updateHud();sceneDirty=false;}
    hudTime+=dt;if(animating&&hudTime>.05){updateHud();hudTime=0;}
    if(performance.now()>toastUntil&&$('toast').style.opacity!=='0')$('toast').style.opacity=0;
    if(!animating){app.renderer.render(app.stage);app.ticker.stop();}
  });
  // Read-only diagnostics for development and reproducible manual QA.
  if(import.meta.env.DEV)window.arcana={snapshot:()=>JSON.parse(JSON.stringify({mode:game.mode,map:game.map,fixedWeapon:game.fixedWeapon,time:game.time,started,paused,finished:game.finished,players:game.players,platform:game.platform,platformAttacks:game.platformAttacks,pickups:game.pickups,bullets:game.bullets.length,flames:game.flames.length,mud:game.mud,lightning:game.lightning,tornadoes:game.tornadoes,rocksInFlight:game.rocksInFlight,volcanicFire:game.volcanicFire,ash:game.ash,sandstorm:game.sandstorm,eagles:game.eagles,quicksand:game.quicksand,mirages:game.mirages,icePatches:game.icePatches,avalanches:game.avalanches,hail:game.hail})),renderer:app.renderer.type};
}
boot().catch(error=>{console.error(error);$('menu').classList.add('hidden');$('overlay').classList.remove('hidden');$('overlay-title').textContent='LOAD FAILED';$('overlay-copy').textContent=import.meta.env.DEV?String(error):'The game could not load its graphics. Please reload in a browser with WebGL enabled.';$('start').textContent='RELOAD';$('start').disabled=false;$('start').onclick=()=>location.reload();});
