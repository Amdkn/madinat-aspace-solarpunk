import React, { Suspense, useEffect, useMemo, useRef, useState } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Outlines, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DepartmentStream, PORTAL_GAMES, SOLAR_DEPARTMENTS, SolarDepartment } from '../data/madinatOntology';
import { useWorldStore } from '../store/useWorldStore';
import { solarpunkAudio } from '../audio/solarpunkAudio';
import { ArticulatedCharacter } from './ArticulatedCharacter';
import { PostEffects } from './PostEffects';
import {
  buildWorldTriangleGrid,
  INTERIOR_PLANT_SPOTS,
  INTERIOR_SEAT_LAYOUT,
  resolveInteriorCollisions,
  resolveMeshWallCollisions,
  simulateWalkPath,
  sweepMove,
  WorldTriangleGrid,
} from './CollisionEngine';

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-lambda * dt));
}
import {
  AnimatedShibaDog,
  AutonomousRoomba,
  cloneAndPaintPiece,
  createPortalArtworkTexture,
  CubeFarmWorkstation,
  DESK_PROP_PALETTE,
  KITCHEN_PALETTE,
  LOUNGE_PALETTE,
  PersianCarpet,
  PillBillboardTag,
  PLANT_PALETTE,
  WallKanbanBoard,
} from './InteriorKitAndWorkstation';
import { applySolarpunkMaterials, SHARED_MATERIALS, toonMat } from './ShadersAndMaterials';

const INK = '#1f1d2b';

const DEPT_STUDIO_ROSTER: Record<string, { extraStreams: DepartmentStream[]; mascotLabel: string }> = {
  rd: {
    mascotLabel: '🐕 Zora · Forge',
    extraStreams: [
      { id: 'rd-3', agentName: 'Kang // Rust Runtime', role: 'Kernel Forge', task: 'Worktrees & CI vert', statusLabel: 'Build Vert ✓' },
      { id: 'rd-4', agentName: 'Stark // Shaders', role: 'WebGL PostFX', task: 'N8AO & Toon 60 FPS', statusLabel: '60 FPS Lock' },
      { id: 'rd-5', agentName: 'Vision // Audit E2E', role: 'Playwright Sentinel', task: '412/412 tests verts', statusLabel: '412/412 Verts' },
      { id: 'rd-6', agentName: 'Banner // Profiler', role: 'VRAM & Quotas', task: 'Empreinte GPU < 380 Mo', statusLabel: 'Nominal ⚡' },
    ],
  },
  support: {
    mascotLabel: '🐕 Hermès · Accueil',
    extraStreams: [
      { id: 'sup-3', agentName: 'Echo // Triage Live', role: 'Résolution N1', task: 'Tickets clients < 25s', statusLabel: 'CSAT 95 % ✓' },
      { id: 'sup-4', agentName: 'Nova // SLA Monitor', role: 'Onboarding VIP', task: '0 ticket en retard', statusLabel: 'En ligne' },
      { id: 'sup-5', agentName: 'Aura // Base Savoir', role: 'WikiLLM Docs', task: 'Guides interactifs à jour', statusLabel: 'Sync OK' },
      { id: 'sup-6', agentName: 'Sol // Voix & Chat', role: 'Conciergerie 24/7', task: 'Support FR/EN/AR actif', statusLabel: 'Nominal' },
    ],
  },
  finance: {
    mascotLabel: '🐕 Dinar · Trésor',
    extraStreams: [
      { id: 'fin-4', agentName: 'Pacioli // Bilan', role: 'Contrôle Fiscal', task: 'Clôture multi-entités', statusLabel: 'Vérifié ✓' },
      { id: 'fin-5', agentName: 'Euler // Trésorerie', role: 'Liquidité', task: 'Prévision cashflow 90j', statusLabel: '+18 % marge' },
      { id: 'fin-6', agentName: 'Miriam // Devises', role: 'FX Hedging', task: 'Taux EUR/USD verrouillés', statusLabel: 'Stable' },
    ],
  },
  hr: {
    mascotLabel: '🐕 Gaia · Talents',
    extraStreams: [
      { id: 'hr-3', agentName: 'Storm // Culture IA', role: 'Accompagnement', task: 'Calibration ratios HUM/IA', statusLabel: 'Équilibré' },
      { id: 'hr-4', agentName: 'Beast // Compétences', role: 'Matrice Holons', task: 'Certifications actives', statusLabel: '98 % à jour' },
      { id: 'hr-5', agentName: 'Jean // Éthique', role: 'Charte Souveraine', task: 'Conformité humaine S0', statusLabel: 'Validée' },
      { id: 'hr-6', agentName: 'Logan // Accès MCP', role: 'Sécurité Accès', task: 'Clés worktrees auditées', statusLabel: '0 faille' },
    ],
  },
  sales: {
    mascotLabel: '🐕 Mercure · Deals',
    extraStreams: [
      { id: 'sal-3', agentName: 'Atlas // Comptes ETI', role: 'Enterprise', task: 'Démo 3D World C-Level', statusLabel: 'Pipeline 420k€' },
      { id: 'sal-4', agentName: 'Vega // Relances', role: 'Outreach CRM', task: 'Suivi séquences ICP', statusLabel: '+26 % conv' },
      { id: 'sal-5', agentName: 'Iris // Propositions', role: 'Devis Live', task: 'Contrats générés < 2min', statusLabel: 'Prêt' },
      { id: 'sal-6', agentName: 'Kahn // Renewals', role: 'Expansion NRR', task: 'Taux rétention net 124 %', statusLabel: 'Vert ✓' },
    ],
  },
  marketing: {
    mascotLabel: '🐕 Apollon · Studio',
    extraStreams: [
      { id: 'mkt-3', agentName: 'Nova // Vidéo 3D', role: 'Motion & Trailers', task: 'Rendu clips City Solarpunk', statusLabel: 'Rendu 4K' },
      { id: 'mkt-4', agentName: 'Lyra // Social SEO', role: 'Acquisition', task: 'Croissance organique +34 %', statusLabel: 'Tendances ↑' },
      { id: 'mkt-5', agentName: 'Pixel // Design Bagdad', role: 'Direction Artistique', task: 'Assets Or & Calcaire', statusLabel: 'Approuvé' },
      { id: 'mkt-6', agentName: 'Wave // Analytics', role: 'Attribution', task: 'CAC réduit de 22 %', statusLabel: 'Optimal' },
    ],
  },
  operations: {
    mascotLabel: '🐕 Tempo · Supply',
    extraStreams: [
      { id: 'ops-3', agentName: 'Thing // Flux Make', role: 'Liberty Ride', task: '8 workflows synchronisés', statusLabel: '99.8 % SLA' },
      { id: 'ops-4', agentName: 'Sue // Concordia', role: 'Fencing Tokens', task: 'Baux TTL 300s sans conflit', statusLabel: 'Zéro collision' },
      { id: 'ops-5', agentName: 'Silver // Logistique', role: 'Routage', task: 'Latence dispatch < 12ms', statusLabel: 'Fluide' },
      { id: 'ops-6', agentName: 'Bolt // Télémétrie', role: 'Observabilité', task: 'Monitoring temps réel', statusLabel: 'Vert ✓' },
    ],
  },
  legal: {
    mascotLabel: '🐕 Athéna · SOC2',
    extraStreams: [
      { id: 'leg-3', agentName: 'Themis // RGPD EU', role: 'Confidentialité', task: 'Zero-Training Tier4 vérifié', statusLabel: 'Conforme' },
      { id: 'leg-4', agentName: 'Scribe // Brevets', role: 'IP & Contrats', task: 'Clauses propriété validées', statusLabel: 'Archivé R10' },
      { id: 'leg-5', agentName: 'Sentinel // Audit', role: 'Journal Immuable', task: 'Empreintes SHA-256 actives', statusLabel: '100 % scellé' },
      { id: 'leg-6', agentName: 'Aria // Escrow', role: 'Double Signature', task: 'Contrôle seuils > 10k€', statusLabel: 'Actif' },
    ],
  },
};

