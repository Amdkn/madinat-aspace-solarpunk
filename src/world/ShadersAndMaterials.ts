import * as THREE from 'three';

function makeCanvas(size: number, draw: (ctx: CanvasRenderingContext2D, s: number) => void): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = size;
  c.height = size;
  const ctx = c.getContext('2d')!;
  draw(ctx, size);
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.anisotropy = 8;
  tex.needsUpdate = true;
  return tex;
}

let cachedMaterials: Record<string, THREE.Material> | null = null;
let cachedToonRamp: THREE.DataTexture | null = null;
const cachedToonMap = new Map<string, THREE.MeshToonMaterial>();

export function toonMat(
  color: string,
  opts: { emissive?: string; emissiveIntensity?: number; transparent?: boolean; opacity?: number; doubleSide?: boolean } = {},
): THREE.MeshToonMaterial {
  if (!cachedToonRamp) {
    cachedToonRamp = new THREE.DataTexture(new Uint8Array([115, 195, 255]), 3, 1, THREE.RedFormat);
    cachedToonRamp.minFilter = THREE.NearestFilter;
    cachedToonRamp.magFilter = THREE.NearestFilter;
    cachedToonRamp.generateMipmaps = false;
    cachedToonRamp.needsUpdate = true;
  }
  const key = `${color}|${opts.emissive ?? ''}|${opts.emissiveIntensity ?? 1}|${opts.opacity ?? 1}|${opts.doubleSide ? 1 : 0}`;
  let m = cachedToonMap.get(key);
  if (!m) {
    m = new THREE.MeshToonMaterial({
      color,
      gradientMap: cachedToonRamp,
      emissive: opts.emissive ?? '#000000',
      emissiveIntensity: opts.emissiveIntensity ?? 1,
      transparent: opts.transparent ?? (opts.opacity !== undefined && opts.opacity < 1),
      opacity: opts.opacity ?? 1,
      side: opts.doubleSide ? THREE.DoubleSide : THREE.FrontSide,
    });
    cachedToonMap.set(key, m);
  }
  return m;
}

export function createPillBadgeTexture(
  title: string,
  subtitle?: string,
  accentHex = '#14b8a6',
  urgent = false,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 680;
  c.height = 116;
  const ctx = c.getContext('2d')!;
  const strokeCol = urgent ? '#ef4444' : accentHex;

  ctx.clearRect(0, 0, 680, 116);

  // Nearly opaque obsidian pill so floating badges never wash out against glass windows
  ctx.fillStyle = 'rgba(11, 18, 32, 0.96)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 664, 100, 26);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = strokeCol;
  ctx.beginPath();
  ctx.roundRect(8, 8, 664, 100, 26);
  ctx.stroke();

  // Status dot with subtle halo
  ctx.fillStyle = strokeCol;
  ctx.beginPath();
  ctx.arc(42, subtitle ? 42 : 58, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  let titleSize = 25;
  while (titleSize > 14) {
    ctx.font = `700 ${titleSize}px "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif`;
    if (ctx.measureText(title).width <= 586) break;
    titleSize -= 1;
  }
  ctx.fillText(title, 66, subtitle ? 42 : 58, 586);

  if (subtitle) {
    ctx.fillStyle = urgent ? '#fca5a5' : '#93c5fd';
    let subSize = 19;
    while (subSize > 13) {
      ctx.font = `600 ${subSize}px "JetBrains Mono", Consolas, monospace`;
      if (ctx.measureText(subtitle).width <= 586) break;
      subSize -= 1;
    }
    ctx.fillText(subtitle, 66, 80, 586);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  tex.needsUpdate = true;
  return tex;
}

function createTravertineMaps() {
  const map = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#e5d4b4';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4;
      const cw = s / cols;
      const offset = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const shade = ((r * 13 + c * 29) % 14) - 7;
        ctx.fillStyle = `rgb(${230 + shade}, ${213 + shade}, ${182 + shade})`;
        ctx.fillRect(c * cw + offset + 2, r * rh + 2, cw - 4, rh - 4);
        ctx.fillStyle = 'rgba(170, 138, 94, 0.16)';
        for (let k = 0; k < 5; k++) {
          const sy = r * rh + 6 + ((k * 17 + c * 7) % (rh - 12));
          ctx.fillRect(c * cw + offset + 8, sy, cw * 0.6, 1.5);
        }
      }
      ctx.fillStyle = 'rgba(135, 110, 78, 0.36)';
      ctx.fillRect(0, r * rh, s, 2);
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(2, 2);

  const bump = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      ctx.fillStyle = '#555555';
      ctx.fillRect(0, r * rh, s, 2);
      const cols = 4;
      const cw = s / cols;
      const offset = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        ctx.fillRect(c * cw + offset, r * rh, 2, rh);
      }
    }
  });
  bump.repeat.set(2, 2);

  return { map, bump };
}

