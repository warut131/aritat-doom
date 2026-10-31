// Level 3 "Yokai Shrine": oni, skeleton samurai, ninja, kitsune shrine maiden, crow tengu, kasa-obake
// and three bosses (Shuten-doji the oni king, Raijin the thunder god, Tamamo the nine-tailed fox).
import * as THREE from 'three';
import { HG, makeRig, bipedBones, humanBody, skelBody, cape, enemyInterface } from './humanoid.js';
import { defineModel } from './roman.js';
import { setXray } from './cat.js';

const PI = Math.PI, TAU = PI * 2;
const std = (c, r = 0.7, m = 0, o = {}) => new THREE.MeshStandardMaterial(Object.assign({ color: c, roughness: r, metalness: m }, o));
const glow = (c, k = 3) => new THREE.MeshBasicMaterial({ color: new THREE.Color(c).multiplyScalar(k) });
const role = (m, r, em) => { m.userData.role = r; if (em !== undefined) { m.emissive = new THREE.Color(em); m.userData.em = new THREE.Color(em); } return m; };
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const texCache = {};
function glowTex(rgb) {
  if (texCache[rgb]) return texCache[rgb];
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, `rgba(${rgb},0.9)`); r.addColorStop(0.35, `rgba(${rgb},0.35)`); r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return (texCache[rgb] = t);
}
function sprite(rgb, sx, sy, op = 0.7) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: op })); s.scale.set(sx, sy, 1); return s; }

