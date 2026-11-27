import * as THREE from 'three';
import { MARKETPLACE_BLUEPRINTS, SOLAR_DEPARTMENTS } from '../data/madinatOntology';
import type { VehicleInstance } from '../store/useWorldStore';
import { WORLD_LAYOUT } from './worldLayout';

// Single source of truth for studio interior furniture & plant coordinates (shared between meshes & collision!)
export const INTERIOR_SEAT_LAYOUT: { pos: [number, number, number]; rotY: number; skin: string }[] = [
  { pos: [-3.9, 0, -2.0], rotY: 0.45, skin: '#f1c27d' },
  { pos: [-3.9, 0, 1.35], rotY: 0.55, skin: '#c68642' },
  { pos: [-1.45, 0, -3.55], rotY: 0.14, skin: '#8d5524' },
  { pos: [1.55, 0, -3.55], rotY: -0.14, skin: '#f1c27d' },
  { pos: [3.95, 0, -2.0], rotY: -0.45, skin: '#c68642' },
  { pos: [3.95, 0, 1.35], rotY: -0.55, skin: '#e0ac69' },
];

export const INTERIOR_PLANT_SPOTS: [number, number, number][] = [
  [-8.6, 0, -6.3],
  [8.6, 0, -6.3],
  [-2.4, 0, -6.5],
  [1.8, 0, -6.5],
  [-6.1, 0, -0.3],
  [-7.3, 0, 3.9],
  [5.8, 0, 2.4],
  [-2.1, 0, 6.2],
];

const DOME_ROT_ALPHA = WORLD_LAYOUT.DOME.rotAlpha;

function collideCircleCircle(
  px: number,
  pz: number,
  radius: number,
  cx: number,
  cz: number,
  obsRadius: number,
): [number, number] {
  const dx = px - cx;
  const dz = pz - cz;
  const minDist = radius + obsRadius;
  const d2 = dx * dx + dz * dz;
  if (d2 >= minDist * minDist) return [px, pz];
  const d = Math.sqrt(d2);
  if (d < 1e-5) return [cx, cz + minDist];
  const k = minDist / d;
  return [cx + dx * k, cz + dz * k];
}

// Matches Three.js right-handed rotation.y = rotY:
// worldX = cx + lx * cos(rotY) + lz * sin(rotY)
// worldZ = cz - lx * sin(rotY) + lz * cos(rotY)
function collideCircleOBB(
  px: number,
  pz: number,
  radius: number,
  cx: number,
  cz: number,
  halfW: number,
  halfD: number,
  rotY = 0,
): [number, number] {
  const cos = Math.cos(rotY);
  const sin = Math.sin(rotY);
  const relX = px - cx;
  const relZ = pz - cz;
  let lx = relX * cos - relZ * sin;
  let lz = relX * sin + relZ * cos;

  const clampedX = Math.max(-halfW, Math.min(halfW, lx));
  const clampedZ = Math.max(-halfD, Math.min(halfD, lz));
  const dx = lx - clampedX;
  const dz = lz - clampedZ;
  const d2 = dx * dx + dz * dz;

  if (d2 >= radius * radius) return [px, pz];

  if (d2 > 1e-7) {
    const d = Math.sqrt(d2);
    lx = clampedX + (dx / d) * radius;
    lz = clampedZ + (dz / d) * radius;
  } else {
    const pushX = halfW - Math.abs(lx);
    const pushZ = halfD - Math.abs(lz);
    if (pushX < pushZ) {
      lx = (lx >= 0 ? 1 : -1) * (halfW + radius);
    } else {
      lz = (lz >= 0 ? 1 : -1) * (halfD + radius);
    }
  }

  return [cx + lx * cos + lz * sin, cz - lx * sin + lz * cos];
}

function signedAngularDiffDeg(a: number, b: number): number {
  let d = ((a - b + 180) % 360 + 360) % 360 - 180;
  if (d < -180) d += 360;
  return d;
}

function angularDistDeg(a: number, b: number): number {
  return Math.abs(signedAngularDiffDeg(a, b));
}

function collideAnnularBand(
  px: number,
  pz: number,
  radius: number,
  rInner: number,
  rOuter: number,
  isPassableDeg: (deg: number) => boolean,
): [number, number] {
  const r = Math.hypot(px, pz);
  if (r < rInner - radius || r > rOuter + radius || r < 1e-4) return [px, pz];
  let deg = (Math.atan2(-pz, px) * 180) / Math.PI;
  if (deg < 0) deg += 360;
  if (isPassableDeg(deg)) return [px, pz];
  const rMid = (rInner + rOuter) * 0.5;
  const targetR = r < rMid ? rInner - radius : rOuter + radius;
  const scale = targetR / r;
  return [px * scale, pz * scale];
}

