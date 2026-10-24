// Post-processing chain: N8AO ambient occlusion -> bloom -> tone mapping -> grading -> SMAA
import * as THREE from 'three';
import {
  EffectComposer, RenderPass, EffectPass, BloomEffect, SMAAEffect, SMAAPreset, ToneMappingEffect, ToneMappingMode,
  VignetteEffect, NoiseEffect, BlendFunction, ChromaticAberrationEffect, BrightnessContrastEffect, HueSaturationEffect,
} from 'postprocessing';
import { N8AOPostPass } from 'n8ao';

export function createPost(renderer, scene, camera, quality) {
  const composer = new EffectComposer(renderer, { frameBufferType: THREE.HalfFloatType });
  composer.addPass(new RenderPass(scene, camera));
  let ao = null;
  if (quality !== 'low') {
    ao = new N8AOPostPass(scene, camera, innerWidth, innerHeight);
    Object.assign(ao.configuration, { aoRadius: 1.6, distanceFalloff: 0.6, intensity: 2.6, color: new THREE.Color(0x000000), halfRes: quality !== 'high', gammaCorrection: false, aoSamples: quality === 'high' ? 16 : 8, denoiseSamples: quality === 'high' ? 8 : 4 });
    composer.addPass(ao);
  }
  const bloom = new BloomEffect({ intensity: 1.1, luminanceThreshold: 0.75, luminanceSmoothing: 0.25, mipmapBlur: true, radius: 0.72, levels: quality === 'low' ? 5 : 7 });
  const tone = new ToneMappingEffect({ mode: ToneMappingMode.AGX });
  const grade = new HueSaturationEffect({ saturation: 0.18 });
  const contrast = new BrightnessContrastEffect({ contrast: 0.12 });
  const vign = new VignetteEffect({ darkness: 0.6, offset: 0.28 });
  const noise = new NoiseEffect({ premultiply: true, blendFunction: BlendFunction.SCREEN }); noise.blendMode.opacity.value = 0.12;
  const ca = new ChromaticAberrationEffect({ offset: new THREE.Vector2(0.0007, 0.0005), radialModulation: true, modulationOffset: 0.35 });
  composer.addPass(new EffectPass(camera, bloom, tone, grade, contrast, vign, noise));
  composer.addPass(new EffectPass(camera, ca));
  if (quality !== 'low') composer.addPass(new EffectPass(camera, new SMAAEffect({ preset: quality === 'high' ? SMAAPreset.HIGH : SMAAPreset.MEDIUM })));
  return {
    composer, bloom, ao, ca,
    setSize(w, h) { composer.setSize(w, h); if (ao) ao.setSize(w, h); },
    render(dt) { composer.render(dt); },
    setBright(b) { bloom.intensity = 1.1 * b; },
    hit(k) { ca.offset.set(0.0007 + k * 0.006, 0.0005 + k * 0.004); },
    dispose() { composer.dispose(); },
  };
}