// ---------------- shared gear ----------------
function horns(r, J, mat, len = 0.16, spread = 0.07, tilt = 0.35) {
  for (const s of [-1, 1]) { r.p(J.head, HG.cone, mat, [0.032, len, 0.032], [s * spread, 0.23, 0.04], [0.2, 0, -s * tilt]); r.p(J.head, HG.cone, mat, [0.022, len * 0.55, 0.022], [s * (spread + Math.sin(tilt) * len * 0.9), 0.23 + len * 0.82, 0.07], [0.6, 0, -s * tilt * 0.2]); }
}
function wildHair(r, J, mat, n = 12) { r.p(J.head, HG.sph, mat, [0.112, 0.1, 0.12], [0, 0.15, -0.02]); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; if (Math.cos(a) > 0.6) continue; r.p(J.head, HG.cone, mat, [0.04, 0.2, 0.03], [Math.sin(a) * 0.09, 0.1, Math.cos(a) * 0.09 - 0.03], [PI - 0.6 * Math.cos(a) * 0.6, 0, 0.5 * Math.sin(a)]); } }
function tusks(r, J, mat) { for (const s of [-1, 1]) r.p(J.head, HG.cone, mat, [0.013, 0.05, 0.013], [s * 0.03, 0.045, 0.105], [0, 0, 0]); }
function tigerSkirt(r, J, y = 0.32) {
  const yel = std(0xd89a2a, 0.8, 0, { side: THREE.DoubleSide }), blk = std(0x120c08, 0.8);
  r.p(J.hips, HG.skirt, yel, [0.19, y, 0.16], [0, -0.13, 0]);
  for (let i = 0; i < 10; i++) { const a = (i / 10) * TAU; r.p(J.hips, HG.box, blk, [0.02, y * 0.75, 0.012], [Math.sin(a) * 0.168, -0.13, Math.cos(a) * 0.14], [0.08, a, 0.25 * ((i % 2) * 2 - 1)]); }
}
function kanabo(r, hand, M, len = 1.25) {   // studded iron club along +z
  r.p(hand, HG.cyl, M.wood, [0.026, 0.3, 0.026], [0, -0.06, 0.05], [PI / 2, 0, 0]);
  r.p(hand, HG.cyl6, M.iron, [0.06, len, 0.06], [0, -0.06, 0.2 + len / 2], [PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) for (let k = 0; k < 6; k++) { const a = k / 6 * TAU + i * 0.5; r.p(hand, HG.cone4, M.stud, [0.018, 0.05, 0.018], [Math.cos(a) * 0.065, -0.06 + Math.sin(a) * 0.065, 0.35 + i * len / 6.5], [0, 0, a - PI / 2]); }
}
function katana(r, hand, M, len = 0.9) {
  r.p(hand, HG.cyl, M.wrap, [0.016, 0.24, 0.016], [0, -0.05, 0.02], [PI / 2, 0, 0]);
  r.p(hand, HG.disc, M.gold, [0.05, 0.25, 0.04], [0, -0.05, 0.14], [PI / 2, 0, 0]);
  r.p(hand, HG.box, M.steel, [0.008, 0.032, len], [0, -0.05, 0.15 + len / 2], [0.04, 0, 0]);
  r.p(hand, HG.cone4, M.steel, [0.016, 0.07, 0.006], [0, -0.042, 0.16 + len], [PI / 2, 0, 0]);
}
function featherWings(r, J, mat, span = 7) {
  J.wL = r.b('wL', J.chest, 0.07, 0.2, -0.1); J.wR = r.b('wR', J.chest, -0.07, 0.2, -0.1);
  for (const [b, s] of [[J.wL, 1], [J.wR, -1]]) {
    r.p(b, HG.limb, mat, [0.035, 0.12, 0.035], [s * 0.35, 0, 0], [0, 0, PI / 2]);
    for (let i = 0; i < span; i++) r.p(b, HG.box, mat, [0.13, 0.015, 0.66 - i * 0.05], [s * (0.08 + i * 0.12), 0.02, -0.28 + i * 0.015], [0.25, s * (0.12 + i * 0.06), 0]);
  }
}
function foxTails(r, J, n, mat, tip, len = 0.55) {
  J.tails = [];
  for (let i = 0; i < n; i++) { const a = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2.2; const b = r.b('tail' + i, J.hips, Math.sin(a) * 0.06, -0.02, -0.12); J.tails.push(b);
    r.p(b, HG.cap, mat, [0.07, len * 0.45, 0.07], [0, len * 0.42, 0], [0, 0, 0]); r.p(b, HG.cone, tip, [0.07, 0.22, 0.07], [0, len * 0.42 + len * 0.62, 0]); b.userData.a = a; }
}
const wingFlap = (R, o, t, k = 13) => { const f = o.dead ? 0.6 : Math.sin(t * k) * 0.75 + 0.15; R.J.wL.rotation.set(0, -0.2, f); R.J.wR.rotation.set(0, 0.2, -f); };
const tailsOf = R => { if (!R._tails) { R._tails = []; for (let i = 0; R.J['tail' + i]; i++) R._tails.push(R.J['tail' + i]); const n = R._tails.length; R._tails.forEach((b, i) => b.userData.a = n === 1 ? 0 : (i / (n - 1) - 0.5) * 2.2); } return R._tails; };
const tailSway = (R, o, t, up = 1.1) => { for (const b of tailsOf(R)) { const a = b.userData.a; b.rotation.set(-up + Math.abs(a) * 0.18 + Math.sin(t * 2.1 + a * 2) * 0.12, 0, a * 0.62 + Math.sin(t * 1.6 + a * 3) * 0.16); if (o.dead) b.rotation.set(-0.2, 0, a * 0.9); } };

// ---------------- enemies ----------------
defineModel('oni', {
  style: 'club', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.24 });
    const skin = role(std(0xb8301c, 0.62, 0, { emissive: 0x1a0402 }), 'tint', 0x1a0402);
    const M = { skin, top: skin, bottom: skin, leg: skin, boot: std(0x5a3a22, 0.8), eye: glow(0xffe23a, 4), brow: std(0x0a0606, 1),
      hair: std(0x14100e, 0.7), horn: std(0xe8dcc0, 0.4), wood: std(0x3a2414, 0.6), iron: std(0x34363c, 0.45, 0.9), stud: std(0x8a8c94, 0.3, 1), tooth: std(0xf0e8d0, 0.4) };
    humanBody(r, J, M, { bulk: 1.3, bareArms: true, pecs: skin });
    r.p(J.chest, HG.sph, skin, [0.16, 0.1, 0.08], [0, -0.06, 0.08]);                                   // belly
    wildHair(r, J, M.hair, 13); horns(r, J, M.horn, 0.16, 0.06, 0.3); tusks(r, J, M.tooth);
    r.p(J.head, HG.box, M.brow, [0.15, 0.025, 0.03], [0, 0.135, 0.1]);
    tigerSkirt(r, J);
    for (const e of [J.elL, J.elR]) r.p(e, HG.ring, std(0xb89a3a, 0.3, 1), [0.06, 0.6, 0.06], [0, -0.2, 0]);
    kanabo(r, J.haR, M, 1.15);
    return r;
  } });
