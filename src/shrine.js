// Level 3: the Yokai Shrine - a haunted Shinto shrine on a mountain at night, under a blood moon.
// Same contract as world.js / rome.js (statics, obstacles, ambient, bakeEnv, free ...) and built under one root group.
import * as THREE from 'three';
import { A, tex, pbr, Builder, srnd, srg, setSeed } from './world.js';

const TAU = Math.PI * 2, PI = Math.PI;
const spick = a => a[(srnd() * a.length) | 0];
export function preloadShrine() {
  const names = ['gravel_c.jpg', 'gravel_n.jpg', 'gravel_orm.jpg', 'kawara_c.jpg', 'kawara_n.jpg', 'kawara_orm.jpg', 'lacq_c.jpg', 'lacq_n.jpg', 'lacq_orm.jpg',
    'ashlar_c.jpg', 'ashlar_n.jpg', 'ashlar_orm.jpg', 'wood_c.jpg', 'wood_n.jpg', 'wood_orm.jpg', 'plaster_c.jpg', 'plaster_n.jpg', 'plaster_orm.jpg'];
  return Promise.all(names.map(n => new Promise(res => {
    const t = tex(n, /_c\./.test(n)); if (t.image) res(); else { const i = setInterval(() => { if (t.image) { clearInterval(i); res(); } }, 30); setTimeout(() => { clearInterval(i); res(); }, 15000); }
  })));
}

function shrineSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `varying vec3 vDir; uniform float uTime;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 top = vec3(0.006,0.008,0.03), mid = vec3(0.07,0.03,0.12), hor = vec3(0.42,0.08,0.12);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.2, y)); col = mix(col, top, smoothstep(0.18, 0.7, y));
        // blood moon
        vec3 md = normalize(vec3(-0.35, 0.36, -0.86)); float m = dot(d, md);
        float disc = smoothstep(0.9978, 0.9982, m);
        vec2 mu = (d.xy - md.xy) * 60.0; float crater = fbm(mu * 1.7 + 4.0);
        vec3 moon = mix(vec3(1.25,0.22,0.08), vec3(0.6,0.06,0.03), smoothstep(0.35, 0.75, crater));
        col += vec3(0.9,0.12,0.06) * pow(max(m,0.0), 160.0) * 1.4 + vec3(0.5,0.06,0.08) * pow(max(m,0.0), 18.0) * 0.5;
        col = mix(col, moon, disc);
        // thin drifting clouds crossing the moon
        vec2 uv = d.xz / max(0.08, y + 0.2) * 1.3 + vec2(uTime*0.008, uTime*0.002);
        float c = fbm(uv); float cl = smoothstep(0.5, 0.85, c) * smoothstep(-0.02, 0.25, y);
        vec3 cc = mix(vec3(0.35,0.06,0.1), vec3(0.04,0.02,0.07), smoothstep(0.0, 0.45, y)) + vec3(0.6,0.08,0.05) * pow(max(m,0.0), 30.0);
        col = mix(col, cc, cl * 0.85);
        float s = step(0.9975, h(floor(d.xz/(y+0.3)*300.0))) * smoothstep(0.2, 0.7, y);
        col += vec3(0.8,0.75,1.0) * s * 0.6;
        col = max(col, vec3(0.0)); col = mix(col, vec3(0.05,0.02,0.05), smoothstep(0.02,-0.08,y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10; return m;
}
function canvasTex(w, h, draw) { const c = document.createElement('canvas'); c.width = w; c.height = h; draw(c.getContext('2d'), w, h); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t; }

export function buildShrine(S0, renderer, quality) {
  setSeed(9120443);
  const scene = new THREE.Group(); scene.name = 'world3'; S0.add(scene);
  const statics = [], obstacles = [], lights = [];
  const B = new Builder();
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false }), proxyGeo = new THREE.BoxGeometry(1, 1, 1);
  function proxy(x, y, z, w, h, d) { const m = new THREE.Mesh(proxyGeo, proxyMat); m.position.set(x, y, z); m.scale.set(w, h, d); m.updateMatrixWorld(true); m.matrixAutoUpdate = false; scene.add(m); statics.push(m); return m; }
  function obstacle(x, z, w, d, h, opts = {}) { const o = Object.assign({ x, z, hw: w / 2, hd: d / 2, h }, opts); obstacles.push(o); if (!opts.noProxy) o.mesh = proxy(x, h / 2, z, w, h, d); return o; }
  const inside = (x, z, r) => { for (const o of obstacles) if (Math.abs(x - o.x) < o.hw + r && Math.abs(z - o.z) < o.hd + r) return true; return false; };
  const free = (x, z, r) => { if (Math.abs(x) > A - 4 || Math.abs(z) > A - 4) return false; if (Math.abs(x) < 7 && z > -12 && z < 12) return false; return !inside(x, z, r); };
  // box yawed by ry after a local tilt rx/rz (Euler YXZ), with world UVs
  const boxY = (mat, w, h, d, x, y, z, ry, col, ts, rx = 0, rz = 0) => B.geo(mat, new THREE.BoxGeometry(w, h, d), new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz, 'YXZ')), new THREE.Vector3(1, 1, 1)), col, ts);
  const T = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));

  // ----- materials -----
  const M = {
    gravel: pbr('gravel', { extra: { color: 0x7a7884 } }),
    stone: pbr('ashlar', { extra: { vertexColors: true } }),
    lacq: pbr('lacq', { extra: { vertexColors: true } }),
    tile: pbr('kawara', { extra: { vertexColors: true } }),
    wood: pbr('wood', { extra: { vertexColors: true } }),
    plaster: pbr('plaster', { extra: { vertexColors: true } }),
    dark: new THREE.MeshStandardMaterial({ color: 0x0c0a0c, roughness: 0.9 }),
    bronze: new THREE.MeshStandardMaterial({ color: 0x5a7a62, roughness: 0.4, metalness: 0.9, vertexColors: true }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc860, roughness: 0.25, metalness: 1 }),
    bark: new THREE.MeshStandardMaterial({ color: 0x2a1c18, roughness: 0.95, vertexColors: true }),
    blossom: new THREE.MeshStandardMaterial({ color: 0xffb8d0, roughness: 0.8, emissive: 0x3a0a1a, vertexColors: true }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x1a2a18, roughness: 0.95, vertexColors: true }),
    bamboo: new THREE.MeshStandardMaterial({ color: 0x4a6a2a, roughness: 0.6, vertexColors: true }),
    rock: new THREE.MeshStandardMaterial({ color: 0x4a4a4e, roughness: 0.95, vertexColors: true, flatShading: true }),
    paper: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff5a2a, emissiveIntensity: 2.6, vertexColors: true }),
    shoji: new THREE.MeshStandardMaterial({ color: 0x100806, emissive: 0xffb070, emissiveIntensity: 1.2, vertexColors: true }),
    cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
    rope: new THREE.MeshStandardMaterial({ color: 0xc8b078, roughness: 0.9 }),
    white: new THREE.MeshStandardMaterial({ color: 0xf0ece4, roughness: 0.8, side: THREE.DoubleSide }),
    glowB: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0x5ab8ff, emissiveIntensity: 4 }),
  };
  M.tile.userData.noShadow = false;

  // ----- ground -----
  const groundGeo = new THREE.PlaneGeometry(A * 2 + 60, A * 2 + 60, 1, 1); groundGeo.rotateX(-PI / 2);
  { const uv = groundGeo.attributes.uv, p = groundGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 7, -p.getZ(i) / 7); }
  const ground = new THREE.Mesh(groundGeo, M.gravel); ground.receiveShadow = true; scene.add(ground); statics.push(ground);
  // sando: the stone approach path (south -> north) and a cross path
  for (let z = -A + 2; z < A - 2; z += 2.2) B.box(M.stone, 5.4, 0.08, 2.1, srg(-0.05, 0.05), 0.04, z, srg(-0.02, 0.02), spick([0x8a8a92, 0x7a7a84, 0x96969c]), 2.4);
  for (let x = -A + 2; x < A - 2; x += 2.2) if (Math.abs(x) > 3) B.box(M.stone, 2.1, 0.07, 3.6, x, 0.035, 6, srg(-0.03, 0.03), spick([0x7a7a84, 0x86868e]), 2.4);

  // ----- geometry helpers -----
  // hipped roof with flared eaves: a wide shallow frustum (eaves) + a steeper upper frustum + ridge
  function roof(x, y, z, w, d, h, ry = 0, col = 0x9aa0b0) {
    const eave = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.62, Math.SQRT1_2, 1, 4, 1); eave.rotateY(PI / 4);
    B.geo(M.tile, eave.clone(), T(x, y + h * 0.18, z, ry, w * 1.0, h * 0.36, d * 1.0), col, 2.5);
    const up = new THREE.CylinderGeometry(Math.SQRT1_2 * 0.12, Math.SQRT1_2 * 0.66, 1, 4, 1); up.rotateY(PI / 4);
    B.geo(M.tile, up, T(x, y + h * 0.36 + h * 0.32, z, ry, w * 0.95, h * 0.64, d * 0.95), col, 2.5);
    B.box(M.dark, w * 0.42, h * 0.12, 0.5, x, y + h * 1.0, z, ry, 0xffffff, 3);                      // ridge
    for (const s of [-1, 1]) B.box(M.dark, 0.6, h * 0.22, 0.5, x + Math.cos(ry) * s * w * 0.21, y + h * 1.06, z - Math.sin(ry) * s * w * 0.21, ry, 0xffffff, 3, 0, s * 0.3); // onigawara
    // upturned corners
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { const lx = sx * w / 2, lz = sz * d / 2, c = Math.cos(ry), s = Math.sin(ry);
      boxY(M.tile, 0.5, 0.25, 1.6, x + lx * c + lz * s, y + 0.3, z - lx * s + lz * c, ry + Math.atan2(sx * d, sz * w), col, 2, -0.45); }
  }
  function torii(x, z, s = 1, ry = 0) {
    const h = 6.6 * s, sp = 3.3 * s, c = Math.cos(ry), sn = Math.sin(ry);
    const P = (lx, ly, lz) => [x + lx * c + lz * sn, ly, z - lx * sn + lz * c];
    for (const sx of [-1, 1]) { const [px, , pz] = P(sx * sp, 0, 0);
      B.geo(M.lacq, new THREE.CylinderGeometry(0.3 * s, 0.36 * s, h, 14), T(px, h / 2, pz), 0xffffff, 2);
      B.geo(M.dark, new THREE.CylinderGeometry(0.4 * s, 0.4 * s, 0.6 * s, 14), T(px, 0.3 * s, pz), 0xffffff, 0);
      obstacle(px, pz, 0.8 * s, 0.8 * s, h); }
    let [bx, , bz] = P(0, 0, 0);
    B.box(M.lacq, sp * 2 + 1.4 * s, 0.4 * s, 0.45 * s, bx, h - 1.25 * s, bz, ry, 0xffffff, 2);            // nuki
    B.box(M.lacq, sp * 2 + 2.6 * s, 0.45 * s, 0.6 * s, bx, h - 0.1 * s, bz, ry, 0xffffff, 2);            // shimaki
    B.box(M.dark, sp * 2 + 3.4 * s, 0.38 * s, 0.75 * s, bx, h + 0.32 * s, bz, ry, 0xffffff, 2);          // kasagi
    for (const sx of [-1, 1]) { const [ex, , ez] = P(sx * (sp + 1.75 * s), 0, 0); B.box(M.dark, 0.9 * s, 0.34 * s, 0.75 * s, ex, h + 0.5 * s, ez, ry, 0xffffff, 2, 0, sx * -0.35); }
    B.box(M.lacq, 0.35 * s, 1.1 * s, 0.3 * s, bx, h - 0.68 * s, bz, ry, 0xffffff, 2);                    // gakuzuka
  }
  function stoneLantern(x, z, s = 1) {
    const col = spick([0x8a8a90, 0x7a7c80, 0x9a9a9a]);
    B.box(M.stone, 1.0 * s, 0.3 * s, 1.0 * s, x, 0.15 * s, z, 0, col, 2);
    B.geo(M.stone, new THREE.CylinderGeometry(0.16 * s, 0.2 * s, 1.1 * s, 8), T(x, 0.85 * s, z), col, 2);
    B.box(M.stone, 0.8 * s, 0.18 * s, 0.8 * s, x, 1.48 * s, z, 0, col, 2);
    B.box(M.stone, 0.6 * s, 0.55 * s, 0.6 * s, x, 1.85 * s, z, 0, col, 2);
    B.box(M.paper, 0.4 * s, 0.32 * s, 0.62 * s, x, 1.85 * s, z, 0, 0xffa060);
    B.box(M.paper, 0.62 * s, 0.32 * s, 0.4 * s, x, 1.85 * s, z, 0, 0xffa060);
    const cap = new THREE.ConeGeometry(0.7 * s, 0.5 * s, 6); B.geo(M.stone, cap, T(x, 2.37 * s, z), col, 2);
    B.geo(M.stone, new THREE.SphereGeometry(0.13 * s, 8, 6), T(x, 2.7 * s, z), col, 2);
    obstacle(x, z, 1.0 * s, 1.0 * s, 2.6 * s); lights.push({ x, y: 1.9 * s, z, c: 0xff9a50, i: 10, kind: 'stone' });
  }
  const chochin = [];   // hanging paper lanterns (swing in the wind)
  const lanternTex = canvasTex(128, 128, (g, w, h) => { const gr = g.createLinearGradient(0, 0, 0, h); gr.addColorStop(0, '#ff8a3a'); gr.addColorStop(0.5, '#ff4a1a'); gr.addColorStop(1, '#c81a0a'); g.fillStyle = gr; g.fillRect(0, 0, w, h);
    g.strokeStyle = 'rgba(80,10,0,.45)'; g.lineWidth = 2; for (let y = 8; y < h; y += 10) { g.beginPath(); g.moveTo(0, y); g.lineTo(w, y); g.stroke(); }
    g.fillStyle = '#1a0402'; g.font = '700 54px serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillText('祭', w / 2, h / 2); });
  const lanternMat = new THREE.MeshStandardMaterial({ map: lanternTex, emissiveMap: lanternTex, emissive: 0xffffff, emissiveIntensity: 1.6, roughness: 0.8 });
  const lanternGeo = new THREE.SphereGeometry(0.42, 14, 10); lanternGeo.scale(1, 1.25, 1);
  const capGeo = new THREE.CylinderGeometry(0.22, 0.24, 0.1, 10);
  function hangLantern(x, y, z, light = true, s = 1) {
    const piv = new THREE.Group(); piv.position.set(x, y, z); scene.add(piv);
    const m = new THREE.Mesh(lanternGeo, lanternMat); m.position.y = -0.7 * s; m.scale.setScalar(s); piv.add(m);
    for (const yy of [-0.17, -1.23]) { const c = new THREE.Mesh(capGeo, M.dark); c.position.y = yy * s; c.scale.setScalar(s); piv.add(c); }
    const cord = new THREE.Mesh(new THREE.CylinderGeometry(0.012, 0.012, 0.15 * s, 4), M.dark); cord.position.y = -0.07 * s; piv.add(cord);
    chochin.push({ piv, ph: srnd() * 10 });
    if (light) lights.push({ x, y: y - 0.7, z, c: 0xff5a2a, i: 14, kind: 'lantern' });
  }

  // ----- perimeter: plaster walls (tsuijibei) with tiled caps, bamboo + mountains beyond -----
  function wallRow(cx, cz, len, ry) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, lz) => [cx + lx * c + lz * s, cz - lx * s + lz * c];
    const [x0, z0] = P(0, 0);
    B.box(M.stone, len, 1.0, 1.6, x0, 0.5, z0, ry, 0x6a6a70, 3);
    B.box(M.plaster, len, 4.2, 1.2, x0, 3.1, z0, ry, 0xe8dcc8, 4);
    for (const yy of [2.0, 2.6]) B.box(M.wood, len, 0.12, 1.26, x0, yy, z0, ry, 0x5a4030, 3);
    for (let t = -len / 2; t <= len / 2; t += 6) { const [px, pz] = P(t, 0.62); B.box(M.wood, 0.3, 4.4, 0.18, px, 3.0, pz, ry, 0x3a2a20, 2); }
    // tiled coping: two slopes + ridge
    for (const sd of [-1, 1]) { const [rx, rz] = P(0, sd * 0.55); boxY(M.tile, len + 0.2, 0.18, 1.3, rx, 5.45, rz, ry, 0x8a92a4, 2, sd * 0.42); }
    B.box(M.dark, len + 0.3, 0.22, 0.32, x0, 5.75, z0, ry, 0xffffff, 3);
  }
  for (const [cx, cz, ry] of [[0, -A - 0.8, 0], [0, A + 0.8, PI], [-A - 0.8, 0, PI / 2], [A + 0.8, 0, -PI / 2]]) wallRow(cx, cz, A * 2 + 4, ry);
  for (const [x, z, w, d] of [[0, -A - 5, A * 2 + 12, 10], [0, A + 5, A * 2 + 12, 10], [-A - 5, 0, 10, A * 2 + 12], [A + 5, 0, 10, A * 2 + 12]]) obstacle(x, z, w, d, 8);
  // bamboo grove outside the walls
  for (let i = 0; i < 520; i++) {
    const side = i % 4, t = srg(-A - 10, A + 10), off = A + srg(3, 16);
    const [x, z] = side === 0 ? [t, -off] : side === 1 ? [t, off] : side === 2 ? [-off, t] : [off, t];
    const h = srg(9, 16), lean = srg(-0.08, 0.08);
    B.geo(M.bamboo, new THREE.CylinderGeometry(0.07, 0.09, h, 6), T(x, h / 2, z, 0, 1, 1, 1, lean, -lean), spick([0x4a6a2a, 0x3a5a24, 0x5a7a30]), 0);
    if (i % 3 === 0) B.geo(M.leaf, new THREE.SphereGeometry(1, 6, 5), T(x + lean * h * 0.5, h - 1, z - lean * h * 0.5, 0, 1.4, 0.7, 1.4), 0x24361c, 0);
  }
  // mountains ring (silhouettes) + a five-storey pagoda far beyond the north wall
  for (let i = 0; i < 26; i++) { const a = i / 26 * TAU, r = srg(200, 260), h = srg(60, 130);
    B.geo(M.rock, new THREE.ConeGeometry(srg(50, 90), h, 7), T(Math.cos(a) * r, h / 2 - 8, Math.sin(a) * r, srnd() * TAU), spick([0x141218, 0x18141c, 0x100e14]), 0); }

  // ----- senbon torii along the approach -----
  for (const z of [62, 54, 46, 38, 30, 22]) torii(0, z, 0.95);
  for (const z of [-24, -32, -40]) torii(0, z, 0.95);
  torii(0, 72, 1.5);                                                              // great torii at the south entrance
  // shimenawa rope with shide paper on the great torii
  B.geo(M.rope, new THREE.TorusGeometry(5.2, 0.22, 6, 20, PI * 0.8), T(0, 7.4, 72, 0, 1, 0.25, 1, 0, PI * 1.1), 0xffffff, 0);

  // ----- main hall (honden) on a raised platform: climb the steps -----
  {
    const z0 = -A + 18, H0 = 1.8, W = 28, D = 16;
    B.box(M.stone, W + 2, H0, D + 2, 0, H0 / 2, z0 - D / 2, 0, 0x7a7a80, 4); obstacle(0, z0 - D / 2, W + 2, D + 2, H0);
    for (let i = 0; i < 6; i++) { const h = 0.3 * (i + 1), zz = z0 + 3 - i * 0.5 - 0.25; B.box(M.stone, 12, h, 0.5, 0, h / 2, zz, 0, 0x8a8a90, 2); obstacle(0, zz, 12, 0.5, h, { step: true }); }
    B.box(M.wood, W, 0.25, D, 0, H0 + 0.12, z0 - D / 2, 0, 0x6a4a30, 3);                         // veranda floor
    for (let i = 0; i < 8; i++) { const x = -W / 2 + 1 + i * (W - 2) / 7; for (const zz of [z0 - 0.8, z0 - D + 0.8]) { B.geo(M.lacq, new THREE.CylinderGeometry(0.34, 0.34, 8, 12), T(x, H0 + 4, zz), 0xffffff, 2); obstacle(x, zz, 0.8, 0.8, H0 + 8); } }
    for (const sx of [-1, 1]) for (let j = 1; j < 4; j++) { const zz = z0 - 0.8 - j * (D - 1.6) / 4; B.geo(M.lacq, new THREE.CylinderGeometry(0.34, 0.34, 8, 12), T(sx * (W / 2 - 1), H0 + 4, zz), 0xffffff, 2); obstacle(sx * (W / 2 - 1), zz, 0.8, 0.8, H0 + 8); }
    // inner sanctuary walls: wood frames with glowing shoji
    B.box(M.wood, W - 6, 6.5, 0.4, 0, H0 + 3.4, z0 - D + 3, 0, 0x4a3020, 3); obstacle(0, z0 - D + 3, W - 6, 0.4, H0 + 7);
    for (const sx of [-1, 1]) { B.box(M.wood, 0.4, 6.5, D - 6, sx * (W / 2 - 3), H0 + 3.4, z0 - D / 2, 0, 0x4a3020, 3); obstacle(sx * (W / 2 - 3), z0 - D / 2, 0.4, D - 6, H0 + 7); }
    for (let i = 0; i < 6; i++) { const x = -9 + i * 3.6; B.box(M.shoji, 3.0, 4.2, 0.1, x, H0 + 2.6, z0 - D + 3.25, 0, 0xffe0b0); for (let k = 1; k < 4; k++) B.box(M.dark, 3.0, 0.06, 0.12, x, H0 + 0.5 + k * 1.05, z0 - D + 3.32, 0, 0xffffff, 1); B.box(M.dark, 0.06, 4.2, 0.12, x, H0 + 2.6, z0 - D + 3.32, 0, 0xffffff, 1); }
    lights.push({ x: 0, y: H0 + 3, z: z0 - D + 5, c: 0xffb070, i: 120, kind: 'hall' });
    roof(0, H0 + 8, z0 - D / 2, W + 7, D + 7, 6.5, 0, 0x8a92a8);
    // offertory box + bell rope + big shimenawa
    B.box(M.wood, 4, 1.2, 1.4, 0, H0 + 0.85, z0 - 2.2, 0, 0x5a3a24, 2); obstacle(0, z0 - 2.2, 4, 1.4, H0 + 1.5);
    B.geo(M.rope, new THREE.TorusGeometry(7, 0.35, 6, 24, PI), T(0, H0 + 7.4, z0 - 0.6, 0, 1, 0.18, 1, 0, PI), 0xffffff, 0);
    for (let i = 0; i < 7; i++) B.box(M.white, 0.25, 0.9, 0.02, -6 + i * 2, H0 + 6.4, z0 - 0.55, 0, 0xffffff, 0, 0, (i % 2 ? 0.1 : -0.1));
    for (let i = -3; i <= 3; i++) if (i) hangLantern(i * 3.6, H0 + 7.4, z0 + 0.4, Math.abs(i) === 1 || Math.abs(i) === 3, 1.1);
  }

  // ----- five-storey pagoda (east) -----
  {
    const x = 50, z = -34; let y = 0;
    B.box(M.stone, 10, 1.2, 10, x, 0.6, z, 0, 0x7a7a80, 3); obstacle(x, z, 10, 10, 1.2);
    obstacle(x, z, 7, 7, 34);
    for (let i = 0; i < 5; i++) {
      const k = 1 - i * 0.12, bh = i === 0 ? 4.2 : 3.2;
      B.box(M.lacq, 6.5 * k, bh, 6.5 * k, x, 1.2 + y + bh / 2, z, 0, 0xffffff, 2);
      for (const [sx, sz] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) B.box(M.shoji, sz ? 2 * k : 0.1, bh * 0.6, sz ? 0.1 : 2 * k, x + sx * 3.27 * k, 1.2 + y + bh / 2, z + sz * 3.27 * k, 0, 0xffd0a0);
      y += bh; roof(x, 1.2 + y - 0.3, z, 11.5 * k, 11.5 * k, 2.6, 0, 0x7a8294);
      y += 1.4;
      if (i % 2 === 0) for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) hangLantern(x + sx * 5.3 * k, 1.2 + y - 1.6, z + sz * 5.3 * k, i === 0, 0.7);
    }
    B.geo(M.bronze, new THREE.CylinderGeometry(0.12, 0.22, 9, 8), T(x, 1.2 + y + 4, z), 0xb0a060, 0);    // sorin spire
    for (let i = 0; i < 9; i++) B.geo(M.bronze, new THREE.TorusGeometry(0.42 - i * 0.02, 0.06, 5, 14), T(x, 1.2 + y + 1 + i * 0.75, z, 0, 1, 1, 1, PI / 2), 0xb0a060, 0);
    lights.push({ x, y: 4, z: z + 4, c: 0xff8a40, i: 30, kind: 'pagoda' });
  }
  // ----- bell tower (shoro, west) -----
  {
    const x = -50, z = -36;
    B.box(M.stone, 9, 1.4, 9, x, 0.7, z, 0, 0x7a7a80, 3); obstacle(x, z, 9, 9, 1.4);
    for (const [sx, sz] of [[-1, -1], [1, -1], [-1, 1], [1, 1]]) { B.geo(M.lacq, new THREE.CylinderGeometry(0.3, 0.34, 6, 10), T(x + sx * 3.2, 4.4, z + sz * 3.2, 0, 1, 1, 1, sz * 0.05, -sx * 0.05), 0xffffff, 2); obstacle(x + sx * 3.2, z + sz * 3.2, 0.8, 0.8, 7.5); }
    B.box(M.wood, 7.4, 0.5, 0.5, x, 7.2, z, 0, 0x4a3020, 2);
    roof(x, 7.6, z, 10, 10, 4.2, 0, 0x8a92a8);
    B.geo(M.bronze, new THREE.CylinderGeometry(0.95, 1.15, 2.6, 18), T(x, 5.4, z), 0x6a8a70, 0);
    B.geo(M.bronze, new THREE.SphereGeometry(0.95, 18, 8, 0, TAU, 0, PI / 2), T(x, 6.7, z), 0x6a8a70, 0);
    for (let i = 0; i < 4; i++) B.geo(M.bronze, new THREE.TorusGeometry(1.0 + i * 0.03, 0.04, 4, 20), T(x, 4.4 + i * 0.6, z, 0, 1, 1, 1, PI / 2), 0x5a7a60, 0);
    B.geo(M.wood, new THREE.CylinderGeometry(0.18, 0.18, 3.2, 8), T(x + 2.2, 5.0, z, 0, 1, 1, 1, 0, PI / 2), 0x6a4a30, 0);  // striker log
  }
  // ----- koi pond with an arched red bridge (south-west) -----
  const pond = { x: -42, z: 34, w: 22, d: 14 };
  var waterMat = new THREE.ShaderMaterial({
    uniforms: { uTime: { value: 0 } }, transparent: false,
    vertexShader: 'varying vec3 vW; void main(){ vec4 w = modelMatrix*vec4(position,1.); vW=w.xyz; gl_Position=projectionMatrix*viewMatrix*w; }',
    fragmentShader: `varying vec3 vW; uniform float uTime;
      float h(vec2 p){ return fract(sin(dot(p, vec2(12.9,78.2)))*43758.5); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      void main(){ vec2 p = vW.xz*0.6; float r = n(p + uTime*0.4) * 0.5 + n(p*2.3 - uTime*0.6) * 0.5;
        vec3 c = mix(vec3(0.01,0.02,0.035), vec3(0.06,0.03,0.07), r);
        c += vec3(0.9,0.12,0.05) * smoothstep(0.82, 0.98, r) * 0.35;             // blood-moon glints
        gl_FragColor = vec4(c, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  {
    const water = new THREE.Mesh(new THREE.PlaneGeometry(pond.w, pond.d), waterMat); water.rotation.x = -PI / 2; water.position.set(pond.x, 0.06, pond.z); scene.add(water);
    obstacle(pond.x, pond.z, pond.w, pond.d, 0.7);
    for (let i = 0; i < 40; i++) { const a = i / 40 * TAU, rx = pond.x + Math.cos(a) * (pond.w / 2 + 0.3) * (Math.abs(Math.cos(a)) > 0.7 ? 1 : 0.98), rz = pond.z + Math.sin(a) * (pond.d / 2 + 0.3);
      const px = Math.max(pond.x - pond.w / 2 - 0.4, Math.min(pond.x + pond.w / 2 + 0.4, rx)), pz = Math.max(pond.z - pond.d / 2 - 0.4, Math.min(pond.z + pond.d / 2 + 0.4, rz));
      B.geo(M.rock, new THREE.DodecahedronGeometry(srg(0.5, 0.9), 0), T(px, 0.25, pz, srnd() * TAU, 1, 0.6, 1), spick([0x4a4a50, 0x3a3c40, 0x56565a]), 0); }
    // taikobashi: an arched bridge across the pond (decorative, you can jump onto it)
    const seg = 14, span = pond.d + 4;
    for (let i = 0; i < seg; i++) { const t0 = i / seg, t1 = (i + 1) / seg, z0 = pond.z - span / 2 + t0 * span, z1 = pond.z - span / 2 + t1 * span;
      const y0 = Math.sin(t0 * PI) * 2.2, y1 = Math.sin(t1 * PI) * 2.2, zm = (z0 + z1) / 2, ym = (y0 + y1) / 2 + 0.15, ang = Math.atan2(y1 - y0, z1 - z0);
      B.box(M.wood, 3, 0.18, Math.hypot(z1 - z0, y1 - y0) + 0.04, pond.x, ym, zm, 0, 0x6a4a30, 2, -ang);
      for (const sx of [-1.45, 1.45]) { B.box(M.lacq, 0.12, 0.12, Math.hypot(z1 - z0, y1 - y0) + 0.04, pond.x + sx, ym + 1.0, zm, 0, 0xffffff, 2, -ang); if (i % 2 === 0) B.box(M.lacq, 0.14, 1.0, 0.14, pond.x + sx, ym + 0.5, z0, 0, 0xffffff, 2); } }
  }
  // ----- cherry trees (sakura) -----
  const petalsAt = [];
  function sakura(x, z, s = 1) {
    let px = x, py = 0, pz = z;
    for (let i = 0; i < 4; i++) { const h = srg(1.2, 1.7) * s, lx = srg(-0.4, 0.4), lz = srg(-0.4, 0.4), r = (0.42 - i * 0.07) * s;
      B.geo(M.bark, new THREE.CylinderGeometry(r * 0.8, r, h, 7), T(px + lx / 2, py + h / 2, pz + lz / 2, 0, 1, 1, 1, lz * 0.5, -lx * 0.5), 0x3a2a24, 0); px += lx; py += h * 0.95; pz += lz; }
    obstacle(x, z, 1.1 * s, 1.1 * s, 6, { thin: true });
    for (let i = 0; i < 16; i++) { const a = srnd() * TAU, r = srg(0.5, 3.2) * s, cx = px + Math.cos(a) * r, cz = pz + Math.sin(a) * r, cy = py + srg(-0.6, 1.6) * s;
      if (i < 5) B.geo(M.bark, new THREE.CylinderGeometry(0.06 * s, 0.12 * s, r, 5), T((px + cx) / 2, (py + cy) / 2, (pz + cz) / 2, -a, 1, 1, 1, 0, PI / 2 - 0.4), 0x3a2a24, 0);
      B.geo(M.blossom, new THREE.IcosahedronGeometry(srg(0.9, 1.5) * s, 1), T(cx, cy + 0.6, cz, srnd() * TAU, 1, 0.75, 1), spick([0xffb8d0, 0xffc8dc, 0xf8a0c0, 0xffd8e6]), 0); }
    petalsAt.push([px, py + 1, pz]);
  }
  for (const [x, z, s] of [[-20, 18, 1.1], [20, 18, 1.0], [-22, -10, 1.0], [24, -14, 1.15], [-34, 56, 1.0], [34, 58, 1.2], [56, 20, 1.1], [-62, 2, 1.0], [62, 54, 1.0], [-14, -44, 0.9], [16, -46, 0.95], [-60, -60, 1.1], [44, 4, 0.9], [-26, 40, 0.9]]) if (!inside(x, z, 1.5)) sakura(x, z, s);
  // ----- stone lanterns along the approach and around the hall -----
  for (const z of [58, 50, 42, 34, 26, 16, -16, -28, -36, -44]) for (const sx of [-6, 6]) if (!inside(sx, z, 0.7)) stoneLantern(sx, z, 1);
  for (const [x, z] of [[-16, -54], [16, -54], [-40, -20], [40, -20], [-50, 20], [50, 40], [0, 34.5]]) if (!inside(x, z, 0.8)) stoneLantern(x, z, 1.3);
  // ----- graveyard (north-west): gravestones and sotoba boards in the mist -----
  for (let i = 0, n = 0; i < 300 && n < 36; i++) {
    const x = srg(-74, -38), z = srg(-74, -50); if (!free(x, z, 0.9)) continue;
    const h = srg(1.2, 2.2), w = srg(0.5, 0.75); B.box(M.stone, w + 0.3, 0.3, w + 0.3, x, 0.15, z, srg(-0.2, 0.2), 0x6a6a70, 2);
    B.box(M.stone, w, h, w * 0.7, x, 0.3 + h / 2, z, srg(-0.2, 0.2), spick([0x7a7a80, 0x606066, 0x8a8a8e]), 2, srg(-0.05, 0.05), srg(-0.06, 0.06));
    obstacle(x, z, w + 0.3, w + 0.3, h + 0.3);
    if (srnd() < 0.6) for (let k = 0; k < 3; k++) B.box(M.wood, 0.14, srg(1.6, 2.4), 0.03, x + 0.35 + k * 0.17, 1.1, z - 0.5, srg(-0.1, 0.1), 0xb8a888, 0, 0, srg(-0.12, 0.12));
    n++;
  }
  // ----- festival stalls (yatai, south-east): cover with lanterns -----
  function yatai(x, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry), P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    const [cx, cz] = P(0, 0);
    B.box(M.wood, 4.2, 1.1, 1.6, cx, 0.55, cz, ry, 0x6a4a30, 2); obstacle(cx, cz, Math.abs(c) > 0.5 ? 4.2 : 1.6, Math.abs(c) > 0.5 ? 1.6 : 4.2, 1.2);
    for (const lx of [-2, 2]) for (const lz of [-0.7, 0.7]) { const [px, pz] = P(lx, lz); B.box(M.wood, 0.12, 2.6, 0.12, px, 1.3, pz, ry, 0x4a3020, 1); }
    const [ax, az] = P(0, 0.3); boxY(M.cloth, 4.6, 0.08, 2.4, ax, 2.65, az, ry, spick([0xc8301a, 0x2a4a8a, 0xe8e0d0]), 2, 0.18);
    const [nx, nz] = P(0, 0.85); B.box(M.cloth, 4.2, 0.6, 0.04, nx, 2.2, nz, ry, spick([0xb82010, 0x1a3a7a]), 2);
    for (const lx of [-1.6, 1.6]) { const [lx2, lz2] = P(lx, 0.9); hangLantern(lx2, 2.5, lz2, lx > 0, 0.55); }
  }
  for (const [x, z, ry] of [[30, 64, 0], [44, 64, 0], [58, 64, 0], [66, 50, -PI / 2], [66, 36, -PI / 2], [-30, 64, 0], [-60, 64, 0]]) if (!inside(x, z, 2.5)) yatai(x, z, ry);
  // ----- sake barrel stacks + big mossy rocks as cover -----
  function taru(x, z) {
    for (const [dx, dy] of [[-0.55, 0.55], [0.55, 0.55], [0, 1.5]]) { B.geo(M.wood, new THREE.CylinderGeometry(0.5, 0.5, 0.95, 14), T(x + dx, dy, z), 0xc8b090, 1.2);
      B.geo(M.cloth, new THREE.CylinderGeometry(0.51, 0.51, 0.55, 14, 1, true), T(x + dx, dy, z), spick([0xf0e8d8, 0xe8dcc8]), 0);
      B.geo(M.rope, new THREE.TorusGeometry(0.51, 0.03, 4, 16), T(x + dx, dy + 0.3, z, 0, 1, 1, 1, PI / 2), 0xffffff, 0); }
    obstacle(x, z, 2.2, 1.1, 2.0);
  }
  for (const [x, z] of [[-18, -52], [18, -52], [12, 40], [-30, -2], [36, 26], [-8, 50]]) if (!inside(x, z, 1.4)) taru(x, z);
  for (let i = 0, n = 0; i < 400 && n < 18; i++) {
    const x = srg(-A + 8, A - 8), z = srg(-A + 8, A - 8); if (!free(x, z, 3)) continue; const s = srg(1.2, 2.4);
    B.geo(M.rock, new THREE.DodecahedronGeometry(s, 0), T(x, s * 0.45, z, srnd() * TAU, srg(1.0, 1.5), srg(0.6, 0.9), srg(0.9, 1.3)), spick([0x4a4c50, 0x3e4044, 0x55575a]), 0);
    B.geo(M.leaf, new THREE.DodecahedronGeometry(s * 0.7, 0), T(x, s * 0.75, z, srnd() * TAU, 1.2, 0.35, 1.1), 0x2a3a22, 0);
    obstacle(x, z, s * 2.1, s * 1.9, s * 0.9); n++;
  }
  // stone fox guardians (kitsune) at the hall steps
  for (const sx of [-1, 1]) { const x = sx * 8, z = -A + 23; B.box(M.stone, 1.8, 2.0, 1.8, x, 1.0, z, 0, 0x7a7a80, 2); obstacle(x, z, 1.8, 1.8, 2.0);
    B.geo(M.stone, new THREE.SphereGeometry(0.55, 10, 8), T(x, 2.6, z, 0, 0.8, 1.2, 1.0), 0x9a9aa0, 0); B.geo(M.stone, new THREE.ConeGeometry(0.32, 0.8, 8), T(x, 3.6, z + 0.2, 0, 1, 1, 1, 0.5), 0x9a9aa0, 0);
    for (const ex of [-0.18, 0.18]) B.geo(M.stone, new THREE.ConeGeometry(0.1, 0.35, 5), T(x + ex, 3.9, z + 0.05), 0x9a9aa0, 0);
    B.box(M.cloth, 0.8, 0.5, 0.05, x, 2.9, z + 0.42, 0, 0xc8201a, 0); B.geo(M.stone, new THREE.ConeGeometry(0.22, 1.4, 6), T(x - sx * 0.2, 2.8, z - 0.6, 0, 1, 1, 1, -1.1), 0x9a9aa0, 0); }

  // ----- merge -----
  const meshes = B.finish(scene, true);

  // ----- lights -----
  const hemi = new THREE.HemisphereLight(0x8a7ac8, 0x2a1a24, 1.35); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xff7a6a, 1.9); moon.position.set(-35, 60, -90); moon.castShadow = quality !== 'low';
  const ss = quality === 'high' ? 2048 : 1024; moon.shadow.mapSize.set(ss, ss);
  const sc = moon.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 240; moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.04;
  scene.add(moon); scene.add(moon.target);
  const NL = 8, plights = [];
  for (let i = 0; i < NL; i++) { const l = new THREE.PointLight(0xff8a3a, 0, 26, 1.6); scene.add(l); plights.push(l); }
  // onibi: blue ghost fires drifting around the shrine (light sources that move)
  const glowTexB = canvasTex(64, 64, (g) => { const r = g.createRadialGradient(32, 32, 0, 32, 32, 32); r.addColorStop(0, 'rgba(220,240,255,1)'); r.addColorStop(0.3, 'rgba(90,170,255,.75)'); r.addColorStop(1, 'rgba(40,80,255,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); });
  const onibi = [];
  for (let i = 0; i < 9; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: glowTexB, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.scale.setScalar(1.1); scene.add(s);
    const o = { s, cx: srg(-60, 60), cz: srg(-60, 60), r: srg(4, 12), sp: srg(0.15, 0.35) * (srnd() < 0.5 ? -1 : 1), ph: srnd() * TAU, y: srg(1.4, 3.2) };
    onibi.push(o); lights.push({ x: o.cx, y: o.y, z: o.cz, c: 0x5aa8ff, i: 16, kind: 'onibi', o }); }
  const lightSources = lights;
  // falling sakura petals + floating spirit motes
  const PET = quality === 'low' ? 250 : 700;
  const petGeo = new THREE.BufferGeometry(), petPos = new Float32Array(PET * 3), petVel = new Float32Array(PET * 3);
  const resetPet = (i, top) => { const src = petalsAt.length && srnd() < 0.7 ? petalsAt[(srnd() * petalsAt.length) | 0] : [srg(-A, A), 10, srg(-A, A)];
    petPos[i * 3] = src[0] + srg(-4, 4); petPos[i * 3 + 1] = top ? src[1] + srg(-1, 3) : srg(0, 12); petPos[i * 3 + 2] = src[2] + srg(-4, 4);
    petVel[i * 3] = srg(0.3, 1.2); petVel[i * 3 + 1] = -srg(0.5, 1.1); petVel[i * 3 + 2] = srg(-0.4, 0.4); };
  for (let i = 0; i < PET; i++) resetPet(i, false);
  petGeo.setAttribute('position', new THREE.BufferAttribute(petPos, 3));
  const petTex = canvasTex(32, 32, (g) => { g.fillStyle = '#ffc8dc'; g.beginPath(); g.ellipse(16, 16, 12, 6, 0.6, 0, TAU); g.fill(); });
  const petals = new THREE.Points(petGeo, new THREE.PointsMaterial({ map: petTex, color: 0xffd0e0, size: 0.18, transparent: true, depthWrite: false, alphaTest: 0.1 }));
  petals.frustumCulled = false; scene.add(petals);
  const sky = shrineSky(); scene.add(sky);
  const fog = new THREE.FogExp2(0x1a0e1e, 0.0068), bg = new THREE.Color(0x0a0610);

  function placeLights(s, l) { l.position.set(s.x, s.y, s.z); l.color.setHex(s.c); l.intensity = s.i; l.distance = s.i > 100 ? 40 : 22; }
  function bakeEnv() {
    const pm = new THREE.PMREMGenerator(renderer), rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.5, 300, rt); cc.position.set(0, 4, 0); scene.add(cc);
    S0.environment = null;
    plights.forEach((l, i) => { const s = lightSources[i]; if (s) placeLights(s, l); });
    cc.update(renderer, S0);
    W.env = pm.fromCubemap(rt.texture).texture; scene.remove(cc); rt.dispose(); pm.dispose();
    S0.environment = W.env; S0.environmentIntensity = W.envI;
  }
  function ambient(dt, now, cam) {
    const t = now / 1000;
    sky.material.uniforms.uTime.value = t; waterMat.uniforms.uTime.value = t;
    for (const c of chochin) { c.piv.rotation.z = Math.sin(t * 1.3 + c.ph) * 0.07; c.piv.rotation.x = Math.sin(t * 0.9 + c.ph * 2) * 0.05; }
    for (const o of onibi) { o.ph += dt * o.sp; const x = o.cx + Math.cos(o.ph) * o.r, z = o.cz + Math.sin(o.ph) * o.r, y = o.y + Math.sin(t * 1.7 + o.ph * 3) * 0.4;
      o.s.position.set(x, y, z); const k = 0.9 + Math.sin(t * 9 + o.ph * 5) * 0.15; o.s.scale.set(1.0 * k, 1.3 * k, 1); }
    for (const s of lightSources) if (s.o) { s.x = s.o.s.position.x; s.y = s.o.s.position.y; s.z = s.o.s.position.z; }
    if (cam) {
      const step = 90 / moon.shadow.mapSize.x, cx = Math.round(cam.position.x / step) * step, cz = Math.round(cam.position.z / step) * step;
      moon.target.position.set(cx, 0, cz); moon.position.set(cx - 35, 60, cz - 90); moon.target.updateMatrixWorld(); sky.position.copy(cam.position);
      lightSources.forEach(s => { s.d = (s.x - cam.position.x) ** 2 + (s.z - cam.position.z) ** 2 - (s.i > 100 ? 3000 : 0); });
      const near = lightSources.slice().sort((a, b) => a.d - b.d);
      plights.forEach((l, i) => { l.visible = i < W.nLights; const s = near[i]; if (!s) { l.intensity = 0; return; } placeLights(s, l);
        l.intensity = s.i * (s.kind === 'onibi' ? 0.8 + Math.sin(t * 7 + s.x) * 0.2 : 0.88 + Math.sin(t * 11 + s.x) * 0.07 + Math.sin(t * 6.1 + s.z) * 0.05); });
    }
    for (let i = 0; i < PET; i++) { const j = i * 3; petPos[j] += (petVel[j] + Math.sin(t * 1.3 + i) * 0.5) * dt; petPos[j + 1] += petVel[j + 1] * dt; petPos[j + 2] += (petVel[j + 2] + Math.cos(t * 1.1 + i * 0.7) * 0.4) * dt;
      if (petPos[j + 1] < 0.02) resetPet(i, true); }
    petGeo.attributes.position.needsUpdate = true;
  }
  function setShadows(on) { moon.castShadow = on; }
  function setLightCount(n) { W.nLights = Math.min(n, plights.length); plights.forEach((l, i) => { l.visible = i < W.nLights; }); }
  const W = { A, root: scene, fog, bg, envI: 1.0, statics, obstacles, ambient, bakeEnv, free, setShadows, setLightCount, nLights: 8, moon, hemi, sky, M, meshes, level: 3, onFlash: null };
  return W;
}
