import React, { useEffect, useMemo, useRef } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { DepartmentStream, PORTAL_GAMES, SOLAR_DEPARTMENTS } from '../data/madinatOntology';
import { useWorldStore, VehicleInstance } from '../store/useWorldStore';
import { solarpunkAudio } from '../audio/solarpunkAudio';
import { applySolarpunkMaterials } from './ShadersAndMaterials';
import { ArticulatedCharacter } from './ArticulatedCharacter';
import { PillBillboardTag } from './InteriorKitAndWorkstation';
import { ContactShadowDisc } from './ContactShadowDisc';
import {
  buildWorldTriangleGrid,
  queryMeshFloorHeight,
  raycastWorldTriangleGrid,
  resolveExteriorCollisions,
  resolveMeshWallCollisions,
  sweepMove,
  WorldTriangleGrid,
} from './CollisionEngine';

const CEO_STREAM: DepartmentStream = {
  id: 'ceo-a0',
  agentName: 'CEO A0 Amadeus // Souverain',
  role: '7D Orchestrateur',
  task: 'Supervision des 578 Holons & Bouclier A1-Beth sur Bagdad x Apple Park',
  statusLabel: '[P] SMARTPHONE',
};

function dampAngle(current: number, target: number, lambda: number, dt: number): number {
  const diff = Math.atan2(Math.sin(target - current), Math.cos(target - current));
  return current + diff * (1 - Math.exp(-lambda * dt));
}

function stepToward(val: number, target: number, maxDelta: number): number {
  if (Math.abs(target - val) <= maxDelta) return target;
  return val + Math.sign(target - val) * maxDelta;
}

const tmpBox = new THREE.Box3();
function collectCameraOccluders(scene: THREE.Scene): THREE.Object3D[] {
  scene.updateMatrixWorld(true);
  const out: THREE.Object3D[] = [];
  const walk = (node: THREE.Object3D, inCollider: boolean) => {
    if (node.userData?.ignoreCameraRay || node.userData?.isCharacter) return;
    const active = inCollider || Boolean(node.userData?.cameraCollider);
    const m = node as THREE.Mesh;
    if (active && m.isMesh && !(m as unknown as { isInstancedMesh?: boolean }).isInstancedMesh) {
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const primary = mats[0] as THREE.Material & { opacity?: number };
      const isTransparent = Boolean(primary?.transparent && (primary.opacity ?? 1) < 0.65);
      const isText = node.type === 'Mesh' && node.name === '';
      if (m.geometry) {
        tmpBox.setFromObject(m);
        // Ignore high transparent dome skylights (y > 9.5m), but KEEP eye-level ArchGlass curtain walls!
                const flatGround = tmpBox.max.y - tmpBox.min.y < 0.35 && tmpBox.max.y < 0.65;
        if (!(isTransparent && tmpBox.min.y > 9.5) && (!flatGround || !isText)) {
          out.push(m);
        }
      }
    }
    for (const ch of node.children) walk(ch, active);
  };
  walk(scene, false);
  return out;
}

