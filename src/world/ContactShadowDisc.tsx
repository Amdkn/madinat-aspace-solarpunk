import React, { useMemo } from 'react';
import * as THREE from 'three';

let sharedShadowTex: THREE.CanvasTexture | null = null;

function getContactShadowTexture(): THREE.CanvasTexture {
  if (sharedShadowTex) return sharedShadowTex;
  const c = document.createElement('canvas');
  c.width = 128;
  c.height = 128;
  const ctx = c.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 6, 64, 64, 60);
  grad.addColorStop(0, 'rgba(8, 12, 22, 0.88)');
  grad.addColorStop(0.52, 'rgba(8, 12, 22, 0.52)');
  grad.addColorStop(1, 'rgba(8, 12, 22, 0.0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  sharedShadowTex = new THREE.CanvasTexture(c);
  return sharedShadowTex;
}

export const ContactShadowDisc: React.FC<{
  position?: [number, number, number];
  radius?: number;
  scaleZ?: number;
  opacity?: number;
}> = ({ position = [0, 0.028, 0], radius = 0.6, scaleZ = 1, opacity = 0.92 }) => {
  const tex = useMemo(() => getContactShadowTexture(), []);
  return (
    <mesh
      position={position}
      rotation={[-Math.PI / 2, 0, 0]}
      scale={[1, scaleZ, 1]}
      userData={{ ignoreCameraRay: true }}
    >
      <circleGeometry args={[radius, 24]} />
      <meshBasicMaterial
        map={tex}
        transparent
        opacity={opacity}
        depthWrite={false}
        toneMapped={false}
        polygonOffset
        polygonOffsetFactor={-4}
        polygonOffsetUnits={-4}
      />
    </mesh>
  );
};
