import * as THREE from 'three';
import { DepartmentStream } from '../data/madinatOntology';
import { raycastWorldTriangleGrid, WorldTriangleGrid } from './CollisionEngine';

// Single Source of Truth for Madinat Aspace Solarpunk Geometry & Layout
export const WORLD_LAYOUT = {
  DOME: {
    outerR: 36.5,
    archPierR: 33.6,
    poolR: 5.65,
    rotAlpha: Math.PI / 16,
    groundY: 0.485,
    s0Y: 8.65,
    s0HoloR: 3.35,
    s0Escrow: { x: 0, y: 8.65, z: 10.5, r: 1.3, interactR: 5.5 },
    gong: { x: 14, z: 6, interactR: 5.0 },
    recruitLounge: { x: -14, z: 6, interactR: 6.0 },
  },
  CEO_STATION: {
    groupZ: -13.2,
    deskOffsetZ: -0.4,
    deskZ: -13.6,
    halfW: 1.05,
    halfD: 0.5,
    interactR: 3.4,
  },
  LAGOON: {
    innerWallR: 41.2,
    waterInnerR: 41.6,
    boatMinR: 43.8,
    boatMaxR: 74.2,
    waterOuterR: 76.4,
    outerWallR: 76.8,
    bridgeCorridorHalfW: 5.5,
    bridgeWalkHalfW: 4.35,
    bridgePierRadii: [46.5, 59.0, 71.5] as const,
    bridgePierColliderR: 2.35,
  },
  RING2: {
    innerGlassMinR: 84.4,
    innerGlassMaxR: 86.9,
    centerR: 98.0,
    outerGlassMinR: 109.8,
    outerGlassMaxR: 112.4,
    roofY: 10.74,
  },
  BOULEVARD: {
    innerLaneR: 128.0,
    medianR: 133.5,
    outerLaneR: 139.0,
    tramR: 143.2,
  },
  RING4: {
    innerMinR: 148.2,
    innerMaxR: 152.2,
    outerMinR: 170.2,
    outerMaxR: 174.2,
    endWallR: 161.2,
    roofY: 5.95,
  },
  GATES: {
    southZ: 158,
    northZ: -158,
  },
  GRAND_SOUK: {
    x: 138,
    z: 138,
    rotY: -Math.PI * 0.75,
    halfW: 12.8,
    halfD: 7.3,
    interactR: 15,
  },
  VILLA_R: 196,
  CITY_MAX_R: 218,
  STUDIO_ROOM: {
    halfW: 9.35,
    minZ: -6.85,
    maxZ: 6.9,
    exitDoorHalfW: 1.75,
  },
} as const;

export const CEO_STREAM: DepartmentStream = {
  id: 'ceo-a0',
  agentName: 'CEO A0 Amadeus // Souverain',
  role: '7D Orchestrateur',
  task: 'Supervision des 578 Holons & Bouclier A1-Beth sur Bagdad x Apple Park',
  statusLabel: '[P] SMARTPHONE',
};

// High-frequency per-frame mutable telemetry read directly by canvas animation loops & radar SVG
// without triggering 60fps Zustand / React HUD re-renders!
export const LIVE_WORLD_TELEMETRY = {
  playerPos: [0, 0.35, 184] as [number, number, number],
  playerRotY: 0,
  rogueDroneAngle: Math.PI,
  tramAngle: 0,
  vehicles: new Map<string, { pos: [number, number, number]; rotY: number }>(),
  hudRenderCount: 0,
};

export function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-lambda * dt));
}

export function dampScalar(current: number, target: number, lambda: number, dt: number): number {
  return current + (target - current) * (1 - Math.exp(-lambda * dt));
}

export function stepToward(val: number, target: number, maxDelta: number): number {
  if (Math.abs(target - val) <= maxDelta) return target;
  return val + Math.sign(target - val) * maxDelta;
}

export function isTextInputFocused(target: EventTarget | null): boolean {
  const el = target as HTMLElement | null;
  if (!el) return false;
  const tag = el.tagName;
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || Boolean(el.isContentEditable);
}

const _springRayOrigin = new THREE.Vector3();

// Zero-allocation 3-whisker spring-arm raycast shared by Exterior & Interior controllers
export function solveSpringArmPullIn(
  pivot: THREE.Vector3,
  camYaw: number,
  armDir: THREE.Vector3,
  desiredDist: number,
  whiskerOffsets: readonly number[],
  grid: WorldTriangleGrid | null,
  occluders: THREE.Object3D[],
  raycaster: THREE.Raycaster,
  minDist = 0.78,
  wallMargin = 0.42,
): number {
  let safeDist = desiredDist;
  const rightX = Math.cos(camYaw);
  const rightZ = -Math.sin(camYaw);

  for (let i = 0; i < whiskerOffsets.length; i++) {
    const offset = whiskerOffsets[i];
    const rx = pivot.x + rightX * offset;
    const ry = pivot.y;
    const rz = pivot.z + rightZ * offset;

    if (grid) {
      const gHit = raycastWorldTriangleGrid(grid, rx, ry, rz, armDir.x, armDir.y, armDir.z, desiredDist + wallMargin);
      if (gHit !== null && gHit < desiredDist + wallMargin) {
        safeDist = Math.min(safeDist, Math.max(minDist, gHit - wallMargin));
      }
    }

    if (occluders.length > 0) {
      _springRayOrigin.set(rx, ry, rz);
      raycaster.set(_springRayOrigin, armDir);
      raycaster.near = 0.12;
      raycaster.far = desiredDist + wallMargin;
      const hits = raycaster.intersectObjects(occluders, false);
      if (hits.length > 0 && hits[0].distance < desiredDist + wallMargin) {
        safeDist = Math.min(safeDist, Math.max(minDist, hits[0].distance - wallMargin));
      }
    }
  }

  return safeDist;
}
