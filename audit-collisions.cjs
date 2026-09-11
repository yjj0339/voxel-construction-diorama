// Read-only browser audit. Run: node audit-collisions.cjs
// Broad phase: X/Z spatial grid + world AABBs. Narrow phase: all 15 OBB SAT axes.
// Each box is inset 0.0015 m to allow contact and floating-point noise.
const fs = require('fs');
const path = require('path');
const { chromium } = require('D:/codexAI/tea-mart-mini-game/node_modules/playwright');

(async () => {
  const browser = await chromium.launch({
    executablePath: 'C:/Program Files/Google/Chrome/Application/chrome.exe',
    headless: true,
    args: ['--disable-gpu-vsync'],
  });
  try {
    const page = await browser.newPage({ viewport: { width: 1200, height: 800 } });
    const errors = [];
    page.on('pageerror', error => errors.push(error.message));
    const filePath = path.join(__dirname, '筑造之间-体素工地沙盘.html');
    const fileUrl = require('url').pathToFileURL(filePath).href;
    await page.goto(fileUrl);
    await page.waitForFunction(() => !!window.__sandbox);
    const data = await page.evaluate(() => {
      const S = window.__sandbox, T = window.THREE, W = S.staff.mesh.parent;
      S.state.speed = 0;
      S.scene.updateMatrixWorld(true);
      const matrix = new T.Matrix4(), wm = new T.Matrix4();
      function obb(m, id, tag) {
        const e = m.elements;
        const p = [e[12], e[13], e[14]];
        const h = [Math.hypot(e[0], e[1], e[2]) / 2, Math.hypot(e[4], e[5], e[6]) / 2, Math.hypot(e[8], e[9], e[10]) / 2];
        const a = [[e[0] / h[0] / 2, e[1] / h[0] / 2, e[2] / h[0] / 2], [e[4] / h[1] / 2, e[5] / h[1] / 2, e[6] / h[1] / 2], [e[8] / h[2] / 2, e[9] / h[2] / 2, e[10] / h[2] / 2]];
        const ext = [0, 1, 2].map(j => h.reduce((n, v, i) => n + Math.abs(a[i][j]) * v, 0));
        return { id, tag, p, h, a, min: p.map((v, i) => v - ext[i]), max: p.map((v, i) => v + ext[i]) };
      }
      const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
      function sat(a, b) {
        const v = b.p.map((n, i) => n - a.p[i]);
        const R = a.a.map(u => b.a.map(w => dot(u, w)));
        const Abs = R.map(r => r.map(x => Math.abs(x) + 1e-9));
        const t = a.a.map(u => dot(v, u));
        const ha = a.h.map(x => Math.max(.001, x - .0015)), hb = b.h.map(x => Math.max(.001, x - .0015));
        let min = Infinity;
        for (let i = 0; i < 3; i++) {
          const ra = ha[i], rb = hb.reduce((s, h, j) => s + h * Abs[i][j], 0);
          const depth = ra + rb - Math.abs(t[i]);
          if (depth <= 0) return false;
          min = Math.min(min, depth);
        }
        for (let j = 0; j < 3; j++) {
          const ra = ha.reduce((s, h, i) => s + h * Abs[i][j], 0);
          const depth = ra + hb[j] - Math.abs(t.reduce((s, x, i) => s + x * R[i][j], 0));
          if (depth <= 0) return false;
          min = Math.min(min, depth);
        }
        for (let i = 0; i < 3; i++) for (let j = 0; j < 3; j++) {
          const x = (i + 1) % 3, y = (i + 2) % 3, u = (j + 1) % 3, w = (j + 2) % 3;
          const len = Math.sqrt(Math.max(0, 1 - R[i][j] * R[i][j]));
          if (len < 1e-6) continue;
          const ra = ha[x] * Abs[y][j] + ha[y] * Abs[x][j];
          const rb = hb[u] * Abs[i][w] + hb[w] * Abs[i][u];
          const depth = ra + rb - Math.abs(t[y] * R[x][j] - t[x] * R[y][j]);
          if (depth <= 0) return false;
          min = Math.min(min, depth / len);
        }
        return min;
      }
      const statics = [], grid = new Map(), CELL = .6;
      function keys(a) {
        const k = [];
        for (let x = Math.floor(a.min[0] / CELL); x <= Math.floor(a.max[0] / CELL); x++)
          for (let z = Math.floor(a.min[2] / CELL); z <= Math.floor(a.max[2] / CELL); z++) k.push(x + ',' + z);
        return k;
      }
      W.children.filter(o => o.isInstancedMesh && o !== S.staff.mesh && o.geometry.type === 'BoxGeometry').forEach((mesh, mi) => {
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          wm.multiplyMatrices(mesh.matrixWorld, matrix);
          const a = obb(wm, statics.length, 'static' + mi + ':' + i);
          statics.push(a);
          for (const k of keys(a)) {
            if (!grid.has(k)) grid.set(k, []);
            grid.get(k).push(a.id);
          }
        }
      });
      const partToWorker = new Map();
      for (const w of S.staff.workers) for (const p of w.parts) partToWorker.set(p.index, { worker: w.id, bone: p.bone, job: w.job });
      const issues = new Map();
      let broad = 0, confirmed = 0, dynamicBoxesTested = 0;
      function test(a, t, meta) {
        dynamicBoxesTested++;
        const seen = new Set();
        for (const k of keys(a)) for (const id of grid.get(k) || []) {
          if (seen.has(id)) continue;
          seen.add(id);
          const b = statics[id];
          if (a.min.some((v, j) => v >= b.max[j] - .003 || a.max[j] <= b.min[j] + .003)) continue;
          broad++;
          const depth = sat(a, b);
          if (!depth) continue;
          confirmed++;
          const key = meta.owner + ':' + id;
          const old = issues.get(key);
          if (old && old.depth >= depth) continue;
          issues.set(key, {
            ...meta, time: t, depth, staticId: b.tag, staticCenter: b.p,
            staticSize: b.h.map(x => x * 2), partCenter: a.p, partSize: a.h.map(x => x * 2),
          });
        }
      }
      for (let sample = 0; sample < 101; sample++) {
        const t = sample * 1.483;
        S.staff.update(0, t);
        S.machines.update(0, t);
        S.scene.updateMatrixWorld(true);
        const mesh = S.staff.mesh;
        for (let i = 0; i < mesh.count; i++) {
          mesh.getMatrixAt(i, matrix);
          wm.multiplyMatrices(mesh.matrixWorld, matrix);
          const meta = partToWorker.get(i);
          test(obb(wm, i, 'worker'), t, { ...meta, owner: 'worker' + meta.worker, part: i });
        }
        S.machines.excavators.forEach((exc, ei) => {
          exc.root.traverse(o => {
            if (!o.isInstancedMesh) return;
            for (let p = o; p; p = p.parent) if (!p.visible) return;
            for (let i = 0; i < o.count; i++) {
              o.getMatrixAt(i, matrix);
              wm.multiplyMatrices(o.matrixWorld, matrix);
              test(obb(wm, i, 'excavator'), t, {
                owner: 'excavator' + ei, part: i,
                group: o.parent === exc.bucket ? 'bucket' : o.parent === exc.elbow ? 'elbow' : o.parent === exc.shoulder ? 'shoulder' : o.parent === exc.root ? 'tracks' : o.parent === exc.turret ? 'turret' : 'dirt',
              });
            }
          });
        });
      }
      return {
        staticCuboids: statics.length, workerParts: S.staff.mesh.count, samples: 101,
        simulatedTimeRange: [0, 148.3], toleranceMetres: .003, dynamicBoxesTested,
        broadPhaseHits: broad, confirmedHits: confirmed,
        issues: [...issues.values()].sort((a, b) => b.depth - a.depth),
      };
    });
    const report = {
      generatedAt: new Date().toISOString(), testedFile: filePath,
      fileModifiedAt: fs.statSync(filePath).mtime.toISOString(),
      scope: 'All articulated worker cuboids and both excavators including tracks, turret, boom, bucket and visible soil versus all direct world static cuboid instances. 101 poses; exact OBB narrow phase. Cylinders, particles, intentionally connected machine components and moving-versus-moving pairs are outside this audit.',
      pass: data.confirmedHits === 0 && errors.length === 0,
      errors, ...data,
    };
    fs.writeFileSync(path.join(__dirname, 'collision-audit-report.json'), JSON.stringify(report, null, 2));
    console.log(JSON.stringify(report, null, 2));
    process.exitCode = report.pass ? 0 : 1;
  } finally {
    await browser.close();
  }
})().catch(error => { console.error(error); process.exitCode = 1; });