export function resolveInteriorCollisions(px: number, pz: number, radius = 0.44): [number, number] {
  let x = px;
  let z = pz;

  for (let pass = 0; pass < 3; pass++) {
    // 1. All 6 CubeFarmWorkstations (exact tabletop OBB + swivel chair/agent circle, keeping walkways clear!)
    for (const s of INTERIOR_SEAT_LAYOUT) {
      const sin = Math.sin(s.rotY);
      const cos = Math.cos(s.rotY);
      [x, z] = collideCircleOBB(x, z, radius, s.pos[0], s.pos[2], 1.02, 0.48, s.rotY);
      [x, z] = collideCircleCircle(x, z, radius, s.pos[0] + sin * 0.76, s.pos[2] + cos * 0.76, 0.35);
    }

    // 2. Central Command Lectern
    [x, z] = collideCircleCircle(x, z, radius, 0, -4.75, 0.72);

    // 3. East Collaborative Lounge (Sofa, Coffee Table, 2 Poufs) + Cedar Bookshelf + Kitchenette
    [x, z] = collideCircleOBB(x, z, radius, 8.28, -1.1, 0.55, 1.58, 0);
    [x, z] = collideCircleCircle(x, z, radius, 7.04, -1.1, 0.68);
    [x, z] = collideCircleCircle(x, z, radius, 6.9, -2.14, 0.44);
    [x, z] = collideCircleCircle(x, z, radius, 6.9, -0.06, 0.44);
    [x, z] = collideCircleOBB(x, z, radius, 8.6, -5.6, 0.95, 0.42, -0.5);
    [x, z] = collideCircleOBB(x, z, radius, 7.3, 4.3, 0.55, 2.35, 0);

    // 4. All 8 Potted Floor Plants
    for (const p of INTERIOR_PLANT_SPOTS) {
      [x, z] = collideCircleCircle(x, z, radius, p[0], p[2], 0.42);
    }

    // 5. Perimeter Studio Walls & South Exit Door Jambs
    x = Math.max(-WORLD_LAYOUT.STUDIO_ROOM.halfW, Math.min(WORLD_LAYOUT.STUDIO_ROOM.halfW, x));
    z = Math.max(WORLD_LAYOUT.STUDIO_ROOM.minZ, Math.min(WORLD_LAYOUT.STUDIO_ROOM.maxZ, z));
    if (z > 6.55 && Math.abs(x) > WORLD_LAYOUT.STUDIO_ROOM.exitDoorHalfW) {
      z = 6.55;
    }
  }

  return [x, z];
}

export const LIVE_TRAFFIC_CARS: { x: number; z: number; rotY: number }[] = [];

const OUTER_RING_SECTORS = [45, 135, 225, 315];
const OUTER_RING_END_ANGLES_DEG = [10.5, 79.5, 100.5, 169.5, 190.5, 259.5, 280.5, 349.5];

