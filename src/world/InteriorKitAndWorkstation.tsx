import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DepartmentStream, SolarDepartment } from '../data/madinatOntology';
import { ArticulatedCharacter } from './ArticulatedCharacter';
import { createPillBadgeTexture, SHARED_MATERIALS } from './ShadersAndMaterials';

useGLTF.preload('/models/desk_props.glb');
useGLTF.preload('/models/lounge.glb');
useGLTF.preload('/models/kitchen.glb');
useGLTF.preload('/models/plants.glb');
useGLTF.preload('/models/dog-shiba.glb');

// Color palettes calibrated to Blender node material names exported by agent-office / cubefarm
const PALETTE_CACHE = new Map<string, THREE.MeshStandardMaterial>();
function stdMat(color: string, opts: { roughness?: number; metalness?: number; emissive?: string; emissiveIntensity?: number } = {}) {
  const key = `${color}|${opts.roughness ?? 0.6}|${opts.metalness ?? 0.05}|${opts.emissive ?? ''}`;
  let m = PALETTE_CACHE.get(key);
  if (!m) {
    m = new THREE.MeshStandardMaterial({
      color,
      roughness: opts.roughness ?? 0.6,
      metalness: opts.metalness ?? 0.05,
      emissive: opts.emissive ? new THREE.Color(opts.emissive) : undefined,
      emissiveIntensity: opts.emissiveIntensity ?? 0,
    });
    PALETTE_CACHE.set(key, m);
  }
  return m;
}

const PLANT_PALETTE: Record<string, string> = {
  Pot: '#c97b4b',
  Glaze: '#0d9488',
  Soil: '#4a3222',
  Bark: '#7c5338',
  Leaf: '#2f6f2b',
  LeafDark: '#1e4d23',
};

const DESK_PROP_PALETTE: Record<string, string> = {
  CoverRed: '#e11d48',
  CoverBlue: '#0284c7',
  CoverOrange: '#d97706',
  Pages: '#f5ebd6',
  Coffee: '#4a2c18',
};

const LOUNGE_PALETTE: Record<string, string> = {
  Sofa: '#0f766e',
  WoodDark: '#6b4226',
  Wood: '#c48f5a',
  Frame: '#334155',
};

const KITCHEN_PALETTE: Record<string, string> = {
  Dark: '#1e293b',
  Chrome: '#cbd5e1',
  White: '#f1f5f9',
  Glow: '#38bdf8',
  Cabinet: '#134e4a',
  Wood: '#b07b47',
  Fridge: '#e2e8f0',
  Note: '#fde047',
  Red: '#ef4444',
  Memo: '#f59e0b',
};

const SHIBA_PALETTE: Record<string, string> = {
  Fur: '#d98a36',
  Light: '#fdf0d5',
  Ear: '#9a5219',
  Ink: '#0f172a',
  Shine: '#ffffff',
  Nose: '#0f172a',
  Tongue: '#fb7185',
  Collar: '#0d9488',
  Tag: '#f59e0b',
};

function cloneAndPaintPiece(
  scene: THREE.Object3D,
  partName: string,
  paletteMap: Record<string, string>,
  overrideMat?: Record<string, THREE.Material>,
): THREE.Object3D {
  const src = scene.getObjectByName(partName);
  if (!src) return new THREE.Group();
  const c = src.clone(true);
  c.position.set(0, 0, 0);
  c.rotation.set(0, 0, 0);
  c.scale.set(1, 1, 1);
  c.traverse((o) => {
    const m = o as THREE.Mesh;
    if (!m.isMesh) return;
    const orig = m.material as THREE.Material;
    const n = orig?.name ?? '';
    if (overrideMat && overrideMat[n]) {
      m.material = overrideMat[n];
    } else if (paletteMap[n]) {
      const metal = n === 'Chrome' || n === 'Tag' || n === 'Frame' ? 0.65 : 0.06;
      const rough = n === 'Chrome' || n === 'Glaze' || n === 'Shine' ? 0.22 : 0.68;
      const em = n === 'Glow' ? paletteMap[n] : undefined;
      m.material = stdMat(paletteMap[n], { roughness: rough, metalness: metal, emissive: em, emissiveIntensity: em ? 0.9 : 0 });
    }
    m.castShadow = true;
    m.receiveShadow = true;
  });
  return c;
}

