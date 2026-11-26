import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export type CharacterPoseMode = 'idle' | 'walk' | 'run' | 'typing' | 'needsYou' | 'cheer';

interface ArticulatedCharacterProps {
  tunicColor?: string;
  accentColor?: string;
  skinColor?: string;
  hairColor?: string;
  mode?: CharacterPoseMode;
  phaseOffset?: number;
  withCape?: boolean;
  withSolarVisor?: boolean;
}

const HAIR_PALETTES = ['#1e293b', '#451a03', '#78350f', '#0f172a', '#92400e'];

export const ArticulatedCharacter: React.FC<ArticulatedCharacterProps> = ({
  tunicColor = '#0d9488',
  accentColor = '#d8a13b',
  skinColor = '#c68642',
  hairColor,
  mode = 'idle',
  phaseOffset = 0,
  withCape = false,
  withSolarVisor = false,
}) => {
  const bodyRef = useRef<THREE.Group>(null);
  const headRef = useRef<THREE.Group>(null);
  const armLRef = useRef<THREE.Group>(null);
  const armRRef = useRef<THREE.Group>(null);
  const foreLRef = useRef<THREE.Group>(null);
  const foreRRef = useRef<THREE.Group>(null);
  const legLRef = useRef<THREE.Group>(null);
  const legRRef = useRef<THREE.Group>(null);
  const kneeLRef = useRef<THREE.Group>(null);
  const kneeRRef = useRef<THREE.Group>(null);

  const variant = useMemo(() => {
    const idx = Math.floor(Math.abs(phaseOffset) * 3.7 + 0.5) % 5;
    return {
      hairStyle: idx, // 0: sidePart, 1: bun, 2: afro, 3: bob, 4: quiff
      resolvedHair: hairColor ?? HAIR_PALETTES[idx],
    };
  }, [phaseOffset, hairColor]);

  useFrame(({ clock }) => {
    const t = clock.getElapsedTime() + phaseOffset;
    const armL = armLRef.current;
    const armR = armRRef.current;
    const foreL = foreLRef.current;
    const foreR = foreRRef.current;
    const legL = legLRef.current;
    const legR = legRRef.current;
    const kneeL = kneeLRef.current;
    const kneeR = kneeRRef.current;
    const body = bodyRef.current;
    const head = headRef.current;
    if (!armL || !armR || !foreL || !foreR || !legL || !legR || !kneeL || !kneeR || !body || !head) return;

    if (mode === 'walk' || mode === 'run') {
      const freq = mode === 'run' ? 11.5 : 7.0;
      const amp = mode === 'run' ? 0.76 : 0.48;
      const s = Math.sin(t * freq);
      legL.rotation.x = s * amp;
      legR.rotation.x = -s * amp;
      kneeL.rotation.x = Math.max(0, -s) * 0.45;
      kneeR.rotation.x = Math.max(0, s) * 0.45;
      armL.rotation.x = -s * amp * 0.8;
      armR.rotation.x = s * amp * 0.8;
      foreL.rotation.x = -0.35;
      foreR.rotation.x = -0.35;
      armL.rotation.z = 0.06;
      armR.rotation.z = -0.06;
      body.position.y = Math.abs(Math.cos(t * freq)) * (mode === 'run' ? 0.07 : 0.035);
      body.rotation.x = mode === 'run' ? 0.1 : 0.03;
      head.rotation.x = 0;
      head.rotation.y = 0;
    } else if (mode === 'typing') {
      // Proper ergonomic sitting pose: hips on chair cushion (~0.51), thighs horizontal, shins vertical down to floor
      body.position.y = -0.2;
      body.rotation.x = 0.08;
      legL.rotation.x = -1.48;
      legR.rotation.x = -1.48;
      kneeL.rotation.x = 1.48;
      kneeR.rotation.x = 1.48;
      armL.rotation.x = -0.45 + Math.sin(t * 16) * 0.06;
      armR.rotation.x = -0.45 + Math.cos(t * 18) * 0.06;
      foreL.rotation.x = -0.95 + Math.sin(t * 22) * 0.12;
      foreR.rotation.x = -0.95 + Math.cos(t * 21) * 0.12;
      armL.rotation.z = -0.14;
      armR.rotation.z = 0.14;
      head.rotation.x = 0.09 + Math.sin(t * 2.2) * 0.03;
      head.rotation.y = Math.sin(t * 0.7) * 0.08;
    } else if (mode === 'needsYou') {
      body.position.y = Math.abs(Math.sin(t * 4.2)) * 0.06;
      body.rotation.x = 0;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      kneeL.rotation.x = 0;
      kneeR.rotation.x = 0;
      armL.rotation.x = 0;
      armL.rotation.z = 0.1;
      foreL.rotation.x = -0.15;
      armR.rotation.x = -2.5;
      foreR.rotation.x = -0.25 + Math.sin(t * 9.0) * 0.25;
      armR.rotation.z = -0.3 + Math.sin(t * 8.0) * 0.25;
      head.rotation.x = -0.05;
      head.rotation.y = Math.sin(t * 1.4) * 0.15;
    } else if (mode === 'cheer') {
      body.position.y = Math.abs(Math.sin(t * 6)) * 0.12;
      body.rotation.x = 0;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      kneeL.rotation.x = 0;
      kneeR.rotation.x = 0;
      armL.rotation.x = -2.55;
      armR.rotation.x = -2.55;
      foreL.rotation.x = -0.2;
      foreR.rotation.x = -0.2;
      armL.rotation.z = 0.35;
      armR.rotation.z = -0.35;
      head.rotation.y = 0;
    } else {
      body.position.y = Math.sin(t * 2.2) * 0.012;
      body.rotation.x = 0;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      kneeL.rotation.x = 0;
      kneeR.rotation.x = 0;
      armL.rotation.x = Math.sin(t * 2.2) * 0.03;
      armR.rotation.x = -Math.sin(t * 2.2) * 0.03;
      foreL.rotation.x = -0.15;
      foreR.rotation.x = -0.15;
      armL.rotation.z = 0.06;
      armR.rotation.z = -0.06;
      head.rotation.y = Math.sin(t * 0.8) * 0.14;
      head.rotation.x = 0;
    }
  });

  const jacketColor = tunicColor;
  const pantColor = '#1e293b';

  return (
    <group ref={bodyRef}>
      {/* Left & Right Articulated Two-Segment Legs (Hip y=0.72 -> Knee -0.34 -> Foot -0.34) */}
      <group ref={legLRef} position={[-0.105, 0.72, 0]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <capsuleGeometry args={[0.082, 0.22, 6, 10]} />
          <meshStandardMaterial color={pantColor} roughness={0.72} />
        </mesh>
        <group ref={kneeLRef} position={[0, -0.34, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.072, 0.2, 6, 10]} />
            <meshStandardMaterial color={pantColor} roughness={0.74} />
          </mesh>
          <mesh position={[0, -0.33, -0.04]} castShadow>
            <boxGeometry args={[0.14, 0.09, 0.24]} />
            <meshStandardMaterial color="#3b2618" roughness={0.55} />
          </mesh>
        </group>
      </group>

      <group ref={legRRef} position={[0.105, 0.72, 0]}>
        <mesh position={[0, -0.17, 0]} castShadow>
          <capsuleGeometry args={[0.082, 0.22, 6, 10]} />
          <meshStandardMaterial color={pantColor} roughness={0.72} />
        </mesh>
        <group ref={kneeRRef} position={[0, -0.34, 0]}>
          <mesh position={[0, -0.16, 0]} castShadow>
            <capsuleGeometry args={[0.072, 0.2, 6, 10]} />
            <meshStandardMaterial color={pantColor} roughness={0.74} />
          </mesh>
          <mesh position={[0, -0.33, -0.04]} castShadow>
            <boxGeometry args={[0.14, 0.09, 0.24]} />
            <meshStandardMaterial color="#3b2618" roughness={0.55} />
          </mesh>
        </group>
      </group>

      {/* Tailored Jacket Torso (rounded capsule — NO ugly neck donut!) */}
      <mesh position={[0, 1.04, 0]} scale={[1.08, 1.0, 0.76]} castShadow>
        <capsuleGeometry args={[0.21, 0.34, 8, 14]} />
        <meshStandardMaterial color={jacketColor} roughness={0.48} />
      </mesh>

      {/* Crisp Inner Shirt V-Collar & Tailored Chest Details */}
      <mesh position={[0, 1.24, -0.14]} rotation={[0.18, 0, 0]}>
        <boxGeometry args={[0.13, 0.18, 0.04]} />
        <meshStandardMaterial color="#f8fafc" roughness={0.65} />
      </mesh>
      <mesh position={[-0.065, 1.21, -0.145]} rotation={[0.12, 0, -0.22]}>
        <boxGeometry args={[0.055, 0.22, 0.03]} />
        <meshStandardMaterial color={jacketColor} roughness={0.4} />
      </mesh>
      <mesh position={[0.065, 1.21, -0.145]} rotation={[0.12, 0, 0.22]}>
        <boxGeometry args={[0.055, 0.22, 0.03]} />
        <meshStandardMaterial color={jacketColor} roughness={0.4} />
      </mesh>

      {/* Gold Belt & ID Lanyard Badge */}
      <mesh position={[0, 0.77, 0]} scale={[1.08, 1.0, 0.78]}>
        <cylinderGeometry args={[0.205, 0.205, 0.065, 16]} />
        <meshStandardMaterial color="#334155" roughness={0.5} />
      </mesh>
      <mesh position={[0, 0.77, -0.165]}>
        <boxGeometry args={[0.08, 0.055, 0.025]} />
        <meshStandardMaterial color={accentColor} metalness={0.85} roughness={0.22} />
      </mesh>
      <mesh position={[0.07, 1.02, -0.165]}>
        <boxGeometry args={[0.075, 0.1, 0.015]} />
        <meshStandardMaterial color="#ffffff" roughness={0.35} />
      </mesh>

      {withCape && (
        <mesh position={[0, 0.99, 0.19]} rotation={[0.12, 0, 0]} castShadow>
          <boxGeometry args={[0.42, 0.68, 0.03]} />
          <meshStandardMaterial color={accentColor} roughness={0.4} metalness={0.55} />
        </mesh>
      )}

      {/* Left & Right Articulated Two-Segment Arms */}
      <group ref={armLRef} position={[-0.27, 1.28, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.062, 0.16, 6, 10]} />
          <meshStandardMaterial color={jacketColor} roughness={0.48} />
        </mesh>
        <group ref={foreLRef} position={[0, -0.24, 0]}>
          <mesh position={[0, -0.11, 0]} castShadow>
            <capsuleGeometry args={[0.054, 0.15, 6, 10]} />
            <meshStandardMaterial color={jacketColor} roughness={0.48} />
          </mesh>
          <mesh position={[0, -0.23, 0]} castShadow>
            <sphereGeometry args={[0.058, 10, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        </group>
      </group>

      <group ref={armRRef} position={[0.27, 1.28, 0]}>
        <mesh position={[0, -0.12, 0]} castShadow>
          <capsuleGeometry args={[0.062, 0.16, 6, 10]} />
          <meshStandardMaterial color={jacketColor} roughness={0.48} />
        </mesh>
        <group ref={foreRRef} position={[0, -0.24, 0]}>
          <mesh position={[0, -0.11, 0]} castShadow>
            <capsuleGeometry args={[0.054, 0.15, 6, 10]} />
            <meshStandardMaterial color={jacketColor} roughness={0.48} />
          </mesh>
          <mesh position={[0, -0.23, 0]} castShadow>
            <sphereGeometry args={[0.058, 10, 10]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        </group>
      </group>

      {/* Expressive Sculpted Head + Ears + Hairstyles + Optional Studio Headphones */}
      <group ref={headRef} position={[0, 1.54, 0]}>
        <mesh position={[0, -0.14, 0]}>
          <cylinderGeometry args={[0.068, 0.078, 0.12, 10]} />
          <meshStandardMaterial color={skinColor} roughness={0.5} />
        </mesh>
        <mesh scale={[0.96, 1.03, 0.96]} castShadow>
          <sphereGeometry args={[0.19, 18, 16]} />
          <meshStandardMaterial color={skinColor} roughness={0.48} />
        </mesh>
        {/* Ears */}
        {[-0.185, 0.185].map((ex, i) => (
          <mesh key={i} position={[ex, -0.01, 0.01]}>
            <sphereGeometry args={[0.036, 8, 8]} />
            <meshStandardMaterial color={skinColor} roughness={0.5} />
          </mesh>
        ))}
        {/* Eyes + White Catchlights + Nose */}
        {[-0.064, 0.064].map((ex, i) => (
          <group key={i} position={[ex, 0.015, -0.172]}>
            <mesh>
              <sphereGeometry args={[0.023, 8, 8]} />
              <meshStandardMaterial color="#0f172a" roughness={0.18} />
            </mesh>
            <mesh position={[0.007, 0.008, -0.018]}>
              <sphereGeometry args={[0.007, 6, 6]} />
              <meshBasicMaterial color="#ffffff" />
            </mesh>
          </group>
        ))}
        <mesh position={[0, -0.02, -0.188]}>
          <sphereGeometry args={[0.021, 8, 8]} />
          <meshStandardMaterial color={skinColor} roughness={0.55} />
        </mesh>
        {/* Subtle Warm Smile */}
        <mesh position={[0, -0.072, -0.172]} rotation={[0.15, 0, Math.PI]}>
          <torusGeometry args={[0.034, 0.007, 6, 12, Math.PI]} />
          <meshStandardMaterial color="#7c2d12" roughness={0.6} />
        </mesh>

        {/* Varied Hairstyles */}
        <mesh position={[0, 0.055, 0.02]} rotation={[0.42, 0, 0]}>
          <sphereGeometry args={[0.198, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
          <meshStandardMaterial color={variant.resolvedHair} roughness={0.78} />
        </mesh>
        {variant.hairStyle === 1 && (
          <mesh position={[0, 0.17, 0.12]}>
            <sphereGeometry args={[0.088, 12, 10]} />
            <meshStandardMaterial color={variant.resolvedHair} roughness={0.78} />
          </mesh>
        )}
        {variant.hairStyle === 2 && (
          <mesh position={[0, 0.08, 0.05]}>
            <sphereGeometry args={[0.232, 16, 12]} />
            <meshStandardMaterial color={variant.resolvedHair} roughness={0.85} />
          </mesh>
        )}
        {variant.hairStyle === 3 && (
          <mesh position={[0, -0.02, 0.05]} scale={[1.06, 1.05, 0.85]}>
            <sphereGeometry args={[0.205, 16, 12, -0.4, Math.PI + 0.8, 0.4, 1.7]} />
            <meshStandardMaterial color={variant.resolvedHair} roughness={0.76} />
          </mesh>
        )}
        {variant.hairStyle === 4 && (
          <mesh position={[0.03, 0.16, -0.08]} scale={[1.3, 0.55, 0.9]}>
            <sphereGeometry args={[0.1, 12, 10]} />
            <meshStandardMaterial color={variant.resolvedHair} roughness={0.75} />
          </mesh>
        )}

        {/* Studio Headphones when Actively Typing */}
        {mode === 'typing' && (
          <group>
            <mesh position={[0, 0.02, 0.01]}>
              <torusGeometry args={[0.21, 0.016, 8, 20, Math.PI]} />
              <meshStandardMaterial color="#1e293b" roughness={0.35} />
            </mesh>
            {[-0.205, 0.205].map((hx, i) => (
              <mesh key={i} position={[hx, 0, 0.01]} rotation={[0, 0, Math.PI / 2]}>
                <cylinderGeometry args={[0.062, 0.062, 0.045, 14]} />
                <meshStandardMaterial color={accentColor} roughness={0.3} metalness={0.5} />
              </mesh>
            ))}
          </group>
        )}

        {withSolarVisor && (
          <mesh position={[0, 0.02, -0.162]}>
            <boxGeometry args={[0.24, 0.055, 0.08]} />
            <meshStandardMaterial color="#38bdf8" emissive="#0284c7" emissiveIntensity={0.8} metalness={0.8} roughness={0.1} />
          </mesh>
        )}
      </group>
    </group>
  );
};
