// Level 2 "Underworld of Rome": undead legion, gladiators, minotaur, harpies, lemures and three gods.
// Also the five playable characters (used in the lobby and as co-op avatars).
import * as THREE from 'three';
import { HG, makeRig, bipedBones, humanBody, skelBody, limb, cape, instantiate, enemyInterface, poseHuman } from './humanoid.js';
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
function sprite(rgb, sx, sy, op = 0.7, add = true) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTex(rgb), blending: add ? THREE.AdditiveBlending : THREE.NormalBlending, depthWrite: false, transparent: true, opacity: op })); s.scale.set(sx, sy, 1); return s; }

// ------------------------------------------------------------------ shared gear
function galea(r, J, M, crestMat, transverse) {
  r.p(J.head, HG.dome, M.iron, [0.118, 0.115, 0.128], [0, 0.125, -0.005]);
  r.p(J.head, HG.box, M.iron, [0.21, 0.02, 0.09], [0, 0.125, -0.115], [0.45, 0, 0]);          // neck guard
  for (const x of [-0.1, 0.1]) r.p(J.head, HG.rbox, M.iron, [0.02, 0.1, 0.07], [x, 0.06, 0.05]); // cheek guards
  r.p(J.head, HG.box, M.bronze, [0.2, 0.018, 0.02], [0, 0.155, 0.11]);                       // brow band
  if (transverse) r.p(J.head, HG.rbox, crestMat, [0.36, 0.1, 0.05], [0, 0.27, 0]);
  else { r.p(J.head, HG.box, M.bronze, [0.02, 0.03, 0.1], [0, 0.245, 0]); r.p(J.head, HG.rbox, crestMat, [0.03, 0.1, 0.24], [0, 0.3, -0.01]); }
}
function gladius(r, hand, M) {
  r.p(hand, HG.cyl, M.leather, [0.017, 0.09, 0.017], [0, -0.06, 0.01]);
  r.p(hand, HG.sph, M.bronze, [0.025, 0.02, 0.025], [0, 0.0, 0.01]);
  r.p(hand, HG.rbox, M.bronze, [0.075, 0.025, 0.04], [0, -0.11, 0.01]);
  r.p(hand, HG.blade, M.steel, [0.05, 0.4, 0.12], [0, -0.12, 0.01], [PI, 0, 0]);
}
function scutum(r, bone, M, x, y, z) {
  r.p(bone, HG.shield, M.shield, [0.42, 0.86, 0.42], [x, y, z - 0.42]);
  r.p(bone, HG.sph, M.bronze, [0.075, 0.075, 0.05], [x, y, z + 0.005]);
  for (const s of [-1, 1]) r.p(bone, HG.box, M.gold, [0.018, 0.3, 0.012], [x, y, z + 0.004], [0, 0, s * 0.6]);
  r.p(bone, HG.box, M.gold, [0.4, 0.02, 0.012], [x, y + 0.33, z - 0.025]);
  r.p(bone, HG.box, M.gold, [0.4, 0.02, 0.012], [x, y - 0.33, z - 0.025]);
}
function polearm(r, hand, M, len, back, tip) {   // shaft along +z in the bind pose (perpendicular to the forearm)
  r.p(hand, HG.cyl, M.wood, [0.018, len, 0.018], [0, -0.06, len / 2 - back], [PI / 2, 0, 0]);
  if (tip === 'spear') { r.p(hand, HG.blade, M.steel, [0.1, 0.38, 0.4], [0, -0.06, len - back], [PI / 2, 0, 0]); r.p(hand, HG.cyl, M.bronze, [0.026, 0.07, 0.026], [0, -0.06, len - back], [PI / 2, 0, 0]); }
  else {
    const n = tip === 'trident' ? 3 : 2, w = tip === 'trident' ? 0.075 : 0.06;
    r.p(hand, HG.box, M.tipM || M.iron, [w * 2 + 0.02, 0.025, 0.03], [0, -0.06, len - back]);
    for (let i = 0; i < n; i++) { const x = n === 3 ? (i - 1) * w : (i ? w : -w) * 0.8; r.p(hand, HG.cone, M.tipM || M.iron, [0.016, 0.26, 0.016], [x, -0.06, len - back + 0.13], [PI / 2, 0, 0]); }
  }
}

// ------------------------------------------------------------------ model definitions
const DEF = {};
DEF.legion = {
  style: 'sword', build() {
    const r = makeRig(), J = bipedBones(r);
    const M = { bone: role(std(0xd8ccb0, 0.72), 'tint'), dark: std(0x080404, 1), eye: glow(0xff4a12), tooth: std(0xc8b890, 0.5),
      iron: std(0x80848c, 0.38, 1), bronze: std(0xb07a2a, 0.32, 1), gold: std(0xffc04a, 0.28, 1), steel: std(0xc8ccd4, 0.22, 1),
      red: role(std(0x8a1414, 0.85, 0, { side: THREE.DoubleSide }), 'tint'), leather: std(0x3a2414, 0.8), shield: std(0x9a1010, 0.55, 0.1, { side: THREE.DoubleSide }) };
    skelBody(r, J, M);
    for (let i = 0; i < 4; i++) r.p(J.chest, HG.ring, M.iron, [0.178 - i * 0.004, 0.6, 0.128], [0, 0.25 - i * 0.058, 0]);
    for (const [b, s] of [[J.shL, 1], [J.shR, -1]]) for (let i = 0; i < 3; i++) r.p(b, HG.dome, M.iron, [0.085 - i * 0.008, 0.06, 0.085], [s * 0.01, -i * 0.045, 0], [0, 0, s * -0.5]);
    r.p(J.hips, HG.skirt, M.red, [0.17, 0.3, 0.14], [0, -0.12, 0]);
    r.p(J.hips, HG.ring, M.leather, [0.155, 0.5, 0.125], [0, 0.03, 0]);
    for (let i = 0; i < 6; i++) r.p(J.hips, HG.box, M.leather, [0.026, 0.2, 0.01], [-0.075 + i * 0.03, -0.1, 0.13]);
    galea(r, J, M, M.red, false);
    scutum(r, J.chest, M, 0.2, -0.18, 0.3);
    gladius(r, J.haR, M);
    for (const k of [J.knL, J.knR]) r.p(k, HG.taper, M.bronze, [0.05, 0.26, 0.045], [0, -0.18, 0.012]);
    return r;
  } };