// Crisp high-contrast frosted pill label facing the player from every angle
export const PillBillboardTag: React.FC<{
  position: [number, number, number];
  title: string;
  subtitle?: string;
  accentColor?: string;
  urgent?: boolean;
  width?: number;
}> = ({ position, title, subtitle, accentColor = '#14b8a6', urgent = false, width = 2.4 }) => {
  const tex = useMemo(
    () => createPillBadgeTexture(title, subtitle, accentColor, urgent),
    [title, subtitle, accentColor, urgent],
  );
  return (
    <Billboard position={position}>
      <mesh>
        <planeGeometry args={[width, width * (112 / 512)]} />
        <meshBasicMaterial map={tex} transparent toneMapped={false} depthWrite={false} />
      </mesh>
    </Billboard>
  );
};

// Shared mechanical keyboard keycap CanvasTexture (built once)
let sharedKeyboardTex: THREE.CanvasTexture | null = null;
function getKeyboardTexture() {
  if (sharedKeyboardTex) return sharedKeyboardTex;
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 176;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cbd5e1';
  ctx.fillRect(0, 0, 512, 176);
  const rows = [14, 13, 12, 11];
  rows.forEach((n, r) => {
    const kw = (494 - (n - 1) * 5) / n;
    for (let i = 0; i < n; i++) {
      ctx.fillStyle = r === 0 && (i === 0 || i === n - 1) ? '#f59e0b' : '#ffffff';
      ctx.beginPath();
      ctx.roundRect(9 + i * (kw + 5), 10 + r * 34, kw, 27, 5);
      ctx.fill();
    }
  });
  ctx.fillStyle = '#f8fafc';
  ctx.beginPath();
  ctx.roundRect(130, 144, 252, 24, 5);
  ctx.fill();
  sharedKeyboardTex = new THREE.CanvasTexture(c);
  sharedKeyboardTex.colorSpace = THREE.SRGBColorSpace;
  return sharedKeyboardTex;
}

