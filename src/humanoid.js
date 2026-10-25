// Procedural skinned humanoids: parts are modelled from primitives, attached to bones, then merged into ONE
// SkinnedMesh per model (a draw call per material instead of one per part). Templates are cached per type;
// each instance only clones the bones and materials.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const PI = Math.PI, TAU = PI * 2;
function ribGeo(gap) { const g = new THREE.TorusGeometry(1, 0.1, 5, 18, TAU - gap); g.rotateZ(PI / 2 + gap / 2); g.rotateX(PI / 2); return g; }
function bowGeo() { const g = new THREE.TorusGeometry(0.45, 0.014, 5, 20, 1.6); g.rotateZ(-PI / 2 - 0.8); g.rotateY(PI / 2); return g; }
export const HG = {
  sph: new THREE.SphereGeometry(1, 16, 12), sphLo: new THREE.SphereGeometry(1, 9, 7),
  limb: new THREE.CapsuleGeometry(1, 4, 4, 10), cap: new THREE.CapsuleGeometry(1, 1.4, 4, 12),
  cyl: new THREE.CylinderGeometry(1, 1, 1, 14), cyl6: new THREE.CylinderGeometry(1, 1, 1, 6),
  taper: new THREE.CylinderGeometry(1, 0.72, 1, 12), cone: new THREE.ConeGeometry(1, 1, 12), cone4: new THREE.ConeGeometry(1, 1, 4),
  box: new THREE.BoxGeometry(1, 1, 1), rbox: new RoundedBoxGeometry(1, 1, 1, 2, 0.22),
  tor: new THREE.TorusGeometry(1, 0.16, 6, 20), rib: ribGeo(0.75), ring: ribGeo(0.0001),
  dome: new THREE.SphereGeometry(1, 16, 8, 0, TAU, 0, PI / 2),
  skirt: new THREE.CylinderGeometry(0.75, 1, 1, 16, 1, true),
  shield: new THREE.CylinderGeometry(1, 1, 1, 12, 1, true, -0.62, 1.24),
  bow: bowGeo(), disc: new THREE.CylinderGeometry(1, 1, 0.1, 22),
  blade: (() => { const s = new THREE.Shape(); s.moveTo(-0.5, 0); s.lineTo(0.5, 0); s.lineTo(0.42, 0.85); s.lineTo(0, 1); s.lineTo(-0.42, 0.85); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.12, bevelEnabled: false }); g.translate(0, 0, -0.06); return g; })(),
  axe: (() => { const s = new THREE.Shape(); s.moveTo(0, -0.35); s.quadraticCurveTo(0.55, -0.55, 0.85, -0.75); s.quadraticCurveTo(0.6, 0, 0.85, 0.75); s.quadraticCurveTo(0.55, 0.55, 0, 0.35); s.closePath(); const g = new THREE.ExtrudeGeometry(s, { depth: 0.06, bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.02, bevelSegments: 1 }); g.translate(0, 0, -0.03); return g; })(),
};

