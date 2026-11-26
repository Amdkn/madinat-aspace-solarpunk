import React, { Suspense, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import { Sky } from '@react-three/drei';
import * as THREE from 'three';
import { useWorldStore } from './store/useWorldStore';
import { SolarpunkCityScene } from './world/SolarpunkArchitecture';
import { PlayerAndVehiclesController } from './world/PlayerAndVehicles';
import { DedicatedPavilionInterior } from './world/DedicatedPavilionInterior';
import { GlbMasterpieceInspectorView, PortalMiniWorldCanvas } from './world/PortalMiniWorld';
import { CompanionFlatInterfaces, TopTrimodalBar, World3DHudOverlay } from './ui/HudAndInterfaces';
import { PostEffects } from './world/PostEffects';

const CircadianAtmosphere: React.FC = () => {
  const solarHour = useWorldStore((s) => s.solarHour);

  const { sunPos, bgHex, ambientInt, dirInt, dirColor } = useMemo(() => {
    const angle = ((solarHour - 6) / 12) * Math.PI;
    const y = Math.sin(angle);
    const x = Math.cos(angle);
    const sp: [number, number, number] = [x * 185, Math.max(24, y * 115), 95];

    if (y < -0.05) {
      return {
        sunPos: [x * 160, y * 130, 85] as [number, number, number],
        bgHex: '#071324',
        ambientInt: 0.34,
        dirInt: 0.65,
        dirColor: '#38bdf8',
      };
    }
    if (y < 0.48) {
      return {
        sunPos: [x * 195, 34, 96] as [number, number, number],
        bgHex: '#f4cfa0',
        ambientInt: 0.19,
        dirInt: 3.15,
        dirColor: '#ffb347',
      };
    }
    return {
      sunPos: sp,
      bgHex: '#e7f1fa',
      ambientInt: 0.36,
      dirInt: 2.25,
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
          turbidity={9.4}
          rayleigh={2.45}
          mieCoefficient={0.011}
          mieDirectionalG={0.86}
        />
      )}
      <ambientLight intensity={ambientInt} color="#fff6e3" />
      <hemisphereLight args={['#ffe0a3', '#1e3a5f', 0.30]} />
      <directionalLight
        position={sunPos}
        intensity={dirInt}
        color={dirColor}
        castShadow
        shadow-mapSize-width={4096}
        shadow-mapSize-height={4096}
        shadow-bias={-0.00012}
        shadow-normalBias={0.025}
        shadow-camera-left={-165}
        shadow-camera-right={165}
        shadow-camera-top={165}
        shadow-camera-bottom={-165}
        shadow-camera-near={10}
        shadow-camera-far={520}
      />
    </>
  );
};

export const App: React.FC = () => {
  const interfaceMode = useWorldStore((s) => s.interfaceMode);
  const activePortalId = useWorldStore((s) => s.activePortalId);
  const enteredDepartmentId = useWorldStore((s) => s.enteredDepartmentId);

  useEffect(() => {
    (window as unknown as Record<string, unknown>).__madinatCtl = {
      setMode: (m: 'world3d' | 'garden' | 'desktop' | 'glbInspector') => useWorldStore.getState().setInterfaceMode(m),
      enterBuilding: (id: string | null) => useWorldStore.getState().enterDepartmentBuilding(id),
      openDept: (id: string | null) => useWorldStore.getState().openDepartment(id),
      enterPortal: (id: string | null) => useWorldStore.getState().enterPortal(id),
      teleport: (pos: [number, number, number]) => useWorldStore.getState().teleportTo(pos),
    };
    const onKey = (e: KeyboardEvent) => {
      const tag = (e.target as HTMLElement)?.tagName;
      if (tag === 'INPUT' || tag === 'TEXTAREA') return;
      const st = useWorldStore.getState();
      if (e.key === 'Escape') {
        if (st.inspectedWorkstation) st.inspectWorkstation(null);
        else if (st.activePortalId) st.enterPortal(null);
        return;
      }
      if (e.key === '1') st.setInterfaceMode('garden');
      else if (e.key === '2') st.setInterfaceMode('desktop');
      else if (e.key === '3') st.setInterfaceMode('world3d');
      else if (e.key === '4') st.setInterfaceMode('glbInspector');
    };
    window.addEventListener('keydown', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      delete (window as unknown as Record<string, unknown>).__madinatCtl;
    };
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
          ) : enteredDepartmentId ? (
            <>
              <DedicatedPavilionInterior deptId={enteredDepartmentId} />
              <World3DHudOverlay />
            </>
          ) : (
            <>
              <Canvas
                shadows
                dpr={[1, 1.75]}
                gl={{ antialias: true, toneMapping: THREE.ACESFilmicToneMapping, toneMappingExposure: 0.94 }}
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