export function resolveExteriorCollisions(
  px: number,
  pz: number,
  py: number,
  radius: number,
  mode: 'onFoot' | 'car',
  vehicles: VehicleInstance[],
  activeVehicleId: string | null,
  deployedBlueprints: string[],
  spawnedStructures: { position: [number, number, number] }[],
): [number, number] {
  let x = px;
  let z = pz;
  void mode;

  for (let pass = 0; pass < 3; pass++) {
    // 1. Parked Vehicles & Live Autonomous Traffic (excluding active driven vehicle)
    for (const v of vehicles) {
      if (v.id === activeVehicleId || v.kind === 'boat') continue;
      if (v.kind === 'car') {
        [x, z] = collideCircleOBB(x, z, radius, v.position[0], v.position[2], 1.18, 2.45, v.rotationY);
      } else if (v.kind === 'evtol') {
        [x, z] = collideCircleCircle(x, z, radius, v.position[0], v.position[2], 2.55);
      }
    }
    if (py < 2.2) {
      for (const tc of LIVE_TRAFFIC_CARS) {
        [x, z] = collideCircleOBB(x, z, radius, tc.x, tc.z, 1.08, 2.25, tc.rotY);
      }
    }

    // 2. Emerald Lagoon & 4 Vaulted Cardinal Bridge Parapets (r = 41.2 .. 76.8)
    const rLag = Math.hypot(x, z);
    if (rLag >= WORLD_LAYOUT.LAGOON.innerWallR - radius && rLag <= WORLD_LAYOUT.LAGOON.outerWallR + radius) {
      const onNSBridgeCorridor = Math.abs(x) < WORLD_LAYOUT.LAGOON.bridgeCorridorHalfW && Math.abs(z) > 38;
      const onEWBridgeCorridor = Math.abs(z) < WORLD_LAYOUT.LAGOON.bridgeCorridorHalfW && Math.abs(x) > 38;
      if (onNSBridgeCorridor) {
        x = Math.max(-WORLD_LAYOUT.LAGOON.bridgeWalkHalfW, Math.min(WORLD_LAYOUT.LAGOON.bridgeWalkHalfW, x));
      } else if (onEWBridgeCorridor) {
        z = Math.max(-WORLD_LAYOUT.LAGOON.bridgeWalkHalfW, Math.min(WORLD_LAYOUT.LAGOON.bridgeWalkHalfW, z));
      } else if (rLag > 1e-4) {
        const targetR = rLag < 59 ? WORLD_LAYOUT.LAGOON.innerWallR - radius : WORLD_LAYOUT.LAGOON.outerWallR + radius;
        const sc = targetR / rLag;
        x *= sc;
        z *= sc;
      }
    }

    // 3. Bayt al-Hikma Central Dome Props, Pool, Rotated Columns & 16 Outer Arch Piers
    const rDome = Math.hypot(x, z);
    if (rDome <= 38.5) {
      if (py >= 5.2) {
        [x, z] = collideCircleCircle(x, z, radius, 0, 0, WORLD_LAYOUT.DOME.s0HoloR);
        [x, z] = collideCircleCircle(x, z, radius, WORLD_LAYOUT.DOME.s0Escrow.x, WORLD_LAYOUT.DOME.s0Escrow.z, WORLD_LAYOUT.DOME.s0Escrow.r);
      } else {
        [x, z] = collideCircleCircle(x, z, radius, 0, 0, WORLD_LAYOUT.DOME.poolR); // Reflecting pool
        [x, z] = collideCircleOBB(x, z, radius, 0, WORLD_LAYOUT.CEO_STATION.deskZ, WORLD_LAYOUT.CEO_STATION.halfW, WORLD_LAYOUT.CEO_STATION.halfD, 0); // CEO Desk
        [x, z] = collideCircleCircle(x, z, radius, 0, -14.36, 0.36); // CEO Chair
        [x, z] = collideCircleOBB(x, z, radius, 0, -16.8, 7.35, 0.35, 0); // Mission Control Wall
        [x, z] = collideCircleOBB(x, z, radius, 14, 6, 1.75, 0.5, 0); // Merge Gong
        [x, z] = collideCircleOBB(x, z, radius, -14, 6, 4.6, 0.9, 0); // Recruitment Lounge

        // 12 Inner Columns rotated by DOME_ROT_ALPHA (Three.js rotation.y = +alpha maps angle phi_0 to phi_0 - alpha)
        for (let i = 0; i < 12; i++) {
          const phi = (i / 12) * Math.PI * 2 - DOME_ROT_ALPHA;
          [x, z] = collideCircleCircle(x, z, radius, Math.cos(phi) * 18.2, Math.sin(phi) * 18.2, 0.62);
        }

        // 16 Outer Arch Piers rotated by DOME_ROT_ALPHA so cardinal bridges open through arches!
        for (let i = 0; i < 16; i++) {
          const phi = (i / 16) * Math.PI * 2 - DOME_ROT_ALPHA;
          [x, z] = collideCircleOBB(
            x,
            z,
            radius,
            Math.cos(phi) * 33.6,
            Math.sin(phi) * 33.6,
            3.55,
            2.42,
            -phi,
          );
        }
      }
    }

    // 4. Ring 2 Apple Park x Baghdad Glass Curtain Walls, 16 Radial Partition Walls & Pavilion Furnishings
    const isRing2Portal = (deg: number) =>
      SOLAR_DEPARTMENTS.some((d) => angularDistDeg(deg, d.angleDeg) < 5.8);
    [x, z] = collideAnnularBand(x, z, radius, WORLD_LAYOUT.RING2.innerGlassMinR, WORLD_LAYOUT.RING2.innerGlassMaxR, isRing2Portal);
    [x, z] = collideAnnularBand(x, z, radius, WORLD_LAYOUT.RING2.outerGlassMinR, WORLD_LAYOUT.RING2.outerGlassMaxR, isRing2Portal);

    // Radial Partition Walls between adjacent 45° Ring 2 sectors (mid-angles at k*45 + 22.5°)
    if (rLag > 82 && rLag < 115) {
      for (const d of SOLAR_DEPARTMENTS) {
        const midRad = ((d.angleDeg + 22.5) * Math.PI) / 180;
        const c = Math.cos(midRad);
        const s = Math.sin(midRad);
        [x, z] = collideCircleOBB(x, z, radius, c * 89.5, -s * 89.5, 5.0, 1.9, midRad);
        [x, z] = collideCircleOBB(x, z, radius, c * 107.0, -s * 107.0, 5.2, 2.1, midRad);
      }
    }

    for (const dept of SOLAR_DEPARTMENTS) {
      const rad = (dept.angleDeg * Math.PI) / 180;
      const cx = Math.cos(rad) * 98;
      const cz = -Math.sin(rad) * 98;
      if (Math.hypot(x - cx, z - cz) < 18) {
        const pavWorld = (lx: number, lz: number): [number, number] => [
          (98 - lz) * Math.cos(rad) + lx * Math.sin(rad),
          -(98 - lz) * Math.sin(rad) + lx * Math.cos(rad),
        ];
        const pavRot = rad - Math.PI / 2;

        // Central Lectern
        [x, z] = collideCircleCircle(x, z, radius, cx, cz, 1.05);
        // Individual Physical Desks & Chairs (open 1.7m aisles for accessing screens!)
        for (let sIdx = 0; sIdx < dept.streams.length; sIdx++) {
          const dx = (sIdx - (dept.streams.length - 1) / 2) * 3.8;
          const [wx, wz] = pavWorld(dx, -5.0);
          [x, z] = collideCircleOBB(x, z, radius, wx, wz, 1.02, 0.48, pavRot);
          const [cxChair, czChair] = pavWorld(dx, -4.24);
          [x, z] = collideCircleCircle(x, z, radius, cxChair, czChair, 0.35);
        }
        // Lounge (9.8, 2.2)
        const [lx, lz] = pavWorld(9.8, 2.2);
        [x, z] = collideCircleOBB(x, z, radius, lx, lz, 2.3, 2.0, pavRot - 0.45);
        // Kitchenette (-10.2, 2.4)
        const [kx, kz] = pavWorld(-10.2, 2.4);
        [x, z] = collideCircleOBB(x, z, radius, kx, kz, 2.1, 0.85, pavRot + 0.45);
        // 6 Exterior Studio Potted Plants
        for (const [plx, plz] of [
          [-6.6, -5.6],
          [6.6, -5.6],
          [-9.2, -1.6],
          [9.2, -1.6],
          [-4.8, 3.6],
          [4.8, 3.6],
        ]) {
          const [pxW, pzW] = pavWorld(plx, plz);
          [x, z] = collideCircleCircle(x, z, radius, pxW, pzW, 0.48);
        }
        // Mario-64 Portal Paintings Wall in Forge R&D
        if (dept.id === 'rd') {
          [x, z] = collideCircleOBB(x, z, radius, -89, 0, 0.65, 9.8, 0);
        }
      }
    }

    // 5. Royal South & North Gates + Forecourt Colonnades + Flanking Twin Olive Planters
    for (const gateZ of [WORLD_LAYOUT.GATES.southZ, WORLD_LAYOUT.GATES.northZ]) {
      if (Math.abs(z - gateZ) < 35 && Math.abs(x) < 25) {
        [x, z] = collideCircleOBB(x, z, radius, -8.8, gateZ, 2.45, 2.45, 0);
        [x, z] = collideCircleOBB(x, z, radius, 8.8, gateZ, 2.45, 2.45, 0);
        const dir = gateZ > 0 ? 1 : -1;
        [x, z] = collideCircleCircle(x, z, radius, -9.5, gateZ + dir * 14, 2.7);
        [x, z] = collideCircleCircle(x, z, radius, 9.5, gateZ + dir * 14, 2.7);
        for (const [cxCol, dzCol] of [
          [14.43, 6],
          [16.5, 14],
          [14.43, 22],
          [8.74, 28],
        ]) {
          [x, z] = collideCircleCircle(x, z, radius, -cxCol, gateZ + dir * dzCol, 0.62);
          [x, z] = collideCircleCircle(x, z, radius, cxCol, gateZ + dir * dzCol, 0.62);
        }
      }
    }

    // 6. Ring 4 Outer Crown Walls (exact GLB openings: cardinal avenues |rel|>35.2° & twin portals 16.4°<|rel|<22.6°) + 8 End-Walls
    const isRing4Portal = (deg: number) =>
      OUTER_RING_SECTORS.every((sDeg) => {
        const rel = angularDistDeg(deg, sDeg);
        return rel > 35.2 || (rel > 16.4 && rel < 22.6);
      });
    [x, z] = collideAnnularBand(x, z, radius, WORLD_LAYOUT.RING4.innerMinR, WORLD_LAYOUT.RING4.innerMaxR, isRing4Portal);
    [x, z] = collideAnnularBand(x, z, radius, WORLD_LAYOUT.RING4.outerMinR, WORLD_LAYOUT.RING4.outerMaxR, isRing4Portal);

    if (rLag > 144 && rLag < 178) {
      for (const eDeg of OUTER_RING_END_ANGLES_DEG) {
        const eRad = (eDeg * Math.PI) / 180;
        [x, z] = collideCircleOBB(
          x,
          z,
          radius,
          Math.cos(eRad) * WORLD_LAYOUT.RING4.endWallR,
          -Math.sin(eRad) * WORLD_LAYOUT.RING4.endWallR,
          12.8,
          1.8,
          eRad,
        );
      }
    }

    // 7. Grand Souk + Deployed Patrician Villas + User-Spawned Structures
    [x, z] = collideCircleOBB(
      x,
      z,
      radius,
      WORLD_LAYOUT.GRAND_SOUK.x,
      WORLD_LAYOUT.GRAND_SOUK.z,
      WORLD_LAYOUT.GRAND_SOUK.halfW,
      WORLD_LAYOUT.GRAND_SOUK.halfD,
      WORLD_LAYOUT.GRAND_SOUK.rotY,
    );
    for (const bp of MARKETPLACE_BLUEPRINTS) {
      if (!deployedBlueprints.includes(bp.id)) continue;
      const rad = (bp.plotAngleDeg * Math.PI) / 180;
      const vx = Math.cos(rad) * WORLD_LAYOUT.VILLA_R;
      const vz = -Math.sin(rad) * WORLD_LAYOUT.VILLA_R;
      if (Math.hypot(x - vx, z - vz) < 15) {
        [x, z] = collideCircleOBB(x, z, radius, vx, vz, 9.2, 8.6, rad - Math.PI / 2);
      }
    }
    for (const st of spawnedStructures) {
      [x, z] = collideCircleCircle(x, z, radius, st.position[0], st.position[2], 3.8);
    }

    // 8. Avenue & Lagoon Palm Trunks
    if (Math.abs(x) > 6 && Math.abs(x) < 13 && Math.abs(z) > 122 && Math.abs(z) < 208) {
      for (let d = 126; d <= 204; d += 14) {
        const sZ = z >= 0 ? d : -d;
        [x, z] = collideCircleCircle(x, z, radius, -9.5, sZ, 0.52);
        [x, z] = collideCircleCircle(x, z, radius, 9.5, sZ, 0.52);
      }
    }
    if (rLag > 76.5 && rLag < 81.5) {
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const deg = ((a * 180) / Math.PI) % 90;
        if (deg < 6 || deg > 84) continue;
        [x, z] = collideCircleCircle(x, z, radius, Math.cos(a) * 79, Math.sin(a) * 79, 0.52);
      }
    }

    // 9. Outer City Rampart Boundary
    const rMax = Math.hypot(x, z);
    if (rMax > WORLD_LAYOUT.CITY_MAX_R) {
      const s = WORLD_LAYOUT.CITY_MAX_R / rMax;
      x *= s;
      z *= s;
    }
  }

  return [x, z];
}

