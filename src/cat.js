// Skinned, procedurally animated demon cats.
// Meshes come from tools/gen_cat.py (assets/cats.bin + cats.json).
import * as THREE from 'three';

let META = null, BLOB = null;
const GEOS = {};       // variant -> {geo, bones meta, inverses, att}
let furN = null, furH = null;
const TAU = Math.PI * 2;

export async function loadCats(base = 'assets/') {
  const [m, b] = await Promise.all([
    fetch(base + 'cats.json').then(r => r.json()),
    fetch(base + 'cats.bin').then(r => r.arrayBuffer()),
  ]);
  META = m; BLOB = b;
  const tl = new THREE.TextureLoader();
  furN = tl.load(base + 'tex/fur_n.jpg'); furH = tl.load(base + 'tex/fur_h.jpg');
  for (const t of [furN, furH]) { t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.NoColorSpace; }
  for (const k in META) GEOS[k] = buildGeo(META[k]);
}

function buildGeo(m) {
  const g = new THREE.BufferGeometry();
  g.setAttribute('position', new THREE.BufferAttribute(new Float32Array(BLOB, m.pos, m.count * 3), 3));
  const nb = new THREE.InterleavedBuffer(new Int8Array(BLOB, m.nrm, m.count * 4), 4);
  g.setAttribute('normal', new THREE.InterleavedBufferAttribute(nb, 3, 0, true));
  g.setAttribute('skinIndex', new THREE.BufferAttribute(new Uint8Array(BLOB, m.skinI, m.count * 4), 4));
  g.setAttribute('skinWeight', new THREE.BufferAttribute(new Uint8Array(BLOB, m.skinW, m.count * 4), 4, true));
  g.setAttribute('aMask', new THREE.BufferAttribute(new Uint8Array(BLOB, m.mask, m.count * 4), 4, true));
  g.setIndex(new THREE.BufferAttribute(m.index32 ? new Uint32Array(BLOB, m.ind, m.index) : new Uint16Array(BLOB, m.ind, m.index), 1));
  g.computeBoundingSphere(); g.boundingSphere.radius *= 1.4;
  // bind-pose inverses (shared by every instance of this variant)
  const bones = makeBones(m.bones);
  bones[0].updateMatrixWorld(true);
  const inverses = bones.map(b => new THREE.Matrix4().copy(b.matrixWorld).invert());
  return { geo: g, meta: m, inverses, att: m.att };
}

function makeBones(list) {
  const map = {}, out = [];
  for (const b of list) {
    const bone = new THREE.Bone(); bone.name = b.name;
    const p = b.parent ? list.find(x => x.name === b.parent).pos : [0, 0, 0];
    bone.position.set(b.pos[0] - p[0], b.pos[1] - p[1], b.pos[2] - p[2]);
    bone.userData.rest = bone.position.clone();
    if (b.parent) map[b.parent].add(bone);
    map[b.name] = bone; out.push(bone);
  }
  return out;
}

// ---------------- materials ----------------
const FUR_VERT_PARS = `
attribute vec4 aMask;
varying vec4 vMask;
varying vec3 vRest;
`;
const FUR_FRAG_PARS = `
varying vec4 vMask;
varying vec3 vRest;
uniform vec3 uDark, uBelly, uBloodCol;
uniform float uStripes, uPoints, uBlood, uFlash, uGlow, uSpots;
uniform sampler2D uFurH;
float h3(vec3 p){ p = fract(p*0.3183099+.1); p *= 17.0; return fract(p.x*p.y*p.z*(p.x+p.y+p.z)); }
float vn(vec3 x){ vec3 i=floor(x), f=fract(x); f=f*f*(3.0-2.0*f);
  return mix(mix(mix(h3(i),h3(i+vec3(1,0,0)),f.x),mix(h3(i+vec3(0,1,0)),h3(i+vec3(1,1,0)),f.x),f.y),
             mix(mix(h3(i+vec3(0,0,1)),h3(i+vec3(1,0,1)),f.x),mix(h3(i+vec3(0,1,1)),h3(i+vec3(1,1,1)),f.x),f.y),f.z); }
float fbm3(vec3 p){ float a=0.5,s=0.0; for(int i=0;i<4;i++){ s+=a*vn(p); p*=2.03; a*=0.5; } return s; }
float furTri(vec3 p, vec3 n){ vec3 w = abs(n); w = pow(w, vec3(4.0)); w /= (w.x+w.y+w.z);
  return texture2D(uFurH, p.zy).r*w.x + texture2D(uFurH, p.xz).r*w.y + texture2D(uFurH, p.xy).r*w.z; }
`;