function createMarbleMaps() {
  const map = makeCanvas(512, (ctx, s) => {
    // Rich warm Baghdadi honey-limestone instead of bleached white
    ctx.fillStyle = '#dfc8a2';
    ctx.fillRect(0, 0, s, s);
    const step = s / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const delta = ((x * 7 + y * 11) % 12) - 6;
        ctx.fillStyle = `rgb(${224 + delta}, ${201 + delta}, ${163 + delta})`;
        ctx.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
        // Subtle inlaid Abbassid corner diamonds
        ctx.fillStyle = 'rgba(176, 134, 62, 0.24)';
        ctx.save();
        ctx.translate(x * step, y * step);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-7, -7, 14, 14);
        ctx.restore();
      }
    }
    ctx.strokeStyle = 'rgba(176, 132, 58, 0.24)';
    ctx.lineWidth = 1.6;
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.moveTo(0, (i * 93) % s);
      ctx.bezierCurveTo(s * 0.3, (i * 150) % s, s * 0.7, (i * 210) % s, s, (i * 77 + 40) % s);
      ctx.stroke();
    }
    ctx.strokeStyle = 'rgba(155, 114, 52, 0.42)';
    ctx.lineWidth = 2.5;
    for (let i = 1; i < 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, s);
      ctx.moveTo(0, i * step);
      ctx.lineTo(s, i * step);
      ctx.stroke();
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(3, 3);
  return { map };
}

function createSolarPvMaps() {
  const map = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#091d3b';
    ctx.fillRect(0, 0, s, s);
    const n = 6;
    const cell = s / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#0d2954' : '#143d78';
        ctx.fillRect(c * cell + 5, r * cell + 5, cell - 10, cell - 10);
        // Bright silver-cyan silicon collector fingers & golden rim highlight
        ctx.fillStyle = 'rgba(125, 211, 252, 0.55)';
        ctx.fillRect(c * cell + cell * 0.33, r * cell + 5, 2.5, cell - 10);
        ctx.fillRect(c * cell + cell * 0.66, r * cell + 5, 2.5, cell - 10);
        ctx.fillStyle = 'rgba(56, 189, 248, 0.16)';
        ctx.fillRect(c * cell + 5, r * cell + cell * 0.5, cell - 10, 2);
      }
    }
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 6;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, s);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(s, i * cell);
      ctx.stroke();
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(8, 3);

  const rough = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#202020';
    ctx.fillRect(0, 0, s, s);
    const n = 6;
    const cell = s / n;
    ctx.strokeStyle = '#aaaaaa';
    ctx.lineWidth = 6;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, s);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(s, i * cell);
      ctx.stroke();
    }
  });
  rough.repeat.set(8, 3);
  return { map, rough };
}

function createCourtyardPlazaMaps() {
  const map = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#d9bf94';
    ctx.fillRect(0, 0, s, s);
    const step = s / 4;
    for (let y = 0; y < 4; y++) {
      for (let x = 0; x < 4; x++) {
        const d = ((x * 13 + y * 23) % 16) - 8;
        ctx.fillStyle = `rgb(${219 + d}, ${194 + d}, ${152 + d})`;
        ctx.fillRect(x * step + 3, y * step + 3, step - 6, step - 6);
        ctx.strokeStyle = 'rgba(150, 110, 52, 0.34)';
        ctx.lineWidth = 2;
        ctx.strokeRect(x * step + 10, y * step + 10, step - 20, step - 20);
        // Baghdadi inlaid gold-ochre diamond joints
        ctx.fillStyle = 'rgba(176, 130, 54, 0.32)';
        ctx.save();
        ctx.translate(x * step, y * step);
        ctx.rotate(Math.PI / 4);
        ctx.fillRect(-9, -9, 18, 18);
        ctx.restore();
      }
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(26, 26);

  const bump = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#c8c8c8';
    ctx.fillRect(0, 0, s, s);
    const step = s / 4;
    ctx.strokeStyle = '#5a5a5a';
    ctx.lineWidth = 4;
    for (let i = 0; i <= 4; i++) {
      ctx.beginPath();
      ctx.moveTo(i * step, 0);
      ctx.lineTo(i * step, s);
      ctx.moveTo(0, i * step);
      ctx.lineTo(s, i * step);
      ctx.stroke();
    }
  });
  bump.repeat.set(26, 26);
  return { map, bump };
}