// Keep boats inside the Emerald Lagoon and collide cleanly with the 12 cardinal bridge stone piers
export function resolveBoatLagoonCollisions(px: number, pz: number, radius = 1.4): [number, number] {
  let x = px;
  let z = pz;
  for (let pass = 0; pass < 2; pass++) {
    const r = Math.hypot(x, z);
    if (r < WORLD_LAYOUT.LAGOON.boatMinR || r > WORLD_LAYOUT.LAGOON.boatMaxR) {
      const clamped = THREE.MathUtils.clamp(r, WORLD_LAYOUT.LAGOON.boatMinR + 0.1, WORLD_LAYOUT.LAGOON.boatMaxR - 0.1);
      const ang = Math.atan2(z, x);
      x = Math.cos(ang) * clamped;
      z = Math.sin(ang) * clamped;
    }
    for (const pr of WORLD_LAYOUT.LAGOON.bridgePierRadii) {
      [x, z] = collideCircleCircle(x, z, radius, pr, 0, WORLD_LAYOUT.LAGOON.bridgePierColliderR);
      [x, z] = collideCircleCircle(x, z, radius, -pr, 0, WORLD_LAYOUT.LAGOON.bridgePierColliderR);
      [x, z] = collideCircleCircle(x, z, radius, 0, pr, WORLD_LAYOUT.LAGOON.bridgePierColliderR);
      [x, z] = collideCircleCircle(x, z, radius, 0, -pr, WORLD_LAYOUT.LAGOON.bridgePierColliderR);
    }
  }
  return [x, z];
}