defineModel('samurai', {
  style: 'sword', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.21 });
    const lac = role(std(0x1a0c0c, 0.35, 0.1), 'tint'), red = role(std(0x8a1410, 0.45, 0.05), 'tint');
    const M = { bone: role(std(0xd2c8b0, 0.72), 'tint'), dark: std(0x050303, 1), eye: glow(0xff3a2a, 4), tooth: std(0xc8b890, 0.5),
      lac, red, gold: std(0xffc04a, 0.28, 1), steel: std(0xd8dce4, 0.18, 1), wrap: std(0x2a2440, 0.8), cord: std(0xc8a040, 0.7) };
    skelBody(r, J, M);
    for (let i = 0; i < 4; i++) r.p(J.chest, HG.ring, i % 2 ? M.red : M.lac, [0.19 - i * 0.005, 0.7, 0.14], [0, 0.24 - i * 0.065, 0]);   // do
    for (const [b, s] of [[J.shL, 1], [J.shR, -1]]) for (let i = 0; i < 4; i++) r.p(b, HG.box, i % 2 ? M.red : M.lac, [0.15, 0.04, 0.14], [s * 0.04, -0.02 - i * 0.045, 0], [0, 0, s * -0.25]);   // sode
    for (let i = 0; i < 6; i++) { const a = -1.2 + i * 0.48; for (let k = 0; k < 3; k++) r.p(J.hips, HG.box, k % 2 ? M.red : M.lac, [0.1, 0.05, 0.015], [Math.sin(a) * 0.17, -0.05 - k * 0.055, Math.cos(a) * 0.14], [0.15, a, 0]); }  // kusazuri
    for (let i = 0; i < 6; i++) r.p(J.chest, HG.box, M.cord, [0.18, 0.006, 0.006], [0, 0.26 - i * 0.04, 0.142]);
    // kabuto with kuwagata crest
    r.p(J.head, HG.dome, M.lac, [0.13, 0.12, 0.14], [0, 0.135, -0.01]);
    for (let i = 0; i < 3; i++) r.p(J.head, HG.ring, M.lac, [0.15 + i * 0.012, 0.6, 0.15 + i * 0.012], [0, 0.11 - i * 0.04, -0.03]);
    for (const s of [-1, 1]) { r.p(J.head, HG.box, M.gold, [0.018, 0.22, 0.01], [s * 0.06, 0.3, 0.1], [0, 0, -s * 0.35]); r.p(J.head, HG.box, M.lac, [0.07, 0.06, 0.02], [s * 0.15, 0.15, 0.06], [0, s * 0.6, s * 0.3]); }
    r.p(J.head, HG.sph, M.gold, [0.03, 0.03, 0.02], [0, 0.2, 0.125]);
    r.p(J.head, HG.box, M.red, [0.15, 0.06, 0.03], [0, 0.04, 0.1]);                                  // menpo
    for (const k of [J.knL, J.knR]) r.p(k, HG.taper, M.lac, [0.05, 0.26, 0.045], [0, -0.18, 0.012]);
    katana(r, J.haR, M, 0.95);
    r.p(J.hips, HG.cyl, M.lac, [0.02, 0.7, 0.02], [0.17, -0.05, -0.08], [1.2, 0, 0.3]);               // saya
    return r;
  } });
