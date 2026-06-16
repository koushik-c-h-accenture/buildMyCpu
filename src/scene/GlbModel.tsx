import { useMemo } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

/**
 * Loads a real glTF/GLB model and auto-fits it to a target size (the part's
 * largest real-world dimension, in scene units). Lets genuine per-SKU models be
 * dropped into the catalog via a component's `modelUrl` field with no scene-code
 * changes — the procedural mesh is used whenever `modelUrl` is absent.
 *
 * Must be rendered inside a <Suspense> boundary (useGLTF suspends while loading).
 */
export default function GlbModel({ url, fitSize }: { url: string; fitSize: number }) {
  const { scene } = useGLTF(url);
  const model = useMemo(() => {
    const clone = scene.clone(true);
    const box = new THREE.Box3().setFromObject(clone);
    const size = new THREE.Vector3();
    const center = new THREE.Vector3();
    box.getSize(size);
    box.getCenter(center);
    const maxDim = Math.max(size.x, size.y, size.z) || 1;
    const k = fitSize / maxDim;
    clone.position.sub(center.multiplyScalar(k));
    clone.scale.setScalar(k);
    clone.traverse((o) => {
      const m = o as THREE.Mesh;
      if (m.isMesh) { m.castShadow = true; m.receiveShadow = true; }
    });
    return clone;
  }, [scene, fitSize]);
  return <primitive object={model} />;
}