export function sweepMove(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  resolveFn: (x: number, z: number) => [number, number],
  maxStep = 0.32,
): [number, number] {
  const dx = targetX - startX;
  const dz = targetZ - startZ;
  const dist = Math.hypot(dx, dz);
  if (dist < 1e-4) return resolveFn(startX, startZ);
  const steps = Math.max(1, Math.min(24, Math.ceil(dist / maxStep)));
  let x = startX;
  let z = startZ;
  for (let i = 1; i <= steps; i++) {
    const ux = startX + (dx * i) / steps;
    const uz = startZ + (dz * i) / steps;
    [x, z] = resolveFn(ux, uz);
  }
  return [x, z];
}

export function simulateWalkPath(
  startX: number,
  startZ: number,
  targetX: number,
  targetZ: number,
  resolveFn: (x: number, z: number) => [number, number],
  steps = 70,
): [number, number] {
  let x = startX;
  let z = startZ;
  for (let i = 0; i < steps; i++) {
    const dx = targetX - x;
    const dz = targetZ - z;
    const d = Math.hypot(dx, dz);
    if (d < 0.05) break;
    const stepLen = Math.min(0.32, d);
    [x, z] = resolveFn(x + (dx / d) * stepLen, z + (dz / d) * stepLen);
  }
  return [x, z];
}