defineModel('ninja', {
  style: 'throw', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.19 });
    const blk = role(std(0x14141a, 0.85), 'tint');
    const M = { skin: std(0xc8946a, 0.6), top: blk, bottom: blk, leg: blk, sleeve: blk, boot: std(0x0a0a0c, 0.7), hand: blk, eye: glow(0xff2a2a, 4), brow: std(0x0a0a0a, 1),
      red: std(0xa01418, 0.8, 0, { side: THREE.DoubleSide }), steel: std(0xc8ccd4, 0.2, 1), wrap: std(0x2a2a2a, 0.8), gold: std(0x8a8a8a, 0.4, 1) };
    humanBody(r, J, { ...M, skin: blk }, { bulk: 0.95 });
    r.p(J.head, HG.box, M.skin, [0.16, 0.035, 0.03], [0, 0.112, 0.092]);                              // eye slit
    for (const x of [-0.037, 0.037]) r.p(J.head, HG.sphLo, M.eye, [0.014, 0.01, 0.008], [x, 0.112, 0.106]);
    r.p(J.head, HG.ring, M.red, [0.112, 0.25, 0.118], [0, 0.16, 0]);
    for (const s of [-1, 1]) r.p(J.head, HG.box, M.red, [0.03, 0.22, 0.008], [s * 0.03, 0.08, -0.12], [0.3, 0, s * 0.3]);
    r.p(J.neck, HG.ring, M.red, [0.08, 0.7, 0.08], [0, 0, 0]);
    r.p(J.chest, HG.box, M.red, [0.08, 0.5, 0.01], [0.05, -0.1, -0.13], [0.15, 0, 0.15]);               // scarf tail
    r.p(J.chest, HG.box, M.wrap, [0.03, 0.62, 0.03], [0, 0.05, -0.13], [0, 0, 0.7]);                     // ninjato on the back
    r.p(J.chest, HG.box, M.steel, [0.01, 0.3, 0.025], [-0.17, 0.3, -0.13], [0, 0, 0.7]);
    for (let i = 0; i < 4; i++) r.p(J.haR, HG.box, M.steel, [0.09, 0.012, 0.025], [0, -0.1, 0.02], [0, i * PI / 4, 0]);  // shuriken in hand
    return r;
  } });
defineModel('kitsune', {
  style: 'staff', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.18 });
    const white = role(std(0xf2eee8, 0.85, 0, { side: THREE.DoubleSide }), 'tint'), red = role(std(0xc0181a, 0.8, 0, { side: THREE.DoubleSide }), 'tint');
    const M = { skin: std(0xf0dccc, 0.6), top: white, bottom: red, leg: red, boot: std(0xf8f8f8, 0.7), eye: glow(0xffa020, 4), brow: std(0x0a0a0a, 1),
      hair: std(0x0c0a0c, 0.5), mask: std(0xfaf6f0, 0.4), paint: std(0xd01a1a, 0.6), fur: role(std(0xf0b060, 0.9), 'tint'), tip: std(0xfaf8f4, 0.9), wood: std(0xe8dcb8, 0.6), paper: std(0xffffff, 0.8, 0, { side: THREE.DoubleSide }) };
    humanBody(r, J, M, { bulk: 0.9 });
    r.p(J.hips, HG.skirt, red, [0.22, 0.85, 0.2], [0, -0.42, 0]);                                         // hakama
    for (const s of [-1, 1]) r.p(s > 0 ? J.elL : J.elR, HG.box, white, [0.16, 0.26, 0.05], [s * 0.02, -0.12, 0]);  // sleeves
    // fox mask
    r.p(J.head, HG.sph, M.mask, [0.1, 0.11, 0.06], [0, 0.11, 0.07]);
    r.p(J.head, HG.cone, M.mask, [0.045, 0.1, 0.04], [0, 0.07, 0.16], [PI / 2 + 0.25, 0, 0]);
    for (const s of [-1, 1]) { r.p(J.head, HG.cone, M.mask, [0.035, 0.1, 0.025], [s * 0.065, 0.24, 0.05], [0, 0, -s * 0.25]); r.p(J.head, HG.box, M.paint, [0.04, 0.008, 0.01], [s * 0.04, 0.13, 0.13], [0, 0, s * 0.4]); r.p(J.head, HG.sphLo, M.eye, [0.012, 0.008, 0.006], [s * 0.035, 0.115, 0.13]); }
    r.p(J.head, HG.sph, M.hair, [0.11, 0.12, 0.115], [0, 0.13, -0.025]);
    r.p(J.head, HG.box, M.hair, [0.16, 0.5, 0.04], [0, -0.12, -0.09], [0.1, 0, 0]);                         // long hair
    foxTails(r, J, 3, M.fur, M.tip, 0.55);
    // gohei: wand with zig-zag paper streamers
    r.p(J.haR, HG.cyl, M.wood, [0.012, 0.75, 0.012], [0, -0.06, 0.25], [PI / 2, 0, 0]);
    for (let i = 0; i < 4; i++) r.p(J.haR, HG.box, M.paper, [0.06, 0.09, 0.004], [(i % 2 ? 0.03 : -0.03), -0.1 - i * 0.06, 0.62], [0, 0, (i % 2 ? 0.3 : -0.3)]);
    return r;
  },
  inst(R) { const a = sprite('255,170,60', 0.6, 0.6, 0.8); a.position.set(0, -0.06, 0.62); R.J.haR.add(a); },
  extra(R, dt, o, t) { tailSway(R, o, t, 0.6); } });
