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
    skin: new THREE.MeshStandardMaterial({ color: 0xc98a5e, roughness: 0.62 }),
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
    g.userData = { mz, brl, shells, handL };
    guns.push(g);
  }
  // ======================= 2. CHAINGUN =======================
  {
    const g = new THREE.Group();
    const rot = new THREE.Group(); rot.position.set(0, 0.0, -0.18); g.add(rot);
    const barrels = [];
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; barrels.push(tubeZ(rot, M.heat, 0.014, 0.58, -0.12, Math.cos(a) * 0.04, Math.sin(a) * 0.04)); }
    for (const z of [-0.38, -0.12, 0.12]) tubeZ(rot, M.steel, 0.06, 0.025, z, 0, 0, G.cyl8);
    tubeZ(rot, M.dark, 0.012, 0.6, -0.12);                                   // spindle
    // housing + motor
    add(g, G.rbox, M.blued, [0.15, 0.15, 0.24], [0, 0.0, 0.08]);
    tubeZ(g, M.dark, 0.06, 0.1, 0.24);
    for (let i = 0; i < 5; i++) add(g, G.box, M.steel, [0.155, 0.006, 0.02], [0, 0.04 - i * 0.02, 0.0 + i * 0.0]);
    // carry handle
    const hdl = add(g, G.tor, M.dark, [0.045, 0.045, 0.045], [0, 0.075, 0.08], [0, Math.PI / 2, 0]); hdl.geometry = new THREE.TorusGeometry(1, 0.16, 8, 20, Math.PI);
    // ammo box + belt
    add(g, G.rbox, M.olive, [0.1, 0.13, 0.17], [0.13, -0.06, 0.1]);
    add(g, G.box, M.hazard, [0.102, 0.03, 0.172], [0.13, -0.01, 0.1]);
    const belt = new THREE.Group(); g.add(belt);
    for (let i = 0; i < 9; i++) { const t = i / 8; const b = new THREE.Group(); b.position.set(0.11 - t * 0.09, 0.02 + Math.sin(t * Math.PI) * 0.04, 0.07 - t * 0.02); b.rotation.z = Math.PI / 2; tubeZ(b, M.brass, 0.008, 0.05, 0); belt.add(b); }
    add(g, G.box, M.redGlow, [0.004, 0.05, 0.12], [-0.077, 0.02, 0.08]);
    hand(g, [-0.02, -0.11, 0.2], [0.5, 0, -0.1], 1); const hl = hand(g, [-0.06, -0.09, -0.02], [0.3, 0.3, 0.6], 0.9); watch(hl);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.0, -0.62); g.add(mz);
    g.userData = { mz, rot, barrels, heatMat: M.heat, belt };
    guns.push(g);
  }
  // ======================= 3. ROCKET LAUNCHER (ปลาทู) =======================
  {
    const g = new THREE.Group();
    const tube = new THREE.Mesh(lathe([[0.075, -0.45], [0.09, -0.42], [0.09, 0.3], [0.11, 0.38], [0.11, 0.42], [0.095, 0.42]], 28), M.olive);
    tube.rotation.x = -Math.PI / 2; tube.position.set(0, 0.04, -0.12); g.add(tube);
    tubeZ(g, M.dark, 0.076, 0.02, -0.57, 0, 0.04);
    for (const z of [-0.45, -0.1, 0.18]) tubeZ(g, M.dark, 0.093, 0.03, z, 0, 0.04);
    add(g, G.box, M.hazard, [0.004, 0.06, 0.2], [0.091, 0.04, -0.3]); add(g, G.box, M.hazard, [0.004, 0.06, 0.2], [-0.091, 0.04, -0.3]);
    // rocket warhead peeking out
    const tip = new THREE.Group(); tip.position.set(0, 0.04, -0.55); g.add(tip);
    const head = new THREE.Mesh(lathe([[0.0, 0.14], [0.02, 0.12], [0.05, 0.06], [0.06, 0.0], [0.06, -0.04]]), M.red); head.rotation.x = -Math.PI / 2; tip.add(head);
    tubeZ(tip, M.steel, 0.061, 0.02, 0.03);
    // sight, grip, trigger
    add(g, G.rbox, M.dark, [0.05, 0.06, 0.09], [0.07, 0.13, -0.1]);
    tubeZ(g, M.glass, 0.018, 0.005, -0.146, 0.07, 0.14);
    add(g, G.box, M.greenGlow, [0.006, 0.006, 0.006], [0.07, 0.14, -0.05]);
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.07, -0.13], [0.03, -0.14]], 0.04, 0.008), M.rubber); grip.position.set(0, -0.04, 0.0); g.add(grip);
    const grip2 = grip.clone(); grip2.position.set(0, -0.04, -0.26); g.add(grip2);
    hand(g, [0.0, -0.12, 0.06], [0.5, 0, -0.1], 1); const hl = hand(g, [0.0, -0.12, -0.21], [0.45, 0, 0.1], 1); watch(hl);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.04, -0.62); g.add(mz);
    g.userData = { mz, tip };
    guns.push(g);
  }
  // ======================= 4. PLASMA RIFLE =======================
  {
    const g = new THREE.Group();
    const body = new THREE.Mesh(extrude([[-0.12, 0.06], [0.2, 0.065], [0.24, 0.02], [0.24, -0.05], [0.16, -0.07], [0.06, -0.07], [-0.3, -0.04], [-0.36, 0.0], [-0.34, 0.04]], 0.1, 0.02), M.white);
    g.add(body);
    add(g, G.box, M.dark, [0.104, 0.012, 0.5], [0, 0.0, -0.05]);
    // barrel with glowing coils
    tubeZ(g, M.dark, 0.028, 0.32, -0.46, 0, 0.0);
    const coils = [];
    for (let i = 0; i < 5; i++) { const c = add(g, G.tor, M.blueGlow, [0.04, 0.04, 0.04], [0, 0.0, -0.34 - i * 0.055]); coils.push(c); }
    tubeZ(g, M.steel, 0.034, 0.03, -0.62);
    // energy cell (transparent with glowing core)
    const cell = new THREE.Group(); cell.position.set(0.0, 0.1, 0.02); g.add(cell);
    tubeZ(cell, new THREE.MeshPhysicalMaterial({ color: 0x8fd8ff, transparent: true, opacity: 0.35, roughness: 0.05, transmission: 0 }), 0.03, 0.16, 0);
    const core = tubeZ(cell, M.blueGlow, 0.014, 0.15, 0);
    tubeZ(cell, M.steel, 0.032, 0.02, -0.085); tubeZ(cell, M.steel, 0.032, 0.02, 0.085);
    add(g, G.box, M.blueGlow, [0.002, 0.012, 0.3], [0.051, 0.03, -0.05]); add(g, G.box, M.blueGlow, [0.002, 0.012, 0.3], [-0.051, 0.03, -0.05]);
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.08, -0.12], [0.035, -0.13]], 0.04, 0.008), M.rubber); grip.position.set(0, -0.06, 0.06); g.add(grip);
    hand(g, [0.0, -0.13, 0.12], [0.5, 0, -0.1], 1); const hl = hand(g, [0.0, -0.08, -0.22], [0.2, 0, 0.1], 0.8); watch(hl);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.0, -0.66); g.add(mz);
    g.userData = { mz, coils, core };
    guns.push(g);
  }
  // ======================= 5. SNIPER RIFLE =======================
  {
    const g = new THREE.Group();
    tubeZ(g, M.blued, 0.017, 0.62, -0.52, 0, 0.02);
    // fluted muzzle brake
    add(g, G.rbox, M.dark, [0.05, 0.04, 0.08], [0, 0.02, -0.86]);
    for (const x of [-0.026, 0.026]) for (let i = 0; i < 3; i++) add(g, G.box, M.steel, [0.004, 0.024, 0.012], [x, 0.02, -0.89 + i * 0.025]);
    // chassis (tan) + stock
    const tanM = new THREE.MeshStandardMaterial({ color: 0x8a7650, roughness: 0.65, metalness: 0.1 });
    const chassis = new THREE.Mesh(extrude([[-0.38, 0.04], [0.02, 0.04], [0.04, 0.0], [0.06, -0.03], [0.12, -0.03], [0.16, -0.14], [0.11, -0.15], [0.07, -0.05], [-0.1, -0.05], [-0.38, -0.02]], 0.07, 0.01), tanM);
    chassis.position.set(0, -0.02, 0.0); g.add(chassis);
    const stock = new THREE.Mesh(extrude([[0.12, 0.02], [0.44, 0.02], [0.46, -0.13], [0.42, -0.14], [0.3, -0.06], [0.16, -0.05]], 0.05, 0.012), tanM); stock.position.set(0, -0.02, 0); g.add(stock);
    add(g, G.rbox, M.rubber, [0.055, 0.15, 0.03], [0, -0.07, 0.465]);
    add(g, G.rbox, M.blued, [0.06, 0.06, 0.22], [0, 0.03, 0.0]);              // action
    // scope
    const scope = new THREE.Mesh(lathe([[0.034, -0.17], [0.04, -0.14], [0.026, -0.1], [0.026, 0.08], [0.036, 0.12], [0.038, 0.17]], 28), M.dark);
    scope.rotation.x = -Math.PI / 2; scope.position.set(0, 0.105, -0.03); g.add(scope);
    tubeZ(g, M.glass, 0.035, 0.004, -0.2, 0, 0.105); tubeZ(g, M.glass, 0.032, 0.004, 0.14, 0, 0.105);
    add(g, G.cyl, M.dark, [0.018, 0.04, 0.018], [0, 0.14, -0.03]); add(g, G.cyl, M.dark, [0.018, 0.04, 0.018], [0.035, 0.105, -0.03], [0, 0, Math.PI / 2]);
    for (const z of [-0.08, 0.04]) add(g, G.box, M.blued, [0.03, 0.05, 0.025], [0, 0.065, z]);
    const bolt = new THREE.Group(); bolt.position.set(0.04, 0.035, 0.07); g.add(bolt);
    add(bolt, G.cyl, M.steel, [0.007, 0.05, 0.007], [0.02, 0, 0], [0, 0, Math.PI / 2]); add(bolt, G.sph, M.dark, [0.014, 0.014, 0.014], [0.048, 0, 0]);
    // folded bipod
    for (const x of [-0.02, 0.02]) add(g, G.cyl8, M.dark, [0.006, 0.18, 0.006], [x, -0.07, -0.3], [Math.PI / 2, 0, 0]);
    hand(g, [0.0, -0.12, 0.16], [0.55, 0, -0.1], 1); const hl = hand(g, [0.0, -0.09, -0.24], [0.25, 0, 0.1], 0.8); watch(hl);
    const mz = new THREE.Object3D(); mz.position.set(0, 0.02, -0.92); g.add(mz);
    g.userData = { mz, bolt };
    guns.push(g);
  }
  // ======================= 6. HOLY-WATER CANNON (BFG) =======================
  {
    const g = new THREE.Group();
    const goldTrim = M.gold;
    // chunky body
    add(g, G.rbox, M.blued, [0.16, 0.14, 0.34], [0, 0.0, -0.02]);
    add(g, G.box, goldTrim, [0.162, 0.012, 0.3], [0, 0.05, -0.02]); add(g, G.box, goldTrim, [0.162, 0.012, 0.3], [0, -0.05, -0.02]);
    // glass orb chamber with swirling holy water
    const orbMat = new THREE.MeshStandardMaterial({ color: 0x0a2a10, emissive: 0x6aff4a, emissiveIntensity: 2.2, transparent: true, opacity: 0.9 });
    const orb = add(g, G.sph, orbMat, [0.055, 0.055, 0.055], [0, 0.09, -0.06]);
    add(g, G.sph, new THREE.MeshPhysicalMaterial({ color: 0xbfffd0, transparent: true, opacity: 0.25, roughness: 0.02, clearcoat: 1 }), [0.066, 0.066, 0.066], [0, 0.09, -0.06]);
    add(g, G.tor, goldTrim, [0.066, 0.066, 0.066], [0, 0.09, -0.06], [Math.PI / 2, 0, 0]);
    // wide muzzle with petals (lotus) — Thai temple vibe
    const mouth = new THREE.Mesh(lathe([[0.05, 0], [0.09, 0.05], [0.12, 0.12], [0.1, 0.13], [0.07, 0.07], [0.045, 0.06]], 24), goldTrim);
    mouth.rotation.x = -Math.PI / 2; mouth.position.set(0, 0, -0.2); g.add(mouth);
    tubeZ(g, M.dark, 0.05, 0.12, -0.25);
    const core = add(g, G.sph, M.greenGlow, [0.04, 0.04, 0.04], [0, 0, -0.31]);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; const pt = add(g, G.cone, goldTrim, [0.02, 0.06, 0.008], [Math.cos(a) * 0.1, Math.sin(a) * 0.1, -0.33], [Math.PI / 2, 0, 0]); pt.rotation.z = a; }
    // hanging amulet (พระเครื่อง) on a string
    const am = new THREE.Group(); am.position.set(0.085, -0.02, 0.06); g.add(am);
    add(am, G.cyl8, M.dark, [0.002, 0.05, 0.002], [0, -0.025, 0]);
    add(am, G.rbox, goldTrim, [0.004, 0.035, 0.025], [0, -0.065, 0]);
    add(am, G.box, M.greenGlow, [0.005, 0.02, 0.012], [0, -0.065, 0]);
    // yantra glyph plates
    add(g, G.box, M.greenGlow, [0.002, 0.04, 0.12], [0.081, 0.0, -0.02]); add(g, G.box, M.greenGlow, [0.002, 0.04, 0.12], [-0.081, 0.0, -0.02]);
    const grip = new THREE.Mesh(extrude([[0, 0], [0.05, 0], [0.075, -0.12], [0.035, -0.13]], 0.045, 0.008), M.rubber); grip.position.set(0, -0.06, 0.1); g.add(grip);
    hand(g, [0.0, -0.13, 0.16], [0.5, 0, -0.1], 1); const hl = hand(g, [-0.07, -0.06, -0.12], [0.2, 0.3, 0.7], 0.8); watch(hl);
    const mz = new THREE.Object3D(); mz.position.set(0, 0, -0.36); g.add(mz);
    g.scale.setScalar(0.82); g.position.set(0.02, -0.02, 0.03);
    g.scale.setScalar(0.82); g.position.set(0.02, -0.02, 0.03);
    g.userData = { mz, orb, orbMat, core, am };
    guns.push(g);
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
