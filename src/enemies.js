// Non-cat enemies: sewer rats and the Krasue (กระสือ, a floating head with dangling organs).
// Same interface as cat.js objects so the game code can treat every enemy alike.
import * as THREE from 'three';
import { setXray } from './cat.js';

const TAU = Math.PI * 2;
const hitMat = new THREE.MeshBasicMaterial({ visible: false });
const G = {
  sph: new THREE.SphereGeometry(1, 18, 12), sphLo: new THREE.SphereGeometry(1, 10, 8),
  cone: new THREE.ConeGeometry(1, 1, 14), cyl: new THREE.CylinderGeometry(1, 1, 1, 10), cap: new THREE.CapsuleGeometry(1, 1, 4, 8),
  box: new THREE.BoxGeometry(1, 1, 1), disc: new THREE.CylinderGeometry(1, 1, 0.12, 16),
};
const add = (p, geo, mat, s, pos, rot) => { const m = new THREE.Mesh(geo, mat); m.scale.set(...s); m.position.set(...pos); if (rot) m.rotation.set(...rot); m.castShadow = true; p.add(m); return m; };
const _blood = new THREE.Color(0x4a0404);

function glowTexture(rgb) {
  const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d');
  const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, `rgba(${rgb},0.9)`); r.addColorStop(0.35, `rgba(${rgb},0.35)`); r.addColorStop(1, `rgba(${rgb},0)`);
  g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t;
}
let auraTex = null;

function common(obj, mainMats, base) {
  // hurt tint / hit flash / stagger glow on plain standard materials
  obj.setHurt = f => { for (let i = 0; i < mainMats.length; i++) mainMats[i].color.copy(base[i]).lerp(_blood, Math.min(0.75, f * 0.75)); };
  obj.setFlash = k => { for (const m of mainMats) { if (k > 0) m.emissive.setRGB(0.9, 0.2, 0.15); else if (!obj._glow) m.emissive.copy(m.userData.em || new THREE.Color(0)); } };
  obj.setGlow = k => { obj._glow = k > 0; for (const m of mainMats) { if (k > 0) m.emissive.setRGB(0.8 * k, 0.3 * k, 0.02); else m.emissive.copy(m.userData.em || new THREE.Color(0)); } };
  obj.setXray = on => setXray(obj, on);
  return obj;
}