// ---------------------------------------------------------------- template builder
class Rig {
  constructor() { this.parts = []; this.list = []; this.root = this.b('root', null, 0, 0, 0); }
  b(name, parent, x, y, z) { const b = new THREE.Bone(); b.name = name; b.position.set(x, y, z); if (parent) parent.add(b); this.list.push(b); return b; }
  // part: geometry + material attached rigidly to a bone (pos/rot/scale in the bone's bind frame)
  p(bone, geo, mat, s, pos, rot) { this.parts.push({ bone, geo, mat, s, pos: pos || [0, 0, 0], rot: rot || [0, 0, 0] }); }
  build() {
    const root = this.root; root.updateMatrixWorld(true);
    const bones = []; root.traverse(o => { if (o.isBone) bones.push(o); });
    const idx = new Map(bones.map((b, i) => [b, i])), names = {}; bones.forEach((b, i) => names[b.name] = i);
    const byMat = new Map(); const m4 = new THREE.Matrix4(), q = new THREE.Quaternion(), e = new THREE.Euler();
    for (const pt of this.parts) {
      let g = pt.geo.clone();
      for (const k of Object.keys(g.attributes)) if (!['position', 'normal', 'uv'].includes(k)) g.deleteAttribute(k);
      if (!g.attributes.uv) g.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(g.attributes.position.count * 2), 2));
      if (!g.index) { const n = g.attributes.position.count, ix = new Uint32Array(n); for (let i = 0; i < n; i++) ix[i] = i; g.setIndex(new THREE.BufferAttribute(ix, 1)); }
      e.set(pt.rot[0], pt.rot[1], pt.rot[2], pt.rot[3] || 'XYZ'); q.setFromEuler(e);
      m4.compose(new THREE.Vector3(...pt.pos), q, new THREE.Vector3(...pt.s)).premultiply(pt.bone.matrixWorld);
      g.applyMatrix4(m4);
      const n = g.attributes.position.count, bi = idx.get(pt.bone);
      const si = new Uint16Array(n * 4), sw = new Float32Array(n * 4); for (let i = 0; i < n; i++) { si[i * 4] = bi; sw[i * 4] = 1; }
      g.setAttribute('skinIndex', new THREE.Uint16BufferAttribute(si, 4)); g.setAttribute('skinWeight', new THREE.Float32BufferAttribute(sw, 4));
      if (!byMat.has(pt.mat)) byMat.set(pt.mat, []); byMat.get(pt.mat).push(g);
    }
    const mats = [...byMat.keys()];
    const per = mats.map(m => mergeGeometries(byMat.get(m), false));
    const geo = mergeGeometries(per, true); geo.computeBoundingSphere();
    const inv = bones.map(b => b.matrixWorld.clone().invert());
    return { geo, mats, inv, root, names };
  }
}
export function makeRig() { return new Rig(); }

// standard bones for a ~1.83 m biped facing +z (its right hand is on -x)
export function bipedBones(r, o = {}) {
  const J = {}; const w = o.shoulder || 0.2, hipY = o.hipY || 0.95;
  J.hips = r.b('hips', r.root, 0, hipY, 0);
  J.spine = r.b('spine', J.hips, 0, 0.1, 0);
  J.chest = r.b('chest', J.spine, 0, 0.2, 0);
  J.neck = r.b('neck', J.chest, 0, 0.25, 0);
  J.head = r.b('head', J.neck, 0, 0.1, 0);
  J.shL = r.b('shL', J.chest, w, 0.19, 0); J.elL = r.b('elL', J.shL, 0, -0.29, 0); J.haL = r.b('haL', J.elL, 0, -0.26, 0);
  J.shR = r.b('shR', J.chest, -w, 0.19, 0); J.elR = r.b('elR', J.shR, 0, -0.29, 0); J.haR = r.b('haR', J.elR, 0, -0.26, 0);
  const leg = hipY - 0.06 - 0.05;
  J.thL = r.b('thL', J.hips, 0.1, -0.06, 0); J.knL = r.b('knL', J.thL, 0, -leg / 2, 0); J.ftL = r.b('ftL', J.knL, 0, -leg / 2, 0);
  J.thR = r.b('thR', J.hips, -0.1, -0.06, 0); J.knR = r.b('knR', J.thR, 0, -leg / 2, 0); J.ftR = r.b('ftR', J.knR, 0, -leg / 2, 0);
  J.leg = leg / 2;
  return J;
}
// limb capsule hanging from a joint
export function limb(r, bone, mat, len, rad, rad2) { r.p(bone, HG.limb, mat, [rad, len / 6, rad2 || rad], [0, -len / 2, 0]); }

