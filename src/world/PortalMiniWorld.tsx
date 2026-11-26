import React, { useRef } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Text, useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { PORTAL_GAMES } from '../data/madinatOntology';
import { useWorldStore } from '../store/useWorldStore';
import { PostEffects } from './PostEffects';

// A. SPELLTHORN MARIO-64 PORTAL SUB-WORLD
export const PortalMiniWorldCanvas: React.FC<{ portalId: string }> = ({ portalId }) => {
  const spec = PORTAL_GAMES.find((p) => p.id === portalId) ?? PORTAL_GAMES[0];
  const enterPortal = useWorldStore((s) => s.enterPortal);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: spec.skyTop }}>
      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 24,
          zIndex: 30,
          background: 'rgba(15, 23, 42, 0.86)',
          border: `1px solid ${spec.accent}`,
          borderRadius: 14,
          padding: '14px 20px',
          maxWidth: 460,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ fontSize: 11, color: spec.accent, fontWeight: 700, letterSpacing: 1.2 }}>
          PORTAIL ENFANT ISOLÉ (`ThreeProgramApp`)
        </div>
        <div style={{ fontSize: 20, fontWeight: 800, marginTop: 4 }}>{spec.title}</div>
        <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6, lineHeight: 1.45 }}>{spec.description}</div>
        <button
          onClick={() => enterPortal(null)}
          style={{
            marginTop: 12,
            background: spec.accent,
            color: '#0f172a',
            border: 'none',
            borderRadius: 8,
            padding: '8px 14px',
            fontWeight: 700,
            cursor: 'pointer',
          }}
        >
          ← Quitter le Portail & Revenir à la Forge R&D [Échap]
        </button>
      </div>

      <Canvas camera={{ position: [0, 12, 26], fov: 50 }}>
        <color attach="background" args={[spec.skyTop]} />
        <fog attach="fog" args={[spec.skyBottom, 30, 160]} />
        <ambientLight intensity={0.8} />
        <directionalLight position={[20, 40, 20]} intensity={1.5} />
        <gridHelper args={[160, 40, spec.accent, spec.gridColor]} />
        <PortalAnimatedArtefacts id={spec.id} accent={spec.accent} />
        <OrbitControls makeDefault maxPolarAngle={Math.PI / 2.05} />
      </Canvas>
    </div>
  );
};

const PortalAnimatedArtefacts: React.FC<{ id: string; accent: string }> = ({ id, accent }) => {
  const ref = useRef<THREE.Group>(null);
  useFrame((_, dt) => {
    if (ref.current) ref.current.rotation.y += dt * 0.35;
  });

  return (
    <group ref={ref}>
      {Array.from({ length: 8 }).map((_, i) => {
        const a = (i / 8) * Math.PI * 2;
        return (
          <group key={i} position={[Math.cos(a) * 14, 3.5, Math.sin(a) * 14]} rotation={[0, -a, 0]}>
            <mesh>
              <torusGeometry args={[2.6, 0.22, 16, 40]} />
              <meshStandardMaterial color={accent} emissive={accent} emissiveIntensity={0.6} />
            </mesh>
          </group>
        );
      })}
      <mesh position={[0, 4.5, 0]}>
        <icosahedronGeometry args={[3.2, 1]} />
        <meshStandardMaterial color="#fde68a" metalness={0.85} roughness={0.15} wireframe={id === 'bayt-astronomy'} />
      </mesh>
      <Text position={[0, 9.2, 0]} fontSize={0.9} color="#ffffff" anchorX="center">
        {id.toUpperCase()} · SANDBOX 3D LIVE
      </Text>
    </group>
  );
};