DEF.archer = {
  style: 'bow', build() {
    const r = makeRig(), J = bipedBones(r);
    const M = { bone: role(std(0xcfc4a6, 0.75), 'tint'), dark: std(0x080404, 1), eye: glow(0x6aff3a), cloth: role(std(0x2a2226, 0.95, 0, { side: THREE.DoubleSide }), 'tint'),
      leather: std(0x4a2c18, 0.75), wood: std(0x6a4020, 0.6), str: std(0xe8e0c8, 0.5), red: std(0xa01818, 0.8), iron: std(0x6a6e76, 0.4, 1) };
    skelBody(r, J, M);
    r.p(J.head, HG.dome, M.cloth, [0.135, 0.16, 0.14], [0, 0.1, -0.015], [-0.25, 0, 0]);
    r.p(J.head, HG.box, M.cloth, [0.24, 0.24, 0.02], [0, 0.0, -0.12], [0.2, 0, 0]);
    cape(r, J.chest, M.cloth, 0.38, 0.75, 0.26);
    r.p(J.hips, HG.skirt, M.cloth, [0.16, 0.36, 0.13], [0, -0.15, 0]);
    r.p(J.chest, HG.box, M.leather, [0.05, 0.5, 0.02], [0, 0.05, 0.12], [0, 0, 0.6]);       // baldric
    r.p(J.chest, HG.cyl, M.leather, [0.055, 0.42, 0.055], [-0.07, 0.07, -0.15], [0.2, 0, 0.45]);   // quiver
    for (let i = 0; i < 4; i++) { r.p(J.chest, HG.cyl, M.wood, [0.006, 0.2, 0.006], [-0.17 + i * 0.015, 0.33 + i * 0.01, -0.19], [0.2, 0, 0.45]); r.p(J.chest, HG.box, M.red, [0.02, 0.05, 0.004], [-0.19 + i * 0.015, 0.4 + i * 0.01, -0.2], [0.2, 0, 0.45]); }
    r.p(J.haL, HG.bow, M.wood, [1, 1, 1], [0, 0.38, 0]);
    r.p(J.haL, HG.box, M.str, [0.004, 0.004, 0.64], [0, 0.07, 0]);
    for (const e of [J.elL, J.elR]) r.p(e, HG.taper, M.leather, [0.036, 0.16, 0.036], [0, -0.16, 0]);
    return r;
  } };
DEF.gladiator = {
  style: 'spear', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.21 });
    const skin = role(std(0x7c8a72, 0.6, 0, { emissive: 0x0a1406 }), 'tint', 0x0a1406);
    const M = { skin, top: skin, bottom: role(std(0xd8ccb0, 0.9), 'tint'), leg: skin, boot: std(0x4a2c18, 0.8), eye: glow(0xffd23f), brow: std(0x101008, 1),
      bronze: std(0xb88a3a, 0.3, 1), iron: std(0x8a8e96, 0.38, 1), wood: std(0x5a3a1c, 0.6), leather: std(0x3a2414, 0.8), dark: std(0x050303, 1) };
    humanBody(r, J, M, { bulk: 1.12, bareArms: true, pecs: skin });
    r.p(J.chest, HG.sph, skin, [0.13, 0.09, 0.07], [0, -0.07, 0.07]);                                  // abs
    r.p(J.hips, HG.ring, M.bronze, [0.16, 0.9, 0.13], [0, 0.04, 0]);                                  // balteus
    for (let i = 0; i < 4; i++) { r.p(J.shR, HG.ring, M.iron, [0.07, 0.4, 0.07], [0, -0.04 - i * 0.07, 0]); r.p(J.elR, HG.ring, M.iron, [0.058, 0.4, 0.058], [0, -0.03 - i * 0.06, 0]); }
    r.p(J.shL, HG.dome, M.bronze, [0.1, 0.09, 0.1], [0.02, 0.01, 0], [0, 0, -0.7]);                  // galerus
    for (const k of [J.knL, J.knR]) r.p(k, HG.taper, M.bronze, [0.068, 0.3, 0.06], [0, -0.2, 0.012]);
    r.p(J.head, HG.sph, M.bronze, [0.128, 0.142, 0.138], [0, 0.11, 0]);                               // secutor helmet
    for (const x of [-0.04, 0.04]) { r.p(J.head, HG.sph, M.dark, [0.02, 0.02, 0.01], [x, 0.12, 0.133]); r.p(J.head, HG.sphLo, M.eye, [0.01, 0.01, 0.008], [x, 0.12, 0.137]); }
    r.p(J.head, HG.box, M.bronze, [0.016, 0.09, 0.2], [0, 0.25, -0.01]);
    polearm(r, J.haR, M, 1.8, 0.75, 'trident');
    return r;
  } };