// fleshy human body (skin / top / bottom / boots)
export function humanBody(r, J, m, o = {}) {
  const k = o.bulk || 1, L = J.leg;
  r.p(J.hips, HG.sph, m.bottom, [0.165 * k, 0.12, 0.12 * k], [0, -0.02, 0]);
  r.p(J.spine, HG.cap, m.top, [0.15 * k, 0.1, 0.105 * k], [0, 0.08, 0]);
  r.p(J.chest, HG.rbox, m.top, [0.37 * k, 0.32, 0.22 * k], [0, 0.07, 0]);
  r.p(J.chest, HG.sph, m.top, [0.19 * k, 0.1, 0.12 * k], [0, 0.2, 0]);                         // shoulders mass
  if (o.pecs) for (const x of [-0.08, 0.08]) r.p(J.chest, HG.sph, o.pecs, [0.09 * k, 0.07, 0.05], [x * k, 0.1, 0.09 * k]);
  r.p(J.neck, HG.cyl, m.skin, [0.055 * k, 0.12, 0.055 * k], [0, -0.02, 0]);
  // head
  r.p(J.head, HG.sph, m.skin, [0.1, 0.12, 0.11], [0, 0.1, 0.005]);
  r.p(J.head, HG.sph, m.skin, [0.075, 0.06, 0.07], [0, 0.02, 0.035]);                           // jaw
  r.p(J.head, HG.cone, m.skin, [0.022, 0.05, 0.022], [0, 0.085, 0.115], [PI / 2 + 0.3, 0, 0]);     // nose
  for (const x of [-0.1, 0.1]) r.p(J.head, HG.sph, m.skin, [0.018, 0.03, 0.012], [x, 0.09, 0.0]); // ears
  if (m.eye) for (const x of [-0.037, 0.037]) r.p(J.head, HG.sphLo, m.eye, [0.017, 0.012, 0.01], [x, 0.11, 0.098]);
  if (m.brow) for (const x of [-0.037, 0.037]) r.p(J.head, HG.box, m.brow, [0.04, 0.009, 0.012], [x, 0.135, 0.1], [0, 0, x > 0 ? -0.15 : 0.15]);
  // arms
  const am = o.bareArms ? m.skin : (m.sleeve || m.top);
  limb(r, J.shL, am, 0.3, 0.058 * k); limb(r, J.shR, am, 0.3, 0.058 * k);
  limb(r, J.elL, o.bareArms || o.shortSleeve ? m.skin : am, 0.27, 0.048 * k); limb(r, J.elR, o.bareArms || o.shortSleeve ? m.skin : am, 0.27, 0.048 * k);
  if (o.shortSleeve) { limb(r, J.shL, m.skin, 0.28, 0.05 * k); limb(r, J.shR, m.skin, 0.28, 0.05 * k); r.p(J.shL, HG.cyl, m.top, [0.068 * k, 0.14, 0.068 * k], [0, -0.06, 0]); r.p(J.shR, HG.cyl, m.top, [0.068 * k, 0.14, 0.068 * k], [0, -0.06, 0]); }
  for (const h of [J.haL, J.haR]) { r.p(h, HG.rbox, m.hand || m.skin, [0.07, 0.09, 0.045], [0, -0.05, 0.005]); r.p(h, HG.cap, m.hand || m.skin, [0.02, 0.025, 0.02], [0, -0.02, 0.035], [0.6, 0, 0]); }
  // legs
  limb(r, J.thL, m.bottom, L, 0.075 * k); limb(r, J.thR, m.bottom, L, 0.075 * k);
  limb(r, J.knL, m.leg || m.bottom, L, 0.058 * k); limb(r, J.knR, m.leg || m.bottom, L, 0.058 * k);
  for (const f of [J.ftL, J.ftR]) r.p(f, HG.rbox, m.boot, [0.1, 0.08, 0.24], [0, -0.01, 0.06]);
}
// undead skeleton body (bones + ribcage + skull)
export function skelBody(r, J, m, o = {}) {
  const L = J.leg;
  r.p(J.hips, HG.ring, m.bone, [0.13, 0.7, 0.09], [0, -0.03, 0]);
  r.p(J.hips, HG.rbox, m.bone, [0.2, 0.08, 0.08], [0, -0.06, -0.02]);
  for (let i = 0; i < 4; i++) r.p(J.spine, HG.rbox, m.bone, [0.04, 0.035, 0.04], [0, -0.06 + i * 0.065, -0.05]);
  for (let i = 0; i < 4; i++) r.p(J.chest, HG.rbox, m.bone, [0.045, 0.04, 0.045], [0, i * 0.065, -0.07]);
  for (let i = 0; i < 5; i++) r.p(J.chest, HG.rib, m.bone, [0.15 - Math.abs(i - 1.5) * 0.012, 0.25, 0.105], [0, 0.22 - i * 0.055, -0.005]);
  r.p(J.chest, HG.box, m.bone, [0.03, 0.18, 0.02], [0, 0.13, 0.1]);                           // sternum
  r.p(J.chest, HG.limb, m.bone, [0.02, 0.06, 0.02], [0, 0.25, 0], [0, 0, PI / 2]);             // collar bones
  r.p(J.neck, HG.cyl, m.bone, [0.025, 0.12, 0.025], [0, -0.02, -0.02]);
  // skull
  r.p(J.head, HG.sph, m.bone, [0.095, 0.11, 0.115], [0, 0.11, 0]);
  r.p(J.head, HG.rbox, m.bone, [0.085, 0.045, 0.075], [0, 0.03, 0.045]);                      // jaw
  for (let i = 0; i < 6; i++) r.p(J.head, HG.box, m.tooth || m.bone, [0.011, 0.016, 0.01], [-0.027 + i * 0.011, 0.058, 0.085]);
  for (const x of [-0.036, 0.036]) { r.p(J.head, HG.sph, m.dark, [0.03, 0.028, 0.02], [x, 0.11, 0.095]); if (m.eye) r.p(J.head, HG.sphLo, m.eye, [0.013, 0.013, 0.01], [x, 0.11, 0.102]); }
  r.p(J.head, HG.cone4, m.dark, [0.016, 0.03, 0.01], [0, 0.07, 0.108], [PI, 0, 0]);
  // limbs
  for (const [a, b, c] of [[J.shL, J.elL, J.haL], [J.shR, J.elR, J.haR]]) {
    limb(r, a, m.bone, 0.29, 0.024); r.p(a, HG.sphLo, m.bone, [0.04, 0.04, 0.04]);
    limb(r, b, m.bone, 0.26, 0.019, 0.026); r.p(b, HG.sphLo, m.bone, [0.032, 0.032, 0.032]);
    r.p(c, HG.rbox, m.bone, [0.06, 0.06, 0.025], [0, -0.03, 0]); for (let i = 0; i < 4; i++) r.p(c, HG.box, m.bone, [0.009, 0.06, 0.009], [-0.022 + i * 0.015, -0.085, 0.006], [0.3, 0, 0]);
  }
  for (const [a, b, c] of [[J.thL, J.knL, J.ftL], [J.thR, J.knR, J.ftR]]) {
    limb(r, a, m.bone, L, 0.03); r.p(b, HG.sphLo, m.bone, [0.042, 0.042, 0.042]);
    limb(r, b, m.bone, L, 0.024); r.p(c, HG.rbox, m.bone, [0.07, 0.04, 0.17], [0, -0.02, 0.05]);
  }
}
// helpers for gear
export function cape(r, bone, mat, w, h, y) { r.p(bone, HG.box, mat, [w, h, 0.02], [0, y - h / 2, -0.15], [0.12, 0, 0]); }