// Individual Pilotable Sculpted Vehicle Wrapper with Rotating Wheels & Chassis Corner Roll
const PilotableVehicleModel: React.FC<{
  v: VehicleInstance;
  isDriven: boolean;
  speedRef: React.MutableRefObject<number>;
  steerRef: React.MutableRefObject<number>;
}> = ({ v, isDriven, speedRef, steerRef }) => {
  const { scene: vehScene } = useGLTF('/models/vehicles_and_flora.glb');

  const { carBody, wheels, boatBody, evtolBody } = useMemo(() => {
    const body = vehScene.getObjectByName('Supercar');
    const customPaint = new THREE.MeshPhysicalMaterial({
      color: v.color,
      roughness: 0.14,
      metalness: 0.84,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
    });
    const cb = body ? applySolarpunkMaterials(body.clone(true), { CarPaint: customPaint }) : new THREE.Group();

    const wNames = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'] as const;
    const ws = wNames.map((n, idx) => {
      const wn = vehScene.getObjectByName(n);
      if (!wn) return null;
      const wc = applySolarpunkMaterials(wn.clone(true));
      if (idx >= 2) wc.scale.set(1, 0.92, 0.92);
      return wc;
    });

    const boat = vehScene.getObjectByName('Boat');
    const bb = boat ? applySolarpunkMaterials(boat.clone(true)) : new THREE.Group();

    const ev = vehScene.getObjectByName('Evtol');
    const eb = ev ? applySolarpunkMaterials(ev.clone(true)) : new THREE.Group();

    return { carBody: cb, wheels: ws, boatBody: bb, evtolBody: eb };
  }, [vehScene, v.color]);

  const chassisRef = useRef<THREE.Group>(null);
  const wheelRefs = useRef<(THREE.Object3D | null)[]>([]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    if (v.kind === 'car' && isDriven) {
      const spd = speedRef.current;
      const steer = steerRef.current;
      wheels.forEach((wObj, idx) => {
        if (!wObj) return;
        wObj.rotation.x += (spd * dt) / 0.36;
        if (idx < 2) {
          wObj.rotation.y = THREE.MathUtils.lerp(wObj.rotation.y, steer * 0.45, 0.25);
        }
      });
      if (chassisRef.current) {
        chassisRef.current.rotation.z = THREE.MathUtils.lerp(
          chassisRef.current.rotation.z,
          steer * Math.min(1, Math.abs(spd) / 18) * 0.055,
          0.18,
        );
      }
    } else if (chassisRef.current && Math.abs(chassisRef.current.rotation.z) > 0.001) {
      chassisRef.current.rotation.z = THREE.MathUtils.lerp(chassisRef.current.rotation.z, 0, 0.15);
    }
  });

  return (
    <group position={v.position} rotation={[0, v.rotationY, 0]}>
      <ContactShadowDisc
        position={[0, 0.03, 0]}
        radius={v.kind === 'evtol' ? 2.4 : 1.75}
        scaleZ={v.kind === 'evtol' ? 1.0 : 1.6}
        opacity={0.78}
      />
      {/* Rotate exported Blender -Y-forward vehicle by PI so front faces -Z (Three.js forward!) */}
      {v.kind === 'car' && (
        <group rotation={[0, Math.PI, 0]}>
          <group ref={chassisRef}>
            <primitive object={carBody} />
            {wheels.map(
              (wObj, idx) =>
                wObj && (
                  <primitive
                    key={idx}
                    ref={(el: THREE.Object3D | null) => {
                      wheelRefs.current[idx] = el;
                    }}
                    object={wObj}
                  />
                ),
            )}
          </group>
        </group>
      )}
      {v.kind === 'boat' && (
        <group rotation={[0, Math.PI, 0]}>
          <primitive object={boatBody} />
        </group>
      )}
      {v.kind === 'evtol' && (
        <group rotation={[0, Math.PI, 0]}>
          <primitive object={evtolBody} />
        </group>
      )}
      {!isDriven && (
        <PillBillboardTag position={[0, 2.35, 0]} title={`[E] ${v.name}`} accentColor={v.color} width={2.75} maxDist={8.5} />
      )}
    </group>
  );
};