DEF.centurion = {
  style: 'sword', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.22 });
    const skin = role(std(0xa89c88, 0.65), 'tint');
    const gold = role(std(0xc8963a, 0.3, 1), 'tint');
    const M = { skin, top: gold, bottom: role(std(0x8a1414, 0.85, 0, { side: THREE.DoubleSide }), 'tint'), leg: skin, boot: std(0x3a2414, 0.8), eye: glow(0xff3a10), brow: std(0x101008, 1),
      iron: std(0x9a7a3a, 0.3, 1), bronze: std(0xb88a3a, 0.3, 1), gold: std(0xffc860, 0.25, 1), steel: std(0xc8ccd4, 0.22, 1), leather: std(0x3a2414, 0.8), red: std(0xb01818, 0.9, 0, { side: THREE.DoubleSide }) };
    humanBody(r, J, M, { bulk: 1.15, bareArms: true, pecs: gold });
    r.p(J.hips, HG.skirt, M.bottom, [0.18, 0.3, 0.15], [0, -0.12, 0]);
    for (let i = 0; i < 8; i++) { const a = -0.9 + i * 0.26; r.p(J.hips, HG.box, M.leather, [0.04, 0.22, 0.012], [Math.sin(a) * 0.17, -0.1, Math.cos(a) * 0.14], [0, a, 0]); }
    for (const [b, s] of [[J.shL, 1], [J.shR, -1]]) for (let i = 0; i < 4; i++) r.p(b, HG.box, M.leather, [0.035, 0.12, 0.012], [s * 0.05, -0.06, -0.05 + i * 0.035], [0, PI / 2, s * 0.3]);
    for (let i = 0; i < 3; i++) r.p(J.chest, HG.disc, M.gold, [0.03, 0.3, 0.03], [-0.06 + i * 0.06, 0.02, 0.12], [PI / 2, 0, 0]); // phalerae
    cape(r, J.chest, M.red, 0.44, 1.0, 0.27);
    galea(r, J, M, M.red, true);
    for (const k of [J.knL, J.knR]) r.p(k, HG.taper, M.bronze, [0.06, 0.3, 0.055], [0, -0.2, 0.012]);
    gladius(r, J.haR, M);
    return r;
  } };
DEF.minotaur = {
  style: 'axe', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.25 });
    const fur = role(std(0x3a2418, 0.95), 'tint'), fur2 = role(std(0x5a3a26, 0.95), 'tint');
    const M = { skin: fur, top: fur, bottom: std(0x2a1a10, 0.85), leg: fur, boot: std(0x0a0806, 0.5), eye: glow(0xff2a0a, 4),
      horn: std(0xd8c8a0, 0.45), dark: std(0x050303, 1), gold: std(0xffc860, 0.25, 1), wood: std(0x4a2c14, 0.6), iron: std(0xa8acb4, 0.3, 0.6) };
    humanBody(r, J, M, { bulk: 1.35, bareArms: true, pecs: fur2 });
    r.p(J.chest, HG.sph, fur2, [0.2, 0.16, 0.12], [0, 0.18, -0.06]);                                // hump
    // bull head over the human one
    r.p(J.head, HG.sph, fur, [0.15, 0.16, 0.17], [0, 0.12, 0]);
    r.p(J.head, HG.rbox, fur2, [0.16, 0.13, 0.2], [0, 0.06, 0.15], [0.25, 0, 0]);
    r.p(J.head, HG.rbox, M.dark, [0.14, 0.07, 0.04], [0, 0.03, 0.255], [0.25, 0, 0]);
    r.p(J.head, HG.tor, M.gold, [0.045, 0.045, 0.045], [0, -0.02, 0.255]);
    for (const s of [-1, 1]) {
      r.p(J.head, HG.sphLo, M.eye, [0.022, 0.018, 0.012], [s * 0.085, 0.15, 0.13]);
      r.p(J.head, HG.cone, M.horn, [0.045, 0.24, 0.045], [s * 0.2, 0.22, 0.0], [0, 0, -s * 1.25]);
      r.p(J.head, HG.cone, M.horn, [0.03, 0.2, 0.03], [s * 0.33, 0.33, 0.02], [0.2, 0, -s * 0.35]);
      r.p(J.head, HG.sph, fur, [0.06, 0.03, 0.04], [s * 0.15, 0.16, -0.02], [0, 0, s * 0.5]);
    }
    r.p(J.hips, HG.skirt, M.bottom, [0.22, 0.26, 0.18], [0, -0.1, 0]);
    // labrys
    r.p(J.haR, HG.cyl, M.wood, [0.026, 1.25, 0.026], [0, -0.06, 0.28], [PI / 2, 0, 0]);
    r.p(J.haR, HG.axe, M.iron, [0.27, 0.27, 1], [0.02, -0.06, 0.78], [PI / 2, 0, 0]);
    r.p(J.haR, HG.axe, M.iron, [0.27, 0.27, 1], [-0.02, -0.06, 0.78], [PI / 2, 0, PI]);
    for (const f of [J.ftL, J.ftR]) r.p(f, HG.cyl, M.boot, [0.07, 0.08, 0.07], [0, -0.01, 0.02]);
    return r;
  } };
