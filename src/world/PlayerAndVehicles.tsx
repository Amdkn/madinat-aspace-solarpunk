import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import { PillBillboardTag } from './InteriorKitAndWorkstation';
import * as THREE from 'three';
import { PORTAL_GAMES, SOLAR_DEPARTMENTS } from '../data/madinatOntology';
import { useWorldStore, VehicleInstance } from '../store/useWorldStore';
import { solarpunkAudio } from '../audio/solarpunkAudio';
import { applySolarpunkMaterials } from './ShadersAndMaterials';
import { ArticulatedCharacter } from './ArticulatedCharacter';

// Individual Pilotable Sculpted Vehicle Wrapper with Rotating Wheels / Rotors!
const PilotableVehicleModel: React.FC<{
  v: VehicleInstance;
  isDriven: boolean;
  speed: number;
  steer: number;
}> = ({ v, isDriven, speed, steer }) => {
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
    const ws = wNames.map((n) => {
      const wn = vehScene.getObjectByName(n);
      return wn ? applySolarpunkMaterials(wn.clone(true)) : null;
    });

    const boat = vehScene.getObjectByName('Boat');
    const bb = boat ? applySolarpunkMaterials(boat.clone(true)) : new THREE.Group();

    const ev = vehScene.getObjectByName('Evtol');
    const eb = ev ? applySolarpunkMaterials(ev.clone(true)) : new THREE.Group();

    return { carBody: cb, wheels: ws, boatBody: bb, evtolBody: eb };
  }, [vehScene, v.color]);

  const wheelRefs = useRef<(THREE.Object3D | null)[]>([]);

  useFrame((_, dt) => {
    if (v.kind === 'car' && isDriven) {
      wheels.forEach((wObj, idx) => {
        if (!wObj) return;
        wObj.rotation.x += (speed * dt) / 0.36;
        if (idx < 2) {
          wObj.rotation.y = THREE.MathUtils.lerp(wObj.rotation.y, steer * 0.45, 0.25);
        }
      });
    }
  });

  return (
    <group position={v.position} rotation={[0, v.rotationY, 0]}>
      {/* Rotate exported Blender -Y-forward vehicle by PI so front faces -Z (Three.js forward!) */}
      {v.kind === 'car' && (
        <group rotation={[0, Math.PI, 0]}>
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
        <PillBillboardTag
          position={[0, 2.35, 0]}
          title={`[E] ${v.name}`}
          accentColor={v.color}
          width={2.5}
        />
      )}
    </group>
  );
};

