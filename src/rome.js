// Level 2: the Forum of the Underworld - a ruined Roman forum under an eclipsed sun.
// Same contract as world.js (statics, obstacles, ambient, bakeEnv, free ...) and built under one root group.
import * as THREE from 'three';
import { mergeGeometries } from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import { A, tex, pbr, Builder, srnd, srg, setSeed } from './world.js';
import { rigInstance, poseHuman } from './roman.js';

const TAU = Math.PI * 2, PI = Math.PI;
const spick = a => a[(srnd() * a.length) | 0];
export function preloadRome() {
  const names = ['flag_c.jpg', 'flag_n.jpg', 'flag_orm.jpg', 'flag_glow.jpg', 'marble_c.jpg', 'marble_n.jpg', 'marble_orm.jpg', 'ashlar_c.jpg', 'ashlar_n.jpg', 'ashlar_orm.jpg'];
  return Promise.all(names.map(n => new Promise(res => {
    const t = tex(n, /_c\.|glow/.test(n)); if (t.image) res(); else { const i = setInterval(() => { if (t.image) { clearInterval(i); res(); } }, 30); setTimeout(() => { clearInterval(i); res(); }, 15000); }
  })));
}

function romeSky() {
  const mat = new THREE.ShaderMaterial({
    side: THREE.BackSide, depthWrite: false, fog: false, uniforms: { uTime: { value: 0 }, uFlash: { value: 0 } },
    vertexShader: `varying vec3 vDir; void main(){ vDir = normalize(position); vec4 p = modelViewMatrix * vec4(position,1.0); gl_Position = projectionMatrix * p; gl_Position.z = gl_Position.w; }`,
    fragmentShader: `varying vec3 vDir; uniform float uTime; uniform float uFlash;
      float h(vec2 p){ return fract(sin(dot(p, vec2(127.1,311.7)))*43758.5453); }
      float n(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(h(i),h(i+vec2(1,0)),f.x),mix(h(i+vec2(0,1)),h(i+vec2(1,1)),f.x),f.y); }
      float fbm(vec2 p){ float s=0., a=.5; for(int i=0;i<6;i++){ s+=a*n(p); p*=2.03; a*=.5; } return s; }
      void main(){
        vec3 d = normalize(vDir); float y = d.y;
        vec3 top = vec3(0.012,0.01,0.035), mid = vec3(0.16,0.05,0.16), hor = vec3(0.95,0.42,0.12);
        vec3 col = mix(hor, mid, smoothstep(0.0, 0.22, y)); col = mix(col, top, smoothstep(0.2, 0.75, y));
        vec2 uv = d.xz / max(0.08, y + 0.18) * 1.1 + vec2(uTime*0.006, -uTime*0.003);
        float c = fbm(uv); float c2 = fbm(uv*2.1 + 3.0);
        float cl = smoothstep(0.38, 0.82, c) * smoothstep(-0.03, 0.22, y);
        vec3 cloudCol = mix(vec3(0.75,0.32,0.1), vec3(0.08,0.02,0.09), smoothstep(0.0, 0.5, y)) * (0.55 + c2*0.9);
        cloudCol += vec3(0.6,0.55,1.0) * uFlash * (0.4 + c2);
        col = mix(col, cloudCol, cl*0.9);
        // eclipsed sun: black disc + golden corona
        vec3 sd = normalize(vec3(0.28, 0.3, -0.91)); float m = dot(d, sd);
        float disc = smoothstep(0.99935, 0.9995, m);
        col += vec3(3.2,1.7,0.6) * pow(max(m,0.0), 900.0) * 1.6 + vec3(1.0,0.45,0.12) * pow(max(m,0.0), 60.0) * 0.6;
        col = mix(col, vec3(0.0), disc);
        float s = step(0.9982, h(floor(d.xz/(y+0.3)*260.0))) * smoothstep(0.25, 0.7, y);
        col += vec3(0.8,0.7,1.0) * s * 0.5;
        col = max(col, vec3(0.0)); col = mix(col, vec3(0.13,0.06,0.07), smoothstep(0.02,-0.08,y));
        gl_FragColor = vec4(col, 1.0);
        #include <colorspace_fragment>
      }`,
  });
  const m = new THREE.Mesh(new THREE.SphereGeometry(400, 32, 16), mat); m.frustumCulled = false; m.renderOrder = -10; return m;
}
function plaqueTex(text) {
  const c = document.createElement('canvas'); c.width = 1024; c.height = 160; const g = c.getContext('2d');
  g.fillStyle = '#3a2c22'; g.fillRect(0, 0, 1024, 160); g.strokeStyle = '#c8a050'; g.lineWidth = 6; g.strokeRect(10, 10, 1004, 140);
  g.font = '700 78px "Times New Roman", serif'; g.textAlign = 'center'; g.textBaseline = 'middle'; g.fillStyle = '#e8c070'; g.shadowColor = '#ff8a2a'; g.shadowBlur = 14; g.fillText(text, 512, 84);
  const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8; return t;
}