DEF.harpy = {
  style: 'claw', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.17 });
    J.wL = r.b('wL', J.chest, 0.07, 0.2, -0.1); J.wR = r.b('wR', J.chest, -0.07, 0.2, -0.1);
    const skin = role(std(0x8c9a86, 0.6), 'tint'), feath = role(std(0x3a2a22, 0.9, 0, { side: THREE.DoubleSide }), 'tint');
    const M = { skin, top: skin, bottom: feath, leg: std(0xb8a040, 0.6), boot: std(0xb8a040, 0.6), eye: glow(0xffe23a, 4), brow: std(0x101008, 1), hair: std(0x0e0a0c, 0.6), claw: std(0x1a1414, 0.3), feath };
    humanBody(r, J, M, { bulk: 0.85, bareArms: true });
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; if (Math.cos(a) > 0.75) continue; r.p(J.head, HG.cone, M.hair, [0.035, 0.42, 0.02], [Math.sin(a) * 0.09, -0.05, Math.cos(a) * 0.09 - 0.02], [PI + 0.15 * Math.cos(a), 0, 0.2 * Math.sin(a)]); }
    r.p(J.head, HG.sph, M.hair, [0.105, 0.09, 0.115], [0, 0.15, -0.01]);
    r.p(J.chest, HG.sph, feath, [0.17, 0.12, 0.12], [0, -0.02, 0.0]);
    for (const [b, s] of [[J.wL, 1], [J.wR, -1]]) {
      r.p(b, HG.limb, feath, [0.035, 0.12, 0.035], [s * 0.35, 0, 0], [0, 0, PI / 2]);
      for (let i = 0; i < 7; i++) r.p(b, HG.box, feath, [0.13, 0.015, 0.62 - i * 0.05], [s * (0.08 + i * 0.12), 0.02, -0.26 + i * 0.015], [0.25, s * (0.12 + i * 0.06), 0]);
    }
    for (const h of [J.haL, J.haR]) for (let i = 0; i < 3; i++) r.p(h, HG.cone, M.claw, [0.01, 0.08, 0.01], [-0.02 + i * 0.02, -0.12, 0.02], [PI + 0.3, 0, 0]);
    for (const f of [J.ftL, J.ftR]) for (let i = 0; i < 3; i++) r.p(f, HG.cone, M.claw, [0.012, 0.1, 0.012], [-0.03 + i * 0.03, -0.03, 0.08], [PI / 2 + 0.4, 0, 0]);
    return r;
  },
  extra(R, dt, o, t) { const f = o.dead ? 0.6 : Math.sin(t * 13) * 0.75 + 0.15; R.J.wL.rotation.set(0, -0.2, f); R.J.wR.rotation.set(0, 0.2, -f); } };
// ---- gods (bosses) ----
DEF.mars = {
  style: 'spear', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.22 });
    const skin = role(std(0xb47a50, 0.55), 'tint'), gold = role(std(0xd8a040, 0.25, 1), 'tint');
    const M = { skin, top: gold, bottom: role(std(0x9a1010, 0.85, 0, { side: THREE.DoubleSide }), 'tint'), leg: skin, boot: std(0x3a2414, 0.8), eye: glow(0xff2a0a, 5), brow: std(0x101008, 1),
      gold: std(0xffc860, 0.22, 1), bronze: std(0xb88a3a, 0.28, 1), steel: std(0xd8dce4, 0.2, 1), wood: std(0x3a2414, 0.6), red: std(0xb01010, 0.9, 0, { side: THREE.DoubleSide }), dark: std(0x050303, 1) };
    humanBody(r, J, M, { bulk: 1.18, bareArms: true, pecs: gold });
    r.p(J.chest, HG.sph, gold, [0.14, 0.09, 0.07], [0, -0.07, 0.08]);
    r.p(J.hips, HG.skirt, M.bottom, [0.19, 0.32, 0.16], [0, -0.12, 0]);
    for (let i = 0; i < 9; i++) { const a = -1.0 + i * 0.25; r.p(J.hips, HG.box, M.gold, [0.045, 0.24, 0.012], [Math.sin(a) * 0.18, -0.1, Math.cos(a) * 0.15], [0, a, 0]); }
    cape(r, J.chest, M.red, 0.5, 1.3, 0.28);
    // corinthian helmet with a huge crest
    r.p(J.head, HG.sph, M.gold, [0.13, 0.15, 0.14], [0, 0.11, 0]);
    r.p(J.head, HG.box, M.dark, [0.12, 0.03, 0.02], [0, 0.12, 0.135]); r.p(J.head, HG.box, M.dark, [0.03, 0.09, 0.02], [0, 0.07, 0.135]);
    for (const x of [-0.035, 0.035]) r.p(J.head, HG.sphLo, M.eye, [0.018, 0.012, 0.01], [x, 0.12, 0.14]);
    for (let i = 0; i < 9; i++) { const z = -0.2 + i * 0.05, h = 0.14 + Math.sin(i / 8 * PI) * 0.06; r.p(J.head, HG.rbox, M.red, [0.04, h, 0.06], [0, 0.26 + h / 2 - Math.abs(z) * 0.3, z]); }
    for (const k of [J.knL, J.knR]) r.p(k, HG.taper, M.gold, [0.065, 0.32, 0.058], [0, -0.2, 0.012]);
    for (const e of [J.elL, J.elR]) r.p(e, HG.taper, M.gold, [0.055, 0.14, 0.052], [0, -0.17, 0]);
    polearm(r, J.haR, M, 2.6, 0.95, 'spear');
    r.p(J.chest, HG.disc, M.gold, [0.4, 1, 0.4], [0.26, -0.1, 0.3], [PI / 2, 0, 0]);
    r.p(J.chest, HG.disc, M.red, [0.28, 1.1, 0.28], [0.26, -0.1, 0.305], [PI / 2, 0, 0]);
    r.p(J.chest, HG.tor, M.gold, [0.41, 0.41, 0.3], [0.26, -0.1, 0.31]);
    r.p(J.chest, HG.sph, M.gold, [0.08, 0.08, 0.05], [0.26, -0.1, 0.32]);
    return r;
  },
  inst(R) { const a = sprite('255,60,20', 1.6, 2.4, 0.35); a.position.set(0, 0.1, 0); R.J.chest.add(a); } };
