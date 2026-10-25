// Detailed procedural first-person weapons + hands.
import * as THREE from 'three';
import { RoundedBoxGeometry } from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';

const TAU = Math.PI * 2;
const tl = new THREE.TextureLoader();
function T(n, srgb) { const t = tl.load('assets/tex/' + n); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace; t.anisotropy = 8; return t; }

export function buildGuns() {
  const metalC = T('metal_c.jpg', true), metalN = T('metal_n.jpg'), metalO = T('metal_orm.jpg');
  const woodC = T('wood_c.jpg', true), woodN = T('wood_n.jpg');
  const M = {
    blued: new THREE.MeshStandardMaterial({ color: 0x555a66, map: metalC, normalMap: metalN, roughnessMap: metalO, metalness: 1, roughness: 0.55, envMapIntensity: 1.4 }),
    steel: new THREE.MeshStandardMaterial({ color: 0x8a8c94, map: metalC, normalMap: metalN, roughnessMap: metalO, metalness: 1, roughness: 0.45, envMapIntensity: 1.4 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x2c2e34, roughness: 0.5, metalness: 0.7, envMapIntensity: 1.5 }),
    rubber: new THREE.MeshStandardMaterial({ color: 0x1a1a1c, roughness: 0.9, metalness: 0 }),
    wood: new THREE.MeshStandardMaterial({ color: 0xb06a3a, map: woodC, normalMap: woodN, roughness: 0.45, metalness: 0 }),
    brass: new THREE.MeshStandardMaterial({ color: 0xd6a64a, metalness: 1, roughness: 0.28 }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc860, metalness: 1, roughness: 0.2 }),
    olive: new THREE.MeshStandardMaterial({ color: 0x6a7a44, map: metalC, normalMap: metalN, roughness: 0.6, metalness: 0.35 }),
    red: new THREE.MeshStandardMaterial({ color: 0xb01818, roughness: 0.35, metalness: 0.3 }),
    white: new THREE.MeshStandardMaterial({ color: 0xdfe3ea, roughness: 0.25, metalness: 0.15, envMapIntensity: 1.3 }),
    blueGlow: new THREE.MeshStandardMaterial({ color: 0x0a1a2a, emissive: 0x3ab0ff, emissiveIntensity: 3.5 }),
    greenGlow: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x40ff60, emissiveIntensity: 3 }),
    redGlow: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff3010, emissiveIntensity: 3 }),
    heat: new THREE.MeshStandardMaterial({ color: 0x222226, metalness: 1, roughness: 0.4, emissive: 0xff4a10, emissiveIntensity: 0 }),
    glass: new THREE.MeshPhysicalMaterial({ color: 0x103048, metalness: 0.1, roughness: 0.02, clearcoat: 1, emissive: 0x0a2a40, emissiveIntensity: 0.6 }),
    hazard: hazardMat(),
    skin: new THREE.MeshStandardMaterial({ color: 0x9a6040, roughness: 0.72 }),
    glove: new THREE.MeshStandardMaterial({ color: 0x2b2420, roughness: 0.75 }),
    sleeve: new THREE.MeshStandardMaterial({ color: 0x2f6a4a, roughness: 0.92 }),
    watch: new THREE.MeshStandardMaterial({ color: 0x101010, roughness: 0.3, metalness: 0.8 }),
  };
  const G = {
    cyl: new THREE.CylinderGeometry(1, 1, 1, 24), cyl8: new THREE.CylinderGeometry(1, 1, 1, 8), sph: new THREE.SphereGeometry(1, 18, 12),
    box: new THREE.BoxGeometry(1, 1, 1), rbox: new RoundedBoxGeometry(1, 1, 1, 3, 0.18), tor: new THREE.TorusGeometry(1, 0.18, 8, 28),
    cap: new THREE.CapsuleGeometry(1, 1, 4, 10), cone: new THREE.ConeGeometry(1, 1, 20),
  };
  const add = (p, geo, mat, s, pos, rot) => { const m = new THREE.Mesh(geo, mat); m.scale.set(...s); m.position.set(...pos); if (rot) m.rotation.set(...rot); p.add(m); return m; };
  const tubeZ = (p, mat, r, len, z, x = 0, y = 0, seg) => add(p, seg || G.cyl, mat, [r, len, r], [x, y, z], [Math.PI / 2, 0, 0]);
  const lathe = (pts, n = 28) => new THREE.LatheGeometry(pts.map(([r, y]) => new THREE.Vector2(r, y)), n);
  const extrude = (pts, depth, bevel = 0.006) => {
    const s = new THREE.Shape(); s.moveTo(pts[0][0], pts[0][1]); for (let i = 1; i < pts.length; i++) s.lineTo(pts[i][0], pts[i][1]);
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: true, bevelThickness: bevel, bevelSize: bevel, bevelSegments: 2, curveSegments: 6 });
    g.translate(0, 0, -depth / 2); g.rotateY(Math.PI / 2); return g; // profile drawn in (z,y) with z pointing back
  };

  // ---------- hands ----------
  function hand(p, pos, rot, grip = 1, gloved = false) {
    const h = new THREE.Group(); h.position.set(...pos); h.rotation.set(...rot); p.add(h);
    const sk = gloved ? M.glove : M.skin;
    add(h, G.rbox, sk, [0.085, 0.04, 0.1], [0, 0, 0]);                       // palm
    for (let i = 0; i < 4; i++) {                                            // fingers curl round the grip
      const f = new THREE.Group(); f.position.set(-0.03 + i * 0.02, -0.005, -0.045); f.rotation.x = -0.5 * grip; h.add(f);
      const L = [0.032, 0.036, 0.034, 0.026][i];
      add(f, G.cap, sk, [0.0095, L * 0.5, 0.0095], [0, -0.0, -L * 0.45], [Math.PI / 2, 0, 0]);
      const f2 = new THREE.Group(); f2.position.set(0, 0, -L * 0.9); f2.rotation.x = -1.2 * grip; f.add(f2);
      add(f2, G.cap, sk, [0.009, L * 0.4, 0.009], [0, 0, -L * 0.35], [Math.PI / 2, 0, 0]);
      if (gloved) add(f, G.sph, M.dark, [0.011, 0.008, 0.012], [0, 0.009, -0.004]);
    }
    const th = new THREE.Group(); th.position.set(0.045, 0.0, 0.0); th.rotation.set(-0.3, -0.7 * grip, -0.4); h.add(th);
    add(th, G.cap, sk, [0.012, 0.025, 0.012], [0.0, 0, -0.03], [Math.PI / 2, 0, 0]);
    // wrist + sleeve with rolled cuff
    add(h, G.cyl, sk, [0.03, 0.08, 0.026], [0, 0.0, 0.08], [Math.PI / 2, 0, 0]);
    add(h, G.cyl, M.sleeve, [0.05, 0.36, 0.048], [0.0, 0.01, 0.28], [Math.PI / 2 - 0.02, 0, 0]);
    add(h, G.tor, M.sleeve, [0.05, 0.05, 0.05], [0, 0.01, 0.11]);
    return h;
  }
  function watch(h) { add(h, G.cyl, M.watch, [0.032, 0.022, 0.032], [0, 0.0, 0.085], [Math.PI / 2, 0, 0]); add(h, G.cyl, M.greenGlow, [0.018, 0.004, 0.018], [0, 0.028, 0.085]); }

  const guns = [];
  M.lens = new THREE.MeshPhysicalMaterial({ color: 0x0a0c10, metalness: 0.2, roughness: 0.05, clearcoat: 1 });
  M.bakelite = new THREE.MeshStandardMaterial({ color: 0x7a2e12, roughness: 0.42, metalness: 0.05 });
  M.pilot = new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x5ab0ff, emissiveIntensity: 4 });
  M.nozzleHeat = new THREE.MeshStandardMaterial({ color: 0x3a3a3e, metalness: 1, roughness: 0.4, emissive: 0xff5a10, emissiveIntensity: 0 });
  const recoilBack = (t, dur, amt) => (t >= 0 && t < dur) ? (1 - t / dur) * amt : 0;
  // ---- hand-driven reload: the support hand pulls the mag, swaps it off-screen, seats it, slaps it and works the bolt ----
  const sm = t => t * t * (3 - 2 * t);
  const kf = (k, keys) => { if (k <= keys[0][0]) return keys[0][1]; for (let i = 0; i < keys.length - 1; i++) { const a = keys[i], b = keys[i + 1]; if (k <= b[0]) { const f = sm((k - a[0]) / Math.max(1e-6, b[0] - a[0])); return a[1].map((v, j) => v + (b[1][j] - v) * f); } } return keys[keys.length - 1][1]; };
  const vadd = (a, b) => a.map((v, i) => v + b[i]);
  function magReloader(o) {
    const rp = o.hand.position.toArray(), rr = [o.hand.rotation.x, o.hand.rotation.y, o.hand.rotation.z];
    const mp = o.mag ? o.mag.position.toArray() : null, g = o.grab, d = o.drop, gr = o.gR || [1.15, 0, 0.35];
    const P = [[0, rp], [0.12, g], [0.3, d], [0.44, vadd(d, [0.03, 0.04, 0])], [0.56, vadd(g, [0, -0.09, 0.01])], [0.6, g], [0.64, vadd(g, [0, 0.016, 0])], [0.7, g]];
    const R = [[0, rr], [0.12, gr], [0.3, vadd(gr, [0.4, 0, 0.6])], [0.44, vadd(gr, [0.3, 0, 0.45])], [0.6, gr], [0.7, gr]];
    if (o.bolt) { P.push([0.78, o.bolt], [0.84, vadd(o.bolt, o.pull)], [0.9, o.bolt]); R.push([0.78, o.bR || rr], [0.9, o.bR || rr]); }
    P.push([1, rp]); R.push([1, rr]);
    return k => {
      if (k < 0) { o.hand.position.fromArray(rp); o.hand.rotation.set(rr[0], rr[1], rr[2]); if (mp) { o.mag.position.fromArray(mp); o.mag.rotation.set(0, 0, 0); } return 0; }
      const p = kf(k, P), r = kf(k, R); o.hand.position.fromArray(p); o.hand.rotation.set(r[0], r[1], r[2]);
      if (mp) { if (k > 0.12 && k < 0.6) { o.mag.position.set(mp[0] + p[0] - g[0], mp[1] + p[1] - g[1], mp[2] + p[2] - g[2]); o.mag.rotation.set((r[0] - gr[0]) * 0.6, 0, (r[2] - gr[2]) * 0.6); } else { o.mag.position.fromArray(mp); o.mag.rotation.set(0, 0, 0); } }
      return o.bolt && k > 0.8 && k < 0.9 ? Math.sin((k - 0.8) / 0.1 * Math.PI) : 0;
    };
  }
  const magDrop = (k) => k < 0 ? 0 : k < 0.12 ? 0 : k < 0.3 ? (k - 0.12) / 0.18 : k < 0.55 ? 1 : k < 0.7 ? 1 - (k - 0.55) / 0.15 : 0;

  // ======================= 1. DESERT EAGLE .50 =======================
  {
    const g = new THREE.Group();
    const slide = new THREE.Group(); g.add(slide);
    add(slide, G.rbox, M.steel, [0.038, 0.044, 0.26], [0, 0.036, -0.075]);
    for (let i = 0; i < 7; i++) add(slide, G.box, M.dark, [0.039, 0.03, 0.004], [0, 0.036, 0.02 + i * 0.008]);
    add(slide, G.box, M.dark, [0.013, 0.008, 0.25], [0, 0.062, -0.075]);                // top rib
    add(slide, G.box, M.dark, [0.006, 0.014, 0.01], [0, 0.072, -0.195]);              // front sight
    for (const x of [-0.008, 0.008]) add(slide, G.box, M.dark, [0.005, 0.012, 0.01], [x, 0.071, 0.045]);
    tubeZ(slide, M.dark, 0.011, 0.012, -0.205, 0, 0.036);                             // bore
    add(slide, G.box, M.dark, [0.039, 0.006, 0.07], [0, 0.026, -0.16]);               // barrel slot detail
    add(g, G.rbox, M.blued, [0.034, 0.03, 0.2], [0, 0.004, -0.06]);                   // frame
    add(g, G.tor, M.blued, [0.028, 0.028, 0.028], [0, -0.028, -0.02], [0, Math.PI / 2, 0]);
    add(g, G.box, M.dark, [0.006, 0.022, 0.006], [0, -0.022, -0.02], [0.3, 0, 0]);
    add(g, G.box, M.dark, [0.012, 0.022, 0.012], [0, 0.05, 0.065], [-0.5, 0, 0]);     // hammer
    const grip = new THREE.Mesh(extrude([[0.0, 0.0], [0.07, 0.0], [0.1, -0.13], [0.09, -0.15], [0.03, -0.15], [0.005, -0.03]], 0.036, 0.008), M.rubber); grip.position.set(0, -0.005, 0.0); g.add(grip);
    const mag = new THREE.Group(); g.add(mag); add(mag, G.rbox, M.dark, [0.032, 0.012, 0.06], [0, -0.155, 0.055]);
    const hr = hand(g, [0.005, -0.075, 0.075], [0.35, 0, -0.1], 1); watch(hr);
    const hlD = hand(g, [-0.035, -0.095, 0.06], [0.25, 0.5, 0.75], 0.9);
    add(g, G.box, M.dark, [0.008, 0.012, 0.02], [0.019, 0.03, 0.04]); for (let i = 0; i < 8; i++) add(grip, G.box, M.dark, [0.038, 0.002, 0.03], [0, -0.03 - i * 0.013, 0.045 - i * 0.003]);
    const rlD = magReloader({ hand: hlD, mag, grab: [0.0, -0.205, 0.06], drop: [-0.14, -0.45, 0.14], gR: [1.35, 0, 0.25] });
    const mz = new THREE.Object3D(); mz.position.set(0, 0.036, -0.215); slide.add(mz);
    const ej = new THREE.Object3D(); ej.position.set(0.02, 0.05, -0.0); g.add(ej);
    g.scale.setScalar(1.45); g.position.set(-0.05, 0.085, 0.0);
    g.userData = { mz, ej, anim(st) {
      const k = st.reloadK; rlD(k);
      slide.position.z = st.mag === 0 && k < 0 ? 0.035 : recoilBack(st.shotT, 0.09, 0.04) + (k >= 0 && k < 0.86 && st.mag === 0 ? 0.035 : 0);
    } };
    guns.push(g);
  }

  // ======================= 1. SUPER SHOTGUN =======================
  {
    const g = new THREE.Group();
    const brl = new THREE.Group(); brl.position.set(0, 0.02, -0.02); g.add(brl);   // hinge point
    for (const x of [-0.026, 0.026]) {
      tubeZ(brl, M.blued, 0.025, 0.62, -0.31, x, 0.0);
      tubeZ(brl, M.dark, 0.019, 0.01, -0.622, x, 0.0);                       // bore
      tubeZ(brl, M.steel, 0.027, 0.03, -0.6, x, 0.0);                         // muzzle band
    }
    add(brl, G.box, M.blued, [0.03, 0.012, 0.6], [0, 0.028, -0.31]);         // vent rib
    add(brl, G.sph, M.brass, [0.006, 0.006, 0.006], [0, 0.037, -0.6]);       // bead sight
    add(brl, G.box, M.blued, [0.012, 0.03, 0.6], [0, -0.025, -0.31]);        // lower rib
    const fore = add(brl, G.rbox, M.wood, [0.085, 0.06, 0.26], [0, -0.04, -0.2]); // forend
    add(brl, G.box, M.dark, [0.075, 0.004, 0.2], [0, -0.008, -0.2]);
    // receiver with gold engraving
    add(g, G.rbox, M.steel, [0.1, 0.09, 0.16], [0, 0.0, 0.07]);
    add(g, G.box, M.gold, [0.102, 0.008, 0.12], [0, 0.03, 0.07]);
    add(g, G.box, M.gold, [0.102, 0.008, 0.12], [0, -0.03, 0.07]);
    add(g, G.box, M.dark, [0.03, 0.03, 0.04], [0, 0.055, 0.13]);              // top lever
    add(g, G.tor, M.blued, [0.035, 0.035, 0.035], [0, -0.065, 0.1], [0, Math.PI / 2, 0]); // trigger guard
    add(g, G.box, M.dark, [0.008, 0.035, 0.008], [0, -0.06, 0.09], [0.3, 0, 0]);
    const stock = new THREE.Mesh(extrude([[0.0, 0.03], [0.1, 0.02], [0.16, -0.06], [0.4, -0.08], [0.42, -0.16], [0.36, -0.17], [0.2, -0.11], [0.14, -0.13], [0.09, -0.06], [0.0, -0.035]], 0.06, 0.012), M.wood);
    stock.position.set(0, 0, 0.14); g.add(stock);
    const handL = hand(g, [0.0, -0.07, -0.2], [0.15, 0, -0.1], 0.9); // forend hand
    const handR = hand(g, [0.025, -0.1, 0.24], [0.6, 0, -0.25], 1); watch(handR);
    const mz = new THREE.Object3D(); mz.position.set(0, 0, -0.66); brl.add(mz);
    // shells that pop out on reload
    const shells = [-0.026, 0.026].map(x => { const s = new THREE.Group(); tubeZ(s, M.red, 0.021, 0.06, 0); tubeZ(s, M.brass, 0.022, 0.015, 0.035); s.position.set(x, 0.0, -0.01); s.visible = false; brl.add(s); return s; });
    const ej = new THREE.Object3D(); ej.position.set(0, 0.02, -0.02); g.add(ej);
    g.userData = { mz, ej, brl, shells, handL, anim(st) {
      // break action: open, eject, load two shells, snap shut
      const k = st.reloadK; let open = 0;
      if (k >= 0) { open = k < 0.15 ? k / 0.15 : k > 0.85 ? (1 - k) / 0.15 : 1; }
      brl.rotation.x = open * 0.62;
      shells.forEach((sh, i) => { const show = k >= 0 && k > 0.35 + i * 0.12 && k < 0.9; sh.visible = show; sh.position.z = -0.01 + (show ? Math.max(0, 0.6 + i * 0.12 - k) * 0.6 : 0); });
    } };
    guns.push(g);
  }

  // ======================= 3. AK-47 =======================
  {
    const g = new THREE.Group();
    add(g, G.rbox, M.blued, [0.05, 0.066, 0.3], [0, 0.0, 0.0]);                         // receiver
    add(g, G.rbox, M.steel, [0.046, 0.022, 0.27], [0, 0.036, 0.005]);                   // dust cover
    for (let i = 0; i < 5; i++) add(g, G.box, M.dark, [0.047, 0.004, 0.006], [0, 0.044, 0.08 + i * 0.012]);
    add(g, G.box, M.blued, [0.03, 0.024, 0.05], [0, 0.04, -0.15]);                       // rear sight block
    tubeZ(g, M.dark, 0.012, 0.44, -0.38, 0, 0.005);                                       // barrel
    tubeZ(g, M.blued, 0.012, 0.23, -0.25, 0, 0.042);                                      // gas tube
    add(g, G.rbox, M.wood, [0.04, 0.028, 0.2], [0, 0.046, -0.25]);                       // upper handguard
    add(g, G.rbox, M.wood, [0.06, 0.052, 0.23], [0, -0.012, -0.255]);                    // lower handguard
    for (let i = 0; i < 3; i++) add(g, G.box, M.dark, [0.062, 0.004, 0.012], [0, -0.012, -0.32 + i * 0.05]);
    add(g, G.box, M.blued, [0.006, 0.04, 0.012], [0, 0.04, -0.53]); add(g, G.tor, M.blued, [0.014, 0.014, 0.014], [0, 0.05, -0.53], [0, Math.PI / 2, 0]);
    tubeZ(g, M.dark, 0.017, 0.055, -0.615, 0, 0.005);                                     // slant brake
    const mag = new THREE.Group(); mag.position.set(0, -0.03, -0.075); g.add(mag);         // banana magazine
    for (let i = 0; i < 6; i++) { const a = i * 0.11; add(mag, G.rbox, M.bakelite, [0.032, 0.04, 0.075], [0, -0.02 - i * 0.034, -0.012 - Math.sin(a) * 0.09 * i * 0.3], [-a, 0, 0]); }
    const grip = new THREE.Mesh(extrude([[0, 0], [0.045, 0], [0.075, -0.12], [0.04, -0.13], [0.01, -0.03]], 0.035, 0.008), M.bakelite); grip.position.set(0, -0.03, 0.09); g.add(grip);
    const stock = new THREE.Mesh(extrude([[0.0, 0.03], [0.32, -0.0], [0.34, -0.11], [0.3, -0.12], [0.08, -0.05], [0.0, -0.03]], 0.045, 0.01), M.wood); stock.position.set(0, 0, 0.16); g.add(stock);
    add(g, G.rbox, M.rubber, [0.05, 0.13, 0.02], [0, -0.04, 0.505]);
    add(g, G.tor, M.blued, [0.026, 0.026, 0.026], [0, -0.04, 0.06], [0, Math.PI / 2, 0]);
    const bolt = add(g, G.box, M.steel, [0.016, 0.012, 0.03], [0.034, 0.015, 0.05]);    // charging handle
    add(g, G.box, M.blued, [0.026, 0.008, 0.07], [0, 0.056, -0.15], [0.08, 0, 0]);                    // rear sight leaf
    add(g, G.box, M.steel, [0.008, 0.03, 0.05], [0.027, -0.0, 0.08], [0, 0, 0.1]);                    // selector lever
    for (let i = 0; i < 4; i++) for (const x of [-0.026, 0.026]) add(g, G.sph, M.steel, [0.004, 0.004, 0.002], [x, -0.02 + (i % 2) * 0.03, -0.1 + i * 0.07], [0, Math.PI / 2, 0]); // rivets
    for (let i = 0; i < 5; i++) add(mag, G.box, M.dark, [0.034, 0.004, 0.06], [0, -0.035 - i * 0.034, -0.02 - i * 0.012], [-i * 0.11, 0, 0]);  // mag ribs
    hand(g, [0.0, -0.11, 0.13], [0.5, 0, -0.1], 1); const hl = hand(g, [-0.01, -0.06, -0.26], [0.25, 0, 0.15], 0.85); watch(hl);
    const rlA = magReloader({ hand: hl, mag, grab: [0.0, -0.27, -0.14], drop: [-0.16, -0.52, -0.02], bolt: [0.075, 0.03, 0.05], pull: [0, 0, 0.075], bR: [0.3, 0, -1.3] });
    const mz = new THREE.Object3D(); mz.position.set(0, 0.005, -0.65); g.add(mz);
    const ej = new THREE.Object3D(); ej.position.set(0.03, 0.02, 0.0); g.add(ej);
    g.userData = { mz, ej, anim(st) {
      const pull = rlA(st.reloadK); bolt.position.z = 0.05 + recoilBack(st.shotT, 0.05, 0.05) + pull * 0.075;
    } };
    guns.push(g);
  }
  // ======================= 4. M79 GRENADE LAUNCHER =======================
  {
    const g = new THREE.Group();
    const brl = new THREE.Group(); brl.position.set(0, 0.02, -0.03); g.add(brl);
    const tube = new THREE.Mesh(lathe([[0.034, -0.34], [0.038, -0.33], [0.038, -0.01], [0.042, 0.0], [0.042, 0.02], [0.03, 0.02]], 28), M.olive); tube.rotation.x = -Math.PI / 2; brl.add(tube);
    tubeZ(brl, M.dark, 0.028, 0.01, -0.342);
    add(brl, G.rbox, M.wood, [0.07, 0.04, 0.17], [0, -0.045, -0.15]);                   // fore-end
    const sight = new THREE.Group(); sight.position.set(0, 0.045, -0.06); brl.add(sight); // leaf sight frame
    add(sight, G.box, M.dark, [0.004, 0.06, 0.004], [-0.018, 0.03, 0]); add(sight, G.box, M.dark, [0.004, 0.06, 0.004], [0.018, 0.03, 0]); add(sight, G.box, M.dark, [0.04, 0.004, 0.004], [0, 0.06, 0]);
    add(brl, G.box, M.dark, [0.006, 0.014, 0.01], [0, 0.044, -0.32]);
    const shell = new THREE.Group(); brl.add(shell); tubeZ(shell, M.brass, 0.03, 0.04, 0.0); const tip = new THREE.Mesh(lathe([[0.0, 0.05], [0.02, 0.04], [0.03, 0.015], [0.03, 0.0]], 18), M.olive); tip.rotation.x = -Math.PI / 2; tip.position.z = -0.02; shell.add(tip); shell.visible = false;
    add(g, G.rbox, M.blued, [0.074, 0.07, 0.11], [0, 0.0, 0.03]);                        // receiver
    add(g, G.box, M.steel, [0.02, 0.025, 0.04], [0, 0.045, 0.06]);                      // top lever
    add(g, G.tor, M.blued, [0.03, 0.03, 0.03], [0, -0.05, 0.06], [0, Math.PI / 2, 0]);
    const stock = new THREE.Mesh(extrude([[0.0, 0.03], [0.12, 0.02], [0.35, -0.02], [0.37, -0.14], [0.32, -0.15], [0.15, -0.11], [0.08, -0.12], [0.05, -0.05], [0.0, -0.035]], 0.065, 0.014), M.wood); stock.position.set(0, 0, 0.085); g.add(stock);
    add(g, G.rbox, M.rubber, [0.07, 0.17, 0.025], [0, -0.06, 0.445]);
    hand(g, [0.02, -0.1, 0.19], [0.6, 0, -0.2], 1); const hl = hand(g, [-0.005, -0.09, -0.19], [0.2, 0, 0.1], 0.85); watch(hl);
    const mz = new THREE.Object3D(); mz.position.set(0, 0, -0.35); brl.add(mz);
    const ej = new THREE.Object3D(); ej.position.set(0, 0.03, -0.03); g.add(ej);
    g.userData = { mz, ej, anim(st) {
      const k = st.reloadK; let open = 0; if (k >= 0) open = k < 0.18 ? k / 0.18 : k > 0.82 ? (1 - k) / 0.18 : 1;
      brl.rotation.x = open * 0.7; shell.visible = k > 0.35 && k < 0.85; shell.position.z = shell.visible ? Math.max(0, 0.62 - k) * 0.5 : 0;
      sight.rotation.x = -0.2 + Math.sin((st.t || 0) * 2) * 0.02;
    } };
    guns.push(g);
  }
  // ======================= 5. BARRETT .50 =======================
  {
    const g = new THREE.Group();
    tubeZ(g, M.blued, 0.021, 0.62, -0.62, 0, 0.02);
    for (let i = 0; i < 4; i++) { const a = i / 4 * TAU; add(g, G.box, M.dark, [0.006, 0.006, 0.5], [Math.cos(a) * 0.02, 0.02 + Math.sin(a) * 0.02, -0.6]); }
    add(g, G.rbox, M.dark, [0.08, 0.055, 0.13], [0, 0.02, -0.97]);                      // double-chamber brake
    for (const z of [-0.94, -1.0]) for (const x of [-0.041, 0.041]) add(g, G.box, M.rubber, [0.004, 0.035, 0.035], [x, 0.02, z]);
    add(g, G.rbox, M.dark, [0.075, 0.075, 0.5], [0, 0.025, -0.13]);                     // upper receiver / shroud
    for (let i = 0; i < 4; i++) for (const x of [-0.0385, 0.0385]) add(g, G.cyl, M.rubber, [0.012, 0.004, 0.012], [x, 0.03, -0.3 + i * 0.07], [0, 0, Math.PI / 2]);
    add(g, G.box, M.blued, [0.03, 0.012, 0.36], [0, 0.068, -0.08]);                     // rail
    for (let i = 0; i < 14; i++) add(g, G.box, M.dark, [0.032, 0.006, 0.006], [0, 0.076, -0.24 + i * 0.024]);
    add(g, G.rbox, M.blued, [0.064, 0.06, 0.3], [0, -0.035, 0.05]);                      // lower receiver
    const mag = new THREE.Group(); mag.position.set(0, -0.08, -0.03); g.add(mag); add(mag, G.rbox, M.dark, [0.045, 0.11, 0.12], [0, -0.03, 0]); add(mag, G.box, M.brass, [0.03, 0.01, 0.1], [0, 0.03, 0]);
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.08, -0.13], [0.04, -0.14], [0.01, -0.03]], 0.04, 0.008), M.rubber); grip.position.set(0, -0.065, 0.13); g.add(grip);
    add(g, G.rbox, M.dark, [0.055, 0.07, 0.24], [0, -0.01, 0.32]); add(g, G.rbox, M.rubber, [0.065, 0.16, 0.035], [0, -0.03, 0.455]);   // stock + pad
    add(g, G.cyl8, M.dark, [0.01, 0.12, 0.01], [0, -0.1, 0.38]);                         // monopod
    const scope = new THREE.Mesh(lathe([[0.04, -0.2], [0.048, -0.17], [0.03, -0.12], [0.03, 0.1], [0.043, 0.14], [0.045, 0.2]], 28), M.dark);
    scope.rotation.x = -Math.PI / 2; scope.position.set(0, 0.135, -0.07); g.add(scope);
    tubeZ(g, M.glass, 0.042, 0.004, -0.27, 0, 0.135); tubeZ(g, M.lens, 0.04, 0.004, 0.13, 0, 0.135);
    for (const z of [-0.14, 0.0]) add(g, G.rbox, M.blued, [0.045, 0.06, 0.03], [0, 0.1, z]);
    add(g, G.cyl, M.dark, [0.02, 0.04, 0.02], [0, 0.175, -0.07]);
    for (const x of [-0.025, 0.025]) add(g, G.cyl8, M.dark, [0.008, 0.26, 0.008], [x, -0.03, -0.55], [Math.PI / 2, 0, 0]); // folded bipod
    const bolt = add(g, G.box, M.steel, [0.025, 0.02, 0.03], [0.045, 0.02, 0.0]);
    hand(g, [0.0, -0.14, 0.17], [0.55, 0, -0.1], 1); const hl = hand(g, [0.0, -0.06, -0.3], [0.25, 0, 0.1], 0.8); watch(hl);
    const rlB = magReloader({ hand: hl, mag, grab: [0.0, -0.2, -0.03], drop: [-0.18, -0.55, 0.06], bolt: [0.085, 0.03, 0.0], pull: [0, 0, 0.1], bR: [0.3, 0, -1.3] });
    const mz = new THREE.Object3D(); mz.position.set(0, 0.02, -1.04); g.add(mz);
    const ej = new THREE.Object3D(); ej.position.set(0.04, 0.03, -0.02); g.add(ej);
    g.scale.setScalar(0.85); g.position.set(0, -0.02, 0.06);
    g.userData = { mz, ej, anim(st) {
      const pull = rlB(st.reloadK); bolt.position.z = recoilBack(st.shotT, 0.12, 0.08) + pull * 0.1;
    } };
    guns.push(g);
  }
  // ======================= 6. FLAMETHROWER =======================
  {
    const g = new THREE.Group();
    tubeZ(g, M.dark, 0.03, 0.5, -0.14);                                                     // main tube
    const shield = new THREE.Group(); g.add(shield); tubeZ(shield, M.steel, 0.045, 0.3, -0.25);
    for (let r = 0; r < 4; r++) for (let i = 0; i < 8; i++) { const a = i / 8 * TAU + r * 0.4; add(shield, G.cyl8, M.rubber, [0.007, 0.003, 0.007], [Math.cos(a) * 0.0455, Math.sin(a) * 0.0455, -0.36 + r * 0.07], [0, 0, a + Math.PI / 2]); }
    const nozzle = new THREE.Mesh(lathe([[0.03, 0.0], [0.034, 0.03], [0.05, 0.08], [0.046, 0.085], [0.028, 0.035], [0.02, 0.0]], 24), M.nozzleHeat); nozzle.rotation.x = -Math.PI / 2; nozzle.position.z = -0.4; g.add(nozzle);
    add(g, G.box, M.blued, [0.02, 0.025, 0.06], [0, -0.04, -0.44]);                         // igniter
    const pilot = add(g, G.sph, M.pilot, [0.012, 0.016, 0.012], [0, -0.03, -0.48]);
    const tank = new THREE.Group(); tank.position.set(0, -0.1, -0.08); g.add(tank);
    tubeZ(tank, M.red, 0.058, 0.3, 0); tubeZ(tank, M.hazard, 0.059, 0.05, -0.06); tubeZ(tank, M.brass, 0.03, 0.04, 0.17);
    add(tank, G.sph, M.red, [0.058, 0.058, 0.03], [0, 0, -0.15]); add(tank, G.sph, M.red, [0.058, 0.058, 0.03], [0, 0, 0.15]);
    const hosePts = [new THREE.Vector3(0.03, -0.1, 0.12), new THREE.Vector3(0.07, -0.05, 0.12), new THREE.Vector3(0.05, 0.0, 0.05), new THREE.Vector3(0.025, 0.0, -0.02)];
    const hose = new THREE.Mesh(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(hosePts), 20, 0.009, 8), M.rubber); g.add(hose);
    add(g, G.tor, M.red, [0.03, 0.03, 0.03], [-0.04, 0.0, 0.05], [0, Math.PI / 2, 0]);    // valve wheel
    add(g, G.cyl, M.rubber, [0.02, 0.1, 0.02], [0, -0.08, -0.27]);                          // front grip
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.075, -0.12], [0.035, -0.13]], 0.04, 0.008), M.rubber); grip.position.set(0, -0.025, 0.12); g.add(grip);
    tubeZ(g, M.blued, 0.035, 0.16, 0.16);                                                   // rear body
    hand(g, [0.0, -0.1, 0.17], [0.5, 0, -0.1], 1, true); const hl = hand(g, [0.0, -0.13, -0.27], [0.1, 0, 0.0], 1, true); watch(hl);
    const mz = new THREE.Object3D(); mz.position.set(0, 0, -0.49); g.add(mz);
    g.userData = { mz, pilot, anim(st) {
      const t = st.t || 0; const f = 0.85 + Math.sin(t * 40) * 0.1 + Math.random() * 0.1; pilot.scale.set(0.012 * f, 0.018 * f, 0.012 * f);
      M.pilot.emissive.setHex(st.firing ? 0xffa040 : 0x5ab0ff);
      M.nozzleHeat.emissiveIntensity = Math.max(0, Math.min(2.5, M.nozzleHeat.emissiveIntensity + (st.firing ? st.dt * 1.2 : -st.dt * 0.6)));
      tank.rotation.z = st.reloadK >= 0 ? Math.sin(st.reloadK * Math.PI) * 0.4 : 0;
    } };
    guns.push(g);
  }
  // ======================= 7. UZI =======================
  {
    const g = new THREE.Group();
    add(g, G.rbox, M.dark, [0.055, 0.075, 0.26], [0, 0.0, -0.03]);                          // receiver
    add(g, G.box, M.blued, [0.057, 0.01, 0.2], [0, 0.04, -0.04]);
    for (let i = 0; i < 6; i++) add(g, G.box, M.rubber, [0.058, 0.03, 0.006], [0, 0.0, -0.13 + i * 0.012]);
    tubeZ(g, M.blued, 0.011, 0.08, -0.2, 0, 0.0); tubeZ(g, M.dark, 0.016, 0.02, -0.165, 0, 0.0);
    add(g, G.box, M.dark, [0.012, 0.025, 0.012], [0, 0.05, -0.15]); add(g, G.box, M.dark, [0.025, 0.02, 0.012], [0, 0.048, 0.07]);
    const knob = add(g, G.sph, M.steel, [0.012, 0.012, 0.012], [0, 0.048, 0.0]);
    const mag = new THREE.Group(); mag.position.set(0, -0.04, 0.03); g.add(mag);
    add(g, G.rbox, M.rubber, [0.045, 0.13, 0.05], [0, -0.09, 0.03], [0.1, 0, 0]);
    add(mag, G.box, M.blued, [0.03, 0.14, 0.035], [0, -0.13, 0.0], [0.1, 0, 0]);
    add(g, G.tor, M.dark, [0.025, 0.025, 0.025], [0, -0.05, -0.02], [0, Math.PI / 2, 0]);
    for (const x of [-0.03, 0.03]) add(g, G.box, M.steel, [0.006, 0.006, 0.22], [x, 0.0, 0.2]);   // wire stock
    add(g, G.box, M.steel, [0.066, 0.05, 0.008], [0, -0.01, 0.31]);
    hand(g, [0.0, -0.11, 0.06], [0.45, 0, -0.1], 1); const hl = hand(g, [-0.03, -0.08, -0.08], [0.2, 0.3, 0.5], 0.8); watch(hl);
    const rlU = magReloader({ hand: hl, mag, grab: [0.0, -0.26, 0.05], drop: [-0.14, -0.5, 0.12], bolt: [0.0, 0.085, -0.01], pull: [0, 0, 0.06], bR: [-0.7, 0, 0.2] });
    const mz = new THREE.Object3D(); mz.position.set(0, 0.0, -0.25); g.add(mz);
    const ej = new THREE.Object3D(); ej.position.set(0.03, 0.03, -0.03); g.add(ej);
    g.scale.setScalar(1.15); g.position.set(-0.03, 0.05, 0);
    g.userData = { mz, ej, anim(st) { const pull = rlU(st.reloadK); knob.position.z = recoilBack(st.shotT, 0.04, 0.04) + pull * 0.06; } };
    guns.push(g);
  }
  // ======================= 8. M4 AUTO SHOTGUN =======================
  {
    const g = new THREE.Group();
    add(g, G.rbox, M.dark, [0.055, 0.075, 0.24], [0, 0.0, 0.0]);
    tubeZ(g, M.blued, 0.017, 0.48, -0.36, 0, 0.018); tubeZ(g, M.dark, 0.02, 0.4, -0.32, 0, -0.024);     // barrel + mag tube
    add(g, G.box, M.dark, [0.012, 0.014, 0.012], [0, 0.04, -0.58]);
    add(g, G.rbox, M.rubber, [0.06, 0.05, 0.2], [0, -0.03, -0.24]);                                      // forend
    add(g, G.box, M.blued, [0.02, 0.012, 0.2], [0, 0.045, 0.0]);
    for (const x of [-0.012, 0.012]) add(g, G.box, M.dark, [0.005, 0.025, 0.012], [x, 0.06, 0.08]);
    const bolt = add(g, G.box, M.steel, [0.02, 0.015, 0.03], [0.03, 0.01, -0.02]);
    const shell = new THREE.Group(); g.add(shell); tubeZ(shell, M.red, 0.016, 0.06, 0); tubeZ(shell, M.brass, 0.017, 0.012, 0.035); shell.position.set(0, -0.05, 0.02); shell.visible = false;
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.08, -0.12], [0.04, -0.13], [0.01, -0.03]], 0.04, 0.008), M.rubber); grip.position.set(0, -0.035, 0.1); g.add(grip);
    add(g, G.rbox, M.rubber, [0.05, 0.08, 0.28], [0, -0.02, 0.32]); add(g, G.rbox, M.rubber, [0.06, 0.13, 0.03], [0, -0.04, 0.47]);
    add(g, G.tor, M.dark, [0.026, 0.026, 0.026], [0, -0.045, 0.06], [0, Math.PI / 2, 0]);
    hand(g, [0.0, -0.11, 0.14], [0.5, 0, -0.1], 1); const hl = hand(g, [-0.01, -0.07, -0.24], [0.25, 0, 0.12], 0.85); watch(hl);
    for (const z of [0.07, -0.02]) add(g, G.tor, M.dark, [0.012, 0.012, 0.012], [0, 0.07, z], [0, 0, 0]); add(g, G.box, M.dark, [0.004, 0.02, 0.004], [0, 0.065, -0.57]);
    const hlP = hl.position.toArray(), hlR = [hl.rotation.x, hl.rotation.y, hl.rotation.z];
    const mz = new THREE.Object3D(); mz.position.set(0, 0.018, -0.6); g.add(mz);
    const ej = new THREE.Object3D(); ej.position.set(0.035, 0.02, -0.02); g.add(ej);
    g.userData = { mz, ej, anim(st) { const k = st.reloadK; bolt.position.z = -0.02 + recoilBack(st.shotT, 0.07, 0.05) + (k > 0.85 ? Math.sin((k - 0.85) / 0.15 * Math.PI) * 0.06 : 0);
      if (k < 0 || k > 0.86) { const r = k > 0.86 ? sm((k - 0.86) / 0.14) : 1; hl.position.set(hlP[0] * r + (1 - r) * -0.02, hlP[1] * r + (1 - r) * -0.2, hlP[2] * r + (1 - r) * 0.0); hl.rotation.set(hlR[0], hlR[1], hlR[2]); shell.visible = false; return; }
      const c = Math.min(3.999, (k - 0.02) / 0.21), f = c - Math.floor(c), up = f < 0.45 ? sm(f / 0.45) : 1, push = f > 0.55 ? sm(Math.min(1, (f - 0.55) / 0.3)) : 0;
      const hx = -0.02 - (1 - up) * 0.1, hy = -0.32 + up * 0.2, hz = 0.0 + (1 - up) * 0.06 - push * 0.07;
      hl.position.set(hx, hy, hz); hl.rotation.set(1.3, 0, 0.25 + (1 - up) * 0.5);
      shell.visible = f > 0.05 && f < 0.85; shell.position.set(hx + 0.01, hy + 0.06, hz - 0.03); shell.rotation.set(0, 0, 0); } };
    guns.push(g);
  }
  // ======================= 9. M60 =======================
  {
    const g = new THREE.Group();
    add(g, G.rbox, M.olive, [0.07, 0.085, 0.32], [0, 0.0, 0.0]);
    const cover = new THREE.Group(); cover.position.set(0, 0.045, 0.1); g.add(cover); add(cover, G.rbox, M.olive, [0.072, 0.02, 0.18], [0, 0, -0.09]);
    tubeZ(g, M.dark, 0.016, 0.62, -0.5, 0, 0.012);
    const shroud = tubeZ(g, M.blued, 0.03, 0.26, -0.3, 0, 0.012); for (let i = 0; i < 6; i++) for (const x of [-0.031, 0.031]) add(g, G.cyl8, M.rubber, [0.008, 0.004, 0.008], [x, 0.012, -0.4 + i * 0.04], [0, 0, Math.PI / 2]);
    tubeZ(g, M.dark, 0.022, 0.06, -0.8, 0, 0.012);
    add(g, G.box, M.dark, [0.012, 0.03, 0.012], [0, 0.05, -0.78]);
    add(g, G.tor, M.dark, [0.04, 0.04, 0.04], [0, 0.09, -0.12], [0, 0, 0]);                              // carry handle
    for (const x of [-0.02, 0.02]) add(g, G.cyl8, M.dark, [0.007, 0.36, 0.007], [x, -0.03, -0.62], [Math.PI / 2, 0, 0]); // bipod folded
    const box = new THREE.Group(); box.position.set(-0.075, -0.06, -0.02); g.add(box); add(box, G.rbox, M.olive, [0.08, 0.13, 0.17], [0, 0, 0]);
    const belt = []; for (let i = 0; i < 10; i++) { const b = new THREE.Group(); b.position.set(0.045 + i * 0.002, 0.05 + i * 0.006, 0.0 - i * 0.0); add(b, G.cyl, M.brass, [0.006, 0.05, 0.006], [0, 0, 0], [0, 0, Math.PI / 2]); add(b, G.cone, M.brass, [0.006, 0.014, 0.006], [-0.03, 0, 0], [0, 0, Math.PI / 2]); b.position.set(0.04 + i * 0.0, 0.04 + i * 0.006, -0.06 + i * 0.012); box.add(b); belt.push(b); }
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.08, -0.12], [0.04, -0.13], [0.01, -0.03]], 0.04, 0.008), M.rubber); grip.position.set(0, -0.04, 0.12); g.add(grip);
    add(g, G.rbox, M.rubber, [0.055, 0.09, 0.3], [0, -0.03, 0.32]); add(g, G.rbox, M.rubber, [0.065, 0.15, 0.03], [0, -0.04, 0.48]);
    hand(g, [0.0, -0.12, 0.16], [0.5, 0, -0.1], 1); const hl = hand(g, [-0.02, -0.07, -0.3], [0.25, 0, 0.15], 0.85); watch(hl);
    const rlM = magReloader({ hand: hl, mag: box, grab: [-0.1, -0.16, -0.02], drop: [-0.25, -0.55, 0.05], bolt: [0.0, 0.1, 0.06], pull: [0, -0.035, 0], bR: [-0.9, 0, 0.1] });
    const mz = new THREE.Object3D(); mz.position.set(0, 0.012, -0.84); g.add(mz);
    const ej = new THREE.Object3D(); ej.position.set(0.04, 0.0, 0.0); g.add(ej);
    g.scale.setScalar(0.92); g.position.set(0, -0.01, 0.05);
    g.userData = { mz, ej, anim(st) { const k = st.reloadK; rlM(k); cover.rotation.x = k > 0.06 && k < 0.86 ? -Math.min(1, (k - 0.06) * 8, (0.86 - k) * 12) * 1.15 : 0;
      belt.forEach((b, i) => b.visible = k >= 0 ? k > 0.6 : i < Math.ceil((st.mag || 0) / 10)); } };
    guns.push(g);
  }
  // ======================= 10. RPG-7 =======================
  {
    const g = new THREE.Group();
    tubeZ(g, M.olive, 0.035, 0.95, -0.12, 0, 0.03);
    tubeZ(g, M.wood, 0.045, 0.24, -0.05, 0, 0.03);                                                        // wooden heat guard
    const flare = new THREE.Mesh(lathe([[0.035, 0], [0.06, 0.12], [0.065, 0.14], [0.04, 0.02]], 22), M.olive); flare.rotation.x = Math.PI / 2; flare.position.set(0, 0.03, 0.33); g.add(flare);
    const war = new THREE.Group(); war.position.set(0, 0.03, -0.62); g.add(war);
    const wh = new THREE.Mesh(lathe([[0.0, 0.0], [0.03, 0.03], [0.07, 0.15], [0.075, 0.2], [0.06, 0.26], [0.025, 0.3], [0.02, 0.36]], 22), new THREE.MeshStandardMaterial({ color: 0x4a5a2a, roughness: 0.55, metalness: 0.3 }));
    wh.rotation.x = -Math.PI / 2; wh.position.z = 0.0; war.add(wh); tubeZ(war, M.dark, 0.02, 0.12, 0.05);
    add(g, G.box, M.dark, [0.03, 0.06, 0.06], [-0.04, 0.09, -0.1]); tubeZ(g, M.glass, 0.012, 0.08, -0.1, -0.04, 0.12);
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.08, -0.12], [0.04, -0.13], [0.01, -0.03]], 0.04, 0.008), M.wood); grip.position.set(0, -0.005, 0.02); g.add(grip);
    const grip2 = new THREE.Mesh(extrude([[0, 0], [0.04, 0], [0.06, -0.1], [0.03, -0.11]], 0.035, 0.008), M.wood); grip2.position.set(0, -0.005, -0.26); g.add(grip2);
    hand(g, [0.0, -0.08, 0.06], [0.5, 0, -0.1], 1); const hl = hand(g, [0.0, -0.08, -0.22], [0.45, 0, 0.0], 0.95); watch(hl);
    const rP = hl.position.toArray(), rR = [hl.rotation.x, hl.rotation.y, hl.rotation.z];
    const HK = [[0, rP], [0.25, [-0.2, -0.45, -0.3]], [0.42, [-0.12, -0.25, -0.75]], [0.55, [0.0, -0.06, -0.98]], [0.66, [0.0, -0.06, -0.74]], [0.75, [0.0, -0.06, -0.74]], [1, rP]];
    const HR = [[0, rR], [0.25, [0.9, 0, 0.6]], [0.55, [0.6, 0, 0.1]], [0.75, [0.6, 0, 0.1]], [1, rR]];
    const mz = new THREE.Object3D(); mz.position.set(0, 0.03, -0.62); g.add(mz);
    g.position.set(0.06, -0.03, -0.12); g.scale.setScalar(0.9);
    g.userData = { mz, anim(st) { const k = st.reloadK;
      if (k < 0) { hl.position.fromArray(rP); hl.rotation.set(rR[0], rR[1], rR[2]); war.position.set(0, 0.03, -0.62); war.visible = (st.mag || 0) > 0; return; }
      const p = kf(k, HK), r = kf(k, HR); hl.position.fromArray(p); hl.rotation.set(r[0], r[1], r[2]);
      war.visible = k > 0.25; if (k < 0.66) war.position.set(p[0], p[1] + 0.09, p[2] - 0.12); else war.position.set(0, 0.03, -0.62); } };
    guns.push(g);
  }
  // ======================= 11-13. MELEE: machete, katana, sledgehammer =======================
  function bladeShape(len, w, curve) { const s = new THREE.Shape(); s.moveTo(0, -w * 0.4); s.quadraticCurveTo(len * 0.5, -w * 0.5 + curve, len, curve * 0.6 + w * 0.15); s.lineTo(len * 0.92, w * 0.5 + curve * 0.4); s.quadraticCurveTo(len * 0.5, w * 0.5 + curve * 0.7, 0, w * 0.4); s.closePath();
    const geo = new THREE.ExtrudeGeometry(s, { depth: 0.006, bevelEnabled: true, bevelThickness: 0.002, bevelSize: 0.003, bevelSegments: 1, curveSegments: 10 }); geo.translate(0, 0, -0.003); geo.rotateZ(Math.PI / 2); return geo; }
  M.edge = new THREE.MeshStandardMaterial({ color: 0xd8dce4, metalness: 1, roughness: 0.18, envMapIntensity: 1.6 });
  M.blood = new THREE.MeshStandardMaterial({ color: 0x5a0606, roughness: 0.25, metalness: 0.2 });
  function meleeHold(g, twoHand) { hand(g, [0, -0.0, 0.0], [0.0, 0, 0.0], 1.15); if (twoHand) { const h2 = hand(g, [0.0, -0.11, 0.0], [0.0, 0, 0.0], 1.15); watch(h2); } }
  {
    const g = new THREE.Group(); const hold = new THREE.Group(); g.add(hold); hold.rotation.set(-0.55, 0, 0.5);
    add(hold, G.cyl, M.wood, [0.017, 0.13, 0.02], [0, -0.02, -0.04]); add(hold, G.box, M.brass, [0.008, 0.008, 0.02], [0, 0.02, -0.04]);
    const bl = new THREE.Mesh(bladeShape(0.36, 0.085, 0.03), M.edge); bl.rotation.y = Math.PI / 2; bl.position.set(0, 0.04, -0.04); hold.add(bl);
    const bs = new THREE.Mesh(bladeShape(0.16, 0.06, 0.015), M.blood); bs.rotation.y = Math.PI / 2; bs.position.set(0.002, 0.25, -0.04); hold.add(bs);
    meleeHold(hold, false); g.position.set(0.04, -0.06, 0.05);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.3, -0.04); hold.add(mz);
    g.userData = { mz, melee: true, anim() {} }; guns.push(g);
  }
  {
    const g = new THREE.Group(); const hold = new THREE.Group(); g.add(hold); hold.rotation.set(-0.3, 0, 0.25);
    add(hold, G.cyl, M.rubber, [0.017, 0.24, 0.02], [0, -0.06, -0.04]); for (let i = 0; i < 7; i++) add(hold, G.box, M.white, [0.036, 0.008, 0.004], [0, -0.16 + i * 0.03, -0.02], [0, 0, i % 2 ? 0.5 : -0.5]);
    add(hold, G.cyl, M.gold, [0.04, 0.008, 0.03], [0, 0.065, -0.04]);
    const bl = new THREE.Mesh(bladeShape(0.78, 0.035, 0.035), M.edge); bl.rotation.y = Math.PI / 2; bl.position.set(0, 0.07, -0.04); hold.add(bl);
    meleeHold(hold, true); g.position.set(0.03, -0.04, 0.05);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.8, -0.04); hold.add(mz);
    g.userData = { mz, melee: true, anim() {} }; guns.push(g);
  }
  {
    const g = new THREE.Group(); const hold = new THREE.Group(); g.add(hold); hold.rotation.set(-0.2, 0, 0.3);
    add(hold, G.cyl, M.wood, [0.02, 0.62, 0.022], [0, 0.17, -0.04]);
    add(hold, G.rbox, M.steel, [0.09, 0.09, 0.2], [0, 0.5, -0.04]); add(hold, G.box, M.dark, [0.092, 0.02, 0.202], [0, 0.47, -0.04]);
    meleeHold(hold, true); g.position.set(0.03, -0.08, 0.05);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.5, -0.04); hold.add(mz);
    g.userData = { mz, melee: true, anim() {} }; guns.push(g);
  }
  // ======================= FIST (melee / glory kill) =======================
  const fist = new THREE.Group();
  { const h = hand(fist, [0, 0, 0], [0, 0, 0], 1.6); h.scale.setScalar(1.25);
    add(h, G.box, M.brass, [0.09, 0.025, 0.02], [0, 0.012, -0.062]);           // knuckle duster
    for (let i = 0; i < 4; i++) add(h, G.tor, M.brass, [0.013, 0.013, 0.013], [-0.03 + i * 0.02, 0.0, -0.062], [Math.PI / 2, 0, 0]);
  }
  for (const gm of [...guns, fist]) gm.traverse(o => { if (o.isMesh) { o.castShadow = false; o.receiveShadow = false; o.frustumCulled = false; } });
  return { guns, fist, M };
}

function hazardMat() {
  const c = document.createElement('canvas'); c.width = 128; c.height = 32; const g = c.getContext('2d');
  g.fillStyle = '#1a1414'; g.fillRect(0, 0, 128, 32); g.fillStyle = '#ffb000';
  for (let x = -32; x < 128; x += 32) { g.beginPath(); g.moveTo(x, 32); g.lineTo(x + 16, 0); g.lineTo(x + 32, 0); g.lineTo(x + 16, 32); g.fill(); }
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace;
  return new THREE.MeshStandardMaterial({ map: t, roughness: 0.5, metalness: 0.3 });
}