// ============================ SEWER RAT ============================
export function buildRat(C) {
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(C.s); g.add(inner);
  const fur = new THREE.MeshStandardMaterial({ color: C.body, roughness: 0.88 }), fur2 = new THREE.MeshStandardMaterial({ color: C.dark, roughness: 0.9 });
  const pink = new THREE.MeshStandardMaterial({ color: 0xc87a7a, roughness: 0.55 });
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.eye).multiplyScalar(3) });
  const tooth = new THREE.MeshStandardMaterial({ color: 0xf0d890, roughness: 0.3 });
  const root = new THREE.Group(); inner.add(root);
  add(root, G.sph, fur, [0.12, 0.105, 0.24], [0, 0.17, 0.02]);
  add(root, G.sph, fur, [0.145, 0.125, 0.17], [0, 0.18, -0.13]);
  add(root, G.sph, fur2, [0.1, 0.06, 0.2], [0, 0.25, -0.05]);          // darker back ridge
  for (let i = 0; i < 6; i++) add(root, G.cone, fur2, [0.012, 0.06, 0.012], [0, 0.29, -0.15 + i * 0.05], [-0.4, 0, 0]); // mangy spikes
  const head = new THREE.Group(); head.position.set(0, 0.2, 0.22); root.add(head);
  add(head, G.sph, fur, [0.085, 0.075, 0.09], [0, 0, 0]);
  add(head, G.cone, fur, [0.06, 0.15, 0.055], [0, -0.01, 0.1], [Math.PI / 2, 0, 0]);
  add(head, G.sphLo, pink, [0.018, 0.016, 0.018], [0, -0.005, 0.175]);
  for (const sx of [-1, 1]) {
    add(head, G.disc, pink, [0.045, 0.5, 0.045], [sx * 0.055, 0.07, -0.01], [Math.PI / 2 - 0.3, 0, sx * 0.5]);
    add(head, G.sphLo, eyeMat, [0.017, 0.017, 0.017], [sx * 0.042, 0.025, 0.06]);
    for (let w = 0; w < 3; w++) { const wh = add(head, G.box, tooth, [0.12, 0.002, 0.002], [sx * 0.06, -0.005 + w * 0.008, 0.13], [0, sx * 0.25, (w - 1) * 0.15]); wh.castShadow = false; }
  }
  add(head, G.box, tooth, [0.012, 0.025, 0.006], [-0.008, -0.04, 0.155]); add(head, G.box, tooth, [0.012, 0.025, 0.006], [0.008, -0.04, 0.155]);
  const legs = [];
  for (const [x, z] of [[-0.08, 0.1], [0.08, 0.1], [-0.09, -0.15], [0.09, -0.15]]) { const p = new THREE.Group(); p.position.set(x, 0.13, z); root.add(p); add(p, G.cap, fur2, [0.025, 0.05, 0.025], [0, -0.06, 0]); add(p, G.sphLo, pink, [0.025, 0.012, 0.035], [0, -0.12, 0.015]); legs.push(p); }
  // segmented tail
  const tail = []; let par = root, z0 = -0.27;
  for (let i = 0; i < 7; i++) { const s = new THREE.Group(); s.position.set(0, i === 0 ? 0.15 : 0, i === 0 ? z0 : -0.075); par.add(s); add(s, G.cyl, pink, [0.016 * (1 - i * 0.11), 0.08, 0.016 * (1 - i * 0.11)], [0, 0, -0.035], [Math.PI / 2, 0, 0]); tail.push(s); par = s; }
  const body = new THREE.Mesh(G.box, hitMat); body.scale.set(0.32, 0.3, 0.62); body.position.set(0, 0.18, -0.03); root.add(body);
  const headHit = new THREE.Mesh(G.sph, hitMat); headHit.scale.setScalar(0.11); head.add(headHit);
  const mats = [fur, fur2, pink, eyeMat, tooth];
  const obj = { g, inner, body, head: headHit, hg: head, bones: null, wings: null, mats, eyeMat, eyes: [], phase: Math.random() * 10,
    anim(dt, o) {
      const sp = o.speed || 0; this.phase += dt * (6 + sp * 2.2); const ph = this.phase, t = o.t || 0;
      if (o.dead) { root.rotation.z = Math.PI * 0.95; root.position.y = 0.3; legs.forEach((l, i) => l.rotation.x = Math.sin(t * 20 + i) * 0.4); return; }
      root.rotation.z = 0; root.position.y = Math.abs(Math.sin(ph)) * 0.03 * Math.min(1, sp / 3);
      legs.forEach((l, i) => { l.rotation.x = Math.sin(ph + (i % 2 ? Math.PI : 0) + (i > 1 ? Math.PI * 0.5 : 0)) * 0.9 * Math.min(1, sp / 2 + 0.15); });
      tail.forEach((s, i) => { s.rotation.y = Math.sin(t * 9 - i * 0.9) * 0.35; s.rotation.x = i === 0 ? -0.2 : 0.06; });
      head.rotation.x = (o.lunge || 0) * -0.5 + Math.sin(t * 13) * 0.05; head.rotation.y = Math.sin(t * 7) * 0.1;
      root.position.z = (o.lunge ? Math.sin(o.lunge * Math.PI) : 0) * 0.15;
    } };
  return common(obj, [fur, fur2], [new THREE.Color(C.body), new THREE.Color(C.dark)]);
}