export const PlayerAndVehiclesController: React.FC = () => {
  const { camera, gl, scene } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  const camYaw = useRef(0);
  const targetYaw = useRef(0);
  const camPitch = useRef(0.24);
  const targetPitch = useRef(0.24);
  const camDist = useRef(3.4);
  const effectiveDist = useRef(3.4);
  const dragging = useRef(false);
  const lastPointer = useRef<{ x: number; y: number } | null>(null);
  const lastMouseDragTime = useRef(0);
  const smoothedPivot = useRef(new THREE.Vector3(0, 1.8, 184));
  const raycasterRef = useRef(new THREE.Raycaster());
  const occludersRef = useRef<THREE.Object3D[]>([]);
  const worldGridRef = useRef<WorldTriangleGrid | null>(null);
  const gridSigRef = useRef('');

  const velY = useRef(0);
  const tramAngle = useRef(0);
  const debugOverrideCam = useRef<{ pos: THREE.Vector3; lookAt: THREE.Vector3 } | null>(null);

  const posRef = useRef(new THREE.Vector3(0, 0.35, 184));
  const rotYRef = useRef(0);
  const avatarGroupRef = useRef<THREE.Group>(null);
  const walkVelRef = useRef({ x: 0, z: 0 });
  const footSpeedRef = useRef(0);
  const driveSpeedRef = useRef(0);
  const currentSteerRef = useRef(0);

  const vehicles = useWorldStore((s) => s.vehicles);
  const activeVehicleId = useWorldStore((s) => s.activeVehicleId);
  const locomotion = useWorldStore((s) => s.locomotion);
  const firstPerson = useWorldStore((s) => s.firstPerson);
  const aerialCam = useWorldStore((s) => s.aerialCam);
  const teleportTarget = useWorldStore((s) => s.teleportTarget);
  const deployedBlueprints = useWorldStore((s) => s.deployedBlueprints);
  const spawnedStructures = useWorldStore((s) => s.spawnedStructures);

  const ensureSpatialIndex = () => {
    const sig = `${scene.children.length}:${deployedBlueprints.length}:${spawnedStructures.length}`;
    if (!worldGridRef.current || worldGridRef.current.triCount < 1000 || gridSigRef.current !== sig) {
      worldGridRef.current = buildWorldTriangleGrid(scene, 4);
      occludersRef.current = collectCameraOccluders(scene);
      gridSigRef.current = sig;
    }
  };

  useEffect(() => {
    if (teleportTarget) {
      posRef.current.set(teleportTarget[0], teleportTarget[1], teleportTarget[2]);
      smoothedPivot.current.set(teleportTarget[0], teleportTarget[1] + 1.46, teleportTarget[2]);
      walkVelRef.current = { x: 0, z: 0 };
      velY.current = 0;
      useWorldStore.getState().clearTeleport();
    }
  }, [teleportTarget]);

  useEffect(() => {
    const st = useWorldStore.getState();
    driveSpeedRef.current = 0;
    currentSteerRef.current = 0;
    walkVelRef.current = { x: 0, z: 0 };
    footSpeedRef.current = 0;
    if (st.teleportTarget) {
      posRef.current.set(st.teleportTarget[0], st.teleportTarget[1], st.teleportTarget[2]);
      smoothedPivot.current.set(st.teleportTarget[0], st.teleportTarget[1] + 1.46, st.teleportTarget[2]);
      st.clearTeleport();
    } else if (activeVehicleId) {
      const v = st.vehicles.find((x) => x.id === activeVehicleId);
      if (v) {
        posRef.current.set(v.position[0], v.position[1], v.position[2]);
        rotYRef.current = v.rotationY;
        targetYaw.current = v.rotationY;
        smoothedPivot.current.set(v.position[0], v.position[1] + 1.28, v.position[2]);
      }
    }
  }, [activeVehicleId, locomotion]);

  const computeGroundHeight = (x: number, z: number, currentY: number): number => {
    const r = Math.hypot(x, z);
    if (r > 41.8 && r < 76.2 && Math.abs(x) >= 5.2 && Math.abs(z) >= 5.2) {
      return -0.35;
    }
    const meshY = queryMeshFloorHeight(worldGridRef.current, x, z, currentY, 0.72);
    if (meshY !== null) {
      if (r <= 36.5 && currentY < 1.0 && meshY < 0.485) return 0.485;
      return meshY;
    }
    if (r <= 36.5) return currentY > 6.2 ? 8.65 : 0.485;
    if (Math.abs(x) < 6.4 || Math.abs(z) < 6.4) return 0.28;
    return 0.08;
  };

  const resolveFullExterior = (
    x: number,
    z: number,
    feetY: number,
    radius: number,
    mode: 'onFoot' | 'car',
    st: ReturnType<typeof useWorldStore.getState>,
  ): [number, number] => {
    let [cx, cz] = resolveExteriorCollisions(
      x,
      z,
      feetY,
      radius,
      mode,
      st.vehicles,
      st.activeVehicleId,
      st.deployedBlueprints,
      st.spawnedStructures,
    );
    [cx, cz] = resolveMeshWallCollisions(worldGridRef.current, cx, cz, feetY, radius);
    [cx, cz] = resolveExteriorCollisions(
      cx,
      cz,
      feetY,
      radius,
      mode,
      st.vehicles,
      st.activeVehicleId,
      st.deployedBlueprints,
      st.spawnedStructures,
    );
    return [cx, cz];
  };

  // Expose deterministic inspection API for automated Playwright visual & physics verification
  useEffect(() => {
    (window as unknown as Record<string, unknown>).__madinatDebug = {
      setCameraView: (camPos: [number, number, number], lookAt: [number, number, number]) => {
        debugOverrideCam.current = {
          pos: new THREE.Vector3(...camPos),
          lookAt: new THREE.Vector3(...lookAt),
        };
      },
      clearCameraView: () => {
        debugOverrideCam.current = null;
      },
      setCamOrbit: (yaw: number, pitch: number, dist: number) => {
        debugOverrideCam.current = null;
        useWorldStore.setState({ aerialCam: false, firstPerson: false });
        camYaw.current = targetYaw.current = yaw;
        camPitch.current = targetPitch.current = pitch;
        camDist.current = dist;
        effectiveDist.current = dist;
        lastMouseDragTime.current = performance.now();
      },
      getCameraPos: () => [camera.position.x, camera.position.y, camera.position.z],
      getCamYaw: () => camYaw.current,
      teleport: (pos: [number, number, number]) => {
        walkVelRef.current = { x: 0, z: 0 };
        velY.current = 0;
        posRef.current.set(pos[0], pos[1], pos[2]);
        smoothedPivot.current.set(pos[0], pos[1] + 1.46, pos[2]);
        useWorldStore.getState().teleportTo(pos);
        useWorldStore.setState({ toastMessage: null });
      },
      setMode: (mode: 'world3d' | 'garden' | 'desktop' | 'glbInspector') => {
        useWorldStore.getState().setInterfaceMode(mode);
      },
      openDept: (id: string | null) => {
        useWorldStore.getState().openDepartment(id);
      },
      rebuildGrid: () => {
        worldGridRef.current = buildWorldTriangleGrid(scene, 4);
        occludersRef.current = collectCameraOccluders(scene);
        return worldGridRef.current.triCount;
      },
      tryWalkTo: (tx: number, tz: number, maxSteps = 90) => {
        ensureSpatialIndex();
        const s = useWorldStore.getState();
        let x = posRef.current.x;
        let z = posRef.current.z;
        let y = posRef.current.y;
        for (let i = 0; i < maxSteps; i++) {
          const dx = tx - x;
          const dz = tz - z;
          const d = Math.hypot(dx, dz);
          if (d < 0.05) break;
          const stepLen = Math.min(0.28, d);
          [x, z] = resolveFullExterior(x + (dx / d) * stepLen, z + (dz / d) * stepLen, y, 0.48, 'onFoot', s);
          const gY = computeGroundHeight(x, z, y);
          if (gY > -0.2) y = gY;
        }
        posRef.current.set(x, y, z);
        smoothedPivot.current.set(x, y + 1.46, z);
        return [x, z, y];
      },
      getPos: () => [posRef.current.x, posRef.current.y, posRef.current.z],
      enterVehicle: (id: string) => useWorldStore.getState().enterVehicle(id),
      exitVehicle: () => useWorldStore.getState().exitVehicle(),
      getVehicles: () => useWorldStore.getState().vehicles,
      getLocomotion: () => useWorldStore.getState().locomotion,
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__madinatDebug;
    };
  }, [camera, scene]);

  useEffect(() => {
    const clearKeys = () => {
      keys.current = {};
      dragging.current = false;
      lastPointer.current = null;
    };

    const resetCamera = () => {
      debugOverrideCam.current = null;
      useWorldStore.setState({ aerialCam: false, firstPerson: false });
      camYaw.current = targetYaw.current = rotYRef.current;
      camPitch.current = targetPitch.current = 0.24;
      camDist.current = 3.4;
      effectiveDist.current = 3.4;
      lastMouseDragTime.current = 0;
    };

    const onKeyDown = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;

      const k = e.code;
      keys.current[k] = true;

      const st = useWorldStore.getState();
      if (k === 'KeyE') {
        if (st.locomotion !== 'onFoot' && st.locomotion !== 'parachute') {
          st.exitVehicle();
          solarpunkAudio.playChime(false);
        } else if (st.interactionHint) {
          st.interactionHint.action();
        }
      } else if (k === 'KeyF' && st.locomotion === 'evtol') {
        st.triggerParachute();
        solarpunkAudio.playChime(true);
      } else if (k === 'KeyH' && st.locomotion === 'car') {
        solarpunkAudio.playHorn();
      } else if (k === 'KeyN') {
        st.jumpToNextAgentNeedingYou();
        solarpunkAudio.playChime(true);
      } else if (k === 'KeyP') {
        st.setPhoneOpen(!st.phoneOpen);
      } else if (k === 'KeyB') {
        st.setBuilderOpen(!st.builderOpen);
      } else if (k === 'KeyG') {
        debugOverrideCam.current = null;
        st.toggleAerialCamera();
      } else if (k === 'KeyC' && st.locomotion === 'onFoot') {
        debugOverrideCam.current = null;
        st.toggleCameraPerspective();
      } else if (k === 'KeyR') {
        resetCamera();
      } else if (k === 'Escape') {
        debugOverrideCam.current = null;
        if (st.inspectedWorkstation) st.inspectWorkstation(null);
        else if (st.activePortalId) st.enterPortal(null);
        else if (st.activeDepartmentId) st.openDepartment(null);
        else if (st.soukModalOpen) st.setSoukModalOpen(false);
        else if (st.phoneOpen) st.setPhoneOpen(false);
        else if (st.builderOpen) st.setBuilderOpen(false);
      }
    };

    const onKeyUp = (e: KeyboardEvent) => {
      keys.current[e.code] = false;
    };

    const dom = gl.domElement;
    const onMouseDown = (e: MouseEvent) => {
      dragging.current = true;
      lastPointer.current = { x: e.clientX, y: e.clientY };
    };
    const onMouseUp = () => {
      dragging.current = false;
      lastPointer.current = null;
    };
    const onMouseMove = (e: MouseEvent) => {
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
      targetPitch.current = THREE.MathUtils.clamp(targetPitch.current + dy * 0.002, 0.06, 1.18);
      lastMouseDragTime.current = performance.now();
    };
    const onWheel = (e: WheelEvent) => {
      camDist.current = THREE.MathUtils.clamp(camDist.current + e.deltaY * 0.01, 1.3, 140);
    };
    const onVis = () => {
      if (document.hidden) clearKeys();
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);
    document.addEventListener('visibilitychange', onVis);
    dom.addEventListener('mousedown', onMouseDown);
    dom.addEventListener('dblclick', resetCamera);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('wheel', onWheel, { passive: true });
    window.addEventListener('madinat:reset-camera', resetCamera);
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
      document.removeEventListener('visibilitychange', onVis);
      dom.removeEventListener('mousedown', onMouseDown);
      dom.removeEventListener('dblclick', resetCamera);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      dom.removeEventListener('wheel', onWheel);
      window.removeEventListener('madinat:reset-camera', resetCamera);
    };
  }, [gl]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    ensureSpatialIndex();
    const st = useWorldStore.getState();
    // Consume any pending teleport / vehicle enter / vehicle exit position SYNCHRONOUSLY before physics runs!
    if (st.teleportTarget) {
      posRef.current.set(st.teleportTarget[0], st.teleportTarget[1], st.teleportTarget[2]);
      smoothedPivot.current.set(st.teleportTarget[0], st.teleportTarget[1] + 1.46, st.teleportTarget[2]);
      walkVelRef.current = { x: 0, z: 0 };
      velY.current = 0;
      st.clearTeleport();
    }
    const k = keys.current;
    const modalOpen = Boolean(st.inspectedWorkstation || st.activeDepartmentId || st.soukModalOpen);

    const fwd = modalOpen ? 0 : (k['KeyW'] || k['KeyZ'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const str = modalOpen ? 0 : (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['KeyQ'] || k['ArrowLeft'] ? 1 : 0);
    const sprint = Boolean(k['ShiftLeft'] || k['ShiftRight']);

    const pos = posRef.current;

    if (st.locomotion === 'tram') {
      tramAngle.current -= dt * 0.18;
      pos.set(Math.cos(tramAngle.current) * 143, 2.2, Math.sin(tramAngle.current) * 143);
      rotYRef.current = -tramAngle.current;
      footSpeedRef.current = 0;
    } else if (st.locomotion === 'car' || st.locomotion === 'boat') {
      footSpeedRef.current = 0;
      const handbrake = Boolean(k['Space']) && st.locomotion === 'car';
      const maxFwd = st.locomotion === 'car' ? (sprint ? 38 : 24) : 19;
      const maxRev = st.locomotion === 'car' ? -11 : -8;
      let spd = driveSpeedRef.current;

      if (handbrake) {
        spd = stepToward(spd, 0, 52 * dt);
      } else if (fwd > 0) {
        spd = spd < -0.4 ? stepToward(spd, 0, 44 * dt) : stepToward(spd, maxFwd, (sprint ? 28 : 18) * dt);
      } else if (fwd < 0) {
        spd = spd > 0.4 ? stepToward(spd, 0, 44 * dt) : stepToward(spd, maxRev, 15 * dt);
      } else {
        spd *= Math.exp(-2.4 * dt);
        if (Math.abs(spd) < 0.12) spd = 0;
      }

      currentSteerRef.current = THREE.MathUtils.lerp(currentSteerRef.current, -str, 1 - Math.exp(-12 * dt));
      if (Math.abs(spd) > 0.25) {
        const sf = Math.min(1, Math.abs(spd) / 4.2) * (1 - 0.3 * Math.min(1, Math.abs(spd) / 38));
        rotYRef.current += currentSteerRef.current * sf * (handbrake ? 3.1 : 2.35) * Math.sign(spd) * dt;
      }

      const prevX = pos.x;
      const prevZ = pos.z;
      const wantX = prevX - Math.sin(rotYRef.current) * spd * dt;
      const wantZ = prevZ - Math.cos(rotYRef.current) * spd * dt;

      if (st.locomotion === 'car') {
        const [cx, cz] = sweepMove(prevX, prevZ, wantX, wantZ, (nx, nz) =>
          resolveFullExterior(nx, nz, pos.y, 1.35, 'car', st),
        );
        if (Math.hypot(cx - wantX, cz - wantZ) > 0.025) {
          const fwdX = -Math.sin(rotYRef.current);
          const fwdZ = -Math.cos(rotYRef.current);
          const actualSpd = ((cx - prevX) * fwdX + (cz - prevZ) * fwdZ) / Math.max(dt, 1e-4);
          spd = actualSpd * 0.72;
        }
        pos.x = cx;
        pos.z = cz;
        pos.y = Math.max(0.12, computeGroundHeight(pos.x, pos.z, pos.y) - 0.04);
      } else {
        const r = Math.hypot(wantX, wantZ);
        if (r < 44 || r > 74) {
          const clamped = THREE.MathUtils.clamp(r, 44.2, 73.8);
          const ang = Math.atan2(wantZ, wantX);
          pos.x = Math.cos(ang) * clamped;
          pos.z = Math.sin(ang) * clamped;
        } else {
          pos.x = wantX;
          pos.z = wantZ;
        }
        pos.y = -0.25;
      }

      driveSpeedRef.current = spd;
      if (performance.now() - lastMouseDragTime.current > 1400 && Math.abs(spd) > 0.8) {
        targetYaw.current = dampAngle(targetYaw.current, rotYRef.current, 4.2, dt);
      }
      if (st.activeVehicleId) {
        st.updateVehicleTransform(st.activeVehicleId, [pos.x, pos.y, pos.z], rotYRef.current);
      }
    } else if (st.locomotion === 'evtol') {
      footSpeedRef.current = 0;
      const flySpeed = sprint ? 50 : 32;
      rotYRef.current -= str * dt * 1.8;
      pos.x -= Math.sin(rotYRef.current) * fwd * flySpeed * dt;
      pos.z -= Math.cos(rotYRef.current) * fwd * flySpeed * dt;
      if (k['Space']) pos.y += 18 * dt;
      if (k['KeyC'] || k['ControlLeft']) pos.y = Math.max(0.2, pos.y - 18 * dt);
      pos.y = Math.min(180, Math.max(0.2, pos.y));
      if (performance.now() - lastMouseDragTime.current > 1200) {
        targetYaw.current = dampAngle(targetYaw.current, rotYRef.current, 3.2, dt);
      }
      if (st.activeVehicleId) {
        st.updateVehicleTransform(st.activeVehicleId, [pos.x, pos.y, pos.z], rotYRef.current);
      }
    } else if (st.locomotion === 'parachute') {
      footSpeedRef.current = 0;
      rotYRef.current -= str * dt * 1.5;
      const glide = 18 + fwd * 8;
      pos.x -= Math.sin(rotYRef.current) * glide * dt;
      pos.z -= Math.cos(rotYRef.current) * glide * dt;
      pos.y -= 6.2 * dt;
      const gY = computeGroundHeight(pos.x, pos.z, pos.y);
      if (pos.y <= gY + 0.3) {
        pos.y = gY;
        st.landOnGround();
      }
    } else {
      // Grounded onFoot movement: matched 1:1 with leg stride + universal sub-stepped collisions
      const targetSpd = sprint ? 9.8 : 5.4;
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
      const targetX = prevX + walkVelRef.current.x * dt;
      const targetZ = prevZ + walkVelRef.current.z * dt;
      const [cx, cz] = sweepMove(prevX, prevZ, targetX, targetZ, (nx, nz) =>
        resolveFullExterior(nx, nz, pos.y, 0.48, 'onFoot', st),
      );
      pos.x = cx;
      pos.z = cz;

      const realSpd = Math.hypot(cx - prevX, cz - prevZ) / Math.max(dt, 1e-4);
      footSpeedRef.current = realSpd;
      if (Math.hypot(walkVelRef.current.x, walkVelRef.current.z) > 0.25 && realSpd > 0.25) {
        rotYRef.current = dampAngle(rotYRef.current, Math.atan2(-walkVelRef.current.x, -walkVelRef.current.z), 16, dt);
      }
      if (fwd > 0 && str === 0 && realSpd > 0.5 && performance.now() - lastMouseDragTime.current > 1500) {
        targetYaw.current = dampAngle(targetYaw.current, rotYRef.current, 2.2, dt);
      }

      const groundY = computeGroundHeight(pos.x, pos.z, pos.y);
      if (k['Space'] && !modalOpen && Math.abs(pos.y - groundY) < 0.24) {
        velY.current = 7.4;
      }
      if (groundY > pos.y && groundY - pos.y <= 0.72 && velY.current <= 0) {
        pos.y = THREE.MathUtils.lerp(pos.y, groundY, 1 - Math.exp(-26 * dt));
        velY.current = 0;
      } else {
        velY.current -= 19.6 * dt;
        pos.y += velY.current * dt;
        if (pos.y <= groundY) {
          pos.y = groundY;
          velY.current = 0;
        }
      }
    }

    pos.x = THREE.MathUtils.clamp(pos.x, -360, 360);
    pos.z = THREE.MathUtils.clamp(pos.z, -360, 360);

    st.setPlayerTransform([pos.x, pos.y, pos.z], rotYRef.current);
    if (avatarGroupRef.current) {
      avatarGroupRef.current.position.copy(pos);
      avatarGroupRef.current.rotation.y = rotYRef.current;
    }

    // Damped Yaw / Pitch Angles
    camYaw.current = dampAngle(camYaw.current, targetYaw.current, 14, dt);
    camPitch.current = THREE.MathUtils.lerp(camPitch.current, targetPitch.current, 1 - Math.exp(-14 * dt));

    // Camera Routing: Debug Override > Aerial City Drone > First-Person > Spherical Spring-Arm with Wall Pull-In
    if (debugOverrideCam.current) {
      camera.position.copy(debugOverrideCam.current.pos);
      camera.lookAt(debugOverrideCam.current.lookAt);
    } else if (st.aerialCam) {
      const cx = Math.sin(camYaw.current) * 235;
      const cz = Math.cos(camYaw.current) * 235;
      camera.position.lerp(new THREE.Vector3(cx, 145, cz), 0.08);
      camera.lookAt(0, 8, 0);
    } else if (st.firstPerson && st.locomotion === 'onFoot') {
      camera.position.set(pos.x, pos.y + 1.68, pos.z);
      const lookTarget = new THREE.Vector3(
        pos.x - Math.sin(camYaw.current) * 10,
        pos.y + 1.62 - Math.sin(camPitch.current - 0.24) * 6,
        pos.z - Math.cos(camYaw.current) * 10,
      );
      camera.lookAt(lookTarget);
    } else {
      const targetPivot = new THREE.Vector3(
        pos.x,
        pos.y + (st.locomotion === 'car' ? 1.28 : 1.46),
        pos.z,
      );
      smoothedPivot.current.lerp(targetPivot, 1 - Math.exp(-22 * dt));
      const desiredDist =
        st.locomotion === 'evtol'
          ? Math.max(11.0, camDist.current * 2.2)
          : st.locomotion === 'car'
            ? Math.max(7.6, camDist.current * 1.55)
            : camDist.current;

      const cosP = Math.cos(camPitch.current);
      const armDir = new THREE.Vector3(
        Math.sin(camYaw.current) * cosP,
        Math.sin(camPitch.current),
        Math.cos(camYaw.current) * cosP,
      ).normalize();

      let safeDist = desiredDist;
      const occluders = occludersRef.current;
      if (st.locomotion !== 'evtol' && st.locomotion !== 'parachute') {
        const rightX = Math.cos(camYaw.current);
        const rightZ = -Math.sin(camYaw.current);
        const ray = raycasterRef.current;
        for (const offset of [0, -0.36, 0.36]) {
          const rx = smoothedPivot.current.x + rightX * offset;
          const ry = smoothedPivot.current.y;
          const rz = smoothedPivot.current.z + rightZ * offset;
          // 1. Double-sided spatial-grid architectural mesh raycast (handles all walls, piers & stairs)
          const gHit = raycastWorldTriangleGrid(
            worldGridRef.current,
            rx,
            ry,
            rz,
            armDir.x,
            armDir.y,
            armDir.z,
            desiredDist + 0.45,
          );
          if (gHit !== null && gHit < desiredDist + 0.42) {
            safeDist = Math.min(safeDist, Math.max(0.78, gHit - 0.42));
          }
          // 2. Scene mesh raycast (catches ArchGlass curtain walls, Mission Control panel & dynamic props)
          if (occluders.length > 0) {
            ray.set(new THREE.Vector3(rx, ry, rz), armDir);
            ray.near = 0.12;
            ray.far = desiredDist + 0.45;
            const hits = ray.intersectObjects(occluders, false);
            if (hits.length > 0 && hits[0].distance < desiredDist + 0.42) {
              safeDist = Math.min(safeDist, Math.max(0.78, hits[0].distance - 0.42));
            }
          }
        }
      }

      const testCamX = smoothedPivot.current.x + armDir.x * safeDist;
      const testCamZ = smoothedPivot.current.z + armDir.z * safeDist;
      const floorMinY = computeGroundHeight(testCamX, testCamZ, pos.y) + 0.42;
      if (smoothedPivot.current.y + armDir.y * safeDist < floorMinY && armDir.y < 0) {
        const maxArm = (floorMinY - smoothedPivot.current.y) / (armDir.y - 1e-4);
        if (maxArm > 0.85) safeDist = Math.min(safeDist, maxArm);
      }

      const pullLambda = safeDist < effectiveDist.current ? 34 : 7;
      effectiveDist.current = THREE.MathUtils.lerp(effectiveDist.current, safeDist, 1 - Math.exp(-pullLambda * dt));

      camera.position.copy(smoothedPivot.current).addScaledVector(armDir, effectiveDist.current);
      camera.lookAt(smoothedPivot.current);
    }

    // Proximity Interaction Hint ([E])
    let bestHint: { label: string; action: () => void } | null = null;
    let bestDist = 10.5;

    if (st.locomotion === 'onFoot') {
      for (const v of st.vehicles) {
        const d = Math.hypot(pos.x - v.position[0], pos.z - v.position[2]);
        if (d < 7.0 && d < bestDist) {
          bestDist = d;
          bestHint = {
            label: `[E] Monter à bord : ${v.name}`,
            action: () => {
              st.enterVehicle(v.id);
              solarpunkAudio.playChime(true);
            },
          };
        }
      }
    }

    if (!st.rogueDroneNeutralized) {
      const rx = Math.cos(st.rogueDroneAngle) * 134;
      const rz = Math.sin(st.rogueDroneAngle) * 134;
      if (Math.hypot(pos.x - rx, pos.z - rz) < 14) {
        bestHint = {
          label: '[E] ⚡ VERROUILLER LE DRONE IA FANTÔME (CONCORDIA TTL 300s)',
          action: () => {
            st.neutralizeRogueDrone();
            solarpunkAudio.playGoldenGong();
          },
        };
      }
    }

    // CEO A0 Amadeus Workstation Screen Access inside Bayt al-Hikma Ground Floor
    if (Math.hypot(pos.x, pos.z + 13.6) < 3.4 && pos.y < 4) {
      bestHint = {
        label: '[E] 🖥️ Accéder à l’Écran Souverain : CEO A0 Amadeus',
        action: () => {
          st.inspectWorkstation({ stream: CEO_STREAM, deptId: null, isCeo: true });
          solarpunkAudio.playChime(true);
        },
      };
    }

    if (Math.hypot(pos.x, pos.z - 10.5) < 5.5 && pos.y > 6) {
      bestHint = {
        label: '[E] Apposer la Signature Souveraine human:amdkn (Escrow > 10 000 €)',
        action: () => {
          st.signEscrow();
          solarpunkAudio.playGoldenGong();
        },
      };
    }

    if (Math.hypot(pos.x - 14, pos.z - 6) < 5.0 && pos.y < 4) {
      bestHint = {
        label: '[E] Frapper le Gong d’Or de Merge (Bayt al-Hikma)',
        action: () => {
          st.ringMergeGong();
          solarpunkAudio.playGoldenGong();
        },
      };
    }

    if (Math.hypot(pos.x + 14, pos.z - 6) < 6.0 && pos.y < 4) {
      const cand = st.recruits.find((r) => !r.hired);
      if (cand) {
        bestHint = {
          label: `[E] Recruter ${cand.name} (${cand.harness} · ${cand.specialty})`,
          action: () => {
            st.hireRecruit(cand.id);
            solarpunkAudio.playChime(true);
          },
        };
      }
    }

    if (Math.hypot(pos.x - 138, pos.z - 138) < 15) {
      bestHint = {
        label: '[E] Ouvrir le Grand Souk des Blueprints Aspace Marketplace',
        action: () => {
          st.setSoukModalOpen(true);
          solarpunkAudio.playChime(true);
        },
      };
    }

    for (const dept of SOLAR_DEPARTMENTS) {
      const rad = (dept.angleDeg * Math.PI) / 180;
      const px = Math.cos(rad) * 98;
      const pz = -Math.sin(rad) * 98;
      const d = Math.hypot(pos.x - px, pos.z - pz);
      if (d < 9.5) {
        bestHint = {
          label: `[E] Entrer Studio ${dept.name} (/${dept.appSlug.toUpperCase()})`,
          action: () => {
            st.enterDepartmentBuilding(dept.id);
            solarpunkAudio.playChime(true);
          },
        };
      }
      if (d < 16) {
        for (let sIdx = 0; sIdx < dept.streams.length; sIdx++) {
          const dx = (sIdx - (dept.streams.length - 1) / 2) * 3.8;
          const wx = (98 + 5.0) * Math.cos(rad) + dx * Math.sin(rad);
          const wz = -(98 + 5.0) * Math.sin(rad) + dx * Math.cos(rad);
          if (Math.hypot(pos.x - wx, pos.z - wz) < 2.6) {
            const stStream = dept.streams[sIdx];
            const shortName = stStream.agentName.split('//')[0].trim();
            bestHint = {
              label: `[E] 🖥️ Accéder à l’Écran : ${shortName} (${dept.name})`,
              action: () => {
                st.inspectWorkstation({ stream: stStream, deptId: dept.id });
                solarpunkAudio.playChime(true);
              },
            };
          }
        }
      }
      if (dept.id === 'rd' && d < 18) {
        PORTAL_GAMES.forEach((pg, idx) => {
          const wx = -89;
          const wz = -(idx - 1) * 7.5;
          if (Math.hypot(pos.x - wx, pos.z - wz) < 4.5) {
            bestHint = {
              label: `[E] Sauter dans le Tableau-Portail « ${pg.title} »`,
              action: () => {
                st.enterPortal(pg.id);
                solarpunkAudio.playChime(true);
              },
            };
          }
        });
      }
    }

    const prevLabel = st.interactionHint?.label ?? null;
    const nextLabel = bestHint?.label ?? null;
    if (prevLabel !== nextLabel) {
      st.setInteractionHint(bestHint);
    }
  });

  return (
    <group>
      {/* Articulated Solarpunk Player Character */}
      <group
        ref={avatarGroupRef}
        visible={!firstPerson && !aerialCam && (locomotion === 'onFoot' || locomotion === 'parachute')}
      >
        <ArticulatedCharacter
          tunicColor="#faf5eb"
          accentColor="#d8a13b"
          skinColor="#8d5524"
          mode="idle"
          speedRef={footSpeedRef}
          withCape
          withSolarVisor
        />
        {locomotion === 'parachute' && (
          <group position={[0, 3.6, 0]}>
            <mesh>
              <sphereGeometry args={[2.8, 24, 14, 0, Math.PI * 2, 0, Math.PI * 0.45]} />
              <meshStandardMaterial color="#f59e0b" side={THREE.DoubleSide} />
            </mesh>
          </group>
        )}
      </group>

      {vehicles.map((v) => (
        <PilotableVehicleModel
          key={v.id}
          v={v}
          isDriven={activeVehicleId === v.id}
          speedRef={driveSpeedRef}
          steerRef={currentSteerRef}
        />
      ))}
    </group>
  );
};
