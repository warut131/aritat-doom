// Hell-soi: a Bangkok back-street at night, built procedurally and merged into a handful of draw calls.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';

const TAU = Math.PI * 2;
export const A = 80;                       // half-size of the playable square
const TEX = 'assets/tex/';

// ---------- deterministic RNG (both co-op peers build the same map) ----------
let _seed = 20261024;
const srnd = () => { _seed = (_seed * 16807) % 2147483647; return (_seed - 1) / 2147483646; };
const srg = (a, b) => a + srnd() * (b - a);
const spick = a => a[(srnd() * a.length) | 0];

// ---------- texture loading ----------
const loader = new THREE.TextureLoader();
const texCache = {};
function tex(name, srgb, rep = 1) {
  const k = name + srgb;
  if (!texCache[k]) {
    const t = loader.load(TEX + name);
    t.wrapS = t.wrapT = THREE.RepeatWrapping; t.anisotropy = 8;
    t.colorSpace = srgb ? THREE.SRGBColorSpace : THREE.NoColorSpace;
    texCache[k] = t;
  }
  return texCache[k];
}
export function preloadTextures() {
  const names = ['asphalt_c.jpg', 'asphalt_n.jpg', 'asphalt_orm.jpg', 'asphalt_lava.jpg', 'paver_c.jpg', 'paver_n.jpg', 'paver_orm.jpg', 'plaster_c.jpg', 'plaster_n.jpg', 'plaster_orm.jpg',
    'shutter_c.jpg', 'shutter_n.jpg', 'shutter_orm.jpg', 'metal_c.jpg', 'metal_n.jpg', 'metal_orm.jpg', 'wood_c.jpg', 'wood_n.jpg', 'wood_orm.jpg', 'concrete_c.jpg', 'concrete_n.jpg', 'concrete_orm.jpg', 'win_c.jpg', 'win_e.jpg', 'splat.png'];
  return Promise.all(names.map(n => new Promise(res => {
    const srgb = /_c\.|win_e|splat/.test(n);
    const t = tex(n, srgb);
    if (t.image) res(); else { const i = setInterval(() => { if (t.image) { clearInterval(i); res(); } }, 30); setTimeout(() => { clearInterval(i); res(); }, 15000); }
  })));
}

function pbr(base, o = {}) {
  return new THREE.MeshStandardMaterial(Object.assign({
    map: tex(base + '_c.jpg', true), normalMap: tex(base + '_n.jpg', false), roughnessMap: tex(base + '_orm.jpg', false),
    metalnessMap: o.metal ? tex(base + '_orm.jpg', false) : null, metalness: o.metal ? 1 : 0, roughness: 1,
  }, o.extra || {}));
}

// ---------- geometry builder: world-space box UVs + vertex colours, merged per material ----------
class Builder {
  constructor() { this.lists = new Map(); }
  add(mat, geo) { if (!this.lists.has(mat)) this.lists.set(mat, []); this.lists.get(mat).push(geo); }
  // box with world-scaled UVs (texScale metres per texture repeat)
  box(mat, w, h, d, x, y, z, ry = 0, color = 0xffffff, texScale = 4, rx = 0, rz = 0) {
    const g = new THREE.BoxGeometry(w, h, d);
    const m = new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(1, 1, 1));
    g.applyMatrix4(m); worldUV(g, texScale); tint(g, color); this.add(mat, g); return g;
  }
  geo(mat, g, matrix, color = 0xffffff, texScale = 0) {
    if (matrix) g.applyMatrix4(matrix);
    if (texScale) worldUV(g, texScale); tint(g, color); this.add(mat, g); return g;
  }
  finish(scene, shadows = true) {
    const meshes = [];
    for (const [mat, list] of this.lists) {
      const norm = list.map(g => { const ng = g.index ? g.toNonIndexed() : g; for (const k of Object.keys(ng.attributes)) if (!['position', 'normal', 'uv', 'color'].includes(k)) ng.deleteAttribute(k); if (!ng.attributes.uv) ng.setAttribute('uv', new THREE.Float32BufferAttribute(new Float32Array(ng.attributes.position.count * 2), 2)); return ng; });
      const merged = mergeGeometries(norm, false);
      const mesh = new THREE.Mesh(merged, mat);
      mesh.castShadow = shadows && !mat.userData.noShadow; mesh.receiveShadow = true;
      mesh.matrixAutoUpdate = false; mesh.updateMatrix();
      scene.add(mesh); meshes.push(mesh);
    }
    this.lists.clear(); return meshes;
  }
}
function worldUV(g, s) {
  const p = g.attributes.position, n = g.attributes.normal, uv = new Float32Array(p.count * 2);
  for (let i = 0; i < p.count; i++) {
    const nx = Math.abs(n.getX(i)), ny = Math.abs(n.getY(i)), nz = Math.abs(n.getZ(i));
    let u, v;
    if (ny >= nx && ny >= nz) { u = p.getX(i); v = p.getZ(i); }
    else if (nx >= nz) { u = p.getZ(i) * Math.sign(n.getX(i) || 1); v = p.getY(i); }
    else { u = -p.getX(i) * Math.sign(n.getZ(i) || 1); v = p.getY(i); }
    uv[i * 2] = u / s; uv[i * 2 + 1] = v / s;
  }
  g.setAttribute('uv', new THREE.BufferAttribute(uv, 2));
}
const _col = new THREE.Color();
function tint(g, color) {
  _col.set(color); const n = g.attributes.position.count, c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) { c[i * 3] = _col.r; c[i * 3 + 1] = _col.g; c[i * 3 + 2] = _col.b; }
  g.setAttribute('color', new THREE.BufferAttribute(c, 3));
}