function createHoneyOakParquetTexture(): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 512;
  const ctx = c.getContext('2d')!;
  ctx.fillStyle = '#cfab74';
  ctx.fillRect(0, 0, 512, 512);

  const plankH = 32;
  const plankW = 128;
  for (let row = 0; row < 16; row++) {
    const offset = (row % 2) * 64;
    for (let col = -1; col < 5; col++) {
      const shade = ((row * 17 + col * 31) % 16) - 8;
      ctx.fillStyle = `rgb(${208 + shade}, ${170 + shade}, ${114 + shade})`;
      ctx.fillRect(col * plankW + offset + 1, row * plankH + 1, plankW - 2, plankH - 2);
      ctx.fillStyle = 'rgba(130, 88, 42, 0.16)';
      ctx.fillRect(col * plankW + offset + 10, row * plankH + 12, plankW * 0.6, 2);
    }
    ctx.fillStyle = 'rgba(110, 72, 34, 0.35)';
    ctx.fillRect(0, row * plankH, 512, 2);
  }
  const tex = new THREE.CanvasTexture(c);
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(5, 4);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

function createDepartmentArtTexture(dept: SolarDepartment, title: string, accent: string): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 512;
  c.height = 360;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createLinearGradient(0, 0, 512, 360);
  grad.addColorStop(0, '#0f172a');
  grad.addColorStop(1, '#1e293b');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 512, 360);
  ctx.strokeStyle = accent;
  ctx.lineWidth = 4;
  ctx.beginPath();
  ctx.arc(256, 155, 78, 0, Math.PI * 2);
  ctx.stroke();
  ctx.beginPath();
  ctx.arc(256, 155, 46, 0, Math.PI * 2);
  ctx.stroke();
  ctx.fillStyle = '#fde68a';
  ctx.textAlign = 'center';
  ctx.font = '700 26px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(title, 256, 290);
  ctx.fillStyle = '#5eead4';
  ctx.font = '600 16px "JetBrains Mono", monospace';
  ctx.fillText(`${dept.code} · /${dept.appSlug.toUpperCase()}`, 256, 326);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}

