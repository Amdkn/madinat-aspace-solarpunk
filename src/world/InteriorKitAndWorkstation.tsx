import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Outlines, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { clone as cloneSkeleton } from 'three/examples/jsm/utils/SkeletonUtils.js';
import { DepartmentStream, SolarDepartment } from '../data/madinatOntology';
import { useWorldStore } from '../store/useWorldStore';
import { ArticulatedCharacter } from './ArticulatedCharacter';
import { ContactShadowDisc } from './ContactShadowDisc';
import { createPillBadgeTexture, SHARED_MATERIALS, toonMat } from './ShadersAndMaterials';

useGLTF.preload('/models/desk_props.glb');
useGLTF.preload('/models/lounge.glb');
useGLTF.preload('/models/kitchen.glb');
useGLTF.preload('/models/plants.glb');
useGLTF.preload('/models/dog-shiba.glb');

const INK = '#1f1d2b';

const PLANT_PALETTE: Record<string, string> = {
  Pot: '#d47c4c',
  Glaze: '#14b8a6',
  Soil: '#5c3c24',
  Bark: '#8a5a3b',
  Leaf: '#3b8c32',
  LeafDark: '#245e27',
};

const DESK_PROP_PALETTE: Record<string, string> = {
  CoverRed: '#ef4444',
  CoverBlue: '#0ea5e9',
  CoverOrange: '#f59e0b',
  Pages: '#faf0dc',
  Coffee: '#5c3419',
};

const LOUNGE_PALETTE: Record<string, string> = {
  Sofa: '#0d9488',
  WoodDark: '#7c4c2a',
  Wood: '#deb178',
  Frame: '#334155',
};

const KITCHEN_PALETTE: Record<string, string> = {
  Dark: '#2b2d42',
  Chrome: '#d8dee9',
  White: '#f8fafc',
  Glow: '#38bdf8',
  Cabinet: '#0f766e',
  Wood: '#d89b5a',
  Fridge: '#e2e8f0',
  Note: '#fde047',
  Red: '#ef4444',
  Memo: '#f59e0b',
};

const SHIBA_PALETTE: Record<string, string> = {
  Fur: '#e0913c',
  Light: '#fdf2dc',
  Ear: '#a3581c',
  Ink: '#1f1d2b',
  Shine: '#ffffff',
  Nose: '#1f1d2b',
  Tongue: '#fb7185',
  Collar: '#14b8a6',
  Tag: '#fbbf24',
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
      m.material = toonMat(paletteMap[n], {
        emissive: n === 'Glow' ? paletteMap[n] : undefined,
        emissiveIntensity: n === 'Glow' ? 0.9 : 1,
      });
    }
    m.castShadow = true;
    m.receiveShadow = true;
  });
  return c;
}