// ---------- sign atlas (Thai neon signs drawn into one canvas) ----------
const SIGN_TEXT = [
  ['ปลาทูแม่กลอง', '#ffb35c'], ['ห้ามให้อาหารแมว', '#ff3a2a'], ['ซอย ๗ ทางลงนรก', '#ffd080'], ['ข้าวมันไก่ประตูนรก', '#ff7a1a'], ['ร้านตัดผมลุงพล', '#9be15d'],
  ['โจ๊กหมูสับ ๒๔ ชม.', '#58c8ff'], ['รับซ่อมมอเตอร์ไซค์', '#ffe14a'], ['นวดแผนไทย', '#ff5ad0'], ['ร้านทองเยาวราช', '#ffd23f'], ['ก๋วยเตี๋ยวเรือ', '#ff8a3a'],
  ['ห้องพักรายวัน', '#7af0ff'], ['คาราโอเกะ', '#ff2a8a'], ['ยาดองเหล้าขาว', '#b6ff6a'], ['ส้มตำปูปลาร้า', '#ff6a3a'], ['ร้านขายยา', '#3aff9a'], ['รับซื้อของเก่า', '#ffc070'],
];
function signAtlas() {
  const W = 1024, H = 1024, rows = 16, rh = H / rows;
  const c = document.createElement('canvas'); c.width = W; c.height = H; const g = c.getContext('2d');
  const draw = () => {
    g.fillStyle = '#000'; g.fillRect(0, 0, W, H);
    SIGN_TEXT.forEach(([t, col], i) => {
      const y = i * rh;
      g.fillStyle = '#0b0606'; g.fillRect(0, y, W, rh);
      g.strokeStyle = col; g.lineWidth = 4; g.globalAlpha = 0.9; g.strokeRect(6, y + 5, W - 12, rh - 10); g.globalAlpha = 1;
      g.font = `${Math.round(rh * 0.62)}px Itim, sans-serif`; g.textAlign = 'center'; g.textBaseline = 'middle';
      g.shadowColor = col; g.shadowBlur = 14; g.fillStyle = col; g.fillText(t, W / 2, y + rh / 2 + 3);
      g.shadowBlur = 0; g.fillStyle = '#fff'; g.globalAlpha = 0.55; g.fillText(t, W / 2, y + rh / 2 + 3); g.globalAlpha = 1;
    });
  };
  draw();
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  t.redraw = () => { draw(); t.needsUpdate = true; };
  return { t, rows };
}