DEF.jupiter = {
  style: 'bolt', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.22 });
    const skin = role(std(0xd8b08a, 0.55), 'tint'), robe = role(std(0xece4d4, 0.85, 0, { side: THREE.DoubleSide }), 'tint');
    const M = { skin, top: robe, bottom: robe, leg: robe, boot: std(0xc8a050, 0.4, 1), eye: glow(0x6ad8ff, 5), brow: std(0xe8e8e8, 0.8),
      hair: std(0xe8e4dc, 0.8), gold: std(0xffc860, 0.22, 1), bolt: glow(0x8ae8ff, 4) };
    humanBody(r, J, M, { bulk: 1.22, bareArms: true });
    r.p(J.hips, HG.skirt, robe, [0.25, 0.95, 0.22], [0, -0.45, 0]);
    r.p(J.chest, HG.box, M.gold, [0.06, 0.55, 0.02], [0, 0.06, 0.125], [0, 0, 0.7]);
    r.p(J.chest, HG.sph, skin, [0.1, 0.09, 0.07], [-0.1, 0.12, 0.08]);
    r.p(J.head, HG.sph, M.hair, [0.105, 0.12, 0.11], [0, 0.13, -0.02]);
    r.p(J.head, HG.sph, M.hair, [0.09, 0.12, 0.07], [0, -0.0, 0.08]);                            // beard
    r.p(J.head, HG.cone, M.hair, [0.07, 0.14, 0.05], [0, -0.1, 0.09], [PI, 0, 0]);
    r.p(J.head, HG.box, M.hair, [0.09, 0.015, 0.02], [0, 0.06, 0.118]);                          // moustache
    for (let i = 0; i < 14; i++) { const a = (i / 14) * TAU; r.p(J.head, HG.sph, M.gold, [0.022, 0.012, 0.035], [Math.sin(a) * 0.115, 0.21, Math.cos(a) * 0.12], [0, a, 0.5]); }
    const segs = [[0.25, 0.4], [0.12, -0.5], [-0.02, 0.5], [-0.16, -0.5], [-0.3, 0.45], [-0.44, -0.4]];
    for (const [y, a] of segs) r.p(J.haR, HG.box, M.bolt, [0.045, 0.17, 0.045], [Math.sin(a) * 0.04, y - 0.05, 0.02], [0, 0, a]);
    r.p(J.haR, HG.cone, M.bolt, [0.04, 0.15, 0.04], [0, 0.4, 0.02]); r.p(J.haR, HG.cone, M.bolt, [0.04, 0.15, 0.04], [0, -0.58, 0.02], [PI, 0, 0]);
    return r;
  },
  inst(R) { const a = sprite('120,210,255', 2.2, 3.2, 0.4); a.position.y = 0.2; R.J.chest.add(a); const h = sprite('170,240,255', 0.9, 0.9, 0.9); h.position.y = -0.1; R.J.haR.add(h); R.boltGlow = h;
    for (let i = 0; i < 6; i++) { const c = sprite('235,235,245', 1.6, 0.9, 0.55, false); c.position.set(Math.cos(i) * 0.5, 0.05, Math.sin(i * 1.7) * 0.5); R.mesh.add(c); } },
  extra(R, dt, o, t) { if (R.boltGlow) R.boltGlow.material.opacity = 0.6 + Math.sin(t * 25) * 0.3; } };
DEF.pluto = {
  style: 'bident', build() {
    const r = makeRig(), J = bipedBones(r, { shoulder: 0.22 });
    const skin = role(std(0x8a92a0, 0.5), 'tint'), robe = role(std(0x1c1424, 0.9, 0, { side: THREE.DoubleSide }), 'tint');
    const M = { skin, top: robe, bottom: robe, leg: robe, sleeve: robe, boot: std(0x0a0808, 0.6), eye: glow(0xc070ff, 5), brow: std(0x0a0a0a, 1),
      iron: std(0x2a2830, 0.35, 1), wood: std(0x120c10, 0.5), tipM: std(0x2a1840, 0.3, 1, { emissive: 0x8a2aff, emissiveIntensity: 1.8 }), gold: std(0x8a6a3a, 0.3, 1) };
    humanBody(r, J, M, { bulk: 1.12 });
    r.p(J.hips, HG.skirt, robe, [0.25, 0.95, 0.22], [0, -0.45, 0]);
    r.p(J.head, HG.dome, robe, [0.15, 0.2, 0.16], [0, 0.06, -0.06], [0.45, 0, 0]);
    r.p(J.chest, HG.sph, robe, [0.27, 0.13, 0.17], [0, 0.2, -0.03]);
    for (let i = 0; i < 9; i++) { const a = (i / 9) * TAU; r.p(J.head, HG.cone, M.iron, [0.018, 0.1 + (i % 2) * 0.06, 0.018], [Math.sin(a) * 0.1, 0.25, Math.cos(a) * 0.105]); }
    r.p(J.head, HG.ring, M.iron, [0.11, 0.4, 0.115], [0, 0.22, 0]);
    r.p(J.head, HG.cone, M.brow, [0.05, 0.08, 0.03], [0, -0.03, 0.09], [PI, 0, 0]);
    polearm(r, J.haR, M, 2.4, 0.9, 'bident');
    for (let i = 0; i < 5; i++) r.p(J.chest, HG.tor, M.iron, [0.03, 0.03, 0.03], [0.1 - i * 0.05, -0.12 - Math.sin(i / 4 * PI) * 0.06, 0.13], [0, PI / 2, 0]);
    return r;
  },
  inst(R) { const a = sprite('160,60,255', 2.2, 3.4, 0.45); a.position.y = 0.1; R.J.chest.add(a); for (const k of [-0.035, 0.035]) { const e = sprite('200,120,255', 0.25, 0.25, 0.9); e.position.set(k, 0.12, 0.14); R.J.head.add(e); } } };
