/* Miniature crew. Every helmet, face, vest, limb and tool shares one draw call. */
function buildWorkers() {
  const crew = [];
  const vestColors = [0xff6f19, 0xf7bf20, 0xc6df39, 0xff8428, 0xb5d839];
  const skinColors = [0xe4ae7d, 0xb87951, 0xf1c59e, 0x885635, 0xc89268];
  const navy = 0x243d50, blue = 0x456b80, boots = 0x29313b;
  const allParts = [];
  const tmpLocal = new THREE.Matrix4(), tmpWorld = new THREE.Matrix4();
  const boneNames = ['root', 'torso', 'leftArm', 'rightArm', 'leftFore', 'rightFore', 'leftLeg', 'rightLeg'];

  function person(x, z, y, job, yaw = 0, travel = 0) {
    const id = crew.length;
    const worker = {
      id, x, z, y, baseX: x, baseZ: z, job, yaw, baseYaw: yaw, travel,
      phase: id * 2.399963229728653, scale: .94 + (id % 4) * .018,
      vest: vestColors[id % vestColors.length], skin: skinColors[id % skinColors.length],
      bones: {}, parts: [], radius: job === 'carry' ? .40 : .43,
      position: new THREE.Vector3(x, y, z),
    };
    worker.scaleVector = new THREE.Vector3(worker.scale, worker.scale, worker.scale);
    for (const name of boneNames) worker.bones[name] = new THREE.Matrix4();
    crew.push(worker);
    return worker;
  }

  // Individual floor locations avoid every column, perimeter rebar and stair opening.
  const floors = [G + .23, G + 2.46, G + 4.66];
  floors.forEach((height, floor) => {
    person(2.10, -2.10, height, 'tie', .22 + floor * .27);
    person(2.30, .80, height, floor === 1 ? 'inspect' : 'tool', -.65);
    person(5.15, .80, height, 'tie', 1.15);
  });
  person(2.0, -1.5, G + 6.86, 'tie', .5);
  person(4.4, 1.1, G + 6.86, 'signal', -.6);

  // Rebar processing crew in the open aisle of the canopy.
  person(-2.25, 3.98, G + .09, 'tie', 0);
  person(-1.15, 3.98, G + .09, 'tool', 0);
  person(-.05, 3.98, G + .09, 'inspect', .2);

  // Material checkers look toward the clear apron, with tools clear of stored goods.
  [1.7, 3.0, 4.3, 5.6, 6.9].forEach((x, i) =>
    person(x, 3.65, G + .015, ['inspect', 'tool', 'tie', 'inspect', 'stand'][i], Math.PI));

  // A separated pedestrian frontage; patrol ranges never overlap a gate post.
  [-10, -8, -6, -4.35, 0, 4.35, 6.7, 9.1].forEach((x, i) =>
    person(x, 8.75, G + .015, i === 3 || i === 4 ? 'security' : 'walk', Math.PI / 2, .23));

  person(9.05, .40, G + .015, 'inspect', .85);
  person(10.60, .45, G + .015, 'stand', -.85);
  person(-2.80, 1.80, G + .015, 'signal', -.75);
  person(-3.50, -2.00, G + .015, 'tool', -.5);
  person(-3.22, -3.20, G + .015, 'inspect', -.4);
  person(-3.22, -.75, G + .015, 'tie', -.25);
  person(-3.12, .55, G + .015, 'stand', -.5);
  person(-3.25, 2.85, G + .015, 'tool', -.5);

  // Independent short delivery routes on the open apron and behind material bays.
  person(-1.6, -1.1, G + .015, 'carry', Math.PI / 2, .22);
  person(-1.6, 1.1, G + .015, 'carry', Math.PI / 2, .22);
  [2.60, 5.30].forEach(x => person(x, 5.55, G + .015, 'carry', Math.PI / 2, .25));

  function add(w, bone, color, x, y, z, sx, sy, sz, rz = 0) {
    const local = new THREE.Matrix4().makeRotationZ(rz);
    local.scale(new THREE.Vector3(sx, sy, sz));
    local.setPosition(x, y, z);
    const part = { index: allParts.length, bone, local, color };
    w.parts.push(part);
    allParts.push(part);
  }

  for (const w of crew) {
    const uniform = w.job === 'security' ? 0x224d65 : (w.id % 2 ? navy : blue);
    const vest = w.job === 'security' ? 0xa8c749 : w.vest;
    const helmet = w.id % 7 === 0 || w.job === 'inspect' ? 0xf3eee0 : 0xffc52b;
    add(w, 'root', uniform, 0, .345, 0, .235, .085, .155);
    add(w, 'root', 0x30343a, 0, .381, .005, .25, .035, .165);
    add(w, 'root', 0xc3c4b1, 0, .381, .096, .043, .035, .017);
    for (const side of ['left', 'right']) {
      add(w, side + 'Leg', uniform, 0, -.125, 0, .090, .255, .110);
      add(w, side + 'Leg', boots, 0, -.291, .022, .105, .071, .16);
      add(w, side + 'Leg', 0x48515a, 0, -.279, .076, .107, .038, .029);
      add(w, side + 'Arm', uniform, 0, -.074, 0, .070, .152, .087);
      add(w, side + 'Arm', vest, 0, -.022, 0, .078, .069, .094);
      add(w, side + 'Fore', uniform, 0, -.062, 0, .058, .122, .068);
      add(w, side + 'Fore', w.skin, 0, -.139, .009, .067, .058, .079);
    }
    add(w, 'torso', uniform, 0, .135, 0, .245, .280, .157);
    add(w, 'torso', vest, -.070, .131, .007, .096, .274, .174);
    add(w, 'torso', vest, .070, .131, .007, .096, .274, .174);
    add(w, 'torso', 0xf4efc5, 0, .095, .100, .235, .030, .014);
    add(w, 'torso', 0xe8ebc8, -.073, .205, .100, .028, .107, .014);
    add(w, 'torso', 0xe8ebc8, .073, .205, .100, .028, .107, .014);
    add(w, 'torso', 0xdce5c6, 0, .100, -.091, .24, .031, .014);
    add(w, 'torso', w.skin, 0, .294, 0, .078, .064, .085);
    add(w, 'torso', w.skin, 0, .393, .012, .164, .162, .151);
    add(w, 'torso', 0x503c2a, 0, .420, -.067, .170, .115, .039);
    add(w, 'torso', w.skin, 0, .386, .096, .046, .045, .026);
    add(w, 'torso', 0x283941, -.040, .415, .091, .020, .023, .010);
    add(w, 'torso', 0x283941, .040, .415, .091, .020, .023, .010);
    add(w, 'torso', helmet, 0, .484, .015, .227, .037, .206);
    add(w, 'torso', helmet, 0, .518, -.001, .185, .046, .166);
    add(w, 'torso', 0xffdd78, 0, .544, -.001, .052, .010, .172);
    if (w.id % 3 === 0) {
      add(w, 'torso', 0x263f48, .096, .196, .111, .038, .070, .022);
      add(w, 'torso', 0x242d33, .099, .247, .111, .012, .035, .013);
    }
    if (w.job === 'carry') {
      add(w, 'torso', 0xc98e50, 0, .095, .255, .405, .095, .115);
      add(w, 'torso', 0xefb971, 0, .146, .257, .408, .012, .118);
      add(w, 'torso', 0x965c35, -.088, .096, .318, .016, .093, .011);
      add(w, 'torso', 0x965c35, .088, .096, .318, .016, .093, .011);
    } else if (w.job === 'signal') {
      add(w, 'rightFore', 0x303941, 0, -.157, .016, .032, .062, .030);
      add(w, 'rightFore', 0xff4637, 0, -.275, .016, .035, .178, .033);
      add(w, 'leftFore', 0xa9df55, 0, -.234, .013, .028, .154, .030);
    } else if (w.job === 'tool') {
      add(w, 'rightFore', 0x2ca9a0, 0, -.160, .047, .090, .095, .116);
      add(w, 'rightFore', 0x253d46, 0, -.167, .119, .048, .047, .052);
      add(w, 'rightFore', 0xa3aab0, 0, -.167, .183, .018, .019, .083);
    } else if (w.job === 'inspect') {
      add(w, 'leftFore', 0x9b6841, .014, -.165, .063, .191, .215, .026);
      add(w, 'leftFore', 0xf0ead5, .014, -.165, .080, .164, .187, .012);
      add(w, 'leftFore', 0x657e83, .014, -.074, .089, .055, .018, .013);
      add(w, 'leftFore', 0x6c9aaf, .014, -.148, .089, .096, .011, .006);
      add(w, 'leftFore', 0x6c9aaf, .014, -.177, .089, .096, .010, .006);
    } else if (w.job === 'tie') {
      add(w, 'rightFore', 0xb6c1c7, 0, -.190, .025, .024, .094, .026, .15);
      add(w, 'rightFore', 0xd54c35, -.017, -.147, .025, .024, .056, .027, -.23);
      add(w, 'leftFore', 0x737d7c, 0, -.180, .015, .021, .093, .024, -.15);
    } else if (w.job === 'security') {
      add(w, 'torso', 0xe0dfaf, -.080, .207, .113, .056, .057, .013);
      add(w, 'rightFore', 0x22383e, 0, -.173, .028, .043, .086, .046);
    }
  }

  const material = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: .84, metalness: .03 });
  const mesh = new THREE.InstancedMesh(new THREE.BoxGeometry(1, 1, 1), material, allParts.length);
  mesh.name = '39 articulated voxel crew — one instanced draw';
  mesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  mesh.frustumCulled = false;
  const color = new THREE.Color();
  for (const part of allParts) mesh.setColorAt(part.index, color.setHex(part.color));
  mesh.instanceColor.needsUpdate = true;
  world.add(mesh);

  function joint(out, parent, x, y, z, angle) {
    tmpLocal.makeRotationX(angle);
    tmpLocal.setPosition(x, y, z);
    out.multiplyMatrices(parent, tmpLocal);
  }

  let lastTime = 0;
  function update(dt, simTime) {
    const t = Number.isFinite(simTime) ? simTime : (lastTime + (dt || 0));
    lastTime = t;
    for (const w of crew) {
      const p = w.phase, slow = Math.sin(t * 1.8 + p), fast = Math.sin(t * 5.2 + p);
      let lean = .025 * slow, la = .035 * slow, ra = -.035 * slow;
      let lf = -.08, rf = -.08, ll = 0, rl = 0;
      if (w.travel) {
        const route = t * .46 + p;
        w.x = w.baseX + Math.sin(route) * w.travel;
        // At the end of each personal route, turn in place inside the reserved envelope.
        const direction = Math.cos(route);
        const turn = Math.tanh(direction * 7);
        w.yaw = Math.PI - Math.PI / 2 * turn;
        const step = Math.sin(t * 4.5 + p) * Math.abs(direction);
        ll = step * .26;
        rl = -ll;
        la = -step * .24;
        ra = step * .24;
      }
      switch (w.job) {
        case 'tie':
          lean = .31 + .043 * slow;
          la = -.84 - .10 * fast; ra = -.94 + .10 * fast;
          lf = -.70 + .08 * fast; rf = -.58 - .08 * fast;
          break;
        case 'tool':
          lean = .10 + .021 * slow;
          ra = -.81 + .07 * fast; rf = -.66 - .05 * fast;
          la = -.65 - .04 * fast; lf = -.86;
          break;
        case 'carry':
          lean = .025;
          la = -.55; ra = -.55; lf = -1.11; rf = -1.11;
          break;
        case 'signal':
          lean = -.012;
          ra = -2.32 + .34 * slow; rf = -.15 - .10 * slow;
          la = -1.12 - .12 * slow; lf = -.24;
          break;
        case 'inspect':
          lean = .035;
          la = -.28; lf = -1.22;
          ra = -.44 + .14 * slow; rf = -.82;
          break;
        case 'security':
          ra = -.50 + .06 * slow; rf = -.85;
          break;
      }
      const b = w.bones;
      b.root.makeRotationY(w.yaw);
      b.root.scale(w.scaleVector);
      b.root.setPosition(w.x, w.y, w.z);
      joint(b.torso, b.root, 0, .365, 0, lean);
      joint(b.leftArm, b.torso, -.168, .238, 0, la);
      joint(b.rightArm, b.torso, .168, .238, 0, ra);
      joint(b.leftFore, b.leftArm, 0, -.150, 0, lf);
      joint(b.rightFore, b.rightArm, 0, -.150, 0, rf);
      joint(b.leftLeg, b.root, -.068, .349, 0, ll);
      joint(b.rightLeg, b.root, .068, .349, 0, rl);
      for (const part of w.parts) {
        tmpWorld.multiplyMatrices(b[part.bone], part.local);
        mesh.setMatrixAt(part.index, tmpWorld);
      }
      w.position.set(w.x, w.y, w.z);
    }
    mesh.instanceMatrix.needsUpdate = true;
  }

  function audit() {
    // Same-floor roots remain farther apart than both body envelopes, even at route ends.
    let minimumSeparation = Infinity;
    const overlaps = [];
    for (let i = 0; i < crew.length; i++) for (let j = i + 1; j < crew.length; j++) {
      const a = crew[i], b = crew[j];
      if (Math.abs(a.y - b.y) > 1.1) continue;
      const dx = Math.max(0, Math.abs(a.baseX - b.baseX) - a.travel - b.travel);
      const dz = Math.abs(a.baseZ - b.baseZ);
      const gap = Math.hypot(dx, dz) - a.radius - b.radius;
      minimumSeparation = Math.min(minimumSeparation, gap);
      if (gap < 0) overlaps.push([a.id, b.id, gap]);
    }
    return { count: crew.length, instances: allParts.length, drawCalls: 1, minimumSeparation, overlaps };
  }
  update(0, 0);
  return { update, count: crew.length, workers: crew, mesh, audit };
}