function createTerminalScreenTexture(stream: DepartmentStream, deptColor: string, urgent: boolean): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 304;
  const ctx = c.getContext('2d')!;

  ctx.fillStyle = '#0b1120';
  ctx.fillRect(0, 0, 512, 304);

  // Title bar
  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 32);
  ['#ef4444', '#f59e0b', '#22c55e'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(18 + i * 18, 16, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  const shortName = stream.agentName.split('//')[0].trim();
  ctx.fillStyle = '#cbd5e1';
  ctx.font = '600 14px "JetBrains Mono", Consolas, monospace';
  ctx.fillText(`${shortName.toLowerCase()}@madinat-aspace — ${stream.role}`, 76, 20);

  // Terminal live code/SOP lines
  ctx.font = '500 14px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`● SOP_STREAM: ${stream.id.toUpperCase()}`, 18, 66);
  ctx.fillStyle = urgent ? '#fca5a5' : '#4ade80';
  ctx.fillText(`✓ STATUT: ${urgent ? 'ATTENTE VISA S0 HUMAN:AMDKN' : stream.statusLabel}`, 18, 94);

  ctx.fillStyle = '#e2e8f0';
  const words = stream.task.split(' ');
  let line = '';
  let y = 130;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (test.length > 46) {
      ctx.fillText(`  ${line}`, 18, y);
      y += 22;
      line = w;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(`  ${line}`, 18, y);

  // Mini telemetry graph bars
  for (let i = 0; i < 18; i++) {
    const h = 16 + ((i * 29 + shortName.charCodeAt(0) * 7) % 44);
    ctx.fillStyle = urgent ? '#f59e0b' : deptColor;
    ctx.fillRect(20 + i * 26, 280 - h, 16, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 1. REAL CUBEFARM WORKSTATION (Open walnut desk on tapered bronze legs, 5-star swivel chair, framed live monitor, keyboard, GLB mug/books/succulent, articulated agent)
export const CubeFarmWorkstation: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  stream: DepartmentStream;
  deptColor: string;
  needsHuman?: boolean;
  phaseOffset?: number;
  skinColor?: string;
  isCeo?: boolean;
}> = ({ position, rotationY = 0, stream, deptColor, needsHuman = false, phaseOffset = 0, skinColor = '#c68642', isCeo = false }) => {
  const { scene: propsScene } = useGLTF('/models/desk_props.glb');
  const { scene: plantsScene } = useGLTF('/models/plants.glb');

  const { mugObj, booksObj, succObj, screenTex, kbTex } = useMemo(() => {
    const mug = cloneAndPaintPiece(propsScene, 'mug', DESK_PROP_PALETTE, {
      Mug: stdMat(deptColor, { roughness: 0.28 }),
    });
    const books = cloneAndPaintPiece(
      propsScene,
      Math.floor(phaseOffset) % 2 === 0 ? 'books_stack' : 'books_leaning',
      DESK_PROP_PALETTE,
    );
    const succ = cloneAndPaintPiece(plantsScene, 'succulent', PLANT_PALETTE);
    const stex = createTerminalScreenTexture(stream, deptColor, needsHuman);
    return { mugObj: mug, booksObj: books, succObj: succ, screenTex: stex, kbTex: getKeyboardTexture() };
  }, [propsScene, plantsScene, stream, deptColor, needsHuman, phaseOffset]);

  const shortName = stream.agentName.split('//')[0].trim();

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Walnut-Cedar Open Tabletop + Brushed Gold Inlay Trim + Modesty Panel + 4 Tapered Bronze Legs */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow material={SHARED_MATERIALS.warmCedar}>
        <boxGeometry args={[2.16, 0.065, 1.02]} />
      </mesh>
      <mesh position={[0, 0.742, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <boxGeometry args={[2.2, 0.02, 1.06]} />
      </mesh>
      <mesh position={[0, 0.54, -0.44]} material={SHARED_MATERIALS.darkMetal ?? SHARED_MATERIALS.warmCedar} castShadow>
        <boxGeometry args={[1.86, 0.34, 0.03]} />
      </mesh>
      {[
        [-0.96, -0.42],
        [0.96, -0.42],
        [-0.96, 0.42],
        [0.96, 0.42],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.365, lz]} castShadow>
          <cylinderGeometry args={[0.034, 0.024, 0.73, 10]} />
          <meshStandardMaterial color="#334155" metalness={0.78} roughness={0.28} />
        </mesh>
      ))}

      {/* Framed Beveled Desktop Monitor + Stand + Crisp Live Terminal Texture */}
      <group position={[0, 0.775, -0.26]}>
        <mesh position={[0, 0.015, -0.02]}>
          <cylinderGeometry args={[0.16, 0.18, 0.025, 16]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
        </mesh>
        <mesh position={[0, 0.18, -0.05]}>
          <boxGeometry args={[0.065, 0.32, 0.045]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
        </mesh>
        <group position={[0, 0.38, 0]} rotation={[-0.06, 0, 0]}>
          <mesh castShadow>
            <boxGeometry args={[1.14, 0.68, 0.042]} />
            <meshStandardMaterial color="#0f172a" roughness={0.3} metalness={0.5} />
          </mesh>
          <mesh position={[0, 0, 0.023]}>
            <planeGeometry args={[1.06, 0.6]} />
            <meshBasicMaterial map={screenTex} toneMapped={false} />
          </mesh>
          {needsHuman && (
            <mesh position={[0.42, 0.22, 0.03]} rotation={[0, 0, -0.1]}>
              <planeGeometry args={[0.2, 0.2]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          )}
        </group>
      </group>

      {/* Mechanical Keyboard + Dark Mousepad & Ergonomic Mouse */}
      <group position={[0, 0.775, 0.16]}>
        <mesh castShadow>
          <boxGeometry args={[0.52, 0.024, 0.18]} />
          <meshStandardMaterial color="#94a3b8" roughness={0.4} />
        </mesh>
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.16]} />
          <meshBasicMaterial map={kbTex} toneMapped={false} />
        </mesh>
        <mesh position={[0.42, 0.004, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.24, 0.2]} />
          <meshStandardMaterial color="#1e293b" roughness={0.8} />
        </mesh>
        <mesh position={[0.42, 0.022, 0.01]} scale={[0.75, 0.52, 1]}>
          <sphereGeometry args={[0.045, 12, 8]} />
          <meshStandardMaterial color="#f8fafc" roughness={0.3} />
        </mesh>
      </group>

      {/* Blender GLB Desk Props: Coffee Mug + Stacked Books + Succulent Plant */}
      <group position={[0.76, 0.773, -0.12]}>
        <primitive object={mugObj} />
      </group>
      <group position={[-0.78, 0.773, -0.18]} rotation={[0, 0.25, 0]}>
        <primitive object={booksObj} />
      </group>
      <group position={[-0.78, 0.773, 0.22]}>
        <primitive object={succObj} />
      </group>

      {/* Ergonomic Swivel Chair (5-star caster base, gas cylinder, cushioned seat, angled lumbar backrest & armrests) */}
      <group position={[0, 0, 0.76]}>
        {/* 5-star chrome base */}
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[0, 0.055, 0.14]} rotation={[0.08, 0, 0]}>
                <boxGeometry args={[0.045, 0.035, 0.28]} />
                <meshStandardMaterial color="#475569" metalness={0.8} roughness={0.25} />
              </mesh>
              <mesh position={[0, 0.028, 0.25]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.028, 0.028, 0.03, 10]} />
                <meshStandardMaterial color="#0f172a" roughness={0.8} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 0.24, 0]}>
          <cylinderGeometry args={[0.038, 0.038, 0.36, 10]} />
          <meshStandardMaterial color="#334155" metalness={0.8} roughness={0.25} />
        </mesh>
        {/* Seat cushion & angled backrest */}
        <mesh position={[0, 0.45, 0]} castShadow>
          <boxGeometry args={[0.56, 0.08, 0.52]} />
          <meshStandardMaterial color={isCeo ? '#1e3a8a' : deptColor} roughness={0.65} />
        </mesh>
        <mesh position={[0, 0.76, 0.24]} rotation={[-0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.52, 0.52, 0.075]} />
          <meshStandardMaterial color={isCeo ? '#1e3a8a' : deptColor} roughness={0.65} />
        </mesh>
        {[-0.29, 0.29].map((ax, i) => (
          <mesh key={i} position={[ax, 0.59, 0.02]}>
            <boxGeometry args={[0.05, 0.04, 0.34]} />
            <meshStandardMaterial color="#334155" roughness={0.45} />
          </mesh>
        ))}

        {/* Articulated Agent Seated Cleanly on Chair (facing -Z into Monitor/Keyboard) */}
        <group position={[0, 0, 0.02]}>
          <ArticulatedCharacter
            tunicColor={needsHuman ? '#dc2626' : isCeo ? '#1e3a8a' : deptColor}
            accentColor="#e0aa42"
            skinColor={skinColor}
            mode={needsHuman ? 'needsYou' : 'typing'}
            phaseOffset={phaseOffset}
            withCape={isCeo}
            withSolarVisor={isCeo}
          />
        </group>
      </group>

      {/* Crisp Dark Frosted Pill Badge */}
      <PillBillboardTag
        position={[0, 2.08, 0.65]}
        title={shortName}
        subtitle={needsHuman ? '🙋 VALIDATION S0 REQUISE' : stream.statusLabel}
        accentColor={deptColor}
        urgent={needsHuman}
        width={2.5}
      />
    </group>
  );
};

