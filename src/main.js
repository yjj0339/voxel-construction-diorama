const state={speed:1,speedIndex:2,dayCycle:true,hour:16.33,dust:1,rain:false,orbit:true,simTime:0,realTime:0,wet:0,night:0};
const speedSteps=[0,.5,1,2,4],dustNames=['关闭','轻盈','浓郁'];
let renderer,camera,machines,staff,architecture,dayLight,hemi,fillLight,glowPoints,dustPoints,rainLines,puddle,envMap,envSource,envTarget,lowPower=false;
const lamps=[],knobs=[],pickTargets=[],rainUniforms={time:{value:0},strength:{value:0}},glowUniforms={strength:{value:0},pixelRatio:{value:1}};
let azimuth=.63,polar=1.12,radius=51,targetAz=.63,targetPolar=1.12,targetRadius=51,lastInput=0,lastHover=0,toastTimer=0;
const focus=new THREE.Vector3(0,4.6,0),targetFocus=focus.clone(),raycaster=new THREE.Raycaster(),pointer=new THREE.Vector2();
const tempV=new THREE.Vector3(),metric={fps:60,draws:0,triangles:0,frameTimes:[],cpuFrameMs:0,quality:'auto',version:'2.0.0'};
const palette={sunset:new THREE.Color(0xffb269),night:new THREE.Color(0x172331),day:new THREE.Color(0x475151),dusk:new THREE.Color(0x5a4b45),rain:new THREE.Color(0x26383e),windowDay:new THREE.Color(0x8d9da2),windowDusk:new THREE.Color(0xa58a7c),windowRain:new THREE.Color(0x3f5360),wetRoad:new THREE.Color(0x384b4c),background:new THREE.Color()};
function notify(text){$('toast').textContent=text;$('toast').classList.add('show');clearTimeout(toastTimer);toastTimer=setTimeout(()=>$('toast').classList.remove('show'),2600);}
function fail(e){console.error(e);if(window.__boot)window.__boot.fail('未能启动三维画面。可选择流畅模式重试。'+(e.message?'（'+e.message+'）':''),true);}
function refreshEnvironmentMap(){const pm=new THREE.PMREMGenerator(renderer),old=envTarget;envTarget=pm.fromEquirectangular(envSource);envMap=envTarget.texture;scene.environment=envMap;pm.dispose();if(old)old.dispose();}
function initialize(){
 if(THREE.REVISION!=='160')throw new Error('Three.js version mismatch');
 lowPower=!!(coarsePointer||(navigator.hardwareConcurrency&&navigator.hardwareConcurrency<=4)||(navigator.deviceMemory&&navigator.deviceMemory<=4));loadPreferences();
 renderer=new THREE.WebGLRenderer({canvas:$('scene'),antialias:!lowPower,powerPreference:'high-performance'});renderer.setPixelRatio(qualityBudget().dpr);renderer.setSize(innerWidth,innerHeight);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.toneMappingExposure=1.1;renderer.shadowMap.enabled=qualityBudget().shadows;renderer.shadowMap.type=THREE.PCFSoftShadowMap;renderer.shadowMap.autoUpdate=false;
 camera=new THREE.PerspectiveCamera(43,innerWidth/innerHeight,.3,210);scene.background=new THREE.Color(0x39464a);scene.fog=new THREE.FogExp2(0x39464a,.008);
 envSource=canvasTexture(256,128,(c,w,h)=>{const g=c.createLinearGradient(0,0,0,h);g.addColorStop(0,'#bac4c6');g.addColorStop(.45,'#b6bbb3');g.addColorStop(.52,'#71776e');g.addColorStop(1,'#292826');c.fillStyle=g;c.fillRect(0,0,w,h);c.fillStyle='#f9ebcf';c.fillRect(25,22,36,40);c.fillStyle='#b3c3cb';c.fillRect(155,15,65,32);});envSource.mapping=THREE.EquirectangularReflectionMapping;refreshEnvironmentMap();
 hemi=new THREE.HemisphereLight(0xd9e9f0,0x8e7352,2.25);scene.add(hemi);dayLight=new THREE.DirectionalLight(0xffd59b,3.6);dayLight.position.set(-20,36,17);dayLight.castShadow=true;dayLight.shadow.mapSize.set(2048,2048);Object.assign(dayLight.shadow.camera,{left:-26,right:26,top:23,bottom:-22,near:1,far:100});dayLight.shadow.bias=-.00025;dayLight.shadow.normalBias=.025;dayLight.target.position.set(0,2,0);scene.add(dayLight,dayLight.target);fillLight=new THREE.DirectionalLight(0x9fc7e3,.85);fillLight.position.set(20,18,-18);scene.add(fillLight);
 buildTable();architecture=buildArchitecture();machines=buildMachinery();staff=buildWorkers();pruneLooseGravel(architecture,staff);buildPhysicalControls();buildIllumination();buildParticles();buildPuddles();flushBatches();
 // Shared static cuboids are a single color-instanced draw; only articulated parts move separately.
 scene.updateMatrixWorld(true);scene.matrixWorldAutoUpdate=false;createGlowBatch();bindInput();applyQuality();updateCamera(1);updateEnvironment(0);renderer.shadowMap.needsUpdate=true;renderer.compile(scene,camera);renderer.render(scene,camera);
 $('loading').style.opacity=0;setTimeout(()=>$('loading').style.display='none',650);
 window.__sandbox={state,scene,camera,renderer,machines,staff,architecture,metric,knobs,lowPower,navigation,actions:{speed:cycleSpeed,pause:togglePause,quality:cycleQuality,day:toggleDay,dust:cycleDust,rain:toggleRain,reset:resetCamera},setHour(h){state.hour=THREE.MathUtils.clamp(h,0,23.99);updateEnvironment(0);updateUI();},step(dt){state.simTime+=dt;machines.update(dt,state.simTime);staff.update(dt,state.simTime);scene.updateMatrixWorld(true);},getStats(){return {version:metric.version,revision:THREE.REVISION,instances:instanceCount,workers:staff.count,drawCalls:renderer.info.render.calls,triangles:renderer.info.render.triangles,fps:metric.fps,cpuFrameMs:metric.cpuFrameMs,dpr:renderer.getPixelRatio(),geometries:renderer.info.memory.geometries,textures:renderer.info.memory.textures,vehicleAudit:machines.audit?machines.audit():null,workerAudit:staff.audit?staff.audit():null,lowPower,quality:qualityMode,shadows:renderer.shadowMap.enabled,activePointers:touches.size};},projectKnob(i){const v=knobs[i].group.getWorldPosition(new THREE.Vector3());v.y+=.5;v.project(camera);return {x:(v.x*.5+.5)*viewWidth,y:(-.5*v.y+.5)*viewHeight};}};
 window.__boot.ready();$('error').style.display='none';resetFrameClock();requestAnimationFrame(frame);
}
function buildPhysicalControls(){
 const panel=group(scene,0,.12,12.95);box(panel,0x253238,0,.11,0,10.1,.22,2.95);box(panel,0x8c7b58,0,.235,0,10.03,.04,2.88);
 box(panel,0x2e3b3f,0,.267,0,9.9,.025,2.75);
 for(const x of[-4.7,4.7])for(const z of[-1.12,1.12]){cyl(panel,0xa5a293,x,.295,z,.055,.055,.024,10);box(panel,0x3a4242,x,.312,z,.065,.008,.011);}
 const names=['SPEED','DAY / NIGHT','DUST'];
 for(let i=0;i<3;i++){const x=(i-1)*3.08;const base=cyl(panel,0x1b272c,x,.38,-.16,.8,.8,.19,32);cyl(panel,0xc5af77,x,.48,-.16,.67,.67,.035,32);const k=group(panel,x,.52,-.16);cyl(k,0x334249,0,.2,0,.6,.64,.4,24);cyl(k,0x47565b,0,.41,0,.55,.6,.045,24);for(let j=0;j<24;j++){const a=j*Math.PI/12;box(k,0x67716c,Math.cos(a)*.591,.19,Math.sin(a)*.591,.035,.3,.035,0,-a,0);}box(k,0xf6cb64,0,.442,-.36,.065,.015,.25);const target=new THREE.Mesh(new THREE.CylinderGeometry(.8,.8,.8,16),new THREE.MeshBasicMaterial({visible:false}));target.position.set(x,.65,-.16);target.userData.knob=i;panel.add(target);pickTargets.push(target);knobs.push({group:k,angle:0});
 for(let j=0;j<9;j++){const a=-Math.PI*.8+j/8*Math.PI*1.6;box(panel,0xb1a681,x+Math.sin(a)*.9,.3,-.16-Math.cos(a)*.9,.032,.018,.11,0,-a,0);}const l=label(panel,names[i],x,.296,1.04,2.2,.36,{bg:'#2e3b3f',fg:'#d8cfaf'});l.rotation.x=-Math.PI/2;
 }const tiny=label(panel,'M I N I A T U R E   C O N T R O L   U N I T',0,.297,-1.19,6.5,.2,{bg:'#2e3b3f',fg:'#8c9a98'});tiny.rotation.x=-Math.PI/2;
}
function buildIllumination(){
 // Four finite-range lights, with one shadow atlas from the studio key light.
 const beamMaterial=new THREE.ShaderMaterial({transparent:true,depthWrite:false,side:THREE.DoubleSide,blending:THREE.AdditiveBlending,uniforms:glowUniforms,vertexShader:'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',fragmentShader:'uniform float strength;varying vec2 vUv;varying vec3 vWorld;void main(){if(abs(vWorld.x)>14.5||abs(vWorld.z)>9.05)discard;float a=.024*strength*(.35+vUv.y*.65)*smoothstep(0.,.15,vUv.y);gl_FragColor=vec4(1.,.74,.38,a);}'});
 for(const [x,z,tx,tz]of[[-14.02,-8.65,-9,-5.1],[14.02,-8.65,9,-5.6],[-14.02,8.64,-9,4.2],[14.02,8.64,7,4.9]]){const light=new THREE.SpotLight(0xffcd8a,0,24,.8,.7,1.4);light.position.set(x,5.76,z);light.target.position.set(tx,G,tz);scene.add(light,light.target);lamps.push(light);const end=new THREE.Vector3(tx,G+.05,tz),start=light.position.clone(),v=start.clone().sub(end);const shaft=new THREE.Mesh(new THREE.CylinderGeometry(.06,2.6,v.length(),24,1,true),beamMaterial);shaft.position.copy(start).add(end).multiplyScalar(.5);shaft.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),v.normalize());scene.add(shaft);}
 // Visible pool shading is procedural and independent of shadow-casting light count.
 const geo=new THREE.PlaneGeometry(1,1);
 const pm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,uniforms:glowUniforms,vertexShader:'varying vec2 vUv;void main(){vUv=uv;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0);}',fragmentShader:'uniform float strength;varying vec2 vUv;void main(){float d=length((vUv-.5)*2.);float a=pow(max(0.,1.-d),2.)*.22*strength;gl_FragColor=vec4(1.,.66,.26,a);}'});
 for(const [x,z]of[[-10,-5.35],[10,-5.35],[-10,5.45],[10,5.45],[9.8,-.4]]){const p=new THREE.Mesh(geo,pm);p.rotation.x=-Math.PI/2;p.scale.set(5,4,1);p.position.set(x,1.441,z);scene.add(p);}
}
function createGlowBatch(){const pos=new Float32Array(glows.length*3),colors=new Float32Array(glows.length*3),sizes=new Float32Array(glows.length);glows.forEach((g,i)=>{g.color.toArray(colors,i*3);sizes[i]=g.size;});const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('color',new THREE.BufferAttribute(colors,3));geo.setAttribute('size',new THREE.BufferAttribute(sizes,1));const sm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,vertexColors:true,uniforms:glowUniforms,vertexShader:'attribute float size;uniform float pixelRatio;varying vec3 vColor;void main(){vColor=color;vec4 p=modelViewMatrix*vec4(position,1.);gl_Position=projectionMatrix*p;gl_PointSize=clamp(size*850.*pixelRatio/-p.z,2.,140.);}',fragmentShader:'uniform float strength;varying vec3 vColor;void main(){vec2 p=gl_PointCoord-.5;float r=length(p)*2.;float core=exp(-r*r*70.);float halo=pow(max(0.,1.-r),3.);float a=(core*.95+halo*.48)*strength;if(a<.003)discard;gl_FragColor=vec4(vColor,a);}'});glowPoints=new THREE.Points(geo,sm);glowPoints.frustumCulled=false;scene.add(glowPoints);}
function buildParticles(){
 const n=950,pos=new Float32Array(n*3),seeds=new Float32Array(n*3);for(let i=0;i<n;i++){const k=i%3;pos.set(k===0?[-8.1,.58,-.2]:k===1?[9.8,G,1.7]:[-6.8,G,4.9],i*3);seeds.set([rand(),rand(),rand()],i*3);}const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.BufferAttribute(pos,3));geo.setAttribute('seed',new THREE.BufferAttribute(seeds,3));const sm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{time:{value:0},intensity:{value:1},pixelRatio:{value:1},tint:{value:new THREE.Color(0xcab792)}},vertexShader:`attribute vec3 seed;uniform float time;uniform float intensity;uniform float pixelRatio;varying float vAlpha;void main(){float life=fract(seed.x+time*.065);vec3 p=position;p.x+=(seed.y-.5)*2.5+life*.85;p.z+=(seed.z-.5)*1.7+sin(life*5.+seed.x*18.)*.32;p.y+=life*2.8;vAlpha=sin(life*3.14159)*(.04+seed.z*.09)*intensity;vec4 mv=modelViewMatrix*vec4(p,1.);gl_Position=projectionMatrix*mv;gl_PointSize=clamp((.13+life*.55)*460.*pixelRatio/-mv.z,1.,48.);}`,fragmentShader:'uniform vec3 tint;varying float vAlpha;void main(){vec2 p=gl_PointCoord-.5;float d=length(p)*2.;float a=pow(max(0.,1.-d),2.)*vAlpha;if(a<.002)discard;gl_FragColor=vec4(tint,a);}'});dustPoints=new THREE.Points(geo,sm);dustPoints.frustumCulled=false;scene.add(dustPoints);
 // Each rain line has one seed. Landing height is computed from structure footprints,
 // so streaks terminate on roofs, the roads or the excavated floor.
 const rn=3800,rp=new Float32Array(rn*6),rs=new Float32Array(rn*6),ends=new Float32Array(rn*2),floor=new Float32Array(rn*2);
 for(let i=0;i<rn;i++){const x=-14.2+rand()*28.4,z=-8.9+rand()*17.8,a=rand(),b=rand();let y=G+.04;if(x>-.1&&x<8.6&&z>-4.1&&z<3.15)y=8.31;if(x>8.5&&x<11.1&&z>-5.4&&z<-.15)y=5.34;if(x>-3.1&&x<1.25&&z>3.3&&z<5.6)y=3.82;if(x>-11&&x<-4&&z>-4.2&&z<3.4)y=.58;for(let j=0;j<2;j++){rp.set([x,0,z],i*6+j*3);rs.set([a,b,rand()],i*6+j*3);rs[i*6+j*3+2]=0;ends[i*2+j]=j;floor[i*2+j]=y;}}
 const rg=new THREE.BufferGeometry();rg.setAttribute('position',new THREE.BufferAttribute(rp,3));rg.setAttribute('seed',new THREE.BufferAttribute(rs,3));rg.setAttribute('end',new THREE.BufferAttribute(ends,1));rg.setAttribute('floorY',new THREE.BufferAttribute(floor,1));const rm=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:rainUniforms,vertexShader:'attribute vec3 seed;attribute float end;attribute float floorY;uniform float time;varying float vAlpha;void main(){float travel=fract(seed.x-time*(.57+seed.y*.25));float y=floorY+travel*(18.-floorY);vec3 p=position;p.y=min(18.,y+end*(.28+seed.y*.2));vAlpha=.16+seed.y*.25;gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.);}',fragmentShader:'uniform float strength;varying float vAlpha;void main(){gl_FragColor=vec4(.65,.8,.89,vAlpha*strength);}'});rainLines=new THREE.LineSegments(rg,rm);rainLines.frustumCulled=false;rainLines.visible=false;scene.add(rainLines);
}
function buildPuddles(){
 const geo=new THREE.PlaneGeometry(1,1),pMat=new THREE.ShaderMaterial({transparent:true,depthWrite:false,uniforms:{wet:{value:0},time:{value:0},night:{value:0}},vertexShader:'varying vec2 vUv;varying vec3 vWorld;void main(){vUv=uv;vWorld=(modelMatrix*vec4(position,1.)).xyz;gl_Position=projectionMatrix*viewMatrix*vec4(vWorld,1.);}',fragmentShader:`uniform float wet;uniform float time;uniform float night;varying vec2 vUv;varying vec3 vWorld;void main(){vec2 p=(vUv-.5)*2.;float edge=1.-smoothstep(.62,1.,length(p)+.08*sin(p.x*19.)*sin(p.y*16.));vec3 view=normalize(cameraPosition-vWorld);float fres=pow(1.-abs(view.y),2.);float ripple=sin(length(p+vec2(.23,-.19))*95.-time*6.)*.025;vec3 c=mix(vec3(.35,.45,.47),vec3(.32,.27,.19),night);c+=vec3(.5,.38,.17)*pow(max(0.,1.-abs(p.x-.2)),18.)*night;c+=ripple;gl_FragColor=vec4(c,edge*wet*(.22+fres*.5));}`});puddle={material:pMat,meshes:[]};for(const [x,z,w,h]of[[-12.1,3.4,1.5,1.7],[11.8,-2.9,1.3,2],[8.2,7.6,2.6,.8],[-4.3,7.6,2.2,.75],[-8.1,-7.6,2,.8],[2,-7.5,2.5,1],[12.7,4.6,1.2,1.7],[-8,-1.1,2,1.3]]){const m=new THREE.Mesh(geo,pMat);m.rotation.x=-Math.PI/2;m.position.set(x,(x===-8?.562:1.445),z);m.scale.set(w,h,1);puddle.meshes.push(m);scene.add(m);}}