const InteriorStudioRoom: React.FC<{ deptId: string }> = ({ deptId }) => {
  const dept = SOLAR_DEPARTMENTS.find((d) => d.id === deptId) ?? SOLAR_DEPARTMENTS.find((d) => d.id === 'rd')!;
  const resolvedNeedsIds = useWorldStore((s) => s.resolvedNeedsIds);

  const { scene: loungeScene } = useGLTF('/models/lounge.glb');
  const { scene: kitchenScene } = useGLTF('/models/kitchen.glb');
  const { scene: plantsScene } = useGLTF('/models/plants.glb');
  const { scene: propsScene } = useGLTF('/models/desk_props.glb');
  const { scene: floraScene } = useGLTF('/models/vehicles_and_flora.glb');

  const parquetTex = useMemo(() => createHoneyOakParquetTexture(), []);
  const roster = DEPT_STUDIO_ROSTER[dept.id] ?? DEPT_STUDIO_ROSTER.rd;

  const seats = useMemo(() => {
    const list: DepartmentStream[] = [...dept.streams, ...roster.extraStreams].slice(0, 6);
    return INTERIOR_SEAT_LAYOUT.map((c, idx) => ({
      stream: list[idx % list.length],
      pos: c.pos,
      rotY: c.rotY,
      skin: c.skin,
    }));
  }, [dept.streams, roster.extraStreams]);

  const props = useMemo(() => {
    const sofa = cloneAndPaintPiece(loungeScene, 'sofa', LOUNGE_PALETTE, { Sofa: toonMat(dept.color) });
    const coffeeTable = cloneAndPaintPiece(loungeScene, 'coffee_table', LOUNGE_PALETTE);
    const pillow1 = cloneAndPaintPiece(loungeScene, 'pillow', LOUNGE_PALETTE, { Cloth: toonMat('#fde047') });
    const pillow2 = cloneAndPaintPiece(loungeScene, 'pillow', LOUNGE_PALETTE, { Cloth: toonMat('#f97316') });
    const pouf1 = cloneAndPaintPiece(loungeScene, 'pouf', LOUNGE_PALETTE, { Cloth: toonMat('#d9a441') });
    const pouf2 = cloneAndPaintPiece(loungeScene, 'pouf', LOUNGE_PALETTE, { Cloth: toonMat('#0d9488') });

    const counter = cloneAndPaintPiece(kitchenScene, 'counter', KITCHEN_PALETTE);
    const coffeeMachine = cloneAndPaintPiece(kitchenScene, 'coffee_machine', KITCHEN_PALETTE);
    const fridge = cloneAndPaintPiece(kitchenScene, 'fridge', KITCHEN_PALETTE);

    const plants = [
      cloneAndPaintPiece(plantsScene, 'monstera', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'snake_plant', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'ficus', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'monstera', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'snake_plant', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'ficus', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'monstera', PLANT_PALETTE),
      cloneAndPaintPiece(plantsScene, 'ficus', PLANT_PALETTE),
    ];
    const shelfBooks = [
      cloneAndPaintPiece(propsScene, 'books_upright', DESK_PROP_PALETTE),
      cloneAndPaintPiece(propsScene, 'books_leaning', DESK_PROP_PALETTE),
      cloneAndPaintPiece(propsScene, 'books_stack', DESK_PROP_PALETTE),
    ];
    const palmProto = floraScene.getObjectByName('DatePalm');
    const windowPalms = [-12, -5, 3, 10].map(() =>
      palmProto ? applySolarpunkMaterials(palmProto.clone(true)) : new THREE.Group(),
    );
    return { sofa, coffeeTable, pillow1, pillow2, pouf1, pouf2, counter, coffeeMachine, fridge, plants, shelfBooks, windowPalms };
  }, [loungeScene, kitchenScene, plantsScene, propsScene, floraScene, dept.color]);

  const wallArtTextures = useMemo(() => {
    if (dept.id === 'rd') {
      return PORTAL_GAMES.map((pg) => createPortalArtworkTexture(pg.id, pg.title, pg.accent, pg.skyTop, pg.skyBottom));
    }
    return [
      createDepartmentArtTexture(dept, `${dept.bridgePillar} · HUB`, dept.color),
      createDepartmentArtTexture(dept, `VP ${dept.vpName}`, '#f59e0b'),
      createDepartmentArtTexture(dept, dept.opsPerSec, '#14b8a6'),
    ];
  }, [dept]);

  const wallMat = toonMat('#eeddc0');
  const beamMat = toonMat('#9c6639');
  const mullionMat = toonMat('#3d2b1f');
  const glassMat = new THREE.MeshPhysicalMaterial({
    color: '#cceef4',
    transparent: true,
    opacity: 0.24,
    roughness: 0.08,
  });

  return (
    <group>
      {/* Warm Honey-Oak Herringbone Floor (20m x 15m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} receiveShadow>
        <planeGeometry args={[20.2, 15.2]} />
        <meshStandardMaterial map={parquetTex} roughness={0.62} />
      </mesh>

      {/* Perimeter Golden Plaster Baseboard */}
      <mesh position={[0, 0.09, -7.45]} material={SHARED_MATERIALS.abbassidGold}>
        <boxGeometry args={[20, 0.18, 0.12]} />
      </mesh>
      <mesh position={[-9.94, 0.09, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <boxGeometry args={[0.12, 0.18, 15]} />
      </mesh>
      <mesh position={[9.94, 0.09, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <boxGeometry args={[0.12, 0.18, 15]} />
      </mesh>

      {/* Woven Baghdadi Carpets */}
      <PersianCarpet position={[0, 0.006, 0.35]} size={[2.3, 11.2]} accentColor="#d97706" />
      <PersianCarpet position={[-3.2, 0.006, -1.0]} size={[4.6, 6.8]} accentColor={dept.color} />
      <PersianCarpet position={[3.2, 0.006, -1.0]} size={[4.6, 6.8]} accentColor={dept.color} />
      <PersianCarpet position={[7.35, 0.006, -1.1]} size={[4.2, 5.4]} accentColor="#0d9488" />

      {/* 6 Active CubeFarm Workstations */}
      {seats.map((s, idx) => (
        <CubeFarmWorkstation
          key={`${dept.id}-${s.stream.id}-${idx}`}
          position={s.pos}
          rotationY={s.rotY}
          stream={s.stream}
          deptColor={dept.color}
          deptId={dept.id}
          needsHuman={Boolean(s.stream.needsHuman && !resolvedNeedsIds.includes(s.stream.id))}
          phaseOffset={idx * 1.37}
          skinColor={s.skin}
        />
      ))}

      {/* Central North Executive Command Lectern (Raised pill at y=2.58 for zero overlap!) */}
      <group position={[0, 0, -4.75]}>
        <mesh position={[0, 0.56, 0]} castShadow material={toonMat('#d9a441')}>
          <cylinderGeometry args={[0.45, 0.62, 1.12, 16]} />
          <Outlines thickness={0.014} color={INK} />
        </mesh>
        <mesh position={[0, 1.38, 0]} rotation={[0.4, 0.6, 0]}>
          <octahedronGeometry args={[0.32, 0]} />
          <meshBasicMaterial color={dept.color} />
          <Outlines thickness={0.012} color={INK} />
        </mesh>
        <PillBillboardTag
          position={[0, 2.58, 0]}
          title={`[E] COMMAND DECK · /${dept.appSlug.toUpperCase()}`}
          subtitle={`${dept.opsPerSec} · VP ${dept.vpName}`}
          accentColor={dept.color}
          width={2.65}
          maxDist={16}
        />
      </group>

      {/* Wall Kanban Board on North-Right Travertine Pier */}
      <WallKanbanBoard position={[3.6, 2.2, -7.3]} dept={dept} />

      {/* Framed Portal Paintings (R&D Only: Painting 1 angled visibly in North-West Corner!) or Dept Art Wall */}
      <group position={[-5.35, 2.32, -7.08]} rotation={[0, 0.28, 0]}>
        <mesh castShadow material={toonMat('#d9a441')}>
          <boxGeometry args={[2.85, 2.0, 0.14]} />
          <Outlines thickness={0.015} color={INK} />
        </mesh>
        <mesh position={[0, 0, 0.085]}>
          <planeGeometry args={[2.58, 1.76]} />
          <meshBasicMaterial map={wallArtTextures[0]} toneMapped={false} />
        </mesh>
      </group>
      <group position={[-9.68, 2.15, 0]} rotation={[0, Math.PI / 2, 0]}>
        {[1, 2].map((artIdx, i) => (
          <group key={artIdx} position={[(i - 0.5) * 4.2, 0, 0]}>
            <mesh castShadow material={toonMat('#d9a441')}>
              <boxGeometry args={[3.15, 2.2, 0.14]} />
              <Outlines thickness={0.015} color={INK} />
            </mesh>
            <mesh position={[0, 0, 0.085]}>
              <planeGeometry args={[2.86, 1.96]} />
              <meshBasicMaterial map={wallArtTextures[artIdx]} toneMapped={false} />
            </mesh>
          </group>
        ))}
      </group>

      {/* East Solarpunk Collaborative Lounge */}
      <group position={[7.4, 0, -1.1]} rotation={[0, -Math.PI / 2, 0]} scale={[0.72, 0.72, 0.72]}>
        <group position={[0, 0, -1.25]}>
          <primitive object={props.sofa} />
          <group position={[-0.6, 0.45, -0.05]} rotation={[-0.18, 0, 0]}>
            <primitive object={props.pillow1} />
          </group>
          <group position={[0.6, 0.45, -0.05]} rotation={[-0.18, 0, 0]}>
            <primitive object={props.pillow2} />
          </group>
        </group>
        <group position={[0, 0, 0.5]}>
          <primitive object={props.coffeeTable} />
        </group>
        <group position={[-1.45, 0, 0.7]}>
          <primitive object={props.pouf1} />
        </group>
        <group position={[1.45, 0, 0.7]}>
          <primitive object={props.pouf2} />
        </group>
      </group>

      {/* Cedar Library */}
      <group position={[8.6, 0, -5.6]} rotation={[0, -0.5, 0]}>
        <mesh position={[0, 1.15, 0]} castShadow material={beamMat}>
          <boxGeometry args={[1.8, 2.3, 0.5]} />
          <Outlines thickness={0.015} color={INK} />
        </mesh>
        {[0.55, 1.15, 1.75].map((sy, i) => (
          <group key={i} position={[-0.35 + i * 0.35, sy, 0.14]} scale={[1.35, 1.35, 1.35]}>
            <primitive object={props.shelfBooks[i % 3]} />
          </group>
        ))}
      </group>

      {/* South-East Kitchenette */}
      <group position={[7.3, 0, 4.3]} rotation={[0, -Math.PI / 2, 0]} scale={[0.66, 0.66, 0.66]}>
        <primitive object={props.counter} />
        <group position={[0, 0.96, 0.05]}>
          <primitive object={props.coffeeMachine} />
        </group>
        <group position={[3.15, 0, 0]}>
          <primitive object={props.fridge} />
        </group>
        <PillBillboardTag position={[0, 2.6, 0]} title="[E] Café & Thé Bagdad" accentColor="#f59e0b" width={2.3} />
      </group>

      {/* 8 Solidly Collidable Potted Plants */}
      {INTERIOR_PLANT_SPOTS.map((pos, i) => (
        <group key={i} position={pos} scale={[1.28, 1.28, 1.28]}>
          <primitive object={props.plants[i]} />
        </group>
      ))}

      {/* Department-Coherent Mascot Shiba & Roomba */}
      <AnimatedShibaDog center={[0, 0, 0.7]} radius={1.45} label={roster.mascotLabel} />
      <AutonomousRoomba center={[-1.4, 0, 2.2]} radius={1.6} />

      {/* Enclosure Walls */}
      <group userData={{ cameraCollider: true, walkableMesh: true }}>
        <mesh position={[-10.0, 2.1, 0]} receiveShadow material={wallMat}>
          <boxGeometry args={[0.25, 4.2, 15.2]} />
        </mesh>
        <mesh position={[10.0, 2.1, 0]} receiveShadow material={wallMat}>
          <boxGeometry args={[0.25, 4.2, 15.2]} />
        </mesh>
        <mesh position={[-6.0, 2.1, 7.5]} material={wallMat}>
          <boxGeometry args={[8.2, 4.2, 0.25]} />
        </mesh>
        <mesh position={[6.0, 2.1, 7.5]} material={wallMat}>
          <boxGeometry args={[8.2, 4.2, 0.25]} />
        </mesh>
        <mesh position={[0, 3.6, 7.5]} material={wallMat}>
          <boxGeometry args={[4.2, 1.2, 0.25]} />
        </mesh>
        {[-9.8, -5.8, -1.6, 1.4, 6.4, 9.8].map((wx, i) => (
          <mesh key={i} position={[wx, 2.1, -7.45]} castShadow material={wallMat}>
            <boxGeometry args={[0.55, 4.2, 0.45]} />
            <Outlines thickness={0.015} color={INK} />
          </mesh>
        ))}
        <mesh position={[0, 3.9, -7.45]} material={wallMat}>
          <boxGeometry args={[20.2, 0.6, 0.4]} />
        </mesh>
      </group>
      <PillBillboardTag
        position={[0, 3.45, 7.3]}
        title="SORTIE · [E] / [ÉCHAP]"
        accentColor="#38bdf8"
        width={1.75}
      />

      {/* North Panoramic Atrium Windows with Sculpted Bronze Mullions */}
      <mesh position={[0, 1.85, -7.45]} material={mullionMat}>
        <boxGeometry args={[12.5, 0.1, 0.14]} />
      </mesh>
      {[-3.6, 0.0, 3.6].map((mx, i) => (
        <mesh key={i} position={[mx, 2.0, -7.45]} material={mullionMat}>
          <boxGeometry args={[0.1, 3.8, 0.14]} />
        </mesh>
      ))}
      <mesh position={[0, 1.9, -7.48]} material={glassMat}>
        <planeGeometry args={[19.5, 3.5]} />
      </mesh>

      {/* Authentic Outdoor Solarpunk Lagoon & Date Palms Beyond North Windows */}
      <group position={[0, 0, -18]}>
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.2, 0]}>
          <planeGeometry args={[80, 30]} />
          <meshStandardMaterial color="#0e8c83" roughness={0.2} metalness={0.3} />
        </mesh>
        <mesh position={[0, 7.5, -16]}>
          <planeGeometry args={[95, 30]} />
          <meshBasicMaterial color="#fce0a6" />
        </mesh>
        <mesh position={[-11, 5.2, -13]}>
          <sphereGeometry args={[7.2, 24, 14, 0, Math.PI * 2, 0, Math.PI / 2]} />
          <meshBasicMaterial color="#e0aa42" wireframe />
        </mesh>
        {[-12, -5, 3, 10].map((tx, i) => (
          <group key={i} position={[tx, -0.2, -5]} scale={[0.92, 0.92, 0.92]}>
            <primitive object={props.windowPalms[i]} />
          </group>
        ))}
      </group>

      {/* Coffered Cedar Ceiling + 6 Hanging Warm Brass Pendant Lamps */}
      <mesh position={[0, 4.22, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <planeGeometry args={[20.2, 15.2]} />
        <meshStandardMaterial color="#f5e6cc" roughness={0.85} />
      </mesh>
      {[-6.5, -2.2, 2.2, 6.5].map((bx, i) => (
        <mesh key={i} position={[bx, 4.08, 0]} material={beamMat}>
          <boxGeometry args={[0.26, 0.24, 15.0]} />
        </mesh>
      ))}
      {[
        [-3.6, -2.2],
        [3.6, -2.2],
        [-3.6, 1.5],
        [3.6, 1.5],
        [0, -0.4],
        [7.2, -1.0],
      ].map(([lx, lz], i) => (
        <group key={i} position={[lx, 3.35, lz]}>
          <mesh position={[0, 0.45, 0]} material={toonMat(INK)}>
            <cylinderGeometry args={[0.02, 0.02, 0.9, 6]} />
          </mesh>
          <mesh material={toonMat('#e0aa42')}>
            <coneGeometry args={[0.32, 0.24, 16, 1, true]} />
            <Outlines thickness={0.01} color={INK} />
          </mesh>
          <mesh position={[0, -0.07, 0]}>
            <sphereGeometry args={[0.1, 10, 8]} />
            <meshBasicMaterial color="#fef08a" />
          </mesh>
        </group>
      ))}
    </group>
  );
};

const InteriorPlayerController: React.FC<{ deptId: string }> = ({ deptId }) => {
  const { camera, gl, scene } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const posRef = useRef(new THREE.Vector3(0, 0, 4.25));
  const rotYRef = useRef(0);
  const avatarRef = useRef<THREE.Group>(null);
  const camYaw = useRef(0);
  const targetYaw = useRef(0);
  const camPitch = useRef(0.28);
  const targetPitch = useRef(0.28);
  const camDist = useRef(2.75);
  const effectiveDist = useRef(2.75);
  const dragging = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const lastMouseDragTime = useRef(0);
  const smoothedPivot = useRef(new THREE.Vector3(0, 1.4, 4.25));
  const walkVelRef = useRef({ x: 0, z: 0 });
  const footSpeedRef = useRef(0);
  const raycasterRef = useRef(new THREE.Raycaster());
  const occludersRef = useRef<THREE.Object3D[]>([]);
  const interiorGridRef = useRef<WorldTriangleGrid | null>(null);
  const debugOverrideCam = useRef<{ pos: THREE.Vector3; lookAt: THREE.Vector3 } | null>(null);

  const dept = SOLAR_DEPARTMENTS.find((d) => d.id === deptId) ?? SOLAR_DEPARTMENTS[6];
  const roster = DEPT_STUDIO_ROSTER[dept.id] ?? DEPT_STUDIO_ROSTER.rd;
  const combinedStreams = useMemo(() => [...dept.streams, ...roster.extraStreams].slice(0, 6), [dept.streams, roster.extraStreams]);

  useEffect(() => {
    posRef.current.set(0, 0, 4.25);
    rotYRef.current = 0;
    camYaw.current = targetYaw.current = 0;
    camPitch.current = targetPitch.current = 0.28;
    camDist.current = effectiveDist.current = 2.75;
    smoothedPivot.current.set(0, 1.4, 4.25);
    walkVelRef.current = { x: 0, z: 0 };
    footSpeedRef.current = 0;
    camera.position.set(0, 2.4, 6.8);
    camera.lookAt(0, 1.35, 3.0);

    const colls: THREE.Object3D[] = [];
    scene.traverse((o) => {
      if (o.userData?.cameraCollider) {
        o.traverse((ch) => {
          if ((ch as THREE.Mesh).isMesh) colls.push(ch);
        });
      }
    });
    occludersRef.current = colls;
    interiorGridRef.current = buildWorldTriangleGrid(scene, 4);

    (window as unknown as Record<string, unknown>).__madinatInteriorDebug = {
      setCameraView: (camPos: [number, number, number], lookAt: [number, number, number]) => {
        debugOverrideCam.current = { pos: new THREE.Vector3(...camPos), lookAt: new THREE.Vector3(...lookAt) };
      },
      clearCameraView: () => {
        debugOverrideCam.current = null;
      },
      teleport: (pos: [number, number, number]) => {
        debugOverrideCam.current = null;
        const [rx, rz] = resolveInteriorCollisions(pos[0], pos[2], 0.44);
        posRef.current.set(rx, pos[1], rz);
        smoothedPivot.current.set(rx, pos[1] + 1.4, rz);
      },
      tryWalkTo: (tx: number, tz: number) => {
        const [rx, rz] = simulateWalkPath(posRef.current.x, posRef.current.z, tx, tz, (x, z) => {
          const [ix, iz] = resolveInteriorCollisions(x, z, 0.44);
          return resolveMeshWallCollisions(interiorGridRef.current, ix, iz, 0, 0.44);
        });
        posRef.current.set(rx, 0, rz);
        smoothedPivot.current.set(rx, 1.4, rz);
        return [rx, rz];
      },
      getPos: () => [posRef.current.x, posRef.current.y, posRef.current.z],
      getCamYaw: () => camYaw.current,
      getRosterNames: () => combinedStreams.map((s) => s.agentName),
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__madinatInteriorDebug;
    };
  }, [camera, scene, deptId, combinedStreams]);

  useEffect(() => {
    const clearKeys = () => {
      keys.current = {};
      dragging.current = false;
      lastPointer.current = null;
    };
    const resetCamera = () => {
      debugOverrideCam.current = null;
      camYaw.current = targetYaw.current = rotYRef.current;
      camPitch.current = targetPitch.current = 0.28;
      camDist.current = 2.75;
      effectiveDist.current = 2.75;
      lastMouseDragTime.current = 0;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      keys.current[e.code] = true;
      const st = useWorldStore.getState();
      if (e.code === 'KeyE' && st.interactionHint) {
        st.interactionHint.action();
      } else if (e.code === 'KeyR') {
        resetCamera();
      } else if (e.code === 'Escape') {
        if (st.inspectedWorkstation) st.inspectWorkstation(null);
        else if (st.activeDepartmentId) st.openDepartment(null);
        else st.enterDepartmentBuilding(null);
      } else if (e.code === 'KeyP') {
        st.setPhoneOpen(!st.phoneOpen);
      } else if (e.code === 'KeyN') {
        st.jumpToNextAgentNeedingYou();
      }
    };
    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };
    const dom = gl.domElement;
    const onDown = (e: MouseEvent) => {
      dragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    const onUp = () => {
      dragging.current = false;
      lastPointer.current = null;
    };
    const onMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      if (!lastPointer.current) {
        lastPointer.current = { x: e.clientX, y: e.clientY };
        return;
      }
      const dx = THREE.MathUtils.clamp(e.clientX - lastPointer.current.x, -26, 26);
      const dy = THREE.MathUtils.clamp(e.clientY - lastPointer.current.y, -26, 26);
      lastPointer.current = { x: e.clientX, y: e.clientY };
      debugOverrideCam.current = null;
      targetYaw.current -= dx * 0.0025;
      targetPitch.current = THREE.MathUtils.clamp(targetPitch.current + dy * 0.002, 0.06, 0.85);
      lastMouseDragTime.current = performance.now();
    };
    const onWheel = (e: WheelEvent) => {
      camDist.current = THREE.MathUtils.clamp(camDist.current + e.deltaY * 0.008, 1.2, 9.5);
    };
    const onVis = () => {
      if (document.hidden) clearKeys();
    };
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', onVis);
    dom.addEventListener('mousedown', onDown);
    dom.addEventListener('dblclick', resetCamera);
    window.addEventListener('mouseup', onUp);
    window.addEventListener('mousemove', onMove);
    dom.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('madinat:reset-camera', resetCamera);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', onVis);
      dom.removeEventListener('mousedown', onDown);
      dom.removeEventListener('dblclick', resetCamera);
      window.removeEventListener('mouseup', onUp);
      window.removeEventListener('mousemove', onMove);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('madinat:reset-camera', resetCamera);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useWorldStore.getState();
    const pos = posRef.current;
    const modalOpen = Boolean(st.inspectedWorkstation || st.activeDepartmentId || st.soukModalOpen);

    const fwd = modalOpen
      ? 0
      : (keys.current['KeyW'] || keys.current['KeyZ'] || keys.current['ArrowUp'] ? 1 : 0) -
        (keys.current['KeyS'] || keys.current['ArrowDown'] ? 1 : 0);
    const str = modalOpen
      ? 0
      : (keys.current['KeyD'] || keys.current['ArrowRight'] ? 1 : 0) -
        (keys.current['KeyA'] || keys.current['KeyQ'] || keys.current['ArrowLeft'] ? 1 : 0);

    const sprint = Boolean(keys.current['ShiftLeft'] || keys.current['ShiftRight']);
    const targetSpd = sprint ? 5.4 : 3.4;
    let wishX = 0;
    let wishZ = 0;
    if (fwd !== 0 || str !== 0) {
      const fx = -Math.sin(camYaw.current);
      const fz = -Math.cos(camYaw.current);
      const rx = Math.cos(camYaw.current);
      const rz = -Math.sin(camYaw.current);
      const mx = fx * fwd + rx * str;
      const mz = fz * fwd + rz * str;
      const len = Math.hypot(mx, mz) || 1;
      wishX = (mx / len) * targetSpd;
      wishZ = (mz / len) * targetSpd;
    }

    const velAlpha = 1 - Math.exp(-18 * dt);
    walkVelRef.current.x = THREE.MathUtils.lerp(walkVelRef.current.x, wishX, velAlpha);
    walkVelRef.current.z = THREE.MathUtils.lerp(walkVelRef.current.z, wishZ, velAlpha);
    if (wishX === 0 && wishZ === 0 && Math.hypot(walkVelRef.current.x, walkVelRef.current.z) < 0.08) {
      walkVelRef.current.x = 0;
      walkVelRef.current.z = 0;
    }

    const prevX = pos.x;
    const prevZ = pos.z;
    const [colX, colZ] = sweepMove(prevX, prevZ, prevX + walkVelRef.current.x * dt, prevZ + walkVelRef.current.z * dt, (x, z) => {
      const [ix, iz] = resolveInteriorCollisions(x, z, 0.44);
      return resolveMeshWallCollisions(interiorGridRef.current, ix, iz, 0, 0.44);
    });
    pos.x = colX;
    pos.z = colZ;

    const realSpd = Math.hypot(colX - prevX, colZ - prevZ) / Math.max(dt, 1e-4);
    footSpeedRef.current = realSpd;
    if (Math.hypot(walkVelRef.current.x, walkVelRef.current.z) > 0.2 && realSpd > 0.2) {
      rotYRef.current = dampAngle(rotYRef.current, Math.atan2(-walkVelRef.current.x, -walkVelRef.current.z), 16, dt);
    }
    if (fwd > 0 && str === 0 && realSpd > 0.4 && performance.now() - lastMouseDragTime.current > 1500) {
      targetYaw.current = dampAngle(targetYaw.current, rotYRef.current, 2.2, dt);
    }

    if (avatarRef.current) {
      avatarRef.current.position.copy(pos);
      avatarRef.current.rotation.y = rotYRef.current;
    }

    camYaw.current = dampAngle(camYaw.current, targetYaw.current, 14, dt);
    camPitch.current = THREE.MathUtils.lerp(camPitch.current, targetPitch.current, 1 - Math.exp(-14 * dt));

    if (debugOverrideCam.current) {
      camera.position.copy(debugOverrideCam.current.pos);
      camera.lookAt(debugOverrideCam.current.lookAt);
    } else {
      smoothedPivot.current.lerp(new THREE.Vector3(pos.x, pos.y + 1.4, pos.z), 1 - Math.exp(-22 * dt));
      const cosP = Math.cos(camPitch.current);
      const armDir = new THREE.Vector3(
        Math.sin(camYaw.current) * cosP,
        Math.sin(camPitch.current),
        Math.cos(camYaw.current) * cosP,
      ).normalize();

      let safeDist = camDist.current;
      if (occludersRef.current.length > 0) {
        const rightX = Math.cos(camYaw.current);
        const rightZ = -Math.sin(camYaw.current);
        const ray = raycasterRef.current;
        for (const offset of [0, -0.32, 0.32]) {
          ray.set(
            new THREE.Vector3(
              smoothedPivot.current.x + rightX * offset,
              smoothedPivot.current.y,
              smoothedPivot.current.z + rightZ * offset,
            ),
            armDir,
          );
          ray.near = 0.12;
          ray.far = camDist.current + 0.42;
          const hits = ray.intersectObjects(occludersRef.current, false);
          if (hits.length > 0 && hits[0].distance < camDist.current + 0.38) {
            safeDist = Math.min(safeDist, Math.max(0.82, hits[0].distance - 0.38));
          }
        }
      }
      const pullLambda = safeDist < effectiveDist.current ? 34 : 7;
      effectiveDist.current = THREE.MathUtils.lerp(effectiveDist.current, safeDist, 1 - Math.exp(-pullLambda * dt));

      const rawPos = smoothedPivot.current.clone().addScaledVector(armDir, effectiveDist.current);
      rawPos.x = THREE.MathUtils.clamp(rawPos.x, -9.45, 9.45);
      rawPos.y = THREE.MathUtils.clamp(rawPos.y, 1.1, 3.85);
      rawPos.z = THREE.MathUtils.clamp(rawPos.z, -6.95, 6.95);
      camera.position.copy(rawPos);
      camera.lookAt(
        pos.x - Math.sin(camYaw.current) * 0.85,
        pos.y + 1.32,
        pos.z - Math.cos(camYaw.current) * 0.85,
      );
    }

    let hint: { label: string; action: () => void } | null = null;
    // Proximity [E] Access to ANY Agent's Computer Screen inside the Studio!
    let nearestSeatDist = 2.35;
    INTERIOR_SEAT_LAYOUT.forEach((s, idx) => {
      const stStream = combinedStreams[idx];
      if (!stStream) return;
      const d = Math.hypot(pos.x - s.pos[0], pos.z - s.pos[2]);
      if (d < nearestSeatDist) {
        nearestSeatDist = d;
        const shortName = stStream.agentName.split('//')[0].trim();
        hint = {
          label: `[E] 🖥️ Accéder à l’Écran : ${shortName} (${stStream.role})`,
          action: () => {
            st.inspectWorkstation({ stream: stStream, deptId: dept.id });
            solarpunkAudio.playChime(true);
          },
        };
      }
    });

    if (pos.z > 5.7 && Math.abs(pos.x) < 2.2) {
      hint = {
        label: '[E] Sortir sur l’Avenue Madinat Aspace',
        action: () => st.enterDepartmentBuilding(null),
      };
    } else if (Math.hypot(pos.x, pos.z + 4.75) < 2.6 || (pos.z < -5.2 && pos.x > 1.4 && pos.x < 6.0)) {
      hint = {
        label: `[E] Ouvrir Command Deck · ${dept.name} (/${dept.appSlug})`,
        action: () => {
          st.openDepartment(dept.id);
          solarpunkAudio.playChime(true);
        },
      };
    } else if (dept.id === 'rd' && (pos.x < -7.2 || (pos.z < -4.9 && pos.x < -3.8))) {
      const idx = pos.z < -4.9 ? 0 : pos.z < 0 ? 1 : 2;
      const pg = PORTAL_GAMES[idx];
      hint = {
        label: `[E] Entrer dans le Tableau-Portail 3D « ${pg.title} »`,
        action: () => {
          st.enterPortal(pg.id);
          solarpunkAudio.playChime(true);
        },
      };
    } else if (pos.x > 5.4 && pos.z > 2.2) {
      hint = {
        label: '[E] Servir Espresso & Thé Bagdad aux Holons',
        action: () => {
          solarpunkAudio.playGoldenGong();
          st.pushToast('☕ Thé à la menthe & Espresso servis ! Moral & vélocité +12 %.');
        },
      };
    }

    if ((st.interactionHint?.label ?? null) !== (hint?.label ?? null)) {
      st.setInteractionHint(hint);
    }
  });

  return (
    <group ref={avatarRef} position={[0, 0, 4.25]}>
      <ArticulatedCharacter
        tunicColor="#faf5eb"
        accentColor="#d8a13b"
        skinColor="#8d5524"
        mode="idle"
        speedRef={footSpeedRef}
        withCape
        withSolarVisor
      />
    </group>
  );
};

export const DedicatedPavilionInterior: React.FC<{ deptId: string }> = ({ deptId }) => {
  return (
    <Canvas
      shadows
      dpr={[1, 1.75]}
      gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 1.0 }}
      camera={{ position: [0, 2.8, 6.45], fov: 56, near: 0.2, far: 250 }}
    >
      <color attach="background" args={['#f4e5ca']} />
      <ambientLight intensity={0.78} color="#fff9ed" />
      <hemisphereLight args={['#fffbeb', '#c79c6e', 0.62]} />
      <directionalLight
        position={[6, 11, 9]}
        intensity={1.55}
        color="#fff6dd"
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-camera-left={-14}
        shadow-camera-right={14}
        shadow-camera-top={14}
        shadow-camera-bottom={-14}
      />
      <pointLight position={[0, 3.4, -0.5]} intensity={3.2} decay={0.6} distance={18} color="#fde68a" />
      <pointLight position={[-5.2, 3.3, -1.0]} intensity={2.6} decay={0.6} distance={15} color="#fffbeb" />
      <pointLight position={[5.6, 3.3, -0.5]} intensity={2.6} decay={0.6} distance={15} color="#fffbeb" />
      <Suspense fallback={null}>
        <InteriorStudioRoom deptId={deptId} />
        <InteriorPlayerController deptId={deptId} />
      </Suspense>
      <PostEffects />
    </Canvas>
  );
};