// ============================ KRASUE (กระสือ) ============================
export function buildKrasue(C) {
  if (!auraTex) auraTex = glowTexture('120,255,140');
  const g = new THREE.Group(), inner = new THREE.Group(); inner.scale.setScalar(C.s); g.add(inner);
  const skin = new THREE.MeshStandardMaterial({ color: 0xd8c4b0, roughness: 0.55, emissive: 0x0c2a10 }); skin.userData.em = new THREE.Color(0x0c2a10);
  const hair = new THREE.MeshStandardMaterial({ color: 0x0a0808, roughness: 0.45, metalness: 0.1 });
  const flesh = new THREE.MeshStandardMaterial({ color: 0x9a1418, roughness: 0.25, emissive: 0x3a0204 }); flesh.userData.em = new THREE.Color(0x3a0204);
  const pinkM = new THREE.MeshStandardMaterial({ color: 0xc86a72, roughness: 0.3, emissive: 0x2a0408 }); pinkM.userData.em = new THREE.Color(0x2a0408);
  const eyeMat = new THREE.MeshBasicMaterial({ color: new THREE.Color(C.eye).multiplyScalar(3.2) });
  const dark = new THREE.MeshBasicMaterial({ color: 0x050202 });
  const lip = new THREE.MeshStandardMaterial({ color: 0x5a0408, roughness: 0.2 });
  const root = new THREE.Group(); root.position.y = 1.15; inner.add(root);  // head floats ~1.2m above the entity origin
  // head
  const head = new THREE.Group(); root.add(head);
  add(head, G.sph, skin, [0.16, 0.19, 0.17], [0, 0, 0]);
  for (const sx of [-1, 1]) {
    add(head, G.sph, dark, [0.045, 0.035, 0.03], [sx * 0.058, 0.03, 0.142]);
    add(head, G.sphLo, eyeMat, [0.017, 0.017, 0.017], [sx * 0.058, 0.03, 0.158]);
  }
  add(head, G.sph, lip, [0.05, 0.022, 0.03], [0, -0.075, 0.145]);
  add(head, G.sph, dark, [0.034, 0.012, 0.03], [0, -0.075, 0.155]);
  add(head, G.sph, flesh, [0.01, 0.06, 0.01], [0.02, -0.12, 0.15]);       // blood dribble
  // hair: long strands hanging from the crown, swaying
  const strands = [];
  add(head, G.sph, hair, [0.17, 0.12, 0.18], [0, 0.07, -0.02]);
  for (let i = 0; i < 14; i++) {
    const a = (i / 14) * TAU; if (Math.cos(a) > 0.82) continue;  // keep the face clear
    const s = new THREE.Group(); s.position.set(Math.sin(a) * 0.14, 0.06, Math.cos(a) * 0.13 - 0.02); head.add(s);
    const L = 0.55 + (i % 3) * 0.18;
    add(s, G.cone, hair, [0.035, L, 0.02], [0, -L / 2, 0], [Math.PI, 0, 0]);
    strands.push({ s, a, L, ph: Math.random() * TAU });
  }
  // neck stump + organs
  add(head, G.cyl, flesh, [0.05, 0.08, 0.05], [0, -0.2, 0]);
  const organs = new THREE.Group(); organs.position.set(0, -0.24, 0); head.add(organs);
  add(organs, G.cyl, pinkM, [0.018, 0.25, 0.018], [0, -0.12, 0]);                 // trachea
  const lungs = [-1, 1].map(sx => add(organs, G.sph, pinkM, [0.07, 0.11, 0.06], [sx * 0.06, -0.3, 0]));
  const heart = add(organs, G.sph, flesh, [0.055, 0.065, 0.05], [0.015, -0.33, 0.05]);
  add(organs, G.sph, pinkM, [0.08, 0.06, 0.07], [-0.02, -0.46, 0]);               // stomach
  // intestines: a dangling tube
  const pts = []; for (let i = 0; i <= 24; i++) { const t = i / 24; pts.push(new THREE.Vector3(Math.sin(t * 9) * 0.07 * (1 - t * 0.3), -0.5 - t * 0.7, Math.cos(t * 7) * 0.06)); }
  const gut = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 60, 0.028, 6, false), pinkM); gut.castShadow = true; organs.add(gut);
  // green aura
  const aura = new THREE.Sprite(new THREE.SpriteMaterial({ map: auraTex, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true, opacity: 0.75 })); aura.scale.set(1.3, 1.6, 1); aura.position.y = -0.25; head.add(aura);
  const headHit = new THREE.Mesh(G.sph, hitMat); headHit.scale.setScalar(0.22); head.add(headHit);
  const body = new THREE.Mesh(G.box, hitMat); body.scale.set(0.3, 0.9, 0.3); body.position.set(0, -0.6, 0); head.add(body);
  const mats = [skin, hair, flesh, pinkM, eyeMat, dark, lip, aura.material];
  const obj = { g, inner, body, head: headHit, hg: head, bones: null, wings: null, mats, eyeMat, eyes: [], phase: Math.random() * 10,
    anim(dt, o) {
      const t = (o.t || 0) + this.phase;
      if (o.dead) { root.position.y = 0.25; head.rotation.set(0.2, 0, 1.3); organs.rotation.set(0, 0, -1.2); aura.material.opacity = 0; return; }
      root.position.y = 1.15 + Math.sin(t * 2.1) * 0.08;
      head.rotation.z = Math.sin(t * 1.3) * 0.12; head.rotation.x = (o.lunge ? -0.4 * Math.sin(o.lunge * Math.PI) : 0) + Math.sin(t * 0.9) * 0.06;
      const sp = Math.min(1, (o.speed || 0) / 8);
      organs.rotation.x = 0.25 * sp + Math.sin(t * 2.6) * 0.12; organs.rotation.z = Math.sin(t * 1.9) * 0.1;
      for (const s of strands) { s.s.rotation.x = 0.15 * sp + Math.sin(t * 2.4 + s.ph) * 0.12; s.s.rotation.z = Math.sin(t * 1.7 + s.ph) * 0.1; }
      const beat = 1 + Math.max(0, Math.sin(t * 7)) * 0.18; heart.scale.set(0.055 * beat, 0.065 * beat, 0.05 * beat);
      lungs.forEach((l, i) => l.scale.y = 0.11 * (1 + Math.sin(t * 2 + i) * 0.06));
      aura.material.opacity = 0.55 + Math.sin(t * 3) * 0.2;
    } };
  return common(obj, [skin, flesh, pinkM], [new THREE.Color(0xd8c4b0), new THREE.Color(0x9a1418), new THREE.Color(0xc86a72)]);
}
