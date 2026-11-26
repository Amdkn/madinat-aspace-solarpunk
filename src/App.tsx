import React, { Suspense, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from './store/useWorldStore';
import { SolarpunkCityScene } from './world/SolarpunkArchitecture';
import { PlayerAndVehiclesController } from './world/PlayerAndVehicles';
import { GlbMasterpieceInspectorView, PortalMiniWorldCanvas } from './world/PortalMiniWorld';
import { CompanionFlatInterfaces, TopTrimodalBar, World3DHudOverlay } from './ui/HudAndInterfaces';
import { PostEffects } from './world/PostEffects';

const CircadianAtmosphere: React.FC = () => {
  const solarHour = useWorldStore((s) => s.solarHour);

  const { sunPos, bgHex, ambientInt, dirInt, dirColor } = useMemo(() => {
    const angle = ((solarHour - 6) / 12) * Math.PI;
    const y = Math.sin(angle);
    const x = Math.cos(angle);
    const sp: [number, number, number] = [x * 160, y * 130, 85];

    if (y < -0.05) {
      return {
        sunPos: sp,
        bgHex: '#071324',
        ambientInt: 0.45,
        dirInt: 0.6,
        dirColor: '#38bdf8',
      };
    }
    if (y < 0.38) {
      return {
        sunPos: sp,
        bgHex: '#f6e1c3',
        ambientInt: 0.42,
        dirInt: 1.95,
        dirColor: '#fde08d',
      };
    }
    return {
      sunPos: sp,
      bgHex: '#e7f1fa',
      ambientInt: 0.44,
      dirInt: 1.95,
      dirColor: '#fffbeb',
    };
  }, [solarHour]);

  return (
    <>
      <color attach="background" args={[bgHex]} />
      <fog attach="fog" args={[bgHex, 240, 720]} />
      {sunPos[1] > -10 && (
        <Sky
          distance={4500}
          sunPosition={sunPos}
          turbidity={7.2}
          rayleigh={1.6}
          mieCoefficient={0.005}
          mieDirectionalG={0.82}
        />
      )}
      <ambientLight intensity={ambientInt} color="#fff8eb" />
      <hemisphereLight args={['#fef3c7', '#10a398', 0.48]} />
      <directionalLight
        position={sunPos}
        intensity={dirInt}
        color={dirColor}
        castShadow
        shadow-mapSize-width={2048}
        shadow-mapSize-height={2048}
        shadow-bias={-0.0004}
        shadow-camera-left={-220}
        shadow-camera-right={220}
        shadow-camera-top={220}
        shadow-camera-bottom={-220}
        shadow-camera-far={550}
      />
    </>
  );
};

export const App: React.FC = () => {
  const interfaceMode = useWorldStore((s) => s.interfaceMode);
  const activePortalId = useWorldStore((s) => s.activePortalId);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const st = useWorldStore.getState();
      if (e.key === '1') st.setInterfaceMode('garden');
      else if (e.key === '2') st.setInterfaceMode('desktop');
      else if (e.key === '3') st.setInterfaceMode('world3d');
      else if (e.key === '4') st.setInterfaceMode('glbInspector');
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  return (
    <div style={{ width: '100vw', height: '100vh', position: 'relative' }}>
      <TopTrimodalBar />

      {interfaceMode === 'garden' && <CompanionFlatInterfaces mode="garden" />}
      {interfaceMode === 'desktop' && <CompanionFlatInterfaces mode="desktop" />}
      {interfaceMode === 'glbInspector' && <GlbMasterpieceInspectorView />}

      {interfaceMode === 'world3d' && (
        <>
          {activePortalId ? (
            <PortalMiniWorldCanvas portalId={activePortalId} />
          ) : (
            <>
              <Canvas
                shadows
                dpr={[1, 1.75]}
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.96 }}
                camera={{ position: [0, 5.2, 195], fov: 50, near: 0.3, far: 1200 }}
              >
                <CircadianAtmosphere />
                <Suspense fallback={null}>
                  <SolarpunkCityScene />
                  <PlayerAndVehiclesController />
                </Suspense>
                <PostEffects />
              </Canvas>
              <World3DHudOverlay />
            </>
          )}
        </>
      )}
    </div>
  );
};

export default App;
