import React, { useEffect, useMemo, useRef, useState } from 'react';
import { useFrame } from '@react-three/fiber';
import { Billboard, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import {
  MARKETPLACE_BLUEPRINTS,
  PORTAL_GAMES,
  SOLAR_DEPARTMENTS,
  SolarDepartment,
} from '../data/madinatOntology';
import { useWorldStore } from '../store/useWorldStore';
import {
  applySolarpunkMaterials,
  createEmeraldWaterMaterial,
  getSolarpunkMaterialLibrary,
  SHARED_MATERIALS,
} from './ShadersAndMaterials';
import { LIVE_TRAFFIC_CARS } from './CollisionEngine';
import { ContactShadowDisc } from './ContactShadowDisc';
import { ArticulatedCharacter } from './ArticulatedCharacter';
import {
  AnimatedShibaDog,
  createPortalArtworkTexture,
  CubeFarmWorkstation,
  PavilionRichFurnishings,
  PersianCarpet,
  PillBillboardTag,
} from './InteriorKitAndWorkstation';

useGLTF.preload('/models/bayt_dome.glb');
useGLTF.preload('/models/solar_ring_arc.glb');
useGLTF.preload('/models/gate_and_bridge.glb');
useGLTF.preload('/models/villa_and_souk.glb');
useGLTF.preload('/models/vehicles_and_flora.glb');

// 1. TACTICAL HOLOGRAM OF USER'S .GLB (Instanced 3D Crystal Matrix in S0 Observatory)
const GlbTacticalHologram: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const astrolabeOuterRef = useRef<THREE.Mesh>(null);
  const astrolabeInnerRef = useRef<THREE.Mesh>(null);
  const instRef = useRef<THREE.InstancedMesh>(null);
  const [holoData, setHoloData] = useState<{ pos: Float32Array; cols: Float32Array; count: number } | null>(null);

  useEffect(() => {
    let cancelled = false;
    const buildFallbackHologram = () => {
      const pts: number[] = [];
      const cols: number[] = [];
      const rings = [0.06, 0.14, 0.24, 0.34, 0.44];
      rings.forEach((r, ri) => {
        const count = 500 + ri * 200;
        for (let i = 0; i < count; i++) {
          const a = (i / count) * Math.PI * 2;
          const dr = Math.sin(i * 7.3) * 0.015;
          pts.push(Math.cos(a) * (r + dr), (ri === 0 ? 0.04 : 0.015) + Math.abs(Math.cos(i * 3.1)) * 0.025, Math.sin(a) * (r + dr));
          if (ri === 0) cols.push(1.0, 0.86, 0.35);
          else if (ri === 1) cols.push(0.18, 0.96, 0.88);
          else cols.push(0.95, 0.78, 0.38);
        }
      });
      setHoloData({ pos: new Float32Array(pts), cols: new Float32Array(cols), count: pts.length / 3 });
      (window as unknown as Record<string, unknown>).__madinatHologramReady = true;
    };

    Promise.all([
      fetch('/city_hologram_points.json').then((r) => r.json()),
      new Promise<HTMLImageElement>((res, rej) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => res(img);
        img.onerror = rej;
        img.src = '/tripo_baked.jpg';
      }),
    ])
      .then(([data, img]) => {
        if (cancelled) return;
        const canvas = document.createElement('canvas');
        const w = 256;
        const h = 256;
        canvas.width = w;
        canvas.height = h;
        const ctx = canvas.getContext('2d');
        if (ctx) ctx.drawImage(img, 0, 0, w, h);
        const px = ctx ? ctx.getImageData(0, 0, w, h).data : null;

        const stride = 3;
        const sampledCount = Math.ceil(data.count / stride);
        const pos = new Float32Array(sampledCount * 3);
        const cols = new Float32Array(sampledCount * 3);
        const rawPos: number[] = data.positions;
        const uvs: number[] = data.uvs;

        for (let si = 0, i = 0; i < data.count; i += stride, si++) {
          const px0 = rawPos[i * 3];
          const py0 = rawPos[i * 3 + 1];
          const pz0 = rawPos[i * 3 + 2];
          pos[si * 3] = px0;
          pos[si * 3 + 1] = py0;
          pos[si * 3 + 2] = pz0;
          const rxz = Math.hypot(px0, pz0);
          const u = Math.min(w - 1, Math.max(0, Math.floor(uvs[i * 2] * w)));
          const v = Math.min(h - 1, Math.max(0, Math.floor((1 - uvs[i * 2 + 1]) * h)));
          if (rxz < 0.09) {
            cols[si * 3] = 1.0;
            cols[si * 3 + 1] = 0.85;
            cols[si * 3 + 2] = 0.35;
          } else if (rxz >= 0.09 && rxz <= 0.19) {
            cols[si * 3] = 0.18;
            cols[si * 3 + 1] = 0.95;
            cols[si * 3 + 2] = 0.88;
          } else if (px) {
            const idx = (v * w + u) * 4;
            cols[si * 3] = Math.min(1, (px[idx] / 255) * 1.35 + 0.22);
            cols[si * 3 + 1] = Math.min(1, (px[idx + 1] / 255) * 1.3 + 0.18);
            cols[si * 3 + 2] = Math.min(1, (px[idx + 2] / 255) * 1.15 + 0.08);
          } else {
            cols[si * 3] = 0.98;
            cols[si * 3 + 1] = 0.82;
            cols[si * 3 + 2] = 0.38;
          }
        }
        setHoloData({ pos, cols, count: sampledCount });
        (window as unknown as Record<string, unknown>).__madinatHologramReady = true;
      })
      .catch(() => {
        if (!cancelled) buildFallbackHologram();
      });
    return () => {
      cancelled = true;
    };
  }, []);

  useEffect(() => {
    const im = instRef.current;
    if (!im || !holoData) return;
    const dummy = new THREE.Object3D();
    const col = new THREE.Color();
    for (let i = 0; i < holoData.count; i++) {
      const px = holoData.pos[i * 3];
      const py = holoData.pos[i * 3 + 1];
      const pz = holoData.pos[i * 3 + 2];
      const heightBoost = py > -0.02 ? 1.45 : 0.8;
      dummy.position.set(px, py + 0.02, pz);
      dummy.scale.set(1, heightBoost, 1);
      dummy.updateMatrix();
      im.setMatrixAt(i, dummy.matrix);
      col.setRGB(holoData.cols[i * 3], holoData.cols[i * 3 + 1], holoData.cols[i * 3 + 2]);
      im.setColorAt(i, col);
    }
    im.instanceMatrix.needsUpdate = true;
    if (im.instanceColor) im.instanceColor.needsUpdate = true;
  }, [holoData]);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.18;
    if (astrolabeOuterRef.current) astrolabeOuterRef.current.rotation.z += dt * 0.22;
    if (astrolabeInnerRef.current) astrolabeInnerRef.current.rotation.x -= dt * 0.28;
  });

  return (
    <group position={[0, 9.6, 0]}>
      <mesh position={[0, -0.55, 0]} material={SHARED_MATERIALS.royalMarble} castShadow receiveShadow>
        <cylinderGeometry args={[2.9, 3.3, 0.9, 36]} />
      </mesh>
      {/* Dark Obsidian-Sapphire Holographic Basin & Containment Dome for high visual contrast */}
      <mesh position={[0, -0.06, 0]}>
        <cylinderGeometry args={[2.95, 3.05, 0.16, 40]} />
        <meshStandardMaterial color="#051021" roughness={0.18} metalness={0.75} />
      </mesh>
      <mesh position={[0, -0.05, 0]} renderOrder={2} userData={{ ignoreCameraRay: true }}>
        <sphereGeometry args={[3.0, 32, 20, 0, Math.PI * 2, 0, Math.PI * 0.52]} />
        <meshPhysicalMaterial
          color="#041326"
          transparent
          opacity={0.36}
          roughness={0.12}
          metalness={0.25}
          depthWrite={false}
          side={THREE.DoubleSide}
        />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <torusGeometry args={[2.95, 0.08, 12, 48]} />
      </mesh>
      <mesh ref={astrolabeOuterRef} position={[0, 0.72, 0]} rotation={[0.45, 0, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <torusGeometry args={[2.75, 0.045, 10, 48]} />
      </mesh>
      <mesh ref={astrolabeInnerRef} position={[0, 0.72, 0]} rotation={[-0.55, 0.4, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <torusGeometry args={[2.25, 0.035, 10, 48]} />
      </mesh>
      <group ref={groupRef} scale={[5.4, 5.4, 5.4]} position={[0, 0.85, 0]}>
        <mesh position={[0, 0.015, 0]}>
          <sphereGeometry args={[0.068, 16, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
          <meshBasicMaterial color="#fbbf24" toneMapped={false} />
        </mesh>
        {[
          { r: 0.16, col: '#2dd4bf', tube: 0.004 },
          { r: 0.28, col: '#fbbf24', tube: 0.004 },
          { r: 0.42, col: '#fde68a', tube: 0.005 },
        ].map((ring, ri) => (
          <mesh key={ri} position={[0, -0.02, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[ring.r, ring.tube, 8, 48]} />
            <meshBasicMaterial color={ring.col} toneMapped={false} />
          </mesh>
        ))}
        {holoData && (
          <instancedMesh ref={instRef} args={[undefined, undefined, holoData.count]} frustumCulled={false}>
            <boxGeometry args={[0.009, 0.022, 0.009]} />
            <meshBasicMaterial color="#ffffff" toneMapped={false} />
          </instancedMesh>
        )}
      </group>
      <PillBillboardTag
        position={[0, 3.72, 0]}
        title="MAQUETTE HOLOGRAPHIQUE .GLB (18 048 PTS)"
        subtitle="TOUCHE [4] POUR L'INSPECTEUR COMPLET"
        accentColor="#f59e0b"
        width={3.5}
        maxDist={30}
      />
    </group>
  );
};

// 2. RING 0 — BAYT AL-HIKMA SCULPTED DOME + LIVE LOBBY & S0 OBSERVATORY
const CentralBaytAlHikmaDome: React.FC = () => {
  const { scene } = useGLTF('/models/bayt_dome.glb');
  const domeObj = useMemo(() => applySolarpunkMaterials(scene.clone(true)), [scene]);

  const gongRings = useWorldStore((s) => s.gongRings);
  const recruits = useWorldStore((s) => s.recruits);
  const escrowSignedCount = useWorldStore((s) => s.escrowSignedCount);
  const gongRef = useRef<THREE.Mesh>(null);

  useFrame(({ clock }) => {
    if (gongRef.current) {
      gongRef.current.rotation.z = Math.sin(clock.getElapsedTime() * 5) * 0.025;
    }
  });

  return (
    <group name="Ring0_BaytAlHikma" userData={{ cameraCollider: true }}>
      <group rotation={[0, Math.PI / 16, 0]}>
        <group userData={{ walkableMesh: true }}>
          <primitive object={domeObj} />
        </group>
        {/* Level Royal Marble Landing (catching open spiral ramp mouth at deg=20.5°, y=8.61m) + Sky-Bridge to S0 Deck (deg=25°, y=8.65m) */}
        <group userData={{ walkableMesh: true }}>
          <mesh position={[19.9, 8.53, 8.1]} receiveShadow castShadow material={SHARED_MATERIALS.royalMarble}>
            <boxGeometry args={[4.2, 0.22, 3.2]} />
          </mesh>
          <mesh position={[19.9, 9.05, 9.65]} castShadow material={SHARED_MATERIALS.abbassidGold}>
            <boxGeometry args={[4.2, 0.95, 0.14]} />
          </mesh>
          <group position={[15.6, 8.53, 6.7]} rotation={[0, -0.32, 0]}>
            <mesh receiveShadow castShadow material={SHARED_MATERIALS.royalMarble}>
              <boxGeometry args={[8.4, 0.22, 3.4]} />
            </mesh>
            <mesh position={[0, 0.125, 0]} material={SHARED_MATERIALS.abbassidGold} userData={{ ignoreCameraRay: true }}>
              <boxGeometry args={[8.2, 0.03, 1.5]} />
            </mesh>
            {[-1.62, 1.62].map((rz, ri) => (
              <mesh key={ri} position={[-0.8, 0.6, rz]} castShadow material={SHARED_MATERIALS.abbassidGold}>
                <boxGeometry args={[4.8, 0.95, 0.14]} />
              </mesh>
            ))}
          </group>
        </group>
        <PillBillboardTag
          position={[-11.4, 2.45, 18.2]}
          title="⬆️ ESCALIER OBSERVATOIRE S0"
          accentColor="#f59e0b"
          width={2.1}
        />
      </group>

      {/* S0 Observatory Table & Sovereign Escrow Altar */}
      <GlbTacticalHologram />

      <group position={[0, 8.65, 10.5]}>
        <mesh position={[0, 0.65, 0]} material={SHARED_MATERIALS.abbassidGold} castShadow>
          <cylinderGeometry args={[0.9, 1.25, 1.3, 20]} />
        </mesh>
        <mesh position={[0, 1.65, 0]}>
          <octahedronGeometry args={[0.52, 0]} />
          <meshStandardMaterial
            color={escrowSignedCount > 0 ? '#10b981' : '#f59e0b'}
            emissive={escrowSignedCount > 0 ? '#059669' : '#d97706'}
            emissiveIntensity={1.1}
          />
        </mesh>
        <PillBillboardTag
          position={[0, 2.55, 0]}
          title={escrowSignedCount > 0 ? `ESCROW S0 · ${escrowSignedCount} VISA(S) ✓` : '⚡ ESCROW S0 (>10k€) · [E] SIGNER'}
          accentColor={escrowSignedCount > 0 ? '#10b981' : '#f59e0b'}
          width={3.1}
          maxDist={30}
        />
      </group>

      {/* S0 Observatory Benches & Golden Brass Lanterns (keeping Sky-Bridge x>8, z>2 clear) */}
      {[
        { pos: [-7.5, 8.65, -4] as [number, number, number], rotY: 0.45 },
        { pos: [-7.5, 8.65, 4] as [number, number, number], rotY: -0.45 },
      ].map((b, bi) => (
        <group key={bi} position={b.pos} rotation={[0, b.rotY, 0]}>
          <mesh position={[0, 0.28, 0]} material={SHARED_MATERIALS.royalMarble} castShadow receiveShadow>
            <boxGeometry args={[2.6, 0.42, 0.95]} />
          </mesh>
          <mesh position={[0, 0.51, 0]} material={SHARED_MATERIALS.abbassidGold}>
            <boxGeometry args={[2.45, 0.06, 0.8]} />
          </mesh>
        </group>
      ))}
      {[
        [-7.5, 8.65, -6.4],
        [-7.5, 8.65, 6.4],
        [6.5, 8.65, -7.0],
        [4.2, 8.65, -8.5],
      ].map(([lx, ly, lz], li) => (
        <group key={li} position={[lx, ly, lz]}>
          <mesh position={[0, 0.95, 0]} material={SHARED_MATERIALS.abbassidGold} castShadow>
            <cylinderGeometry args={[0.07, 0.14, 1.9, 10]} />
          </mesh>
          <mesh position={[0, 1.98, 0]}>
            <octahedronGeometry args={[0.24, 0]} />
            <meshBasicMaterial color="#fef08a" toneMapped={false} />
          </mesh>
        </group>
      ))}

      {/* Ground Floor CEO Executive Station (A0 Amadeus) */}
      <group position={[0, 0.485, -13.2]}>
        <PersianCarpet position={[0, 0.01, 0.4]} size={[8.2, 5.2]} accentColor="#1e3a8a" />
        <mesh position={[0, 2.75, -3.6]} userData={{ cameraCollider: true }}>
          <boxGeometry args={[13.6, 3.2, 0.3]} />
          <meshStandardMaterial color="#0f172a" roughness={0.18} metalness={0.6} />
        </mesh>
        <mesh position={[0, 2.75, -3.44]}>
          <planeGeometry args={[13.0, 2.75]} />
          <meshStandardMaterial color="#082f49" emissive="#0369a1" emissiveIntensity={0.45} />
        </mesh>
        <Text position={[0, 3.42, -3.35]} fontSize={0.38} maxWidth={12.4} color="#fde68a" anchorX="center">
          BAYT AL-HIKMA · MISSION CONTROL (A0 AMADEUS × SUMMERS)
        </Text>
        <Text position={[0, 2.48, -3.35]} fontSize={0.27} maxWidth={12.4} color="#5eead4" anchorX="center">
          578 HOLONS · 8 PAVILLONS APPLE PARK × BAGDAD · BRIDGE 11ms · SOC2
        </Text>

        <CubeFarmWorkstation
          position={[0, 0, -0.4]}
          rotationY={Math.PI}
          deptColor="#e0aa42"
          skinColor="#8d5524"
          isCeo
          stream={{
            id: 'ceo-a0',
            agentName: 'CEO A0 Amadeus // Souverain',
            role: '7D Orchestrateur',
            task: 'Supervision des 578 Holons & Bouclier A1-Beth sur Bagdad x Apple Park',
            statusLabel: '[P] SMARTPHONE',
          }}
        />
      </group>

      {/* Golden Merge Gong */}
      <group position={[14, 0.485, 6]}>
        <mesh position={[-1.4, 1.8, 0]} material={SHARED_MATERIALS.warmCedar} castShadow>
          <cylinderGeometry args={[0.14, 0.18, 3.6, 12]} />
        </mesh>
        <mesh position={[1.4, 1.8, 0]} material={SHARED_MATERIALS.warmCedar} castShadow>
          <cylinderGeometry args={[0.14, 0.18, 3.6, 12]} />
        </mesh>
        <mesh position={[0, 3.5, 0]} material={SHARED_MATERIALS.warmCedar} castShadow>
          <boxGeometry args={[3.4, 0.25, 0.28]} />
        </mesh>
        <mesh
          ref={gongRef}
          position={[0, 2.0, 0]}
          rotation={[Math.PI / 2, 0, 0]}
          material={SHARED_MATERIALS.abbassidGold}
          castShadow
        >
          <cylinderGeometry args={[1.05, 1.05, 0.12, 32]} />
        </mesh>
        <PillBillboardTag
          position={[0, 4.35, 0]}
          title={`GONG DE MERGE (${gongRings})`}
          subtitle="[E] FRAPPER"
          accentColor="#f59e0b"
          width={2.5}
        />
      </group>

      {/* Lobby Mascot Shiba */}
      <AnimatedShibaDog center={[6.5, 0.485, -6.5]} radius={2.6} label="🐕 Al-Mansur · Gardien S0" />

      {/* Recruitment Lounge with Real Articulated Candidates */}
      <group position={[-14, 0.485, 6]}>
        <PillBillboardTag
          position={[0, 3.5, 0]}
          title="SALON RECRUTEMENT IA"
          subtitle="[E] EMBAUCHER UN HOLON"
          accentColor="#14b8a6"
          width={2.05}
        />
        {recruits.map((r, idx) => (
          <group key={r.id} position={[(idx - 1.5) * 2.4, 0, 0]}>
            <mesh position={[0, 0.24, 0]} material={SHARED_MATERIALS.royalMarble} castShadow receiveShadow>
              <boxGeometry args={[1.5, 0.46, 1.2]} />
            </mesh>
            {!r.hired ? (
              <group position={[0, 0.48, 0]}>
                <ArticulatedCharacter
                  tunicColor={idx % 2 === 0 ? '#0d9488' : '#4f46e5'}
                  accentColor="#e0aa42"
                  skinColor={idx % 2 === 0 ? '#c68642' : '#f1c27d'}
                  mode="idle"
                  phaseOffset={idx * 1.4}
                />
                <PillBillboardTag position={[0, 1.92, 0]} title={r.name} accentColor="#38bdf8" width={1.25} />
              </group>
            ) : (
              <PillBillboardTag position={[0, 0.95, 0]} title="EN POSTE ✓" accentColor="#10b981" width={1.15} />
            )}
          </group>
        ))}
      </group>
    </group>
  );
};

// 3. RING 1 — EMERALD LAGOON + 4 SCULPTED VAULTED BRIDGES + MONUMENTAL ROYAL GATE
const LagoonBridgesAndGate: React.FC = () => {
  const solarHour = useWorldStore((s) => s.solarHour);
  const waterMat = useMemo(() => createEmeraldWaterMaterial(), []);
  const { scene: gateScene } = useGLTF('/models/gate_and_bridge.glb');
  const { scene: floraScene } = useGLTF('/models/vehicles_and_flora.glb');

  const { bridges, royalGate, northGate, gateOliveLeft, gateOliveRight } = useMemo(() => {
    const bridgeProto = gateScene.getObjectByName('CardinalBridge');
    const gateProto = gateScene.getObjectByName('RoyalSouthGate');
    const oliveProto = floraScene.getObjectByName('OliveTree');

    const brs = [0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rot) => {
      const c = bridgeProto ? applySolarpunkMaterials(bridgeProto.clone(true)) : new THREE.Group();
      c.rotation.y = rot;
      return c;
    });

    const rg = gateProto ? applySolarpunkMaterials(gateProto.clone(true)) : new THREE.Group();
    const ng = gateProto ? applySolarpunkMaterials(gateProto.clone(true)) : new THREE.Group();
    const oll = oliveProto ? applySolarpunkMaterials(oliveProto.clone(true)) : new THREE.Group();
    const olr = oliveProto ? applySolarpunkMaterials(oliveProto.clone(true)) : new THREE.Group();
    return { bridges: brs, royalGate: rg, northGate: ng, gateOliveLeft: oll, gateOliveRight: olr };
  }, [gateScene, floraScene]);

  useFrame(({ clock }) => {
    waterMat.uniforms.uTime.value = clock.getElapsedTime();
    const angle = ((solarHour - 6) / 12) * Math.PI;
    const sy = Math.sin(angle);
    const sx = Math.cos(angle);
    waterMat.uniforms.uSunDir.value.set(sx * 195, sy >= -0.05 && sy < 0.48 ? 34 : Math.max(24, sy * 115), 96).normalize();
    const isNight = solarHour < 5.5 || solarHour > 20.2;
    waterMat.uniforms.uNightFactor.value = THREE.MathUtils.lerp(
      waterMat.uniforms.uNightFactor.value,
      isNight ? 0.85 : 0.0,
      0.05,
    );
  });

  return (
    <group name="Ring1_LagoonAndBridges">
      {/* Lagoon Basin & Reflective Emerald Caustic Water */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
        <ringGeometry args={[41.2, 76.8, 96]} />
        <meshStandardMaterial color="#0b5552" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.14, 0]} material={waterMat}>
        <ringGeometry args={[41.6, 76.4, 96, 8]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <ringGeometry args={[41.2, 41.8, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.04, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <ringGeometry args={[76.2, 76.9, 96]} />
      </mesh>
      <mesh position={[0, -0.5, 0]} material={SHARED_MATERIALS.limestone} receiveShadow>
        <cylinderGeometry args={[76.8, 76.0, 1.3, 80, 1, true]} />
      </mesh>

      {/* 4 Sculpted 3-Arch Stone Bridges */}
      <group userData={{ cameraCollider: true, walkableMesh: true }}>
        {bridges.map((b, i) => (
          <primitive key={i} object={b} />
        ))}
      </group>

      {/* 4 Paved Stone Cardinal Avenues linking Lagoon -> Ring 2 -> Boulevard -> Outer Ring */}
      {[0, Math.PI / 2, Math.PI, -Math.PI / 2].map((rot, i) => (
        <group key={i} rotation={[0, rot, 0]}>
          <mesh position={[0, 0.14, 152]} material={SHARED_MATERIALS.royalMarble} receiveShadow>
            <boxGeometry args={[12.5, 0.28, 152]} />
          </mesh>
          <mesh position={[0, 0.29, 152]} material={SHARED_MATERIALS.abbassidGold}>
            <boxGeometry args={[1.4, 0.04, 150]} />
          </mesh>
        </group>
      ))}

      {/* Monumental South Royal Gate (Iwan + Circular Forecourt with Twin Symmetrical Olive Planters) */}
      <group position={[0, 0, 158]}>
        <group userData={{ cameraCollider: true, walkableMesh: true }}>
          <primitive object={royalGate} />
        </group>
        <group position={[-9.5, 0.25, 14]} scale={[1.22, 1.22, 1.22]}>
          <primitive object={gateOliveLeft} />
        </group>
        <group position={[9.5, 0.25, 14]} scale={[1.22, 1.22, 1.22]}>
          <primitive object={gateOliveRight} />
        </group>
        {/* Marked Open Heliport Landing Pad for Orville eVTOL [-15.5, 183] */}
        <group position={[-15.5, 0.24, 25]}>
          <mesh receiveShadow material={SHARED_MATERIALS.royalMarble}>
            <cylinderGeometry args={[4.2, 4.4, 0.14, 32]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} material={SHARED_MATERIALS.abbassidGold}>
            <ringGeometry args={[3.55, 3.95, 32]} />
          </mesh>
          <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]} material={SHARED_MATERIALS.abbassidGold}>
            <planeGeometry args={[1.6, 0.35]} />
          </mesh>
        </group>
        <PillBillboardTag
          position={[0, 13.6, 2.6]}
          title="MADINAT ASPACE · BAYT AL-HIKMA"
          accentColor="#f59e0b"
          width={5.8}
          maxDist={46}
        />
      </group>

      {/* North Royal Gate Mirror */}
      <group position={[0, 0, -158]} rotation={[0, Math.PI, 0]} userData={{ cameraCollider: true, walkableMesh: true }}>
        <primitive object={northGate} />
      </group>
    </group>
  );
};

// 4. RING 2 — APPLE PARK × BAGHDAD CONTINUOUS CURVED SOLAR RING & 8 EXPLOITABLE PAVILIONS
const SingleDepartmentPavilion: React.FC<{
  dept: SolarDepartment;
  sectorProto: THREE.Object3D | undefined;
}> = ({ dept, sectorProto }) => {
  const resolvedNeedsIds = useWorldStore((s) => s.resolvedNeedsIds);
  const rad = (dept.angleDeg * Math.PI) / 180;
  const sectorMesh = useMemo(
    () => (sectorProto ? applySolarpunkMaterials(sectorProto.clone(true)) : new THREE.Group()),
    [sectorProto],
  );
  const hasPendingHuman = dept.streams.some((st) => st.needsHuman && !resolvedNeedsIds.includes(st.id));

  return (
    <group rotation={[0, rad, 0]}>
      {/* Curved Sculpted 45° Apple Park Sector (centered along +X, r=83..113m) */}
      <group userData={{ cameraCollider: true, walkableMesh: true }}>
        <primitive object={sectorMesh} />
      </group>

      {/* Ring 2 Solarpunk Rooftop Botanical Terraces, Gold Pergolas & Solar Louver Banks (on Ring 2 radius 84..113m!) */}
      <mesh position={[0, 10.74, 0]} rotation={[-Math.PI / 2, 0, 0]} material={getSolarpunkMaterialLibrary().FoliageOlive} receiveShadow>
        <ringGeometry args={[84.2, 88.0, 18, 1, -0.34, 0.68]} />
      </mesh>
      <mesh position={[0, 10.74, 0]} rotation={[-Math.PI / 2, 0, 0]} material={getSolarpunkMaterialLibrary().FoliageOlive} receiveShadow>
        <ringGeometry args={[108.8, 112.6, 18, 1, -0.34, 0.68]} />
      </mesh>
      <mesh position={[0, 10.88, 0]} rotation={[-Math.PI / 2, 0, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <ringGeometry args={[83.8, 84.4, 18, 1, -0.34, 0.68]} />
      </mesh>
      <mesh position={[0, 10.88, 0]} rotation={[-Math.PI / 2, 0, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <ringGeometry args={[112.4, 113.0, 18, 1, -0.34, 0.68]} />
      </mesh>
      {[-0.26, -0.13, 0, 0.13, 0.26].map((th, ti) => (
        <group key={ti} rotation={[0, th, 0]}>
          <group position={[98.5, 11.18, 0]}>
            <mesh position={[0, -0.14, 0]} castShadow material={SHARED_MATERIALS.warmCedar}>
              <boxGeometry args={[18.8, 0.24, 1.1]} />
            </mesh>
            <mesh position={[0, 0.08, 0]} rotation={[0.24, 0, 0]} castShadow material={SHARED_MATERIALS.solarPanelPv}>
              <boxGeometry args={[16.8, 0.14, 3.6]} />
            </mesh>
            <mesh position={[0, 0.12, 1.85]} material={SHARED_MATERIALS.abbassidGold}>
              <boxGeometry args={[17.0, 0.08, 0.14]} />
            </mesh>
          </group>
        </group>
      ))}
      <group position={[98.5, 10.85, 0]}>
        <mesh material={SHARED_MATERIALS.abbassidGold} rotation={[Math.PI / 2, 0, 0]}>
          <torusGeometry args={[3.25, 0.14, 10, 28]} />
        </mesh>
        <mesh material={SHARED_MATERIALS.domeGoldGlass}>
          <sphereGeometry args={[3.2, 20, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
        </mesh>
      </group>

      {/* Department Overhead Banner facing inner Lagoon & outer Boulevard */}
      <group position={[98, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <PillBillboardTag
          position={[0, 6.4, 13.9]}
          title={`${dept.code} · ${dept.name}`}
          subtitle={`VP ${dept.vpName} · ${dept.opsPerSec}`}
          accentColor={dept.color}
          width={5.4}
        />
        <PillBillboardTag
          position={[0, 6.4, -13.9]}
          title={`${dept.code} · ${dept.name}`}
          subtitle={`VP ${dept.vpName} · ${dept.opsPerSec}`}
          accentColor={dept.color}
          width={5.4}
        />

        {hasPendingHuman && (
          <mesh position={[0, 3.4, 0]} rotation={[Math.PI / 2, 0, 0]}>
            <torusGeometry args={[1.3, 0.05, 8, 28]} />
            <meshBasicMaterial color="#fbbf24" />
          </mesh>
        )}

        {/* Central Interactive Studio Entrance Lectern */}
        <group position={[0, 0.28, 0]}>
          <mesh position={[0, 0.6, 0]} material={SHARED_MATERIALS.abbassidGold} castShadow>
            <cylinderGeometry args={[0.75, 1.0, 1.2, 20]} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color={dept.color} emissive={dept.color} emissiveIntensity={0.9} />
          </mesh>
          <PillBillboardTag
            position={[0, 2.35, 0]}
            title={`[E] ENTRER STUDIO ${dept.appSlug.toUpperCase()}`}
            subtitle={dept.opsPerSec}
            accentColor={dept.color}
            width={2.9}
          />
        </group>

        {/* Genuine CubeFarm Exterior Studio Workstations + Lounge + Kitchen + Plants */}
        {dept.streams.map((st, sIdx) => {
          const dx = (sIdx - (dept.streams.length - 1) / 2) * 3.8;
          const needs = Boolean(st.needsHuman && !resolvedNeedsIds.includes(st.id));
          return (
            <CubeFarmWorkstation
              key={st.id}
              position={[dx, 0.28, -5.0]}
              stream={st}
              deptColor={dept.color}
              deptId={dept.id}
              needsHuman={needs}
              phaseOffset={sIdx * 1.9 + dept.sectorIndex}
              skinColor={sIdx % 2 === 0 ? '#c68642' : '#f1c27d'}
            />
          );
        })}
        <PavilionRichFurnishings dept={dept} />
        {dept.id === 'rd' && <AnimatedShibaDog center={[0, 0.28, -1.8]} radius={2.2} />}
      </group>

      {/* MARIO-64 PORTAL PAINTINGS WALL IN FORGE R&D (dept.id === 'rd') */}
      {dept.id === 'rd' && <ExteriorRdPortalWall />}
    </group>
  );
};

const ExteriorRdPortalWall: React.FC = () => {
  const portalTextures = useMemo(
    () => PORTAL_GAMES.map((pg) => createPortalArtworkTexture(pg.id, pg.title, pg.accent, pg.skyTop, pg.skyBottom)),
    [],
  );
  return (
    <group position={[89, 2.4, 0]} rotation={[0, Math.PI / 2, 0]} userData={{ cameraCollider: true }}>
      <PillBillboardTag
        position={[0, 2.4, 0]}
        title="GALERIE TABLEAUX-PORTAILS 3D"
        subtitle="[E] POUR ENTRER DANS LE MONDE"
        accentColor="#60a5fa"
        width={3.6}
      />
      {PORTAL_GAMES.map((pg, pIdx) => (
        <group key={pg.id} position={[(pIdx - 1) * 7.5, 0, 0]}>
          <mesh material={SHARED_MATERIALS.abbassidGold} castShadow>
            <boxGeometry args={[4.6, 3.2, 0.24]} />
          </mesh>
          <mesh position={[0, 0, 0.14]}>
            <planeGeometry args={[4.2, 2.85]} />
            <meshBasicMaterial map={portalTextures[pIdx]} toneMapped={false} />
          </mesh>
        </group>
      ))}
    </group>
  );
};

// 5. RING 3 & 4 — SOLAR BOULEVARD (SCULPTED SUPERCARS), OUTER CROWN, GRAND SOUK & PATRICIAN VILLAS
const OuterCrownBoulevardAndVillas: React.FC = () => {
  const deployedBlueprints = useWorldStore((s) => s.deployedBlueprints);
  const constructingBlueprint = useWorldStore((s) => s.constructingBlueprint);
  const tickBlueprintConstruction = useWorldStore((s) => s.tickBlueprintConstruction);
  const rogueDroneAngle = useWorldStore((s) => s.rogueDroneAngle);
  const rogueDroneNeutralized = useWorldStore((s) => s.rogueDroneNeutralized);
  const tickRogueDrone = useWorldStore((s) => s.tickRogueDrone);
  const timelapseSpeed = useWorldStore((s) => s.timelapseSpeed);
  const setSolarHour = useWorldStore((s) => s.setSolarHour);
  const solarHour = useWorldStore((s) => s.solarHour);
  const spawnedStructures = useWorldStore((s) => s.spawnedStructures);

  const { scene: ringScene } = useGLTF('/models/solar_ring_arc.glb');
  const { scene: villaScene } = useGLTF('/models/villa_and_souk.glb');
  const { scene: vehScene } = useGLTF('/models/vehicles_and_flora.glb');

  const innerSectorProto = useMemo(() => ringScene.getObjectByName('InnerRingSector'), [ringScene]);

  const outerCrownArcs = useMemo(() => {
    const outerProto = ringScene.getObjectByName('OuterRingSector');
    return [45, 135, 225, 315].map((deg) => {
      const c = outerProto ? applySolarpunkMaterials(outerProto.clone(true)) : new THREE.Group();
      c.rotation.y = (deg * Math.PI) / 180;
      return c;
    });
  }, [ringScene]);

  const soukObj = useMemo(() => {
    const soukProto = villaScene.getObjectByName('GrandSoukBazaar');
    return soukProto ? applySolarpunkMaterials(soukProto.clone(true)) : new THREE.Group();
  }, [villaScene]);

  const villaClones = useMemo(() => {
    const vp = villaScene.getObjectByName('PatricianVilla');
    return MARKETPLACE_BLUEPRINTS.map(() =>
      vp ? applySolarpunkMaterials(vp.clone(true)) : new THREE.Group(),
    );
  }, [villaScene]);

  // 14 Real Sculpted Supercars for Ring 3 Two-Way Right-Hand Autonomous Traffic!
  // Raw GLB Supercar front faces +Z -> rotY = Math.atan2(tx, tz) points nose strictly along forward velocity (tx, tz)!
  const trafficCars = useMemo(() => {
    const bodyProto = vehScene.getObjectByName('Supercar');
    const wheelNames = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'];
    const wheelProtos = wheelNames.map((n) => vehScene.getObjectByName(n));
    const paintColors = ['#e5a92b', '#faf5eb', '#14b8a6', '#2563eb'];

    return Array.from({ length: 14 }).map((_, i) => {
      const g = new THREE.Group();
      const wheels: THREE.Object3D[] = [];
      const customPaint = new THREE.MeshPhysicalMaterial({
        color: paintColors[i % paintColors.length],
        roughness: 0.16,
        metalness: 0.82,
        clearcoat: 1.0,
      });
      if (bodyProto) {
        g.add(applySolarpunkMaterials(bodyProto.clone(true), { CarPaint: customPaint }));
      }
      wheelProtos.forEach((wp, wi) => {
        if (!wp) return;
        const wc = applySolarpunkMaterials(wp.clone(true));
        if (wi >= 2) wc.scale.set(1, 0.92, 0.92);
        wheels.push(wc);
        g.add(wc);
      });
      const r = i % 2 === 0 ? 128.0 : 139.0;
      const angDir = i % 2 === 0 ? 1 : -1;
      const angle = (i / 14) * Math.PI * 2;
      return {
        obj: g,
        wheels,
        angle,
        r,
        angDir,
        speed: 11.5,
      };
    });
  }, [vehScene]);

  const trafficCarRefs = useRef<(THREE.Group | null)[]>([]);
  const tramRef = useRef<THREE.Group>(null);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__madinatTrafficCheck = () => {
      let minDot = 1;
      const summary = trafficCars.map((c, idx) => {
        const g = trafficCarRefs.current[idx];
        const tx = -Math.sin(c.angle) * c.angDir;
        const tz = Math.cos(c.angle) * c.angDir;
        const rotY = g ? g.rotation.y : Math.atan2(tx, tz);
        const noseDot = Math.sin(rotY) * tx + Math.cos(rotY) * tz;
        if (noseDot < minDot) minDot = noseDot;
        return { r: c.r, angDir: c.angDir, speed: c.speed, rotY, noseDot };
      });
      return { count: summary.length, minDot, summary };
    };
    return () => {
      delete (window as unknown as Record<string, unknown>).__madinatTrafficCheck;
    };
  }, [trafficCars]);

  useFrame((_, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
    const speedMult = timelapseSpeed === 600 ? 18 : timelapseSpeed === 60 ? 5 : 1;
    tickBlueprintConstruction(dt * speedMult);
    tickRogueDrone(dt);

    if (timelapseSpeed > 0) {
      setSolarHour(solarHour + dt * (timelapseSpeed === 600 ? 2.4 : 0.45));
    }

    const p = useWorldStore.getState().playerPos;
    LIVE_TRAFFIC_CARS.length = trafficCars.length;
    trafficCars.forEach((c, idx) => {
      const cx = Math.cos(c.angle) * c.r;
      const cz = Math.sin(c.angle) * c.r;
      const tx = -Math.sin(c.angle) * c.angDir;
      const tz = Math.cos(c.angle) * c.angDir;
      const dx = p[0] - cx;
      const dz = p[2] - cz;
      const fwdDist = dx * tx + dz * tz;
      const latDist = Math.abs(-dx * tz + dz * tx);
      const blockedAhead = fwdDist > 0.5 && fwdDist < 10.5 && latDist < 3.0;
      const targetSpd = blockedAhead ? 0 : 11.5 * speedMult;
      c.speed = THREE.MathUtils.lerp(c.speed, targetSpd, 1 - Math.exp(-(blockedAhead ? 9 : 4) * dt));

      c.angle += ((c.speed * dt) / c.r) * c.angDir;
      const nx = Math.cos(c.angle) * c.r;
      const nz = Math.sin(c.angle) * c.r;
      const ntx = -Math.sin(c.angle) * c.angDir;
      const ntz = Math.cos(c.angle) * c.angDir;
      const rotY = Math.atan2(ntx, ntz);

      const g = trafficCarRefs.current[idx];
      if (g) {
        g.position.set(nx, 0.08, nz);
        g.rotation.y = rotY;
      }
      c.wheels.forEach((w) => {
        w.rotation.x += (c.speed * dt) / 0.36;
      });
      LIVE_TRAFFIC_CARS[idx] = { x: nx, z: nz, rotY };
    });

    if (tramRef.current) tramRef.current.rotation.y -= dt * 0.1 * speedMult;
  });

  const rogueX = Math.cos(rogueDroneAngle) * 134;
  const rogueZ = Math.sin(rogueDroneAngle) * 134;

  return (
    <group>
      {/* Continuous Ring 2 (Apple Park × Baghdad 8 Department Sectors) */}
      {SOLAR_DEPARTMENTS.map((dept) => (
        <SingleDepartmentPavilion key={dept.id} dept={dept} sectorProto={innerSectorProto} />
      ))}

      {/* Desert Golden Dune Horizon + Outer Ring-Cut City Ground (Preserving r=41.5..76.5 Lagoon!) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.35, 0]} material={SHARED_MATERIALS.desertDunes} receiveShadow>
        <planeGeometry args={[1800, 1800]} />
      </mesh>
      {[
        { pos: [-260, -2.2, -160] as [number, number, number], rot: 0.4 },
        { pos: [275, -2.0, -140] as [number, number, number], rot: -0.3 },
        { pos: [290, -2.1, 135] as [number, number, number], rot: 0.6 },
        { pos: [-280, -2.1, 155] as [number, number, number], rot: -0.5 },
        { pos: [-160, -2.2, -295] as [number, number, number], rot: 0.2 },
        { pos: [175, -2.2, -285] as [number, number, number], rot: -0.4 },
      ].map((dune, di) => (
        <mesh key={di} position={dune.pos} rotation={[0, dune.rot, 0]} scale={[65, 6.5, 38]} material={SHARED_MATERIALS.desertDunes} receiveShadow>
          <sphereGeometry args={[1, 20, 10, 0, Math.PI * 2, 0, Math.PI * 0.5]} />
        </mesh>
      ))}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.02, 0]} material={SHARED_MATERIALS.warmSandstone} receiveShadow>
        <ringGeometry args={[76.2, 224, 96]} />
      </mesh>
      <mesh position={[0, 0.25, 0]} material={SHARED_MATERIALS.limestone} receiveShadow>
        <cylinderGeometry args={[223, 223.8, 0.6, 96, 1, true]} />
      </mesh>

      {/* Ring 3 — Grand Solar Boulevard (r=122..145m) + Cooling Qanat Turquoise Water Channel */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.06, 0]} material={SHARED_MATERIALS.roadStone} receiveShadow>
        <ringGeometry args={[122, 145.5, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.09, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <ringGeometry args={[133.2, 133.9, 96]} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, 0.08, 0]}>
        <ringGeometry args={[118.8, 121.4, 96]} />
        <meshStandardMaterial color="#10a398" roughness={0.1} metalness={0.3} />
      </mesh>

      {/* Autonomous Two-Way Forward-Facing Sculpted Supercar Traffic on Ring 3 */}
      <group>
        {trafficCars.map((c, idx) => {
          const tx = -Math.sin(c.angle) * c.angDir;
          const tz = Math.cos(c.angle) * c.angDir;
          return (
            <group
              key={idx}
              ref={(el) => {
                trafficCarRefs.current[idx] = el;
              }}
              position={[Math.cos(c.angle) * c.r, 0.08, Math.sin(c.angle) * c.r]}
              rotation={[0, Math.atan2(tx, tz), 0]}
            >
              <ContactShadowDisc position={[0, 0.03, 0]} radius={1.7} scaleZ={1.55} opacity={0.85} />
              <primitive object={c.obj} />
            </group>
          );
        })}
      </group>

      {/* Elevated Solar Magnetic Tramway */}
      <group ref={tramRef}>
        <group position={[143.2, 1.3, 0]}>
          <mesh castShadow material={SHARED_MATERIALS.royalMarble}>
            <boxGeometry args={[2.6, 2.0, 12.0]} />
          </mesh>
          <mesh position={[0, 1.08, 0]} material={SHARED_MATERIALS.solarPanelPv}>
            <boxGeometry args={[2.7, 0.14, 12.1]} />
          </mesh>
          <PillBillboardTag
            position={[0, 2.25, 0]}
            title="TRAMWAY SOLAIRE"
            subtitle="[E] MONTER À BORD"
            accentColor="#f59e0b"
            width={3.4}
            maxDist={55}
          />
        </group>
      </group>

      {/* Ring 4 — Continuous Stepped Outer Solarpunk Crown (4 Curved 70° Sectors) */}
      <group userData={{ cameraCollider: true, walkableMesh: true }}>
        {outerCrownArcs.map((arc, i) => (
          <primitive key={i} object={arc} />
        ))}
      </group>

      {/* Rogue Phantom AI Drone Mission 04 */}
      {!rogueDroneNeutralized && (
        <group position={[rogueX, 2.2, rogueZ]}>
          <mesh rotation={[Math.PI / 2, 0, 0]} material={SHARED_MATERIALS.darkMetal} castShadow>
            <torusGeometry args={[1.45, 0.12, 8, 24]} />
          </mesh>
          <mesh>
            <octahedronGeometry args={[0.75, 0]} />
            <meshStandardMaterial color="#f59e0b" emissive="#dc2626" emissiveIntensity={1.2} />
          </mesh>
          <PillBillboardTag
            position={[0, 2.2, 0]}
            title="⚠️ DRONE IA FANTÔME (04)"
            subtitle="[E] INTERCEPTER"
            accentColor="#ef4444"
            urgent
            width={3.8}
            maxDist={55}
          />
        </group>
      )}

      {/* Grand Souk Bazaar on South-East Esplanade [138, 0, 138] */}
      <group position={[138, 0, 138]} rotation={[0, -Math.PI * 0.75, 0]} userData={{ cameraCollider: true }}>
        <primitive object={soukObj} />
        <PillBillboardTag
          position={[0, 11.2, 0]}
          title="GRAND SOUK ASPACE MARKETPLACE"
          subtitle="[E] ASSEMBLER UN BLUEPRINT"
          accentColor="#f59e0b"
          width={5.6}
          maxDist={55}
        />
      </group>

      {/* 4 Patrician Solarpunk Villas (Linen.ai Hero Model) on Outer Oasis Belt r=196m */}
      {MARKETPLACE_BLUEPRINTS.map((bp, bIdx) => {
        const isBuilt = deployedBlueprints.includes(bp.id);
        const isConstructing = constructingBlueprint?.id === bp.id;
        const progress = isBuilt ? 1 : isConstructing ? constructingBlueprint!.progress : 0;
        const rad = (bp.plotAngleDeg * Math.PI) / 180;
        const r = 196;
        const vx = Math.cos(rad) * r;
        const vz = -Math.sin(rad) * r;

        return (
          <group key={bp.id} position={[vx, 0, vz]} rotation={[0, rad - Math.PI / 2, 0]} userData={{ cameraCollider: true }}>
            {progress > 0 ? (
              <group scale={[1, Math.max(0.06, progress), 1]}>
                <primitive object={villaClones[bIdx]} />
                <Text position={[0, 13.8, 0]} fontSize={0.62} color={bp.accentColor} anchorX="center">
                  {isBuilt ? `VILLA ACTIVE · ${bp.title.toUpperCase()}` : `CONSTRUCTION DRONES ${(progress * 100).toFixed(0)}%`}
                </Text>
              </group>
            ) : (
              <group>
                <mesh position={[0, 0.25, 0]} material={SHARED_MATERIALS.royalMarble} receiveShadow>
                  <boxGeometry args={[21, 0.5, 19]} />
                </mesh>
                {[
                  [-8.5, -7.5],
                  [8.5, -7.5],
                  [-8.5, 7.5],
                  [8.5, 7.5],
                ].map(([ox, oz], oi) => (
                  <mesh key={oi} position={[ox, 1.35, oz]} material={SHARED_MATERIALS.abbassidGold} castShadow>
                    <cylinderGeometry args={[0.25, 0.42, 2.2, 8]} />
                  </mesh>
                ))}
                <PillBillboardTag
                  position={[0, 3.6, 0]}
                  title={`PARCELLE : ${bp.title}`}
                  accentColor={bp.accentColor}
                  width={4.6}
                />
              </group>
            )}
          </group>
        );
      })}

      {/* Strolling Holon Citizens Along Royal South Gate & Avenue */}
      {[
        { pos: [-4.2, 0.28, 173] as [number, number, number], rot: 0.2, col: '#0d9488', off: 0.5 },
        { pos: [4.2, 0.28, 168] as [number, number, number], rot: Math.PI - 0.3, col: '#3b82f6', off: 1.8 },
        { pos: [-4.4, 0.28, 152] as [number, number, number], rot: 0, col: '#8b5cf6', off: 3.1 },
        { pos: [4.4, 0.28, 146] as [number, number, number], rot: Math.PI, col: '#f59e0b', off: 4.4 },
      ].map((npc, i) => (
        <group key={i} position={npc.pos} rotation={[0, npc.rot, 0]}>
          <ArticulatedCharacter tunicColor={npc.col} accentColor="#e0aa42" mode="walk" phaseOffset={npc.off} />
        </group>
      ))}

      {/* User-Spawned Live Architect Structures ([B] / Voice) */}
      {spawnedStructures.map((st) => (
        <group key={st.id} position={st.position} rotation={[0, st.rotationY, 0]} userData={{ cameraCollider: true }}>
          <mesh position={[0, 2.2, 0]} material={SHARED_MATERIALS.royalMarble} castShadow>
            <cylinderGeometry args={[3.4, 3.8, 4.4, 12]} />
          </mesh>
          <mesh position={[0, 4.4, 0]} material={SHARED_MATERIALS.domeGoldGlass}>
            <sphereGeometry args={[3.5, 16, 12, 0, Math.PI * 2, 0, Math.PI / 2]} />
          </mesh>
          <Text position={[0, 6.8, 0]} fontSize={0.36} color="#fde68a" anchorX="center">
            {st.label}
          </Text>
        </group>
      ))}
    </group>
  );
};

// 6. INSTANCED BOTANICAL ORCHARD (600+ SCULPTED DATE PALMS, OLIVE TREES & CYPRESSES IN 6 DRAW CALLS!)
interface TreePart {
  geo: THREE.BufferGeometry;
  mat: THREE.Material;
}

const InstancedBotanicalGarden: React.FC = () => {
  const { scene: floraScene } = useGLTF('/models/vehicles_and_flora.glb');

  const extractTreeParts = (name: string): TreePart[] => {
    const node = floraScene.getObjectByName(name);
    if (!node) return [];
    const lib = getSolarpunkMaterialLibrary();
    const parts: TreePart[] = [];
    node.traverse((child) => {
      if (!(child as THREE.Mesh).isMesh) return;
      const m = child as THREE.Mesh;
      const mats = Array.isArray(m.material) ? m.material : [m.material];
      const matName = mats[0]?.name.replace(/\.\d+$/, '') ?? 'FoliageOlive';
      parts.push({
        geo: m.geometry,
        mat: lib[matName] ?? mats[0],
      });
    });
    return parts;
  };

  const { palmParts, oliveParts, cypressParts, palmPlacements, olivePlacements, cypressPlacements } =
    useMemo(() => {
      const pp = extractTreeParts('DatePalm');
      const op = extractTreeParts('OliveTree');
      const cp = extractTreeParts('Cypress');

      const palms: { x: number; y: number; z: number; s: number; rot: number }[] = [];
      const olives: { x: number; y: number; z: number; s: number; rot: number }[] = [];
      const cypresses: { x: number; y: number; z: number; s: number; rot: number }[] = [];

      // 1. Palms ringing the Lagoon shoreline (r = 78.5m) & flanking the Cardinal Avenues
      for (let i = 0; i < 64; i++) {
        const a = (i / 64) * Math.PI * 2;
        const deg = ((a * 180) / Math.PI) % 90;
        if (deg < 6 || deg > 84) continue;
        palms.push({
          x: Math.cos(a) * 79,
          y: 0.1,
          z: Math.sin(a) * 79,
          s: 0.95 + (i % 4) * 0.1,
          rot: a + i,
        });
      }
      // Boulevard & Gate Palms
      for (let d = 126; d <= 204; d += 14) {
        for (const side of [-9.5, 9.5]) {
          palms.push({ x: side, y: 0.1, z: d, s: 1.0, rot: d });
          palms.push({ x: side, y: 0.1, z: -d, s: 1.0, rot: d + 1 });
        }
      }

      // 2. Lush Mediterranean Olive Orchards (Apple Park vibe!) on ground rings & SOLID roof terraces only
      const oliveRings: { r: number; count: number; y: number; kind: 'ground' | 'ring2' | 'ring4' }[] = [
        { r: 80.5, count: 48, y: 0.1, kind: 'ground' },
        { r: 116.5, count: 72, y: 0.1, kind: 'ground' },
        { r: 183.0, count: 96, y: 0.1, kind: 'ground' },
        { r: 86.2, count: 40, y: 10.75, kind: 'ring2' }, // Ring 2 inner botanical terrace roof!
        { r: 110.6, count: 48, y: 10.75, kind: 'ring2' }, // Ring 2 outer botanical terrace roof!
        { r: 151.5, count: 44, y: 5.95, kind: 'ring4' }, // Ring 4 rooftop orchards (strictly over 45°±27° solid sectors!)
      ];
      oliveRings.forEach((ring, ri) => {
        for (let i = 0; i < ring.count; i++) {
          const a = (i / ring.count) * Math.PI * 2 + ri * 0.17;
          const degGlobal = (a * 180) / Math.PI;
          const deg90 = degGlobal % 90;
          if (ring.kind === 'ring4') {
            if (deg90 < 18 || deg90 > 72) continue;
          } else if (ring.kind === 'ring2') {
            const mod45 = ((degGlobal + 22.5) % 45) - 22.5;
            if (Math.abs(mod45) > 16.5) continue;
          } else {
            if (deg90 < 8 || deg90 > 82) continue;
          }
          olives.push({
            x: Math.cos(a) * ring.r,
            y: ring.y,
            z: Math.sin(a) * ring.r,
            s: ring.y > 1 ? 0.56 : 0.95 + (i % 3) * 0.15,
            rot: i * 1.1,
          });
        }
      });

      // 3. Tall Sculpted Cypresses framing Gates, Sectors & Outer Oasis Crown (matching Image 1!)
      const cypRings = [
        { r: 118.0, count: 44, y: 0.1 },
        { r: 214.0, count: 76, y: 0.1 },
      ];
      cypRings.forEach((ring, ci) => {
        for (let i = 0; i < ring.count; i++) {
          const a = (i / ring.count) * Math.PI * 2 + ci * 0.11;
          const deg = ((a * 180) / Math.PI) % 90;
          if (deg < 6 || deg > 84) continue;
          cypresses.push({
            x: Math.cos(a) * ring.r,
            y: ring.y,
            z: Math.sin(a) * ring.r,
            s: 0.95 + (i % 4) * 0.14,
            rot: i * 0.7,
          });
        }
      });

      return {
        palmParts: pp,
        oliveParts: op,
        cypressParts: cp,
        palmPlacements: palms,
        olivePlacements: olives,
        cypressPlacements: cypresses,
      };
    }, [floraScene]);

  return (
    <group>
      <InstancedTreeBatch parts={palmParts} placements={palmPlacements} />
      <InstancedTreeBatch parts={oliveParts} placements={olivePlacements} />
      <InstancedTreeBatch parts={cypressParts} placements={cypressPlacements} />
    </group>
  );
};

const InstancedTreeBatch: React.FC<{
  parts: TreePart[];
  placements: { x: number; y: number; z: number; s: number; rot: number }[];
}> = ({ parts, placements }) => {
  const refs = useRef<(THREE.InstancedMesh | null)[]>([]);

  useEffect(() => {
    const dummy = new THREE.Object3D();
    parts.forEach((_, pIdx) => {
      const im = refs.current[pIdx];
      if (!im) return;
      placements.forEach((p, idx) => {
        dummy.position.set(p.x, p.y, p.z);
        dummy.rotation.set(0, p.rot, 0);
        dummy.scale.set(p.s, p.s, p.s);
        dummy.updateMatrix();
        im.setMatrixAt(idx, dummy.matrix);
      });
      im.instanceMatrix.needsUpdate = true;
    });
  }, [parts, placements]);

  if (!parts.length || !placements.length) return null;
  return (
    <>
      {parts.map((part, pIdx) => (
        <instancedMesh
          key={pIdx}
          ref={(el) => {
            refs.current[pIdx] = el;
          }}
          args={[part.geo, part.mat, placements.length]}
          castShadow
          receiveShadow
        />
      ))}
    </>
  );
};

export const SolarpunkCityScene: React.FC = () => {
  return (
    <group>
      <CentralBaytAlHikmaDome />
      <LagoonBridgesAndGate />
      <OuterCrownBoulevardAndVillas />
      <InstancedBotanicalGarden />
    </group>
  );
};
