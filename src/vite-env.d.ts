/// <reference types="vite/client" />

declare module 'n8ao' {
  import type * as THREE from 'three';
  import type { Pass } from 'postprocessing';
  export class N8AOPostPass extends Pass {
    constructor(scene: THREE.Scene, camera: THREE.Camera, width?: number, height?: number);
    autoDetectTransparency: boolean;
    configuration: {
      halfRes: boolean;
      aoSamples: number;
      denoiseSamples: number;
      denoiseRadius: number;
      aoRadius: number;
      distanceFalloff: number;
      intensity: number;
      gammaCorrection?: boolean;
      [key: string]: unknown;
    };
  }
}