// ---- playable characters ----
function hairSpikes(r, J, mat, n = 9) { r.p(J.head, HG.sph, mat, [0.106, 0.1, 0.112], [0, 0.15, -0.012]); for (let i = 0; i < n; i++) { const a = (i / n) * TAU; r.p(J.head, HG.cone, mat, [0.03, 0.1, 0.03], [Math.sin(a) * 0.06, 0.24, Math.cos(a) * 0.06 - 0.02], [Math.cos(a) * 0.6 - 0.3, 0, -Math.sin(a) * 0.6]); } }
const RIFLE_POS = [-0.1, 0.07, 0.1], RIFLE_TILT = 0.32;
function rp(p) { const c = Math.cos(RIFLE_TILT), sn = Math.sin(RIFLE_TILT); return [RIFLE_POS[0] + p[0], RIFLE_POS[1] + p[1] * c - p[2] * sn, RIFLE_POS[2] + p[1] * sn + p[2] * c]; }
function rifle(r, bone, M, kind) {   // modelled along +z (stock at 0), placed at the right shoulder pointing forward-down
  const g = (geo, mat, s, p, rot) => r.p(bone, geo, mat, s, rp(p), [(rot ? rot[0] : 0) + RIFLE_TILT, rot ? rot[1] : 0, rot ? rot[2] : 0]);
  if (kind === 'ssg') {
    for (const x of [-0.022, 0.022]) g(HG.cyl, M.gunM, [0.022, 0.62, 0.022], [x, 0.02, 0.55], [PI / 2, 0, 0]);
    g(HG.rbox, M.gunW, [0.06, 0.09, 0.3], [0, -0.03, 0.08]); g(HG.rbox, M.gunM, [0.08, 0.075, 0.12], [0, 0.0, 0.26]); g(HG.rbox, M.gunW, [0.075, 0.06, 0.2], [0, -0.03, 0.5]);
    return { R: rp([0, -0.08, 0.22]), L: rp([0.0, -0.06, 0.5]) };
  }
  g(HG.rbox, M.gunW, [0.05, 0.08, 0.28], [0, -0.03, 0.08]); g(HG.rbox, M.gunM, [0.055, 0.075, 0.3], [0, 0, 0.34]);
  g(HG.cyl, M.gunM, [0.013, 0.4, 0.013], [0, 0.01, 0.68], [PI / 2, 0, 0]); g(HG.rbox, M.gunW, [0.055, 0.06, 0.2], [0, -0.005, 0.56]);
  g(HG.box, M.gunO, [0.035, 0.15, 0.06], [0, -0.1, 0.4], [-0.35, 0, 0]); g(HG.box, M.gunM, [0.03, 0.08, 0.035], [0, -0.07, 0.26], [0.3, 0, 0]);
  return { R: rp([0, -0.08, 0.24]), L: rp([0, -0.05, 0.55]) };
}
function charMats(skin, o) { return Object.assign({ skin: std(skin, 0.6), eye: std(0x101010, 0.3), brow: std(0x101010, 1), gunM: std(0x2a2c30, 0.4, 0.9), gunW: std(0x7a4a24, 0.55), gunO: std(0x6a2a10, 0.5) }, o); }
DEF.c_aritat = { style: 'gun', build() {
  const r = makeRig(), J = bipedBones(r);
  const M = charMats(0xc68a5e, { top: std(0xff7a1a, 0.85), bottom: std(0x2a3a5a, 0.9), boot: std(0xe8e8e8, 0.6), hair: std(0x0c0a0a, 0.5), red: std(0xc01818, 0.8) });
  humanBody(r, J, M, { shortSleeve: true }); hairSpikes(r, J, M.hair, 11);
  r.p(J.head, HG.ring, M.red, [0.108, 0.25, 0.114], [0, 0.17, 0]); r.p(J.head, HG.box, M.red, [0.03, 0.12, 0.01], [0.04, 0.12, -0.115], [0, 0, 0.4]);
  r.p(J.chest, HG.box, std(0x1a1a1a, 0.9), [0.2, 0.08, 0.005], [0, 0.1, 0.112]);
  r.ik = rifle(r, J.chest, M, 'ssg'); return r; } };
DEF.c_jaem = { style: 'club', build() {
  const r = makeRig(), J = bipedBones(r, { shoulder: 0.19 });
  const M = charMats(0xb07850, { top: std(0xe0508a, 0.85), bottom: std(0x5a2a6a, 0.9, 0, { side: THREE.DoubleSide }), boot: std(0x6a4a2a, 0.7), hair: std(0x1a1414, 0.6), apron: std(0xf0e8d8, 0.9), wood: std(0x8a5a2a, 0.6), grey: std(0x8a8480, 0.7) });
  humanBody(r, J, M, { bulk: 1.12, shortSleeve: true });
  r.p(J.hips, HG.skirt, M.bottom, [0.2, 0.82, 0.17], [0, -0.42, 0]);
  r.p(J.chest, HG.box, M.apron, [0.3, 0.42, 0.01], [0, -0.12, 0.13], [-0.1, 0, 0]);
  r.p(J.head, HG.sph, M.hair, [0.106, 0.1, 0.112], [0, 0.15, -0.015]); r.p(J.head, HG.sph, M.hair, [0.06, 0.06, 0.06], [0, 0.18, -0.12]); r.p(J.head, HG.box, M.grey, [0.02, 0.04, 0.12], [0.05, 0.22, -0.01]);
  for (let i = 0; i < 5; i++) r.p(J.chest, HG.sph, std(0xffd84a, 0.5), [0.025, 0.025, 0.01], [-0.1 + i * 0.05, 0.12 - (i % 2) * 0.08, 0.113]);
  r.p(J.haR, HG.cyl, M.wood, [0.03, 0.42, 0.03], [0, -0.06, 0.12], [PI / 2, 0, 0]); r.p(J.haR, HG.sph, M.wood, [0.045, 0.045, 0.06], [0, -0.06, 0.33]);
  return r; } };
