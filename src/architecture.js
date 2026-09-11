/* Static model architecture. All solid detail is queued into shared cuboid batches. */
function buildArchitecture() {
  const obstacles = [];
  const windows = [];
  const C = {
    concrete: 0xc3c4b6, lightConcrete: 0xd8d8c9, darkConcrete: 0x929a92,
    rebar: 0x545c59, rust: 0x916751, scaffold: 0xaebbb7, teal: 0x327f82,
    tealLight: 0x569b98, navy: 0x304c57, blue: 0x7cb4c2, ivory: 0xe8e4cf,
    timber: 0xaf8453, timberLight: 0xc8a26d, yellow: 0xefbd40,
    orange: 0xdd7442, brick: 0xba7859, soil: 0x98774c, sand: 0xc1a46b,
    charcoal: 0x353d39
  };
  const b = (c,x,y,z,w,h,d,rx=0,ry=0,rz=0) => box(world,c,x,y,z,w,h,d,rx,ry,rz);
  const e = (c,a,v,t) => beam(world,c,a,v,t);
  function obstacle(x,z,hx,hz,height,name) { obstacles.push({x,z,hx,hz,height,name}); }
  function pallet(x,z,w=1.2,d=.8) {
    for(let k=-1;k<=1;k++) b(C.timber,x+k*w*.32,G+.075,z,.12,.15,d);
    for(let k=0;k<5;k++) b(C.timberLight,x-w*.4+k*w*.2,G+.17,z,w*.16,.055,d);
  }
  function safetyRail(x1,z1,x2,z2,height=.8,spacing=.8) {
    const len=Math.hypot(x2-x1,z2-z1), n=Math.ceil(len/spacing);
    for(let j=0;j<=n;j++) {
      const u=j/n,x=x1+(x2-x1)*u,z=z1+(z2-z1)*u;
      b(C.charcoal,x,G+.055,z,.23,.11,.23);
      b(j%2?C.ivory:C.orange,x,G+height*.5,z,.065,height,.065);
    }
    for(const y of [G+height*.48,G+height]) e(C.orange,[x1,y,z1],[x2,y,z2],.055);
  }

  // Reinforced concrete frame: three genuine open storeys with visible beams.
  const xs=[1.0,3.85,6.7], zs=[-3.3,-.5,2.3];
  b(C.darkConcrete,3.85,G+.045,-.5,6.95,.09,6.9);
  for(const sy of [.12,2.35,4.55,6.75]) {
    b(C.concrete,3.85,G+sy,-.5,6.7,.22,6.6);
    // Board-form impressions on the fascia remain visible at miniature scale.
    for(let x=.7;x<7.2;x+=.43) {
      b(C.lightConcrete,x,G+sy,2.807,.014,.17,.016);
      b(C.darkConcrete,x,G+sy,-3.807,.011,.17,.016);
    }
  }
  for(let storey=0;storey<3;storey++) {
    const low=[.23,2.46,4.66][storey], high=[2.24,4.44,6.64][storey];
    for(const x of xs) for(const z of zs) {
      b(C.lightConcrete,x,G+(low+high)*.5,z,.37,high-low,.37);
      // Column collars and small ties are discreetly different in tone.
      b(C.darkConcrete,x,G+low+.09,z,.4,.11,.4);
    }
    for(const x of xs) b(C.darkConcrete,x,G+high-.1,-.5,.27,.21,6.2);
    for(const z of zs) b(C.concrete,3.85,G+high-.1,z,6.1,.21,.3);
  }
  // A service core stops short of the roof, leaving the top working deck legible.
  b(C.darkConcrete,5.75,G+2.42,-1.8,1.35,4.36,.15);
  b(C.concrete,6.36,G+2.42,-1.14,.13,4.36,1.2);
  for(let s=0;s<12;s++) {
    const y=G+.29+s*.177;
    b(C.concrete,5.72,y,-1.25+s*.15,.91,.14,.18);
  }
  // A partially laid ground-floor brick partition with staggered joints.
  for(let row=0;row<6;row++) for(let j=0;j<11;j++) {
    const x=1.22+j*.45+(row%2)*.21;
    if(x<6.45) b((row+j)%4?C.brick:C.rust,x,G+.34+row*.195,-3.23,.425,.176,.19);
  }
  // Shuttering on a short edge; panel ribs communicate the ongoing pour.
  for(let j=0;j<6;j++) {
    const x=.85+j*.42;
    b(C.timberLight,x,G+6.77,2.935,.405,.43,.07);
    b(C.timber,x,G+6.77,2.99,.045,.51,.045);
  }
  // Exposed steel cages extend beyond each top column. Their work envelopes are static.
  for(const x of xs) for(const z of zs) {
    for(const dx of [-.105,.105]) for(const dz of [-.105,.105])
      b(C.rebar,x+dx,G+7.25,z+dz,.029,.78,.029);
    for(const yy of [6.96,7.2,7.43]) {
      b(C.rust,x,G+yy,z-.117,.265,.022,.022);
      b(C.rust,x,G+yy,z+.117,.265,.022,.022);
      b(C.rust,x-.117,G+yy,z,.022,.022,.265);
      b(C.rust,x+.117,G+yy,z,.022,.022,.265);
    }
  }
  // Roof reinforcement is concentrated in two pour strips, retaining clear walkways.
  for(let x=.85;x<6.9;x+=.28) b(C.rebar,x,G+6.89,-2.9,.025,.028,1.04);
  for(let z=-3.37;z<-2.39;z+=.22) b(C.rust,3.85,G+6.925,z,6.15,.024,.025);
  for(let x=5.75;x<6.95;x+=.2) b(C.rebar,x,G+6.9,.72,.023,.026,2.47);
  for(let z=-.45;z<2;z+=.23) b(C.rust,6.32,G+6.927,z,1.28,.023,.023);
  // Temporary edge rails with open fronts at lower levels.
  for(const sy of [2.46,4.66,6.86]) {
    for(const x of [1.3,2.9,4.8,6.4]) b(C.orange,x,G+sy+.39,2.69,.035,.78,.035);
    b(C.orange,3.85,G+sy+.77,2.69,5.1,.035,.035);
    b(C.orange,3.85,G+sy+.38,2.69,5.1,.035,.035);
  }
  label(world,'A–01  /  STRUCTURE',3.78,G+3.25,2.84,2.42,.33,{bg:'#294952',fg:'#f2e5bb',fontSize:36});
  obstacle(3.85,-.5,3.36,3.31,9,'reinforced concrete structure');

  // Full scaffold bay: steel standards, alternating cross braces and timber walks.
  const scaffoldZ=[-3.55,-2.05,-.55,.95,2.45], scaffoldX=[7.43,8.22];
  for(const x of scaffoldX) for(const z of scaffoldZ) {
    b(C.darkConcrete,x,G+.055,z,.24,.11,.24);
    b(C.scaffold,x,G+3.47,z,.045,6.84,.045);
    for(let yy=.35;yy<6.8;yy+=1.1) b(C.charcoal,x,G+yy,z,.083,.08,.083);
  }
  for(const yy of [.36,2.5,4.7,6.88]) {
    for(let i=0;i<4;i++) {
      const z=(scaffoldZ[i]+scaffoldZ[i+1])*.5;
      for(let strip=0;strip<3;strip++) b(C.timberLight,7.55+strip*.245,G+yy,z,.225,.07,1.43);
      for(const x of scaffoldX) b(C.scaffold,x,G+yy+.73,z,.035,.035,1.5);
      if(yy<6) {
        e(C.scaffold,[8.22,G+yy+.07,scaffoldZ[i]],[8.22,G+yy+1.98,scaffoldZ[i+1]],.035);
        e(C.scaffold,[8.22,G+yy+1.98,scaffoldZ[i]],[8.22,G+yy+.07,scaffoldZ[i+1]],.035);
      }
    }
    for(const z of scaffoldZ) b(C.scaffold,7.825,G+yy-.055,z,.88,.045,.045);
  }
  // Pixel-woven safety net, generated locally and alpha-tested instead of blended.
  const netCanvas=document.createElement('canvas');netCanvas.width=64;netCanvas.height=64;
  const nc=netCanvas.getContext('2d');nc.clearRect(0,0,64,64);
  nc.fillStyle='#397d6d';
  for(let i=0;i<64;i+=8){nc.fillRect(i,0,2,64);nc.fillRect(0,i,64,2);}
  const netTex=new THREE.CanvasTexture(netCanvas);netTex.wrapS=netTex.wrapT=THREE.RepeatWrapping;
  netTex.repeat.set(6,6);netTex.magFilter=THREE.NearestFilter;netTex.colorSpace=THREE.SRGBColorSpace;
  const netMat=new THREE.MeshStandardMaterial({map:netTex,color:0x8abd92,alphaTest:.45,side:THREE.DoubleSide,roughness:1});
  const net=new THREE.Mesh(new THREE.PlaneGeometry(6.0,6.1),netMat);
  net.position.set(8.25,G+3.65,-.55);net.rotation.y=Math.PI*.5;world.add(net);
  obstacle(7.86,-.55,.53,3.05,8.3,'scaffold');

  // Rebar fabrication shelter; an open front provides a clear standing aisle.
  b(C.darkConcrete,-.9,G+.035,4.52,3.7,.07,1.96);
  for(const x of [-2.62,.8]) for(const z of [3.62,5.32]) {
    b(C.navy,x,G+1.0,z,.105,2,.105);
    b(C.concrete,x,G+.07,z,.24,.14,.24);
  }
  for(let i=0;i<20;i++) {
    const x=-2.8+(i+.5)*.19;
    b(i%4?C.teal:C.tealLight,x,G+2.06,4.48,.19,.13,2.04,0,0,0);
    b(C.tealLight,x,G+2.145,4.48,.024,.033,2.04);
  }
  for(const z of [3.62,5.32]) b(C.navy,-.91,G+1.88,z,3.55,.12,.09);
  for(const x of [-2.6,.78]) e(C.scaffold,[x,G+.95,5.28],[x,G+1.85,4.48],.055);
  b(C.timber,-.95,G+.76,4.75,2.7,.12,.62);
  for(const x of [-2,.08]) for(const z of [4.51,4.97]) b(C.navy,x,G+.4,z,.09,.7,.09);
  for(let i=0;i<9;i++) b(C.rebar,-.88,G+.845+i*.013,4.52+i*.048,2.67,.026,.027);
  b(C.orange,.38,G+.95,4.72,.26,.28,.3);b(C.charcoal,.38,G+1.125,4.72,.2,.07,.24);
  for(const x of [-2.17,-1.55]) b(C.charcoal,x,G+.21,5.05,.16,.28,.28);
  label(world,'REBAR WORKSHOP',-.91,G+1.7,3.553,2.35,.29,{bg:'#ece5c5',fg:'#2e545b',fontSize:34,rotationY:Math.PI});
  label(world,'STEEL / 钢筋加工',-.91,G+1.71,5.41,2.45,.3,{bg:'#e5dec2',fg:'#2e545b',fontSize:32});
  obstacle(-.95,4.78,1.43,.44,2.3,'rebar workbench');
  for(const x of [-2.62,.8]) for(const z of [3.62,5.32]) obstacle(x,z,.11,.11,3.5,'shelter column');

  // Storeyard: individual bags, spacers, masonry and steel bundles.
  for(const pos of [[2.45,4.25],[3.94,4.72]]) {
    pallet(pos[0],pos[1]);
    for(let layer=0;layer<4;layer++) for(let j=0;j<2;j++) for(let k=0;k<2;k++) {
      const x=pos[0]+(j-.5)*.54,z=pos[1]+(k-.5)*.37;
      b((layer+j+k)%3?C.ivory:C.concrete,x,G+.29+layer*.18,z,.52,.165,.35,0,layer%2?Math.PI:0);
      if(k===1) b(C.blue,x,G+.29+layer*.18,z+.179,.18,.045,.009);
    }
    obstacle(pos[0],pos[1],.62,.44,2.35,'cement bags');
  }
  pallet(5.25,4.57,.85,1.18);
  for(let j=0;j<4;j++) for(let k=0;k<4;k++) for(let layer=0;layer<3;layer++)
    b((layer+j)%3?C.brick:C.rust,4.98+j*.18,G+.27+layer*.145,4.14+k*.27,.168,.13,.25);
  obstacle(5.25,4.57,.46,.62,2.25,'brick pallet');
  for(const z of [4.12,4.88]) b(C.timber,6.42,G+.08,z,1.27,.16,.13);
  for(let j=0;j<9;j++) for(let layer=0;layer<3;layer++) {
    const x=5.95+j*.116;
    b(C.rebar,x,G+.18+layer*.065,4.5,.047,.048,1.31);
  }
  for(const z of [4.15,4.85]) b(C.ivory,6.415,G+.28,z,1.07,.05,.028);
  obstacle(6.42,4.5,.59,.72,1.8,'stacked reinforcement');
  // Small construction supplies near the north-side warehouse margin.
  for(let i=0;i<3;i++) {
    b(C.teal,4.2+i*.55,G+.22,-4.7,.43,.44,.5);
    b(C.ivory,4.2+i*.55,G+.46,-4.7,.44,.035,.5);
    b(C.orange,4.2+i*.55,G+.22,-4.438,.1,.16,.014);
  }
  obstacle(4.75,-4.7,.87,.29,2,'supply drums');

  // Two-storey modular site office. Warm windows are one instanced emissive draw call.
  const ox=9.81,oz=-2.72;
  b(C.darkConcrete,ox,G+.06,oz,2.06,.12,5.04);
  for(let storey=0;storey<2;storey++) {
    const y=G+.16+storey*1.77;
    b(C.ivory,ox,y+.8,oz,1.9,1.59,4.92);
    for(const x of [8.81,10.81]) {
      b(C.blue,x,y+.8,oz,.11,1.65,5.01);
      for(let zz=-5.09;zz<-.3;zz+=.235) b(C.tealLight,x+(x<ox?-.057:.057),y+.8,zz,.019,1.51,.022);
    }
    for(const z of [-5.2,-.24]) {
      b(C.blue,ox,y+.055,z,2.05,.11,.12);
      b(C.blue,ox,y+1.59,z,2.05,.13,.12);
    }
    for(const x of [8.8,10.82]) for(const z of [-5.18,-.26]) b(C.teal,x,y+.81,z,.11,1.7,.11);
  }
  b(C.teal,ox,G+3.78,oz,2.2,.17,5.15);
  for(let z=-5.2;z<-.18;z+=.2) b(C.tealLight,ox,G+3.887,z,2.16,.04,.035);
  // Sixteen window panes with separate dark trims to avoid coplanar surfaces.
  const windowMat=new THREE.MeshStandardMaterial({color:0xb9d7cb,emissive:0xffb666,emissiveIntensity:.14,roughness:.3,metalness:.05});
  windows.push(windowMat);
  const windowTransforms=[];
  for(let storey=0;storey<2;storey++) {
    const y=G+1.11+storey*1.77;
    for(const xx of [8.735,10.885]) for(const z of [-4.42,-2.94,-1.48]) {
      b(C.navy,xx,y,z,.04,.78,.96);
      windowTransforms.push([xx+(xx<ox?-.024:.024),y,z,.018,.66,.82]);
      b(C.ivory,xx+(xx<ox?-.039:.039),y,z,.027,.67,.035);
      b(C.ivory,xx+(xx<ox?-.039:.039),y-.36,z,.055,.055,.96);
    }
    for(const x of [9.19,10.43]) {
      b(C.navy,x,y,-.168,.48,.71,.035);
      windowTransforms.push([x,y,-.143,.39,.59,.018]);
    }
  }
  const windowMesh=new THREE.InstancedMesh(new THREE.BoxGeometry(1,1,1),windowMat,windowTransforms.length);
  const dummy=new THREE.Object3D();
  windowTransforms.forEach((v,i)=>{dummy.position.set(v[0],v[1],v[2]);dummy.scale.set(v[3],v[4],v[5]);dummy.updateMatrix();windowMesh.setMatrixAt(i,dummy.matrix);});
  windowMesh.instanceMatrix.needsUpdate=true;world.add(windowMesh);
  b(C.navy,9.81,G+.76,-.168,.46,1.19,.05);
  b(C.blue,9.81,G+.76,-.13,.395,1.11,.037);
  b(C.ivory,9.95,G+.73,-.103,.04,.06,.025);
  for(let step=0;step<3;step++) b(C.concrete,9.81,G+.035+step*.045,.26-step*.155,.76,.07+step*.09,.155);
  b(C.teal,9.81,G+1.68,.025,1.24,.075,.64);
  label(world,'SITE OFFICE',9.81,G+3.43,-.139,1.57,.22,{bg:'#3c7784',fg:'#f6e8c7',fontSize:36});
  registerGlow(world,9.81,G+1.51,.045,0xffba6b,.65);
  registerGlow(world,8.63,G+2.87,-2.95,0xffbf78,1.15);
  obstacle(9.81,-2.72,1.10,2.57,5.4,'site office');
  obstacle(9.81,.22,.40,.3,1.75,'office steps');

  // Stockpile made from discrete warm earth voxels, contained within its retaining bay.
  for(let ix=0;ix<10;ix++) for(let iz=0;iz<8;iz++) {
    const x=8.83+ix*.19,z=.91+iz*.19;
    const r=Math.hypot((x-9.69)/1.1,(z-1.56)/.9);
    const layers=Math.max(0,Math.floor((1-r)*4.5 + rand()*.7));
    for(let yy=0;yy<layers;yy++) b([C.soil,C.sand,C.timber][(ix+iz+yy)%3],x,G+.095+yy*.18,z,.182,.18,.182);
  }
  b(C.darkConcrete,9.75,G+.2,.74,2.06,.4,.1);
  b(C.darkConcrete,8.7,G+.2,1.52,.1,.4,1.68);
  b(C.darkConcrete,9.72,G+.2,2.39,2.1,.4,.1);
  obstacle(9.72,1.55,1.09,.88,2.45,'earth stockpile');

  // Pit edges leave the entire western loader swing corridor open.
  safetyRail(-10.92,-4.24,-4.06,-4.24,.73);
  safetyRail(-4.06,-4.24,-4.06,3.32,.73);
  safetyRail(-10.92,3.32,-4.06,3.32,.73);
  safetyRail(-10.92,-4.24,-10.92,-1.25,.73);
  safetyRail(-10.92,1.25,-10.92,3.32,.73);
  // Pennants are locally generated geometry on the north and south guardrails.
  const flagColors=[0xf2c13e,0xe17d47,0x5fb5b2,0xefe4be];
  const fg=[];
  for(const z of [-4.245,3.325]) for(let j=0;j<14;j++) {
    const x=-10.72+j*.48, yy=G+.76;
    const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute([x,yy,z,x+.26,yy,z,x+.13,yy-.27,z+.025],3));geo.computeVertexNormals();
    const mesh=new THREE.Mesh(geo,mat(flagColors[j%4]));mesh.material.side=THREE.DoubleSide;world.add(mesh);
    fg.push(mesh);
  }
  // Consolidate flags by color into four meshes, preserving the shared material palette.
  for(let c=0;c<4;c++) {
    const pos=[];for(let i=0;i<fg.length;i++) if(i%14%4===c) pos.push(...fg[i].geometry.attributes.position.array);
    if(pos.length){const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.computeVertexNormals();world.add(new THREE.Mesh(geo,mat(flagColors[c])));}
  }
  for(const f of fg){world.remove(f);f.geometry.dispose();}
  label(world,'EXCAVATION  /  -0.85 m',-7.49,G+.47,3.365,2.25,.27,{bg:'#e3b83d',fg:'#343e3e',fontSize:32});

  // Continuous hoarding with modeled corrugations, and the front entry opening.
  function fenceRun(x1,z1,x2,z2) {
    const len=Math.hypot(x2-x1,z2-z1), n=Math.ceil(len/1.18), dx=(x2-x1)/n,dz=(z2-z1)/n;
    const alongX=Math.abs(dx)>Math.abs(dz), panel=len/n;
    for(let i=0;i<n;i++) {
      const x=x1+(i+.5)*dx,z=z1+(i+.5)*dz;
      b(i%5===0?C.tealLight:C.teal,x,G+.56,z,alongX?panel-.04:.09,.99,alongX?.09:panel-.04);
      b(C.ivory,x,G+1.095,z,alongX?panel:.15,.075,alongX?.15:panel);
      b(C.darkConcrete,x,G+.065,z,alongX?panel:.19,.13,alongX?.19:panel);
      for(let rib=0;rib<6;rib++) {
        const u=(rib+.5)/6-.5;
        b(C.tealLight,x+(alongX?u*panel:0),G+.56,z+(alongX?0:u*panel),alongX?.024:.115,.95,alongX?.115:.024);
      }
    }
    for(let i=0;i<=n;i++) b(C.ivory,x1+i*dx,G+.58,z1+i*dz,.105,1.16,.105);
  }
  fenceRun(-14.4,-9.1,14.4,-9.1);fenceRun(-14.4,-9.1,-14.4,9.1);fenceRun(14.4,-9.1,14.4,9.1);
  fenceRun(-14.4,9.1,-3.2,9.1);fenceRun(3.2,9.1,14.4,9.1);
  for(const x of [-3.15,3.15]) {
    b(C.darkConcrete,x,G+.075,9.1,.43,.15,.4);
    b(C.ivory,x,G+1.35,9.1,.24,2.55,.24);
    b(C.teal,x,G+1.3,9.255,.265,2.25,.034);
    b(C.yellow,x,G+.45,9.28,.27,.22,.045);
    registerGlow(world,x,G+2.69,9.1,0xffca77,.44);
  }
  b(C.teal,0,G+2.56,9.1,6.52,.39,.3);
  label(world,'WORKSITE 08   |   安全生产',0,G+2.56,9.269,5.9,.29,{bg:'#2e747c',fg:'#f7ead0',fontSize:36});
  label(world,'HARD HATS REQUIRED',-6.9,G+.68,9.171,2.58,.34,{bg:'#efd358',fg:'#41463d',fontSize:32});
  label(world,'BUILDING TOMORROW',7.34,G+.65,9.171,3.75,.4,{bg:'#397c80',fg:'#ece8d4',fontSize:36});
  label(world,'SITE PLAN  /  施工总平面',-11.56,G+.69,9.174,2.1,.44,{bg:'#e7e3cb',fg:'#477781',fontSize:29});
  // Traffic signals occupy the fence margin; all roads remain clear below 5 m.
  for(const x of [-13.99,13.99]) for(const z of [-8.63,8.63]) {
    b(C.navy,x,G+.82,z,.065,1.64,.065);
    b(C.charcoal,x,G+1.57,z,.19,.34,.17);
    b(C.yellow,x,G+1.62,z+.092,.092,.09,.025);
    registerGlow(world,x,G+1.62,z+.107,0xffa63c,.29);
  }

  // Site lighting towers on safe fence margins. Light heads and shader halos are cheap.
  for(const [x,z] of [[-14.02,-8.65],[14.02,-8.65],[-14.02,8.64],[14.02,8.64],[0,-8.66]]) {
    b(C.darkConcrete,x,G+.075,z,.35,.15,.35);
    b(C.navy,x,G+2.23,z,.074,4.4,.074);
    b(C.scaffold,x,G+4.44,z,.6,.055,.055);
    for(const dx of [-.22,.22]) {
      b(C.charcoal,x+dx,G+4.39,z+.045,.27,.2,.17,Math.PI/8);
      b(C.ivory,x+dx,G+4.36,z+.135,.21,.125,.021,Math.PI/8);
      registerGlow(world,x+dx,G+4.34,z+.17,0xffce83,.82);
    }
  }
  // Thin utility cables sag along the northern fence, entirely inside the model.
  for(const x of [-9,9]) {
    b(C.timber,x,G+2.32,-8.68,.11,4.64,.11);
    b(C.charcoal,x,G+4.54,-8.68,.72,.08,.07);
    for(const dx of [-.28,.28]) b(C.ivory,x+dx,G+4.64,-8.68,.08,.16,.08);
  }
  for(const off of [-.28,.28]) for(let i=0;i<16;i++) {
    const a=i/16,bp=(i+1)/16;
    const yy=t=>G+4.72-.65*Math.sin(Math.PI*t);
    e(C.charcoal,[-9+off+18*a,yy(a),-8.68],[-9+off+18*bp,yy(bp),-8.68],.018);
  }
  return {obstacles,windows};
}