function createRoadStoneMaps() {
  const map = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#c6b494';
    ctx.fillRect(0, 0, s, s);
    const rows = 8;
    const rh = s / rows;
    for (let r = 0; r < rows; r++) {
      const cols = 4;
      const cw = s / cols;
      const off = (r % 2) * (cw * 0.5);
      for (let c = -1; c <= cols; c++) {
        const d = ((r * 19 + c * 11) % 14) - 7;
        ctx.fillStyle = `rgb(${200 + d}, ${182 + d}, ${152 + d})`;
        ctx.fillRect(c * cw + off + 2, r * rh + 2, cw - 4, rh - 4);
      }
    }
    ctx.fillStyle = 'rgba(130, 102, 66, 0.35)';
    for (let r = 0; r < rows; r++) ctx.fillRect(0, r * rh, s, 2);
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(22, 22);
  return { map };
}

function createDesertDuneMaps() {
  const map = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#e2c590';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 4) {
      const wave = Math.sin((y / s) * Math.PI * 6) * 14 + Math.cos((y / s) * Math.PI * 12) * 5;
      ctx.fillStyle = `rgb(${226 + wave}, ${196 + wave * 0.9}, ${142 + wave * 0.7})`;
      ctx.fillRect(0, y, s, 4);
    }
    for (let i = 0; i < 420; i++) {
      const px = (i * 89) % s;
      const py = (i * 137) % s;
      ctx.fillStyle = i % 2 === 0 ? 'rgba(176, 134, 72, 0.16)' : 'rgba(255, 238, 198, 0.18)';
      ctx.fillRect(px, py, 24, 2);
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(16, 16);

  const bump = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#888888';
    ctx.fillRect(0, 0, s, s);
    for (let y = 0; y < s; y += 2) {
      const v = Math.floor(128 + Math.sin((y / s) * Math.PI * 6) * 55);
      ctx.fillStyle = `rgb(${v},${v},${v})`;
      ctx.fillRect(0, y, s, 2);
    }
  });
  bump.repeat.set(16, 16);
  return { map, bump };
}