// =============================================================================
// UNIVERSAL CLIENT-REPLICABLE .GLB TRIANGLE SPATIAL GRID
// Extracts walkable staircases, ramps, decks, bridges + solid walls directly
// from rendered world geometry in O(1) cell lookups — zero hardcoded guesses!
// =============================================================================
export interface WorldTriangleGrid {
  cellSize: number;
  cells: Map<string, number[]>;
  ax: Float32Array;
  ay: Float32Array;
  az: Float32Array;
  bx: Float32Array;
  by: Float32Array;
  bz: Float32Array;
  cx: Float32Array;
  cy: Float32Array;
  cz: Float32Array;
  ny: Float32Array;
  minY: Float32Array;
  maxY: Float32Array;
  triCount: number;
}

function collectWalkableMeshes(scene: THREE.Object3D): THREE.Mesh[] {
  const meshes: THREE.Mesh[] = [];
  const walk = (node: THREE.Object3D, inWalkable: boolean) => {
    if (node.userData?.ignoreCameraRay || node.userData?.isCharacter) return;
    const active = inWalkable || Boolean(node.userData?.walkableMesh);
    const m = node as THREE.Mesh;
    if (m.isMesh && !(m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh && active) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const primary = mats[0] as THREE.Material & { opacity?: number };
      const isTransparentGlass = Boolean(primary?.transparent && (primary.opacity ?? 1) < 0.65);
      if (!isTransparentGlass && m.geometry?.attributes?.position) {
        meshes.push(m);
      }
    }
    for (const ch of node.children) walk(ch, active);
  };
  walk(scene, false);
  return meshes;
}

export function buildWorldTriangleGrid(scene: THREE.Object3D, cellSize = 4): WorldTriangleGrid {
  scene.updateMatrixWorld(true);
  const meshes = collectWalkableMeshes(scene);
  let triCount = 0;
  for (const m of meshes) {
    const posAttr = m.geometry.attributes.position;
    triCount += m.geometry.index ? Math.floor(m.geometry.index.count / 3) : Math.floor(posAttr.count / 3);
  }

  const ax = new Float32Array(triCount);
  const ay = new Float32Array(triCount);
  const az = new Float32Array(triCount);
  const bx = new Float32Array(triCount);
  const by = new Float32Array(triCount);
  const bz = new Float32Array(triCount);
  const cx = new Float32Array(triCount);
  const cy = new Float32Array(triCount);
  const cz = new Float32Array(triCount);
  const ny = new Float32Array(triCount);
  const minY = new Float32Array(triCount);
  const maxY = new Float32Array(triCount);
  const cells = new Map<string, number[]>();

  const va = new THREE.Vector3();
  const vb = new THREE.Vector3();
  const vc = new THREE.Vector3();
  const ab = new THREE.Vector3();
  const ac = new THREE.Vector3();
  const norm = new THREE.Vector3();

  let ti = 0;
  for (const m of meshes) {
    const pos = m.geometry.attributes.position;
    const idx = m.geometry.index;
    const mat = m.matrixWorld;
    const count = idx ? idx.count : pos.count;

    for (let k = 0; k + 2 < count; k += 3) {
      const i0 = idx ? idx.getX(k) : k;
      const i1 = idx ? idx.getX(k + 1) : k + 1;
      const i2 = idx ? idx.getX(k + 2) : k + 2;
      va.fromBufferAttribute(pos, i0).applyMatrix4(mat);
      vb.fromBufferAttribute(pos, i1).applyMatrix4(mat);
      vc.fromBufferAttribute(pos, i2).applyMatrix4(mat);

      ab.subVectors(vb, va);
      ac.subVectors(vc, va);
      norm.crossVectors(ab, ac);
      const len = norm.length();
      if (len < 1e-6) continue;

      ax[ti] = va.x;
      ay[ti] = va.y;
      az[ti] = va.z;
      bx[ti] = vb.x;
      by[ti] = vb.y;
      bz[ti] = vb.z;
      cx[ti] = vc.x;
      cy[ti] = vc.y;
      cz[ti] = vc.z;
      ny[ti] = norm.y / len;
      minY[ti] = Math.min(va.y, vb.y, vc.y);
      maxY[ti] = Math.max(va.y, vb.y, vc.y);

      const gx0 = Math.floor(Math.min(va.x, vb.x, vc.x) / cellSize);
      const gx1 = Math.floor(Math.max(va.x, vb.x, vc.x) / cellSize);
      const gz0 = Math.floor(Math.min(va.z, vb.z, vc.z) / cellSize);
      const gz1 = Math.floor(Math.max(va.z, vb.z, vc.z) / cellSize);
      for (let gx = gx0; gx <= gx1; gx++) {
        for (let gz = gz0; gz <= gz1; gz++) {
          const key = `${gx},${gz}`;
          let arr = cells.get(key);
          if (!arr) {
            arr = [];
            cells.set(key, arr);
          }
          arr.push(ti);
        }
      }
      ti++;
    }
  }

  return {
    cellSize,
    cells,
    ax,
    ay,
    az,
    bx,
    by,
    bz,
    cx,
    cy,
    cz,
    ny,
    minY,
    maxY,
    triCount: ti,
  };
}