function updateEnvironment(dt){
 if(state.dayCycle)state.hour=(state.hour+dt*24/240)%24;
 const h=state.hour,solar=Math.sin((h-6)/24*Math.PI*2),day=THREE.MathUtils.smoothstep(solar,-.17,.4),sunset=1-Math.min(1,Math.abs(solar)*2.8);state.night=1-day;
 const rainy=state.rain?1:0;state.wet+=(rainy-state.wet)*Math.min(1,dt*(rainy?1.3:.16));
 hemi.intensity=THREE.MathUtils.lerp(.36,1.35,day)*(1-state.wet*.42);hemi.color.set(0xc7def0);hemi.groundColor.set(0x7e6650);
 dayLight.intensity=THREE.MathUtils.lerp(.2,3.3,day)*(1-state.wet*.79);dayLight.color.set(0xffffff).lerp(palette.sunset,sunset*.65);dayLight.position.set(-22+Math.cos((h-7)*Math.PI/12)*9,23+Math.max(solar,0)*20,16);
 fillLight.intensity=.45+day*.5;fillLight.color.set(state.rain?0x9eafc7:0x9fc7e3);
 // Portrait framing moves the camera back: retain the same atmospheric contrast.
 const bg=palette.background.copy(palette.night).lerp(palette.day,day).lerp(palette.dusk,sunset*day*.32).lerp(palette.rain,state.wet*.7);scene.background.copy(bg);scene.fog.color.copy(bg);scene.fog.density=(.007+state.wet*.005)*Math.min(1,51/navigation.homeDistance);
 studioWindowMat.color.set(0x142a43).lerp(palette.windowDay,day).lerp(palette.windowDusk,sunset*day*.35).lerp(palette.windowRain,state.wet*.5);
 const lightAmount=.015+state.night*.985+state.wet*.8;glowUniforms.strength.value=lightAmount;glowUniforms.pixelRatio.value=renderer.getPixelRatio();for(const l of lamps)l.intensity=lightAmount*58;
 for(const m of architecture.windows||[]){m.emissive.set(0xff9f42);m.emissiveIntensity=.08+lightAmount*1.65;}
 roadMat.roughness=.95-state.wet*.8;roadMat.metalness=.03+state.wet*.19;roadMat.color.set(0x6d7069).lerp(palette.wetRoad,state.wet*.72);
 baseMaterial.envMapIntensity=.2+day*.6;renderer.toneMappingExposure=1.04+state.night*.08;
 dustPoints.material.uniforms.time.value=state.simTime;dustPoints.material.uniforms.intensity.value=[0,1,2.5][state.dust]*(1-state.wet*.97);dustPoints.material.uniforms.pixelRatio.value=renderer.getPixelRatio();dustPoints.material.uniforms.tint.value.set(0xcab792).multiplyScalar(.45+day*.55);dustPoints.visible=state.dust>0&&state.wet<.995;
 rainLines.visible=state.wet>.008;rainUniforms.time.value=state.realTime;rainUniforms.strength.value=state.rain?Math.min(1,state.wet*1.5):Math.max(0,state.wet*3-2);
 puddle.material.uniforms.wet.value=state.wet;puddle.material.uniforms.time.value=state.realTime;puddle.material.uniforms.night.value=state.night;
}
// Fixed upper render rate avoids spending 120 refreshes/second on a 60 FPS model.
let lastStamp=0,lastRenderStamp=0,frameNo=0,measureStamp=0,measureCount=0,uiStamp=0,shadowStamp=0;
function resetFrameClock(){const now=performance.now();lastStamp=lastRenderStamp=measureStamp=now;measureCount=0;slowWindows=fastWindows=0;lastInput=now;}
function frame(now){
 requestAnimationFrame(frame);
 if(document.hidden||restoringContext){lastStamp=lastRenderStamp=now;return;}
 const interval=1000/60,elapsed=now-lastRenderStamp;
 if(elapsed<interval-.65)return;
 // Carry the fractional interval so 90 / 144 Hz screens do not fall to 45 / 48 FPS.
 lastRenderStamp+=Math.floor((elapsed+.65)/interval)*interval;
 const cpuStart=performance.now(),rawDt=(now-lastStamp)/1000,dt=Math.min(.05,Math.max(0,rawDt));
 lastStamp=now;state.realTime+=dt;state.simTime+=dt*state.speed;
 if(state.speed>0){machines.update(dt*state.speed,state.simTime);staff.update(dt*state.speed,state.simTime);}
 updateEnvironment(dt);
 if(!touches.size&&state.orbit&&!settingsOpen&&now-lastInput>9000)targetAz+=dt*.021;
 updateCamera(dt);
 for(const k of knobs)k.group.rotation.y+=(k.angle-k.group.rotation.y)*(1-Math.exp(-dt*12));
 scene.updateMatrixWorld(true);
 if(glowPoints&&glowUniforms.strength.value>.02){const a=glowPoints.geometry.attributes.position;for(let i=0;i<glows.length;i++){const g=glows[i];tempV.copy(g.pos).applyMatrix4(g.parent.matrixWorld);a.setXYZ(i,tempV.x,tempV.y,tempV.z);}a.needsUpdate=true;}
 // Shadow updates are independent of rendering and simulation rate.
 if(renderer.shadowMap.enabled&&now-shadowStamp>42){renderer.shadowMap.needsUpdate=true;shadowStamp=now;}
 renderer.render(scene,camera);frameNo++;measureCount++;
 metric.cpuFrameMs+=(performance.now()-cpuStart-metric.cpuFrameMs)*.04;
 if(rawDt>0&&rawDt<.2){metric.frameTimes.push(rawDt*1000);if(metric.frameTimes.length>600)metric.frameTimes.shift();}
 if(now-measureStamp>=1000){metric.fps=Math.round(measureCount*1000/(now-measureStamp));metric.draws=renderer.info.render.calls;metric.triangles=renderer.info.render.triangles;setText('fps',metric.fps+' FPS');adjustQuality(metric.fps,now);measureStamp=now;measureCount=0;}
 if(now-uiStamp>450){updateClockUI();uiStamp=now;}
}
window.addEventListener('error',e=>{if(!window.__sandbox)fail(e.error||new Error(e.message));});
setTimeout(()=>{try{initialize();}catch(e){fail(e);}},50);