function createGlassMullionMap() {
  const map = makeCanvas(512, (ctx, s) => {
    const grad = ctx.createLinearGradient(0, 0, 0, s);
    grad.addColorStop(0, '#c8e9ef');
    grad.addColorStop(0.55, '#fde8b8');
    grad.addColorStop(1, '#e8c488');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, s, s);

    // Bronze Apple Park × Baghdad vertical mullions & transoms
    ctx.fillStyle = '#5c4628';
    for (let i = 0; i < 4; i++) {
      ctx.fillRect(i * (s / 4), 0, 10, s);
    }
    ctx.fillRect(0, 0, s, 12);
    ctx.fillRect(0, s * 0.5, s, 9);
    ctx.fillRect(0, s - 12, s, 12);
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(3, 1);
  return map;
}

function createDappledFoliageMaps(baseHex: string, midHex: string, hiHex: string) {
  const map = makeCanvas(256, (ctx, s) => {
    ctx.fillStyle = baseHex;
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 240; i++) {
      const x = (i * 67 + 23) % s;
      const y = (i * 113 + 41) % s;
      const rx = 5 + (i % 7);
      const ry = 3 + (i % 5);
      ctx.fillStyle = i % 3 === 0 ? hiHex : midHex;
      ctx.save();
      ctx.translate(x, y);
      ctx.rotate((i % 12) * 0.5);
      ctx.beginPath();
      ctx.ellipse(0, 0, rx, ry, 0, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  });
  map.colorSpace = THREE.SRGBColorSpace;
  map.repeat.set(3, 3);

  const bump = makeCanvas(256, (ctx, s) => {
    ctx.fillStyle = '#555555';
    ctx.fillRect(0, 0, s, s);
    for (let i = 0; i < 240; i++) {
      const x = (i * 67 + 23) % s;
      const y = (i * 113 + 41) % s;
      ctx.fillStyle = i % 2 === 0 ? '#dddddd' : '#aaaaaa';
      ctx.beginPath();
      ctx.arc(x, y, 4 + (i % 5), 0, Math.PI * 2);
      ctx.fill();
    }
  });
  bump.repeat.set(3, 3);
  return { map, bump };
}

export function getSolarpunkMaterialLibrary(): Record<string, THREE.Material> {
  if (cachedMaterials) return cachedMaterials;

  const trav = createTravertineMaps();
  const marb = createMarbleMaps();
  const pv = createSolarPvMaps();
  const glassMap = createGlassMullionMap();
  const folOlive = createDappledFoliageMaps('#3d621e', '#58822e', '#86a951');
  const folPalm = createDappledFoliageMaps('#285716', '#3d7421', '#6fa638');
  const folCypress = createDappledFoliageMaps('#193a14', '#274f1e', '#3c6e2c');

  cachedMaterials = {
    Travertine: new THREE.MeshStandardMaterial({
      map: trav.map,
      bumpMap: trav.bump,
      bumpScale: 0.08,
      roughness: 0.72,
      metalness: 0.04,
    }),
    RoyalMarble: new THREE.MeshStandardMaterial({
      map: marb.map,
      roughness: 0.42,
      metalness: 0.08,
    }),
    AbbassidGold: new THREE.MeshStandardMaterial({
      color: '#e0aa42',
      roughness: 0.22,
      metalness: 0.9,
      emissive: '#61410a',
      emissiveIntensity: 0.14,
    }),
    ArchGlass: new THREE.MeshPhysicalMaterial({
      map: glassMap,
      color: '#ccebf0',
      transparent: true,
      opacity: 0.58,
      roughness: 0.08,
      metalness: 0.14,
      reflectivity: 0.94,
      clearcoat: 1.0,
      emissive: '#f59e0b',
      emissiveIntensity: 0.36,
    }),
    DomeAmberGlass: new THREE.MeshPhysicalMaterial({
      color: '#f5d484',
      transparent: true,
      opacity: 0.34,
      roughness: 0.09,
      metalness: 0.22,
      clearcoat: 0.9,
      side: THREE.DoubleSide,
    }),
    SolarPV: new THREE.MeshStandardMaterial({
      map: pv.map,
      roughnessMap: pv.rough,
      roughness: 0.26,
      metalness: 0.78,
      emissive: '#061126',
      emissiveIntensity: 0.06,
    }),
    WarmCedar: new THREE.MeshStandardMaterial({
      color: '#8f5b32',
      roughness: 0.56,
      metalness: 0.06,
    }),
    DarkMetal: new THREE.MeshStandardMaterial({
      color: '#1e293b',
      roughness: 0.34,
      metalness: 0.82,
    }),
    FoliageOlive: new THREE.MeshStandardMaterial({
      map: folOlive.map,
      bumpMap: folOlive.bump,
      bumpScale: 0.16,
      roughness: 0.8,
      metalness: 0.02,
    }),
    FoliagePalm: new THREE.MeshStandardMaterial({
      map: folPalm.map,
      bumpMap: folPalm.bump,
      bumpScale: 0.14,
      roughness: 0.68,
      metalness: 0.04,
      side: THREE.DoubleSide,
    }),
    FoliageCypress: new THREE.MeshStandardMaterial({
      map: folCypress.map,
      bumpMap: folCypress.bump,
      bumpScale: 0.18,
      roughness: 0.84,
      metalness: 0.02,
    }),
    CarPaint: new THREE.MeshPhysicalMaterial({
      color: '#e6aa2c',
      roughness: 0.14,
      metalness: 0.82,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    }),
    TireRubber: new THREE.MeshStandardMaterial({
      color: '#1b1c20',
      roughness: 0.86,
      metalness: 0.05,
    }),
    HeadlightGlow: new THREE.MeshStandardMaterial({
      color: '#fff8db',
      emissive: '#fde68a',
      emissiveIntensity: 1.8,
    }),
    TaillightGlow: new THREE.MeshStandardMaterial({
      color: '#ff2b3a',
      emissive: '#ef4444',
      emissiveIntensity: 1.8,
    }),
    TurquoiseWater: new THREE.MeshStandardMaterial({
      color: '#10a398',
      roughness: 0.08,
      metalness: 0.25,
      emissive: '#064e3b',
      emissiveIntensity: 0.2,
    }),
  };

  return cachedMaterials;
}

export function applySolarpunkMaterials(
  root: THREE.Object3D,
  overrides?: Partial<Record<string, THREE.Material>>,
): THREE.Object3D {
  const lib = getSolarpunkMaterialLibrary();

  const resolveMat = (origName: string): THREE.Material | null => {
    const clean = origName.replace(/\.\d+$/, '');
    if (overrides && overrides[clean]) return overrides[clean]!;
    if (lib[clean]) return lib[clean];
    for (const key of Object.keys(lib)) {
      if (clean.startsWith(key)) return lib[key];
    }
    return null;
  };

  root.traverse((obj) => {
    if (!(obj as THREE.Mesh).isMesh) return;
    const mesh = obj as THREE.Mesh;
    const orig = mesh.material;

    let isGlass = false;
    if (Array.isArray(orig)) {
      mesh.material = orig.map((m) => {
        const rep = resolveMat(m.name);
        if (m.name.includes('Glass')) isGlass = true;
        return rep ?? m;
      });
    } else if (orig) {
      const rep = resolveMat(orig.name);
      if (orig.name.includes('Glass')) isGlass = true;
      if (rep) mesh.material = rep;
    }

    mesh.castShadow = !isGlass;
    mesh.receiveShadow = true;
  });

  return root;
}

export function createDesertEnvironmentTexture(renderer: THREE.WebGLRenderer): THREE.Texture {
  const pmrem = new THREE.PMREMGenerator(renderer);
  const envScene = new THREE.Scene();

  const skyGeo = new THREE.SphereGeometry(50, 32, 24);
  const skyMat = new THREE.ShaderMaterial({
    side: THREE.BackSide,
    vertexShader: `
      varying vec3 vDir;
      void main() {
        vDir = normalize(position);
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
      }
    `,
    fragmentShader: `
      varying vec3 vDir;
      void main() {
        float y = vDir.y;
        vec3 zenith = vec3(0.32, 0.58, 0.88);
        vec3 horizon = vec3(1.0, 0.84, 0.56);
        vec3 ground = vec3(0.32, 0.34, 0.40);
        vec3 col = y >= 0.0
          ? mix(horizon, zenith, pow(y, 0.52))
          : mix(horizon, ground, pow(-y, 0.45));
        vec3 sunDir = normalize(vec3(-0.72, 0.24, 0.48));
        float sunAmt = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.88, 0.58) * pow(sunAmt, 20.0) * 1.6;
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  });
  envScene.add(new THREE.Mesh(skyGeo, skyMat));

  const rt = pmrem.fromScene(envScene, 0.04);
  skyGeo.dispose();
  skyMat.dispose();
  pmrem.dispose();
  return rt.texture;
}

export function createEmeraldWaterMaterial(): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    transparent: true,
    uniforms: {
      uTime: { value: 0 },
      uSunDir: { value: new THREE.Vector3(0.5, 0.6, 0.4).normalize() },
      uNightFactor: { value: 0 },
    },
    vertexShader: /* glsl */ `
      uniform float uTime;
      varying vec3 vWorldPos;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec4 wp = modelMatrix * vec4(position, 1.0);
        float r = length(wp.xz);
        float wave = sin(wp.x * 0.22 + uTime * 1.4) * 0.045
                   + cos(wp.z * 0.25 - uTime * 1.1) * 0.045
                   + sin(r * 0.45 - uTime * 2.0) * 0.03;
        wp.y += wave;
        vWorldPos = wp.xyz;
        gl_Position = projectionMatrix * viewMatrix * wp;
      }
    `,
    fragmentShader: /* glsl */ `
      uniform float uTime;
      uniform vec3 uSunDir;
      uniform float uNightFactor;
      varying vec3 vWorldPos;
      varying vec2 vUv;

      float causticPattern(vec2 p) {
        vec2 i = p;
        float c = 1.0;
        float inten = 0.0065;
        for (int n = 0; n < 3; n++) {
          float t = uTime * (1.0 - (3.2 / float(n + 1))) * 0.45;
          i = p + vec2(cos(t - i.x) + sin(t + i.y), sin(t - i.y) + cos(t + i.x));
          c += 1.0 / length(vec2(p.x / (sin(i.x + t) / inten), p.y / (cos(i.y + t) / inten)));
        }
        c /= 3.0;
        c = 1.17 - pow(c, 1.35);
        return clamp(pow(abs(c), 6.0), 0.0, 1.0);
      }

      void main() {
        float r = length(vWorldPos.xz);
        float dWx = cos(vWorldPos.x * 0.22 + uTime * 1.4) * 0.09 + cos(r * 0.45 - uTime * 2.0) * (vWorldPos.x / max(1.0, r)) * 0.06;
        float dWz = -sin(vWorldPos.z * 0.25 - uTime * 1.1) * 0.09 + cos(r * 0.45 - uTime * 2.0) * (vWorldPos.z / max(1.0, r)) * 0.06;
        vec3 N = normalize(vec3(-dWx, 1.0, -dWz));

        vec3 deepTeal = mix(vec3(0.004, 0.11, 0.125), vec3(0.002, 0.02, 0.04), uNightFactor);
        vec3 shallowTurquoise = mix(vec3(0.010, 0.34, 0.28), vec3(0.006, 0.12, 0.16), uNightFactor);

        float edgeInner = 1.0 - smoothstep(41.8, 44.5, r);
        float edgeOuter = smoothstep(73.8, 76.3, r);
        float shore = clamp(edgeInner + edgeOuter, 0.0, 1.0);

        float caust = smoothstep(0.62, 0.96, causticPattern(vWorldPos.xz * 0.09));
        vec3 aquaCaustic = mix(vec3(0.06, 0.46, 0.38), vec3(0.04, 0.58, 0.48), uNightFactor);

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(viewDir, N), 0.0), 3.2);

        vec3 halfVec = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(N, halfVec), 0.0), 96.0);

        vec3 col = mix(deepTeal, shallowTurquoise, shore * 0.55 + 0.24);
        col += aquaCaustic * caust * 0.26;
        col = mix(col, mix(vec3(0.05, 0.34, 0.36), vec3(0.02, 0.10, 0.18), uNightFactor), fresnel * 0.28);
        col = mix(col, vec3(0.18, 0.58, 0.50), shore * 0.26);
        col += vec3(0.95, 0.72, 0.34) * spec * (0.88 - uNightFactor * 0.6);

        gl_FragColor = vec4(col, 0.96);
      }
    `,
  });
}

const sharedPlaza = createCourtyardPlazaMaps();
const sharedRoad = createRoadStoneMaps();
const sharedDunes = createDesertDuneMaps();
const sharedPv = createSolarPvMaps();

export const SHARED_MATERIALS = {
  limestone: new THREE.MeshStandardMaterial({
    map: sharedPlaza.map,
    bumpMap: sharedPlaza.bump,
    bumpScale: 0.06,
    roughness: 0.74,
    metalness: 0.04,
  }),
  warmSandstone: new THREE.MeshStandardMaterial({
    map: sharedPlaza.map,
    bumpMap: sharedPlaza.bump,
    bumpScale: 0.07,
    color: '#ebd7b5',
    roughness: 0.8,
    metalness: 0.03,
  }),
  royalMarble: new THREE.MeshStandardMaterial({ color: '#e3cda7', roughness: 0.42, metalness: 0.08 }),
  abbassidGold: new THREE.MeshStandardMaterial({
    color: '#e0aa42',
    roughness: 0.22,
    metalness: 0.9,
    emissive: '#6b4710',
    emissiveIntensity: 0.16,
  }),
  appleGlass: new THREE.MeshPhysicalMaterial({
    color: '#bfe6ec',
    transparent: true,
    opacity: 0.56,
    roughness: 0.08,
    metalness: 0.14,
    reflectivity: 0.94,
    emissive: '#f59e0b',
    emissiveIntensity: 0.34,
  }),
  domeGoldGlass: new THREE.MeshPhysicalMaterial({
    color: '#f5d484',
    transparent: true,
    opacity: 0.34,
    roughness: 0.09,
    metalness: 0.22,
    side: THREE.DoubleSide,
  }),
  solarPanelPv: new THREE.MeshStandardMaterial({
    map: sharedPv.map,
    roughnessMap: sharedPv.rough,
    roughness: 0.24,
    metalness: 0.8,
    emissive: '#06132b',
    emissiveIntensity: 0.12,
  }),
  warmCedar: new THREE.MeshStandardMaterial({ color: '#8f5b32', roughness: 0.56, metalness: 0.06 }),
  darkMetal: new THREE.MeshStandardMaterial({ color: '#1e293b', roughness: 0.34, metalness: 0.82 }),
  roadStone: new THREE.MeshStandardMaterial({
    map: sharedRoad.map,
    roughness: 0.82,
    metalness: 0.05,
  }),
  desertDunes: new THREE.MeshStandardMaterial({
    map: sharedDunes.map,
    bumpMap: sharedDunes.bump,
    bumpScale: 0.16,
    roughness: 0.92,
    metalness: 0.02,
  }),
};