// ---------------------------------------------------------------- instancing
const _blood = new THREE.Color(0x4a0404);
export function instantiate(T) {
  const root = T.root.clone(true);
  const bones = []; root.traverse(o => { if (o.isBone) bones.push(o); });
  const skel = new THREE.Skeleton(bones, T.inv);
  const mats = T.mats.map(m => { const c = m.clone(); c.userData = Object.assign({}, m.userData); return c; });
  const mesh = new THREE.SkinnedMesh(T.geo, mats);
  mesh.add(root); mesh.bind(skel, new THREE.Matrix4());
  mesh.castShadow = true; mesh.frustumCulled = false;
  const J = {}; for (const k in T.names) J[k] = bones[T.names[k]];
  const byRole = {}; mats.forEach((m, i) => { const role = T.mats[i].userData.role; if (role) (byRole[role] = byRole[role] || []).push(m); });
  return { mesh, J, mats, byRole };
}
// enemy-facing interface (same shape as cat.js objects)
export function enemyInterface(obj, tintMats, setXray) {
  const base = tintMats.map(m => m.color.clone());
  obj.setHurt = f => { for (let i = 0; i < tintMats.length; i++) tintMats[i].color.copy(base[i]).lerp(_blood, Math.min(0.7, f * 0.7)); };
  obj.setFlash = k => { for (const m of tintMats) { if (k > 0) m.emissive.setRGB(0.9, 0.2, 0.15); else if (!obj._glow) m.emissive.copy(m.userData.em || new THREE.Color(0)); } };
  obj.setGlow = k => { obj._glow = k > 0; for (const m of tintMats) { if (k > 0) m.emissive.setRGB(0.8 * k, 0.3 * k, 0.02); else m.emissive.copy(m.userData.em || new THREE.Color(0)); } };
  obj.setXray = on => setXray(obj, on);
  return obj;
}

