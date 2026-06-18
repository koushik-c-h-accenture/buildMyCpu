import { Suspense, useEffect, useRef, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Html, ContactShadows, Environment, Lightformer, Stars } from '@react-three/drei';
import { EffectComposer, Bloom, Vignette, ToneMapping } from '@react-three/postprocessing';
import { ToneMappingMode } from 'postprocessing';
import * as THREE from 'three';
import type { Build, Case, Cooler, Mobo, Gpu, Psu } from '../lib/types';
import { useBuildStore } from '../store/buildStore';
import { useSceneStore, type SceneStyle } from '../store/sceneStore';
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

  // ---- anchored ATX layout (mobo tray on +X, glass on −X; front −Z, rear +Z) ----
  const mobo = build.MOBO as Mobo | undefined;
  const gpu = build.GPU as Gpu | undefined;
  const psu = build.PSU as Psu | undefined;

  const shroudH = Math.max(0.85, h * 0.17);          // matches CaseShell basement cover
  const floorY = -hy + 0.04;
  const shroudTopY = floorY + shroudH;

  const trayX = hx - 0.1;                              // board sits flush on the +X wall
  const mbH = (mobo ? mobo.dimensions.width : 244) * S;
  const mbD = (mobo ? mobo.dimensions.length : 305) * S;
  const boardY = Math.min(hy - 0.12 - mbH / 2, shroudTopY + mbH / 2 + 0.04);
  const boardZ = 0;

  const cpuX = trayX - 0.1;
  const cpuY = boardY + mbH * 0.2;
  const cpuZ = boardZ - mbD * 0.12;

  const gReach = (gpu ? gpu.dimensions.width : 130) * S;
  const gpuX = trayX - 0.06 - gReach / 2;             // juts from board toward glass
  const gpuY = boardY - mbH * 0.16;                    // top PCIe slot, below the CPU
  const gpuZ = boardZ;

  const psuH = (psu ? psu.dimensions.height : 86) * S;
  const psuY = floorY + 0.06 + psuH / 2;              // tucked in the basement under the shroud

  return (
    <group>
      {pcCase ? <CaseShell c={pcCase} /> : <Bench w={w} d={d} y={-hy} />}
      {build.MOBO && <Drop to={[trayX, boardY, boardZ]}><MoboPart c={build.MOBO as any} /></Drop>}
      {build.CPU && <Drop to={[cpuX, cpuY, cpuZ]}><CpuPart c={build.CPU as any} /></Drop>}
      {build.RAM && <Drop to={[trayX - 0.12, cpuY, boardZ + mbD * 0.2]}><RamPart c={build.RAM as any} /></Drop>}
      {build.STORAGE && <Drop to={[trayX - 0.09, boardY - mbH * 0.34, boardZ + mbD * 0.18]}><StoragePart c={build.STORAGE as any} /></Drop>}
      {build.GPU && <Drop to={[gpuX, gpuY, gpuZ]}><GpuPart c={build.GPU as any} /></Drop>}
      {build.PSU && <Drop to={[0, psuY, boardZ]}><PsuPart c={build.PSU as any} /></Drop>}
      {build.FANS && <Drop to={[-hx * 0.25, boardY * 0.2, -hz + 0.32]}><FansPart c={build.FANS as any} /></Drop>}
      {cooler && isAir && <Drop to={[cpuX - airHX * 0.45, cpuY, cpuZ]}><CoolerPart c={cooler} /></Drop>}
      {cooler && !isAir && (
        <>
          <Drop to={[cpuX, cpuY, cpuZ]}><CoolerPart c={cooler} /></Drop>
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
      {loading && <pointLight position={[gpuX, gpuY, gpuZ]} color="#ff7a3c" intensity={2.4} distance={6} />}
    </group>
  );
}

/** Imperatively drives scene background + fog so runtime scene switches apply
 *  reliably (declarative `<color args>` / `<fog args>` don't update on arg change). */
function SceneBackground({ color, fog }: { color: string; fog: [number, number] | null }) {
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    scene.background = new THREE.Color(color);
    scene.fog = fog ? new THREE.Fog(color, fog[0], fog[1]) : null;
  }, [scene, color, fog]);
  return null;
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

