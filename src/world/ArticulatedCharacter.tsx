import React, { useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Outlines } from '@react-three/drei';
import * as THREE from 'three';
import { toonMat } from './ShadersAndMaterials';
import { ContactShadowDisc } from './ContactShadowDisc';

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
  speedRef?: React.MutableRefObject<number>;
}

const HAIR_PALETTES = ['#1f1d2b', '#451a03', '#78350f', '#2b2d42', '#92400e'];
const INK = '#1f1d2b';
const OUTLINE = 0.014;

export const ArticulatedCharacter: React.FC<ArticulatedCharacterProps> = ({
  tunicColor = '#0d9488',
  accentColor = '#d8a13b',
  skinColor = '#c68642',
  hairColor,
  mode = 'idle',
  phaseOffset = 0,
  withCape = false,
  withSolarVisor = false,
  speedRef,
}) => {
  const walkPhaseRef = useRef(phaseOffset);
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
      hairStyle: idx,
      resolvedHair: hairColor ?? HAIR_PALETTES[idx],
    };
  }, [phaseOffset, hairColor]);

  // Note on coordinate convention:
  // Character faces -Z; limbs hang along -Y.
  // By the Right-Hand Rule around +X, rotating (0, -L, 0) by +theta yields z' = -L * sin(theta).
  // Therefore POSITIVE +rotation.x swings -Y limbs FORWARD (-Z), toward the desk/keyboard!
  // Meanwhile +Y torso/head leans FORWARD (-Z) with NEGATIVE -rotation.x.
  useFrame(({ clock }, rawDt) => {
    const dt = Math.min(rawDt, 0.05);
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

    const liveSpeed = speedRef ? speedRef.current : mode === 'run' ? 8.5 : mode === 'walk' ? 4.5 : 0;
    const activeMode: CharacterPoseMode =
      mode === 'typing' || mode === 'needsYou' || mode === 'cheer'
        ? mode
        : speedRef
          ? liveSpeed > 6.8
            ? 'run'
            : liveSpeed > 0.25
              ? 'walk'
              : 'idle'
          : mode;

    if (activeMode === 'walk' || activeMode === 'run') {
      walkPhaseRef.current += (speedRef ? Math.max(1.2, liveSpeed) * 2.55 : activeMode === 'run' ? 12.5 : 8.2) * dt;
      const p = walkPhaseRef.current;
      const s = Math.sin(p);
      const c = Math.cos(p);
      const isRun = activeMode === 'run';
      const amp = isRun ? 0.96 : 0.68;
      legL.rotation.x = s * amp;
      legR.rotation.x = -s * amp;
      kneeL.rotation.x = -Math.max(0, -s) * (isRun ? 1.05 : 0.78) - 0.06;
      kneeR.rotation.x = -Math.max(0, s) * (isRun ? 1.05 : 0.78) - 0.06;
      armL.rotation.x = -s * amp * 0.85;
      armR.rotation.x = s * amp * 0.85;
      foreL.rotation.x = isRun ? 0.68 : 0.42;
      foreR.rotation.x = isRun ? 0.68 : 0.42;
      armL.rotation.z = -0.12;
      armR.rotation.z = 0.12;
      body.position.y = Math.abs(s) * (isRun ? 0.075 : 0.045);
      body.rotation.x = isRun ? -0.11 : -0.04;
      body.rotation.y = s * 0.075;
      body.rotation.z = c * 0.028;
      head.rotation.x = isRun ? 0.06 : 0.02;
      head.rotation.y = -s * 0.05;
    } else if (activeMode === 'typing') {
      // Ergonomic sitting pose: thighs point FORWARD (-Z), shins drop DOWN (-Y), arms & forearms reach FORWARD onto keyboard!
      body.position.y = -0.22;
      body.rotation.x = -0.08;
      body.rotation.y = 0;
      body.rotation.z = 0;
      legL.rotation.x = 1.48;
      legR.rotation.x = 1.48;
      kneeL.rotation.x = -1.48;
      kneeR.rotation.x = -1.48;
      armL.rotation.x = 0.58 + Math.sin(t * 16) * 0.06;
      armR.rotation.x = 0.58 + Math.cos(t * 18) * 0.06;
      foreL.rotation.x = 0.88 + Math.sin(t * 22) * 0.12;
      foreR.rotation.x = 0.88 + Math.cos(t * 21) * 0.12;
      armL.rotation.z = 0.16;
      armR.rotation.z = -0.16;
      head.rotation.x = -0.08 + Math.sin(t * 2.2) * 0.03;
      head.rotation.y = Math.sin(t * 0.7) * 0.08;
    } else if (activeMode === 'needsYou') {
      body.position.y = Math.abs(Math.sin(t * 4.2)) * 0.05;
      body.rotation.x = 0;
      body.rotation.y = 0;
      body.rotation.z = 0;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      kneeL.rotation.x = 0;
      kneeR.rotation.x = 0;
      armL.rotation.x = 0.12;
      armL.rotation.z = -0.1;
      foreL.rotation.x = 0.25;
      armR.rotation.x = 2.65;
      foreR.rotation.x = 0.22 + Math.sin(t * 9.0) * 0.22;
      armR.rotation.z = 0.28 + Math.sin(t * 8.0) * 0.2;
      head.rotation.x = 0.05;
      head.rotation.y = Math.sin(t * 1.4) * 0.15;
    } else if (activeMode === 'cheer') {
      body.position.y = Math.abs(Math.sin(t * 6)) * 0.1;
      body.rotation.x = 0;
      body.rotation.y = 0;
      body.rotation.z = 0;
      legL.rotation.x = 0;
      legR.rotation.x = 0;
      kneeL.rotation.x = 0;
      kneeR.rotation.x = 0;
      armL.rotation.x = 2.65;
      armR.rotation.x = 2.65;
      foreL.rotation.x = 0.2;
      foreR.rotation.x = 0.2;
      armL.rotation.z = -0.3;
      armR.rotation.z = 0.3;
      head.rotation.y = 0;
    } else {
      const k = 1 - Math.exp(-14 * dt);
      body.position.y = THREE.MathUtils.lerp(body.position.y, Math.sin(t * 2.2) * 0.008, k);
      body.rotation.x = THREE.MathUtils.lerp(body.rotation.x, 0, k);
      body.rotation.y = THREE.MathUtils.lerp(body.rotation.y, 0, k);
      body.rotation.z = THREE.MathUtils.lerp(body.rotation.z, 0, k);
      legL.rotation.x = THREE.MathUtils.lerp(legL.rotation.x, 0, k);
      legR.rotation.x = THREE.MathUtils.lerp(legR.rotation.x, 0, k);
      kneeL.rotation.x = THREE.MathUtils.lerp(kneeL.rotation.x, 0, k);
      kneeR.rotation.x = THREE.MathUtils.lerp(kneeR.rotation.x, 0, k);
      armL.rotation.x = THREE.MathUtils.lerp(armL.rotation.x, 0.07 + Math.sin(t * 2.2) * 0.04, k);
      armR.rotation.x = THREE.MathUtils.lerp(armR.rotation.x, 0.07 - Math.sin(t * 2.2) * 0.04, k);
      foreL.rotation.x = THREE.MathUtils.lerp(foreL.rotation.x, 0.28, k);
      foreR.rotation.x = THREE.MathUtils.lerp(foreR.rotation.x, 0.28, k);
      armL.rotation.z = -0.13;
      armR.rotation.z = 0.13;
      head.rotation.y = Math.sin(t * 0.8) * 0.14;
      head.rotation.x = 0;
    }
  });

  const jacketMat = toonMat(tunicColor);
  const pantMat = toonMat('#2b2d42');
  const shoeMat = toonMat('#2b1d19');
  const skinMat = toonMat(skinColor);
  const hairMat = toonMat(variant.resolvedHair);
  const goldMat = toonMat(accentColor);
  const whiteMat = toonMat('#f8fafc');

  return (
    <group userData={{ isCharacter: true }}>
      {mode !== 'typing' && <ContactShadowDisc position={[0, 0.024, 0]} radius={0.56} opacity={0.92} />}
      <group ref={bodyRef}>
        {/* Tailored pelvis/hip cap eliminating white torso-to-leg gap */}
        <mesh position={[0, 0.73, 0]} scale={[1.08, 0.78, 0.8]} castShadow material={pantMat}>
          <sphereGeometry args={[0.198, 14, 10]} />
          <Outlines thickness={OUTLINE} color={INK} />
        </mesh>

        {/* Two-segment legs (Hip -> Knee -> Rounded Shoe with clean sole) */}
        <group ref={legLRef} position={[-0.105, 0.72, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow material={pantMat}>
            <capsuleGeometry args={[0.094, 0.22, 6, 10]} />
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          <group ref={kneeLRef} position={[0, -0.34, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow material={pantMat}>
              <capsuleGeometry args={[0.082, 0.2, 6, 10]} />
              <Outlines thickness={OUTLINE} color={INK} />
            </mesh>
            <mesh position={[0, -0.33, -0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow material={shoeMat}>
              <capsuleGeometry args={[0.076, 0.13, 6, 10]} />
              <Outlines thickness={OUTLINE} color={INK} />
            </mesh>
            <mesh position={[0, -0.385, -0.045]} material={whiteMat}>
              <boxGeometry args={[0.14, 0.024, 0.24]} />
            </mesh>
          </group>
        </group>

        <group ref={legRRef} position={[0.105, 0.72, 0]}>
          <mesh position={[0, -0.17, 0]} castShadow material={pantMat}>
            <capsuleGeometry args={[0.094, 0.22, 6, 10]} />
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          <group ref={kneeRRef} position={[0, -0.34, 0]}>
            <mesh position={[0, -0.16, 0]} castShadow material={pantMat}>
              <capsuleGeometry args={[0.082, 0.2, 6, 10]} />
              <Outlines thickness={OUTLINE} color={INK} />
            </mesh>
            <mesh position={[0, -0.33, -0.045]} rotation={[Math.PI / 2, 0, 0]} castShadow material={shoeMat}>
              <capsuleGeometry args={[0.076, 0.13, 6, 10]} />
              <Outlines thickness={OUTLINE} color={INK} />
            </mesh>
            <mesh position={[0, -0.385, -0.045]} material={whiteMat}>
              <boxGeometry args={[0.14, 0.024, 0.24]} />
            </mesh>
          </group>
        </group>

        {/* Tailored Jacket Torso */}
        <mesh position={[0, 1.04, 0]} scale={[1.08, 1.0, 0.78]} castShadow material={jacketMat}>
          <capsuleGeometry args={[0.21, 0.34, 8, 14]} />
          <Outlines thickness={OUTLINE} color={INK} />
        </mesh>

        {/* Inner Shirt Collar, Lapels, Belt & ID Badge */}
        <mesh position={[0, 1.24, -0.14]} rotation={[0.18, 0, 0]} material={whiteMat}>
          <boxGeometry args={[0.13, 0.18, 0.04]} />
        </mesh>
        <mesh position={[-0.065, 1.21, -0.145]} rotation={[0.12, 0, -0.22]} material={jacketMat}>
          <boxGeometry args={[0.055, 0.22, 0.03]} />
        </mesh>
        <mesh position={[0.065, 1.21, -0.145]} rotation={[0.12, 0, 0.22]} material={jacketMat}>
          <boxGeometry args={[0.055, 0.22, 0.03]} />
        </mesh>
        <mesh position={[0, 0.77, 0]} scale={[1.08, 1.0, 0.78]} material={toonMat('#334155')}>
          <cylinderGeometry args={[0.205, 0.205, 0.065, 16]} />
        </mesh>
        <mesh position={[0, 0.77, -0.165]} material={goldMat}>
          <boxGeometry args={[0.08, 0.055, 0.025]} />
        </mesh>
        <mesh position={[0.07, 1.02, -0.165]} material={whiteMat}>
          <boxGeometry args={[0.075, 0.1, 0.015]} />
        </mesh>

        {/* Sleek Sovereign Abbassid Gold Collar Ring & Shoulder Epaulettes (no bulky back block!) */}
        {withCape && (
          <group>
            <mesh position={[0, 1.33, -0.01]} rotation={[Math.PI / 2 + 0.12, 0, 0]} material={goldMat}>
              <torusGeometry args={[0.145, 0.028, 8, 20]} />
              <Outlines thickness={0.009} color={INK} />
            </mesh>
            {[-0.245, 0.245].map((sx, idx) => (
              <mesh key={idx} position={[sx, 1.31, 0]} scale={[1.15, 0.55, 0.95]} material={goldMat} castShadow>
                <sphereGeometry args={[0.068, 10, 8]} />
                <Outlines thickness={0.009} color={INK} />
              </mesh>
            ))}
          </group>
        )}

        {/* Two-Segment Articulated Arms (Positive +rotation.x swings forward toward -Z!) */}
        <group ref={armLRef} position={[-0.27, 1.28, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow material={jacketMat}>
            <capsuleGeometry args={[0.062, 0.16, 6, 10]} />
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          <group ref={foreLRef} position={[0, -0.24, 0]}>
            <mesh position={[0, -0.11, 0]} castShadow material={jacketMat}>
              <capsuleGeometry args={[0.054, 0.15, 6, 10]} />
              <Outlines thickness={OUTLINE} color={INK} />
            </mesh>
            <mesh position={[0, -0.23, 0]} castShadow material={skinMat}>
              <sphereGeometry args={[0.058, 10, 10]} />
              <Outlines thickness={0.01} color={INK} />
            </mesh>
          </group>
        </group>

        <group ref={armRRef} position={[0.27, 1.28, 0]}>
          <mesh position={[0, -0.12, 0]} castShadow material={jacketMat}>
            <capsuleGeometry args={[0.062, 0.16, 6, 10]} />
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          <group ref={foreRRef} position={[0, -0.24, 0]}>
            <mesh position={[0, -0.11, 0]} castShadow material={jacketMat}>
              <capsuleGeometry args={[0.054, 0.15, 6, 10]} />
              <Outlines thickness={OUTLINE} color={INK} />
            </mesh>
            <mesh position={[0, -0.23, 0]} castShadow material={skinMat}>
              <sphereGeometry args={[0.058, 10, 10]} />
              <Outlines thickness={0.01} color={INK} />
            </mesh>
          </group>
        </group>

        {/* Expressive Toon Head */}
        <group ref={headRef} position={[0, 1.54, 0]}>
          <mesh position={[0, -0.14, 0]} material={skinMat}>
            <cylinderGeometry args={[0.068, 0.078, 0.12, 10]} />
          </mesh>
          <mesh scale={[0.96, 1.03, 0.96]} castShadow material={skinMat}>
            <sphereGeometry args={[0.19, 18, 16]} />
            <Outlines thickness={OUTLINE} color={INK} />
          </mesh>
          {[-0.185, 0.185].map((ex, i) => (
            <mesh key={i} position={[ex, -0.01, 0.01]} material={skinMat}>
              <sphereGeometry args={[0.036, 8, 8]} />
            </mesh>
          ))}
          {[-0.064, 0.064].map((ex, i) => (
            <group key={i} position={[ex, 0.015, -0.172]}>
              <mesh>
                <sphereGeometry args={[0.023, 8, 8]} />
                <meshBasicMaterial color={INK} />
              </mesh>
              <mesh position={[0.007, 0.008, -0.018]}>
                <sphereGeometry args={[0.007, 6, 6]} />
                <meshBasicMaterial color="#ffffff" />
              </mesh>
            </group>
          ))}
          <mesh position={[0, -0.02, -0.188]} material={skinMat}>
            <sphereGeometry args={[0.021, 8, 8]} />
          </mesh>
          <mesh position={[0, -0.072, -0.172]} rotation={[0.15, 0, Math.PI]}>
            <torusGeometry args={[0.034, 0.007, 6, 12, Math.PI]} />
            <meshBasicMaterial color="#7c2d12" />
          </mesh>

          <mesh position={[0, 0.055, 0.02]} rotation={[0.42, 0, 0]} material={hairMat}>
            <sphereGeometry args={[0.198, 18, 12, 0, Math.PI * 2, 0, Math.PI * 0.56]} />
            <Outlines thickness={0.012} color={INK} />
          </mesh>
          {variant.hairStyle === 1 && (
            <mesh position={[0, 0.17, 0.12]} material={hairMat}>
              <sphereGeometry args={[0.088, 12, 10]} />
              <Outlines thickness={0.01} color={INK} />
            </mesh>
          )}
          {variant.hairStyle === 2 && (
            <mesh position={[0, 0.08, 0.05]} material={hairMat}>
              <sphereGeometry args={[0.232, 16, 12]} />
              <Outlines thickness={0.012} color={INK} />
            </mesh>
          )}
          {variant.hairStyle === 3 && (
            <mesh position={[0, -0.02, 0.05]} scale={[1.06, 1.05, 0.85]} material={hairMat}>
              <sphereGeometry args={[0.205, 16, 12, -0.4, Math.PI + 0.8, 0.4, 1.7]} />
              <Outlines thickness={0.012} color={INK} />
            </mesh>
          )}
          {variant.hairStyle === 4 && (
            <mesh position={[0.03, 0.16, -0.08]} scale={[1.3, 0.55, 0.9]} material={hairMat}>
              <sphereGeometry args={[0.1, 12, 10]} />
              <Outlines thickness={0.01} color={INK} />
            </mesh>
          )}

          {mode === 'typing' && (
            <group>
              <mesh position={[0, 0.02, 0.01]} material={toonMat(INK)}>
                <torusGeometry args={[0.21, 0.016, 8, 20, Math.PI]} />
              </mesh>
              {[-0.205, 0.205].map((hx, i) => (
                <mesh key={i} position={[hx, 0, 0.01]} rotation={[0, 0, Math.PI / 2]} material={goldMat}>
                  <cylinderGeometry args={[0.062, 0.062, 0.045, 14]} />
                  <Outlines thickness={0.008} color={INK} />
                </mesh>
              ))}
            </group>
          )}

          {withSolarVisor && (
            <mesh position={[0, 0.02, -0.162]}>
              <meshBasicMaterial color="#38bdf8" />
              <boxGeometry args={[0.24, 0.055, 0.08]} />
            </mesh>
          )}
        </group>
      </group>
    </group>
  );
};