// Crisp high-contrast frosted pill label facing the player from every angle (with distance scaling & occlusion safety)
export const PillBillboardTag: React.FC<{
  position: [number, number, number];
  title: string;
  subtitle?: string;
  accentColor?: string;
  urgent?: boolean;
  width?: number;
  minDist?: number;
  maxDist?: number;
}> = ({ position, title, subtitle, accentColor = '#14b8a6', urgent = false, width = 2.4, minDist = 1.75, maxDist = 34 }) => {
  const billRef = useRef<THREE.Group>(null);
  const meshRef = useRef<THREE.Mesh>(null);
  const tmpV = useMemo(() => new THREE.Vector3(), []);
  const tex = useMemo(
    () => createPillBadgeTexture(title, subtitle, accentColor, urgent),
    [title, subtitle, accentColor, urgent],
  );
  useFrame(({ camera }) => {
    if (!billRef.current || !meshRef.current) return;
    const d = billRef.current.getWorldPosition(tmpV).distanceTo(camera.position);
    billRef.current.visible = d >= minDist && d <= maxDist;
    const s = d < 3.4 ? Math.max(0.55, d / 3.4) : 1;
    meshRef.current.scale.set(s, s, 1);
  });
  return (
    <Billboard ref={billRef} position={position}>
      <mesh ref={meshRef} userData={{ ignoreCameraRay: true }}>
        <planeGeometry args={[width, width * (116 / 680)]} />
        <meshBasicMaterial map={tex} transparent alphaTest={0.08} toneMapped={false} />
      </mesh>
    </Billboard>
  );
};

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

  ctx.fillStyle = '#0f172a';
  ctx.fillRect(0, 0, 512, 304);

  ctx.fillStyle = '#1e293b';
  ctx.fillRect(0, 0, 512, 34);
  ['#ef4444', '#f59e0b', '#22c55e'].forEach((col, i) => {
    ctx.fillStyle = col;
    ctx.beginPath();
    ctx.arc(18 + i * 18, 17, 5.5, 0, Math.PI * 2);
    ctx.fill();
  });
  const shortName = stream.agentName.split('//')[0].trim();
  ctx.fillStyle = '#e2e8f0';
  ctx.font = '700 14px "JetBrains Mono", Consolas, monospace';
  ctx.fillText(`${shortName.toLowerCase()}@madinat-forge — ${stream.role}`, 76, 21);

  ctx.font = '600 14px "JetBrains Mono", Consolas, monospace';
  ctx.fillStyle = '#38bdf8';
  ctx.fillText(`● SOP_EXEC: ${stream.id.toUpperCase()} · LATENCE 11ms`, 18, 68);
  ctx.fillStyle = urgent ? '#fca5a5' : '#4ade80';
  ctx.fillText(`✓ STATUT: ${urgent ? 'ATTENTE VISA S0 HUMAN:AMDKN' : stream.statusLabel}`, 18, 96);

  ctx.fillStyle = '#f1f5f9';
  const words = stream.task.split(' ');
  let line = '';
  let y = 132;
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

  for (let i = 0; i < 18; i++) {
    const h = 18 + ((i * 29 + shortName.charCodeAt(0) * 7) % 44);
    ctx.fillStyle = urgent ? '#f59e0b' : deptColor;
    ctx.fillRect(20 + i * 26, 280 - h, 16, h);
  }

  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