DEF.c_win = { style: 'club', build() {
  const r = makeRig(), J = bipedBones(r);
  const M = charMats(0xc08458, { top: std(0x1a1a1e, 0.85), bottom: std(0x2a3a5a, 0.9), boot: std(0x101010, 0.6), vest: std(0xff8a10, 0.7), helm: std(0xf0f0f0, 0.3, 0.1), num: std(0xfafafa, 0.6), iron: std(0x9a9ea6, 0.35, 1), dark: std(0x101010, 1) });
  humanBody(r, J, M, {});
  r.p(J.chest, HG.rbox, M.vest, [0.39, 0.34, 0.235], [0, 0.04, 0]); r.p(J.chest, HG.box, M.num, [0.16, 0.12, 0.01], [0, 0.08, -0.12]); r.p(J.chest, HG.box, M.dark, [0.08, 0.06, 0.012], [0, 0.08, -0.124]);
  r.p(J.head, HG.dome, M.helm, [0.125, 0.12, 0.135], [0, 0.135, -0.01]); r.p(J.head, HG.box, M.vest, [0.03, 0.03, 0.26], [0, 0.25, -0.01]);
  r.p(J.head, HG.box, M.dark, [0.2, 0.03, 0.02], [0, 0.13, 0.112]);
  r.p(J.haR, HG.box, M.iron, [0.03, 0.02, 0.32], [0, -0.06, 0.12]); r.p(J.haR, HG.tor, M.iron, [0.035, 0.035, 0.035], [0, -0.06, 0.29], [PI / 2, 0, 0]);
  return r; } };
DEF.c_chalerm = { style: 'gun', build() {
  const r = makeRig(), J = bipedBones(r, { shoulder: 0.21 });
  const M = charMats(0x9a6440, { top: std(0x18181c, 0.9), bottom: std(0x18181c, 0.9), boot: std(0x0a0a0a, 0.5), red: std(0xb01818, 0.85), beret: std(0x101012, 0.95), tag: std(0xc8ccd4, 0.3, 1), belt: std(0x3a3a2a, 0.8) });
  humanBody(r, J, M, { bulk: 1.08 });
  r.p(J.neck, HG.ring, M.red, [0.08, 0.6, 0.08], [0, -0.02, 0]); r.p(J.chest, HG.box, M.red, [0.06, 0.1, 0.01], [0.02, 0.18, 0.118], [0, 0, 0.3]);
  r.p(J.head, HG.sph, M.beret, [0.12, 0.05, 0.12], [0.02, 0.21, 0], [0, 0, -0.25]); r.p(J.head, HG.box, std(0xffc860, 0.3, 1), [0.025, 0.03, 0.01], [-0.05, 0.215, 0.1]);
  r.p(J.hips, HG.ring, M.belt, [0.17, 0.55, 0.13], [0, 0.04, 0]); for (const x of [-0.1, 0, 0.1]) r.p(J.chest, HG.rbox, M.belt, [0.07, 0.09, 0.04], [x, -0.07, 0.12]);
  r.p(J.chest, HG.box, M.tag, [0.025, 0.035, 0.005], [0, 0.11, 0.115]);
  r.ik = rifle(r, J.chest, M, 'ak'); return r; } };
DEF.c_khlang = { style: 'staff', build() {
  const r = makeRig(), J = bipedBones(r);
  const M = charMats(0xb07a52, { top: std(0xf2eee6, 0.9), bottom: std(0xf2eee6, 0.9), boot: std(0x4a3420, 0.8), beard: std(0xd8d4cc, 0.9), sash: std(0xe0761a, 0.8), bead: std(0x4a2a14, 0.5), wood: std(0x5a3a1a, 0.6), gold: std(0xffc860, 0.25, 1), ink: std(0x1a2a4a, 0.8) });
  humanBody(r, J, M, {});
  r.p(J.head, HG.sph, M.skin, [0.104, 0.11, 0.112], [0, 0.135, -0.005]);
  r.p(J.head, HG.cone, M.beard, [0.05, 0.12, 0.04], [0, -0.02, 0.09], [PI, 0, 0]);
  r.p(J.chest, HG.box, M.sash, [0.07, 0.6, 0.02], [0, 0.04, 0.12], [0, 0, -0.65]);
  for (let i = 0; i < 16; i++) { const a = (i / 16) * TAU; r.p(J.chest, HG.sphLo, M.bead, [0.016, 0.016, 0.016], [Math.sin(a) * 0.1, 0.2 + Math.cos(a) * 0.1 * 0.0 - (Math.cos(a) > 0 ? Math.cos(a) * 0.1 : 0), Math.cos(a) * 0.12]); }
  for (const x of [-0.035, 0.035]) r.p(J.head, HG.box, M.ink, [0.004, 0.03, 0.004], [x, 0.2, 0.1]);
  r.p(J.haR, HG.cyl, M.wood, [0.02, 1.5, 0.02], [0, -0.06, 0.25], [PI / 2, 0, 0]);
  r.p(J.haR, HG.dome, M.gold, [0.09, 0.05, 0.09], [0, -0.06, 1.02], [PI / 2, 0, 0]);
  for (let i = 0; i < 6; i++) r.p(J.haR, HG.box, std(0xffffff, 0.9), [0.02, 0.1, 0.002], [Math.cos(i) * 0.04, -0.12, 0.95 + (i % 3) * 0.02]);
  return r; },
  inst(R) { const s = sprite('140,220,255', 0.5, 0.5, 0.7); s.position.set(0, -0.06, 1.05); R.J.haR.add(s); } };

// other levels register their rigged models here (they share the template cache / instancing below)
export function defineModel(name, def) { DEF[name] = def; }