// ---------------------------------------------------------------- procedural animation
const lerp = (a, b, t) => a + (b - a) * t;
const _v = new THREE.Vector3(), _h = new THREE.Vector3(), _q = new THREE.Quaternion(), _q2 = new THREE.Quaternion();
// two-bone arm IK: target in the chest frame (shoulder/elbow are chest children with lengths 0.29/0.26)
export function armIK(sh, el, target, twist = 0, L1 = 0.29, L2 = 0.26) {
  _v.set(target[0] - sh.position.x, target[1] - sh.position.y, target[2] - sh.position.z);
  const d = Math.min(L1 + L2 - 0.003, Math.max(0.08, _v.length()));
  const b = PI - Math.acos(Math.max(-1, Math.min(1, (L1 * L1 + L2 * L2 - d * d) / (2 * L1 * L2))));
  _h.set(0, -L1 - L2 * Math.cos(b), L2 * Math.sin(b)).normalize(); _v.normalize();
  _q.setFromUnitVectors(_h, _v); if (twist) { _q2.setFromAxisAngle(_v, twist); _q.premultiply(_q2); }
  sh.quaternion.copy(_q); el.rotation.set(-b, 0, 0);
}
// style decides the idle arm pose and the attack motion
export function poseHuman(R, dt, o) {
  const J = R.J, st = R.st, sty = R.style; const t = (o.t || 0) + st.off;
  if (o.dead) {
    J.shL.rotation.set(-0.4, 0, 1.2); J.shR.rotation.set(-0.4, 0, -1.2); J.elL.rotation.set(-0.3, 0, 0); J.elR.rotation.set(-0.4, 0, 0);
    J.thL.rotation.set(-0.2, 0, 0.25); J.thR.rotation.set(0.1, 0, -0.2); J.knL.rotation.x = 0.4; J.knR.rotation.x = 0.2;
    J.chest.rotation.set(0.1, 0, 0); J.head.rotation.set(-0.3, 0.6, 0); J.hips.position.y = st.hy;
    if (R.extra) R.extra(R, 0, o, t);
    return;
  }
  const sp = o.speed || 0, run = Math.min(1, sp / 5);
  st.ph += dt * (2.2 + sp * 1.25);
  const s = Math.sin(st.ph), c = Math.cos(st.ph);
  const amp = 0.8 * run;
  // legs
  let thL = -s * amp, thR = s * amp, knL = Math.max(0, -c) * 1.25 * run + 0.06, knR = Math.max(0, c) * 1.25 * run + 0.06;
  let hipY = st.hy + Math.abs(c) * 0.045 * run - 0.02 * run, lean = 0.12 * run;
  // arms (idle pose by style + walk swing)
  let aL = [s * 0.5 * run, 0, 0.13], aR = [-s * 0.5 * run, 0, -0.13], eL = -0.22 - run * 0.4, eR = -0.22 - run * 0.4, wL = 0, wR = 0;
  const br = Math.sin(t * 1.7) * 0.03;
  switch (sty) {
    case 'sword': aR = [-0.25 - s * 0.15 * run, 0, -0.18]; eR = -1.15; break;
    case 'spear': case 'bident': case 'staff': aR = [-0.05 - s * 0.1 * run, 0, -0.22]; eR = -1.45; break;
    case 'bow': aL = [-1.4, -0.15, 0.05]; eL = -0.05; aR = [-1.3, 0.45, -0.1]; eR = -1.95; lean = 0.05; break;
    case 'gun': aR = [-0.75, 0.25, -0.35]; eR = -1.25; aL = [-1.0, -0.55, 0.45]; eL = -0.85; break;
    case 'claw': aL = [-0.85 + s * 0.2 * run, 0, 0.35]; eL = -0.7; aR = [-0.85 - s * 0.2 * run, 0, -0.35]; eR = -0.7; lean += 0.15; break;
    case 'axe': aR = [-0.5, 0, -0.25]; eR = -1.2; aL = [-0.7, 0, 0.3]; eL = -1.1; break;
    case 'bolt': aR = [-2.7, 0, -0.35]; eR = -0.35; aL = [-0.5, 0, 0.35]; eL = -0.6; break;
    case 'club': aR = [-0.3 - s * 0.15 * run, 0, -0.18]; eR = -1.0; break;
  }
  // attack (o.lunge: 0..1 progress of the strike)
  const p = o.lunge || 0;
  if (p > 0) {
    const a = Math.sin(p * PI);
    switch (sty) {
      case 'sword': case 'club': aR = [lerp(-2.9, -0.7, p), 0, -0.2]; eR = lerp(-1.0, -0.15, p); lean += a * 0.35; break;
      case 'spear': case 'bident': case 'staff': aR = [lerp(-0.4, -1.45, a), 0, -0.15]; eR = lerp(-1.45, -0.05, a); wR = 1.45 * a; lean += a * 0.25; break;
      case 'bow': eR = -1.95 + a * 1.3; break;
      case 'claw': aL = [lerp(-2.6, -0.4, p), 0, 0.3]; aR = [lerp(-2.6, -0.4, p), 0, -0.3]; eL = eR = -0.3; lean += a * 0.4; break;
      case 'axe': aR = [lerp(-3.0, -0.6, p), 0, -0.1]; aL = [lerp(-2.8, -0.6, p), 0, 0.1]; eR = eL = -0.4; lean += a * 0.45; break;
      case 'bolt': aR = [lerp(-2.9, -1.4, a), 0, -0.2]; eR = -0.1; break;
      case 'gun': aR[0] -= a * 0.2; break;
    }
  }
  if (o.crouch) { hipY -= 0.18; thL = thR = -0.8; knL = knR = 1.4; lean += 0.45; }
  if (o.air) { thL = -1.1; thR = -0.5; knL = 1.6; knR = 1.0; }
  if (o.fly) { thL = 0.15 + Math.sin(t * 3) * 0.1; thR = 0.25 + Math.sin(t * 3 + 1) * 0.1; knL = 0.5; knR = 0.7; hipY = st.hy; }
  if (o.stagger) {
    const w = Math.sin(t * 9) * 0.12; lean = 0.45 + w; aL = [0.2, 0, 0.35]; aR = [0.15, 0, -0.35]; eL = eR = -0.1; knL = knR = 0.5; hipY -= 0.12;
    J.head.rotation.set(0.6, Math.sin(t * 5) * 0.4, w);
  } else J.head.rotation.set(-lean * 0.6 + Math.sin(t * 0.7) * 0.05, Math.sin(t * 0.5) * 0.15, 0);
  J.thL.rotation.set(thL, 0, 0.03); J.thR.rotation.set(thR, 0, -0.03); J.knL.rotation.x = knL; J.knR.rotation.x = knR;
  J.ftL.rotation.x = -knL * 0.35 - thL * 0.3; J.ftR.rotation.x = -knR * 0.35 - thR * 0.3;
  J.hips.position.y = hipY; J.hips.rotation.y = s * 0.08 * run;
  J.spine.rotation.set(lean * 0.5, -s * 0.08 * run, 0); J.chest.rotation.set(lean * 0.5 + br, -s * 0.06 * run, 0);
  J.shL.rotation.set(aL[0], aL[1], aL[2]); J.shR.rotation.set(aR[0], aR[1], aR[2]);
  J.elL.rotation.set(eL, 0, 0); J.elR.rotation.set(eR, 0, 0); J.haL.rotation.set(wL, 0, 0); J.haR.rotation.set(wR, 0, 0);
  if (o.hit > 0.01 && !o.stagger) { const h = o.hit, sd = o.hitSide || 1; J.chest.rotation.x -= 0.4 * h; J.spine.rotation.x -= 0.15 * h; J.chest.rotation.z += 0.18 * h * sd; J.head.rotation.x -= 0.35 * h; J.head.rotation.z += 0.2 * h * sd; J.shL.rotation.z += 0.3 * h; J.shR.rotation.z -= 0.3 * h; J.hips.position.y -= 0.03 * h; }
  if (R.ik && !o.stagger) { const k = (o.aim || 0); armIK(J.shR, J.elR, R.ik.R, -0.5); armIK(J.shL, J.elL, R.ik.L, 0.7); J.haR.rotation.set(0.3, 0, 0); J.haL.rotation.set(0.2, 0, 0); J.chest.rotation.x -= k * 0.25; }
  if (R.extra) R.extra(R, dt, o, t);
}