export const PlayerAndVehiclesController: React.FC = () => {
  const { camera, gl } = useThree();
  const keys = useRef<Record<string, boolean>>({});
  // Start camYaw = 0 (camera at +Z behind player at [0, 0.35, 184], looking North -Z through Royal Gate -> Bridge -> Dome!)
  const camYaw = useRef(0);
  const camPitch = useRef(0.24);
  const camDist = useRef(9.5);
  const dragging = useRef(false);
  const velY = useRef(0);
  const tramAngle = useRef(0);
  const debugOverrideCam = useRef<{ pos: THREE.Vector3; lookAt: THREE.Vector3 } | null>(null);

  const posRef = useRef(new THREE.Vector3(0, 0.35, 184));
  const rotYRef = useRef(0);
  const avatarGroupRef = useRef<THREE.Group>(null);
  const [moveMode, setMoveMode] = useState<'idle' | 'walk' | 'run'>('idle');
  const currentSpeedRef = useRef(0);
  const currentSteerRef = useRef(0);

  const vehicles = useWorldStore((s) => s.vehicles);
  const activeVehicleId = useWorldStore((s) => s.activeVehicleId);
  const locomotion = useWorldStore((s) => s.locomotion);
  const firstPerson = useWorldStore((s) => s.firstPerson);
  const aerialCam = useWorldStore((s) => s.aerialCam);
  const teleportTarget = useWorldStore((s) => s.teleportTarget);

  useEffect(() => {
    if (teleportTarget) {
      debugOverrideCam.current = null;
      posRef.current.set(teleportTarget[0], teleportTarget[1], teleportTarget[2]);
      useWorldStore.getState().clearTeleport();
    }
  }, [teleportTarget]);

  // Expose deterministic inspection API for automated Playwright visual verification
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
      teleport: (pos: [number, number, number]) => {
        debugOverrideCam.current = null;
        useWorldStore.getState().teleportTo(pos);
      },
      setMode: (mode: 'world3d' | 'garden' | 'desktop' | 'glbInspector') => {
        useWorldStore.getState().setInterfaceMode(mode);
      },
      openDept: (id: string | null) => {
        useWorldStore.getState().openDepartment(id);
      },
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__madinatDebug;
    };
  }, []);

  useEffect(() => {
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
      } else if (k === 'Escape') {
        debugOverrideCam.current = null;
        if (st.activePortalId) st.enterPortal(null);
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
    const onMouseDown = () => {
      dragging.current = true;
    };
    const onMouseUp = () => {
      dragging.current = false;
    };
    const onMouseMove = (e: MouseEvent) => {
      if (!dragging.current) return;
      debugOverrideCam.current = null;
      camYaw.current -= e.movementX * 0.0055;
      camPitch.current = THREE.MathUtils.clamp(camPitch.current + e.movementY * 0.0045, 0.06, 1.35);
    };
    const onWheel = (e: WheelEvent) => {
      camDist.current = THREE.MathUtils.clamp(camDist.current + e.deltaY * 0.015, 4.2, 160);
    };

    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    dom.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mousemove', onMouseMove);
    dom.addEventListener('wheel', onWheel, { passive: true });
    return () => {
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      dom.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mousemove', onMouseMove);
      dom.removeEventListener('wheel', onWheel);
    };
  }, [gl]);

  const computeGroundHeight = (x: number, z: number, currentY: number): number => {
    const r = Math.hypot(x, z);
    // Upper S0 Observatory inside Bayt al-Hikma Dome
    if (r <= 14.6 && currentY >= 5.5) return 8.65;
    if (r <= 36.2) return 0.45;

    // Walkable Spiral Staircase inside Dome (r = 19..24)
    if (r >= 18.8 && r <= 24.2) {
      let a = Math.atan2(z, x);
      if (a < 0) a += Math.PI * 2;
      const start = Math.PI * 0.65;
      let rel = a - start;
      if (rel < 0) rel += Math.PI * 2;
      const span = Math.PI * 1.45;
      if (rel <= span + 0.15) {
        const rampY = 0.45 + Math.min(1, rel / span) * 8.2;
        if (Math.abs(currentY - rampY) < 2.6) return rampY;
      }
    }

    // Lagoon water vs 4 Cardinal Bridges
    if (r > 42 && r < 76) {
      const onCardinalBridge = Math.abs(x) < 5.2 || Math.abs(z) < 5.2;
      return onCardinalBridge ? 0.48 : -0.45;
    }

    return 0.25;
  };

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const st = useWorldStore.getState();
    const k = keys.current;

    const fwd = (k['KeyW'] || k['KeyZ'] || k['ArrowUp'] ? 1 : 0) - (k['KeyS'] || k['ArrowDown'] ? 1 : 0);
    const str = (k['KeyD'] || k['ArrowRight'] ? 1 : 0) - (k['KeyA'] || k['KeyQ'] || k['ArrowLeft'] ? 1 : 0);
    const sprint = Boolean(k['ShiftLeft'] || k['ShiftRight']);

    const pos = posRef.current;

    if (st.locomotion === 'tram') {
      tramAngle.current -= dt * 0.18;
      pos.set(Math.cos(tramAngle.current) * 143, 2.2, Math.sin(tramAngle.current) * 143);
      rotYRef.current = -tramAngle.current;
    } else if (st.locomotion === 'car' || st.locomotion === 'boat') {
      const topSpeed = st.locomotion === 'car' ? (sprint ? 42 : 28) : 19;
      currentSpeedRef.current = fwd * topSpeed;
      currentSteerRef.current = -str;
      if (Math.abs(fwd) > 0.01) {
        rotYRef.current -= str * dt * 2.1 * Math.sign(fwd);
        pos.x -= Math.sin(rotYRef.current) * fwd * topSpeed * dt;
        pos.z -= Math.cos(rotYRef.current) * fwd * topSpeed * dt;
      }
      if (st.locomotion === 'boat') {
        const r = Math.hypot(pos.x, pos.z);
        if (r < 44 || r > 74) {
          const clamped = THREE.MathUtils.clamp(r, 44.2, 73.8);
          const ang = Math.atan2(pos.z, pos.x);
          pos.x = Math.cos(ang) * clamped;
          pos.z = Math.sin(ang) * clamped;
        }
        pos.y = -0.25;
      } else {
        pos.y = Math.max(0.05, computeGroundHeight(pos.x, pos.z, pos.y) - 0.12);
      }
      camYaw.current = THREE.MathUtils.lerp(camYaw.current, rotYRef.current, dt * 3.5);
      if (st.activeVehicleId) {
        st.updateVehicleTransform(st.activeVehicleId, [pos.x, pos.y, pos.z], rotYRef.current);
      }
    } else if (st.locomotion === 'evtol') {
      const flySpeed = sprint ? 50 : 32;
      rotYRef.current -= str * dt * 1.8;
      pos.x -= Math.sin(rotYRef.current) * fwd * flySpeed * dt;
      pos.z -= Math.cos(rotYRef.current) * fwd * flySpeed * dt;
      if (k['Space']) pos.y += 18 * dt;
      if (k['KeyC'] || k['ControlLeft']) pos.y = Math.max(0.2, pos.y - 18 * dt);
      pos.y = Math.min(180, Math.max(0.2, pos.y));
      camYaw.current = THREE.MathUtils.lerp(camYaw.current, rotYRef.current, dt * 3.0);
      if (st.activeVehicleId) {
        st.updateVehicleTransform(st.activeVehicleId, [pos.x, pos.y, pos.z], rotYRef.current);
      }
    } else if (st.locomotion === 'parachute') {
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
      const speed = sprint ? 16.5 : 9.5;
      if (fwd !== 0 || str !== 0) {
        const forwardVec = new THREE.Vector3(-Math.sin(camYaw.current), 0, -Math.cos(camYaw.current));
        const rightVec = new THREE.Vector3(Math.cos(camYaw.current), 0, -Math.sin(camYaw.current));
        const move = forwardVec.multiplyScalar(fwd).add(rightVec.multiplyScalar(str)).normalize();
        pos.x += move.x * speed * dt;
        pos.z += move.z * speed * dt;
        rotYRef.current = Math.atan2(-move.x, -move.z);
        const nextMode = sprint ? 'run' : 'walk';
        if (moveMode !== nextMode) setMoveMode(nextMode);
      } else if (moveMode !== 'idle') {
        setMoveMode('idle');
      }

      const groundY = computeGroundHeight(pos.x, pos.z, pos.y);
      if (k['Space'] && Math.abs(pos.y - groundY) < 0.2) {
        velY.current = 7.8;
      }
      velY.current -= 19.6 * dt;
      pos.y += velY.current * dt;
      if (pos.y <= groundY) {
        pos.y = groundY;
        velY.current = 0;
      }
    }

    pos.x = THREE.MathUtils.clamp(pos.x, -360, 360);
    pos.z = THREE.MathUtils.clamp(pos.z, -360, 360);

    st.setPlayerTransform([pos.x, pos.y, pos.z], rotYRef.current);
    if (avatarGroupRef.current) {
      avatarGroupRef.current.position.copy(pos);
      avatarGroupRef.current.rotation.y = rotYRef.current;
    }

    // Camera Routing: Debug Override > Aerial City Drone > First-Person > Smooth GTA Orbit
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
      const dist = st.locomotion === 'evtol' ? camDist.current * 1.45 : st.locomotion === 'car' ? camDist.current * 1.15 : camDist.current;
      const cx = pos.x + Math.sin(camYaw.current) * Math.cos(camPitch.current) * dist;
      const cy = pos.y + Math.sin(camPitch.current) * dist + 1.9;
      const cz = pos.z + Math.cos(camYaw.current) * Math.cos(camPitch.current) * dist;
      camera.position.lerp(new THREE.Vector3(cx, Math.max(0.8, cy), cz), 0.18);
      camera.lookAt(pos.x, pos.y + 1.5, pos.z);
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
      if (d < 8.5) {
        bestHint = {
          label: `[E] Exploiter ${dept.name} (App : ${dept.appSlug.toUpperCase()})`,
          action: () => {
            st.openDepartment(dept.id);
            solarpunkAudio.playChime(true);
          },
        };
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
          mode={moveMode}
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
          speed={currentSpeedRef.current}
          steer={currentSteerRef.current}
        />
      ))}
    </group>
  );
};