defineModel('tengu', {
  style: 'claw', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.18 });
    const feath = role(std(0x14141c, 0.9, 0, { side: THREE.DoubleSide }), 'tint'), robe = role(std(0x3a4a6a, 0.85), 'tint');
    const M = { skin: feath, top: robe, bottom: robe, leg: std(0xc8a040, 0.6), boot: std(0x2a1a10, 0.6), eye: glow(0xffd23f, 4), brow: std(0x050505, 1), beak: std(0x2a2420, 0.4), red: std(0xb01a1a, 0.7) };
    humanBody(r, J, M, { bulk: 0.9 });
    r.p(J.head, HG.sph, feath, [0.11, 0.12, 0.12], [0, 0.12, 0]);
    r.p(J.head, HG.cone, M.beak, [0.04, 0.16, 0.03], [0, 0.08, 0.17], [PI / 2 + 0.2, 0, 0]);
    r.p(J.head, HG.box, M.red, [0.08, 0.06, 0.08], [0, 0.26, 0.02]);                                         // tokin hat
    r.p(J.chest, HG.sph, feath, [0.18, 0.12, 0.12], [0, 0.2, -0.02]);
    for (let i = 0; i < 6; i++) r.p(J.chest, HG.sph, M.red, [0.02, 0.02, 0.02], [-0.08 + i * 0.03, 0.06, 0.12]);   // prayer beads
    featherWings(r, J, feath, 8);
    for (const h of [J.haL, J.haR]) for (let i = 0; i < 3; i++) r.p(h, HG.cone, M.beak, [0.01, 0.08, 0.01], [-0.02 + i * 0.02, -0.12, 0.02], [PI + 0.3, 0, 0]);
    return r;
  },
  extra(R, dt, o, t) { wingFlap(R, o, t, 11); } });
