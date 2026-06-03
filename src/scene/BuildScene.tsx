import { useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows } from '@react-three/drei';
import * as THREE from 'three';
import type { Build, Case, Cooler } from '../lib/types';
import { useBuildStore } from '../store/buildStore';
import {
  CaseShell, MoboPart, CpuPart, RamPart, GpuPart, PsuPart, CoolerPart, RadiatorPart,
  StoragePart, FansPart, Burst, Airflow, S,
} from './parts';

/** Slides a part down into place when it first mounts (easeOutCubic). */
function Drop({ to, children }: { to: [number, number, number]; children: ReactNode }) {
  const ref = useRef<THREE.Group>(null);
  const t = useRef(0);
  useFrame((_, dt) => {
    if (!ref.current) return;
    t.current = Math.min(1, t.current + dt * 2.6);
    const e = 1 - Math.pow(1 - t.current, 3);
    ref.current.position.set(to[0], to[1] + (1 - e) * 2.5, to[2]);
    ref.current.scale.setScalar(0.85 + 0.15 * e);
  });
  return <group ref={ref}>{children}</group>;
}

function Rig({ build }: { build: Build }) {
  const phase = useBuildStore((s) => s.phase);
  const pcCase = build.CASE as Case | undefined;
  if (!pcCase) return null;

  const w = pcCase.dimensions.width * S, h = pcCase.dimensions.height * S, d = pcCase.dimensions.length * S;
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const boardX = hx - 0.3;
  const cpuX = boardX - 0.12;
  const cooler = build.COOLER as Cooler | undefined;
  const isAir = cooler?.coolerType === 'Air';
  const airHX = cooler ? cooler.dimensions.height * S : 0;
  const failed = phase === 'failed';
  const loading = phase === 'testing' || phase === 'done';

  return (
    <group>
      <CaseShell c={pcCase} />
      {build.MOBO && <Drop to={[boardX, 0.05, 0]}><MoboPart c={build.MOBO as any} /></Drop>}
      {build.CPU && <Drop to={[cpuX, 0.55, -0.35]}><CpuPart c={build.CPU as any} /></Drop>}
      {build.RAM && <Drop to={[boardX - 0.18, 0.62, 0.12]}><RamPart c={build.RAM as any} /></Drop>}
      {build.STORAGE && <Drop to={[boardX - 0.1, -0.15, 0.55]}><StoragePart c={build.STORAGE as any} /></Drop>}
      {build.GPU && <Drop to={[boardX - 0.45, -0.55, 0.1]}><GpuPart c={build.GPU as any} /></Drop>}
      {build.PSU && <Drop to={[0, -hy + 0.45, -hz + 0.85]}><PsuPart c={build.PSU as any} /></Drop>}
      {build.FANS && <Drop to={[-hx + 0.45, -0.2, hz - 0.35]}><FansPart c={build.FANS as any} /></Drop>}
      {cooler && isAir && <Drop to={[cpuX - airHX * 0.45, 0.55, -0.35]}><CoolerPart c={cooler} /></Drop>}
      {cooler && !isAir && (
        <>
          <Drop to={[cpuX, 0.55, -0.35]}><CoolerPart c={cooler} /></Drop>
          <Drop to={[0, hy - 0.28, 0]}><RadiatorPart c={cooler} /></Drop>
        </>
      )}

      {failed && <Burst />}
      {loading && <Airflow extent={[hx, hy, hz]} />}
      {loading && <pointLight position={[boardX - 0.4, -0.4, 0.1]} color="#ff7a3c" intensity={1.6} distance={5} />}
    </group>
  );
}

export default function BuildScene({ build }: { build: Build }) {
  const hasCase = !!build.CASE;
  return (
    <Canvas shadows camera={{ position: [-5.5, 3.2, 5.5], fov: 42 }} style={{ background: '#eae8e2' }}>
      <ambientLight intensity={1.0} />
      <directionalLight position={[-6, 8, 6]} intensity={1.5} castShadow shadow-mapSize={[1024, 1024]} />
      <directionalLight position={[4, 4, -3]} intensity={0.6} color="#6c8efe" />
      <pointLight position={[-3, 1, 4]} intensity={0.7} color="#f38ba8" />

      <Rig build={build} />

      {hasCase && <ContactShadows position={[0, -2.4, 0]} opacity={0.35} scale={14} blur={2.5} far={5} />}
      <gridHelper args={[16, 16, '#c9c2b3', '#dcd6c8']} position={[0, -2.42, 0]} />

      {!hasCase && (
        <Html center>
          <div style={{ color: '#6c7086', fontFamily: 'system-ui', fontSize: 14, whiteSpace: 'nowrap' }}>
            Select a case to begin →
          </div>
        </Html>
      )}

      <OrbitControls enablePan enableZoom enableDamping dampingFactor={0.08} minDistance={3} maxDistance={22} target={[0, 0, 0]} />
    </Canvas>
  );
}
