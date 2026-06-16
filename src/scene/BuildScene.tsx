import { Suspense, useRef, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Environment, Lightformer } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import type { Build, Case, Cooler } from '../lib/types';
import { useBuildStore } from '../store/buildStore';
import {
  CaseShell, MoboPart, CpuPart, RamPart, GpuPart, PsuPart, CoolerPart, RadiatorPart,
  StoragePart, FansPart, Burst, Airflow, Vents, S,
} from './parts';
import { airflowPlan } from '../rules/airflow';

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

/** Open-air test bench platform, used when no case is selected. */
function Bench({ w, d, y }: { w: number; d: number; y: number }) {
  return (
    <mesh position={[0, y, 0]} receiveShadow>
      <boxGeometry args={[w * 1.05, 0.06, d * 1.05]} />
      <meshStandardMaterial color="#23252c" metalness={0.5} roughness={0.6} />
    </mesh>
  );
}

function Rig({ build }: { build: Build }) {
  const phase = useBuildStore((s) => s.phase);
  const pcCase = build.CASE as Case | undefined;
  if (Object.keys(build).length === 0) return null;

  const dims = pcCase ? pcCase.dimensions : { width: 260, height: 440, length: 440 };
  const w = dims.width * S, h = dims.height * S, d = dims.length * S;
  const hx = w / 2, hy = h / 2, hz = d / 2;
  const boardX = hx - 0.3;
  const cpuX = boardX - 0.12;
  const cooler = build.COOLER as Cooler | undefined;
  const isAir = cooler?.coolerType === 'Air';
  const airHX = cooler ? cooler.dimensions.height * S : 0;
  const failed = phase === 'failed';
  const loading = phase === 'testing' || phase === 'done';
  const plan = airflowPlan(build);
  const radFans = cooler && !isAir ? Math.round(cooler.radiatorSizeMm / 120) : 0;
  const exhaustTop = radFans;
  const exhaustRear = Math.max(0, plan.exhaust - radFans);
  const airflowSpeed = phase === 'testing' ? 3.2 : 1.6;

  return (
    <group>
      {pcCase ? <CaseShell c={pcCase} /> : <Bench w={w} d={d} y={-hy} />}
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
      {loading && plan.total > 0 && (
        <Airflow extent={[hx, hy, hz]} intake={plan.intake} exhaust={plan.exhaust} speed={airflowSpeed} />
      )}
      {loading && plan.total > 0 && (
        <Vents extent={[hx, hy, hz]} intake={plan.intake} exhaustTop={exhaustTop} exhaustRear={exhaustRear} />
      )}
      {loading && <pointLight position={[boardX - 0.4, -0.4, 0.1]} color="#ff7a3c" intensity={2.4} distance={6} />}
    </group>
  );
}

/** Self-contained studio lighting environment (no external HDRI fetch). */
function Studio() {
  return (
    <Environment resolution={256} frames={1}>
      <Lightformer form="rect" intensity={2.2} position={[0, 5, -6]} scale={[12, 7, 1]} color="#bcd3ff" />
      <Lightformer form="rect" intensity={1.6} position={[-6, 2, 4]} rotation={[0, Math.PI / 3, 0]} scale={[7, 7, 1]} color="#ffffff" />
      <Lightformer form="rect" intensity={1.3} position={[6, 2, 4]} rotation={[0, -Math.PI / 3, 0]} scale={[7, 7, 1]} color="#ffd9b8" />
      <Lightformer form="ring" intensity={2.4} position={[0, -3, 2]} scale={5} color="#2f6df0" />
    </Environment>
  );
}

export default function BuildScene({ build }: { build: Build }) {
  const empty = Object.keys(build).length === 0;
  return (
    <Canvas
      flat
      shadows
      dpr={[1, 2]}
      camera={{ position: [-5.5, 3.2, 5.5], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <color attach="background" args={['#0a0c12']} />
      <fog attach="fog" args={['#0a0c12', 14, 30]} />

      <ambientLight intensity={0.7} />
      <hemisphereLight args={['#dfe8ff', '#2a2e38', 0.6]} />
      <directionalLight position={[-6, 9, 6]} intensity={2.6} castShadow shadow-mapSize={[2048, 2048]} shadow-bias={-0.0001}>
        <orthographicCamera attach="shadow-camera" args={[-8, 8, 8, -8, 0.1, 30]} />
      </directionalLight>
      <directionalLight position={[5, 4, -4]} intensity={0.9} color="#7c9bff" />
      {/* camera/glass-side fill so interior components read clearly */}
      <pointLight position={[-4, 1.5, 4]} intensity={1.1} color="#eef3ff" distance={20} />
      <pointLight position={[-2, -0.5, 2]} intensity={0.5} color="#cfe0ff" distance={12} />

      <Suspense fallback={null}>
        <Studio />
        <Rig build={build} />
      </Suspense>

      {!empty && <ContactShadows position={[0, -2.4, 0]} opacity={0.55} scale={16} blur={2.8} far={6} resolution={1024} color="#000000" />}
      <gridHelper args={[30, 30, '#1c2230', '#12161f']} position={[0, -2.42, 0]} />

      {empty && (
        <Html center zIndexRange={[20, 0]}>
          <div style={{ color: '#9aa4b8', fontFamily: 'system-ui', fontSize: 14, whiteSpace: 'nowrap' }}>
            Start building — pick any components →
          </div>
        </Html>
      )}

      <OrbitControls enablePan enableZoom enableDamping dampingFactor={0.08} minDistance={3} maxDistance={24} target={[0, 0, 0]} />

      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1.1} luminanceSmoothing={0.2} intensity={0.6} radius={0.7} />
        <Vignette offset={0.25} darkness={0.32} eskil={false} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