// 2. WOVEN BAGHDADI PERSIAN MEDALLION RUG
export const PersianCarpet: React.FC<{
  position: [number, number, number];
  size: [number, number];
  accentColor?: string;
}> = ({ position, size, accentColor = '#0d9488' }) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 512;
    const ctx = c.getContext('2d')!;
    // Rich indigo-navy outer border + warm terracotta field + gold geometric medallion
    ctx.fillStyle = '#132440';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, 476, 476);
    ctx.fillStyle = '#7c2d12';
    ctx.fillRect(42, 42, 428, 428);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.strokeRect(52, 52, 408, 408);

    // Subtle woven geometric diamond grid
    ctx.strokeStyle = 'rgba(253, 230, 138, 0.16)';
    ctx.lineWidth = 2;
    for (let i = 64; i < 450; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 52);
      ctx.lineTo(i, 460);
      ctx.moveTo(52, i);
      ctx.lineTo(460, i);
      ctx.stroke();
    }

    // Center 8-point Baghdadi medallion
    ctx.save();
    ctx.translate(256, 256);
    ctx.fillStyle = accentColor;
    ctx.fillRect(-70, -70, 140, 140);
    ctx.rotate(Math.PI / 4);
    ctx.fillStyle = '#d9a441';
    ctx.fillRect(-56, -56, 112, 112);
    ctx.fillStyle = '#132440';
    ctx.fillRect(-34, -34, 68, 68);
    ctx.restore();

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [accentColor]);

  return (
    <mesh position={position} rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
      <planeGeometry args={size} />
      <meshStandardMaterial map={tex} roughness={0.92} />
    </mesh>
  );
};

