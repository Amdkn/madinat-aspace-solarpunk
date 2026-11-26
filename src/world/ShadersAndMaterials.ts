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

export function createPillBadgeTexture(
  title: string,
  subtitle?: string,
  accentHex = '#14b8a6',
  urgent = false,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 112;
  const ctx = c.getContext('2d')!;
  const strokeCol = urgent ? '#ef4444' : accentHex;

  ctx.clearRect(0, 0, 512, 112);

  // Dark obsidian frosted pill background
  ctx.fillStyle = 'rgba(11, 18, 32, 0.93)';
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 96, 26);
  ctx.fill();

  ctx.lineWidth = 4;
  ctx.strokeStyle = strokeCol;
  ctx.beginPath();
  ctx.roundRect(8, 8, 496, 96, 26);
  ctx.stroke();

  // Status dot with subtle halo
  ctx.fillStyle = strokeCol;
  ctx.beginPath();
  ctx.arc(42, subtitle ? 42 : 56, 10, 0, Math.PI * 2);
  ctx.fill();

  ctx.textBaseline = 'middle';
  ctx.textAlign = 'left';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 25px "Plus Jakarta Sans", "Segoe UI", system-ui, sans-serif';
  const maxTitle = title.length > 32 ? title.slice(0, 31) + '…' : title;
  ctx.fillText(maxTitle, 66, subtitle ? 41 : 56);

  if (subtitle) {
    ctx.fillStyle = urgent ? '#fca5a5' : '#93c5fd';
    ctx.font = '600 19px "JetBrains Mono", Consolas, monospace';
    const maxSub = subtitle.length > 40 ? subtitle.slice(0, 39) + '…' : subtitle;
    ctx.fillText(maxSub, 66, 78);
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
    ctx.fillStyle = '#081326';
    ctx.fillRect(0, 0, s, s);
    const n = 8;
    const cell = s / n;
    for (let r = 0; r < n; r++) {
      for (let c = 0; c < n; c++) {
        ctx.fillStyle = (r + c) % 2 === 0 ? '#0c1d3a' : '#102448';
        ctx.fillRect(c * cell + 3, r * cell + 3, cell - 6, cell - 6);
        ctx.fillStyle = 'rgba(148, 185, 232, 0.22)';
        ctx.fillRect(c * cell + cell * 0.33, r * cell + 3, 1.5, cell - 6);
        ctx.fillRect(c * cell + cell * 0.66, r * cell + 3, 1.5, cell - 6);
      }
    }
    ctx.strokeStyle = '#6f8fb8';
    ctx.lineWidth = 3;
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
  map.repeat.set(6, 6);

  const rough = makeCanvas(512, (ctx, s) => {
    ctx.fillStyle = '#242424';
    ctx.fillRect(0, 0, s, s);
    const n = 8;
    const cell = s / n;
    ctx.strokeStyle = '#9a9a9a';
    ctx.lineWidth = 4;
    for (let i = 0; i <= n; i++) {
      ctx.beginPath();
      ctx.moveTo(i * cell, 0);
      ctx.lineTo(i * cell, s);
      ctx.moveTo(0, i * cell);
      ctx.lineTo(s, i * cell);
      ctx.stroke();
    }
  });
  rough.repeat.set(6, 6);
  return { map, rough };
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
      opacity: 0.52,
      roughness: 0.08,
      metalness: 0.12,
      reflectivity: 0.92,
      clearcoat: 1.0,
      emissive: '#d97706',
      emissiveIntensity: 0.22,
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
        vec3 zenith = vec3(0.42, 0.72, 0.96);
        vec3 horizon = vec3(0.98, 0.89, 0.70);
        vec3 ground = vec3(0.84, 0.72, 0.50);
        vec3 col = y >= 0.0
          ? mix(horizon, zenith, pow(y, 0.55))
          : mix(horizon, ground, pow(-y, 0.45));
        vec3 sunDir = normalize(vec3(0.6, 0.45, 0.4));
        float sunAmt = max(dot(normalize(vDir), sunDir), 0.0);
        col += vec3(1.0, 0.92, 0.72) * pow(sunAmt, 24.0) * 1.4;
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
        vec3 deepTeal = mix(vec3(0.03, 0.34, 0.36), vec3(0.02, 0.14, 0.22), uNightFactor);
        vec3 shallowTurquoise = mix(vec3(0.09, 0.66, 0.60), vec3(0.06, 0.42, 0.48), uNightFactor);

        float edgeInner = smoothstep(46.0, 42.2, r);
        float edgeOuter = smoothstep(72.0, 75.8, r);
        float shore = clamp(edgeInner + edgeOuter, 0.0, 1.0);

        float caust = causticPattern(vWorldPos.xz * 0.09);
        vec3 goldCaustic = mix(vec3(0.98, 0.85, 0.52), vec3(0.25, 0.95, 0.85), uNightFactor);

        vec3 viewDir = normalize(cameraPosition - vWorldPos);
        float fresnel = pow(1.0 - max(dot(viewDir, vec3(0.0, 1.0, 0.0)), 0.0), 3.2);

        vec3 halfVec = normalize(uSunDir + viewDir);
        float spec = pow(max(dot(vec3(0.0, 1.0, 0.0), halfVec), 0.0), 96.0);

        vec3 col = mix(deepTeal, shallowTurquoise, shore * 0.65 + 0.25);
        col += goldCaustic * caust * 0.42;
        col = mix(col, mix(vec3(0.98, 0.90, 0.72), vec3(0.08, 0.28, 0.42), uNightFactor), fresnel * 0.55);
        col += vec3(1.0, 0.92, 0.70) * spec * (1.0 - uNightFactor * 0.7);
        col = mix(col, vec3(0.94, 0.98, 0.96), shore * 0.38);

        gl_FragColor = vec4(col, 0.91);
      }
    `,
  });
}

export const SHARED_MATERIALS = {
  limestone: new THREE.MeshStandardMaterial({ color: '#e5d4b4', roughness: 0.72, metalness: 0.04 }),
  warmSandstone: new THREE.MeshStandardMaterial({ color: '#dec8a6', roughness: 0.8, metalness: 0.03 }),
  royalMarble: new THREE.MeshStandardMaterial({ color: '#e3cda7', roughness: 0.42, metalness: 0.08 }),
  abbassidGold: new THREE.MeshStandardMaterial({
    color: '#d9a441',
    roughness: 0.22,
    metalness: 0.9,
    emissive: '#6b4710',
    emissiveIntensity: 0.14,
  }),
  appleGlass: new THREE.MeshPhysicalMaterial({
    color: '#bfe6ec',
    transparent: true,
    opacity: 0.48,
    roughness: 0.08,
    metalness: 0.12,
    reflectivity: 0.92,
    emissive: '#d97706',
    emissiveIntensity: 0.2,
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
    color: '#0e2246',
    roughness: 0.24,
    metalness: 0.8,
    emissive: '#061126',
    emissiveIntensity: 0.1,
  }),
  warmCedar: new THREE.MeshStandardMaterial({ color: '#8f5b32', roughness: 0.56, metalness: 0.06 }),
  roadStone: new THREE.MeshStandardMaterial({ color: '#cbbda3', roughness: 0.82, metalness: 0.05 }),
};