// 1. GENUINE CUBEFARM WORKSTATION (Cel-shaded honey-oak desk + ink outlines, 5-star swivel chair, framed terminal, GLB props, seated agent)
export const CubeFarmWorkstation: React.FC<{
  position: [number, number, number];
  rotationY?: number;
  stream: DepartmentStream;
  deptColor: string;
  deptId?: string;
  needsHuman?: boolean;
  phaseOffset?: number;
  skinColor?: string;
  isCeo?: boolean;
}> = ({
  position,
  rotationY = 0,
  stream,
  deptColor,
  deptId,
  needsHuman = false,
  phaseOffset = 0,
  skinColor = '#c68642',
  isCeo = false,
}) => {
  const { scene: propsScene } = useGLTF('/models/desk_props.glb');
  const { scene: plantsScene } = useGLTF('/models/plants.glb');

  const { mugObj, booksObj, succObj, screenTex, kbTex } = useMemo(() => {
    const mug = cloneAndPaintPiece(propsScene, 'mug', DESK_PROP_PALETTE, {
      Mug: toonMat(deptColor),
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
  const deskWood = toonMat('#dfa968');
  const deskPanel = toonMat('#c5894b');
  const steelMat = toonMat('#475569');
  const bezelMat = toonMat('#2b2d42');
  const devPalette = [deptColor, '#0284c7', '#0d9488', '#4f46e5', '#d97706', '#db2777'];
  const jacketHex = isCeo ? '#1e3a8a' : devPalette[Math.floor(Math.abs(phaseOffset) * 2.1) % devPalette.length];
  const chairMat = toonMat(jacketHex);

  return (
    <group position={position} rotation={[0, rotationY, 0]}>
      {/* Open Honey-Oak Tabletop + Ink Outlines + Modesty Panel + 4 Steel Legs */}
      <mesh position={[0, 0.74, 0]} castShadow receiveShadow material={deskWood}>
        <boxGeometry args={[2.1, 0.065, 1.0]} />
        <Outlines thickness={0.015} color={INK} />
      </mesh>
      <mesh position={[0, 0.54, -0.44]} castShadow material={deskPanel}>
        <boxGeometry args={[1.82, 0.34, 0.03]} />
        <Outlines thickness={0.012} color={INK} />
      </mesh>
      {[
        [-0.94, -0.41],
        [0.94, -0.41],
        [-0.94, 0.41],
        [0.94, 0.41],
      ].map(([lx, lz], i) => (
        <mesh key={i} position={[lx, 0.365, lz]} castShadow material={steelMat}>
          <cylinderGeometry args={[0.034, 0.025, 0.73, 10]} />
          <Outlines thickness={0.01} color={INK} />
        </mesh>
      ))}

      {/* Framed Beveled Desktop Monitor + Stand + Clickable Live Terminal Screen */}
      <group
        position={[0, 0.775, -0.26]}
        onClick={(e) => {
          e.stopPropagation();
          useWorldStore.getState().inspectWorkstation({ stream, deptId: deptId ?? null, isCeo });
        }}
        onPointerOver={() => {
          document.body.style.cursor = 'pointer';
        }}
        onPointerOut={() => {
          document.body.style.cursor = 'auto';
        }}
      >
        <mesh position={[0, 0.015, -0.02]} material={steelMat}>
          <cylinderGeometry args={[0.16, 0.18, 0.025, 16]} />
          <Outlines thickness={0.01} color={INK} />
        </mesh>
        <mesh position={[0, 0.18, -0.05]} material={steelMat}>
          <boxGeometry args={[0.065, 0.32, 0.045]} />
        </mesh>
        <group position={[0, 0.38, 0]} rotation={[-0.06, 0, 0]}>
          <mesh castShadow material={bezelMat}>
            <boxGeometry args={[1.14, 0.68, 0.045]} />
            <Outlines thickness={0.014} color={INK} />
          </mesh>
          <mesh position={[0, 0, 0.024]}>
            <planeGeometry args={[1.06, 0.6]} />
            <meshBasicMaterial map={screenTex} toneMapped={false} />
          </mesh>
          {/* Power LED */}
          <mesh position={[0.48, -0.31, 0.025]}>
            <circleGeometry args={[0.012, 10]} />
            <meshBasicMaterial color={needsHuman ? '#ef4444' : '#4ade80'} />
          </mesh>
          {needsHuman && (
            <mesh position={[0.42, 0.22, 0.032]} rotation={[0, 0, -0.1]}>
              <planeGeometry args={[0.21, 0.21]} />
              <meshBasicMaterial color="#fde047" />
            </mesh>
          )}
        </group>
      </group>

      {/* Mechanical Keyboard + Dark Mousepad & Mouse */}
      <group position={[0, 0.775, 0.16]}>
        <mesh castShadow material={toonMat('#cbd5e1')}>
          <boxGeometry args={[0.52, 0.024, 0.18]} />
          <Outlines thickness={0.01} color={INK} />
        </mesh>
        <mesh position={[0, 0.014, 0]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.5, 0.16]} />
          <meshBasicMaterial map={kbTex} toneMapped={false} />
        </mesh>
        <mesh position={[0.42, 0.004, 0.01]} rotation={[-Math.PI / 2, 0, 0]}>
          <planeGeometry args={[0.24, 0.2]} />
          <meshBasicMaterial color="#2b2d42" />
        </mesh>
        <mesh position={[0.42, 0.022, 0.01]} scale={[0.75, 0.52, 1]} material={toonMat('#f8fafc')}>
          <sphereGeometry args={[0.045, 12, 8]} />
          <Outlines thickness={0.008} color={INK} />
        </mesh>
      </group>

      {/* Blender GLB Desk Props: Coffee Mug + Stacked Books + Succulent */}
      <group position={[0.74, 0.773, -0.12]}>
        <primitive object={mugObj} />
      </group>
      <group position={[-0.76, 0.773, -0.18]} rotation={[0, 0.25, 0]}>
        <primitive object={booksObj} />
      </group>
      <group position={[-0.76, 0.773, 0.2]}>
        <primitive object={succObj} />
      </group>

      {/* Ergonomic 5-Star Swivel Chair with Ink Outlines + Contact Shadow */}
      <group position={[0, 0, 0.76]}>
        <ContactShadowDisc position={[0, 0.015, -0.35]} radius={0.95} scaleZ={1.25} opacity={0.75} />
        {[0, 1, 2, 3, 4].map((i) => {
          const a = (i / 5) * Math.PI * 2;
          return (
            <group key={i} rotation={[0, a, 0]}>
              <mesh position={[0, 0.055, 0.14]} rotation={[0.08, 0, 0]} material={steelMat}>
                <boxGeometry args={[0.045, 0.035, 0.28]} />
              </mesh>
              <mesh position={[0, 0.028, 0.25]} rotation={[0, 0, Math.PI / 2]} material={toonMat(INK)}>
                <cylinderGeometry args={[0.028, 0.028, 0.03, 10]} />
              </mesh>
            </group>
          );
        })}
        <mesh position={[0, 0.24, 0]} material={steelMat}>
          <cylinderGeometry args={[0.038, 0.038, 0.36, 10]} />
        </mesh>
        <mesh position={[0, 0.45, 0]} castShadow material={chairMat}>
          <boxGeometry args={[0.56, 0.08, 0.52]} />
          <Outlines thickness={0.013} color={INK} />
        </mesh>
        <mesh position={[0, 0.76, 0.24]} rotation={[-0.12, 0, 0]} castShadow material={chairMat}>
          <boxGeometry args={[0.52, 0.52, 0.075]} />
          <Outlines thickness={0.013} color={INK} />
        </mesh>
        {[-0.29, 0.29].map((ax, i) => (
          <mesh key={i} position={[ax, 0.59, 0.02]} material={steelMat}>
            <boxGeometry args={[0.05, 0.04, 0.34]} />
          </mesh>
        ))}

        {/* Articulated Cel-Shaded Agent Seated Cleanly on Chair */}
        <group position={[0, 0, 0.02]}>
          <ArticulatedCharacter
            tunicColor={needsHuman ? '#dc2626' : jacketHex}
            accentColor="#e0aa42"
            skinColor={skinColor}
            mode={needsHuman ? 'needsYou' : 'typing'}
            phaseOffset={phaseOffset}
            withCape={isCeo}
            withSolarVisor={isCeo}
          />
        </group>
      </group>

      <PillBillboardTag
        position={[0, 1.66, 0.44]}
        title={`${shortName} · ${needsHuman ? '🙋 S0' : '✓'}`}
        accentColor={jacketHex}
        urgent={needsHuman}
        width={1.12}
        minDist={3.0}
        maxDist={11.5}
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
    ctx.fillStyle = '#132440';
    ctx.fillRect(0, 0, 512, 512);
    ctx.strokeStyle = '#d9a441';
    ctx.lineWidth = 10;
    ctx.strokeRect(18, 18, 476, 476);
    ctx.fillStyle = '#8b2f1c';
    ctx.fillRect(42, 42, 428, 428);
    ctx.strokeStyle = '#fde68a';
    ctx.lineWidth = 4;
    ctx.strokeRect(52, 52, 408, 408);

    ctx.strokeStyle = 'rgba(253, 230, 138, 0.18)';
    ctx.lineWidth = 2;
    for (let i = 64; i < 450; i += 48) {
      ctx.beginPath();
      ctx.moveTo(i, 52);
      ctx.lineTo(i, 460);
      ctx.moveTo(52, i);
      ctx.lineTo(460, i);
      ctx.stroke();
    }

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
    <group position={position}>
      {/* Solid 3D woven wool slab eliminating planar Z-fighting at any angle */}
      <mesh position={[0, 0.018, 0]} receiveShadow userData={{ ignoreCameraRay: true }}>
        <boxGeometry args={[size[0] + 0.08, 0.026, size[1] + 0.08]} />
        <meshStandardMaterial color="#d9a441" roughness={0.85} />
      </mesh>
      <mesh position={[0, 0.033, 0]} rotation={[-Math.PI / 2, 0, 0]} receiveShadow userData={{ ignoreCameraRay: true }}>
        <planeGeometry args={size} />
        <meshStandardMaterial
          map={tex}
          roughness={0.88}
          polygonOffset
          polygonOffsetFactor={-3}
          polygonOffsetUnits={-3}
        />
      </mesh>
    </group>
  );
};

// 3. WALL KANBAN BOARD
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
    const titleTxt = `${dept.code} · ${dept.name}`;
    let tSize = 26;
    while (tSize > 16) {
      ctx.font = `700 ${tSize}px "Plus Jakarta Sans", "Segoe UI", sans-serif`;
      if (ctx.measureText(titleTxt).width <= 570) break;
      tSize -= 1;
    }
    ctx.fillText(titleTxt, 28, 44, 570);
    ctx.fillStyle = '#5eead4';
    ctx.font = '600 19px "JetBrains Mono", monospace';
    ctx.textAlign = 'right';
    ctx.fillText(`${dept.opsPerSec} · VP ${dept.vpName}`, 996, 44, 370);
    ctx.textAlign = 'left';

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
      <mesh castShadow material={toonMat('#8f5b32')}>
        <boxGeometry args={[4.4, 2.38, 0.12]} />
        <Outlines thickness={0.015} color={INK} />
      </mesh>
      <mesh position={[0, 0, 0.07]}>
        <planeGeometry args={[4.15, 2.18]} />
        <meshBasicMaterial map={tex} toneMapped={false} />
      </mesh>
    </group>
  );
};

// 4. ANIMATED SHIBA MASCOT DOG
export const AnimatedShibaDog: React.FC<{
  center: [number, number, number];
  radius?: number;
  label?: string;
}> = ({ center, radius = 3.2, label = '🐕 Zora · Mascotte Forge' }) => {
  const { scene, animations } = useGLTF('/models/dog-shiba.glb');
  const dogGroupRef = useRef<THREE.Group>(null);

  const clonedDog = useMemo(() => {
    const c = cloneSkeleton(scene);
    c.traverse((o) => {
      const m = o as THREE.Mesh;
      if (!m.isMesh) return;
      const n = (m.material as THREE.Material)?.name ?? '';
      if (SHIBA_PALETTE[n]) {
        m.material = toonMat(SHIBA_PALETTE[n]);
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
    const t = clock.getElapsedTime() * 0.48;
    const x = center[0] + Math.cos(t) * radius;
    const z = center[2] + Math.sin(t) * radius * 0.55;
    dogGroupRef.current.position.set(x, center[1], z);
    dogGroupRef.current.rotation.y = Math.atan2(-Math.sin(t) * radius, Math.cos(t) * radius * 0.55);
  });

  return (
    <group ref={dogGroupRef} position={center}>
      <ContactShadowDisc radius={0.46} opacity={0.78} />
      <group scale={[1.35, 1.35, 1.35]}>
        <primitive object={clonedDog} />
      </group>
      <PillBillboardTag position={[0, 1.08, 0]} title={label} accentColor="#f59e0b" width={1.35} />
    </group>
  );
};

// 5. AUTONOMOUS CUBEFARM ROBOT VACUUM (Roomba patrolling interior floor!)
export const AutonomousRoomba: React.FC<{ center: [number, number, number]; radius?: number }> = ({
  center,
  radius = 2.8,
}) => {
  const ref = useRef<THREE.Group>(null);
  useFrame(({ clock }) => {
    if (!ref.current) return;
    const t = clock.getElapsedTime() * 0.55;
    ref.current.position.set(center[0] + Math.sin(t) * radius, center[1] + 0.045, center[2] + Math.cos(t * 1.3) * (radius * 0.65));
    ref.current.rotation.y += 0.03;
  });
  return (
    <group ref={ref} position={[center[0], center[1] + 0.045, center[2]]}>
      <ContactShadowDisc position={[0, -0.025, 0]} radius={0.34} opacity={0.7} />
      <mesh castShadow material={toonMat('#2b2d42')}>
        <cylinderGeometry args={[0.26, 0.26, 0.08, 18]} />
        <Outlines thickness={0.012} color={INK} />
      </mesh>
      <mesh position={[0, 0.045, 0]} material={toonMat('#14b8a6')}>
        <cylinderGeometry args={[0.19, 0.19, 0.015, 16]} />
      </mesh>
      <mesh position={[0, 0.056, 0.09]}>
        <circleGeometry args={[0.028, 10]} />
        <meshBasicMaterial color="#4ade80" />
      </mesh>
    </group>
  );
};

// 6. FULL RICH INTERIOR FURNISHINGS FOR EXTERIOR PAVILIONS & LOUNGES
export const PavilionRichFurnishings: React.FC<{ dept: SolarDepartment }> = ({ dept }) => {
  const { scene: loungeScene } = useGLTF('/models/lounge.glb');
  const { scene: kitchenScene } = useGLTF('/models/kitchen.glb');
  const { scene: plantsScene } = useGLTF('/models/plants.glb');

  const assets = useMemo(() => {
    const sofa = cloneAndPaintPiece(loungeScene, 'sofa', LOUNGE_PALETTE, {
      Sofa: toonMat(dept.color),
    });
    const table = cloneAndPaintPiece(loungeScene, 'coffee_table', LOUNGE_PALETTE);
    const pouf1 = cloneAndPaintPiece(loungeScene, 'pouf', LOUNGE_PALETTE, { Cloth: toonMat('#d9a441') });
    const pouf2 = cloneAndPaintPiece(loungeScene, 'pouf', LOUNGE_PALETTE, { Cloth: toonMat('#0d9488') });
    const pillow1 = cloneAndPaintPiece(loungeScene, 'pillow', LOUNGE_PALETTE, { Cloth: toonMat('#fde68a') });
    const pillow2 = cloneAndPaintPiece(loungeScene, 'pillow', LOUNGE_PALETTE, { Cloth: toonMat('#f97316') });

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
      <PersianCarpet position={[0, 0.305, -4.7]} size={[11.6, 5.2]} accentColor={dept.color} />

      <group position={[9.8, 0.28, 2.2]} rotation={[0, -0.45, 0]}>
        <PersianCarpet position={[0, 0.025, 0]} size={[5.6, 4.6]} accentColor="#d9a441" />
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

      <group position={[-10.2, 0.28, 2.4]} rotation={[0, 0.45, 0]} scale={[0.72, 0.72, 0.72]}>
        <primitive object={assets.counter} />
        <group position={[0, 0.96, 0.05]}>
          <primitive object={assets.coffeeMachine} />
        </group>
        <group position={[3.2, 0, 0]}>
          <primitive object={assets.fridge} />
        </group>
      </group>

      {plantCoords.map((pos, i) => (
        <group key={i} position={pos} scale={[1.25, 1.25, 1.25]}>
          <primitive object={assets.floorPlants[i]} />
        </group>
      ))}

      <WallKanbanBoard position={[-7.8, 2.55, -7.8]} rotationY={0.28} dept={dept} />

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
              <meshBasicMaterial color="#fef08a" />
            </mesh>
          </group>
        ))}
      </group>
    </group>
  );
};

// Re-export painted GLB clones helper for DedicatedPavilionInterior
export { cloneAndPaintPiece, PLANT_PALETTE, LOUNGE_PALETTE, KITCHEN_PALETTE, DESK_PROP_PALETTE };

// 7. ILLUSTRATED MARIO-64 PORTAL PAINTING CANVAS TEXTURE
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

  ctx.fillStyle = 'rgba(11, 18, 32, 0.88)';
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
