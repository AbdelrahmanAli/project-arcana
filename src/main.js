import { Application, Assets, Sprite, Texture, Rectangle, Graphics, Container, TilingSprite } from 'pixi.js';
import { Match, WEAPONS, W, H, RIVER, TOWER_TIMING, TOWER_ACTIVE_HEIGHT, GRENADE_ARC_HEIGHT, TOWER_BASE_Y, towerShieldBounds } from './model.js';
import { Sound } from './audio.js';
import './style.css';
import './hud.css';
import './arcana.css';

const $=id=>document.getElementById(id);
const sound=new Sound();
let game=new Match(),started=false,paused=false,finishedShown=false;
const input={x:0,y:0,fire:false};
const keys=new Set();let stick=null,firePointer=null,toastUntil=0;
let textures=[],flameFrames=[],blastFrames=[],laserTexture,corpseTextures=[],app,world,draw,projectileDraw,frontProjectileDraw,aerialProjectileDraw,groundDraw,waterDraw,waterTile,towerWater,baseWaterDraw,baseLightDraw,shieldGlass,shieldDraw,fireSmoke,flameLayer,joystickDraw,tower,towerMask,cap,capFront,openCap,soldiers=[],corpses=[],dropSprites=new Map(),flameSprites=[],blastSprites=new Map();
const BASE_Y=TOWER_BASE_Y, BASE_WIDTH=175, BASE_HEIGHT=126;
const healthCells=new Map();
for(const id of ['player-hp','opponent-hp']){
  const cells=Array.from({length:20},()=>{const cell=document.createElement('span');cell.className='health-cell';cell.setAttribute('aria-hidden','true');cell.appendChild(document.createElement('i'));$(id).appendChild(cell);return cell.firstElementChild;});
  healthCells.set(id,cells);
}
function updateHealth(id,hp){
  healthCells.get(id).forEach((fill,i)=>fill.style.transform=`scaleX(${Math.max(0,Math.min(1,(hp-i*5)/5))})`);
  $(id).setAttribute('aria-valuenow',Math.ceil(hp));
}
const slots=[];
for(let i=0;i<3;i++){
  const el=document.createElement('button');el.className='slot empty';el.dataset.slot=i;el.setAttribute('aria-label',`Weapon slot ${i+1}, empty`);el.innerHTML=`<small>${i+1}</small><span class="empty-mark">—</span><span class="icon" hidden></span><b class="ammo"></b><i class="ammo-line"></i>`;
  const selectSlot=()=>{if(started&&!paused&&!game.finished&&game.ending<=0){game.select(game.players[0],i);updateHud();}};
  el.addEventListener('pointerdown',e=>{
    if(e.button!==0)return;
    e.preventDefault();
    selectSlot();
  });
  // A touch can emit a click after pointerdown. Only keyboard activation needs click.
  el.addEventListener('click',e=>{if(e.detail===0)selectSlot();});
  $('slots').appendChild(el);slots.push(el);
}
const rect=(g,x,y,w,h,color,alpha=1)=>g.rect(x,y,w,h).fill({color,alpha});
const circle=(g,x,y,r,color,alpha=1)=>g.circle(x,y,r).fill({color,alpha});
function line(g,a,b,width,color,alpha=1){g.moveTo(a.x,a.y).lineTo(b.x,b.y).stroke({width,color,alpha});}
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
function point(e){const r=$('arena').getBoundingClientRect();return {x:(e.clientX-r.left)/r.width*W,y:(e.clientY-r.top)/r.height*H};}
function releaseFire(cancel=false){
  if(!cancel&&input.fire&&!paused&&started&&game.weapon(game.players[0])==='laser')game.fire(game.players[0],game.players[0].charge);
  input.fire=false;firePointer=null;game.players[0].charge=0;$('fire').classList.remove('pressed');
}
function clearInput(){keys.clear();stick=null;input.x=0;input.y=0;releaseFire(true);}
function reset(){game=new Match();started=true;paused=false;finishedShown=false;clearInput();sound.init();$('menu').classList.add('hidden');$('overlay').classList.add('hidden');$('overlay').classList.remove('result');$('pause').textContent='Ⅱ';for(const s of dropSprites.values())s.destroy();dropSprites.clear();updateHud();}
function pause(){if(!started||game.finished)return;paused=!paused;clearInput();if(paused){sound.stop();showOverlay('TAKE A<br><em>BREATHER.</em>','The battlefield will wait.','RESUME');}else{$('overlay').classList.add('hidden');sound.init();}$('pause').textContent=paused?'▶':'Ⅱ';}
function showOverlay(title,copy,button){$('overlay-title').innerHTML=title;$('overlay-copy').textContent=copy;$('start').textContent=button;$('overlay').classList.remove('hidden');}
function toast(text){$('toast').textContent=text;toastUntil=performance.now()+1700;$('toast').style.opacity=1;}
$('start').addEventListener('click',()=>{if(paused)pause();else reset();});
$('pause').addEventListener('click',pause);
function openMenu(){started=false;paused=false;clearInput();sound.stop();$('overlay').classList.add('hidden');$('menu').classList.remove('hidden');$('menu-home').classList.remove('hidden');$('settings-panel').classList.add('hidden');}
$('menu-play').addEventListener('click',reset);
$('menu-open').addEventListener('click',openMenu);
$('result-menu').addEventListener('click',openMenu);
$('menu-settings').addEventListener('click',()=>{$('menu-home').classList.add('hidden');$('settings-panel').classList.remove('hidden');});
$('settings-back').addEventListener('click',()=>{$('settings-panel').classList.add('hidden');$('menu-home').classList.remove('hidden');});
function toggleSound(){const muted=sound.toggle();for(const id of ['sound','settings-sound'])$(id).textContent=muted?'SOUND OFF':'SOUND ON';$('sound').setAttribute('aria-label',muted?'Enable sound':'Mute sound');}
$('sound').addEventListener('click',toggleSound);$('settings-sound').addEventListener('click',toggleSound);
$('arena').addEventListener('pointerdown',e=>{
  if(e.target.closest('.overlay, .main-menu')||!started||paused||game.finished||game.ending>0||stick)return;
  e.preventDefault();const p=point(e);stick={id:e.pointerId,x:p.x,y:p.y,dx:0,dy:0};$('arena').setPointerCapture(e.pointerId);
});
$('arena').addEventListener('pointermove',e=>{if(stick?.id===e.pointerId){const p=point(e);stick.dx=p.x-stick.x;stick.dy=p.y-stick.y;const l=Math.hypot(stick.dx,stick.dy);if(l>43){stick.dx*=43/l;stick.dy*=43/l;}}});
for(const name of ['pointerup','pointercancel','lostpointercapture'])$('arena').addEventListener(name,e=>{if(stick?.id===e.pointerId)stick=null;});
$('fire').addEventListener('pointerdown',e=>{if(!started||paused||game.finished||game.ending>0||firePointer!==null)return;e.preventDefault();firePointer=e.pointerId;$('fire').setPointerCapture(e.pointerId);input.fire=true;if(game.weapon(game.players[0])!=='laser')game.fire(game.players[0]);$('fire').classList.add('pressed');});
$('fire').addEventListener('pointerup',e=>{if(e.pointerId===firePointer)releaseFire();});
for(const name of ['pointercancel','lostpointercapture'])$('fire').addEventListener(name,e=>{if(e.pointerId===firePointer)releaseFire(true);});
document.addEventListener('contextmenu',e=>{if(e.target.closest('.game-unit'))e.preventDefault();});
window.addEventListener('keydown',e=>{
  if(['Space','ArrowUp','ArrowDown','ArrowLeft','ArrowRight'].includes(e.code))e.preventDefault();
  if(e.code==='Escape'&&!e.repeat){pause();return;}
  if(!started||paused||game.finished||game.ending>0)return;
  keys.add(e.code);
  if(e.code==='Space'){input.fire=true;if(!e.repeat&&game.weapon(game.players[0])!=='laser')game.fire(game.players[0]);$('fire').classList.add('pressed');}
  if(!e.repeat&&/^Digit[0-3]$/.test(e.code)){const n=Number(e.code.at(-1));if(n===0){game.players[0].selected=-1;game.players[0].charge=0;}else game.select(game.players[0],n-1);}
});
window.addEventListener('keyup',e=>{keys.delete(e.code);if(e.code==='Space')releaseFire();});
window.addEventListener('blur',()=>{clearInput();if(started&&!paused&&!game.finished)pause();});
document.addEventListener('visibilitychange',()=>{if(document.hidden){clearInput();if(started&&!paused&&!game.finished)pause();}});