export function queryMeshFloorHeight(
  grid: WorldTriangleGrid | null,
  x: number,
  z: number,
  currentFeetY: number,
  maxStepUp = 0.68,
): number | null {
  if (!grid) return null;
  const gx = Math.floor(x / grid.cellSize);
  const gz = Math.floor(z / grid.cellSize);
  const list = grid.cells.get(`${gx},${gz}`);
  if (!list) return null;

  let bestY = -1e9;
  const ceilY = currentFeetY + maxStepUp;

  for (let i = 0; i < list.length; i++) {
    const ti = list[i];
    if (Math.abs(grid.ny[ti]) < 0.56) continue;
    if (grid.minY[ti] > ceilY) continue;

    const x0 = grid.ax[ti];
    const z0 = grid.az[ti];
    const x1 = grid.bx[ti];
    const z1 = grid.bz[ti];
    const x2 = grid.cx[ti];
    const z2 = grid.cz[ti];

    const v0x = x1 - x0;
    const v0z = z1 - z0;
    const v1x = x2 - x0;
    const v1z = z2 - z0;
    const denom = v0x * v1z - v1x * v0z;
    if (Math.abs(denom) < 1e-6) continue;

    const px = x - x0;
    const pz = z - z0;
    const u = (px * v1z - v1x * pz) / denom;
    if (u < -0.003 || u > 1.003) continue;
    const v = (v0x * pz - px * v0z) / denom;
    if (v < -0.003 || u + v > 1.003) continue;
    const w = 1 - u - v;

    const hitY = w * grid.ay[ti] + u * grid.by[ti] + v * grid.cy[ti];
    if (hitY <= ceilY && hitY > bestY) {
      bestY = hitY;
    }
  }

  return bestY > -1e8 ? bestY : null;
}

const polyA: [number, number, number][] = [];
const polyB: [number, number, number][] = [];
const testedTris = new Set<number>();

function clipPolyAgainstPlane(
  src: [number, number, number][],
  dst: [number, number, number][],
  yVal: number,
  keepAbove: boolean,
) {
  dst.length = 0;
  const n = src.length;
  if (n === 0) return;
  for (let i = 0; i < n; i++) {
    const p1 = src[i];
    const p2 = src[(i + 1) % n];
    const in1 = keepAbove ? p1[1] >= yVal : p1[1] <= yVal;
    const in2 = keepAbove ? p2[1] >= yVal : p2[1] <= yVal;
    if (in1 && in2) {
      dst.push(p2);
    } else if (in1 && !in2) {
      const t = (yVal - p1[1]) / (p2[1] - p1[1] || 1e-6);
      dst.push([p1[0] + t * (p2[0] - p1[0]), yVal, p1[2] + t * (p2[2] - p1[2])]);
    } else if (!in1 && in2) {
      const t = (yVal - p1[1]) / (p2[1] - p1[1] || 1e-6);
      dst.push([p1[0] + t * (p2[0] - p1[0]), yVal, p1[2] + t * (p2[2] - p1[2])]);
      dst.push(p2);
    }
  }
}

function pushOutOfPolygonXZ(
  px: number,
  pz: number,
  radius: number,
  poly: [number, number, number][],
): [number, number] {
  const n = poly.length;
  if (n < 2) return [px, pz];

  let bestD2 = radius * radius;
  let bestQx = px;
  let bestQz = pz;
  let hit = false;

  for (let i = 0; i < n; i++) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    const vx = b[0] - a[0];
    const vz = b[2] - a[2];
    const len2 = vx * vx + vz * vz;
    let qx = a[0];
    let qz = a[2];
    if (len2 > 1e-8) {
      const t = Math.max(0, Math.min(1, ((px - a[0]) * vx + (pz - a[2]) * vz) / len2));
      qx = a[0] + t * vx;
      qz = a[2] + t * vz;
    }
    const dx = px - qx;
    const dz = pz - qz;
    const d2 = dx * dx + dz * dz;
    if (d2 < bestD2) {
      bestD2 = d2;
      bestQx = qx;
      bestQz = qz;
      hit = true;
    }
  }

  // Check if player center is strictly inside a >=3 vertex horizontal polygon
  let inside = false;
  if (n >= 3) {
    for (let i = 0, j = n - 1; i < n; j = i++) {
      const xi = poly[i][0];
      const zi = poly[i][2];
      const xj = poly[j][0];
      const zj = poly[j][2];
      if ((zi > pz) !== (zj > pz) && px < ((xj - xi) * (pz - zi)) / (zj - zi || 1e-6) + xi) {
        inside = !inside;
      }
    }
  }

  if (!hit && !inside) return [px, pz];

  const dx = px - bestQx;
  const dz = pz - bestQz;
  const d = Math.sqrt(dx * dx + dz * dz);
  if (d < 1e-5) {
    const a = poly[0];
    const b = poly[1];
    const ex = b[0] - a[0];
    const ez = b[2] - a[2];
    const el = Math.hypot(ex, ez) || 1;
    return [bestQx - (ez / el) * radius, bestQz + (ex / el) * radius];
  }
  const sign = inside ? -1 : 1;
  const k = (sign * radius) / d;
  return [bestQx + dx * k, bestQz + dz * k];
}

