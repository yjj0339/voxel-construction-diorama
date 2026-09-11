// Pointer Events unify mouse, pen and native multi-touch without page zoom side effects.
const coarsePointer=!!(window.matchMedia&&matchMedia('(pointer:coarse)').matches);
const reducedMotion=!!(window.matchMedia&&matchMedia('(prefers-reduced-motion:reduce)').matches);
const touches=new Map();
const navigation={
 velocityAz:0,velocityPolar:0,gesture:null,lastTap:null,homeDistance:51,initialized:false,
 get activePointers(){return touches.size;},get azimuth(){return azimuth;},get polar(){return polar;},
 get radius(){return radius;},get targetRadius(){return targetRadius;},get targetAz(){return targetAz;},
 get focus(){return focus.toArray();},get targetFocus(){return targetFocus.toArray();}
};
let viewWidth=1,viewHeight=1,settingsOpen=false,previousSpeedIndex=2,qualityMode='auto',slowWindows=0,fastWindows=0,qualityChangedAt=0,restoringContext=false;
const qualityLabels={auto:'自动',eco:'流畅',high:'清晰'};
const panRight=new THREE.Vector3(),panUp=new THREE.Vector3();
function markInteraction(){lastInput=performance.now();navigation.velocityAz=0;navigation.velocityPolar=0;}
function savePreferences(){try{localStorage.setItem('north-yard-settings-v2',JSON.stringify({quality:qualityMode,orbit:state.orbit,dust:state.dust,dayCycle:state.dayCycle,hour:state.hour,speedIndex:state.speedIndex,previousSpeedIndex}));}catch(_){} }
function loadPreferences(){
 state.orbit=!reducedMotion;
 try{const saved=JSON.parse(localStorage.getItem('north-yard-settings-v2')||'null');if(saved){
  if(['auto','eco','high'].includes(saved.quality))qualityMode=saved.quality;
  if(typeof saved.orbit==='boolean')state.orbit=saved.orbit&&!reducedMotion;
  if(Number.isInteger(saved.dust)&&saved.dust>=0&&saved.dust<=2)state.dust=saved.dust;
  if(typeof saved.dayCycle==='boolean')state.dayCycle=saved.dayCycle;
  if(Number.isFinite(saved.hour))state.hour=THREE.MathUtils.clamp(saved.hour,0,23.99);
  if(Number.isInteger(saved.speedIndex)&&saved.speedIndex>=0&&saved.speedIndex<speedSteps.length){state.speedIndex=saved.speedIndex;state.speed=speedSteps[saved.speedIndex];}
  if(Number.isInteger(saved.previousSpeedIndex)&&saved.previousSpeedIndex>0&&saved.previousSpeedIndex<speedSteps.length)previousSpeedIndex=saved.previousSpeedIndex;
 }}catch(_){}
 const requested=new URLSearchParams(location.search).get('quality');if(['auto','eco','high'].includes(requested))qualityMode=requested;
}
function layoutIsCompact(){return viewWidth<=900||coarsePointer;}
function fitDistance(){
 // Fit the complete model, including jibs and desk controls, to BOTH fields of view.
 const vfov=THREE.MathUtils.degToRad(camera.fov)*.5,hTan=Math.tan(vfov)*camera.aspect,vTan=Math.tan(vfov);
 const outward=new THREE.Vector3(Math.sin(.63)*Math.sin(1.12),Math.cos(1.12),Math.cos(.63)*Math.sin(1.12));
 const right=new THREE.Vector3(Math.cos(.63),0,-Math.sin(.63)),up=new THREE.Vector3().crossVectors(outward,right);
 const p=new THREE.Vector3();let fit=51;
 for(const x of[-15.6,15.6])for(const z of[-10.8,14.6])for(const y of[.1,14.7]){
  p.set(x,y-4.6,z);const toward=p.dot(outward);
  fit=Math.max(fit,toward+Math.abs(p.dot(right))/hTan*1.08,toward+Math.abs(p.dot(up))/vTan*1.22);
 }
 return fit;
}
function resizeViewport(initial=false){
 const oldAspect=camera.aspect,oldHome=navigation.homeDistance;
 viewWidth=Math.max(1,document.documentElement.clientWidth||innerWidth);
 const vv=window.visualViewport;
 viewHeight=Math.max(1,Math.round(vv&&Math.abs(vv.scale-1)<.01?vv.height:innerHeight));
 document.documentElement.style.setProperty('--app-height',viewHeight+'px');
 camera.aspect=viewWidth/viewHeight;camera.updateProjectionMatrix();renderer.setSize(viewWidth,viewHeight);
 navigation.homeDistance=fitDistance();
 if(initial||!navigation.initialized){targetRadius=radius=navigation.homeDistance;focus.set(0,4.6,0);targetFocus.copy(focus);navigation.initialized=true;}
 else if(Math.abs(oldAspect-camera.aspect)>.12){
  const zoom=THREE.MathUtils.clamp(targetRadius/oldHome,.3,1.7);targetRadius=THREE.MathUtils.clamp(navigation.homeDistance*zoom,28,navigation.homeDistance*1.7);radius=targetRadius;cancelPointers();
 }
 targetRadius=THREE.MathUtils.clamp(targetRadius,28,navigation.homeDistance*1.7);
 updatePanelState();
}
function updateCamera(dt){
 const f=1-Math.exp(-dt*12);
 if(!touches.size&&!reducedMotion){targetAz+=navigation.velocityAz*dt;targetPolar=THREE.MathUtils.clamp(targetPolar+navigation.velocityPolar*dt,.53,1.38);const decay=Math.exp(-dt*7);navigation.velocityAz*=decay;navigation.velocityPolar*=decay;}
 azimuth+=(targetAz-azimuth)*f;polar+=(targetPolar-polar)*f;radius+=(targetRadius-radius)*f;focus.lerp(targetFocus,f);
 camera.position.set(focus.x+Math.sin(azimuth)*Math.sin(polar)*radius,focus.y+Math.cos(polar)*radius,focus.z+Math.cos(azimuth)*Math.sin(polar)*radius);camera.lookAt(focus);camera.updateMatrixWorld();
}
function resetCamera(silent=false){markInteraction();targetAz=.63;targetPolar=1.12;targetRadius=navigation.homeDistance;targetFocus.set(0,4.6,0);navigation.lastTap=null;if(!silent)notify('已恢复沙盘全景');}
function pick(x,y){const rect=$('scene').getBoundingClientRect();pointer.set((x-rect.left)/rect.width*2-1,1-(y-rect.top)/rect.height*2);raycaster.setFromCamera(pointer,camera);return raycaster.intersectObjects(pickTargets,false)[0];}
function gestureSample(){const ps=Array.from(touches.values());if(ps.length<2)return null;const a=ps[0],b=ps[1];return{x:(a.x+b.x)*.5,y:(a.y+b.y)*.5,distance:Math.max(2,Math.hypot(a.x-b.x,a.y-b.y))};}
function panBy(dx,dy){
 const scale=2*targetRadius*Math.tan(THREE.MathUtils.degToRad(camera.fov*.5))/viewHeight;
 panRight.setFromMatrixColumn(camera.matrixWorld,0);panUp.setFromMatrixColumn(camera.matrixWorld,1);
 targetFocus.addScaledVector(panRight,-dx*scale).addScaledVector(panUp,dy*scale);
 targetFocus.x=THREE.MathUtils.clamp(targetFocus.x,-5,5);targetFocus.y=THREE.MathUtils.clamp(targetFocus.y,2.5,7.5);targetFocus.z=THREE.MathUtils.clamp(targetFocus.z,-4,4);
}
function zoomBy(factor){targetRadius=THREE.MathUtils.clamp(targetRadius*factor,28,navigation.homeDistance*1.7);}
function cancelPointers(){touches.clear();navigation.gesture=null;navigation.lastTap=null;navigation.velocityAz=0;navigation.velocityPolar=0;$('scene').style.cursor='grab';}
function cycleSpeed(){markInteraction();state.speedIndex=(state.speedIndex+1)%speedSteps.length;state.speed=speedSteps[state.speedIndex];if(state.speedIndex)previousSpeedIndex=state.speedIndex;notify(state.speed?'设备运行速度 · '+state.speed+' ×':'设备已暂停，天气与观察仍可继续');updateUI();savePreferences();}
function togglePause(){markInteraction();if(state.speed){previousSpeedIndex=state.speedIndex;state.speedIndex=0;}else state.speedIndex=previousSpeedIndex||2;state.speed=speedSteps[state.speedIndex];notify(state.speed?'设备继续运行 · '+state.speed+' ×':'设备已暂停');updateUI();savePreferences();}
function toggleDay(){markInteraction();state.dayCycle=!state.dayCycle;notify(state.dayCycle?'昼夜循环开启 · 每 4 分钟一个昼夜':'时间定格 · '+formatTime());updateUI();savePreferences();}
function cycleDust(){markInteraction();state.dust=(state.dust+1)%3;notify('施工扬尘 · '+dustNames[state.dust]);updateUI();savePreferences();}
function toggleRain(){markInteraction();state.rain=!state.rain;notify(state.rain?'暴雨降临 · 工地照明增强':'雨势渐歇 · 地面缓慢干燥');updateUI();}
function formatTime(){const h=Math.floor(state.hour)%24,m=Math.floor((state.hour-Math.floor(state.hour))*60);return String(h).padStart(2,'0')+':'+String(m).padStart(2,'0');}
function setText(id,value){const el=$(id);if(el&&el.textContent!==value)el.textContent=value;}
function updateClockUI(){
 setText('time',formatTime());const h=state.hour,phase=h<5||h>=20?'夜晚':h<8?'黎明':h<16.5?'白昼':'黄昏';
 setText('phase',phase+' · '+(state.rain?'暴雨':state.wet>.1?'雨后':'晴朗'));setText('weatherIcon',state.rain?'☂':state.night>.7?'☾':'☀');
 setText('timeSliderLabel',formatTime());if($('timeSlider')&&document.activeElement!==$('timeSlider'))$('timeSlider').value=state.hour;
}
function updateUI(){
 updateClockUI();setText('speedValue',state.speed===0?'已暂停':state.speed.toFixed(1)+' ×');setText('dayValue',state.dayCycle?'自动循环':'时间定格');setText('dustValue',dustNames[state.dust]);setText('orbitValue',state.orbit?'开启':'关闭');setText('pauseLabel',state.speed?'暂停':'继续');setText('qualityValue',qualityLabels[qualityMode]);
 $('rainButton').classList.toggle('active',state.rain);$('rainButton').setAttribute('aria-pressed',String(state.rain));$('dayButton').setAttribute('aria-pressed',String(state.dayCycle));$('orbitButton').setAttribute('aria-pressed',String(state.orbit));
 if($('pauseButton')){$('pauseButton').setAttribute('aria-pressed',String(!state.speed));$('pauseButton').setAttribute('aria-label',state.speed?'暂停设备':'继续设备');$('pauseButton').classList.toggle('active',!state.speed);$('pauseButton').querySelector('svg').innerHTML=state.speed?'<path d="M8 5v14M16 5v14"/>':'<path d="m8 5 11 7-11 7Z"/>';}
 if(knobs.length){knobs[0].angle=-1.8+state.speedIndex*.9;knobs[1].angle=state.dayCycle?.65:-.65;knobs[2].angle=-1.3+state.dust*1.3;}
}
function updatePanelState(){
 const compact=layoutIsCompact();document.body.classList.toggle('compact-ui',compact);document.body.classList.toggle('controls-open',settingsOpen&&compact);
 $('controlsButton').setAttribute('aria-expanded',String(settingsOpen&&compact));$('controlPanel').setAttribute('aria-hidden',String(compact&&!settingsOpen));
 const hidden=compact&&!settingsOpen;$('controlPanel').inert=hidden||document.body.classList.contains('clean');
}
function setControls(open,restoreFocus=false){markInteraction();settingsOpen=open;updatePanelState();if(open)$('closeControlsButton').focus({preventScroll:true});else if(restoreFocus)$('controlsButton').focus({preventScroll:true});}
function toggleImmersive(){markInteraction();const clean=document.body.classList.toggle('clean');settingsOpen=false;updatePanelState();$('viewButton').setAttribute('aria-pressed',String(clean));$('exitImmersiveButton').setAttribute('aria-hidden',String(!clean));if(clean)$('exitImmersiveButton').focus({preventScroll:true});else $(layoutIsCompact()?'controlsButton':'viewButton').focus({preventScroll:true});notify(clean?'沉浸观察 · 右上角可退出':'操作界面已恢复');}
function refreshFullscreenUI(){const supported=!!document.documentElement.requestFullscreen,active=!!document.fullscreenElement;$('fullscreenButton').disabled=!supported;$('fullscreenButton').setAttribute('aria-pressed',String(active));setText('fullscreenValue',supported?(active?'退出全屏':'进入全屏'):'可使用沉浸模式');$('fullscreenButton').setAttribute('aria-label',supported?(active?'退出全屏':'进入全屏'):'此浏览器不支持全屏，可使用沉浸模式');}
function toggleFullscreen(){markInteraction();try{const result=document.fullscreenElement?document.exitFullscreen():document.documentElement.requestFullscreen();if(result&&result.catch)result.catch(()=>notify('当前浏览器暂时无法全屏，可使用沉浸模式'));}catch(_){notify('当前浏览器暂时无法全屏，可使用沉浸模式');}}
function qualityBudget(){const eco=qualityMode==='eco'||(qualityMode==='auto'&&lowPower);return {dpr:Math.min(devicePixelRatio,qualityMode==='eco'?.8:eco?1:1.5),dust:eco?350:950,rain:eco?1400:3800,shadows:!eco};}
function applyQuality(){
 const q=qualityBudget(),shadowsChanged=renderer.shadowMap.enabled!==q.shadows;renderer.setPixelRatio(q.dpr);renderer.shadowMap.enabled=q.shadows;renderer.shadowMap.needsUpdate=q.shadows;
 if(shadowsChanged)scene.traverse(object=>{if(object.material){const materials=Array.isArray(object.material)?object.material:[object.material];for(const m of materials)m.needsUpdate=true;}});
 if(dustPoints)dustPoints.geometry.setDrawRange(0,q.dust);if(rainLines)rainLines.geometry.setDrawRange(0,q.rain*2);
 metric.quality=qualityMode;slowWindows=0;fastWindows=0;qualityChangedAt=performance.now();updateUI();
}
function cycleQuality(){markInteraction();qualityMode=['auto','eco','high'][(['auto','eco','high'].indexOf(qualityMode)+1)%3];applyQuality();notify('画面质量 · '+qualityLabels[qualityMode]);savePreferences();}
function adjustQuality(fps,now){
 if(qualityMode!=='auto'||now-qualityChangedAt<7000)return;
 slowWindows=fps<50?slowWindows+1:0;fastWindows=fps>=57?fastWindows+1:0;
 const ceiling=qualityBudget().dpr,current=renderer.getPixelRatio();
 if(slowWindows>=3&&current>.7){renderer.setPixelRatio(Math.max(.7,Math.round((current-.15)*100)/100));slowWindows=0;qualityChangedAt=now;}
 else if(fastWindows>=15&&current<ceiling){renderer.setPixelRatio(Math.min(ceiling,current+.1));fastWindows=0;qualityChangedAt=now;}
}
function bindInput(){
 const canvas=$('scene');
 canvas.addEventListener('pointerdown',e=>{
  if(e.pointerType==='mouse'&&e.button!==0)return;
  e.preventDefault();markInteraction();$('tooltip').style.display='none';
  const hit=pick(e.clientX,e.clientY);touches.set(e.pointerId,{x:e.clientX,y:e.clientY,startX:e.clientX,startY:e.clientY,time:performance.now(),startTime:performance.now(),type:e.pointerType,moved:false,canTap:true,knob:hit?hit.object.userData.knob:-1});
  try{canvas.setPointerCapture(e.pointerId);}catch(_){}
  if(touches.size>1){touches.forEach(p=>{p.canTap=false;p.moved=true;});navigation.lastTap=null;navigation.gesture=gestureSample();}
  canvas.style.cursor='grabbing';
 },{passive:false});
 canvas.addEventListener('pointermove',e=>{
  const p=touches.get(e.pointerId),now=performance.now();
  if(p){e.preventDefault();lastInput=now;const dx=e.clientX-p.x,dy=e.clientY-p.y,seconds=Math.max(.008,(now-p.time)/1000);p.x=e.clientX;p.y=e.clientY;p.time=now;
   if(Math.hypot(p.x-p.startX,p.y-p.startY)>7)p.moved=true;
   if(touches.size>=2){const next=gestureSample(),old=navigation.gesture;if(old){zoomBy(old.distance/next.distance);panBy(next.x-old.x,next.y-old.y);}navigation.gesture=next;navigation.velocityAz=0;navigation.velocityPolar=0;}
   else if(p.moved){const rotation=2*Math.PI/Math.max(viewWidth,600),tilt=Math.PI/Math.max(viewHeight,600);targetAz-=dx*rotation;targetPolar=THREE.MathUtils.clamp(targetPolar+dy*tilt,.53,1.38);navigation.velocityAz=THREE.MathUtils.clamp(-dx*rotation/seconds,-1.2,1.2);navigation.velocityPolar=THREE.MathUtils.clamp(dy*tilt/seconds,-.5,.5);}
  }else if(e.pointerType==='mouse'&&now-lastHover>80){lastHover=now;const hit=pick(e.clientX,e.clientY);canvas.style.cursor=hit?'pointer':'grab';$('tooltip').style.display=hit?'block':'none';if(hit){$('tooltip').textContent=['点击调节 · 设备运行速度','点击切换 · 昼夜循环','点击切换 · 扬尘强度'][hit.object.userData.knob];$('tooltip').style.left=Math.max(8,Math.min(e.clientX+14,viewWidth-208))+'px';$('tooltip').style.top=Math.max(8,e.clientY-42)+'px';}}
 },{passive:false});
 function release(e,cancelled){const p=touches.get(e.pointerId);if(!p)return;touches.delete(e.pointerId);const now=performance.now();lastInput=now;
  if(cancelled){navigation.lastTap=null;navigation.velocityAz=0;navigation.velocityPolar=0;}
  if(!cancelled&&p.canTap&&!p.moved&&now-p.startTime<450){const hit=pick(e.clientX,e.clientY);if(hit&&hit.object.userData.knob===p.knob){[cycleSpeed,toggleDay,cycleDust][p.knob]();navigation.lastTap=null;}
   else if(p.knob<0&&p.type!=='mouse'){const last=navigation.lastTap;if(last&&now-last.time<320&&Math.hypot(e.clientX-last.x,e.clientY-last.y)<30)resetCamera();else navigation.lastTap={time:now,x:e.clientX,y:e.clientY};}
  }
  if(now-p.time>90){navigation.velocityAz=0;navigation.velocityPolar=0;}
  if(touches.size){touches.forEach(q=>{q.canTap=false;q.moved=true;q.startX=q.x;q.startY=q.y;q.time=now;});navigation.velocityAz=0;navigation.velocityPolar=0;}
  navigation.gesture=gestureSample();if(!touches.size)canvas.style.cursor='grab';
 }
 canvas.addEventListener('pointerup',e=>release(e,false));canvas.addEventListener('pointercancel',e=>release(e,true));canvas.addEventListener('lostpointercapture',e=>release(e,true));canvas.addEventListener('pointerleave',()=>{$('tooltip').style.display='none';});
 canvas.addEventListener('dblclick',e=>{e.preventDefault();resetCamera();});canvas.addEventListener('contextmenu',e=>e.preventDefault());
 canvas.addEventListener('wheel',e=>{e.preventDefault();markInteraction();const pixels=e.deltaY*(e.deltaMode===1?16:e.deltaMode===2?viewHeight:1);zoomBy(Math.exp(THREE.MathUtils.clamp(pixels,-600,600)*.001));},{passive:false});
 window.addEventListener('blur',cancelPointers);window.addEventListener('pagehide',cancelPointers);
 document.addEventListener('pointerdown',e=>{if(e.target!==canvas)markInteraction();},{passive:true});
 window.addEventListener('keydown',e=>{
  if(e.repeat)return;if(e.code==='Escape'){if(document.body.classList.contains('clean'))toggleImmersive();else if(settingsOpen)setControls(false,true);return;}
  if(e.target.closest('input,textarea,select,[contenteditable="true"]'))return;
  if((e.code==='Space'||e.code.startsWith('Arrow'))&&e.target.closest('button,summary,a'))return;
  if(e.code==='Space'){e.preventDefault();toggleRain();}if(e.code==='KeyR')resetCamera();if(e.code==='KeyH')toggleImmersive();if(e.code==='KeyP')togglePause();
  if(e.code==='Equal'||e.code==='NumpadAdd'){markInteraction();zoomBy(.85);}if(e.code==='Minus'||e.code==='NumpadSubtract'){markInteraction();zoomBy(1.15);}
  if(e.code.startsWith('Arrow')){e.preventDefault();markInteraction();if(e.code==='ArrowLeft')targetAz-=.12;if(e.code==='ArrowRight')targetAz+=.12;if(e.code==='ArrowUp')targetPolar=Math.max(.53,targetPolar-.08);if(e.code==='ArrowDown')targetPolar=Math.min(1.38,targetPolar+.08);}
 });
 $('speedButton').onclick=cycleSpeed;$('pauseButton').onclick=togglePause;$('dayButton').onclick=toggleDay;$('dustButton').onclick=cycleDust;$('rainButton').onclick=toggleRain;$('homeButton').onclick=()=>resetCamera();
 $('orbitButton').onclick=()=>{markInteraction();state.orbit=!state.orbit;updateUI();savePreferences();};$('controlsButton').onclick=()=>setControls(!settingsOpen);$('closeControlsButton').onclick=()=>setControls(false,true);
 $('viewButton').onclick=toggleImmersive;$('exitImmersiveButton').onclick=toggleImmersive;$('qualityButton').onclick=cycleQuality;$('fullscreenButton').onclick=toggleFullscreen;refreshFullscreenUI();
 $('timeSlider').oninput=()=>{markInteraction();state.hour=Math.min(23.99,Math.max(0,Number($('timeSlider').value)));state.dayCycle=false;updateEnvironment(0);updateUI();};$('timeSlider').onchange=savePreferences;
 window.addEventListener('resize',()=>resizeViewport());if(window.visualViewport)visualViewport.addEventListener('resize',()=>resizeViewport());document.addEventListener('fullscreenchange',()=>{resizeViewport();refreshFullscreenUI();});
 document.addEventListener('visibilitychange',()=>{cancelPointers();resetFrameClock();});window.addEventListener('pageshow',resetFrameClock);
 canvas.addEventListener('webglcontextlost',e=>{e.preventDefault();restoringContext=true;cancelPointers();notify('画面暂时中断，正在恢复');});
 canvas.addEventListener('webglcontextrestored',()=>{try{refreshEnvironmentMap();applyQuality();renderer.shadowMap.needsUpdate=true;restoringContext=false;resetFrameClock();notify('画面已恢复');}catch(e){fail(e);}});
 resizeViewport(true);updatePanelState();
}