// ---------------- bosses ----------------
defineModel('oniking', {
  style: 'club', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.25 });
    const skin = role(std(0x2a3a8a, 0.58, 0, { emissive: 0x060a20 }), 'tint', 0x060a20), gold = role(std(0xc8963a, 0.3, 1), 'tint');
    const M = { skin, top: skin, bottom: skin, leg: skin, boot: std(0x1a1210, 0.8), eye: glow(0xff3a10, 5), brow: std(0x0a0606, 1),
      hair: std(0xe8e4dc, 0.7), horn: std(0xffe8b0, 0.35), wood: std(0x3a2414, 0.6), iron: std(0x1a1c22, 0.4, 0.9), stud: std(0xffc860, 0.3, 1), tooth: std(0xf0e8d0, 0.4), gold: std(0xffc860, 0.25, 1), rope: std(0xd8c088, 0.8) };
    humanBody(r, J, M, { bulk: 1.4, bareArms: true, pecs: skin });
    wildHair(r, J, M.hair, 15); horns(r, J, M.horn, 0.24, 0.07, 0.4); tusks(r, J, M.tooth);
    tigerSkirt(r, J, 0.38);
    r.p(J.chest, HG.ring, gold, [0.24, 0.9, 0.17], [0, 0.18, 0]); for (const [b, s] of [[J.shL, 1], [J.shR, -1]]) r.p(b, HG.dome, gold, [0.11, 0.09, 0.11], [s * 0.02, 0.01, 0], [0, 0, -s * 0.6]);
    r.p(J.hips, HG.tor, M.rope, [0.2, 0.17, 0.4], [0, 0.05, 0], [PI / 2, 0, 0]);
    r.p(J.hips, HG.sph, std(0xc8a050, 0.6), [0.07, 0.11, 0.07], [0.19, -0.06, 0.05]);                   // sake gourd
    kanabo(r, J.haR, M, 1.5);
    return r;
  },
  inst(R) { const a = sprite('255,80,30', 1.8, 2.6, 0.35); a.position.y = 0.1; R.J.chest.add(a); } });
defineModel('raijin', {
  style: 'bolt', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.23 });
    const skin = role(std(0x3a8a6a, 0.55, 0, { emissive: 0x041a10 }), 'tint', 0x041a10);
    const M = { skin, top: skin, bottom: role(std(0xe8e4dc, 0.85, 0, { side: THREE.DoubleSide }), 'tint'), leg: skin, boot: std(0x1a1210, 0.8), eye: glow(0x8ae8ff, 5), brow: std(0x0a0606, 1),
      hair: std(0x1a1414, 0.7), horn: std(0xe8dcc0, 0.4), drum: std(0x8a1a12, 0.5), skin2: std(0xe8dcc0, 0.6), gold: std(0xffc860, 0.25, 1), bolt: glow(0x8ae8ff, 4), tooth: std(0xf0e8d0, 0.4) };
    humanBody(r, J, M, { bulk: 1.25, bareArms: true, pecs: skin });
    wildHair(r, J, M.hair, 14); horns(r, J, M.horn, 0.14, 0.05, 0.25); tusks(r, J, M.tooth);
    r.p(J.hips, HG.skirt, M.bottom, [0.22, 0.4, 0.18], [0, -0.14, 0]);
    // ring of taiko drums behind the shoulders
    r.p(J.chest, HG.tor, M.gold, [0.62, 0.62, 0.35], [0, 0.25, -0.22]);
    for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; r.p(J.chest, HG.cyl, M.drum, [0.1, 0.1, 0.1], [Math.cos(a) * 0.62, 0.25 + Math.sin(a) * 0.62, -0.22], [PI / 2, 0, 0]); r.p(J.chest, HG.disc, M.skin2, [0.09, 0.3, 0.09], [Math.cos(a) * 0.62, 0.25 + Math.sin(a) * 0.62, -0.165], [PI / 2, 0, 0]); r.p(J.chest, HG.sph, M.gold, [0.025, 0.025, 0.01], [Math.cos(a) * 0.62, 0.25 + Math.sin(a) * 0.62, -0.155]); }
    const segs = [[0.25, 0.4], [0.12, -0.5], [-0.02, 0.5], [-0.16, -0.5], [-0.3, 0.45]];
    for (const [y, a] of segs) r.p(J.haR, HG.box, M.bolt, [0.04, 0.16, 0.04], [Math.sin(a) * 0.04, y - 0.05, 0.02], [0, 0, a]);
    return r;
  },
  inst(R) { const a = sprite('120,230,255', 2.4, 3.0, 0.4); a.position.y = 0.2; R.J.chest.add(a); const h = sprite('170,240,255', 0.9, 0.9, 0.9); h.position.y = -0.1; R.J.haR.add(h); R.boltGlow = h; },
  extra(R, dt, o, t) { if (R.boltGlow) R.boltGlow.material.opacity = 0.6 + Math.sin(t * 25) * 0.3; } });