// 3. WALL KANBAN BOARD FOR EACH DEPARTMENT PAVILION
export const WallKanbanBoard: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  dept: SolarDepartment;
}> = ({ position, rotationY = 0, dept }) => {
  const tex = useMemo(() => {
    const c = document.createElement('canvas');
    c.width = 1024;
    c.height = 540;
    const ctx = c.getContext('2d')!;
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 0, 1024, 540);
    ctx.fillStyle = '#1e293b';
    ctx.fillRect(0, 0, 1024, 72);
    ctx.fillStyle = dept.color;
    ctx.fillRect(0, 68, 1024, 5);

    ctx.fillStyle = '#f8fafc';
    ctx.font = '700 26px "Plus Jakarta Sans", "Segoe UI", sans-serif';
    ctx.fillText(`${dept.code} · ${dept.name}`, 28, 44);
    ctx.fillStyle = '#5eead4';
    ctx.font = '600 20px "JetBrains Mono", monospace';
    ctx.fillText(`${dept.opsPerSec} · VP ${dept.vpName}`, 640, 44);

    const cols = ['BACKLOG IA', 'EN EXÉCUTION', 'VISA S0 R10', 'DÉPLOYÉ ✓'];
    cols.forEach((colName, ci) => {
      const cx = 24 + ci * 248;
      ctx.fillStyle = '#172033';
      ctx.beginPath();
      ctx.roundRect(cx, 94, 232, 422, 12);
      ctx.fill();
      ctx.fillStyle = ci === 2 ? '#fbbf24' : '#94a3b8';
      ctx.font = '700 18px "JetBrains Mono", monospace';
      ctx.fillText(colName, cx + 16, 128);

      for (let k = 0; k < 3; k++) {
        const cy = 150 + k * 116;
        ctx.fillStyle = ci === 2 && k === 0 ? 'rgba(245, 158, 11, 0.24)' : '#233048';
        ctx.beginPath();
        ctx.roundRect(cx + 12, cy, 208, 98, 10);
        ctx.fill();
        ctx.fillStyle = ci === 3 ? '#34d399' : dept.color;
        ctx.fillRect(cx + 22, cy + 16, 52, 8);
        ctx.fillStyle = '#f1f5f9';
        ctx.font = '600 16px "Plus Jakarta Sans", sans-serif';
        const label = dept.streams[(k + ci) % dept.streams.length]?.agentName.split('//')[0].trim() ?? 'Holon';
        ctx.fillText(`${label} · Flux #${ci + 1}${k + 1}`, cx + 22, cy + 50);
        ctx.fillStyle = '#94a3b8';
        ctx.font = '500 14px "JetBrains Mono", monospace';
        ctx.fillText(`SLA ${(99.1 + k * 0.3).toFixed(1)}% · ${dept.bridgePillar}`, cx + 22, cy + 78);
      }
    });

    const t = new THREE.CanvasTexture(c);
    t.colorSpace = THREE.SRGBColorSpace;
    t.anisotropy = 8;
    return t;
  }, [dept]);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      <mesh castShadow material={SHARED_MATERIALS.warmCedar}>
        <boxGeometry args={[4.4, 2.38, 0.12]} />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[4.15, 2.18]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// 4. ANIMATED SHIBA MASCOT DOG (Cloned rigged Shiba from dog-shiba.glb walking a gentle loop!)
