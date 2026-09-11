const {chromium}=require('D:/codexAI/tea-mart-mini-game/node_modules/playwright');
const fs=require('fs'),path=require('path');
const root=__dirname;
(async()=>{
 const browser=await chromium.launch({executablePath:'C:/Program Files/Google/Chrome/Application/chrome.exe',headless:true,args:['--allow-file-access-from-files','--disable-background-timer-throttling']});
 const page=await browser.newPage({viewport:{width:1600,height:1000},deviceScaleFactor:1});
 const errors=[],requests=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text());});page.on('request',r=>requests.push(r.url()));
 await page.goto('file:///'+path.join(root,'筑造之间-体素工地沙盘.html').replaceAll('\\','/'));
 await page.waitForFunction(()=>window.__sandbox,{timeout:60000});
 await page.waitForTimeout(1800);
 await page.evaluate(()=>{__sandbox.state.orbit=false;__sandbox.state.dayCycle=false;});
 await page.screenshot({path:path.join(root,'preview-day.png')});
 const initial=await page.evaluate(()=>__sandbox.getStats());
 console.log(JSON.stringify({initial,errors,network:requests.filter(u=>/^https?:/.test(u))},null,2));
 if(process.argv.includes('--full')){
  await page.evaluate(()=>__sandbox.setHour(23));await page.waitForTimeout(500);await page.screenshot({path:path.join(root,'preview-night.png')});
  await page.keyboard.press('Space');await page.waitForTimeout(3000);await page.screenshot({path:path.join(root,'preview-rain.png')});
  const rainPerformance=await page.evaluate(()=>{const ts=__sandbox.metric.frameTimes.slice(-180).sort((a,b)=>a-b);return {fps:__sandbox.metric.fps,medianFrameMs:ts[Math.floor(ts.length*.5)],p95FrameMs:ts[Math.floor(ts.length*.95)]};});
  const interactions={rain:await page.evaluate(()=>__sandbox.state.rain)};
  await page.keyboard.press('Space');await page.click('#speedButton');interactions.speed=await page.evaluate(()=>__sandbox.state.speed);
  await page.click('#dustButton');interactions.dust=await page.evaluate(()=>__sandbox.state.dust);
  await page.click('#dayButton');interactions.day=await page.evaluate(()=>__sandbox.state.dayCycle);
  const knob=await page.evaluate(()=>__sandbox.projectKnob(0));await page.mouse.click(knob.x,knob.y);interactions.physicalKnobSpeed=await page.evaluate(()=>__sandbox.state.speed);
  await page.evaluate(()=>{__sandbox.state.speed=0;});
  const safety=await page.evaluate(()=>{const violations=[],states=new Set();let minimumGap=999,minBucket=999;for(let i=0;i<15000;i++){__sandbox.step(.04);const a=__sandbox.machines.audit();if(!a.ok&&violations.length<30)violations.push({i,a});minimumGap=Math.min(minimumGap,a.minimumVehicleCenterDistance);minBucket=Math.min(minBucket,...a.bucketFloorClearance);for(const v of __sandbox.machines.vehicles)states.add(v.state);}return {violations,minimumGap,minBucket,states:[...states],workers:__sandbox.staff.audit()};});
  // The accelerated safety audit intentionally blocks the page; measure rendering after it recovers.
  await page.waitForTimeout(2500);
  const performanceStats=await page.evaluate(()=>{const ts=__sandbox.metric.frameTimes.slice(-180).sort((a,b)=>a-b);return {medianFrameMs:ts[Math.floor(ts.length*.5)],p95FrameMs:ts[Math.floor(ts.length*.95)],...__sandbox.getStats()};});
  const knobDay=await page.evaluate(()=>__sandbox.projectKnob(1));const dayBefore=await page.evaluate(()=>__sandbox.state.dayCycle);await page.mouse.click(knobDay.x,knobDay.y);interactions.physicalDayKnob=await page.evaluate(old=>__sandbox.state.dayCycle!==old,dayBefore);
  const knobDust=await page.evaluate(()=>__sandbox.projectKnob(2));const dustBefore=await page.evaluate(()=>__sandbox.state.dust);await page.mouse.click(knobDust.x,knobDust.y);interactions.physicalDustKnob=await page.evaluate(old=>__sandbox.state.dust!==old,dustBefore);
  const simBefore=await page.evaluate(()=>__sandbox.state.simTime);await page.waitForTimeout(150);interactions.pauseHoldsSim=await page.evaluate(old=>__sandbox.state.simTime===old,simBefore);
  const cameraBefore=await page.evaluate(()=>__sandbox.camera.position.toArray());await page.mouse.move(850,360);await page.mouse.down();await page.mouse.move(950,380,{steps:8});await page.mouse.up();await page.waitForTimeout(200);interactions.dragChangesCamera=await page.evaluate(old=>__sandbox.camera.position.distanceTo(new THREE.Vector3(...old))>1,cameraBefore);
  const distanceBefore=await page.evaluate(()=>__sandbox.camera.position.length());await page.mouse.wheel(0,400);await page.waitForTimeout(250);interactions.wheelZooms=await page.evaluate(old=>__sandbox.camera.position.length()>old+1,distanceBefore);
  await page.keyboard.press('h');interactions.immersive=await page.evaluate(()=>document.body.classList.contains('clean'));await page.keyboard.press('h');await page.keyboard.press('r');
  const result={initial,rainPerformance,interactions,safety,performanceStats,errors,network:requests.filter(u=>/^https?:/.test(u))};fs.writeFileSync(path.join(root,'verification.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
 }
 await browser.close();
})().catch(e=>{console.error(e);process.exitCode=1;});