function furMaterial(C) {
  const mat = new THREE.MeshPhysicalMaterial({
    color: new THREE.Color(C.body), roughness: C.fluffy ? 0.95 : 0.82, metalness: 0,
    sheen: 1, sheenRoughness: 0.45, sheenColor: new THREE.Color(C.body).lerp(new THREE.Color(0xffffff), 0.35).multiplyScalar(0.8),
  });
  const U = {
    uDark: { value: new THREE.Color(C.dark) }, uBelly: { value: new THREE.Color(C.belly) },
    uBloodCol: { value: new THREE.Color(0x5a0303) },
    uStripes: { value: C.stripes || 0 }, uPoints: { value: C.points ? 1 : 0 }, uSpots: { value: C.spots || 0 },
    uBlood: { value: 0 }, uFlash: { value: 0 }, uGlow: { value: 0 }, uFurH: { value: furH },
  };
  mat.userData.U = U;
  mat.onBeforeCompile = (sh) => {
    Object.assign(sh.uniforms, U);
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\n' + FUR_VERT_PARS)
      .replace('#include <begin_vertex>', '#include <begin_vertex>\n vMask = aMask; vRest = position;');
    sh.fragmentShader = sh.fragmentShader
      .replace('#include <common>', '#include <common>\n' + FUR_FRAG_PARS)
      .replace('#include <color_fragment>', `#include <color_fragment>
        vec3 rp = vRest;
        float n1 = fbm3(rp * 9.0), n2 = fbm3(rp * 23.0 + 3.1);
        vec3 base = diffuseColor.rgb;
        // tabby stripes: bands around torso/legs + forehead
        float sx = rp.z * 30.0 + rp.y * 10.0 + n1 * 2.2 + abs(rp.x) * 6.0;
        float stripe = smoothstep(0.5, 0.78, sin(sx) * 0.5 + 0.5 + (n2 - 0.5) * 0.3) * smoothstep(0.55, 0.2, vMask.x);
        base = mix(base, uDark, stripe * uStripes);
        // spots (leopard-ish rosettes) for some breeds
        float sp = smoothstep(0.62, 0.7, fbm3(rp * 14.0)); base = mix(base, uDark, sp * uSpots * (1.0 - vMask.x));
        // colour points (siamese): darker face/ears/paws/tail
        base = mix(base, uDark, smoothstep(0.25, 0.85, vMask.y + (n1 - 0.5) * 0.4) * uPoints);
        // white belly / chest / muzzle
        base = mix(base, uBelly, smoothstep(0.35, 0.75, vMask.x + (n2 - 0.5) * 0.35));
        // fur value variation + baked cavity occlusion
        float hair = furTri(rp * 6.0, normalize(vec3(0.3, 1.0, 0.2)));
        base *= 0.86 + 0.28 * n2;
        base *= mix(0.75, 1.08, hair);
        base *= mix(0.45, 1.0, vMask.w);
        // blood soaking in as the cat gets hurt
        float bl = smoothstep(1.0 - uBlood, 1.0 - uBlood + 0.08, fbm3(rp * 7.0 + 11.0) * 0.6 + n2 * 0.4 + (1.0 - vMask.w) * 0.1);
        base = mix(base, uBloodCol, bl * step(0.001, uBlood));
        diffuseColor.rgb = base;`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        roughnessFactor = mix(roughnessFactor, 0.18, bl * step(0.001, uBlood));`)
      .replace('#include <normal_fragment_maps>', `#include <normal_fragment_maps>
        { float hh = furTri(vRest * 13.0, normalize(vRest + vec3(0.0, -0.6, 0.0)));
          vec2 dH = vec2(dFdx(hh), dFdy(hh)) * 0.3;
          vec3 vSigmaX = normalize(dFdx(-vViewPosition)), vSigmaY = normalize(dFdy(-vViewPosition));
          vec3 R1 = cross(vSigmaY, normal), R2 = cross(normal, vSigmaX);
          float fDet = dot(vSigmaX, R1) * (gl_FrontFacing ? 1.0 : -1.0);
          vec3 vGrad = sign(fDet) * (dH.x * R1 + dH.y * R2);
          normal = normalize(abs(fDet) * normal - vGrad); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        totalEmissiveRadiance += vec3(1.6, 0.35, 0.3) * uFlash + vec3(1.2, 0.45, 0.05) * uGlow;
        { float rim = pow(1.0 - clamp(dot(normal, normalize(vViewPosition)), 0.0, 1.0), 3.0);
          totalEmissiveRadiance += mix(diffuseColor.rgb, vec3(1.0, 0.55, 0.35), 0.5) * rim * 0.55; }`);
  };
  mat.customProgramCacheKey = () => 'catfur1';
  return mat;
}

const eyeTexCache = {};
function eyeTexture(hex) {
  if (eyeTexCache[hex]) return eyeTexCache[hex];
  const c = document.createElement('canvas'); c.width = 128; c.height = 64; const g = c.getContext('2d');
  const col = '#' + new THREE.Color(hex).getHexString();
  g.fillStyle = '#100404'; g.fillRect(0, 0, 128, 64);
  // iris centred at u=0.25 (sphere front faces +Z)
  const cx = 32, cy = 32;
  const r = g.createRadialGradient(cx, cy, 2, cx, cy, 26);
  r.addColorStop(0, '#ffffff'); r.addColorStop(0.25, col); r.addColorStop(0.85, col); r.addColorStop(1, '#200808');
  g.fillStyle = r; g.beginPath(); g.ellipse(cx, cy, 22, 26, 0, 0, TAU); g.fill();
  g.fillStyle = '#000'; g.beginPath(); g.ellipse(cx, cy, 3.2, 20, 0, 0, TAU); g.fill();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return (eyeTexCache[hex] = t);
}

// shared small geometries
let G = null;
function geos() {
  if (G) return G;
  G = {
    eye: new THREE.SphereGeometry(1, 20, 14),
    fang: new THREE.ConeGeometry(1, 1, 8).translate(0, -0.5, 0),
    nose: new THREE.SphereGeometry(1, 10, 8),
    horn: hornGeometry(),
    box: new THREE.BoxGeometry(1, 1, 1),
    sph: new THREE.SphereGeometry(1, 12, 10),
    plate: plateGeometry(),
    spike: new THREE.ConeGeometry(1, 1, 6).translate(0, 0.5, 0),
    wing: wingGeometry(),
    crownBand: new THREE.CylinderGeometry(1, 1.05, 1, 20, 1, true),
    crownSpike: new THREE.ConeGeometry(1, 1, 4).translate(0, 0.5, 0),
    gem: new THREE.OctahedronGeometry(1),
  };
  return G;
}

function hornGeometry() {
  // curved tapered tube: sweeps up and back
  const pts = [], n = 12;
  for (let i = 0; i <= n; i++) { const t = i / n; pts.push(new THREE.Vector3(0, t * 1.0, -Math.pow(t, 2) * 0.55)); }
  const curve = new THREE.CatmullRomCurve3(pts);
  const g = new THREE.TubeGeometry(curve, 16, 1, 8, false);
  const pos = g.attributes.position, c = new THREE.Vector3();
  for (let i = 0; i < pos.count; i++) {
    const seg = Math.floor(i / 9) / 16; const p = curve.getPoint(Math.min(1, seg));
    c.fromBufferAttribute(pos, i).sub(p).multiplyScalar(0.22 * (1 - seg) + 0.01).add(p);
    pos.setXYZ(i, c.x, c.y, c.z);
  }
  g.computeVertexNormals(); return g;
}
function plateGeometry() { // curved armour plate
  const g = new THREE.CylinderGeometry(1, 1, 1, 16, 1, true, Math.PI * 0.58, Math.PI * 0.84);
  g.rotateX(Math.PI / 2); return g;
}
function wingGeometry() { // bat membrane: fan of 4 fingers
  const s = new THREE.Shape();
  s.moveTo(0, 0); s.lineTo(0.25, 0.18); s.quadraticCurveTo(0.42, 0.05, 0.55, 0.22); s.quadraticCurveTo(0.66, 0.0, 0.85, 0.12);
  s.quadraticCurveTo(0.9, -0.12, 1.0, -0.05); s.quadraticCurveTo(0.6, -0.3, 0.2, -0.32); s.quadraticCurveTo(0.1, -0.18, 0, 0);
  const g = new THREE.ShapeGeometry(s, 10); g.rotateX(-Math.PI / 2); return g;
}

const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const VARIANT = { tabby: 'base', kitten: 'base', siamese: 'lean', black: 'brute', khao: 'base', korat: 'brute', persian: 'fluffy', bat: 'lean', boss: 'fluffy', dog: 'dog' };

// ---------------- the cat object ----------------
export function makeCat(type, C, opts = {}) {
  const v = GEOS[VARIANT[type] || 'base'];
  const g = new THREE.Group(), inner = new THREE.Group();
  inner.scale.setScalar(C.s); g.add(inner);
  const bones = makeBones(v.meta.bones);
  const skeleton = new THREE.Skeleton(bones, v.inverses);
  const fur = furMaterial(C);
  const mesh = new THREE.SkinnedMesh(v.geo, fur);
  mesh.add(bones[0]); mesh.bind(skeleton, new THREE.Matrix4());
  mesh.castShadow = !opts.noShadow; mesh.receiveShadow = true;
  mesh.boundingSphere = v.geo.boundingSphere.clone();
  inner.add(mesh);
  const B = {}; bones.forEach(b => (B[b.name] = b));
  const att = v.att, Gs = geos();
  const toBone = (bn, p) => new THREE.Vector3(p[0], p[1], p[2]).sub(worldRest(bones, bn));

  // eyes (glow)
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.eye).multiplyScalar(2.4), map: eyeTexture(0xffffff) });
  const eye2Mat = C.eye2 ? new THREE.MeshBasicMaterial({ color: new THREE.Color(C.eye2).multiplyScalar(2.4), map: eyeTexture(0xffffff) }) : eyeMat;
  const eyes = [];
  for (const s of ['L', 'R']) {
    const e = new THREE.Mesh(Gs.eye, s === 'R' ? eye2Mat : eyeMat);
    const r = att.headR * 0.25;
    e.scale.set(r, r * 0.92, r * 0.7);
    e.position.copy(toBone('head', att['eye' + s]));
    e.rotation.y = (s === 'L' ? 1 : -1) * 0.45; e.rotation.x = -0.1;
    B.head.add(e); eyes.push(e);
  }
  // nose + fangs
  const noseM = new THREE.MeshStandardMaterial({ color: C.nose || 0x3a1a1c, roughness: 0.35 });
  const nose = new THREE.Mesh(Gs.nose, noseM); nose.scale.set(0.018, 0.012, 0.012); nose.position.copy(toBone('head', att.nose)); B.head.add(nose);
  const toothM = new THREE.MeshStandardMaterial({ color: 0xf4ead8, roughness: 0.3 });
  for (const s of ['L', 'R']) {
    const f = new THREE.Mesh(Gs.fang, toothM); f.scale.set(0.009, 0.045, 0.009);
    f.position.copy(toBone('head', att['fang' + s])); f.position.y += 0.01; f.rotation.x = 0.15; B.head.add(f);
  }
  const mats = [fur, eyeMat, noseM, toothM]; if (eye2Mat !== eyeMat) mats.push(eye2Mat);
  // horns
  if (C.horns) {
    const hm = new THREE.MeshStandardMaterial({ color: 0x1a0d0a, roughness: 0.35, metalness: 0.2 }); mats.push(hm);
    for (const s of ['L', 'R']) {
      const h = new THREE.Mesh(Gs.horn, hm); const k = type === 'boss' ? 0.16 : 0.1;
      h.scale.setScalar(k); h.position.copy(toBone('head', att['horn' + s]));
      h.rotation.z = (s === 'L' ? -1 : 1) * 0.55; h.rotation.x = -0.25; h.castShadow = true; B.head.add(h);
    }
  }
  // korat armour
  if (C.armor) {
    const am = new THREE.MeshStandardMaterial({ color: 0x3a3e48, metalness: 0.9, roughness: 0.3, side: THREE.DoubleSide }); mats.push(am);
    const em = new THREE.MeshStandardMaterial({ color: 0x111111, emissive: 0xff3a10, emissiveIntensity: 2.2 }); mats.push(em);
    for (const [bn, sz, y] of [['spine', [0.2, 0.34, 0.22], 0.12], ['hips', [0.18, 0.32, 0.2], 0.12], ['chest', [0.2, 0.34, 0.2], 0.14]]) {
      const p = new THREE.Mesh(Gs.plate, am); p.scale.set(sz[0] * 0.95, sz[1] * 0.62, sz[2] * 1.15); p.position.set(0, y - 0.1, 0.05); p.castShadow = true; B[bn].add(p);
      for (let i = -1; i <= 1; i++) { const sp = new THREE.Mesh(Gs.spike, am); sp.scale.set(0.022, 0.09, 0.022); sp.position.set(0, y + 0.07, 0.05 + i * 0.07); B[bn].add(sp); }
      const glow = new THREE.Mesh(Gs.box, em); glow.scale.set(0.012, 0.012, 0.16); glow.position.set(0.14, y - 0.04, 0.05); B[bn].add(glow);
      const glow2 = glow.clone(); glow2.position.x = -0.14; B[bn].add(glow2);
    }
  }
  // boss crown
  if (C.crown) {
    const gold = new THREE.MeshStandardMaterial({ color: 0xffb020, metalness: 1, roughness: 0.22, emissive: 0x3a1600 }); mats.push(gold);
    const gemM = new THREE.MeshBasicMaterial({ color: new THREE.Color(0xff1a4a).multiplyScalar(3) }); mats.push(gemM);
    const cr = new THREE.Group(); cr.position.copy(toBone('head', att.crown)); cr.position.y -= 0.02; B.head.add(cr);
    const band = new THREE.Mesh(Gs.crownBand, gold); band.scale.set(0.085, 0.05, 0.085); band.material.side = THREE.DoubleSide; cr.add(band);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const s = new THREE.Mesh(Gs.crownSpike, gold); s.scale.set(0.02, 0.07, 0.02); s.position.set(Math.cos(a) * 0.08, 0.02, Math.sin(a) * 0.08); cr.add(s); }
    const gem = new THREE.Mesh(Gs.gem, gemM); gem.scale.setScalar(0.022); gem.position.set(0, 0.0, 0.088); cr.add(gem);
  }
  // bat wings
  let wings = null;
  if (C.wings) {
    const wm = new THREE.MeshStandardMaterial({ color: 0x3a0a16, roughness: 0.7, side: THREE.DoubleSide, emissive: 0x2a0008, transparent: true, opacity: 0.94 }); mats.push(wm);
    wings = [];
    for (const sx of [1, -1]) {
      const pv = new THREE.Group(); pv.position.set(sx * 0.1, 0.1, -0.02); B.chest.add(pv);
      const w = new THREE.Mesh(Gs.wing, wm); w.scale.set(sx * 0.75, 1, 0.75); w.castShadow = true; pv.add(w); wings.push(pv);
    }
  }
  // hit boxes (follow the bones, invisible)
  const bw = { base: 1, lean: 0.86, fluffy: 1.25, brute: 1.12, dog: 0.92 }[VARIANT[type] || 'base'];
  const body = new THREE.Mesh(Gs.box, hitMat); body.scale.set(0.42 * bw, 0.42, 0.95); body.position.set(0, 0.0, 0.05); B.spine.add(body);
  const headHit = new THREE.Mesh(Gs.sph, hitMat); headHit.scale.setScalar(att.headR * 1.35); headHit.position.set(0, 0.02, 0.04); B.head.add(headHit);
  if (type === 'kitten') B.head.scale.setScalar(1.35);
  if (type === 'boss') B.head.scale.setScalar(1.15);

  const cat = {
    g, inner, mesh, body, head: headHit, hg: B.head, bones: B, wings, mats, eyeMat, eyes, U: fur.userData.U,
    phase: Math.random() * 10, gait: 0, anim: animCat, setHurt(f) { this.U.uBlood.value = f; }, setFlash(k) { this.U.uFlash.value = k; }, setGlow(k) { this.U.uGlow.value = k; }, setXray(on) { setXray(this, on); },
  };
  return cat;
}

function worldRest(bones, name) {
  // rest-pose world position of a bone (bones are fresh, so accumulate rest offsets)
  let b = bones.find(x => x.name === name); const p = new THREE.Vector3();
  while (b && b.isBone) { p.add(b.userData.rest); b = b.parent; }
  return p;
}

// ---------------- procedural animation ----------------
// o: {speed, st, lunge, stagger, air, dead, fly, t, crouch, look}
const _q = new THREE.Quaternion(), _e = new THREE.Euler();
function rot(b, x, y, z) { b.rotation.set(x, y, z); }
function animCat(dt, o) {
  const B = this.bones, s = Math.max(0.5, o.scale || 1);
  const sp = o.speed || 0;
  // gait: 0 = walk, 1 = gallop
  const targetGait = THREE.MathUtils.clamp((sp / s - 3.5) / 4, 0, 1);
  this.gait += (targetGait - this.gait) * Math.min(1, dt * 4);
  const gait = this.gait;
  const freq = (0.9 + sp / s * 0.42) * (1 - gait * 0.15);
  this.phase += dt * freq * (sp > 0.2 || o.fly ? 1 : 0.25);
  const ph = this.phase * TAU, t = o.t || 0;
  const moving = THREE.MathUtils.clamp(sp / s / 2, 0, 1);
  // reset
  for (const k in B) { const b = B[k]; b.rotation.set(0, 0, 0); b.position.copy(b.userData.rest); }
  if (o.dead) { // limp, legs out, tail flat
    rot(B.neck, 0.5, 0, 0.3); rot(B.head, 0.3, 0, 0.2);
    for (const sd of ['L', 'R']) { const k = sd === 'L' ? 1 : -1; rot(B['fUp' + sd], -0.5, 0, 0.25 * k); rot(B['bUp' + sd], 0.6, 0, 0.25 * k); rot(B['earL'], 0.6, 0, 0); }
    for (let i = 0; i < 5; i++) rot(B['tail' + i], i === 0 ? 1.2 : 0.15, 0, 0);
    return;
  }
  const walkOff = { fUpL: 0.5, fUpR: 0.0, bUpL: 0.75, bUpR: 0.25 };
  const galOff = { fUpL: 0.55, fUpR: 0.65, bUpL: 0.0, bUpR: 0.1 };
  const amp = 0.55 * moving + 0.25 * gait * moving;
  for (const leg of ['fUpL', 'fUpR', 'bUpL', 'bUpR']) {
    const off = walkOff[leg] * (1 - gait) + galOff[leg] * gait;
    const a = ph + off * TAU;
    const swing = Math.sin(a), lift = Math.max(0, Math.cos(a));
    const front = leg[0] === 'f', side = leg.slice(-1);
    if (front) {
      rot(B[leg], -swing * amp * 0.9, 0, 0);
      rot(B['fLo' + side], lift * amp * 1.3, 0, 0);
      rot(B['fPaw' + side], -lift * amp * 0.8, 0, 0);
    } else {
      rot(B[leg], -swing * amp * 0.9, 0, 0);
      rot(B['bMid' + side], -lift * amp * 0.5, 0, 0);
      rot(B['bLo' + side], lift * amp * 1.0, 0, 0);
      rot(B['bPaw' + side], -lift * amp * 0.6, 0, 0);
    }
  }
  // spine flex (gallop) + bounce
  const flex = Math.sin(ph + 0.3) * 0.22 * gait * moving;
  rot(B.hips, -flex, 0, Math.sin(ph) * 0.05 * moving * (1 - gait));
  rot(B.chest, flex * 1.2, 0, -Math.sin(ph) * 0.05 * moving * (1 - gait));
  B.root.position.y = Math.abs(Math.sin(ph)) * 0.035 * moving * (0.5 + gait);
  // head steadies + aggressive low carriage when running
  rot(B.neck, 0.18 * gait * moving - flex * 0.6, 0, 0);
  rot(B.head, -0.12 * gait * moving + Math.sin(t * 1.3) * 0.05, Math.sin(t * 0.7 + this.phase) * 0.12 * (1 - moving), 0);
  // ears back when charging / attacking
  const angry = Math.max(gait * moving, o.lunge || 0, o.crouch ? 1 : 0);
  rot(B.earL, -0.7 * angry, 0, -0.4 * angry); rot(B.earR, -0.7 * angry, 0, 0.4 * angry);
  // tail: travelling wave, raised when running
  for (let i = 0; i < 5; i++) rot(B['tail' + i], (i === 0 ? -0.35 * gait * moving + 0.15 : 0.06) + Math.sin(t * 2.2 - i * 0.7) * 0.05, Math.sin(t * (1.6 + moving * 3) - i * 0.8) * (0.18 + 0.1 * i / 4), 0);
  // attack swipe/lunge
  const L = o.lunge || 0;
  if (L > 0) {
    const k = Math.sin(L * Math.PI);
    rot(B.chest, B.chest.rotation.x + 0.25 * k, 0, 0); rot(B.neck, B.neck.rotation.x - 0.35 * k, 0, 0); rot(B.head, B.head.rotation.x - 0.2 * k, 0, 0);
    rot(B.fUpR, -1.6 * k, 0, -0.25 * k); rot(B.fLoR, -0.6 * k, 0, 0); rot(B.fPawR, -0.5 * k, 0, 0);
    B.root.position.z = 0.12 * k;
  }
  // crouch before leap (black cat) / wind-up (persian)
  if (o.crouch) {
    B.root.position.y = -0.12; rot(B.hips, -0.15, 0, 0);
    for (const sd of ['L', 'R']) { rot(B['fUp' + sd], -0.6, 0, 0); rot(B['fLo' + sd], 1.1, 0, 0); rot(B['bUp' + sd], -0.6, 0, 0); rot(B['bMid' + sd], -0.6, 0, 0); rot(B['bLo' + sd], 1.0, 0, 0); }
    rot(B.neck, -0.3, 0, 0);
  }
  if (o.air) { // leap: stretch out
    for (const sd of ['L', 'R']) { rot(B['fUp' + sd], -1.1, 0, 0); rot(B['fLo' + sd], -0.3, 0, 0); rot(B['bUp' + sd], 0.9, 0, 0); rot(B['bLo' + sd], 0.4, 0, 0); }
    rot(B.hips, 0.12, 0, 0); rot(B.neck, -0.2, 0, 0);
  }
  if (o.fly) { // tuck legs, flap
    for (const sd of ['L', 'R']) { rot(B['fUp' + sd], -0.7, 0, 0); rot(B['fLo' + sd], 1.4, 0, 0); rot(B['bUp' + sd], 0.8, 0, 0); rot(B['bLo' + sd], 0.9, 0, 0); }
    if (this.wings) this.wings.forEach((w, i) => { const f = Math.sin(t * 13 + this.phase); w.rotation.z = (i ? -1 : 1) * (0.15 + f * 0.85); w.rotation.y = (i ? 1 : -1) * 0.2; });
    B.root.position.y = Math.sin(t * 13 + this.phase + 1) * 0.04;
  } else if (this.wings) this.wings.forEach((w, i) => { w.rotation.z = (i ? -1 : 1) * 1.1; w.rotation.y = (i ? 1 : -1) * 0.6; });
  if (o.stagger) { // dazed wobble, head droop
    rot(B.neck, 0.5, 0, Math.sin(t * 9) * 0.25); rot(B.head, 0.35, Math.sin(t * 7) * 0.3, 0);
    B.root.rotation.z = Math.sin(t * 5) * 0.12;
  }
}

// see-through highlight: an additive copy of every visible mesh, drawn on top of the world
export const XRAY_MAT = new THREE.MeshBasicMaterial({ color: 0xff6a1a, transparent: true, opacity: 0.42, depthTest: false, depthWrite: false, blending: THREE.AdditiveBlending, fog: false });
export function setXray(obj, on) {
  if (!!obj._xray === on) return;
  if (on) {
    obj._xray = [];
    obj.g.traverse(m => {
      if (!m.isMesh || m._isXray || (m.material && m.material.visible === false)) return;
      let o;
      if (m.isSkinnedMesh) { o = new THREE.SkinnedMesh(m.geometry, XRAY_MAT); o.bind(m.skeleton, m.bindMatrix); }
      else o = new THREE.Mesh(m.geometry, XRAY_MAT);
      o._isXray = true; o.renderOrder = 999; o.frustumCulled = false; o.castShadow = false; m.add(o); obj._xray.push(o);
    });
  } else { for (const o of obj._xray) o.parent && o.parent.remove(o); obj._xray = null; }
}
export { VARIANT };