// ------------------------------------------------------------------ template cache + instancing
const TPL = {};
function template(type) { if (!TPL[type]) { const rg = DEF[type].build(); TPL[type] = rg.build(); TPL[type].ik = rg.ik; } return TPL[type]; }
export function rigInstance(type) {
  const D = DEF[type], T = template(type), I = instantiate(T);
  const R = { mesh: I.mesh, J: I.J, mats: I.mats, byRole: I.byRole, style: D.style, extra: D.extra, ik: T.ik, st: { ph: Math.random() * 10, off: Math.random() * 10, hy: I.J.hips.position.y } };
  if (D.inst) D.inst(R);
  return R;
}
export const ROMAN_TYPES = ['legion', 'archer', 'gladiator', 'centurion', 'minotaur', 'harpy', 'mars', 'jupiter', 'pluto'];
// build an enemy object with the same interface as the cats
export function buildRoman(C) {
  if (C.model === 'lemure') return buildLemure(C);
  const R = rigInstance(C.model);
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(C.s); g.add(inner); inner.add(R.mesh);
  // hit proxies follow the bones
  const body = new THREE.Mesh(HG.box, hitMat); body.scale.set(0.5, 1.45, 0.38); body.position.set(0, -0.18, 0); R.J.hips.add(body);
  const headHit = new THREE.Mesh(HG.sph, hitMat); headHit.scale.setScalar(0.15); headHit.position.set(0, 0.11, 0.01); R.J.head.add(headHit);
  const eyeMat = R.mats.find(m => m.isMeshBasicMaterial) || new THREE.MeshBasicMaterial();
  const obj = { g, inner, body, head: headHit, hg: R.J.head, bones: null, wings: null, mats: R.mats, eyeMat, eyes: [], R, phase: Math.random() * 10,
    anim(dt, o) { poseHuman(R, dt, o); } };
  return enemyInterface(obj, R.byRole.tint || [], setXray);
}
// lemures: flaming skulls (no rig)
function buildLemure(C) {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(C.s); g.add(inner);
  const bone = role(std(0xe8dcc0, 0.5, 0, { emissive: 0x2a1408 }), 'tint', 0x2a1408), dark = std(0x060202, 1), eye = glow(0x6affd0, 4);
  const head = new THREE.Group(); head.position.y = 1.0; inner.add(head);
  const add = (geo, mat, s, p, rot) => { const m = new THREE.Mesh(geo, mat); m.scale.set(...s); m.position.set(...p); if (rot) m.rotation.set(...rot); m.castShadow = true; head.add(m); return m; };
  add(HG.sph, bone, [0.17, 0.18, 0.2], [0, 0, 0]);
  const jaw = add(HG.rbox, bone, [0.15, 0.06, 0.13], [0, -0.13, 0.06]);
  for (const x of [-0.06, 0.06]) { add(HG.sph, dark, [0.05, 0.045, 0.03], [x, 0.0, 0.165]); add(HG.sphLo, eye, [0.02, 0.02, 0.01], [x, 0.0, 0.18]); }
  const fl = []; for (let i = 0; i < 4; i++) { const s = sprite(i % 2 ? '120,255,200' : '60,200,255', 0.7, 0.9, 0.6); s.position.set((Math.random() - 0.5) * 0.15, 0.12 + i * 0.07, -0.08); head.add(s); fl.push(s); }
  const trail = sprite('60,200,160', 0.6, 0.6, 0.35); trail.position.set(0, 0, -0.3); head.add(trail);
  const body = new THREE.Mesh(HG.box, hitMat); body.scale.set(0.34, 0.34, 0.4); head.add(body);
  const headHit = new THREE.Mesh(HG.sph, hitMat); headHit.scale.setScalar(0.14); headHit.position.z = 0.06; head.add(headHit);
  const mats = [bone, dark, eye, ...fl.map(s => s.material), trail.material];
  const obj = { g, inner, body, head: headHit, hg: head, bones: null, wings: null, mats, eyeMat: eye, eyes: [], phase: Math.random() * 10,
    anim(dt, o) { const t = (o.t || 0) + this.phase, a = dt > 0 ? 1 - Math.exp(-dt * 7) : 1;
      if (o.dead) { head.position.y += (0.2 - head.position.y) * a * 1.4; head.rotation.x += (0.5 - head.rotation.x) * a; head.rotation.z += (0.6 - head.rotation.z) * a; jaw.rotation.x += (0.6 - jaw.rotation.x) * a; fl.forEach(s => { s.scale.multiplyScalar(1 - a); if (s.scale.x < 0.03) s.visible = false; }); trail.visible = false; return; }
      const h = o.hit || 0, sd = o.hitSide || 1;
      head.position.y = 1.0 + Math.sin(t * 4) * 0.08; head.position.z = -h * 0.15; jaw.rotation.x = 0.2 + Math.max(0, Math.sin(t * 9)) * 0.35 + (o.lunge ? 0.4 : 0) + h * 0.3;
      head.rotation.set(Math.sin(t * 2.2) * 0.12 - h * 0.4, Math.sin(t * 1.3) * 0.3, Math.sin(t * 3.1) * 0.15 + h * 0.4 * sd);
      fl.forEach((s, i) => { const k = 0.8 + Math.sin(t * 17 + i * 2) * 0.25; s.scale.set(0.6 * k, (0.9 + i * 0.1) * k, 1); }); } };
  return enemyInterface(obj, [bone], setXray);
}
// standalone character model (lobby / co-op avatars)
export function buildCharacter(id) {
  const R = rigInstance('c_' + id);
  R.mesh.traverse(o => { if (o.isMesh) o.castShadow = true; });
  return R;
}
export { poseHuman };