export function resolveMeshWallCollisions(
  grid: WorldTriangleGrid | null,
  px: number,
  pz: number,
  feetY: number,
  radius: number,
): [number, number] {
  if (!grid) return [px, pz];
  const yLow = feetY + 0.62;
  const yHigh = feetY + 1.68;
  const gx = Math.floor(px / grid.cellSize);
  const gz = Math.floor(pz / grid.cellSize);

  testedTris.clear();
  for (let ox = -1; ox <= 1; ox++) {
    for (let oz = -1; oz <= 1; oz++) {
      const arr = grid.cells.get(`${gx + ox},${gz + oz}`);
      if (!arr) continue;
      for (let i = 0; i < arr.length; i++) testedTris.add(arr[i]);
    }
  }
  if (testedTris.size === 0) return [px, pz];

  let x = px;
  let z = pz;
  for (let pass = 0; pass < 2; pass++) {
    for (const ti of testedTris) {
      if (grid.maxY[ti] <= yLow || grid.minY[ti] >= yHigh) continue;
      if (Math.abs(grid.ny[ti]) > 0.62 && grid.minY[ti] <= feetY + 0.66) continue;

      polyA.length = 3;
      polyA[0] = [grid.ax[ti], grid.ay[ti], grid.az[ti]];
      polyA[1] = [grid.bx[ti], grid.by[ti], grid.bz[ti]];
      polyA[2] = [grid.cx[ti], grid.cy[ti], grid.cz[ti]];

      clipPolyAgainstPlane(polyA, polyB, yLow, true);
      if (polyB.length < 2) continue;
      clipPolyAgainstPlane(polyB, polyA, yHigh, false);
      if (polyA.length < 2) continue;

      [x, z] = pushOutOfPolygonXZ(x, z, radius, polyA);
    }
  }

  return [x, z];
}

const testedRayTris = new Set<number>();

export function raycastWorldTriangleGrid(
  grid: WorldTriangleGrid | null,
  ox: number,
  oy: number,
  oz: number,
  dx: number,
  dy: number,
  dz: number,
  maxDist: number,
): number | null {
  if (!grid || maxDist <= 0.12) return null;
  testedRayTris.clear();
  const cs = grid.cellSize;
  const steps = Math.max(2, Math.ceil(maxDist / (cs * 0.45)));
  for (let s = 0; s <= steps; s++) {
    const t = (s / steps) * maxDist;
    const gx = Math.floor((ox + dx * t) / cs);
    const gz = Math.floor((oz + dz * t) / cs);
    for (let rx = -1; rx <= 1; rx++) {
      for (let rz = -1; rz <= 1; rz++) {
        const arr = grid.cells.get(`${gx + rx},${gz + rz}`);
        if (!arr) continue;
        for (let i = 0; i < arr.length; i++) testedRayTris.add(arr[i]);
      }
    }
  }

  let bestT = maxDist + 1;
  for (const ti of testedRayTris) {
    const ax = grid.ax[ti];
    const ay = grid.ay[ti];
    const az = grid.az[ti];
    const e1x = grid.bx[ti] - ax;
    const e1y = grid.by[ti] - ay;
    const e1z = grid.bz[ti] - az;
    const e2x = grid.cx[ti] - ax;
    const e2y = grid.cy[ti] - ay;
    const e2z = grid.cz[ti] - az;
    // Double-sided Moller-Trumbore ray-triangle test (immune to flipped mesh normals!)
    const hx = dy * e2z - dz * e2y;
    const hy = dz * e2x - dx * e2z;
    const hz = dx * e2y - dy * e2x;
    const det = e1x * hx + e1y * hy + e1z * hz;
    if (Math.abs(det) < 1e-6) continue;
    const invDet = 1 / det;
    const sx = ox - ax;
    const sy = oy - ay;
    const sz = oz - az;
    const u = (sx * hx + sy * hy + sz * hz) * invDet;
    if (u < 0 || u > 1) continue;
    const qx = sy * e1z - sz * e1y;
    const qy = sz * e1x - sx * e1z;
    const qz = sx * e1y - sy * e1x;
    const v = (dx * qx + dy * qy + dz * qz) * invDet;
    if (v < 0 || u + v > 1) continue;
    const t = (e2x * qx + e2y * qy + e2z * qz) * invDet;
    if (t >= 0.12 && t < bestT) bestT = t;
  }
  return bestT <= maxDist ? bestT : null;
}