function updateHud(){
  const p=game.players[0],enemy=game.players[1];
  for(let i=0;i<3;i++){
    const slot=p.slots[i],el=slots[i];el.classList.toggle('empty',!slot);el.classList.toggle('selected',p.selected===i);el.setAttribute('aria-pressed',p.selected===i?'true':'false');
    el.querySelector('.empty-mark').hidden=!!slot;el.querySelector('.icon').hidden=!slot;
    el.querySelector('.ammo').textContent=slot?slot.ammo:'';
    el.querySelector('.ammo-line').style.width=slot?`${slot.ammo/WEAPONS[slot.type].ammo*45}%`:'0';
    el.setAttribute('aria-label',slot?`${WEAPONS[slot.type].name}, ${slot.ammo} shots, slot ${i+1}`:`Weapon slot ${i+1}, empty`);
    if(slot){const icon=el.querySelector('.icon'),frame=WEAPONS[slot.type].frame;icon.classList.toggle('laser-icon',slot.type==='laser');icon.style.backgroundPosition=`${frame%4/3*100}% ${Math.floor(frame/4)/3*100}%`;}
  }
  $('health-value').textContent=Math.ceil(p.hp);updateHealth('player-hp',p.hp);updateHealth('opponent-hp',enemy.hp);
  const hud=$('opponent-hud'),scale=$('arena').clientWidth/W;
  hud.style.setProperty('--hud-scale',scale);
  hud.style.left=`${Math.max(44,Math.min(W-44,enemy.x))/W*100}%`;hud.style.top=`${(enemy.y-30)/H*100}%`;
  hud.style.display=enemy.hp>0?'flex':'none';
  const equipped=WEAPONS[game.weapon(enemy)],badge=$('opponent-weapon');
  badge.title=equipped.name;badge.setAttribute('aria-label',`Opponent equipped weapon: ${equipped.name}`);
  badge.firstElementChild.style.backgroundPosition=`${equipped.frame%4/3*100}% ${Math.floor(equipped.frame/4)/3*100}%`;
  badge.firstElementChild.classList.toggle('laser-icon',game.weapon(enemy)==='laser');
  $('opponent-toast').style.left=`${enemy.x/W*100}%`;$('opponent-toast').style.top=`${(enemy.y+40)/H*100}%`;
  $('charge').style.height=`${p.charge*100}%`;
  if(performance.now()>toastUntil)$('toast').style.opacity=0;
}
function render(){
  draw.clear();projectileDraw.clear();frontProjectileDraw.clear();aerialProjectileDraw.clear();groundDraw.clear();waterDraw.clear();towerWater.clear();baseWaterDraw.clear();baseLightDraw.clear();shieldDraw.clear();fireSmoke.clear();joystickDraw.clear();
  waterTile.tilePosition.x=game.time*19;
  waterTile.tilePosition.y=Math.sin(game.time*.72)*1.5;
  // A few foam crests drift with the textured current.
  for(let i=0;i<15;i++){
    const y=RIVER.top+18+(i*47)%(RIVER.bottom-RIVER.top-44);
    const x=(i*97+game.time*13)%(W+45)-25;
    const length=8+(i%4)*4;
    waterDraw.moveTo(x,y).bezierCurveTo(x+length*.3,y-1,x+length*.7,y+1,x+length,y).stroke({color:0xb1e2cf,width:1,alpha:.11+.06*Math.sin(game.time+i)});
  }
  const t=game.tower;
  // Open the hatch as the shaft starts moving and close it at the end of descent.
  const hatchOpen=t.phase==='rise'?Math.min(1,t.progress/.55):t.phase==='lower'?Math.min(1,Math.max(0,TOWER_TIMING.lower-t.progress)/.55):t.phase==='rest'?0:1;
  openCap.alpha=hatchOpen;
  // The central column clears the hatch before its launcher arms extend. After
  // firing, the arms fold away during delivery, before descent begins.
  const armFraction=t.phase==='deliver'
    ? Math.max(0,Math.min(1,(TOWER_TIMING.deliver-.35-t.progress)/.75))
    : t.phase==='rise'?Math.max(0,Math.min(1,(t.height-.57)/.28)):0;
  const armEase=armFraction*armFraction*(3-2*armFraction);
  const apertureTop=BASE_Y-39,apertureBottom=RIVER.y+22;
  const halfWidth=29+61*armEase;
  towerMask.clear()
    .rect(RIVER.x-halfWidth,RIVER.y-165,halfWidth*2,apertureTop-(RIVER.y-165)).fill(0xffffff)
    .rect(RIVER.x-28,apertureTop,56,apertureBottom-apertureTop).fill(0xffffff);
  // The stationary rear footing and foreground lip make the shaft emerge through the base.
  const waterline=BASE_Y+27,lift=190,baseY=RIVER.y+35+(1-t.height)*lift;
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
    for(const [dx,dy] of [[-53,-16],[53,-16],[-30,2],[30,2],[-51,19],[0,20],[51,19]]){
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
  let flameCount=0;
  for(const f of game.flames)for(let d=40;d<f.reach;d+=19){
    const x=RIVER.x+f.dx*d,y=RIVER.y+f.dy*d;
    if(x<0||x>W||y<0||y>H||!(y<RIVER.top-6||y>RIVER.bottom+6))continue;
    let s=flameSprites[flameCount];if(!s){s=new Sprite(flameFrames[0]);s.anchor.set(.5,.85);s.width=35;s.height=46;flameLayer.addChild(s);flameSprites.push(s);}
    s.visible=true;s.texture=flameFrames[(Math.floor(game.time*13+d/19))%8];s.position.set(x,y);s.alpha=Math.min(1,f.life*1.4);s.scale.x=(flameCount%2?-1:1)*.08;s.scale.y=.08;flameCount++;
    groundDraw.ellipse(x,y+2,13,4).fill({color:0x391916,alpha:.55});
    if(d%3<1)circle(fireSmoke,x+Math.sin(game.time*7+d)*7,y-29-(game.time*17+d)%14,2,0xc6aaa0,.27);
  }
  for(let i=flameCount;i<flameSprites.length;i++)flameSprites[i].visible=false;
  const active=new Set();
  for(const item of game.pickups){
    active.add(item.id);let s=dropSprites.get(item.id);
    if(!s){s=new Sprite(item.type==='laser'?laserTexture:textures[WEAPONS[item.type].frame]);s.anchor.set(.5);s.width=62;s.height=62;world.addChild(s);dropSprites.set(item.id,s);}
    let x=item.x,y=item.y;
    if(item.flight>0){const k=1-item.flight/.75;x=item.sx+(item.x-item.sx)*k;y=item.sy+(item.y-item.sy)*k-Math.sin(k*Math.PI)*70;s.rotation=Math.sin(k*Math.PI)*.6;}
    else{s.rotation=0;groundDraw.ellipse(x,y+12,21,5).fill({color:0x121a18,alpha:.4});y+=Math.sin(game.time*3+item.id)*2;}
    s.position.set(x,y);s.alpha=item.flight>0||item.ttl>3||Math.floor(item.ttl*6)%2===0?1:.22;
    s.zIndex=1;
  }
  for(const [id,s] of dropSprites)if(!active.has(id)){s.destroy();dropSprites.delete(id);}
  for(const p of game.players){
    const s=soldiers[p.id],base=p.id===0?0:4;
    const corpse=corpses[p.id];
    if(p.hp>0){
      let frame=base;if(p.flash>0)frame=base+3;else if(p.moving)frame=base+1+Math.floor(p.walk*9)%2;
      s.texture=textures[frame];s.position.set(p.x,p.y);s.width=78;s.height=78;s.rotation=0;s.alpha=1;s.tint=p.hurt>0?0xffaaa0:0xffffff;
      corpse.visible=false;
      groundDraw.ellipse(p.x,p.y+25,17,5).fill({color:0x17221b,alpha:.4});
      if(p.flash>0)rect(draw,p.x+10,p.y,3,2,0xffdb7f);
    }else{
      const age=p.deathAge,blue=p.id===0;
      const stumble=Math.min(1,Math.max(0,(age-.08)/.5));
      const settle=Math.min(1,Math.max(0,(age-.38)/.37));
      // Blue travels southeast without spinning; red keeps its existing short lean.
      s.texture=textures[base];s.position.set(p.x+(blue?10:6)*stumble,p.y+(blue?12:7)*stumble);
      s.width=78;s.height=78-(blue?24:6)*stumble;s.rotation=blue?0:.7*stumble;
      s.alpha=Math.max(0,1-Math.max(0,(age-.27)/.4));s.tint=age<.14?0xffb7a8:0xffffff;
      corpse.visible=age>=.38;corpse.texture=corpseTextures[p.id];
      corpse.position.set(p.x+(blue?10:6)+3*settle,p.y+(blue?12:7)+6*settle);
      corpse.width=72;corpse.scale.x=-Math.abs(corpse.scale.x);
      corpse.height=52*(.92+.08*settle);corpse.scale.y=(blue?-1:1)*Math.abs(corpse.scale.y);
      corpse.alpha=settle;corpse.rotation=blue?0:.04*(1-settle);
      groundDraw.ellipse(p.x,p.y+24,29,7).fill({color:0x211917,alpha:.45*settle});
    }
  }
  for(const b of game.bullets){
    if(b.type==='missile'){
      const pulse=.7+.3*Math.sin(game.time*8);
      groundDraw.ellipse(b.tx,b.ty,20,8).stroke({color:0xff4c32,width:2,alpha:pulse});
      groundDraw.moveTo(b.tx-8,b.ty).lineTo(b.tx+8,b.ty).stroke({color:0xff9c62,width:1,alpha:pulse});
      groundDraw.moveTo(b.tx,b.ty-7).lineTo(b.tx,b.ty+7).stroke({color:0xff9c62,width:1,alpha:pulse});
      groundDraw.ellipse(b.x,b.y+3,7,3).fill({color:0x142526,alpha:.35});
    }
    if(b.type==='grenade'){
      const arc=Math.sin(b.t/b.duration*Math.PI)*GRENADE_ARC_HEIGHT;
      groundDraw.ellipse(b.x,b.y,5,2).fill({color:0x1c241b,alpha:.35});
      circle(aerialProjectileDraw,b.x,b.y-arc,5,0x283b33);
      rect(aerialProjectileDraw,b.x-2,b.y-arc-3,4,3,0xe8c26b);
    }
    else{const v=Math.hypot(b.vx,b.vy),ux=b.vx/v,uy=b.vy/v;
      const shotDraw=b.type==='missile'?aerialProjectileDraw:t.height<TOWER_ACTIVE_HEIGHT||b.y>BASE_Y-39?frontProjectileDraw:projectileDraw;
      if(b.type==='missile'){
        const flight=Math.min(1,b.travel/b.targetDistance),altitude=Math.sin(flight*Math.PI)*105;
        const a=Math.atan2(uy,ux),cos=Math.cos(a),sin=Math.sin(a);
        const pt=(forward,side)=>({x:b.x+cos*forward-sin*side,y:b.y-altitude+sin*forward+cos*side});
        shotDraw.moveTo(pt(11,0).x,pt(11,0).y).lineTo(pt(-8,-5).x,pt(-8,-5).y).lineTo(pt(-7,5).x,pt(-7,5).y).closePath().fill(0xd4d4bd);
        line(shotDraw,pt(-6,-5),pt(-6,5),2,0xe35e35);circle(shotDraw,pt(-14,0).x,pt(-14,0).y,5,0xff992e,.85);
        for(let n=0;n<3;n++)circle(shotDraw,pt(-20-n*7,Math.sin(game.time*16+n)*3).x,pt(-20-n*7,Math.sin(game.time*16+n)*3).y,4+n,0xb8ad95,.35-n*.08);
      }else{line(shotDraw,{x:b.x-ux*14,y:b.y-uy*14},b,5,b.color);circle(shotDraw,b.x,b.y,3,0xfff1b3,.9);}
    }
  }
  for(const b of game.beams){const alpha=1-b.age/b.life,shotDraw=t.height<TOWER_ACTIVE_HEIGHT?frontProjectileDraw:projectileDraw;line(shotDraw,{x:b.x,y:b.y},{x:b.x,y:b.endY},16,0xa70f22,alpha*.35);line(shotDraw,{x:b.x,y:b.y},{x:b.x,y:b.endY},8,0xff283d,alpha);line(shotDraw,{x:b.x,y:b.y},{x:b.x,y:b.endY},2,0xffffff,alpha);}
  for(const e of game.effects){
    const k=e.age/e.life;
    if(e.type==='explosion'){
      let s=blastSprites.get(e.id);if(!s){s=new Sprite(blastFrames[0]);s.anchor.set(.5);world.addChild(s);blastSprites.set(e.id,s);}
      s.texture=blastFrames[Math.min(7,Math.floor(k*8))];s.position.set(e.x,e.y-11*k);s.width=78;s.height=78;s.alpha=1-k*.28;
      for(let n=0;n<7;n++){const a=n*2.4+e.seed;rect(draw,e.x+Math.cos(a)*k*43,e.y+Math.sin(a)*k*43,3,3,0xffb65c,1-k);}
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
      if(pool>0){
        groundDraw.ellipse(e.x,e.y+17,8+pool*25,3+pool*8).fill({color:0x4e1515,alpha:.76});
        groundDraw.ellipse(e.x-7,e.y+19,4+pool*15,2+pool*4).fill({color:0x9b2823,alpha:.55});
      }
      if(age<.7)for(let i=0;i<14;i++){
        const a=i*2.4+e.seed,travel=age*75*(.6+Math.abs(effectNoise(e.seed,i))*.7);
        rect(draw,e.x+Math.cos(a)*travel,e.y-11+Math.sin(a)*travel*.62,2+i%3,2+i%2,i%3?0x8b2523:0xc44838,Math.max(0,1-age/.7));
      }
      if(age>=.48&&age<1.25)for(let i=0;i<7;i++){
        const q=(age-.48)/.77,a=i*Math.PI*2/7+e.seed;
        circle(draw,e.x+Math.cos(a)*q*31,e.y+18+Math.sin(a)*q*11,2+q*3,0xc9bba0,(1-q)*.28);
      }
    }else if(e.type==='blood'){
      for(let i=0;i<10;i++){const a=i*2.4+e.seed,spread=23*Math.min(1,k*3)*(1+effectNoise(e.seed,i)*.4);const x=e.x+Math.cos(a)*spread,y=e.y+Math.sin(a)*spread;rect(groundDraw,x,y,3+i%4,2+i%3,i%3?0x7b2524:0xbd4235,1-k*.5);}
    }else{for(let n=0;n<6;n++){const a=n*1.05;rect(draw,e.x+Math.cos(a)*k*30,e.y+Math.sin(a)*k*30,3,3,0xffdf92,1-k);}}
  }
  const activeBlast=new Set(game.effects.filter(e=>e.type==='explosion').map(e=>e.id));
  for(const [id,s]of blastSprites)if(!activeBlast.has(id)){s.destroy();blastSprites.delete(id);}
  if(stick){
    joystickDraw.circle(stick.x,stick.y,43).fill({color:0x10272a,alpha:.22}).stroke({color:0xf0dfb4,alpha:.25,width:1});
    joystickDraw.circle(stick.x+stick.dx,stick.y+stick.dy,17).fill({color:0xf0d58f,alpha:.25}).stroke({color:0xffe6ae,alpha:.6,width:1});
  }
}
async function boot(){
  app=new Application();await app.init({width:W,height:H,background:'#394e45',antialias:false,resolution:Math.min(window.devicePixelRatio||1,2),autoDensity:true,preference:'webgl'});
  app.canvas.style.width='100%';app.canvas.style.height='100%';$('arena').prepend(app.canvas);
  const [bg,atlas,towerArt,capArt,openCapArt,flameArt,blastArt,laserArt,blueDeath,redDeath,rockArt]=await Promise.all(['arena.png','sprites.png','tower-v2.png','tower-cap.png','tower-base-open.png','flames.png','explosions.png','laser-gun.png','death-blue.png','death-red.png','rock-barrier.png'].map(src=>Assets.load(`${import.meta.env.BASE_URL}art/${src}`)));
  for(const art of [bg,atlas,towerArt,capArt,openCapArt,flameArt,blastArt,laserArt,blueDeath,redDeath,rockArt])art.source.scaleMode='nearest';
  corpseTextures=[blueDeath,redDeath];
  const cellW=atlas.width/4,cellH=atlas.height/4;
  textures=Array.from({length:16},(_,i)=>new Texture({source:atlas.source,frame:new Rectangle(i%4*cellW,Math.floor(i/4)*cellH,cellW,cellH)}));
  const cut=(art,cols,rows)=>Array.from({length:cols*rows},(_,i)=>new Texture({source:art.source,frame:new Rectangle(i%cols*art.width/cols,Math.floor(i/cols)*art.height/rows,art.width/cols,art.height/rows)}));
  flameFrames=cut(flameArt,4,2);blastFrames=cut(blastArt,4,2);laserTexture=laserArt;
  world=new Container();app.stage.addChild(world);
  // Rebalance the existing arena art: extend the upper bank and use the
  // original lower edge instead of placing a second wall across playable sand.
  const artTop=bg.height*248/H,artBottom=bg.height*410/H;
  for(const [sourceY,sourceHeight,destY,destHeight] of [
    [0,artTop,0,RIVER.top],
    [artTop,artBottom-artTop,RIVER.top,RIVER.bottom-RIVER.top],
    [artBottom,bg.height-artBottom,RIVER.bottom,H-RIVER.bottom],
  ]){
    const section=new Sprite(new Texture({source:bg.source,frame:new Rectangle(0,sourceY,bg.width,sourceHeight)}));
    section.position.set(0,destY);section.width=W;section.height=destHeight;world.addChild(section);
  }
  const waterTexture=new Texture({source:bg.source,frame:new Rectangle(60,548,904,300)});
  waterTile=new TilingSprite({texture:waterTexture,width:W,height:142});waterTile.position.set(0,RIVER.top+9);waterTile.tileScale.set(W/904);waterTile.alpha=.72;world.addChild(waterTile);
  waterDraw=new Graphics();groundDraw=new Graphics();flameLayer=new Container();fireSmoke=new Graphics();projectileDraw=new Graphics();world.addChild(waterDraw,groundDraw,flameLayer,fireSmoke,projectileDraw);
  tower=new Sprite(new Texture({source:towerArt.source,frame:new Rectangle(0,0,towerArt.width,1120)}));tower.anchor.set(.5,1);tower.width=170;tower.height=190;
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
  frontProjectileDraw=new Graphics();
  world.addChild(cap,openCap,hatchMask,tower,towerMask,capFront,frontProjectileDraw);tower.mask=towerMask;
  towerWater=new Graphics();baseWaterDraw=new Graphics();baseLightDraw=new Graphics();shieldGlass=new Sprite(createShieldGlass());shieldGlass.anchor.set(.5);shieldGlass.visible=false;shieldDraw=new Graphics();aerialProjectileDraw=new Graphics();world.addChild(towerWater,baseWaterDraw,baseLightDraw,shieldGlass,shieldDraw,aerialProjectileDraw);
  for(let i=0;i<2;i++){const s=new Sprite(textures[i*4]);s.anchor.set(.5);soldiers.push(s);world.addChild(s);}
  for(let i=0;i<2;i++){const s=new Sprite(corpseTextures[i]);s.anchor.set(.5);s.visible=false;corpses.push(s);world.addChild(s);}
  // The same rocky escarpment closes both far edges. The southern copy is
  // mirrored horizontally so it reads as a matching barrier without a repeat.
  for(const [y,mirror] of [[-28,false],[H-69,true]]){
    const barrier=new Sprite(rockArt);barrier.width=W;barrier.height=100;
    barrier.position.set(mirror?W:0,y);if(mirror)barrier.scale.x*=-1;
    world.addChild(barrier);
  }
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
      while(accumulator>=1/120){game.update(1/120,input);accumulator-=1/120;}
      for(const event of game.events){
        if(event.type==='shot')sound.play(event.weapon,event.x);
        else if(event.type!=='rise'&&event.type!=='lower')sound.play(event.type);
        if(event.type==='pickup'&&event.player===0)toast(`${WEAPONS[event.weapon].name} COLLECTED`);
        if(event.type==='pickup'&&event.player===1){const label=$('opponent-toast');label.textContent=`${WEAPONS[event.weapon].name} ACQUIRED`;label.style.opacity=1;label.dataset.until=String(performance.now()+1600);}
      }
      game.events=[];
      sound.burn(game.flames.length>0);
      sound.tower(game.tower.phase,game.tower.height,game.tower.progress);
    } else accumulator=0;
    if(performance.now()>Number($('opponent-toast').dataset.until||0))$('opponent-toast').style.opacity=0;
    if(game.finished&&!finishedShown){
      finishedShown=true;clearInput();sound.stop();
      const won=game.winner===0,drawn=game.winner==='draw';
      $('overlay').classList.add('result');
      showOverlay(drawn?'BOTH BANKS<br><em>FALL.</em>':won?'BANK<br><em>SECURED.</em>':'SOLDIER<br><em>DOWN.</em>',`${Math.floor(game.time)} seconds · ${game.players[0].shots} shots fired · ${game.launches} supply launches`,'PLAY AGAIN');
    }
    render();hudTime+=dt;if(hudTime>.05){updateHud();hudTime=0;}
  });
  // Read-only diagnostics for development and reproducible manual QA.
  if(import.meta.env.DEV)window.arcana={snapshot:()=>JSON.parse(JSON.stringify({time:game.time,started,paused,finished:game.finished,players:game.players,tower:game.tower,pickups:game.pickups,bullets:game.bullets.length,flames:game.flames.length})),renderer:app.renderer.type};
}
boot().catch(error=>{console.error(error);$('menu').classList.add('hidden');$('overlay').classList.remove('hidden');$('overlay-title').textContent='LOAD FAILED';$('overlay-copy').textContent=import.meta.env.DEV?String(error):'The game could not load its graphics. Please reload in a browser with WebGL enabled.';$('start').textContent='RELOAD';$('start').disabled=false;$('start').onclick=()=>location.reload();});