defineModel('tamamo', {
  style: 'staff', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.19 });
    const robe = role(std(0x3a1a5a, 0.75, 0, { side: THREE.DoubleSide }), 'tint'), gold = std(0xffc860, 0.25, 1);
    const M = { skin: std(0xf4e4d8, 0.55), top: robe, bottom: robe, leg: robe, sleeve: robe, boot: std(0x1a0a14, 0.6), eye: glow(0xffb020, 5), brow: std(0x1a1a1a, 1),
      hair: std(0xf2e8d0, 0.5), fur: role(std(0xf4c070, 0.9, 0, { emissive: 0x3a1a00 }), 'tint', 0x3a1a00), tip: glow(0xfff0c0, 2.2), gold, obi: std(0xd0a020, 0.4, 0.6), wood: std(0x1a1014, 0.5) };
    humanBody(r, J, M, { bulk: 1.0 });
    r.p(J.hips, HG.skirt, robe, [0.26, 0.95, 0.24], [0, -0.45, 0]);
    r.p(J.chest, HG.ring, M.obi, [0.2, 1.4, 0.15], [0, -0.05, 0]);
    for (const s of [-1, 1]) r.p(s > 0 ? J.elL : J.elR, HG.box, robe, [0.22, 0.32, 0.06], [s * 0.04, -0.18, 0]);   // wide sleeves
    r.p(J.head, HG.sph, M.hair, [0.112, 0.12, 0.12], [0, 0.13, -0.025]); r.p(J.head, HG.box, M.hair, [0.2, 0.6, 0.05], [0, -0.15, -0.1], [0.1, 0, 0]);
    for (const s of [-1, 1]) { r.p(J.head, HG.cone, M.fur, [0.045, 0.14, 0.03], [s * 0.075, 0.27, 0.0], [0, 0, -s * 0.2]); }
    for (let i = 0; i < 5; i++) r.p(J.head, HG.box, gold, [0.01, 0.07, 0.01], [-0.06 + i * 0.03, 0.27, 0.06], [0.3, 0, (i - 2) * 0.2]);   // kanzashi
    foxTails(r, J, 9, M.fur, M.tip, 0.85);
    r.p(J.haR, HG.cyl, M.wood, [0.018, 1.6, 0.018], [0, -0.06, 0.4], [PI / 2, 0, 0]);
    r.p(J.haR, HG.tor, gold, [0.09, 0.09, 0.09], [0, -0.06, 1.22], [0, PI / 2, 0]);
    return r;
  },
  inst(R) { const a = sprite('255,160,40', 2.4, 3.4, 0.4); a.position.y = 0.1; R.J.chest.add(a); const f = sprite('120,200,255', 0.7, 0.7, 0.95); f.position.set(0, -0.06, 1.22); R.J.haR.add(f);
    for (let i = 0; R.J['tail' + i]; i++) { const s = sprite('255,200,120', 0.35, 0.35, 0.8); s.position.y = 0.9; R.J['tail' + i].add(s); } },
  extra(R, dt, o, t) { tailSway(R, o, t, 0.7); } });

