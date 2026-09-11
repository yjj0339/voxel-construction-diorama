/* Procedural machinery. All distances are sandbox metres; only group transforms
   change at runtime. Cuboids are collected by the host into InstancedMeshes. */
function buildMachinery() {
  const C={yellow:0xf3b833,edge:0xd68b21,dark:0x26313c,rubber:0x19252d,steel:0x8499a0,glass:0x254959,red:0xe47751,white:0xd7e1d7,soil:0x92704f};
  const vehicles=[],excavators=[],cranes=[];
  const TAU=Math.PI*2,clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),mix=(a,b,t)=>a+(b-a)*t,smooth=t=>{t=clamp(t,0,1);return t*t*(3-2*t);};
  const wrap=(s,l)=>(s%l+l)%l;

  function hazard(p,x,y,z,w,h,side=1) {
    box(p,0xf5cd4c,x,y,z,w,h,.022);
    for(let n=0;n<Math.ceil(w/.14);n++)box(p,C.dark,x-w/2+.07+n*.14,y,z+side*.014,.065,h,.025,0,0,-.35);
  }
  function axle(p,x) {
    for(const z of [-.49,.49]){
      cyl(p,C.rubber,x,.31,z,.29,.29,.19,10,Math.PI/2);
      cyl(p,C.steel,x,.31,z+Math.sign(z)*.104,.13,.13,.022,8,Math.PI/2);
      cyl(p,C.dark,x,.31,z+Math.sign(z)*.117,.065,.065,.024,6,Math.PI/2);
      for(let j=0;j<5;j++){const a=j*TAU/5;box(p,0xced8d1,x+Math.cos(a)*.085,.31+Math.sin(a)*.085,z+Math.sign(z)*.132,.023,.023,.019);}
    }
  }
  function vehicleBase(color,isMixer=false) {
    const p=group(world),deck=group(p);
    box(deck,C.dark,0,.42,0,2.22,.18,.78);
    box(deck,C.dark,-.16,.26,0,1.45,.17,.23);
    box(deck,color,.68,.68,0,.91,.58,.86);
    box(deck,color,.69,1.13,0,.82,.56,.83);
    box(deck,C.glass,1.113,1.15,0,.025,.36,.65);
    for(const z of [-.432,.432]){
      box(deck,C.glass,.72,1.16,z,.58,.34,.026);
      box(deck,color,.42,1.16,z,.09,.43,.05);
      box(deck,C.dark,.90,.95,z+Math.sign(z)*.071,.12,.055,.12);
      beam(deck,C.dark,[.91,1.14,z],[.98,1.12,z+Math.sign(z)*.11],.035);
      box(deck,C.dark,1.00,1.15,z+Math.sign(z)*.1,.10,.15,.065);
      box(deck,C.steel,.34,.57,z+Math.sign(z)*.042,.33,.065,.16);
    }
    box(deck,color,.72,1.45,0,.91,.095,.92);
    box(deck,C.dark,1.14,.78,0,.025,.21,.53);
    for(let z=-.19;z<=.2;z+=.095)box(deck,C.steel,1.159,.78,z,.022,.025,.047);
    box(deck,C.steel,1.18,.48,0,.15,.14,.95);
    for(const z of [-.3,.3]){
      box(deck,0xffefbd,1.16,.91,z,.06,.115,.16);
      registerGlow(deck,1.2,.91,z,0xffe4a8,.19);
      box(deck,0xe95439,-1.15,.48,z,.03,.085,.12);
    }
    box(deck,C.dark,.15,1.17,-.42,.085,.52,.085);
    box(deck,C.steel,.15,1.44,-.42,.12,.055,.12);
    box(deck,C.dark,.7,1.53,0,.35,.065,.14);
    for(const z of [-.1,.1]){cyl(deck,0xff9b23,.7,1.60,z,.057,.057,.09,6);registerGlow(deck,.7,1.64,z,0xffa42b,.12);}
    axle(deck,.69);axle(deck,-.58);if(isMixer)axle(deck,-.98);
    return {root:p,deck};
  }
  function dumpTruck(color,s,loaded=false) {
    const v=vehicleBase(color);v.kind='dump';v.s=s;v.loaded=loaded;v.fill=loaded?1:0;v.state='drive';v.timer=0;
    // The left side tips into the stockpile; its hinge is on the inner road edge.
    const bed=group(v.root,-1.0,.77,.46),shell=group(bed,0,0,-.46);v.bed=bed;
    box(shell,C.edge,.575,.045,0,1.15,.10,.86);
    for(const z of [-.448,.448]){
      const side=z>0?group(shell,0,.05,z):shell;
      if(z>0)v.gate=side;
      const yy=z>0?-.05:0,zz=z>0?-z:0;
      box(side,color,.575,.27+yy,z+zz,1.19,.49,.072);
      for(let x=.12;x<1.15;x+=.25)box(side,C.edge,x,.28+yy,z+zz+Math.sign(z)*.046,.045,.46,.04);
      hazard(side,.575,.31+yy,z+zz+Math.sign(z)*.045,1.04,.11,Math.sign(z));
    }
    box(shell,color,1.15,.29,0,.09,.55,.92);
    box(shell,color,.025,.25,0,.07,.44,.90);
    const cargo=group(shell,.575,.13,0);v.cargo=cargo;
    for(let x=-.41;x<=.42;x+=.205)for(let z=-.24;z<=.25;z+=.23){
      const h=.16+rand()*.12;box(cargo,[0x8c6e4c,0xa8875d,0xb9976a][Math.floor(rand()*3)],x,h/2,z,.19,h,.21);
    }
    const spill=new THREE.InstancedMesh(new THREE.BoxGeometry(.075,.075,.075),mat(C.soil),24);
    spill.instanceMatrix.setUsage(THREE.DynamicDrawUsage);spill.castShadow=false;spill.frustumCulled=false;spill.visible=false;world.add(spill);v.spill=spill;
    v.speed=.83;vehicles.push(v);return v;
  }

  // One closed, C1-continuous lane: everyone travels in the same direction.
  const R=1.5,A=R*Math.PI/2,H=22,V=11.2,L=2*H+2*V+4*A;
  const loadS=0,unloadS=5.6+A+H+A+7.1;
  function road(s) {
    s=wrap(s,L);
    if(s<5.6)return {x:-12.5,z:-s,dx:0,dz:-1};s-=5.6;
    if(s<A){const a=Math.PI+s/R;return{x:-11+R*Math.cos(a),z:-5.6+R*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)};}s-=A;
    if(s<H)return{x:-11+s,z:-7.1,dx:1,dz:0};s-=H;
    if(s<A){const a=-Math.PI/2+s/R;return{x:11+R*Math.cos(a),z:-5.6+R*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)};}s-=A;
    if(s<V)return{x:12.5,z:-5.6+s,dx:0,dz:1};s-=V;
    if(s<A){const a=s/R;return{x:11+R*Math.cos(a),z:5.6+R*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)};}s-=A;
    if(s<H)return{x:11-s,z:7.1,dx:-1,dz:0};s-=H;
    if(s<A){const a=Math.PI/2+s/R;return{x:-11+R*Math.cos(a),z:5.6+R*Math.sin(a),dx:-Math.sin(a),dz:Math.cos(a)};}s-=A;
    return{x:-12.5,z:5.6-s,dx:0,dz:-1};
  }
  const dumpA=dumpTruck(0xd6aa36,0,false);dumpA.state='loading';
  const dumpB=dumpTruck(0xe17e50,unloadS-5,true);
  const mixer=vehicleBase(0xcbd9d6,true);mixer.kind='mixer';mixer.s=L*.74;mixer.speed=.67;mixer.state='drive';
  box(mixer.deck,C.red,-.55,.62,0,1.3,.14,.74);
  const drum=group(mixer.root,-.48,1.10,0);drum.rotation.z=-.10;mixer.drum=drum;
  // Horizontal polygonal mixing drum, with the spiral approximated by voxel fins.
  cyl(drum,0xe5e0c8,0,0,0,.39,.39,.69,10,0,0,Math.PI/2);
  cyl(drum,0xd3d9c7,-.48,0,0,.20,.39,.28,10,0,0,Math.PI/2);
  cyl(drum,0xd3d9c7,.48,0,0,.39,.18,.28,10,0,0,Math.PI/2);
  for(let j=0;j<26;j++){
    const x=-.48+j*.038,a=j*.40;
    box(drum,0x467d77,x,Math.cos(a)*.38,Math.sin(a)*.38,.13,.065,.09,a,0,0);
  }
  box(mixer.deck,C.steel,-1.09,.82,0,.15,.47,.37);
  beam(mixer.deck,C.steel,[-1.1,.95,0],[-1.18,.60,0],.14);
  for(let y=.5;y<=1.25;y+=.2)box(mixer.deck,C.dark,-.68,y,-.49,.35,.045,.08);
  vehicles.push(mixer);

  function excavator(x,z,scale,primary) {
    const p=group(world,x,.55,z);p.scale.setScalar(scale);
    const dark=C.dark,yellow=primary?C.yellow:0xd88638;
    for(const side of [-.48,.48]){
      box(p,dark,0,.25,side,1.7,.40,.36);
      box(p,0x57646a,0,.46,side,1.65,.08,.36);
      for(let q=-.7;q<=.71;q+=.17){
        box(p,0x657176,q,.48,side,.11,.06,.41);
        box(p,0x2f3c43,q,.04,side,.11,.06,.40);
      }
      for(let q=-.6;q<=.61;q+=.3)cyl(p,0x7c8581,q,.25,side+Math.sign(side)*.19,.15,.15,.05,8,Math.PI/2);
    }
    box(p,C.dark,0,.48,0,1.1,.15,.7);
    cyl(p,C.steel,0,.60,0,.39,.42,.16,10);
    const turret=group(p,0,.69,0);
    box(turret,yellow,-.05,.14,0,1.40,.3,1.12);
    box(turret,yellow,-.52,.40,-.25,.51,.38,.60);
    for(let j=0;j<4;j++)box(turret,C.dark,-.80,.40,-.43+j*.11,.02,.18,.05);
    box(turret,yellow,-.32,.40,.44,.81,.38,.53);
    box(turret,C.glass,-.1,.89,.43,.53,.55,.45);
    box(turret,yellow,-.1,1.2,.43,.65,.08,.55);
    for(const q of [-.4,.2])box(turret,yellow,q,.90,.43,.06,.58,.48);
    box(turret,C.dark,-.02,.70,.44,.19,.12,.27);
    box(turret,0xdb965b,-.02,.91,.44,.18,.17,.17);
    box(turret,0xece8c9,-.02,1.015,.44,.21,.075,.21);
    box(turret,C.dark,-.63,.78,-.29,.07,.39,.07);
    box(turret,0xffd571,-.43,.68,-.46,.12,.08,.08);
    registerGlow(turret,.25,.57,.53,0xffe5a9,.25);
    const L1=primary?2.05:1.22,L2=primary?1.65:1.0;
    const shoulder=group(turret,.16,.41,-.03);
    box(shoulder,yellow,L1/2,0,0,L1,.23,.23);
    beam(shoulder,C.steel,[.15,.17,.15],[L1-.22,.17,.15],.068);
    cyl(shoulder,C.dark,0,0,0,.16,.16,.31,8,Math.PI/2);
    const elbow=group(shoulder,L1,0,0);
    box(elbow,yellow,L2/2,0,0,L2,.17,.18);
    beam(elbow,C.steel,[.1,.15,.12],[L2-.13,.15,.12],.045);
    cyl(elbow,C.dark,0,0,0,.13,.13,.27,8,Math.PI/2);
    const bucket=group(elbow,L2,0,0);
    box(bucket,C.dark,.12,-.17,0,.50,.09,.55);
    box(bucket,C.dark,-.10,-.035,0,.09,.32,.55);
    for(const side of [-.26,.26])box(bucket,C.dark,.11,-.06,side,.48,.26,.055);
    for(let q=-.20;q<=.21;q+=.13)box(bucket,0xb5c1b7,.41,-.18,q,.15,.065,.072);
    const dirt=group(bucket,.12,-.05,0);
    for(let j=0;j<8;j++)box(dirt,C.soil,(j%3-.75)*.11,.02+Math.floor(j/3)*.05,(Math.floor(j/3)-1)*.14,.1,.09,.12);
    const e={root:p,turret,shoulder,elbow,bucket,dirt,L1,L2,scale,primary,endpoint:new THREE.Vector3(),bucketBottom:0};
    excavators.push(e);return e;
  }
  const mainExc=excavator(-9.5,0,1,true),smallExc=excavator(-5.8,-1.5,.68,false);
  const dirtStream=group(world,-12.5,2.85,.34);
  for(let j=0;j<13;j++)box(dirtStream,j%2?0xa38760:0x876845,(rand()-.5)*.27,j*.042,(rand()-.5)*.27,.085,.09,.08);

  function poseExc(e,angle,radius,worldY,scoop,filled) {
    e.turret.rotation.y=angle;
    const px=.16,py=.69+.41;
    const r=radius/e.scale-px,dy=(worldY-.55)/e.scale-py;
    const d=clamp(Math.hypot(r,dy),.2,e.L1+e.L2-.02);
    const a=Math.atan2(dy,r)+Math.acos(clamp((e.L1*e.L1+d*d-e.L2*e.L2)/(2*e.L1*d),-1,1));
    const b=-Math.acos(clamp((d*d-e.L1*e.L1-e.L2*e.L2)/(2*e.L1*e.L2),-1,1));
    e.shoulder.rotation.z=a;e.elbow.rotation.z=b;e.bucket.rotation.z=-a-b+scoop;e.dirt.visible=filled;
    // For audit: endpoint follows the exact solved articulated boom geometry.
    const rr=e.scale*(px+Math.cos(a)*e.L1+Math.cos(a+b)*e.L2);
    const yy=.55+e.scale*(py+Math.sin(a)*e.L1+Math.sin(a+b)*e.L2);
    e.endpoint.set(e.root.position.x+rr*Math.cos(angle)-.03*e.scale*Math.sin(angle),yy,e.root.position.z-rr*Math.sin(angle)-.03*e.scale*Math.cos(angle));
    e.bucketBottom=yy-e.scale*.29;
  }

  // A compact loader works only within its fenced-out strip, never the traffic lane.
  const loader=group(world,-7,G,4.85);
  box(loader,C.dark,0,.24,0,1.03,.14,.56);
  box(loader,0xf0bc47,-.19,.45,0,.76,.40,.64);
  box(loader,C.glass,-.24,.86,0,.49,.42,.49);
  box(loader,C.yellow,-.24,1.1,0,.6,.08,.6);
  for(const x of [-.4,.35])for(const z of [-.31,.31]){
    cyl(loader,C.rubber,x,.22,z,.22,.22,.15,8,Math.PI/2);
    cyl(loader,C.yellow,x,.22,z+Math.sign(z)*.085,.09,.09,.025,6,Math.PI/2);
  }
  const loaderArm=group(loader,.19,.40,0);
  for(const z of [-.25,.25])beam(loaderArm,C.yellow,[0,0,z],[.58,-.12,z],.12);
  box(loaderArm,C.dark,.75,-.14,0,.4,.085,.72);
  box(loaderArm,C.yellow,.57,-.04,0,.08,.28,.72);
  for(const z of [-.34,.34])box(loaderArm,C.yellow,.74,-.04,z,.4,.28,.05);
  for(let z=-.28;z<.3;z+=.14)box(loaderArm,C.steel,1,-.145,z,.15,.06,.09);

  function crane(x,z,topY,length,color,index) {
    const p=group(world,x,G,z),h=topY-G,half=.28;
    box(p,0xa2a899,0,.15,0,1.28,.3,1.28);
    for(const a of [-half,half])for(const b of [-half,half])box(p,color,a,h/2,b,.085,h,.085);
    for(let y=.45;y<h;y+=.72){
      for(const side of [-half,half]){
        box(p,color,0,y,side,.62,.07,.07);box(p,color,side,y,0,.07,.07,.62);
        const y2=Math.min(y+.72,h);
        beam(p,color,[-half,y,side],[half,y2,side],.055);
        beam(p,color,[side,y,-half],[side,y2,half],.055);
      }
    }
    for(let y=.30;y<h;y+=.22)box(p,0xe0cf8d,.36,y,0,.22,.038,.27);
    box(p,C.dark,0,h-.08,0,.83,.12,.83);
    cyl(p,C.dark,0,h,0,.50,.50,.17,10);
    const head=group(p,0,h+.08,0);
    const counter=index===0?1.65:1.25;
    for(const side of [-.22,.22]){
      box(head,color,(length-counter)/2,.05,side,length+counter,.085,.085);
      box(head,color,(length-counter)/2,.62,side,length+counter,.075,.075);
    }
    for(let q=-counter;q<length;q+=.65){
      const q2=Math.min(q+.65,length);
      box(head,color,q,.04,0,.08,.08,.52);
      for(const side of [-.22,.22])beam(head,color,[q,.08,side],[q2,.62,side],.055);
      beam(head,color,[q,.62,-.22],[q2,.62,.22],.04);
    }
    box(head,color,.07,1.18,0,.18,1.1,.18);
    beam(head,C.steel,[0,1.6,0],[length*.85,.62,0],.025);
    beam(head,C.steel,[0,1.6,0],[-counter,.62,0],.025);
    for(let q=-counter+.18;q<-.55;q+=.28)box(head,0x69737c,q,-.21,0,.26,.47,.73);
    box(head,C.dark,-counter+.08,-.09,0,.5,.11,.90);
    box(head,color,.38,-.41,.5,.68,.12,.60);
    box(head,C.glass,.40,-.15,.5,.57,.48,.48);
    box(head,color,.4,.13,.5,.67,.08,.59);
    for(const xx of [.1,.70])box(head,color,xx,-.15,.75,.045,.5,.05);
    const trolley=group(head,length*.7,-.12,0);
    box(trolley,C.dark,0,0,0,.39,.15,.56);
    box(trolley,0xe1a544,0,-.13,0,.30,.12,.36);
    const ropes=[];
    for(const side of [-.10,.10])ropes.push(cyl(trolley,C.dark,0,-1,side,.014,.014,1,4));
    const hook=group(trolley,0,-2,0);
    box(hook,C.dark,0,0,0,.22,.27,.22);
    hazard(hook,0,0,.13,.22,.18);
    box(hook,C.steel,0,-.21,0,.07,.2,.07);
    if(index===0){
      for(let zz=-.25;zz<=.26;zz+=.10)for(let yy=0;yy<2;yy++){
        box(hook,yy?0x607b81:0x8a9994,0,-.62-yy*.08,zz,1.65,.063,.063);
      }
      for(const xx of [-.53,.53]){beam(hook,C.dark,[0,-.23,0],[xx,-.59,0],.027);box(hook,0xa5b2a2,xx,-.68,0,.055,.22,.63);}
    }else{
      beam(hook,C.dark,[0,-.24,0],[-.25,-.44,0],.035);beam(hook,C.dark,[0,-.24,0],[.25,-.44,0],.035);
      cyl(hook,0xd89845,0,-.76,0,.34,.21,.59,6);
      box(hook,C.dark,0,-1.10,0,.22,.14,.24);
      box(hook,0xf4d082,0,-.49,0,.43,.06,.45);
    }
    registerGlow(head,length,.48,0,0xffc079,.30);
    registerGlow(head,0,1.66,0,0xff725b,.32);
    registerGlow(head,.35,-.38,.85,0xffdfa7,.72);
    const c={root:p,head,trolley,hook,ropes,topY,length,index,loadBottom:0};cranes.push(c);return c;
  }
  crane(-1.3,-4.8,13.2,7,0xedbb40,0);
  crane(8.6,3.7,10.8,4.6,0xd9804b,1);

  let elapsed=0,loadingWindow=false,minObservedGap=Infinity;
  const spillDummy=new THREE.Object3D();
  function updateTraffic(dt,t) {
    // ≤50 ms substeps guarantee finite-rate movement cannot jump a station or leader.
    let remaining=Math.min(dt,1);
    while(remaining>1e-8){
      const h=Math.min(.05,remaining);remaining-=h;
      const moves=[];
      for(const v of vehicles){
        let amount=0;
        if(v.state==='loading'){
          const phase=wrap(t,15);
          if(phase>=7.7&&phase<=9.8){v.fill=Math.max(v.fill,smooth((phase-7.7)/1.75));v.received=true;}
          if(v.received&&phase>=10){v.loaded=true;v.fill=1;v.received=false;v.state='drive';}
        }else if(v.state==='dumping'){
          v.timer+=h;
          const raise=smooth(v.timer/2.0),lower=1-smooth((v.timer-4.8)/2.0);
          v.bed.rotation.x=-.78*Math.min(raise,lower);
          v.gate.rotation.x=2.45*Math.min(smooth((v.timer-.4)/1.4),1-smooth((v.timer-4.8)/1.8));
          v.fill=1-smooth((v.timer-2)/2.5);
          if(v.timer>=7){v.loaded=false;v.fill=0;v.state='drive';v.bed.rotation.x=0;v.gate.rotation.x=0;}
        }else{
          amount=v.speed*h;
          if(v.kind==='dump'){
            const station=v.loaded?unloadS:loadS,dist=wrap(station-v.s,L);
            if(dist<amount+.00001){amount=dist;v.pendingStop=v.loaded?'dumping':'loading';}
          }
        }
        let gap=L;
        for(const w of vehicles)if(w!==v)gap=Math.min(gap,wrap(w.s-v.s,L));
        minObservedGap=Math.min(minObservedGap,gap);
        moves.push(Math.min(amount,Math.max(0,gap-4.2)));
      }
      vehicles.forEach((v,i)=>{
        v.s=wrap(v.s+moves[i],L);
        if(v.pendingStop){
          const target=v.loaded?unloadS:loadS;
          if(Math.min(wrap(target-v.s,L),wrap(v.s-target,L))<.0001){v.state=v.pendingStop;v.timer=0;v.pendingStop=null;}
        }
      });
    }
    for(const v of vehicles){
      const q=road(v.s);v.root.position.set(q.x,G+.015,q.z);v.root.rotation.y=Math.atan2(-q.dz,q.dx);
      if(v.cargo){v.cargo.visible=v.fill>.015;v.cargo.scale.y=Math.max(.04,v.fill);}
      if(v.spill){
        v.spill.visible=v.state==='dumping'&&v.timer>2&&v.timer<4.6;
        if(v.spill.visible){
          for(let j=0;j<24;j++){
            const f=wrap(t*.82+j/24,1);
            spillDummy.position.set(mix(12.02,10.52,f),mix(2.34,1.81,f)+.14*Math.sin(f*Math.PI),1.35+Math.sin(j*2.399)*.26);
            spillDummy.rotation.set(t+j,t*.7+j,t*.3);spillDummy.updateMatrix();v.spill.setMatrixAt(j,spillDummy.matrix);
          }
          v.spill.instanceMatrix.needsUpdate=true;
        }
      }
    }
    mixer.drum.rotation.x=t*.72;
  }
  function updateExcavators(t){
    const p=wrap(t,15);let angle=0,r=1.96,y=1.10,scoop=0,filled=false;
    if(p<2.7){const f=smooth(p/2.7);r=mix(2.13,1.96,f);y=mix(1.35,1.10,f);scoop=mix(-.1,.12,f);}
    else if(p<4.7){const f=smooth((p-2.7)/2);r=mix(1.96,2.4,f);y=mix(1.10,3.52,f);filled=true;}
    else if(p<7.7){const f=smooth((p-4.7)/3);angle=mix(0,Math.PI+.12,f);r=mix(2.4,3.02,f);y=3.52;filled=true;}
    else if(p<9.8){angle=Math.PI+.12;r=3.02;y=3.52;scoop=mix(0,-.50,smooth((p-7.7)/1.2));filled=p<8.2;}
    else if(p<12.8){const f=smooth((p-9.8)/3);angle=mix(Math.PI+.12,0,f);r=mix(3.02,2.13,f);y=3.52;}
    else{const f=smooth((p-12.8)/2.2);r=2.13;y=mix(3.52,1.35,f);}
    poseExc(mainExc,angle,r,y,scoop,filled);
    const q=wrap(t+3.1,7.5)/7.5;
    // Compact rig never slews toward the primary excavator or the pit wall.
    poseExc(smallExc,-.22+.17*Math.sin(q*TAU),1.03+.13*Math.sin(q*TAU),1.0+.70*(.5+.5*Math.sin(q*TAU)),.18*Math.sin(q*TAU),q>.3&&q<.7);
    loadingWindow=vehicles.some(v=>v.state==='loading')&&p>7.85&&p<9.45;
    dirtStream.visible=loadingWindow;dirtStream.position.y=2.82+wrap(t*1.3,.12);
  }
  function updateCranes(t){
    for(const c of cranes){
      const u=(Math.sin(t*(c.index?.083:.065)+c.index*1.8)+1)/2;
      c.head.rotation.y=c.index?mix(.15,1.05,u):mix(-.15,-.85,u);
      c.trolley.position.x=c.index?3.65+.2*Math.sin(t*.13):4.15+1.30*Math.sin(t*.10);
      const desiredHookY=c.index?8.15+.7*Math.sin(t*.14):11.05+.18*Math.sin(t*.14);
      // Ropes hang below the jib lower chord; steel clears the entire 9m building.
      const ropeLength=c.topY-.20-desiredHookY;
      for(const rope of c.ropes){rope.position.y=-.16-ropeLength*.5;rope.scale.y=ropeLength;}
      c.hook.position.y=-.16-ropeLength;
      c.loadBottom=desiredHookY-(c.index?1.18:.82);
    }
  }
  function update(dt,simTime){
    elapsed=Number.isFinite(simTime)?simTime:elapsed+dt;
    updateTraffic(Math.max(0,dt),elapsed);updateExcavators(elapsed);updateCranes(elapsed);
    loader.position.x=-7+.83*Math.sin(elapsed*.31);
    loaderArm.rotation.z=.02+.05*Math.sin(elapsed*.7);
  }
  function audit(){
    let gap=Infinity,minEuclidean=Infinity;
    const violations=[];
    for(let i=0;i<vehicles.length;i++){
      const v=vehicles[i];
      if(Math.abs(v.root.position.x)+1.38>14.3||Math.abs(v.root.position.z)+1.38>8.9)violations.push('vehicle boundary '+i);
      for(let j=i+1;j<vehicles.length;j++){
        gap=Math.min(gap,wrap(v.s-vehicles[j].s,L),wrap(vehicles[j].s-v.s,L));
        minEuclidean=Math.min(minEuclidean,v.root.position.distanceTo(vehicles[j].root.position));
      }
    }
    if(minEuclidean<2.80)violations.push('traffic separation');
    for(const e of excavators)if(e.bucketBottom<.58)violations.push('bucket floor clearance');
    if(cranes[0].loadBottom<9.35)violations.push('steel below building clearance');
    return {ok:violations.length===0,violations,roadLength:L,minimumLaneGap:gap,minObservedGap,minimumVehicleCenterDistance:minEuclidean,bucketFloorClearance:excavators.map(e=>e.bucketBottom-.55),steelBuildingClearance:cranes[0].loadBottom-9,loaderEnvelope:{x:[-8.6,-5.1],z:[4.37,5.33]}};
  }
  update(0,0);
  return{update,vehicles,excavators,cranes,loader,audit,stats:{trucks:2,mixers:1,excavators:2,loaders:1,cranes:2}};
}