// ---------- sky ----------
function makeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false,
    uniforms: { uTime: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `varying vec3 vDir; uniform float uTime;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.02; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 top = vec3(0.018,0.014,0.045), mid = vec3(0.12,0.04,0.07), hor = vec3(0.7,0.2,0.08);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.18, y)); col = mix(col, top, smoothstep(0.15, 0.7, y));
        // clouds lit from below by the fires of hell
        vec2 uv = d.xz / max(0.08, y + 0.15) * 1.3 + vec2(uTime*0.004, uTime*0.002);
        float c = fbm(uv); float c2 = fbm(uv*2.3 + 7.0);
        float cl = smoothstep(0.42, 0.85, c) * smoothstep(-0.02, 0.25, y);
        vec3 cloudCol = mix(vec3(0.45,0.07,0.03), vec3(0.03,0.01,0.025), smoothstep(0.0, 0.45, y)) * (0.6 + c2*0.8);
        col = mix(col, cloudCol, cl*0.85);
        // blood moon
        vec3 md = normalize(vec3(-0.45, 0.42, -0.79)); float m = dot(d, md);
        col += vec3(2.2,0.35,0.12) * smoothstep(0.9988, 0.9992, m) * (0.7 + 0.3*fbm(d.xy*60.0));
        col += vec3(0.5,0.06,0.03) * pow(max(m,0.0), 400.0) * 0.9 + vec3(0.15,0.02,0.02) * pow(max(m,0.0), 30.0);
        // embers / stars
        float s = step(0.9985, h(floor(d.xz/(y+0.3)*300.0))) * smoothstep(0.2, 0.6, y);
        col += vec3(1.0,0.5,0.3) * s * 0.6;
        col = max(col, vec3(0.0)); col = mix(col, vec3(0.11,0.04,0.05), smoothstep(0.02,-0.08,y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10;
  return m;
}

// ---------- the world ----------
export function buildWorld(S0, renderer, quality) {
  _seed = 20261024;
  const scene = new THREE.Group(); scene.name = 'world1'; S0.add(scene);   // everything of this map lives under one root so maps can be swapped
  const statics = [], obstacles = [], lamps = [], fires = [], animated = [];
  const B = new Builder();
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false });
  const proxyGeo = new THREE.BoxGeometry(1, 1, 1);
  function proxy(x, y, z, w, h, d) { const m = new THREE.Mesh(proxyGeo, proxyMat); m.position.set(x, y, z); m.scale.set(w, h, d); m.updateMatrixWorld(true); m.matrixAutoUpdate = false; scene.add(m); statics.push(m); return m; }
  function obstacle(x, z, w, d, h, opts = {}) { const o = Object.assign({ x, z, hw: w / 2, hd: d / 2, h }, opts); obstacles.push(o); if (!opts.noProxy) o.mesh = proxy(x, h / 2, z, w, h, d); return o; }
  const inside = (x, z, r) => { for (const o of obstacles) if (Math.abs(x - o.x) < o.hw + r && Math.abs(z - o.z) < o.hd + r) return true; return false; };

  // ----- materials -----
  const M = {
    asphalt: pbr('asphalt', { extra: { emissiveMap: tex('asphalt_lava.jpg', true), emissive: new THREE.Color(0xff4a0a), emissiveIntensity: 3.2 } }),
    paver: pbr('paver'),
    plaster: pbr('plaster', { extra: { vertexColors: true } }),
    shutter: pbr('shutter', { metal: true }),
    metal: pbr('metal', { metal: true, extra: { vertexColors: true } }),
    wood: pbr('wood'),
    concrete: pbr('concrete', { extra: { vertexColors: true } }),
    win: new THREE.MeshStandardMaterial({ map: tex('win_c.jpg', true), emissiveMap: tex('win_e.jpg', true), emissive: 0xffffff, emissiveIntensity: 2.2, roughness: 0.15, metalness: 0.3 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x141012, roughness: 0.8 }),
    paint: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.5, metalness: 0.2 }),
    glowY: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xffb050, emissiveIntensity: 4 }),
    glowR: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff2a10, emissiveIntensity: 5 }),
    cable: new THREE.MeshStandardMaterial({ color: 0x050404, roughness: 0.6 }),
    cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9, side: THREE.DoubleSide }),
  };
  M.cable.userData.noShadow = true;
  // ground shader tweak: break tiling with world-space noise (puddles & lava vary across the map)
  const lavaU = { uTime: { value: 0 } };
  M.asphalt.onBeforeCompile = sh => {
    sh.uniforms.uTime = lavaU.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; uniform float uTime;
      float wh(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5); }
      float wn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(wh(i),wh(i+vec2(1,0)),f.x),mix(wh(i+vec2(0,1)),wh(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <roughnessmap_fragment>', `#include <roughnessmap_fragment>
        float wet = smoothstep(0.45, 0.75, wn(vWPos.xz*0.06) * 0.7 + wn(vWPos.xz*0.21) * 0.3);
        roughnessFactor = mix(max(roughnessFactor, 0.55), roughnessFactor * 0.6, wet);`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lz = smoothstep(0.55, 0.8, wn(vWPos.xz*0.035 + 3.0));
        totalEmissiveRadiance *= lz * (0.75 + 0.25 * sin(uTime*2.0 + vWPos.x*0.3 + vWPos.z*0.2));`);
  };
  M.asphalt.customProgramCacheKey = () => 'asphalt-w';

  // ----- ground -----
  const groundGeo = new THREE.PlaneGeometry(A * 2 + 60, A * 2 + 60, 1, 1); groundGeo.rotateX(-Math.PI / 2);
  { const uv = groundGeo.attributes.uv, p = groundGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 9, -p.getZ(i) / 9); }
  const ground = new THREE.Mesh(groundGeo, M.asphalt); ground.receiveShadow = true; scene.add(ground); statics.push(ground);
  // road markings (painted lines)
  const lineMat = new THREE.MeshStandardMaterial({ color: 0xd8d0b0, roughness: 0.7, transparent: true, opacity: 0.55, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2 });
  lineMat.userData.noShadow = true;
  for (let t = -A + 6; t < A - 6; t += 6) {
    B.box(lineMat, 0.18, 0.01, 3, 0, 0.01, t, 0, 0xffffff, 4);
    B.box(lineMat, 3, 0.01, 0.18, t, 0.01, 0, 0, 0xffffff, 4);
  }

  // ----- shophouse rows -----
  const PASTEL = [0xd9cdb4, 0xb8d4c4, 0xe0b8b0, 0xb0c4d8, 0xe6d690, 0xc8c0b8, 0xd8a878, 0xa8b8a0, 0xe8e0d0, 0xc8a0a8];
  const signs = signAtlas();
  const signMat = new THREE.MeshStandardMaterial({ map: signs.t, emissiveMap: signs.t, emissive: 0xffffff, emissiveIntensity: 1.8, roughness: 0.6 });
  const signGeos = [];
  function signQuad(w, h, x, y, z, ry, row, double) {
    const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv;
    for (let i = 0; i < uv.count; i++) uv.setY(i, 1 - (row + (1 - uv.getY(i))) / signs.rows);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
    signGeos.push(g);
    if (double) { const g2 = g.clone(); g2.applyMatrix4(new THREE.Matrix4().makeTranslation(-x, -y, -z)).applyMatrix4(new THREE.Matrix4().makeRotationY(Math.PI)).applyMatrix4(new THREE.Matrix4().makeTranslation(x, y, z)); signGeos.push(g2); }
  }
  const winGeos = [];
  function windowQuad(w, h, x, y, z, ry, cell) {
    const g = new THREE.PlaneGeometry(w, h); const uv = g.attributes.uv; const ci = cell % 4, cj = (cell / 4) | 0;
    for (let i = 0; i < uv.count; i++) uv.setXY(i, (ci + uv.getX(i)) / 4, 1 - (cj + 1 - uv.getY(i)) / 2);
    g.applyMatrix4(new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(0, ry, 0)), new THREE.Vector3(1, 1, 1)));
    winGeos.push(g);
  }
  const shopGlows = [];
  // one facade unit, local frame: x along facade, facade plane at z=0 facing +z (rotated by ry), origin at street level
  function unit(ox, oz, ry, w, floors, color, depth) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, ly, lz) => [ox + lx * c + lz * s, ly, oz - lx * s + lz * c];
    const box = (mat, bw, bh, bd, lx, ly, lz, col = color, ts = 4) => { const [x, y, z] = P(lx, ly, lz); B.box(mat, bw, bh, bd, x, y, z, ry, col, ts); };
    const gH = 3.6, fH = 3.2, H = gH + floors * fH;
    // structure: back mass + facade columns
    box(M.plaster, w, gH, depth, 0, gH / 2, -depth / 2 - 0.75);           // ground-floor mass (recessed shop)
    box(M.plaster, w, H - gH, depth, 0, gH + (H - gH) / 2, -depth / 2);   // upper floors
    box(M.plaster, 0.35, gH, 0.9, w / 2 - 0.175, gH / 2, -0.35, color);
    box(M.plaster, 0.35, gH, 0.9, -w / 2 + 0.175, gH / 2, -0.35, color);
    // ground floor: shutter or open shop
    const open = srnd() < 0.35;
    if (open) {
      const [x, y, z] = P(0, gH / 2 - 0.2, -0.7); B.box(M.dark, w - 0.5, gH - 0.4, 0.06, x, y, z, ry, 0xffffff);
      const glowCol = spick([0xfff0d0, 0xc8f0ff, 0xffb070, 0xff6040]);
      const [gx, gy, gz] = P(0, gH - 0.55, -0.45); const gm = M.glowY; B.box(gm, w - 0.9, 0.08, 0.08, gx, gy, gz, ry);
      shopGlows.push({ p: P(0, 1.6, 0.6), c: glowCol });
      // counter
      box(M.metal, w - 1.2, 1.0, 0.6, 0, 0.5, -1.2, 0x8a8a90, 2);
    } else {
      const roll = srg(0.0, 0.85);
      box(M.shutter, w - 0.5, gH - 0.4 - roll * 0.6, 0.08, 0, gH - 0.2 - (gH - 0.4 - roll * 0.6) / 2, -0.3, 0xffffff, 3);
      box(M.metal, w - 0.4, 0.35, 0.3, 0, gH - 0.15, -0.25, 0x606068, 2);
    }
    // awning / canopy between ground and first floor
    box(M.concrete, w, 0.22, 1.4, 0, gH, 0.55, 0xb0aaa0, 3);
    if (srnd() < 0.5) { const [x, y, z] = P(0, gH - 0.45, 1.6); B.box(M.cloth, w - 0.2, 0.06, 1.6, x, y, z, ry, spick([0x9a2020, 0x2a5a8a, 0x2a7a3a, 0xc08a20]), 2, 0.25 * 0); }
    // upper floors
    for (let f = 0; f < floors; f++) {
      const y0 = gH + f * fH;
      // windows (two per unit)
      for (const lx of [-w / 4, w / 4]) {
        const cell = spick([0, 0, 1, 2, 3, 3, 3, 5, 5, 6, 7, 4]);
        const [x, y, z] = P(lx, y0 + 1.7, 0.03); windowQuad(w / 2 - 0.6, 1.7, x, y, z, ry, cell);
        if (cell === 4) fires.push({ p: P(lx, y0 + 1.7, 0.7), win: true });
        box(M.concrete, w / 2 - 0.3, 0.12, 0.25, lx, y0 + 0.78, 0.1, 0xa8a49c, 2); // sill
      }
      // balcony on some floors
      if (srnd() < 0.45) {
        box(M.concrete, w - 0.3, 0.16, 1.1, 0, y0 + 0.1, 0.55, 0xa8a49c, 3);
        for (let k = -w / 2 + 0.35; k <= w / 2 - 0.3; k += 0.32) box(M.metal, 0.04, 1.0, 0.04, k, y0 + 0.65, 1.05, 0x2a2a2e, 1);
        box(M.metal, w - 0.3, 0.06, 0.06, 0, y0 + 1.15, 1.05, 0x2a2a2e, 1);
        if (srnd() < 0.5) { const [x, y, z] = P(srg(-w / 3, w / 3), y0 + 0.95, 0.9); B.box(M.cloth, 0.8, 0.6, 0.03, x, y, z, ry, spick([0xd0d0d0, 0x8a2a2a, 0x2a4a8a, 0xd0b040]), 1); }
      }
      // AC unit
      if (srnd() < 0.55) { const lx = spick([-w / 4, w / 4]) + srg(-0.3, 0.3); box(M.metal, 0.85, 0.6, 0.35, lx, y0 + 0.5, 0.2, 0xc8c8c4, 1);
        const [x, y, z] = P(lx, y0 + 0.5, 0.385); B.box(M.dark, 0.5, 0.5, 0.02, x, y, z, ry, 0xffffff); }
      // floor band
      box(M.concrete, w, 0.18, 0.3, 0, y0 + 3.15, 0.1, 0xa09a90, 3);
    }
    // parapet
    box(M.plaster, w, 0.9, 0.4, 0, H + 0.45, 0.0, color);
    // hanging vertical sign
    if (srnd() < 0.5) {
      const row = (srnd() * SIGN_TEXT.length) | 0;
      const [x, y, z] = P(w / 2 - 0.3, gH + 2.2, 1.3); signQuad(2.6, 0.5, x, y, z, ry + Math.PI / 2, row, true);
      const [bx, by, bz] = P(w / 2 - 0.3, gH + 2.2, 1.3); B.box(M.dark, 0.08, 0.6, 2.7, bx, by, bz, ry, 0xffffff);
    }
    // horizontal shop sign over ground floor
    if (srnd() < 0.6) { const row = (srnd() * SIGN_TEXT.length) | 0; const [x, y, z] = P(0, gH + 0.6, 1.27); signQuad(w - 0.4, 0.75, x, y, z, ry, row);
      const [bx, by, bz] = P(0, gH + 0.6, 1.22); B.box(M.dark, w - 0.3, 0.85, 0.08, bx, by, bz, ry, 0xffffff); }
    return H;
  }
  // a row of units along a line; facade faces direction ry (0 = +z)
  function row(cx, cz, len, ry, depth, floorsRange = [2, 3]) {
    const n = Math.max(1, Math.round(len / 4.2)); const w = len / n;
    const c = Math.cos(ry), s = Math.sin(ry); let maxH = 0;
    for (let i = 0; i < n; i++) {
      const lx = -len / 2 + w / 2 + i * w;
      const ox = cx + lx * c, oz = cz - lx * s;
      const H = unit(ox, oz, ry, w, Math.round(srg(floorsRange[0], floorsRange[1] + 0.49)), spick(PASTEL), depth);
      maxH = Math.max(maxH, H);
    }
    return maxH;
  }
  // block of shophouses facing outward on all four sides (x,z centre, w,d size)
  function block(x, z, w, d) {
    const depth = Math.min(w, d) / 2 - 0.3;
    row(x, z + d / 2, w, 0, depth); row(x, z - d / 2, w, Math.PI, depth);
    row(x + w / 2, z, d, Math.PI / 2, depth); row(x - w / 2, z, d, -Math.PI / 2, depth);
    obstacle(x, z, w + 0.6, d + 0.6, 12, {});
    // sidewalk ring
    sidewalk(x, z, w + 6, d + 6);
  }
  function sidewalk(x, z, w, d) {
    const t = 3, y = 0.07;
    B.box(M.paver, w, 0.14, t, x, y, z + d / 2 - t / 2, 0, 0xffffff, 2); B.box(M.paver, w, 0.14, t, x, y, z - d / 2 + t / 2, 0, 0xffffff, 2);
    B.box(M.paver, t, 0.14, d - t * 2, x + w / 2 - t / 2, y, z, 0, 0xffffff, 2); B.box(M.paver, t, 0.14, d - t * 2, x - w / 2 + t / 2, y, z, 0, 0xffffff, 2);
    // red-white kerb (very Thai)
    const k = 1.0;
    for (let i = -w / 2; i < w / 2 - 0.01; i += k) {
      const col = Math.round((i + w / 2) / k) % 2 ? 0xd8d8d0 : 0xb81a14;
      B.box(M.paint, k, 0.16, 0.18, x + i + k / 2, 0.08, z + d / 2, 0, col, 2); B.box(M.paint, k, 0.16, 0.18, x + i + k / 2, 0.08, z - d / 2, 0, col, 2);
    }
    for (let i = -d / 2; i < d / 2 - 0.01; i += k) {
      const col = Math.round((i + d / 2) / k) % 2 ? 0xd8d8d0 : 0xb81a14;
      B.box(M.paint, 0.18, 0.16, k, x + w / 2, 0.08, z + i + k / 2, 0, col, 2); B.box(M.paint, 0.18, 0.16, k, x - w / 2, 0.08, z + i + k / 2, 0, col, 2);
    }
  }
  // perimeter: rows facing inward, just outside the playable square
  for (const [cx, cz, ry] of [[0, -A - 0.3, 0], [0, A + 0.3, Math.PI], [-A - 0.3, 0, Math.PI / 2], [A + 0.3, 0, -Math.PI / 2]]) {
    row(cx, cz, A * 2 + 8, ry, 9, [2, 4]);
  }
  for (const [x, z, w, d] of [[0, -A - 5, A * 2 + 12, 10], [0, A + 5, A * 2 + 12, 10], [-A - 5, 0, 10, A * 2 + 12], [A + 5, 0, 10, A * 2 + 12]]) obstacle(x, z, w, d, 14);
  // perimeter sidewalks
  B.box(M.paver, A * 2, 0.14, 3, 0, 0.07, -A + 1.5, 0, 0xffffff, 2); B.box(M.paver, A * 2, 0.14, 3, 0, 0.07, A - 1.5, 0, 0xffffff, 2);
  B.box(M.paver, 3, 0.14, A * 2 - 6, -A + 1.5, 0.07, 0, 0, 0xffffff, 2); B.box(M.paver, 3, 0.14, A * 2 - 6, A - 1.5, 0.07, 0, 0, 0xffffff, 2);
  // inner city blocks -> streets & alleys
  const BLOCKS = [[-52, -50, 26, 20], [52, -50, 26, 20], [-52, 50, 26, 20], [52, 50, 26, 20], [-14, -56, 14, 12], [18, 58, 16, 10], [-60, 6, 12, 26], [60, -6, 12, 22], [-30, -22, 14, 12], [32, -24, 12, 14], [-28, 28, 12, 14], [30, 26, 14, 12]];
  for (const b of BLOCKS) block(...b);

  // ----- power poles & tangled cables along streets -----
  const poles = [];
  for (let t = -A + 8; t <= A - 8; t += 14) { poles.push([t, -A + 3.2]); poles.push([t, A - 3.2]); poles.push([-A + 3.2, t]); poles.push([A - 3.2, t]); }
  for (let t = -A + 12; t <= A - 12; t += 16) { if (Math.abs(t) > 8) { poles.push([t, 6.5]); poles.push([6.5, t]); } }
  const poleOK = poles.filter(([x, z]) => !inside(x, z, 0.6));
  for (const [x, z] of poleOK) {
    B.box(M.concrete, 0.32, 9, 0.32, x, 4.5, z, 0, 0x9a968e, 3);
    B.box(M.concrete, 1.8, 0.14, 0.14, x, 8.4, z, 0, 0x8a867e, 2);
    if (srnd() < 0.3) { B.box(M.metal, 0.7, 1.0, 0.7, x + 0.5, 6.4, z, 0, 0x5a6068, 1); }
    obstacle(x, z, 0.4, 0.4, 9, { thin: true });
  }
  // cables between consecutive poles on the same line
  const cableGeos = [];
  function cable(a, b, sag, y) {
    const pts = []; for (let i = 0; i <= 10; i++) { const t = i / 10; pts.push(new THREE.Vector3(a[0] + (b[0] - a[0]) * t, y - Math.sin(t * Math.PI) * sag, a[1] + (b[1] - a[1]) * t)); }
    cableGeos.push(new THREE.TubeGeometry(new THREE.CatmullRomCurve3(pts), 10, 0.025, 4, false));
  }
  const byLine = {};
  for (const p of poleOK) { const kx = 'x' + p[0], kz = 'z' + p[1]; (byLine[kx] = byLine[kx] || []).push(p); (byLine[kz] = byLine[kz] || []).push(p); }
  for (const k in byLine) {
    const L = byLine[k].sort((a, b) => k[0] === 'x' ? a[1] - b[1] : a[0] - b[0]);
    for (let i = 0; i < L.length - 1; i++) {
      const a = L[i], b = L[i + 1]; if (Math.hypot(a[0] - b[0], a[1] - b[1]) > 20) continue;
      for (let c = 0; c < 5; c++) cable([a[0] + srg(-0.7, 0.7), a[1] + srg(-0.2, 0.2)], [b[0] + srg(-0.7, 0.7), b[1] + srg(-0.2, 0.2)], srg(0.4, 1.4), srg(7.6, 8.5));
    }
  }
  if (cableGeos.length) { const cm = new THREE.Mesh(mergeGeometries(cableGeos), M.cable); scene.add(cm); }

  // ----- street lamps (sodium) -----
  const lampSpots = [[-20, -A + 4], [20, -A + 4], [-20, A - 4], [20, A - 4], [-A + 4, -20], [-A + 4, 20], [A - 4, -20], [A - 4, 20], [9, -14], [-9, 14], [12, 40], [-12, -40], [40, -9], [-40, 9]];
  for (const [x, z] of lampSpots) {
    if (inside(x, z, 0.5)) continue;
    B.box(M.metal, 0.18, 6.5, 0.18, x, 3.25, z, 0, 0x3a3c40, 2);
    const toC = Math.atan2(-x, -z); const ax = x + Math.sin(toC) * 1.3, az = z + Math.cos(toC) * 1.3;
    B.box(M.metal, 0.12, 0.12, 1.4, (x + ax) / 2, 6.4, (z + az) / 2, toC, 0x3a3c40, 1);
    B.box(M.glowY, 0.5, 0.12, 0.3, ax, 6.3, az, toC);
    lamps.push({ x: ax, y: 6.0, z: az, c: 0xffa040 });
    obstacle(x, z, 0.3, 0.3, 6.5, { thin: true });
  }

  // ----- props / cover -----
  const free = (x, z, r) => { if (Math.abs(x) > A - 4 || Math.abs(z) > A - 4) return false; if (Math.abs(x) < 6 && z > -10 && z < 10) return false; return !inside(x, z, r); };
  // food carts (cover, glass case, umbrella)
  function cart(x, z, ry) {
    const c = Math.cos(ry), s = Math.sin(ry);
    B.box(M.metal, 1.9, 0.9, 0.9, x, 0.75, z, ry, 0xb8bcc0, 1);
    B.box(M.win, 1.7, 0.55, 0.75, x, 1.48, z, ry, 0xffffff, 1);
    for (const [dx, dz] of [[-0.8, 0.35], [0.8, 0.35], [-0.8, -0.35], [0.8, -0.35]]) B.box(M.dark, 0.25, 0.3, 0.06, x + dx * c + dz * s, 0.18, z - dx * s + dz * c, ry, 0xffffff);
    B.box(M.metal, 0.05, 2.4, 0.05, x, 1.9, z, 0, 0x404040, 1);
    const um = new THREE.ConeGeometry(1.4, 0.5, 8, 1, true); um.translate(0, 3.15, 0); um.applyMatrix4(new THREE.Matrix4().makeTranslation(x, 0, z));
    B.geo(M.cloth, um, null, spick([0xc02020, 0x2050a0, 0xd0a020, 0x208040]), 0);
    obstacle(x, z, Math.abs(1.9 * c) + Math.abs(0.9 * s) + 0.1, Math.abs(1.9 * s) + Math.abs(0.9 * c) + 0.1, 1.2);
    if (srnd() < 0.5) lamps.push({ x, y: 2.2, z, c: 0xfff0c0, small: true });
  }
  // tuk-tuk (cover)
  function tuktuk(x, z, ry) {
    const col = spick([0x1a6ac8, 0xd02a2a, 0x2a9a4a, 0xe0a020]);
    const c = Math.cos(ry), s = Math.sin(ry); const P = (lx, lz) => [x + lx * c + lz * s, z - lx * s + lz * c];
    let [px, pz] = P(0, -0.4); B.box(M.paint, 1.4, 0.55, 2.0, px, 0.65, pz, ry, col, 2);
    [px, pz] = P(0, 0.9); B.box(M.paint, 0.9, 0.7, 0.9, px, 0.75, pz, ry, col, 2);
    [px, pz] = P(0, -0.2); B.box(M.paint, 1.5, 0.08, 2.6, px, 2.0, pz, ry, 0x101010, 2);
    for (const [lx, lz] of [[-0.68, -1.3], [0.68, -1.3], [-0.68, 0.4], [0.68, 0.4]]) { [px, pz] = P(lx, lz); B.box(M.metal, 0.05, 1.2, 0.05, px, 1.4, pz, ry, 0x909090, 1); }
    for (const [lx, lz] of [[-0.68, -1.0], [0.68, -1.0], [0, 1.25]]) { [px, pz] = P(lx, lz); B.box(M.dark, 0.18, 0.5, 0.5, px, 0.25, pz, ry, 0xffffff); }
    [px, pz] = P(0, 1.36); B.box(M.glowY, 0.3, 0.15, 0.05, px, 0.95, pz, ry);
    const ex = Math.abs(1.5 * c) + Math.abs(2.8 * s), ez = Math.abs(1.5 * s) + Math.abs(2.8 * c);
    obstacle(x, z, ex, ez, 1.3);
  }
  // concrete jersey barriers
  function barrier(x, z, along) {
    const w = along ? 4 : 0.7, d = along ? 0.7 : 4;
    B.box(M.concrete, w, 0.9, d, x, 0.45, z, 0, 0xd8d0c4, 2);
    B.box(M.paint, along ? 4.01 : 0.36, 0.15, along ? 0.36 : 4.01, x, 0.95, z, 0, 0xc82020, 2);
    obstacle(x, z, w, d, 1.05);
  }
  function crate(x, z, h = 1.1) { B.box(M.wood, 1.7, h, 1.7, x, h / 2, z, 0, 0xffffff, 1.7); obstacle(x, z, 1.8, 1.8, h); }
  // shipping container style metal block (sniper perches use these)
  function container(x, z, h, col) {
    B.box(M.shutter, 2.6, h, 2.6, x, h / 2, z, 0, col, 2.6); B.box(M.metal, 2.66, 0.2, 2.66, x, h - 0.1, z, 0, 0x1a1a1a, 2);
    obstacle(x, z, 2.6, 2.6, h);
  }
  // spirit house (shrine) in the central plaza
  function spiritHouse(x, z) {
    B.box(M.concrete, 0.4, 1.6, 0.4, x, 0.8, z, 0, 0xe8e0d0, 1);
    B.box(M.concrete, 1.4, 0.12, 1.4, x, 1.65, z, 0, 0xc8a050, 1);
    B.box(M.paint, 0.9, 0.8, 0.9, x, 2.1, z, 0, 0xd4a020, 1);
    const roof = new THREE.ConeGeometry(0.85, 0.9, 4); roof.rotateY(Math.PI / 4); roof.translate(x, 2.95, z); B.geo(M.paint, roof, null, 0xa01818, 0);
    const spire = new THREE.ConeGeometry(0.12, 0.8, 6); spire.translate(x, 3.7, z); B.geo(M.paint, spire, null, 0xe0b030, 0);
    for (let i = 0; i < 6; i++) { const a = i / 6 * TAU; B.box(M.glowY, 0.05, 0.14, 0.05, x + Math.cos(a) * 0.55, 1.78, z + Math.sin(a) * 0.55); }
    obstacle(x, z, 1.4, 1.4, 2.4);
    lamps.push({ x, y: 2.0, z: z + 0.8, c: 0xffb040, small: true });
  }
  spiritHouse(-3.5, -14);
  // sniper perches: crate step next to a container (same spots as before, scaled)
  for (const [x, z] of [[-20, -10], [20, 12], [-10, 22], [24, -22], [-46, 18], [46, -16], [0, 36], [-36, -40], [36, 40]]) {
    if (!free(x, z, 2.6) || !free(x + 2.2, z, 2.6)) continue;
    crate(x, z, 1.1); container(x + 2.2, z, 2.4, spick([0x8a3020, 0x2a5a7a, 0x3a6a3a, 0x7a6a3a]));
  }
  for (let i = 0, n = 0; i < 400 && n < 14; i++) { const x = srg(-A + 6, A - 6), z = srg(-A + 6, A - 6); if (free(x, z, 2.5)) { cart(x, z, spick([0, Math.PI / 2])); n++; } }
  for (let i = 0, n = 0; i < 400 && n < 7; i++) { const x = srg(-A + 8, A - 8), z = srg(-A + 8, A - 8); if (free(x, z, 3)) { tuktuk(x, z, spick([0, Math.PI / 2, Math.PI, -Math.PI / 2]) + srg(-0.3, 0.3)); n++; } }
  for (let i = 0, n = 0; i < 400 && n < 14; i++) { const x = srg(-A + 6, A - 6), z = srg(-A + 6, A - 6), al = srnd() < 0.5; if (free(x, z, 3)) { barrier(x, z, al); n++; } }
  for (let i = 0, n = 0; i < 400 && n < 34; i++) { const x = srg(-A + 3, A - 3), z = srg(-A + 3, A - 3); if (free(x, z, 2)) { crate(x, z, srnd() < 0.3 ? 2.0 : 1.1); n++; } }
  for (let i = 0, n = 0; i < 400 && n < 12; i++) { const x = srg(-A + 4, A - 4), z = srg(-A + 4, A - 4); if (free(x, z, 2.8)) { container(x, z, srnd() < 0.5 ? 2.4 : 3.2, spick([0x8a3020, 0x2a5a7a, 0x3a6a3a, 0x7a6a3a, 0x6a6a70])); n++; } }

  // ----- burning oil drums (braziers) -----
  const drums = [];
  for (const [x, z] of [[-14, -14], [14, 14], [-14, 16], [16, -14], [0, -30], [0, 30], [-40, -30], [40, 30], [-40, 34], [40, -34], [-66, -26], [66, 26], [-22, 60], [24, -62]]) {
    if (!free(x, z, 1)) continue;
    const g = new THREE.CylinderGeometry(0.45, 0.45, 1.2, 16, 1, true); g.translate(x, 0.6, z); B.geo(M.metal, g, null, 0x4a2a1a, 1.5);
    const rim = new THREE.TorusGeometry(0.45, 0.04, 6, 20); rim.rotateX(Math.PI / 2); rim.translate(x, 1.2, z); B.geo(M.metal, rim, null, 0x2a1a10, 1);
    B.box(M.glowR, 0.75, 0.05, 0.75, x, 1.0, z);
    obstacle(x, z, 0.9, 0.9, 1.25);
    drums.push({ x, z }); fires.push({ p: [x, 1.4, z], drum: true });
  }

  // ----- hell portal at the north end -----
  const portalG = new THREE.Group(); portalG.position.set(0, 0, -A + 0.6); scene.add(portalG);
  const ringMat = new THREE.MeshStandardMaterial({ color: 0x1a0806, emissive: 0xff2a08, emissiveIntensity: 3, roughness: 0.4, metalness: 0.5 });
  const ring = new THREE.Mesh(new THREE.TorusGeometry(5.2, 0.45, 12, 64), ringMat); ring.position.y = 7; portalG.add(ring);
  const coreMat = new THREE.ShaderMaterial({
    transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
    vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
    fragmentShader: `varying vec2 vUv; uniform float uTime;
      void main(){ vec2 p=vUv*2.-1.; float r=length(p); float a=atan(p.y,p.x);
        float sw = sin(a*5. + r*14. - uTime*3.)*0.5+0.5; float core = smoothstep(1.0, 0.0, r);
        vec3 c = mix(vec3(1.5,0.12,0.02), vec3(3.0,1.0,0.25), sw*core*core) * core * (0.7+0.3*sw);
        gl_FragColor = vec4(c, core); }`,
  });
  const core = new THREE.Mesh(new THREE.CircleGeometry(5, 48), coreMat); core.position.set(0, 7, 0.05); portalG.add(core);
  fires.push({ p: [0, 5, -A + 3], portal: true });

  // ----- merge everything -----
  const winMesh = new THREE.Mesh(mergeGeometries(winGeos), M.win); winMesh.receiveShadow = true; scene.add(winMesh);
  const signMesh = new THREE.Mesh(mergeGeometries(signGeos), signMat); scene.add(signMesh);
  if (document.fonts && document.fonts.ready) document.fonts.ready.then(() => signs.t.redraw());
  const meshes = B.finish(scene, true);

  // ----- lights -----
  const hemi = new THREE.HemisphereLight(0xb8a8e0, 0x5a3428, 1.6); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xd0c0ff, 2.1);
  moon.position.set(-40, 60, -70); moon.castShadow = quality !== 'low';
  const ss = quality === 'high' ? 2048 : 1024; moon.shadow.mapSize.set(ss, ss);
  const sc = moon.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 220;
  moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.04;
  scene.add(moon); scene.add(moon.target);
  // a fixed budget of point lights (shader cost) - nearest fires/lamps get them each frame
  const NL = quality === 'low' ? 4 : 8;
  const plights = [];
  for (let i = 0; i < NL; i++) { const l = new THREE.PointLight(0xff8a3a, 0, 34, 1.6); scene.add(l); plights.push(l); }
  const lightSources = [
    ...lamps.map(l => ({ x: l.x, y: l.y, z: l.z, c: l.c, i: l.small ? 12 : 55, flick: 0 })),
    ...fires.filter(f => f.drum || f.portal).map(f => ({ x: f.p[0], y: f.p[1], z: f.p[2], c: f.portal ? 0xff3010 : 0xff7a2a, i: f.portal ? 120 : 30, flick: 1 })),
    ...shopGlows.map(g => ({ x: g.p[0], y: g.p[1], z: g.p[2], c: g.c, i: 10, flick: 0 })),
  ];
  // fire sprites over drums and burning windows
  const fireTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 36, 0, 32, 36, 30); r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.3, 'rgba(255,150,40,.8)'); r.addColorStop(1, 'rgba(255,40,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const flames = [];
  for (const f of fires) {
    if (f.portal) continue;
    const n = f.drum ? 4 : 2;
    for (let i = 0; i < n; i++) { const sMat = new THREE.SpriteMaterial({ map: fireTex, color: i < 2 ? 0xff6a20 : 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true });
      const s = new THREE.Sprite(sMat); s.position.set(f.p[0], f.p[1] + i * 0.3, f.p[2]); scene.add(s); flames.push({ s, b: srnd() * 10, i, base: f.drum ? 1.3 : 2.4, y: f.p[1] }); }
  }
  // embers drifting up
  const EMB = quality === 'low' ? 300 : 900;
  const embGeo = new THREE.BufferGeometry(); const embPos = new Float32Array(EMB * 3), embVel = new Float32Array(EMB * 3);
  for (let i = 0; i < EMB; i++) { embPos[i * 3] = srg(-A, A); embPos[i * 3 + 1] = srg(0, 16); embPos[i * 3 + 2] = srg(-A, A); embVel[i * 3] = srg(-0.4, 0.4); embVel[i * 3 + 1] = srg(0.6, 2); embVel[i * 3 + 2] = srg(-0.4, 0.4); }
  embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ map: fireTex, color: 0xff8a3a, size: 0.25, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  embers.frustumCulled = false; scene.add(embers);

  const sky = makeSky(); scene.add(sky);
  const fog = new THREE.FogExp2(0x3a2028, 0.0058), bg = new THREE.Color(0x120404);
  S0.fog = fog; S0.background = bg;

  // ----- environment map: capture the lit street once -----
  function bakeEnv() {
    const pm = new THREE.PMREMGenerator(renderer);
    const rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.5, 300, rt); cc.position.set(0, 3, 0); scene.add(cc);
    const oldEnv = S0.environment; S0.environment = null;
    // temporarily light the scene from all sources so reflections show neon/fires
    plights.forEach((l, i) => { const s = lightSources[i]; if (s) { l.position.set(s.x, s.y, s.z); l.color.setHex(s.c); l.intensity = s.i; } });
    cc.update(renderer, S0);
    const env = pm.fromCubemap(rt.texture).texture;
    scene.remove(cc); rt.dispose(); pm.dispose();
    S0.environment = env || oldEnv; S0.environmentIntensity = 1.25; W.env = S0.environment;
  }

  // ----- per-frame -----
  const _v = new THREE.Vector3();
  function ambient(dt, now, cam) {
    const t = now / 1000;
    lavaU.uTime.value = t; sky.material.uniforms.uTime.value = t; coreMat.uniforms.uTime.value = t;
    ring.rotation.z += dt * 0.4; ringMat.emissiveIntensity = 2.6 + Math.sin(t * 2.2) * 0.6;
    // shadow camera follows the viewer (snapped to texels to avoid shimmering)
    if (cam) {
      const step = 90 / moon.shadow.mapSize.x;
      const cx = Math.round(cam.position.x / step) * step, cz = Math.round(cam.position.z / step) * step;
      moon.target.position.set(cx, 0, cz); moon.position.set(cx - 40, 60, cz - 70); moon.target.updateMatrixWorld();
      sky.position.copy(cam.position);
      // assign point lights to the nearest sources
      lightSources.forEach(s => { s.d = (s.x - cam.position.x) ** 2 + (s.z - cam.position.z) ** 2 - (s.i > 60 ? 4000 : 0); });
      const near = lightSources.slice().sort((a, b) => a.d - b.d);
      plights.forEach((l, i) => { const s = near[i]; if (!s) { l.intensity = 0; return; } l.position.set(s.x, s.y, s.z); l.color.setHex(s.c); l.distance = s.i > 60 ? 45 : 26;
        l.intensity = s.i * (s.flick ? (0.82 + Math.sin(t * 13 + s.x) * 0.1 + Math.sin(t * 7.3 + s.z) * 0.08) : 1); });
    }
    for (const f of flames) { f.b += dt; const k = 0.7 + 0.3 * Math.sin(f.b * (9 + f.i * 3) + f.i) + (Math.random() - 0.5) * 0.08; f.s.scale.set((f.base - f.i * 0.22) * k, (f.base * 1.4 - f.i * 0.2) * k, 1); f.s.position.y = f.y + f.i * 0.28 + Math.sin(f.b * 5 + f.i) * 0.05; }
    for (let i = 0; i < EMB; i++) { const j = i * 3; embPos[j] += embVel[j] * dt + Math.sin(t + i) * 0.003; embPos[j + 1] += embVel[j + 1] * dt; embPos[j + 2] += embVel[j + 2] * dt; if (embPos[j + 1] > 16) { embPos[j + 1] = 0; embPos[j] = (Math.random() * 2 - 1) * A; embPos[j + 2] = (Math.random() * 2 - 1) * A; } }
    embGeo.attributes.position.needsUpdate = true;
  }
  function setShadows(on) { moon.castShadow = on; }

  const W = { A, root: scene, fog, bg, envI: 1.25, statics, obstacles, ambient, bakeEnv, free, setShadows, moon, hemi, sky, splatTex: tex('splat.png', true), M, meshes, level: 1 };
  return W;
}

export { srnd, srg, tex, pbr, Builder, worldUV, tint, makeSky };
export function setSeed(v) { _seed = v; }