// B. CLEAN PBR INSPECTOR OF THE USER'S ORIGINAL .GLB FILE (/city_source.glb) — ZERO CLIPPING OVERLAYS
const RawGlbModelEnhanced: React.FC = () => {
  const gltf = useGLTF('/city_source.glb');

  React.useEffect(() => {
    gltf.scene.traverse((obj) => {
      if ((obj as THREE.Mesh).isMesh) {
        const m = obj as THREE.Mesh;
        m.castShadow = true;
        m.receiveShadow = true;
        if (m.material && (m.material as THREE.MeshStandardMaterial).isMeshStandardMaterial) {
          const std = m.material as THREE.MeshStandardMaterial;
          std.roughness = 0.54;
          std.metalness = 0.14;
          std.needsUpdate = true;
        }
      }
    });
    (window as unknown as Record<string, unknown>).__madinatGlbLoaded = true;
    return () => {
      delete (window as unknown as Record<string, unknown>).__madinatGlbLoaded;
    };
  }, [gltf]);

  return (
    <group>
      <group scale={[180, 180, 180]} position={[0, 0.6, 0]}>
        <primitive object={gltf.scene} />
      </group>
      {/* Clean Golden Sand Base beneath the Maquette */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -18.5, 0]} receiveShadow>
        <circleGeometry args={[320, 64]} />
        <meshStandardMaterial color="#eddcb9" roughness={0.94} />
      </mesh>
    </group>
  );
};

export const GlbMasterpieceInspectorView: React.FC = () => {
  const setInterfaceMode = useWorldStore((s) => s.setInterfaceMode);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative', background: '#f5ebd6' }}>
      <div
        style={{
          position: 'absolute',
          top: 76,
          left: 24,
          zIndex: 30,
          background: 'rgba(15, 23, 42, 0.88)',
          border: '1px solid rgba(212, 162, 76, 0.55)',
          borderRadius: 14,
          padding: '16px 20px',
          maxWidth: 470,
          backdropFilter: 'blur(12px)',
        }}
      >
        <div style={{ fontSize: 11, color: '#fbbf24', fontWeight: 700, letterSpacing: 1.1 }}>
          INSPECTEUR DIRECT DE TON FICHIER .GLB (1 453 978 TRIANGLES)
        </div>
        <div style={{ fontSize: 18, fontWeight: 800, marginTop: 4 }}>
          Maquette Tripo3D Originale Ré-Éclairée (HDRI + N8AO)
        </div>
        <div style={{ fontSize: 12, color: '#cbd5e1', marginTop: 6, lineHeight: 1.5 }}>
          Ton fichier <code>e73fec89-..._0.glb</code> brut sans aucun artefact superposé, éclairé par l’HDRI désertique et l’occlusion ambiante. Bascule sur <strong>[3] 3D GTA Solarpunk</strong> pour explorer la version modulaire reconstruite et entrable !
        </div>
        <button
          onClick={() => setInterfaceMode('world3d')}
          style={{
            marginTop: 12,
            background: 'linear-gradient(135deg, #f59e0b, #d97706)',
            color: '#0f172a',
            border: 'none',
            borderRadius: 8,
            padding: '9px 15px',
            fontWeight: 800,
            cursor: 'pointer',
          }}
        >
          Explorer la Cité Reconstruite [3] →
        </button>
      </div>

      <Canvas shadows camera={{ position: [0, 88, 138], fov: 42 }}>
        <color attach="background" args={['#f5ebd6']} />
        <fog attach="fog" args={['#f5ebd6', 200, 520]} />
        <ambientLight intensity={0.75} color="#fffbeb" />
        <directionalLight position={[90, 120, 70]} intensity={2.2} color="#fde68a" castShadow />
        <React.Suspense
          fallback={
            <Text position={[0, 0, 0]} fontSize={4} color="#d97706">
              Chargement des 1,45M triangles du fichier .GLB...
            </Text>
          }
        >
          <RawGlbModelEnhanced />
        </React.Suspense>
        <PostEffects />
        <OrbitControls makeDefault minDistance={25} maxDistance={280} maxPolarAngle={Math.PI / 2.08} />
      </Canvas>
    </div>
  );
};