export const AnimatedShibaDog: React.FC<{
  center: [number, number, number];
  radius?: number;
  label?: string;
}> = ({ center, radius = 4.2, label = '🐕 Al-Mansur · Mascotte IA' }) => {
  const { scene, animations } = useGLTF('/models/dog-shiba.glb');
  const dogGroupRef = useRef<THREE.Group>(null);

  const clonedDog = useMemo(() => {
    const c = cloneSkeleton(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = (m.material as THREE.Material)?.name ?? '';
      if (SHIBA_PALETTE[n]) {
        m.material = stdMat(SHIBA_PALETTE[n], {
          roughness: n === 'Shine' || n === 'Tag' ? 0.2 : 0.72,
          metalness: n === 'Tag' ? 0.85 : 0.05,
        });
      }
      m.castShadow = true;
      m.receiveShadow = true;
    });
    return c;
  }, [scene]);

  const mixer = useMemo(() => new THREE.AnimationMixer(clonedDog), [clonedDog]);

  useEffect(() => {
    const clip = animations.find((a) => a.name === 'walk') ?? animations[0];
    if (!clip) return;
    const action = mixer.clipAction(clip);
    action.play();
    return () => {
      action.stop();
      mixer.uncacheRoot(clonedDog);
    };
  }, [animations, mixer, clonedDog]);

  useFrame(({ clock }, dt) => {
    mixer.update(dt);
    if (!dogGroupRef.current) return;
    const t = clock.getElapsedTime() * 0.42;
    const x = center[0] + Math.cos(t) * radius;
    const z = center[2] + Math.sin(t) * radius * 0.65;
    dogGroupRef.current.position.set(x, center[1], z);
    dogGroupRef.current.rotation.y = Math.atan2(-Math.sin(t) * radius, Math.cos(t) * radius * 0.65);
  });

  return (
    <group ref={dogGroupRef} position={center}>
      <group scale={[1.3, 1.3, 1.3]}>
        <primitive object={clonedDog} />
      </group>
      <PillBillboardTag position={[0, 1.25, 0]} title={label} accentColor="#f59e0b" width={1.9} />
    </group>
  );
};

