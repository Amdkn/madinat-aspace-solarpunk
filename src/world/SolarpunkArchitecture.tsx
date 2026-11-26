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
import { ArticulatedCharacter } from './ArticulatedCharacter';

useGLTF.preload('/models/bayt_dome.glb');
useGLTF.preload('/models/solar_ring_arc.glb');
useGLTF.preload('/models/gate_and_bridge.glb');
useGLTF.preload('/models/villa_and_souk.glb');
useGLTF.preload('/models/vehicles_and_flora.glb');

// 1. TACTICAL HOLOGRAM OF USER'S .GLB (18,048 Real Colored Vertices in S0 Observatory)
const GlbTacticalHologram: React.FC = () => {
  const groupRef = useRef<THREE.Group>(null);
  const [geom, setGeom] = useState<THREE.BufferGeometry | null>(null);

  useEffect(() => {
    let cancelled = false;
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

        const g = new THREE.BufferGeometry();
        const pos = new Float32Array(data.positions);
        const cols = new Float32Array(data.positions.length);
        const uvs: number[] = data.uvs;

        for (let i = 0; i < data.count; i++) {
          const u = Math.min(w - 1, Math.max(0, Math.floor(uvs[i * 2] * w)));
          const v = Math.min(h - 1, Math.max(0, Math.floor((1 - uvs[i * 2 + 1]) * h)));
          if (px) {
            const idx = (v * w + u) * 4;
            cols[i * 3] = Math.min(1, (px[idx] / 255) * 1.15 + 0.14);
            cols[i * 3 + 1] = Math.min(1, (px[idx + 1] / 255) * 1.15 + 0.1);
            cols[i * 3 + 2] = Math.min(1, (px[idx + 2] / 255) * 1.05 + 0.05);
          } else {
            cols[i * 3] = 0.95;
            cols[i * 3 + 1] = 0.78;
            cols[i * 3 + 2] = 0.38;
          }
        }
        g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
        g.setAttribute('color', new THREE.BufferAttribute(cols, 3));
        setGeom(g);
      })
      .catch(() => {});
    return () => {
      cancelled = true;
    };
  }, []);

  useFrame((_, dt) => {
    if (groupRef.current) groupRef.current.rotation.y += dt * 0.18;
  });

  return (
    <group position={[0, 9.6, 0]}>
      <mesh position={[0, -0.55, 0]} material={SHARED_MATERIALS.royalMarble} castShadow receiveShadow>
        <cylinderGeometry args={[2.9, 3.3, 0.9, 36]} />
      </mesh>
      <mesh position={[0, -0.05, 0]} rotation={[Math.PI / 2, 0, 0]} material={SHARED_MATERIALS.abbassidGold}>
        <torusGeometry args={[2.95, 0.08, 12, 48]} />
      </mesh>
      <group ref={groupRef} scale={[5.4, 5.4, 5.4]} position={[0, 0.75, 0]}>
        {geom && (
          <points geometry={geom}>
            <pointsMaterial size={0.055} vertexColors transparent opacity={0.94} />
          </points>
        )}
      </group>
      <Billboard position={[0, 2.35, 0]}>
        <Text fontSize={0.32} color="#fde68a" outlineWidth={0.03} outlineColor="#0f172a" anchorX="center" anchorY="middle">
          MAQUETTE HOLOGRAPHIQUE .GLB (18 048 PTS · [4] VUE PLEINE)
        </Text>
      </Billboard>
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
    <group name="Ring0_BaytAlHikma">
      <primitive object={domeObj} />

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
        <Text position={[0, 2.55, 0]} fontSize={0.36} color="#fef3c7" anchorX="center" anchorY="middle">
          {escrowSignedCount > 0
            ? `CHAMBRE ESCROW S0 · ${escrowSignedCount} VISA(S) SCELLÉ(S)`
            : '⚡ ESCROW S0 (>10k€) · [E] SIGNER'}
        </Text>
      </group>

      {/* Ground Floor CEO Executive Station (A0 Amadeus) */}
      <group position={[0, 0.45, -14.5]}>
        <mesh position={[0, 3.4, -3.6]}>
          <boxGeometry args={[14.5, 4.4, 0.3]} />
          <meshStandardMaterial color="#0f172a" roughness={0.18} metalness={0.6} />
        </mesh>
        <mesh position={[0, 3.4, -3.44]}>
          <planeGeometry args={[13.8, 3.8]} />
          <meshStandardMaterial color="#082f49" emissive="#0369a1" emissiveIntensity={0.45} />
        </mesh>
        <Text position={[0, 4.4, -3.35]} fontSize={0.55} color="#fde68a" anchorX="center">
          BAYT AL-HIKMA · MISSION CONTROL (A0 AMADEUS × SUMMERS)
        </Text>
        <Text position={[0, 3.25, -3.35]} fontSize={0.35} color="#5eead4" anchorX="center">
          578 HOLONS · 8 PAVILLONS APPLE PARK × BAGDAD · BRIDGE 11ms · SOC2
        </Text>

        {/* Sculpted Cedar & Gold Executive Desk */}
        <mesh position={[0, 0.52, 0]} material={SHARED_MATERIALS.warmCedar} castShadow receiveShadow>
          <boxGeometry args={[4.8, 0.92, 1.8]} />
        </mesh>
        <mesh position={[0, 0.99, 0]} material={SHARED_MATERIALS.abbassidGold}>
          <boxGeometry args={[4.86, 0.05, 1.86]} />
        </mesh>

        {/* CEO Articulated Character */}
        <group position={[0, 0.02, -1.25]}>
          <ArticulatedCharacter
            tunicColor="#1e3a8a"
            accentColor="#e0aa42"
            skinColor="#8d5524"
            mode="idle"
            withCape
            withSolarVisor
          />
          <Billboard position={[0, 2.25, 0]}>
            <Text fontSize={0.36} color="#fde68a" outlineWidth={0.03} outlineColor="#0f172a" anchorX="center">
              CEO A0 AMADEUS · [P] SMARTPHONE
            </Text>
          </Billboard>
        </group>
      </group>

      {/* Golden Merge Gong */}
      <group position={[14, 0.45, 6]}>
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
        <Billboard position={[0, 4.1, 0]}>
          <Text fontSize={0.34} color="#fde68a" outlineWidth={0.03} outlineColor="#0f172a" anchorX="center">
            {`GONG DE MERGE (${gongRings}) · [E] FRAPPER`}
          </Text>
        </Billboard>
      </group>

      {/* Recruitment Lounge with Real Articulated Candidates */}
      <group position={[-14, 0.45, 6]}>
        <Billboard position={[0, 3.1, 0]}>
          <Text fontSize={0.35} color="#67e8f9" outlineWidth={0.03} outlineColor="#0f172a" anchorX="center">
            SALON RECRUTEMENT IA · [E] EMBAUCHER
          </Text>
        </Billboard>
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
                <Billboard position={[0, 2.05, 0]}>
                  <Text fontSize={0.23} color="#ffffff" outlineWidth={0.025} outlineColor="#0f172a" anchorX="center">
                    {r.name}
                  </Text>
                </Billboard>
              </group>
            ) : (
              <Billboard position={[0, 1.0, 0]}>
                <Text fontSize={0.22} color="#34d399" outlineWidth={0.025} outlineColor="#0f172a" anchorX="center">
                  EN POSTE ✓
                </Text>
              </Billboard>
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
    const isNight = solarHour < 5.5 || solarHour > 20.2;
    waterMat.uniforms.uNightFactor.value = THREE.MathUtils.lerp(
      waterMat.uniforms.uNightFactor.value,
      isNight ? 0.85 : 0.0,
      0.05,
    );
  });

  return (
    <group name="Ring1_LagoonAndBridges">
      {/* Lagoon Basin */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -1.15, 0]}>
        <ringGeometry args={[41.5, 76.5, 80]} />
        <meshStandardMaterial color="#0b5552" roughness={0.9} />
      </mesh>
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.3, 0]} material={waterMat}>
        <ringGeometry args={[41.8, 76.2, 96, 8]} />
      </mesh>
      <mesh position={[0, -0.5, 0]} material={SHARED_MATERIALS.limestone} receiveShadow>
        <cylinderGeometry args={[76.8, 76.0, 1.3, 80, 1, true]} />
      </mesh>

      {/* 4 Sculpted 3-Arch Stone Bridges */}
      {bridges.map((b, i) => (
        <primitive key={i} object={b} />
      ))}

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
        <primitive object={royalGate} />
        <group position={[-9.5, 0.25, 14]} scale={[1.22, 1.22, 1.22]}>
          <primitive object={gateOliveLeft} />
        </group>
        <group position={[9.5, 0.25, 14]} scale={[1.22, 1.22, 1.22]}>
          <primitive object={gateOliveRight} />
        </group>
        <Text position={[0, 13.6, 2.6]} fontSize={0.85} color="#fef3c7" outlineWidth={0.045} outlineColor="#0f172a" anchorX="center" anchorY="middle">
          MADINAT ASPACE · BAYT AL-HIKMA
        </Text>
      </group>

      {/* North Royal Gate Mirror */}
      <group position={[0, 0, -158]} rotation={[0, Math.PI, 0]}>
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
      <primitive object={sectorMesh} />

      {/* Department Overhead Banner facing inner Lagoon & outer Boulevard */}
      <group position={[98, 0, 0]} rotation={[0, -Math.PI / 2, 0]}>
        <Text position={[0, 6.2, 13.8]} fontSize={0.62} color={dept.color} anchorX="center">
          {`${dept.code} · ${dept.name.toUpperCase()}`}
        </Text>
        <Text position={[0, 6.2, -13.8]} rotation={[0, Math.PI, 0]} fontSize={0.62} color={dept.color} anchorX="center">
          {`${dept.name.toUpperCase()} · VP ${dept.vpName.toUpperCase()}`}
        </Text>

        {hasPendingHuman && (
          <group position={[0, 14.5, 0]}>
            <mesh>
              <cylinderGeometry args={[0.25, 0.75, 16, 16, 1, true]} />
              <meshBasicMaterial color="#f59e0b" transparent opacity={0.28} side={THREE.DoubleSide} />
            </mesh>
            <Text position={[0, 9.2, 0]} fontSize={0.75} color="#fde047" anchorX="center">
              🙋 VALIDATION S0 REQUISE [N / E]
            </Text>
          </group>
        )}

        {/* Central Interactive Department Lectern */}
        <group position={[0, 0.28, 0]}>
          <mesh position={[0, 0.6, 0]} material={SHARED_MATERIALS.abbassidGold} castShadow>
            <cylinderGeometry args={[0.75, 1.0, 1.2, 20]} />
          </mesh>
          <mesh position={[0, 1.55, 0]}>
            <octahedronGeometry args={[0.42, 0]} />
            <meshStandardMaterial color={dept.color} emissive={dept.color} emissiveIntensity={0.9} />
          </mesh>
          <Billboard position={[0, 2.2, 0]}>
            <Text fontSize={0.28} color="#ffffff" outlineWidth={0.03} outlineColor="#0f172a" anchorX="center">
              {`[E] EXPLOITER ${dept.appSlug.toUpperCase()} (${dept.opsPerSec})`}
            </Text>
          </Billboard>
        </group>

        {/* Furnished Workstations with Articulated Agents Typing / Waving */}
        {dept.streams.map((st, sIdx) => {
          const dx = (sIdx - (dept.streams.length - 1) / 2) * 6.8;
          const needs = st.needsHuman && !resolvedNeedsIds.includes(st.id);
          return (
            <group key={st.id} position={[dx, 0.28, -5.2]}>
              {/* Cedar Desk + Dual Monitor */}
              <mesh position={[0, 0.42, 0]} material={SHARED_MATERIALS.warmCedar} castShadow receiveShadow>
                <boxGeometry args={[2.5, 0.78, 1.15]} />
              </mesh>
              <mesh position={[0, 1.05, -0.2]} rotation={[-0.12, 0, 0]}>
                <boxGeometry args={[1.1, 0.62, 0.05]} />
                <meshStandardMaterial color="#020617" emissive={needs ? '#ef4444' : dept.color} emissiveIntensity={0.65} />
              </mesh>
              {/* Chair + Articulated Worker */}
              <group position={[0, 0.05, 0.88]}>
                <mesh position={[0, 0.24, 0.08]} material={SHARED_MATERIALS.royalMarble}>
                  <boxGeometry args={[0.55, 0.46, 0.55]} />
                </mesh>
                <ArticulatedCharacter
                  tunicColor={needs ? '#dc2626' : dept.color}
                  accentColor="#d8a13b"
                  skinColor={sIdx % 2 === 0 ? '#c68642' : '#f1c27d'}
                  mode={needs ? 'needsYou' : 'typing'}
                  phaseOffset={sIdx * 1.9 + dept.sectorIndex}
                />
                <Billboard position={[0, 1.9, 0]}>
                  <Text fontSize={0.24} color={needs ? '#fecaca' : '#f8fafc'} outlineWidth={0.025} outlineColor="#0f172a" anchorX="center">
                    {`${st.agentName.split('//')[0].trim()} · ${needs ? '🙋 NEEDS YOU' : st.statusLabel}`}
                  </Text>
                </Billboard>
              </group>
            </group>
          );
        })}
      </group>

      {/* MARIO-64 PORTAL PAINTINGS WALL IN FORGE R&D (dept.id === 'rd') */}
      {dept.id === 'rd' && (
        <group position={[89, 2.4, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Text position={[0, 2.4, 0]} fontSize={0.44} color="#93c5fd" anchorX="center">
            GALERIE DES TABLEAUX-PORTAILS 3D (APPROCHER & [E] POUR ENTRER)
          </Text>
          {PORTAL_GAMES.map((pg, pIdx) => (
            <group key={pg.id} position={[(pIdx - 1) * 7.5, 0, 0]}>
              <mesh material={SHARED_MATERIALS.abbassidGold} castShadow>
                <boxGeometry args={[4.6, 3.2, 0.24]} />
              </mesh>
              <mesh position={[0, 0, 0.14]}>
                <planeGeometry args={[4.0, 2.7]} />
                <meshStandardMaterial color={pg.skyBottom} emissive={pg.accent} emissiveIntensity={0.75} />
              </mesh>
              <Text position={[0, 0.35, 0.22]} fontSize={0.28} color="#0f172a" anchorX="center">
                {pg.title}
              </Text>
              <Text position={[0, -0.35, 0.22]} fontSize={0.2} color="#1e293b" anchorX="center">
                [E] ENTRER DANS LE JEU
              </Text>
            </group>
          ))}
        </group>
      )}
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

  // 14 Real Sculpted Supercars for Ring 3 Autonomous Traffic!
  const trafficCars = useMemo(() => {
    const bodyProto = vehScene.getObjectByName('Supercar');
    const wheelNames = ['Wheel_FL', 'Wheel_FR', 'Wheel_RL', 'Wheel_RR'];
    const wheelProtos = wheelNames.map((n) => vehScene.getObjectByName(n));
    const paintColors = ['#e5a92b', '#faf5eb', '#14b8a6', '#2563eb'];

    return Array.from({ length: 14 }).map((_, i) => {
      const g = new THREE.Group();
      const customPaint = new THREE.MeshPhysicalMaterial({
        color: paintColors[i % paintColors.length],
        roughness: 0.16,
        metalness: 0.82,
        clearcoat: 1.0,
      });
      if (bodyProto) {
        g.add(applySolarpunkMaterials(bodyProto.clone(true), { CarPaint: customPaint }));
      }
      wheelProtos.forEach((wp) => {
        if (wp) g.add(applySolarpunkMaterials(wp.clone(true)));
      });
      return {
        obj: g,
        angle: (i / 14) * Math.PI * 2,
        r: i % 2 === 0 ? 129.5 : 137.5,
      };
    });
  }, [vehScene]);

  const trafficRef = useRef<THREE.Group>(null);
  const tramRef = useRef<THREE.Group>(null);

  useFrame((_, dt) => {
    const speedMult = timelapseSpeed === 600 ? 18 : timelapseSpeed === 60 ? 5 : 1;
    tickBlueprintConstruction(dt * speedMult);
    tickRogueDrone(dt);

    if (timelapseSpeed > 0) {
      setSolarHour(solarHour + dt * (timelapseSpeed === 600 ? 2.4 : 0.45));
    }
    if (trafficRef.current) trafficRef.current.rotation.y += dt * 0.08 * speedMult;
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

      {/* Desert Golden Dune Horizon + Stepped Circular City Plinth (Radius 224m) */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.25, 0]} receiveShadow>
        <planeGeometry args={[1800, 1800]} />
        <meshStandardMaterial color="#eddcb9" roughness={0.94} />
      </mesh>
      <mesh position={[0, -0.1, 0]} material={SHARED_MATERIALS.warmSandstone} receiveShadow>
        <cylinderGeometry args={[224, 228, 0.28, 96]} />
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

      {/* Autonomous Sculpted Supercar Traffic on Ring 3 */}
      <group ref={trafficRef}>
        {trafficCars.map((c, idx) => (
          <group
            key={idx}
            position={[Math.cos(c.angle) * c.r, 0.08, Math.sin(c.angle) * c.r]}
            rotation={[0, -c.angle, 0]}
          >
            <primitive object={c.obj} />
          </group>
        ))}
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
          <Billboard position={[0, 2.0, 0]}>
            <Text fontSize={0.42} color="#fde68a" outlineWidth={0.03} outlineColor="#0f172a" anchorX="center">
              TRAMWAY SOLAIRE · [E] MONTER
            </Text>
          </Billboard>
        </group>
      </group>

      {/* Ring 4 — Continuous Stepped Outer Solarpunk Crown (4 Curved 70° Sectors) */}
      {outerCrownArcs.map((arc, i) => (
        <primitive key={i} object={arc} />
      ))}

      {/* Rogue Phantom AI Drone Mission 04 */}
      {!rogueDroneNeutralized && (
        <group position={[rogueX, 2.8, rogueZ]}>
          <mesh>
            <octahedronGeometry args={[1.3, 1]} />
            <meshStandardMaterial color="#ef4444" emissive="#dc2626" emissiveIntensity={1.4} />
          </mesh>
          <Billboard position={[0, 2.3, 0]}>
            <Text fontSize={0.55} color="#fecaca" outlineWidth={0.03} outlineColor="#0f172a" anchorX="center">
              ⚠️ DRONE IA FANTÔME (04 // DÉRIVE) · [E] INTERCEPTER
            </Text>
          </Billboard>
        </group>
      )}

      {/* Grand Souk Bazaar on South-East Esplanade [138, 0, 138] */}
      <group position={[138, 0, 138]} rotation={[0, -Math.PI * 0.75, 0]}>
        <primitive object={soukObj} />
        <Billboard position={[0, 11.2, 0]}>
          <Text fontSize={0.78} color="#fde68a" outlineWidth={0.04} outlineColor="#0f172a" anchorX="center">
            GRAND SOUK ASPACE MARKETPLACE · [E] ASSEMBLER UN BLUEPRINT
          </Text>
        </Billboard>
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
          <group key={bp.id} position={[vx, 0, vz]} rotation={[0, rad - Math.PI / 2, 0]}>
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
                <mesh position={[0, 2.4, 0]}>
                  <boxGeometry args={[17, 4, 15]} />
                  <meshBasicMaterial color={bp.accentColor} wireframe transparent opacity={0.38} />
                </mesh>
                <Text position={[0, 5.5, 0]} fontSize={0.5} color="#fde68a" anchorX="center">
                  {`PARCELLE BLUEPRINT : ${bp.title}`}
                </Text>
              </group>
            )}
          </group>
        );
      })}

      {/* User-Spawned Live Architect Structures ([B] / Voice) */}
      {spawnedStructures.map((st) => (
        <group key={st.id} position={st.position} rotation={[0, st.rotationY, 0]}>
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

      // 2. Lush Mediterranean Olive Orchards (Apple Park vibe!) on r=80m, r=116m, r=182m + Roof Terraces
      const oliveRings = [
        { r: 80.5, count: 48, y: 0.1 },
        { r: 116.5, count: 72, y: 0.1 },
        { r: 183.0, count: 96, y: 0.1 },
        { r: 109.5, count: 40, y: 5.95 }, // Rooftop Terrace Orchards on Ring 2!
        { r: 151.5, count: 48, y: 5.95 }, // Rooftop Terrace Orchards on Ring 4!
      ];
      oliveRings.forEach((ring, ri) => {
        for (let i = 0; i < ring.count; i++) {
          const a = (i / ring.count) * Math.PI * 2 + ri * 0.17;
          const deg = ((a * 180) / Math.PI) % 90;
          if (deg < 8 || deg > 82) continue;
          olives.push({
            x: Math.cos(a) * ring.r,
            y: ring.y,
            z: Math.sin(a) * ring.r,
            s: ring.y > 1 ? 0.52 : 0.95 + (i % 3) * 0.15,
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
