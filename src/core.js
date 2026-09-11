'use strict';
// Three.js r160, MIT, vendored from jsDelivr into this standalone document.
const $=id=>document.getElementById(id), G=1.4;
const scene=new THREE.Scene(), world=new THREE.Group();scene.add(world);
let seed=18467;function rand(){seed=(Math.imul(seed,1664525)+1013904223)>>>0;return seed/4294967296;}
const mats=new Map(), batches=new Map(), cubeGeo=new THREE.BoxGeometry(1,1,1), scratch=new THREE.Object3D();
const baseMaterial=new THREE.MeshStandardMaterial({color:0xffffff,roughness:.78,metalness:.04});
function mat(color){if(color?.isMaterial)return color;if(!mats.has(color))mats.set(color,new THREE.MeshStandardMaterial({color,roughness:.73,metalness:.05}));return mats.get(color);}
function group(parent,x=0,y=0,z=0){const g=new THREE.Group();g.position.set(x,y,z);parent.add(g);return g;}
function queueBox(parent,color,matrix){let p=batches.get(parent);if(!p){p=[];batches.set(parent,p);}p.push({color,matrix:matrix.clone()});}
function box(parent,color,x,y,z,w,h,d,rx=0,ry=0,rz=0){scratch.position.set(x,y,z);scratch.rotation.set(rx,ry,rz);scratch.scale.set(w,h,d);scratch.updateMatrix();queueBox(parent,color,scratch.matrix);}
function beam(parent,color,a,b,t){const va=new THREE.Vector3(...a),vb=new THREE.Vector3(...b),dif=vb.clone().sub(va);scratch.position.copy(va).add(vb).multiplyScalar(.5);scratch.quaternion.setFromUnitVectors(new THREE.Vector3(0,1,0),dif.clone().normalize());scratch.scale.set(t,dif.length(),t);scratch.updateMatrix();queueBox(parent,color,scratch.matrix);}
let instanceCount=0;
function flushBatches(){for(const[parent,records]of batches){const partitions=new Map();for(const r of records){const key=r.color?.isMaterial?r.color:baseMaterial;if(!partitions.has(key))partitions.set(key,[]);partitions.get(key).push(r);}for(const[m,rs]of partitions){const mesh=new THREE.InstancedMesh(cubeGeo,m,rs.length);rs.forEach((r,i)=>{mesh.setMatrixAt(i,r.matrix);if(!r.color?.isMaterial)mesh.setColorAt(i,new THREE.Color(r.color));});mesh.castShadow=true;mesh.receiveShadow=true;mesh.instanceMatrix.needsUpdate=true;if(mesh.instanceColor)mesh.instanceColor.needsUpdate=true;mesh.computeBoundingSphere();parent.add(mesh);instanceCount+=rs.length;}}batches.clear();}
const cylGeos=new Map();function cyl(parent,color,x,y,z,rt,rb,h,n=8,rx=0,ry=0,rz=0){const key=[rt,rb,h,n].join(',');if(!cylGeos.has(key))cylGeos.set(key,new THREE.CylinderGeometry(rt,rb,h,n));const m=new THREE.Mesh(cylGeos.get(key),mat(color));m.position.set(x,y,z);m.rotation.set(rx,ry,rz);m.castShadow=true;m.receiveShadow=true;parent.add(m);return m;}
function canvasTexture(w,h,draw){const c=document.createElement('canvas');c.width=w;c.height=h;draw(c.getContext('2d'),w,h);const tex=new THREE.CanvasTexture(c);tex.colorSpace=THREE.SRGBColorSpace;tex.anisotropy=4;return tex;}
function label(parent,text,x,y,z,w,h,o={}){const tex=canvasTexture(512,Math.max(64,Math.round(512*h/w)),(c,cw,ch)=>{c.fillStyle=o.bg??'#23393d';c.fillRect(0,0,cw,ch);c.strokeStyle=o.fg??'#eadfbf';c.globalAlpha=.4;c.strokeRect(7,7,cw-14,ch-14);c.globalAlpha=1;c.fillStyle=o.fg??'#eadfbf';c.textAlign='center';c.textBaseline='middle';c.font=`600 ${o.fontSize??Math.min(ch*.5,cw/(text.length*.65))}px "Segoe UI","Microsoft YaHei",sans-serif`;c.fillText(text,cw/2,ch/2);});const m=new THREE.Mesh(new THREE.PlaneGeometry(w,h),new THREE.MeshStandardMaterial({map:tex,roughness:.85,side:THREE.DoubleSide}));m.position.set(x,y,z);m.rotation.y=o.rotationY||0;parent.add(m);return m;}
const glows=[];function registerGlow(parent,x,y,z,color=0xffbb66,size=1){glows.push({parent,pos:new THREE.Vector3(x,y,z),color:new THREE.Color(color),size});}
function buildTable(){
 const tex=canvasTexture(1024,512,(c,w,h)=>{c.fillStyle='#382922';c.fillRect(0,0,w,h);for(let i=0;i<1900;i++){const y=rand()*h;c.strokeStyle=`rgba(${rand()>.55?'149,108,74':'12,10,9'},${.04+rand()*.13})`;c.lineWidth=.3+rand()*2;c.beginPath();for(let x=0;x<=w;x+=16){const v=y+Math.sin(x*.009+y*.023)*3+Math.sin(x*.023+y)*.7;x?c.lineTo(x,v):c.moveTo(x,v);}c.stroke();}for(let y=0;y<h;y+=128){c.fillStyle='#110e0b';c.fillRect(0,y,w,1.5);c.fillStyle='#95735335';c.fillRect(0,y+2,w,1);}});tex.wrapS=tex.wrapT=THREE.RepeatWrapping;tex.repeat.set(2,2);
 const wood=new THREE.MeshStandardMaterial({map:tex,roughness:.4,metalness:.025});box(scene,wood,0,-.55,0,42,1.1,32);
 box(scene,0x251d19,0,-1.15,0,40,.24,30);for(const x of[-18,18])for(const z of[-13,13])box(scene,0x29211d,x,-4.8,z,1.5,7.1,1.5);
 // A quiet architectural studio surrounds the tabletop.
 box(scene,0x262c30,0,-8.45,0,180,.3,180);box(scene,0x343d42,0,15,-33,140,48,.5);
 for(let x=-46;x<49;x+=8){box(scene,0x2b3337,x,9,-32.6,.09,33,.1);}
 const windowMat=new THREE.MeshBasicMaterial({color:0x8d9da2});window.studioWindowMat=windowMat;for(let x=-36;x<=-16;x+=7){box(scene,windowMat,x,15,-32.1,6,21,.12);box(scene,0x232d32,x,15,-31.98,.16,21,.15);box(scene,0x232d32,x,14,-31.95,6,.16,.16);}
 box(scene,0x434238,25,-1.4,-27,16,.4,4);for(let i=0;i<6;i++)box(scene,[0x85745d,0x565e5b,0x777870][i%3],22+i*.9,.1,-27,.64,2.5+rand(),1.7);
 // Model plinth and layered, squared edges.
 box(world,0x1e292c,0,.26,0,30.7,.48,20.7);
 function cutSlab(color,y,height,width,depth){const x1=-11.2,x2=-3.85,z1=-4.38,z2=3.56;box(world,color,(-width/2+x1)/2,y,0,x1+width/2,height,depth);box(world,color,(width/2+x2)/2,y,0,width/2-x2,height,depth);box(world,color,(x1+x2)/2,y,(-depth/2+z1)/2,x2-x1,height,z1+depth/2);box(world,color,(x1+x2)/2,y,(depth/2+z2)/2,x2-x1,height,depth/2-z2);}
 cutSlab(0x87694c,.65,.30,30.15,20.15);cutSlab(0x554733,.84,.08,30.05,20.05);
 label(world,'NORTH YARD  /  城市更新 · 一期',0,.33,10.36,9.5,.3,{bg:'#1e292c',fg:'#d6c393'});
 for(const x of[-14.9,14.9])for(const z of[-10.0,10.0])cyl(world,0xd2b887,x,.62,z,.07,.07,.05,8);
 // Ground tiles omit the excavation volume instead of covering it with a fake dark plane.
 const soil=[0xba9a70,0xc5a47a,0xb69a73,0xc9ac81,0xbfa276];
 const step=.55;
 for(let x=-14.85;x<14.85;x+=step)for(let z=-9.85;z<9.85;z+=step){const px=x+step/2,pz=z+step/2;if(px> -11.1&&px< -3.95&&pz> -4.3&&pz<3.45)continue;box(world,soil[Math.floor(rand()*soil.length)],px,1.14,pz,step,.52,step);}
 box(world,0x907354,-7.55,.525,-.45,7.1,.05,7.75);
 // Retaining wall strata; shoring beams sit outside the free excavator envelope.
 for(let layer=0;layer<3;layer++){const y=.71+layer*.255,c=[0x80664b,0x9d7b53,0xae8b60][layer];for(let z=-4.15;z<3.5;z+=.55){box(world,c,-11.05,y,z,.18,.25,.55);box(world,c,-4,y,z,.18,.25,.55);}for(let x=-10.78;x<-4.1;x+=.55){box(world,c,x,y,-4.25,.54,.25,.15);box(world,c,x,y,3.42,.54,.25,.15);}}
 for(let z=-3.8;z<3.3;z+=1.15){box(world,0x635f54,-3.91,1,z,.13,1.05,.14);box(world,0x78776a,-11.15,1,z,.12,1.05,.14);}
 for(let i=0;i<380;i++){const x=-10.75+rand()*6.5,z=-3.95+rand()*6.95,s=.07+rand()*.14;if((x>-10.5&&x<-8.5&&z>-.9&&z<.9)||(x>-6.6&&x<-5&&z>-2.15&&z<-.85))continue;box(world,soil[i%5],x,.55+s/2,z,s,s,s);batches.get(world).at(-1).loose=true;}
 // Loop road with positive separation from structures and pedestrians.
 const road=new THREE.MeshStandardMaterial({color:0x6d7069,roughness:.95,metalness:.03});window.roadMat=road;
 box(world,road,0,1.414,-7.1,27.7,.028,2.6);box(world,road,0,1.414,7.1,27.7,.028,2.6);box(world,road,-12.5,1.414,0,2.6,.028,11.6);box(world,road,12.5,1.414,0,2.6,.028,11.6);
 for(let x=-10.3;x<11;x+=1.8){box(world,0xc6bc91,x,1.436,-7.1,.75,.012,.055);box(world,0xc6bc91,x,1.436,7.1,.75,.012,.055);}for(let z=-4.8;z<5.6;z+=1.7){box(world,0xc6bc91,-12.5,1.436,z,.055,.012,.7);box(world,0xc6bc91,12.5,1.436,z,.055,.012,.7);}
 // Fine gravel remains on safe shoulders, out of every traffic corridor.
 for(let i=0;i<650;i++){let x=-14.7+rand()*29.4,z=-9.7+rand()*19.4;if((Math.abs(x)>11.05&&Math.abs(x)<13.95)||(Math.abs(z)>5.8&&Math.abs(z)<8.43)||(x>-11.2&&x<-3.9&&z>-4.4&&z<3.6)||(x>-9&&x<-4.7&&z>4.15&&z<5.55))continue;const s=.035+rand()*.06;box(world,[0xa98e69,0xddd0ab,0x857b68][i%3],x,G+s/2,z,s,s*.6,s);batches.get(world).at(-1).loose=true;}
 buildDeskProps();
}
function pruneLooseGravel(architecture,staff){const records=batches.get(world);batches.set(world,records.filter(r=>{if(!r.loose)return true;const e=r.matrix.elements,x=e[12],y=e[13],z=e[14],padding=Math.max(e[0],e[10])*.5+.04;for(const w of staff.workers){if(Math.abs(w.y-y)<.6&&Math.abs(x-w.baseX)<w.radius+w.travel+padding&&Math.abs(z-w.baseZ)<w.radius+padding)return false;}for(const o of architecture.obstacles){if(y>G&&Math.abs(x-o.x)<o.hx+padding&&Math.abs(z-o.z)<o.hz+padding)return false;}return true;}));}
function blueprint(x,z,angle,w=5,h=3.4){const tex=canvasTexture(768,512,(c,cw,ch)=>{c.fillStyle='#254454';c.fillRect(0,0,cw,ch);c.strokeStyle='#7b9ca832';c.lineWidth=1;for(let x=0;x<cw;x+=24){c.beginPath();c.moveTo(x,0);c.lineTo(x,ch);c.stroke();}for(let y=0;y<ch;y+=24){c.beginPath();c.moveTo(0,y);c.lineTo(cw,y);c.stroke();}c.strokeStyle='#b8d4d3';c.lineWidth=2;c.strokeRect(26,25,716,462);for(let i=0;i<3;i++){const x=65+i*195;c.strokeRect(x,90,160,250);for(let j=0;j<5;j++){c.strokeRect(x+10,105+j*42,62,31);c.strokeRect(x+85,105+j*42,63,31);}c.beginPath();c.moveTo(x-10,360);c.lineTo(x+165,360);c.stroke();}c.font='16px monospace';c.fillStyle='#d7e6df';c.fillText('NORTH YARD / STRUCTURAL PLAN',55,60);c.font='12px monospace';c.fillText('A-001     SCALE 1:150     REV. 09',395,454);c.strokeRect(380,405,340,66);});const p=new THREE.Mesh(new THREE.BoxGeometry(w,.025,h),new THREE.MeshStandardMaterial({map:tex,roughness:.95}));p.position.set(x,.043,z);p.rotation.y=angle;scene.add(p);}
function buildDeskProps(){
 blueprint(-16.7,6.7,.18,5.5,4);blueprint(14.6,12.65,-.12,5.4,3.1);blueprint(-16.1,6.4,.08,5.2,3.8);
 // Chunky safety helmet on the workbench, built as stepped voxel rings.
 const helmet=group(scene,-15.7,.025,11.4);helmet.rotation.y=-.25;
 box(helmet,0xe3b440,0,.1,0,2.6,.2,2.9);for(let l=0;l<5;l++){const size=2.1-l*.21;box(helmet,l%2?0xeabc4d:0xd8a534,0,.26+l*.23,-.12,size,.24,size*1.05);}box(helmet,0xf7d476,0,1.45,-.13,.27,.09,1.15);
 const tape=group(scene,16.8,.06,7.1);tape.rotation.y=.28;box(tape,0x222c30,0,.38,0,1.3,.76,1.12);box(tape,0xdcb63f,0,.4,.035,1.12,.63,1.08);cyl(tape,0x30383a,0,.78,0,.37,.37,.08,12);box(tape,0xdfd6bd,-1.8,.015,0,2.4,.028,.23);for(let i=0;i<26;i++)box(tape,0x313b3d,-.66-i*.088,.034,i%5===0?.0:-.035,.012,.008,i%5===0?.2:.11);box(tape,0xbabeb5,-3,.065,0,.08,.14,.26);
 const level=group(scene,12.3,.06,11.7);level.rotation.y=-.12;box(level,0xa5aba5,0,.21,0,4.3,.42,.67);box(level,0x2a3537,0,.43,0,4.1,.04,.49);for(const x of[-1.78,1.78])box(level,0x243034,x,.21,0,.62,.46,.73);box(level,0xc9d5ab,0,.465,0,.75,.045,.21);box(level,0xb6d379,.05,.494,0,.22,.018,.17);box(level,0x5b7050,-.16,.499,0,.022,.021,.22);box(level,0x5b7050,.2,.499,0,.022,.021,.22);
 const pencil=group(scene,-17.2,.15,9.5);pencil.rotation.y=.43;box(pencil,0xde9c45,0,0,0,3,.13,.13);cyl(pencil,0xc6ad82,-1.67,0,0,0,.08,.32,6,0,0,Math.PI/2);
}