interface SceneCfg {
  bg: string; fog: [number, number] | null; stars: boolean;
  ground: string | null; grid: [string, string] | null;
  amb: number; hemi: number; hemiSky: string; hemiGround: string;
  vignette: number; bloom: number; hintColor: string;
}
const SCENES: Record<SceneStyle, SceneCfg> = {
  studio:   { bg: '#c7ccd6', fog: [20, 46], stars: false, ground: '#aeb4c0', grid: ['#9aa1ad', '#b6bcc6'], amb: 0.95, hemi: 0.8, hemiSky: '#ffffff', hemiGround: '#9098a4', vignette: 0.22, bloom: 0.5, hintColor: '#3a4150' },
  light:    { bg: '#eef1f6', fog: [22, 50], stars: false, ground: '#dfe3ea', grid: ['#d2d7df', '#e6e9ef'], amb: 1.15, hemi: 0.95, hemiSky: '#ffffff', hemiGround: '#c4cad3', vignette: 0.18, bloom: 0.45, hintColor: '#4a5160' },
  space:    { bg: '#05060e', fog: null, stars: true, ground: null, grid: null, amb: 0.5, hemi: 0.5, hemiSky: '#9fb4ff', hemiGround: '#0a0c14', vignette: 0.38, bloom: 0.75, hintColor: '#9aa4b8' },
  workshop: { bg: '#241f18', fog: [16, 40], stars: false, ground: '#3a2f22', grid: ['#3a3024', '#2a231a'], amb: 0.75, hemi: 0.6, hemiSky: '#ffe6c4', hemiGround: '#241c12', vignette: 0.32, bloom: 0.6, hintColor: '#d8c4a0' },
  carbon:   { bg: '#0a0c12', fog: [14, 30], stars: false, ground: null, grid: ['#1c2230', '#12161f'], amb: 0.7, hemi: 0.6, hemiSky: '#dfe8ff', hemiGround: '#2a2e38', vignette: 0.32, bloom: 0.7, hintColor: '#9aa4b8' },
};

export default function BuildScene({ build }: { build: Build }) {
  const empty = Object.keys(build).length === 0;
  const style = useSceneStore((s) => s.style);
  const cfg = SCENES[style];
  return (
    <Canvas
      flat
      shadows
      dpr={[1, 2]}
      camera={{ position: [-5.5, 3.2, 5.5], fov: 42 }}
      gl={{ antialias: true, powerPreference: 'high-performance' }}
    >
      <SceneBackground color={cfg.bg} fog={cfg.fog} />
      {cfg.stars && <Stars radius={120} depth={60} count={6000} factor={4} saturation={0} fade speed={0.6} />}

      <ambientLight intensity={cfg.amb} />
      <hemisphereLight intensity={cfg.hemi} color={cfg.hemiSky} groundColor={cfg.hemiGround} />
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
      {cfg.ground && (
        <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -2.43, 0]} receiveShadow>
          <planeGeometry args={[80, 80]} />
          <meshStandardMaterial color={cfg.ground} roughness={0.92} metalness={0} />
        </mesh>
      )}
      {cfg.grid && <gridHelper args={[30, 30, cfg.grid[0], cfg.grid[1]]} position={[0, -2.42, 0]} />}

      {empty && (
        <Html center zIndexRange={[20, 0]}>
          <div style={{ color: cfg.hintColor, fontFamily: 'system-ui', fontSize: 14, whiteSpace: 'nowrap' }}>
            Start building — pick any components →
          </div>
        </Html>
      )}

      <OrbitControls enablePan enableZoom enableDamping dampingFactor={0.08} minDistance={3} maxDistance={24} target={[0, 0, 0]} />

      <EffectComposer>
        <Bloom mipmapBlur luminanceThreshold={1.1} luminanceSmoothing={0.2} intensity={cfg.bloom} radius={0.7} />
        <Vignette offset={0.25} darkness={cfg.vignette} eskil={false} />
        <ToneMapping mode={ToneMappingMode.ACES_FILMIC} />
      </EffectComposer>
    </Canvas>
  );
}