// ---------------- kasa-obake: a hopping one-eyed paper umbrella (no rig) ----------------
export function buildKasa(C) {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(C.s); g.add(inner);
  const paper = std(C.body, 0.75, 0, { side: THREE.DoubleSide, emissive: 0x0a0204 }); paper.userData.em = new THREE.Color(0x0a0204);
  const rib = std(0x2a1a10, 0.6), wood = std(0x6a4a2a, 0.7), white = std(0xf8f4ee, 0.4), pupil = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.eye).multiplyScalar(2.5) }), tongue = std(0xd0405a, 0.35);
  const body = new THREE.Group(); body.position.y = 0.9; inner.add(body);
  const add = (p, geo, mat, s, pos, rot) => { const m = new THREE.Mesh(geo, mat); m.scale.set(...s); m.position.set(...pos); if (rot) m.rotation.set(...rot); m.castShadow = true; p.add(m); return m; };
  add(body, new THREE.ConeGeometry(1, 1, 16, 1, true), paper, [0.62, 0.8, 0.62], [0, 0.2, 0]);
  add(body, new THREE.TorusGeometry(0.62, 0.018, 4, 24), rib, [1, 1, 1], [0, -0.2, 0], [PI / 2, 0, 0]);
  for (let i = 0; i < 8; i++) { const a = i / 8 * TAU; add(body, HG.box, rib, [0.012, 1.0, 0.012], [Math.sin(a) * 0.31, 0.2, Math.cos(a) * 0.31], [Math.cos(a) * -0.66, 0, Math.sin(a) * 0.66]); }
  add(body, HG.sph, rib, [0.05, 0.05, 0.05], [0, 0.62, 0]);
  add(body, HG.sph, white, [0.16, 0.18, 0.08], [0, 0.12, 0.33], [-0.3, 0, 0]);
  const eye = add(body, HG.sph, pupil, [0.07, 0.08, 0.04], [0, 0.12, 0.38], [-0.3, 0, 0]);
  const tg = add(body, HG.box, tongue, [0.08, 0.36, 0.02], [0, -0.15, 0.34], [-0.15, 0, 0]);
  const leg = new THREE.Group(); leg.position.y = -0.2; body.add(leg);
  add(leg, HG.cyl, wood, [0.03, 0.75, 0.03], [0, -0.35, 0]);
  add(leg, HG.box, wood, [0.12, 0.05, 0.26], [0, -0.74, 0.03]);                                       // geta
  for (const z of [-0.07, 0.11]) add(leg, HG.box, wood, [0.12, 0.06, 0.03], [0, -0.79, z]);
  const bodyHit = new THREE.Mesh(HG.box, hitMat); bodyHit.scale.set(0.6, 0.9, 0.6); bodyHit.position.y = 0.1; body.add(bodyHit);
  const headHit = new THREE.Mesh(HG.sph, hitMat); headHit.scale.setScalar(0.17); headHit.position.set(0, 0.12, 0.32); body.add(headHit);
  const mats = [paper, rib, wood, white, pupil, tongue];
  const obj = { g, inner, body: bodyHit, head: headHit, hg: body, bones: null, wings: null, mats, eyeMat: pupil, eyes: [], phase: Math.random() * 10,
    anim(dt, o) {
      const t = (o.t || 0) + this.phase, a = dt > 0 ? 1 - Math.exp(-dt * 8) : 1;
      if (o.dead) { body.rotation.x += (1.45 - body.rotation.x) * a; body.position.y += (0.35 - body.position.y) * a; tg.rotation.x = -0.6; return; }
      const sp = Math.min(1, (o.speed || 0) / 6), hop = Math.abs(Math.sin(t * 7.5));
      body.position.y = 0.9 + hop * 0.45 * (0.3 + sp); body.rotation.x = -0.15 * sp + (o.hit || 0) * -0.5 + (o.lunge ? -0.5 * Math.sin(o.lunge * PI) : 0);
      body.rotation.y = Math.sin(t * 2) * 0.25; body.rotation.z = Math.sin(t * 7.5) * 0.12 + (o.hit || 0) * 0.3 * (o.hitSide || 1);
      leg.scale.y = 0.85 + hop * 0.2; tg.rotation.x = -0.15 + Math.sin(t * 9) * 0.25; eye.scale.y = 0.08 * (Math.sin(t * 0.9) > 0.97 ? 0.15 : 1);
    } };
  return enemyInterface(obj, [paper], setXray);
}
