'use strict';
// Run using the D-drive portable Node runtime. Artifacts and browser profiles stay on D:.
const fs=require('fs');
const path=require('path');
const ROOT=__dirname, OUT=path.join(ROOT,'.verification'), TMP=path.join(OUT,'tmp');
for(const p of [OUT,TMP])fs.mkdirSync(p,{recursive:true});
process.env.TEMP=TMP;process.env.TMP=TMP;process.env.TMPDIR=TMP;
const {chromium}=require('D:/codexAI/tea-mart-mini-game/node_modules/playwright');
const executablePath='D:/OpenAI/CodexData/runtime/playwright-browsers/chromium-1234/chrome-win64/chrome.exe';
const args=['--allow-file-access-from-files','--disable-background-timer-throttling','--disable-renderer-backgrounding','--no-first-run','--no-default-browser-check'];
const baseline=process.argv.includes('--baseline');
const target=process.env.SANDBOX_URL||'file:///'+path.join(ROOT,'index.html').replaceAll('\\','/');
const result={target,mode:baseline?'baseline':'mobile-regression',started:new Date().toISOString(),checks:[],views:[],errors:[]};
function check(name,ok,details){result.checks.push({name,ok:!!ok,details});if(!ok)console.error('FAIL',name,JSON.stringify(details));}
const snapshot=page=>page.evaluate(()=>({state:JSON.parse(JSON.stringify(__sandbox.state)),nav:__sandbox.navigation?JSON.parse(JSON.stringify(__sandbox.navigation)):null,camera:__sandbox.camera.position.toArray(),stats:__sandbox.getStats()}));
async function framePacing(page,ms=2200){return page.evaluate(duration=>new Promise(resolve=>{const times=[];let start,last;function frame(now){start??=now;if(last)times.push(now-last);last=now;if(now-start<duration)requestAnimationFrame(frame);else{const sort=times.slice().sort((a,b)=>a-b),stats=__sandbox.getStats(),renderTimes=__sandbox.metric.frameTimes.slice(-120).sort((a,b)=>a-b);resolve({...stats,rafFPS:Math.round(times.length*1000/(now-start)),medianMs:sort[Math.floor(sort.length*.5)],p95Ms:sort[Math.floor(sort.length*.95)],renderMedianMs:renderTimes[Math.floor(renderTimes.length*.5)],renderP95Ms:renderTimes[Math.floor(renderTimes.length*.95)],over34Ms:times.filter(x=>x>34).length,samples:times.length});}}requestAnimationFrame(frame);}),ms);}
async function touch(cdp,type,points){await cdp.send('Input.dispatchTouchEvent',{type,touchPoints:points.map(p=>({id:p.id,x:p.x,y:p.y,radiusX:5,radiusY:5,force:1}))});}
async function swipe(cdp,from,to,steps=10){await touch(cdp,'touchStart',[{id:1,...from}]);for(let i=1;i<=steps;i++)await touch(cdp,'touchMove',[{id:1,x:from.x+(to.x-from.x)*i/steps,y:from.y+(to.y-from.y)*i/steps}]);await touch(cdp,'touchEnd',[]);}
async function twoGesture(cdp,a,b,da,db,steps=10){await touch(cdp,'touchStart',[{id:1,...a},{id:2,...b}]);for(let i=1;i<=steps;i++)await touch(cdp,'touchMove',[{id:1,x:a.x+da.x*i/steps,y:a.y+da.y*i/steps},{id:2,x:b.x+db.x*i/steps,y:b.y+db.y*i/steps}]);await touch(cdp,'touchEnd',[]);}
async function tap(cdp,x,y){await touch(cdp,'touchStart',[{id:1,x,y}]);await touch(cdp,'touchEnd',[]);}
async function tapControl(page,cdp,selector){const locator=page.locator(selector);await locator.scrollIntoViewIfNeeded();const r=await locator.boundingBox();if(!r)throw new Error('Missing control '+selector);await tap(cdp,r.x+r.width/2,r.y+r.height/2);}
async function touchTargets(page){return page.evaluate(()=>[...document.querySelectorAll('button,input[type="range"],select,summary')].filter(e=>{const r=e.getBoundingClientRect(),s=getComputedStyle(e);return r.width&&r.height&&r.bottom>0&&r.top<innerHeight&&r.right>0&&r.left<innerWidth&&s.visibility!=='hidden'&&s.display!=='none';}).map(e=>({id:e.id||e.parentElement.id+':'+e.tagName,w:e.getBoundingClientRect().width,h:e.getBoundingClientRect().height})));}
function distance(a,b){return Math.hypot(...a.map((v,i)=>v-b[i]));}
async function main(){
 const browser=await chromium.launch({executablePath,headless:true,args,downloadsPath:TMP,env:{...process.env,TEMP:TMP,TMP:TMP,TMPDIR:TMP}});
 try{
  const dimensions=baseline?[['desktop',1440,900,false],['portrait',390,844,true]]:[['portrait',390,844,true],['landscape',844,390,true],['small',320,568,true],['tablet',768,1024,true],['desktop',1440,900,false]];
  for(const [label,width,height,mobile] of dimensions){
   const context=await browser.newContext({viewport:{width,height},isMobile:mobile,hasTouch:mobile,deviceScaleFactor:mobile?2:1,acceptDownloads:false});
   const page=await context.newPage();const errors=[],requests=[];
   page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>{if(/^https?:/.test(r.url()))requests.push(r.url());});
   await page.goto(target,{waitUntil:'load'});await page.waitForFunction(()=>window.__sandbox,{timeout:60000});await page.waitForTimeout(1200);
   await page.evaluate(()=>{__sandbox.state.orbit=false;__sandbox.state.dayCycle=false;});
   const cdp=await context.newCDPSession(page);
   const view={label,width,height,mobile,initial:await snapshot(page),errors,requests};
   view.clear=await framePacing(page);await page.screenshot({path:path.join(OUT,`${baseline?'baseline-':''}${label}-clear.png`)});
   if(baseline){
    await page.evaluate(()=>__sandbox.actions.rain());await page.waitForTimeout(1200);view.rain=await framePacing(page);
    if(label==='portrait'){
     await cdp.send('Profiler.enable');await cdp.send('Profiler.setSamplingInterval',{interval:1000});await cdp.send('Profiler.start');await page.waitForTimeout(3200);const {profile}=await cdp.send('Profiler.stop');
     fs.writeFileSync(path.join(OUT,'baseline-mobile-rain.cpuprofile'),JSON.stringify(profile));
     const totals=new Map();for(const n of profile.nodes){const f=n.callFrame;const key=`${f.functionName||'(anonymous)'} @ ${f.url.split('/').pop()}:${f.lineNumber+1}`;totals.set(key,(totals.get(key)||0)+(n.hitCount||0));}view.cpuTop=[...totals.entries()].sort((a,b)=>b[1]-a[1]).slice(0,16);
    }
   }else{
    check(label+' no horizontal overflow',await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),{width});
    view.sceneFit=await page.evaluate(()=>{const points=[];for(const x of[-15.35,15.35])for(const z of[-10.35,10.35]){const v=new THREE.Vector3(x,.26,z).project(__sandbox.camera);points.push({x:v.x,y:v.y,z:v.z});}return {points,inside:points.every(v=>Math.abs(v.x)<=.99&&Math.abs(v.y)<=.99&&v.z>-1&&v.z<1)};});
    check(label+' model slab fully framed on launch',view.sceneFit.inside,view.sceneFit);
    const targets=await touchTargets(page);
    view.targets=targets;if(mobile)check(label+' touch targets >=44px',targets.every(t=>t.w>=44&&t.h>=44),targets.filter(t=>t.w<44||t.h<44));
    if(label==='portrait')await regression(page,cdp,view);
    if(!mobile){
     const beforeDesktop=await snapshot(page);await page.mouse.move(650,340);await page.mouse.down();await page.mouse.move(760,380,{steps:8});await page.mouse.up();await page.waitForTimeout(250);const afterDesktop=await snapshot(page);check('desktop mouse orbit preserved',distance(beforeDesktop.camera,afterDesktop.camera)>1);
     await page.mouse.wheel(0,280);await page.waitForTimeout(200);const afterWheel=await snapshot(page);check('desktop wheel zoom preserved',afterWheel.nav.targetRadius>afterDesktop.nav.targetRadius);
     await page.keyboard.press('Space');check('desktop space toggles rain',await page.evaluate(()=>__sandbox.state.rain));await page.keyboard.press('Space');
     await page.keyboard.press('h');check('desktop H enters immersive',await page.evaluate(()=>document.body.classList.contains('clean')));await page.keyboard.press('h');check('desktop H exits immersive despite focused exit button',!await page.evaluate(()=>document.body.classList.contains('clean')));
     await page.keyboard.press('r');await page.waitForTimeout(350);const home=await snapshot(page);check('desktop R resets view',Math.abs(home.nav.targetRadius-home.nav.homeDistance)<.05);
     await page.keyboard.press('p');check('desktop P pauses simulation',await page.evaluate(()=>__sandbox.state.speed===0));await page.keyboard.press('p');
    }
    if(mobile){
     if(!await page.locator('#controlPanel').isVisible())await tapControl(page,cdp,'#controlsButton');
     await page.locator('#controlPanel').evaluate(e=>e.scrollTop=0);await page.waitForTimeout(100);
     view.expandedTargets=await touchTargets(page);check(label+' settings touch targets >=44px',view.expandedTargets.every(t=>t.w>=44&&t.h>=44),view.expandedTargets.filter(t=>t.w<44||t.h<44));
     await page.screenshot({path:path.join(OUT,`${label}-settings.png`)});await tapControl(page,cdp,'#closeControlsButton');
    }
   }
   check(label+' no page/console errors',errors.length===0,errors);result.views.push(view);await context.close();
  }
  if(!baseline){await robustness(browser);await cadenceRegression(browser);}
 }finally{await browser.close();fs.writeFileSync(path.join(OUT,baseline?'baseline-performance.json':'mobile-verification.json'),JSON.stringify(result,null,2));}
 console.log(JSON.stringify({target:result.target,mode:result.mode,passed:result.checks.filter(c=>c.ok).length,failed:result.checks.filter(c=>!c.ok),views:result.views.map(v=>({label:v.label,width:v.width,height:v.height,clear:{fps:v.clear.fps,rafFPS:v.clear.rafFPS,renderMedianMs:v.clear.renderMedianMs,renderP95Ms:v.clear.renderP95Ms,cpuFrameMs:v.clear.cpuFrameMs,dpr:v.clear.dpr,drawCalls:v.clear.drawCalls},rain:v.rain?{fps:v.rain.fps,renderP95Ms:v.rain.renderP95Ms,cpuFrameMs:v.rain.cpuFrameMs}:null,errors:v.errors,requests:v.requests})),errors:result.errors,report:path.join(OUT,baseline?'baseline-performance.json':'mobile-verification.json')},null,2));if(result.checks.some(c=>!c.ok))process.exitCode=1;
}
async function regression(page,cdp,view){
 // These selectors are stable interface IDs; tests use browser-generated touch events.
 await nativeButtonRegression(page,cdp);
 const before=await snapshot(page);check('navigation diagnostics available',!!before.nav,before.nav);await swipe(cdp,{x:150,y:350},{x:230,y:385});await page.waitForTimeout(260);const orbit=await snapshot(page);
 check('single finger orbit',distance(before.camera,orbit.camera)>.4,{before:before.nav,after:orbit.nav});
 await twoGesture(cdp,{x:135,y:400},{x:255,y:400},{x:-38,y:0},{x:38,y:0});await page.waitForTimeout(260);const pinch=await snapshot(page);
 check('two finger spread zooms in',pinch.nav?pinch.nav.targetRadius<orbit.nav.targetRadius:distance(orbit.camera,pinch.camera)>.5,{before:orbit.nav,after:pinch.nav});
 await twoGesture(cdp,{x:135,y:380},{x:255,y:380},{x:25,y:20},{x:25,y:20});await page.waitForTimeout(260);const pan=await snapshot(page);
 check('two finger parallel pan',pan.nav?distance(Object.values(pinch.nav.targetFocus),Object.values(pan.nav.targetFocus))>.1:distance(pinch.camera,pan.camera)>.1,{before:pinch.nav,after:pan.nav});
 await touch(cdp,'touchStart',[{id:1,x:150,y:360},{id:2,x:250,y:360}]);await touch(cdp,'touchMove',[{id:1,x:140,y:365},{id:2,x:260,y:365}]);await touch(cdp,'touchEnd',[{id:2,x:260,y:365}]);await page.waitForTimeout(400);const lifting=await snapshot(page);await touch(cdp,'touchMove',[{id:1,x:140,y:365}]);await page.waitForTimeout(80);const steady=await snapshot(page);await touch(cdp,'touchEnd',[]);
 check('lifting one finger rebases without orbit jump',lifting.nav?lifting.nav.activePointers===1&&steady.nav.activePointers===1&&Math.abs(lifting.nav.targetAz-steady.nav.targetAz)<.0001:false,{before:lifting.nav,after:steady.nav});
 await touch(cdp,'touchStart',[{id:1,x:190,y:370}]);await touch(cdp,'touchCancel',[]);const canceled=await snapshot(page);check('pointer cancel clears active touches',canceled.nav?canceled.nav.activePointers===0:true,canceled.nav);
 await tap(cdp,190,330);await page.waitForTimeout(70);await tap(cdp,190,330);await page.waitForTimeout(600);const reset=await snapshot(page);check('double tap restores home camera',reset.nav?Math.abs(reset.nav.targetRadius-reset.nav.homeDistance)<.05:true,reset.nav);
 for(let i=0;i<3;i++){
  const knob=await page.evaluate(index=>__sandbox.projectKnob(index),i),knobBefore=await snapshot(page);
  const canvasAtKnob=await page.evaluate(p=>document.elementFromPoint(p.x,p.y)?.id==='scene',knob);
  check(`physical knob ${i} is reachable on canvas`,canvasAtKnob,knob);
  if(!canvasAtKnob)continue;
  const second={id:2,x:knob.x+(knob.x>300?-35:35),y:knob.y-20};
  await touch(cdp,'touchStart',[{id:1,...knob}]);await touch(cdp,'touchStart',[{id:1,...knob},second]);await touch(cdp,'touchEnd',[second]);await touch(cdp,'touchEnd',[]);
  const knobAfter=await snapshot(page);
  check(`multitouch does not activate physical knob ${i}`,['speedIndex','dayCycle','dust'].every(k=>knobAfter.state[k]===knobBefore.state[k]),{before:knobBefore.state,after:knobAfter.state});
 }
 await controlsRegression(page,cdp,view);
 view.gestures={orbit:orbit.nav,pinch:pinch.nav,pan:pan.nav,reset:reset.nav};
}
async function nativeButtonRegression(page,cdp){
 await page.evaluate(()=>{let rain=__sandbox.state.rain;window.__verificationRainTransitions=0;Object.defineProperty(__sandbox.state,'rain',{enumerable:true,configurable:true,get(){return rain;},set(value){if(value!==rain)window.__verificationRainTransitions++;rain=value;}});});
 await cdp.send('Input.dispatchTouchEvent',{type:'touchStart',touchPoints:[{id:1,x:140,y:340}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchMove',touchPoints:[{id:1,x:220,y:350}]});await cdp.send('Input.dispatchTouchEvent',{type:'touchEnd',touchPoints:[]});
 await page.locator('#rainButton').tap();await page.waitForTimeout(400);check('first touch button tap after a fast canvas drag works exactly once',await page.evaluate(()=>__sandbox.state.rain&&window.__verificationRainTransitions===1),await page.evaluate(()=>({rain:__sandbox.state.rain,transitions:window.__verificationRainTransitions,pointers:__sandbox.navigation.activePointers})));
 await page.locator('#rainButton').tap();await page.waitForTimeout(400);check('normal touch tap does not double activate from synthesized click',await page.evaluate(()=>!__sandbox.state.rain&&window.__verificationRainTransitions===2));
 const r=await page.locator('#rainButton').boundingBox(),point={id:1,x:r.x+r.width/2,y:r.y+r.height/2};
 await touch(cdp,'touchStart',[point]);await touch(cdp,'touchMove',[{...point,x:point.x+18}]);await touch(cdp,'touchEnd',[]);await page.waitForTimeout(150);check('sliding on a touch button does not activate it',await page.evaluate(()=>!__sandbox.state.rain&&window.__verificationRainTransitions===2));
 await touch(cdp,'touchStart',[point]);await touch(cdp,'touchCancel',[]);await page.waitForTimeout(120);check('cancelled button touch does not activate it',await page.evaluate(()=>!__sandbox.state.rain&&window.__verificationRainTransitions===2));
 await page.evaluate(()=>{const rain=__sandbox.state.rain;Object.defineProperty(__sandbox.state,'rain',{value:rain,writable:true,enumerable:true,configurable:true});});
 await tapControl(page,cdp,'#homeButton');await page.waitForTimeout(500);
}
async function controlsRegression(page,cdp,view){
 check('phone settings initially collapsed',!await page.locator('#controlPanel').isVisible());
 await tapControl(page,cdp,'#controlsButton');check('settings opens by touch',await page.locator('#controlPanel').isVisible()&&await page.locator('#controlsButton').getAttribute('aria-expanded')==='true');
 const speedBefore=await page.evaluate(()=>__sandbox.state.speed);await tapControl(page,cdp,'#speedButton');const chosenSpeed=await page.evaluate(()=>__sandbox.state.speed);check('speed setting changes',chosenSpeed!==speedBefore,{speedBefore,chosenSpeed});
 await tapControl(page,cdp,'#pauseButton');const paused=await snapshot(page);await page.waitForTimeout(300);const stillPaused=await snapshot(page);
 check('pause stops simulation clock',paused.state.speed===0&&paused.state.simTime===stillPaused.state.simTime,{paused:paused.state,after:stillPaused.state});
 await tapControl(page,cdp,'#rainButton');await page.waitForTimeout(450);const rain=await snapshot(page);check('rain touch button works while paused',rain.state.rain&&rain.state.wet>0&&rain.state.simTime===paused.state.simTime,rain.state);
 await tapControl(page,cdp,'#pauseButton');check('resume restores chosen speed',await page.evaluate(()=>__sandbox.state.speed)===chosenSpeed,{chosenSpeed});view.rain=await framePacing(page);await page.screenshot({path:path.join(OUT,'portrait-rain.png')});
 await tapControl(page,cdp,'#rainButton');
 const qualityBefore=await page.locator('#qualityValue').textContent();await tapControl(page,cdp,'#qualityButton');const qualityAfter=await page.locator('#qualityValue').textContent();check('quality control changes preset',qualityAfter!==qualityBefore,{qualityBefore,qualityAfter,stats:await page.evaluate(()=>__sandbox.getStats())});
 if(await page.locator('#fullscreenButton').isEnabled()){
  await tapControl(page,cdp,'#fullscreenButton');await page.waitForTimeout(250);check('fullscreen enters through a touch button',await page.evaluate(()=>!!document.fullscreenElement));await tapControl(page,cdp,'#fullscreenButton');await page.waitForTimeout(180);check('fullscreen exits through same touch button',await page.evaluate(()=>!document.fullscreenElement));
 }
 const slider=page.locator('#timeSlider');await slider.scrollIntoViewIfNeeded();const r=await slider.boundingBox();await swipe(cdp,{x:r.x+r.width*.4,y:r.y+r.height/2},{x:r.x+r.width*.79,y:r.y+r.height/2},8);const time=await snapshot(page);const sliderValue=Number(await slider.inputValue());check('time slider sets hour and stops day cycle',!time.state.dayCycle&&Math.abs(time.state.hour-sliderValue)<.11,{hour:time.state.hour,sliderValue});
 await tapControl(page,cdp,'#dayButton');check('day cycle can resume',await page.evaluate(()=>__sandbox.state.dayCycle));await tapControl(page,cdp,'#dayButton');
 const dustBefore=await page.evaluate(()=>__sandbox.state.dust);await tapControl(page,cdp,'#dustButton');check('dust control changes intensity',await page.evaluate(()=>__sandbox.state.dust)!==dustBefore);
 await tapControl(page,cdp,'#viewButton');check('immersive hides controls and keeps a touch exit',await page.evaluate(()=>document.body.classList.contains('clean'))&&await page.locator('#exitImmersiveButton').isVisible()&&!await page.locator('#controlsButton').isVisible());
 await tapControl(page,cdp,'#exitImmersiveButton');check('touch exit restores interface',!await page.evaluate(()=>document.body.classList.contains('clean'))&&await page.locator('#controlsButton').isVisible());
 if(!await page.locator('#controlPanel').isVisible())await tapControl(page,cdp,'#controlsButton');await tapControl(page,cdp,'#closeControlsButton');check('settings closes by touch',!await page.locator('#controlPanel').isVisible()&&await page.locator('#controlsButton').getAttribute('aria-expanded')==='false');
 await tapControl(page,cdp,'#homeButton');await page.waitForTimeout(500);
 const current=await snapshot(page);await page.reload();await page.waitForFunction(()=>window.__sandbox);await page.waitForTimeout(900);const reloaded=await snapshot(page);
 check('quality preference survives reload',await page.locator('#qualityValue').textContent()===qualityAfter,{qualityAfter,reloaded:await page.locator('#qualityValue').textContent()});check('reload does not start in immersive mode',!await page.evaluate(()=>document.body.classList.contains('clean')));
 await touch(cdp,'touchStart',[{id:1,x:190,y:370}]);await page.setViewportSize({width:844,height:390});await page.waitForTimeout(250);const rotated=await snapshot(page);check('rotation clears in-progress gesture',rotated.nav.activePointers===0,rotated.nav);await touch(cdp,'touchCancel',[]);await page.setViewportSize({width:390,height:844});await page.waitForTimeout(300);const portraitAgain=await snapshot(page);check('rotation preserves home zoom framing',Math.abs(portraitAgain.nav.targetRadius/portraitAgain.nav.homeDistance-1)<.02,portraitAgain.nav);
 view.controls={chosenSpeed,qualityBefore,qualityAfter,timeSliderHour:time.state.hour,priorReload:current.state,reloaded:reloaded.state};
}
async function robustness(browser){
 result.robustness={};
 const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),page=await context.newPage();const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});
 await page.addInitScript(()=>{try{localStorage.setItem('north-yard-settings-v2','{corrupt');}catch(_){}});
 await page.goto(target);await page.waitForFunction(()=>window.__sandbox,{timeout:30000});await page.waitForTimeout(850);
 check('corrupt saved settings fall back without breaking startup',await page.evaluate(()=>__sandbox.state.speed===1&&__sandbox.getStats().quality==='auto')&&errors.length===0,{errors,stats:await page.evaluate(()=>__sandbox.getStats())});
 const supported=await page.evaluate(()=>{window.__verificationLoss=__sandbox.renderer.getContext().getExtension('WEBGL_lose_context');return !!window.__verificationLoss;});check('context loss extension available to verify recovery',supported);
 if(supported){
  await page.evaluate(()=>{__sandbox.state.orbit=false;window.__verificationLoss.loseContext();});await page.waitForTimeout(250);const lost=await snapshot(page);await page.waitForTimeout(180);check('context loss pauses simulation safely',await page.evaluate(()=>__sandbox.renderer.getContext().isContextLost())&&await page.evaluate(()=>__sandbox.state.simTime)===lost.state.simTime,lost.state);
  await page.evaluate(()=>window.__verificationLoss.restoreContext());await page.waitForFunction(t=>!__sandbox.renderer.getContext().isContextLost()&&__sandbox.state.simTime>t,lost.state.simTime,{timeout:15000});await page.waitForTimeout(1500);check('WebGL context restores scene and animation',!await page.locator('#error').isVisible()&&errors.length===0,{errors,stats:await page.evaluate(()=>__sandbox.getStats())});await page.screenshot({path:path.join(OUT,'portrait-context-restored.png')});result.robustness.contextRecovery=await framePacing(page,1200);
 }
 await context.close();
 const failedContext=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true,deviceScaleFactor:2}),failedPage=await failedContext.newPage(),expectedErrors=[];failedPage.on('console',m=>{if(m.type()==='error')expectedErrors.push(m.text());});
 await failedPage.addInitScript(()=>{if(new URLSearchParams(location.search).get('quality')!=='eco'){const original=HTMLCanvasElement.prototype.getContext;HTMLCanvasElement.prototype.getContext=function(kind,...args){if(['webgl','webgl2','experimental-webgl'].includes(kind))return null;return original.call(this,kind,...args);};}});
 await failedPage.goto(target);await failedPage.locator('#error').waitFor({state:'visible',timeout:10000});const buttons=await failedPage.locator('#error button').allTextContents();check('startup failure presents useful retry controls',buttons.includes('重新加载')&&buttons.includes('尝试流畅模式')&&!await failedPage.locator('#loading').isVisible(),{buttons,expectedErrors});await failedPage.screenshot({path:path.join(OUT,'startup-retry.png')});
 await failedPage.getByRole('button',{name:'尝试流畅模式',exact:true}).tap();await failedPage.waitForFunction(()=>window.__sandbox,{timeout:30000});await failedPage.waitForTimeout(850);check('friendly eco retry navigates and recovers',await failedPage.evaluate(()=>new URLSearchParams(location.search).get('quality')==='eco'&&__sandbox.getStats().quality==='eco')&&!await failedPage.locator('#error').isVisible());
 result.robustness.startupRetry={buttons,expectedErrors,recoveredURL:failedPage.url()};await failedContext.close();
}
async function cadenceRegression(browser){
 result.cadence=[];
 for(const hz of[90,144]){
  const context=await browser.newContext({viewport:{width:390,height:844},isMobile:true,hasTouch:true}),page=await context.newPage();
  await page.addInitScript(()=>{window.requestAnimationFrame=callback=>{if(callback.name==='frame')window.__verificationFrame=callback;return 1;};});
  await page.goto(target);await page.waitForFunction(()=>window.__sandbox&&window.__verificationFrame,{},{timeout:30000,polling:100});
  const measured=await page.evaluate(refresh=>{const renderer=__sandbox.renderer,original=renderer.render;let count=0;renderer.render=function(...args){count++;return original.apply(this,args);};const start=performance.now();for(let i=1;i<=refresh*3;i++)window.__verificationFrame(start+i*1000/refresh);renderer.render=original;return{displayHz:refresh,renders:count,renderFPS:count/3,reportedFPS:__sandbox.getStats().fps};},hz);
  check(`render cap maintains 60fps on a ${hz}Hz display`,measured.renderFPS>=59&&measured.renderFPS<=61,measured);result.cadence.push(measured);await context.close();
 }
}
main().catch(e=>{result.errors.push(e.stack);fs.writeFileSync(path.join(OUT,baseline?'baseline-performance.json':'mobile-verification.json'),JSON.stringify(result,null,2));console.error(e);process.exitCode=1;});