// 5. FULL RICH INTERIOR FURNISHINGS FOR EVERY APPLE PARK PAVILION (Carpet, Lounge Sofa/Poufs, Kitchen Coffee Bar, 6 GLB Floor Plants, Hanging Lamps, Wall Kanban)
export const PavilionRichFurnishings: React.FC<{ dept: SolarDepartment }> = ({ dept }) => {
  const { scene: loungeScene } = useGLTF('/models/lounge.glb');
  const { scene: kitchenScene } = useGLTF('/models/kitchen.glb');
  const { scene: plantsScene } = useGLTF('/models/plants.glb');

  const assets = useMemo(() => {
    const sofa = cloneAndPaintPiece(loungeScene, 'sofa', LOUNGE_PALETTE, {
      Sofa: stdMat(dept.color, { roughness: 0.78 }),
    });
    const table = cloneAndPaintPiece(loungeScene, 'coffee_table', LOUNGE_PALETTE);
    const pouf1 = cloneAndPaintPiece(loungeScene, 'pouf', LOUNGE_PALETTE, { Cloth: stdMat('#d9a441', { roughness: 0.85 }) });
    const pouf2 = cloneAndPaintPiece(loungeScene, 'pouf', LOUNGE_PALETTE, { Cloth: stdMat('#0d9488', { roughness: 0.85 }) });
    const pillow1 = cloneAndPaintPiece(loungeScene, 'pillow', LOUNGE_PALETTE, { Cloth: stdMat('#fde68a', { roughness: 0.85 }) });
    const pillow2 = cloneAndPaintPiece(loungeScene, 'pillow', LOUNGE_PALETTE, { Cloth: stdMat('#f97316', { roughness: 0.85 }) });

    const counter = cloneAndPaintPiece(kitchenScene, 'counter', KITCHEN_PALETTE);
    const coffeeMachine = cloneAndPaintPiece(kitchenScene, 'coffee_machine', KITCHEN_PALETTE);
    const fridge = cloneAndPaintPiece(kitchenScene, 'fridge', KITCHEN_PALETTE);

    const floorPlants = [
      cloneAndPaintPiece(plantsScene, 'monstera', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'snake_plant', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'ficus', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'monstera', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'snake_plant', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'ficus', PLANT_PALETTE),
    ];
    return { sofa, table, pouf1, pouf2, pillow1, pillow2, counter, coffeeMachine, fridge, floorPlants };
  }, [loungeScene, kitchenScene, plantsScene, dept.color]);

  const plantCoords: [number, number, number][] = [
    [-6.6, 0.28, -5.6],
    [6.6, 0.28, -5.6],
    [-9.2, 0.28, -1.6],
    [9.2, 0.28, -1.6],
    [-4.8, 0.28, 3.6],
    [4.8, 0.28, 3.6],
  ];

  return (
    <group>
      {/* Baghdadi Persian Medallion Rug Under Workstations */}
      <PersianCarpet position={[0, 0.295, -4.7]} size={[11.6, 5.2]} accentColor={dept.color} />

      {/* Right Wing: Collaborative Lounge (GLB Sofa, Pillows, Coffee Table & Poufs on Carpet) */}
      <group position={[9.8, 0.28, 2.2]} rotation={[0, -0.45, 0]}>
        <PersianCarpet position={[0, 0.015, 0]} size={[5.6, 4.6]} accentColor="#d9a441" />
        <group scale={[0.85, 0.85, 0.85]}>
          <group position={[0, 0, -1.1]}>
            <primitive object={assets.sofa} />
            <group position={[-0.6, 0.45, -0.05]} rotation={[-0.18, 0, 0]}>
              <primitive object={assets.pillow1} />
            </group>
            <group position={[0.6, 0.45, -0.05]} rotation={[-0.18, 0, 0]}>
              <primitive object={assets.pillow2} />
            </group>
          </group>
          <group position={[0, 0, 0.45]}>
            <primitive object={assets.table} />
          </group>
          <group position={[-1.5, 0, 0.65]}>
            <primitive object={assets.pouf1} />
          </group>
          <group position={[1.5, 0, 0.65]}>
            <primitive object={assets.pouf2} />
          </group>
        </group>
      </group>

      {/* Left Wing: Solarpunk Coffee & Mint Tea Bar (GLB Counter, Espresso Machine, Fridge) */}
      <group position={[-10.2, 0.28, 2.4]} rotation={[0, 0.45, 0]} scale={[0.72, 0.72, 0.72]}>
        <primitive object={assets.counter} />
        <group position={[0, 0.96, 0.05]}>
          <primitive object={assets.coffeeMachine} />
        </group>
        <group position={[3.2, 0, 0]}>
          <primitive object={assets.fridge} />
        </group>
      </group>

      {/* 6 Lush Potted Biophilic Plants (GLB Monstera, Snake Plant, Ficus) */}
      {plantCoords.map((pos, i) => (
        <group key={i} position={pos} scale={[1.25, 1.25, 1.25]}>
          <primitive object={assets.floorPlants[i]} />
        </group>
      ))}

      {/* Wall-Mounted Department Kanban Board (positioned cleanly behind left workstation flank) */}
      <WallKanbanBoard position={[-7.8, 2.55, -7.8]} rotationY={0.28} dept={dept} />

      {/* Warm Cedar Acoustic Pergola Slats & Hanging Brass Pendant Lanterns */}
      <group position={[0, 5.2, -1.5]}>
        {[-6, -2, 2, 6].map((lx, i) => (
          <group key={i} position={[lx, 0, 0]}>
            <mesh position={[0, 0.65, 0]}>
              <cylinderGeometry args={[0.02, 0.02, 1.3, 6]} />
              <meshStandardMaterial color="#1e293b" />
            </mesh>
            <mesh material={SHARED_MATERIALS.abbassidGold}>
              <coneGeometry args={[0.42, 0.34, 16, 1, true]} />
            </mesh>
            <mesh position={[0, -0.1, 0]}>
              <sphereGeometry args={[0.14, 10, 8]} />
              <meshStandardMaterial color="#fffbeb" emissive="#fbbf24" emissiveIntensity={1.6} />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

// 6. ILLUSTRATED MARIO-64 PORTAL PAINTING CANVAS TEXTURE
export function createPortalArtworkTexture(
  portalId: string,
  title: string,
  accent: string,
  skyTop: string,
  skyBottom: string,
): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 360;
  const ctx = c.getContext('2d')!;

  const sky = ctx.createLinearGradient(0, 0, 0, 260);
  sky.addColorStop(0, skyTop);
  sky.addColorStop(1, skyBottom);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, 512, 360);

  if (portalId === 'solar-dunes') {
    // Glowing sun + desert dunes + 3 perspective solar arches
    ctx.fillStyle = '#fef08a';
    ctx.beginPath();
    ctx.arc(380, 92, 42, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = '#d97706';
    ctx.beginPath();
    ctx.moveTo(0, 220);
    ctx.quadraticCurveTo(160, 170, 320, 220);
    ctx.quadraticCurveTo(420, 250, 512, 200);
    ctx.lineTo(512, 360);
    ctx.lineTo(0, 360);
    ctx.fill();
    [130, 88, 54].forEach((r, i) => {
      ctx.strokeStyle = i === 0 ? '#fde047' : '#f59e0b';
      ctx.lineWidth = 7 - i * 1.5;
      ctx.beginPath();
      ctx.arc(256, 250 - i * 12, r, Math.PI, 0);
      ctx.stroke();
    });
  } else if (portalId === 'bayt-astronomy') {
    // 7D Astrolabe concentric rings over starry emerald water
    ctx.fillStyle = '#064e3b';
    ctx.fillRect(0, 230, 512, 130);
    for (let s = 0; s < 40; s++) {
      ctx.fillStyle = 'rgba(255,255,255,0.7)';
      ctx.fillRect((s * 73) % 500, (s * 41) % 210, 3, 3);
    }
    [95, 68, 42].forEach((r, i) => {
      ctx.strokeStyle = i === 1 ? '#fde047' : '#2dd4bf';
      ctx.lineWidth = 4;
      ctx.beginPath();
      ctx.arc(256, 140, r, 0, Math.PI * 2);
      ctx.stroke();
    });
  } else {
    // Live Blueprint Neon Architect Grid
    ctx.fillStyle = '#0f172a';
    ctx.fillRect(0, 190, 512, 170);
    ctx.strokeStyle = '#60a5fa';
    ctx.lineWidth = 2;
    for (let x = 0; x <= 512; x += 36) {
      ctx.beginPath();
      ctx.moveTo(256 + (x - 256) * 0.25, 190);
      ctx.lineTo(x, 360);
      ctx.stroke();
    }
    for (let y = 205; y < 360; y += 28) {
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(512, y);
      ctx.stroke();
    }
  }

  // Dark bottom caption pill inside frame
  ctx.fillStyle = 'rgba(11, 18, 32, 0.86)';
  ctx.beginPath();
  ctx.roundRect(24, 272, 464, 68, 14);
  ctx.fill();
  ctx.strokeStyle = accent;
  ctx.lineWidth = 3;
  ctx.stroke();

  ctx.textAlign = 'center';
  ctx.fillStyle = '#f8fafc';
  ctx.font = '700 22px "Plus Jakarta Sans", "Segoe UI", sans-serif';
  ctx.fillText(title, 256, 302);
  ctx.fillStyle = '#fde68a';
  ctx.font = '600 15px "JetBrains Mono", monospace';
  ctx.fillText('[E] ENTRER DANS CE MONDE 3D →', 256, 328);

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}
