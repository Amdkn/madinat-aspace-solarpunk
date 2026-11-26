import React, { Component, useEffect, useLayoutEffect, useState } from 'react';
import { useFrame, useThree } from '@react-three/fiber';
import * as THREE from 'three';
import {
  BloomEffect,
  EffectComposer,
  EffectPass,
  RenderPass,
  ToneMappingEffect,
  ToneMappingMode,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';
import { createDesertEnvironmentTexture } from './ShadersAndMaterials';

class PostGuard extends Component<{ children: React.ReactNode }, { failed: boolean }> {
  state = { failed: false };
  static getDerivedStateFromError() {
    return { failed: true };
  }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

const PostEffectsInner: React.FC = () => {
  const gl = useThree((s) => s.gl);
  const scene = useThree((s) => s.scene);
  const camera = useThree((s) => s.camera);
  const size = useThree((s) => s.size);

  const [composer, setComposer] = useState<EffectComposer | null>(null);

  // Attach procedural Desert Sun HDRI environment so gold, glass, and solar panels gleam realistically
  useEffect(() => {
    const envTex = createDesertEnvironmentTexture(gl);
    scene.environment = envTex;
    (scene as THREE.Scene & { environmentIntensity?: number }).environmentIntensity = 0.42;
    return () => {
      if (scene.environment === envTex) scene.environment = null;
      envTex.dispose();
    };
  }, [gl, scene]);

  useLayoutEffect(() => {
    const hasFloat =
      gl.extensions.has('EXT_color_buffer_float') || gl.extensions.has('EXT_color_buffer_half_float');
    if (!hasFloat) return;

    const prevToneMapping = gl.toneMapping;
    gl.toneMapping = THREE.NoToneMapping;

    const samples = Math.min(4, gl.capabilities.maxSamples || 0);
    const comp = new EffectComposer(gl, {
      frameBufferType: THREE.HalfFloatType,
      multisampling: samples,
    });

    comp.addPass(new RenderPass(scene, camera));

    try {
      const ao = new N8AOPostPass(scene, camera);
      ao.autoDetectTransparency = false;
      ao.configuration.halfRes = true;
      ao.configuration.aoSamples = 16;
      ao.configuration.denoiseSamples = 8;
      ao.configuration.denoiseRadius = 8;
      ao.configuration.aoRadius = 4.2;
      ao.configuration.distanceFalloff = 1.0;
      ao.configuration.intensity = 2.6;
      comp.addPass(ao);
    } catch {
      // If N8AO cannot initialize on a software WebGL driver, continue cleanly with Bloom + ToneMapping
    }

    const bloom = new BloomEffect({
      mipmapBlur: true,
      luminanceThreshold: 0.95,
      intensity: 0.48,
      radius: 0.65,
    });
    const toneMapping = new ToneMappingEffect({ mode: ToneMappingMode.ACES_FILMIC });
    comp.addPass(new EffectPass(camera, bloom, toneMapping));

    setComposer(comp);

    return () => {
      comp.dispose();
      gl.toneMapping = prevToneMapping;
      gl.setRenderTarget(null);
    };
  }, [gl, scene, camera]);

  useLayoutEffect(() => {
    composer?.setSize(size.width, size.height);
  }, [composer, size.width, size.height]);

  useFrame((_, delta) => {
    if (composer) {
      composer.render(delta);
    }
  }, 1);

  return null;
};

export const PostEffects: React.FC = () => (
  <PostGuard>
    <PostEffectsInner />
  </PostGuard>
);