export function buildRome(S0, renderer, quality) {
  setSeed(7350211);
  const scene = new THREE.Group(); scene.name = 'world2'; S0.add(scene);
  const statics = [], obstacles = [], lights = [], fires = [];
  const B = new Builder();
  const proxyMat = new THREE.MeshBasicMaterial({ visible: false }), proxyGeo = new THREE.BoxGeometry(1, 1, 1);
  function proxy(x, y, z, w, h, d) { const m = new THREE.Mesh(proxyGeo, proxyMat); m.position.set(x, y, z); m.scale.set(w, h, d); m.updateMatrixWorld(true); m.matrixAutoUpdate = false; scene.add(m); statics.push(m); return m; }
  function obstacle(x, z, w, d, h, opts = {}) { const o = Object.assign({ x, z, hw: w / 2, hd: d / 2, h }, opts); obstacles.push(o); if (!opts.noProxy) o.mesh = proxy(x, h / 2, z, w, h, d); return o; }
  const inside = (x, z, r) => { for (const o of obstacles) if (Math.abs(x - o.x) < o.hw + r && Math.abs(z - o.z) < o.hd + r) return true; return false; };
  const free = (x, z, r) => { if (Math.abs(x) > A - 4 || Math.abs(z) > A - 4) return false; if (Math.abs(x) < 7 && z > -12 && z < 12) return false; return !inside(x, z, r); };

  // ----- materials -----
  const glowMap = tex('flag_glow.jpg', true);
  const M = {
    flag: pbr('flag', { extra: { emissiveMap: glowMap, emissive: new THREE.Color(0xff5a12), emissiveIntensity: 3.0 } }),
    marble: pbr('marble', { extra: { vertexColors: true } }),
    stone: pbr('ashlar', { extra: { vertexColors: true } }),
    bronze: new THREE.MeshStandardMaterial({ color: 0xb07a34, roughness: 0.32, metalness: 1, vertexColors: true }),
    gold: new THREE.MeshStandardMaterial({ color: 0xffc860, roughness: 0.22, metalness: 1 }),
    dark: new THREE.MeshStandardMaterial({ color: 0x120c0c, roughness: 0.9 }),
    leaf: new THREE.MeshStandardMaterial({ color: 0x14241a, roughness: 0.95, vertexColors: true }),
    cloth: new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.85, side: THREE.DoubleSide }),
    glowF: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xff6a1a, emissiveIntensity: 5 }),
    glowP: new THREE.MeshStandardMaterial({ color: 0x000000, emissive: 0xb04aff, emissiveIntensity: 4 }),
  };
  const lavaU = { uTime: { value: 0 } };
  M.flag.onBeforeCompile = sh => {
    sh.uniforms.uTime = lavaU.uTime;
    sh.vertexShader = sh.vertexShader.replace('#include <common>', '#include <common>\nvarying vec3 vWPos;').replace('#include <worldpos_vertex>', '#include <worldpos_vertex>\nvWPos = (modelMatrix * vec4(transformed,1.0)).xyz;');
    sh.fragmentShader = sh.fragmentShader.replace('#include <common>', `#include <common>
      varying vec3 vWPos; uniform float uTime;
      float wh(vec2 p){ return fract(sin(dot(p, vec2(41.3,289.1)))*43758.5); }
      float wn(vec2 p){ vec2 i=floor(p), f=fract(p); f=f*f*(3.-2.*f); return mix(mix(wh(i),wh(i+vec2(1,0)),f.x),mix(wh(i+vec2(0,1)),wh(i+vec2(1,1)),f.x),f.y); }`)
      .replace('#include <emissivemap_fragment>', `#include <emissivemap_fragment>
        float lz = smoothstep(0.5, 0.78, wn(vWPos.xz*0.03 + 11.0));
        totalEmissiveRadiance *= lz * (0.7 + 0.3 * sin(uTime*1.6 + vWPos.x*0.25 + vWPos.z*0.15));`);
  };
  M.flag.customProgramCacheKey = () => 'flag-w';

  // ----- ground -----
  const groundGeo = new THREE.PlaneGeometry(A * 2 + 60, A * 2 + 60, 1, 1); groundGeo.rotateX(-PI / 2);
  { const uv = groundGeo.attributes.uv, p = groundGeo.attributes.position; for (let i = 0; i < uv.count; i++) uv.setXY(i, p.getX(i) / 9, -p.getZ(i) / 9); }
  const ground = new THREE.Mesh(groundGeo, M.flag); ground.receiveShadow = true; scene.add(ground); statics.push(ground);
  // Via Sacra: a paved road of big marble slabs crossing the forum
  for (let t = -A + 2; t < A - 2; t += 4) { B.box(M.stone, 7, 0.06, 3.9, 0, 0.03, t, 0, 0x9a8a7a, 2.2); B.box(M.stone, 3.9, 0.06, 7, t, 0.03, 0, 0, 0x9a8a7a, 2.2); }

  // ----- geometry helpers -----
  const T = (x, y, z, ry = 0, sx = 1, sy = 1, sz = 1, rx = 0, rz = 0) => new THREE.Matrix4().compose(new THREE.Vector3(x, y, z), new THREE.Quaternion().setFromEuler(new THREE.Euler(rx, ry, rz)), new THREE.Vector3(sx, sy, sz));
  const colGeo = (() => { const g = new THREE.CylinderGeometry(1, 1.06, 1, 18, 1, true); return g; })();
  function column(x, y0, z, h, r, mat = M.marble, col = 0xe8e0d0, capital = true) {
    B.geo(mat, colGeo.clone(), T(x, y0 + h / 2, z, 0, r, h, r), col, 3);
    B.box(mat, r * 2.5, 0.3, r * 2.5, x, y0 + 0.15, z, 0, col, 2);              // base
    B.box(mat, r * 2.2, 0.18, r * 2.2, x, y0 + 0.39, z, 0, col, 2);
    if (capital) { B.box(mat, r * 2.6, 0.32, r * 2.6, x, y0 + h - 0.16, z, 0, col, 2); B.geo(mat, new THREE.CylinderGeometry(1.3, 1, 1, 14), T(x, y0 + h - 0.5, z, 0, r, 0.5, r), col, 2); }
  }
  // arch spandrel: a block with a semicircular cut at the bottom (opening width ow, springing at local y=0)
  function spandrelGeo(w, h, ow, depth) {
    const s = new THREE.Shape(); s.moveTo(-w / 2, 0); s.lineTo(-ow / 2, 0); s.absarc(0, 0, ow / 2, PI, 0, true); s.lineTo(w / 2, 0); s.lineTo(w / 2, h); s.lineTo(-w / 2, h); s.closePath();
    const g = new THREE.ExtrudeGeometry(s, { depth, bevelEnabled: false, curveSegments: 8 }); g.translate(0, 0, -depth / 2); return g;
  }
  const spCache = {};
  const sp = (w, h, ow, d) => { const k = [w, h, ow, d].join(); return (spCache[k] = spCache[k] || spandrelGeo(w, h, ow, d)).clone(); };

  // ----- perimeter: two-tier arcade facing inward, dark vaults behind with fires -----
  function arcadeRow(cx, cz, len, ry) {
    const c = Math.cos(ry), s = Math.sin(ry);
    const P = (lx, ly, lz) => [cx + lx * c + lz * s, ly, cz - lx * s + lz * c];
    const box = (mat, w, h, d, lx, ly, lz, col, ts = 3) => { const [x, y, z] = P(lx, ly, lz); B.box(mat, w, h, d, x, y, z, ry, col, ts); };
    const n = Math.round(len / 4.8), w = len / n, tiers = [[0, 6.6, 3.0, 3.4], [6.6, 5.6, 2.6, 2.9]];
    const tone = 0xc8b49a;
    for (let i = 0; i < n; i++) {
      const lx = -len / 2 + w / 2 + i * w;
      for (const [y0, th, ow, spring] of tiers) {
        const pw = (w - ow) / 2;
        box(M.stone, pw, spring, 1.3, lx - w / 2 + pw / 2, y0 + spring / 2, 0, tone, 3);
        box(M.stone, pw, spring, 1.3, lx + w / 2 - pw / 2, y0 + spring / 2, 0, tone, 3);
        const [x, y, z] = P(lx, y0 + spring, 0); B.geo(M.stone, sp(w, th - spring, ow, 1.3), T(x, y, z, ry), tone, 3);
        // engaged half column on the pier + entablature band
        const [cx2, , cz2] = P(lx - w / 2, 0, 0.62); column(cx2, y0, cz2, th - 0.6, 0.3, M.stone, 0xd8c8b0, true);
        box(M.stone, w + 0.02, 0.5, 1.7, lx, y0 + th - 0.25, 0.2, 0xb8a48a, 3);
        // the vault behind the arch: dark, some burning
        box(M.dark, w, th, 0.3, lx, y0 + th / 2, -3.6, 0xffffff, 3);
        if (srnd() < 0.18) { const [fx, fy, fz] = P(lx, y0 + 0.6, -2.6); B.box(M.glowF, 1.2, 0.3, 0.8, fx, fy, fz, ry); fires.push({ p: [fx, fy + 0.3, fz], vault: true }); }
      }
      box(M.stone, w + 0.02, 1.0, 1.4, lx, 12.7, 0, 0xb8a48a, 3);                                  // attic
      if (i % 3 === 0) box(M.cloth, 1.6, 4.2, 0.04, lx, 8.8, 0.75, spick([0x8a1010, 0x6a0a2a, 0xa02010]), 2); // banners
    }
    box(M.stone, len, 0.4, 5.2, 0, 0.2, -1.8, 0x8a7a6a, 3);                                         // vault floor
  }
  for (const [cx, cz, ry] of [[0, -A - 0.8, 0], [0, A + 0.8, PI], [-A - 0.8, 0, PI / 2], [A + 0.8, 0, -PI / 2]]) arcadeRow(cx, cz, A * 2 + 8, ry);
  for (const [x, z, w, d] of [[0, -A - 5, A * 2 + 12, 10], [0, A + 5, A * 2 + 12, 10], [-A - 5, 0, 10, A * 2 + 12], [A + 5, 0, 10, A * 2 + 12]]) obstacle(x, z, w, d, 14);

  // ----- the Colosseum looming beyond the east wall (visual only) -----
  {
    const R0 = 66, cx = A + 92, cz = -20, n = 64;
    for (let i = 0; i < n; i++) {
      const a = i / n * TAU, x = cx + Math.cos(a) * R0, z = cz + Math.sin(a) * R0, ry = -a - PI / 2 + PI, w = TAU * R0 / n;
      for (let t = 0; t < 4; t++) {
        const y0 = t * 11, th = t === 3 ? 7 : 11;
        if (t < 3) { B.geo(M.stone, sp(w + 0.05, th - 6, 4.0, 2.4), T(x, y0 + 6, z, ry), 0xb8a080, 6); const pw = (w - 4.0) / 2 + 0.02, off = w / 2 - pw / 2;
          for (const sg of [-1, 1]) B.box(M.stone, pw, 6, 2.4, x + Math.cos(ry) * off * sg, y0 + 3, z - Math.sin(ry) * off * sg, ry, 0xb8a080, 6); }
        else B.box(M.stone, w + 0.05, th, 2.4, x, y0 + th / 2, z, ry, 0xa89070, 6);
        B.box(M.stone, w + 0.1, 0.7, 2.9, x, y0 + th - 0.35, z, ry, 0x98846a, 6);
      }
    }
  }

  const statues = [];
  const stoneStatue = new THREE.MeshStandardMaterial({ map: tex('marble_c.jpg', true), normalMap: tex('marble_n.jpg', false), color: 0xd8d0c4, roughness: 0.45 });
  // ----- Temple of Jupiter (north) - climb the stairs onto the podium -----
  {
    const z0 = -A + 14, H0 = 2.4, tone = 0xece4d6;
    B.box(M.marble, 30, H0, 16, 0, H0 / 2, z0 - 8, 0, 0xd8cfc0, 4); obstacle(0, z0 - 8, 30, 16, H0);
    for (let i = 0; i < 6; i++) { const h = 0.4 * (i + 1), zz = z0 + 3 - i * 0.5 - 0.25; B.box(M.marble, 22, h, 0.5, 0, h / 2, zz, 0, tone, 3); obstacle(0, zz, 22, 0.5, h, { step: true }); }
    for (let i = 0; i < 8; i++) { const x = -12.6 + i * 3.6; column(x, H0, z0 - 1.5, 11, 0.62, M.marble, tone); obstacle(x, z0 - 1.5, 1.3, 1.3, H0 + 11); }
    for (const sx of [-12.6, 12.6]) for (let j = 1; j < 4; j++) { column(sx, H0, z0 - 1.5 - j * 3.6, 11, 0.62, M.marble, tone); obstacle(sx, z0 - 1.5 - j * 3.6, 1.3, 1.3, H0 + 11); }
    B.box(M.marble, 28, 1.6, 14, 0, H0 + 11.8, z0 - 7, 0, 0xd8cfc0, 4);                       // entablature
    B.box(M.gold, 27, 0.25, 0.1, 0, H0 + 11.4, z0 - 0.02);
    const ped = new THREE.Shape(); ped.moveTo(-14, 0); ped.lineTo(14, 0); ped.lineTo(0, 4.6); ped.closePath();
    const pg = new THREE.ExtrudeGeometry(ped, { depth: 14, bevelEnabled: false }); pg.translate(0, 0, -14);
    B.geo(M.marble, pg, T(0, H0 + 12.6, z0, 0), 0xcfc4b2, 4);
    const pr = new THREE.Shape(); pr.moveTo(-10, 0.4); pr.lineTo(10, 0.4); pr.lineTo(0, 3.6); pr.closePath();
    const prg = new THREE.ExtrudeGeometry(pr, { depth: 0.2, bevelEnabled: false }); B.geo(M.dark, prg, T(0, H0 + 12.6, z0 + 0.01, 0), 0xffffff, 0);
    // cella with a burning doorway into the underworld
    B.box(M.marble, 22, 11, 1.2, -0, H0 + 5.5, z0 - 10, 0, 0xd8cfc0, 4); obstacle(0, z0 - 10, 22, 1.2, H0 + 11);
    for (const sx of [-1, 1]) { B.box(M.marble, 1.2, 11, 9, sx * 10.4, H0 + 5.5, z0 - 5.5 - 0.0, 0, 0xd8cfc0, 4); obstacle(sx * 10.4, z0 - 6, 1.2, 8, H0 + 11); }
    fires.push({ p: [0, H0 + 4.5, z0 - 8.8], door: true });
    obstacle(0, z0 - 9.2, 7, 0.6, H0 + 9);
    var doorMat = new THREE.ShaderMaterial({
      transparent: true, depthWrite: false, blending: THREE.AdditiveBlending, uniforms: { uTime: { value: 0 } },
      vertexShader: 'varying vec2 vUv; void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.); }',
      fragmentShader: `varying vec2 vUv; uniform float uTime;
        void main(){ vec2 p=vUv; float f = sin(p.y*18.0 - uTime*4.0 + sin(p.x*9.0+uTime)*2.0)*0.5+0.5; float edge = smoothstep(0.0,0.12,p.x)*smoothstep(1.0,0.88,p.x)*smoothstep(1.0,0.85,p.y);
          vec3 c = mix(vec3(1.4,0.25,0.03), vec3(3.0,1.3,0.35), f*(1.0-p.y)) * edge; gl_FragColor = vec4(c, edge); }`,
    });
    const door = new THREE.Mesh(new THREE.PlaneGeometry(6.4, 9), doorMat); door.position.set(0, H0 + 4.5, z0 - 9.35); scene.add(door);
    // golden Jupiter on the apex
    var apex = statue('jupiter', M.gold, 0, H0 + 17.2, z0 - 1, 0, 1.6);
  }

  // ----- triumphal arch on the Via Sacra -----
  {
    const z = -30, tone = 0xe2d8c8;
    for (const sx of [-1, 1]) {
      B.box(M.marble, 4.2, 12, 5, sx * 5.6, 6, z, 0, tone, 4); obstacle(sx * 5.6, z, 4.2, 5, 15.6);
      for (const zz of [2.65, -2.65]) for (const dx of [-1.1, 1.1]) column(sx * 5.6 + dx, 0, z + zz, 11, 0.32, M.marble, tone);
    }
    B.geo(M.marble, sp(7.1, 4.4, 7, 5), T(0, 7.6, z), tone, 4);
    B.box(M.marble, 16, 0.7, 5.6, 0, 12.35, z, 0, 0xd8cfc0, 4);
    B.box(M.marble, 15, 3.6, 5, 0, 14.5, z, 0, tone, 4);
    const pt = plaqueTex('SPQR · INFERNVS'); const pm = new THREE.MeshStandardMaterial({ map: pt, emissiveMap: pt, emissive: 0xffffff, emissiveIntensity: 0.6, roughness: 0.6 });
    for (const sz of [1, -1]) { const pl = new THREE.Mesh(new THREE.PlaneGeometry(11, 1.7), pm); pl.position.set(0, 14.5, z + sz * 2.52); pl.rotation.y = sz > 0 ? 0 : PI; scene.add(pl); }
    B.box(M.bronze, 6, 1.2, 3, 0, 16.9, z, 0, 0x8aa070, 2);                                            // bronze quadriga base (patina)
  }
  // ----- obelisk -----
  {
    const x = 0, z = 34; B.box(M.marble, 3.4, 2.2, 3.4, x, 1.1, z, 0, 0xc8bca8, 3); obstacle(x, z, 3.4, 3.4, 2.2);
    const og = new THREE.CylinderGeometry(0.62 * Math.SQRT2, 0.95 * Math.SQRT2, 15, 4, 1); og.rotateY(PI / 4);
    B.geo(M.stone, og, T(x, 2.2 + 7.5, z), 0x9a6a5a, 3); obstacle(x, z, 2, 2, 17.2, { noProxy: false });
    const tip = new THREE.ConeGeometry(0.62 * Math.SQRT2, 1.4, 4); tip.rotateY(PI / 4); B.geo(M.gold, tip, T(x, 17.9, z), 0xffffff, 0);
  }
  // ----- round temples of Vesta (climb onto the podium) -----
  function rotunda(x, z) {
    const R = 5.4, tone = 0xe6ddd0;
    B.geo(M.marble, new THREE.CylinderGeometry(R + 0.8, R + 1.0, 1.2, 24), T(x, 0.6, z), 0xcfc4b2, 3); obstacle(x, z, 11, 11, 1.2);
    for (let i = 0; i < 12; i++) { const a = i / 12 * TAU, cx = x + Math.cos(a) * R, cz = z + Math.sin(a) * R; column(cx, 1.2, cz, 7, 0.36, M.marble, tone); obstacle(cx, cz, 0.8, 0.8, 8.2); }
    B.geo(M.marble, new THREE.CylinderGeometry(R + 0.5, R + 0.5, 1.0, 24, 1, true), T(x, 8.7, z), 0xd8cfc0, 3);
    B.geo(M.bronze, new THREE.SphereGeometry(R + 0.4, 24, 10, 0, TAU, 0, PI / 2), T(x, 9.2, z, 0, 1, 0.55, 1), 0x6a9a7a, 0);
    B.box(M.marble, 1.6, 1.0, 1.6, x, 1.7, z, 0, 0xcfc4b2, 2); B.box(M.glowF, 1.0, 0.1, 1.0, x, 2.25, z); fires.push({ p: [x, 2.6, z], altar: true });
  }
  rotunda(-46, -34); rotunda(48, 30);
  // ----- statues of the gods on pedestals -----
  function statue(type, mat, x, y, z, ry, s) {
    const R = rigInstance(type);
    R.mesh.material = R.mesh.material.map(() => mat); R.mesh.traverse(o => { if (o.isSprite) o.visible = false; });
    poseHuman(R, 0, { t: 1.3, speed: 0, lunge: type === 'mars' ? 0.35 : 0 }); R.mesh.castShadow = true;
    const g = new THREE.Group(); g.add(R.mesh); g.position.set(x, y, z); g.rotation.y = ry; g.scale.setScalar(s); scene.add(g); statues.push(g); return g;
  }
  for (const [type, x, z, ry] of [['mars', -40, 8, PI / 2], ['pluto', 40, -8, -PI / 2], ['centurion', -16, 60, PI], ['legion', 16, 60, PI]]) {
    B.box(M.marble, 3.2, 3.2, 3.2, x, 1.6, z, 0, 0xcfc4b2, 3); B.box(M.marble, 3.6, 0.4, 3.6, x, 3.3, z, 0, 0xdcd2c2, 3); obstacle(x, z, 3.6, 3.6, 3.5);
    statue(type, stoneStatue, x, 3.5, z, ry, 1.9);
  }

  // ----- colonnades along the forum (some broken), fallen drums as cover -----
  for (const sx of [-24, 24]) {
    let prevFull = null;
    for (let z = -54; z <= 54; z += 9) {
      if (Math.abs(z) < 6) { prevFull = null; continue; }
      const r = srnd(), x = sx;
      if (r < 0.62) { column(x, 0, z, 10, 0.55); obstacle(x, z, 1.25, 1.25, 10.3); if (prevFull !== null) B.box(M.marble, 1.4, 1.2, 9, x, 10.9, (z + prevFull) / 2, 0, 0xd8cfc0, 3); prevFull = z; }
      else {
        const h = srg(2.2, 5.5); column(x, 0, z, h, 0.55, M.marble, 0xd8d0c4, false); obstacle(x, z, 1.25, 1.25, h);
        B.box(M.marble, 1.1, 0.5, 1.1, x + 0.2, h + 0.1, z, srg(-0.4, 0.4), 0xcfc6b8, 2, srg(-0.4, 0.4));
        const fx = x + (sx < 0 ? 2.4 : -2.4), fz = z + srg(-2, 2);
        if (free(fx, fz, 1.2)) { B.geo(M.marble, colGeo.clone(), T(fx, 0.55, fz, srg(-0.4, 0.4), 0.55, 2.4, 0.55, 0, PI / 2), 0xd0c8ba, 3); obstacle(fx, fz, 2.4, 1.2, 1.1); }
        prevFull = null;
      }
    }
  }
  // ----- braziers (tripods with fire) -----
  const bowl = (() => { const pts = [[0, 0], [0.5, 0.05], [0.72, 0.3], [0.78, 0.5], [0.7, 0.5], [0.45, 0.2], [0, 0.15]].map(([r, y]) => new THREE.Vector2(r, y)); return new THREE.LatheGeometry(pts, 16); })();
  function brazier(x, z) {
    for (let i = 0; i < 3; i++) { const a = i / 3 * TAU; B.box(M.bronze, 0.09, 1.8, 0.09, x + Math.cos(a) * 0.32, 0.85, z + Math.sin(a) * 0.32, -a, 0x8a5a2a, 1, 0, 0.18); }
    B.geo(M.bronze, bowl.clone(), T(x, 1.6, z), 0x9a6a30, 1); B.box(M.glowF, 1.0, 0.06, 1.0, x, 1.95, z);
    obstacle(x, z, 1.0, 1.0, 2.0); fires.push({ p: [x, 2.3, z], brazier: true });
  }
  for (const [x, z] of [[-10, -12], [10, -12], [-10, 14], [10, 14], [-30, -48], [30, -48], [-30, 46], [30, 46], [-58, 0], [58, 0], [0, -56], [-60, -60], [60, 60], [-62, 58], [62, -58], [-16, -62], [16, -62]]) if (!inside(x, z, 1)) brazier(x, z);
  // ----- ruined walls (cover + sniper perches with rubble steps) -----
  function ruin(x, z, along) {
    const len = srg(6, 10), th = 1.1, h = srg(2.4, 3.4); const w = along ? len : th, d = along ? th : len;
    B.box(M.stone, w, h, d, x, h / 2, z, 0, 0xb4a28a, 3); obstacle(x, z, w, d, h);
    for (let i = 0; i < 4; i++) { const t = (i / 3 - 0.5) * len * 0.8, bh = srg(0.3, 1.0); B.box(M.stone, along ? srg(1, 2) : th * 0.9, bh, along ? th * 0.9 : srg(1, 2), x + (along ? t : 0), h + bh / 2 - 0.1, z + (along ? 0 : t), 0, 0xa8967e, 3); }
    const sx = x + (along ? srg(-len / 3, len / 3) : 1.6), sz = z + (along ? 1.6 : srg(-len / 3, len / 3));
    if (free(sx, sz, 0.8)) { B.box(M.stone, 1.5, 1.2, 1.5, sx, 0.6, sz, srg(-0.3, 0.3), 0x9a8a74, 2); obstacle(sx, sz, 1.6, 1.6, 1.2); }
  }
  for (let i = 0, n = 0; i < 400 && n < 16; i++) { const x = srg(-A + 10, A - 10), z = srg(-A + 10, A - 10); if (free(x, z, 6)) { ruin(x, z, srnd() < 0.5); n++; } }
  // sarcophagi / altars
  for (let i = 0, n = 0; i < 400 && n < 22; i++) {
    const x = srg(-A + 6, A - 6), z = srg(-A + 6, A - 6); if (!free(x, z, 2)) continue; const al = srnd() < 0.5;
    B.box(M.marble, al ? 2.6 : 1.3, 1.0, al ? 1.3 : 2.6, x, 0.5, z, 0, 0xd0c4b0, 2); B.box(M.marble, al ? 2.8 : 1.45, 0.22, al ? 1.45 : 2.8, x, 1.1, z, 0, 0xc0b4a0, 2);
    obstacle(x, z, al ? 2.8 : 1.45, al ? 1.45 : 2.8, 1.2); n++;
  }
  // cypress trees along the walls
  for (let i = 0, n = 0; i < 300 && n < 26; i++) {
    const side = (srnd() * 4) | 0, t = srg(-A + 8, A - 8), off = A - 4.5;
    const [x, z] = side === 0 ? [t, -off] : side === 1 ? [t, off] : side === 2 ? [-off, t] : [off, t];
    if (inside(x, z, 1.2)) continue;
    B.box(M.dark, 0.3, 1.5, 0.3, x, 0.75, z, 0, 0xffffff, 1);
    const h = srg(7, 10); B.geo(M.leaf, new THREE.ConeGeometry(1.1, h, 9), T(x, 1.2 + h / 2, z), spick([0x1a2a1e, 0x14221a, 0x22301e]), 0);
    B.geo(M.leaf, new THREE.SphereGeometry(1.15, 9, 7), T(x, 2.4, z, 0, 1, 1.4, 1), 0x1a281c, 0);
    obstacle(x, z, 1.0, 1.0, 8, { thin: true }); n++;
  }

  // ----- merge -----
  const meshes = B.finish(scene, true);

  // ----- lights -----
  const hemi = new THREE.HemisphereLight(0xc8b4ff, 0x5a3424, 1.55); scene.add(hemi);
  const moon = new THREE.DirectionalLight(0xffc890, 2.2); moon.position.set(28, 60, -90); moon.castShadow = quality !== 'low';
  const ss = quality === 'high' ? 2048 : 1024; moon.shadow.mapSize.set(ss, ss);
  const sc = moon.shadow.camera; sc.left = -45; sc.right = 45; sc.top = 45; sc.bottom = -45; sc.near = 1; sc.far = 240; moon.shadow.bias = -0.0004; moon.shadow.normalBias = 0.04;
  scene.add(moon); scene.add(moon.target);
  const NL = 8, plights = [];
  for (let i = 0; i < NL; i++) { const l = new THREE.PointLight(0xff8a3a, 0, 30, 1.6); scene.add(l); plights.push(l); }
  const lightSources = fires.map(f => ({ x: f.p[0], y: f.p[1], z: f.p[2], c: f.door ? 0xff4a10 : 0xff8a30, i: f.door ? 140 : f.vault ? 18 : 34, flick: 1 }));
  const fireTex = (() => { const c = document.createElement('canvas'); c.width = c.height = 64; const g = c.getContext('2d'); const r = g.createRadialGradient(32, 36, 0, 32, 36, 30); r.addColorStop(0, 'rgba(255,240,200,1)'); r.addColorStop(0.3, 'rgba(255,150,40,.8)'); r.addColorStop(1, 'rgba(255,40,0,0)'); g.fillStyle = r; g.fillRect(0, 0, 64, 64); const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; return t; })();
  const flames = [];
  for (const f of fires) { if (f.door) continue; const n = f.vault ? 2 : 4;
    for (let i = 0; i < n; i++) { const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: fireTex, color: i < 2 ? 0xff6a20 : 0xffc070, blending: THREE.AdditiveBlending, depthWrite: false, transparent: true })); s.position.set(f.p[0], f.p[1] + i * 0.3, f.p[2]); scene.add(s); flames.push({ s, b: srnd() * 10, i, base: f.vault ? 1.4 : 1.5, y: f.p[1] }); } }
  const EMB = quality === 'low' ? 300 : 800;
  const embGeo = new THREE.BufferGeometry(), embPos = new Float32Array(EMB * 3), embVel = new Float32Array(EMB * 3);
  for (let i = 0; i < EMB; i++) { embPos[i * 3] = srg(-A, A); embPos[i * 3 + 1] = srg(0, 18); embPos[i * 3 + 2] = srg(-A, A); embVel[i * 3] = srg(-0.6, 0.6); embVel[i * 3 + 1] = srg(-0.3, 0.8); embVel[i * 3 + 2] = srg(-0.6, 0.6); }
  embGeo.setAttribute('position', new THREE.BufferAttribute(embPos, 3));
  const embers = new THREE.Points(embGeo, new THREE.PointsMaterial({ map: fireTex, color: 0xffb060, size: 0.22, transparent: true, blending: THREE.AdditiveBlending, depthWrite: false }));
  embers.frustumCulled = false; scene.add(embers);
  const sky = romeSky(); scene.add(sky);
  const fog = new THREE.FogExp2(0x2c1a24, 0.0052), bg = new THREE.Color(0x140808);

  function bakeEnv() {
    const pm = new THREE.PMREMGenerator(renderer), rt = new THREE.WebGLCubeRenderTarget(256, { type: THREE.HalfFloatType });
    const cc = new THREE.CubeCamera(0.5, 300, rt); cc.position.set(0, 4, 0); scene.add(cc);
    S0.environment = null;
    plights.forEach((l, i) => { const s = lightSources[i]; if (s) { l.position.set(s.x, s.y, s.z); l.color.setHex(s.c); l.intensity = s.i; } });
    cc.update(renderer, S0);
    W.env = pm.fromCubemap(rt.texture).texture; scene.remove(cc); rt.dispose(); pm.dispose();
    S0.environment = W.env; S0.environmentIntensity = W.envI;
  }
  let flashT = 6, flash = 0, flashSeq = [];
  function ambient(dt, now, cam) {
    const t = now / 1000;
    lavaU.uTime.value = t; sky.material.uniforms.uTime.value = t; doorMat.uniforms.uTime.value = t;
    // lightning over the forum
    flashT -= dt; if (flashT <= 0) { flashT = 7 + Math.random() * 9; flashSeq = [0, 0.09, 0.22, 0.31].map(d => d + Math.random() * 0.05); W.onFlash && W.onFlash(); }
    flash = Math.max(0, flash - dt * 6); for (let i = flashSeq.length - 1; i >= 0; i--) { flashSeq[i] -= dt; if (flashSeq[i] <= 0) { flash = 1; flashSeq.splice(i, 1); } }
    sky.material.uniforms.uFlash.value = flash; hemi.intensity = 1.55 + flash * 0.9;
    if (cam) {
      const step = 90 / moon.shadow.mapSize.x, cx = Math.round(cam.position.x / step) * step, cz = Math.round(cam.position.z / step) * step;
      moon.target.position.set(cx, 0, cz); moon.position.set(cx + 28, 60, cz - 90); moon.target.updateMatrixWorld(); sky.position.copy(cam.position);
      lightSources.forEach(s => { s.d = (s.x - cam.position.x) ** 2 + (s.z - cam.position.z) ** 2 - (s.i > 100 ? 3000 : 0); });
      const near = lightSources.slice().sort((a, b) => a.d - b.d);
      plights.forEach((l, i) => { l.visible = i < W.nLights; const s = near[i]; if (!s) { l.intensity = 0; return; } l.position.set(s.x, s.y, s.z); l.color.setHex(s.c); l.distance = s.i > 100 ? 50 : 26;
        l.intensity = s.i * (0.82 + Math.sin(t * 13 + s.x) * 0.1 + Math.sin(t * 7.3 + s.z) * 0.08); });
    }
    for (const f of flames) { f.b += dt; const k = 0.7 + 0.3 * Math.sin(f.b * (9 + f.i * 3) + f.i) + (Math.random() - 0.5) * 0.08; f.s.scale.set((f.base - f.i * 0.22) * k, (f.base * 1.4 - f.i * 0.2) * k, 1); f.s.position.y = f.y + f.i * 0.28 + Math.sin(f.b * 5 + f.i) * 0.05; }
    for (let i = 0; i < EMB; i++) { const j = i * 3; embPos[j] += embVel[j] * dt + Math.sin(t + i) * 0.004; embPos[j + 1] += embVel[j + 1] * dt; embPos[j + 2] += embVel[j + 2] * dt; if (embPos[j + 1] > 18 || embPos[j + 1] < 0) { embPos[j + 1] = Math.random() * 2; embPos[j] = (Math.random() * 2 - 1) * A; embPos[j + 2] = (Math.random() * 2 - 1) * A; } }
    embGeo.attributes.position.needsUpdate = true;
  }
  function setShadows(on) { moon.castShadow = on; }
  function setLightCount(n) { W.nLights = Math.min(n, plights.length); plights.forEach((l, i) => { l.visible = i < W.nLights; }); }
  const W = { A, root: scene, fog, bg, envI: 1.15, statics, obstacles, ambient, bakeEnv, free, setShadows, setLightCount, nLights: 8, moon, hemi, sky, M, meshes, level: 2, onFlash: null };
  return W;
}
