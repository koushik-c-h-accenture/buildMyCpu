import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildStore } from '../store/buildStore';
import GlbModel from './GlbModel';
import type { Case, Cooler, Cpu, Gpu, Mobo, Psu, Ram, Storage, Fans, BaseComponent } from '../lib/types';

const S = 1 / 100; // mm -> scene units

/** If a part defines a real model URL, render it; else fall back to procedural mesh. */
function Glb({ c, fit }: { c: BaseComponent; fit: number }) {
  return <GlbModel url={c.modelUrl!} fitSize={fit} />;
}
const maxDim = (c: BaseComponent) =>
  Math.max(c.dimensions.length, c.dimensions.width, c.dimensions.height) * S;

/** A spinning fan: square frame, hub, swept blades, and a bloom-friendly RGB ring. */
export function Fan({ radius = 0.45, color = '#15151b', glow = '#26e0ff', frame = true }:
  { radius?: number; color?: string; glow?: string; frame?: boolean }) {
  const ref = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const phase = useBuildStore.getState().phase;
    if (ref.current) {
      const speed = phase === 'testing' ? 18 : phase === 'done' ? 6 : 1.3;
      ref.current.rotation.z += dt * speed;
    }
    if (ring.current) ring.current.emissiveIntensity = phase === 'testing' ? 3.2 : 1.8;
  });
  const blades = [];
  const n = 9;
  for (let i = 0; i < n; i++) {
    const a = (i / n) * Math.PI * 2;
    blades.push(
      <mesh key={i} rotation={[0, 0, a]} position={[Math.cos(a) * radius * 0.5, Math.sin(a) * radius * 0.5, 0]}>
        <boxGeometry args={[radius * 0.66, radius * 0.34, radius * 0.06]} />
        <meshStandardMaterial color={color} metalness={0.1} roughness={0.55} transparent opacity={0.92} />
      </mesh>,
    );
  }
  const s = radius * 2.18; // square frame size
  return (
    <group>
      {frame && (
        <group>
          {/* square housing frame */}
          <mesh>
            <boxGeometry args={[s, s, radius * 0.4]} />
            <meshStandardMaterial color="#0c0c11" metalness={0.5} roughness={0.5} />
          </mesh>
          {/* circular bore (slightly proud, dark) */}
          <mesh position={[0, 0, radius * 0.04]}>
            <cylinderGeometry args={[radius * 1.02, radius * 1.02, radius * 0.46, 32]} />
            <meshStandardMaterial color="#070709" metalness={0.4} roughness={0.7} />
          </mesh>
        </group>
      )}
      {/* glowing RGB ring */}
      <mesh position={[0, 0, radius * 0.16]}>
        <torusGeometry args={[radius * 0.95, radius * 0.055, 10, 40]} />
        <meshStandardMaterial ref={ring} color={glow} emissive={glow} emissiveIntensity={1.8} toneMapped={false} />
      </mesh>
      <group ref={ref} position={[0, 0, radius * 0.06]}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.3, radius * 0.3, radius * 0.22, 20]} />
          <meshStandardMaterial color="#1a1a22" metalness={0.6} roughness={0.35} />
        </mesh>
        {/* hub badge */}
        <mesh position={[0, 0, radius * 0.12]}>
          <cylinderGeometry args={[radius * 0.16, radius * 0.16, 0.02, 20]} />
          <meshStandardMaterial color={glow} emissive={glow} emissiveIntensity={0.6} toneMapped={false} />
        </mesh>
        {blades}
      </group>
    </group>
  );
}

function Box({ size, color, metalness = 0.4, roughness = 0.55, edges, env = 1 }: {
  size: [number, number, number]; color: string; metalness?: number; roughness?: number; edges?: string; env?: number;
}) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} envMapIntensity={env} />
      {edges && <Edges color={edges} />}
    </mesh>
  );
}

export function MoboPart({ c }: { c: Mobo }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  const h = c.dimensions.width * S; // 244 -> Y
  const d = c.dimensions.length * S; // 305 -> Z
  return (
    <group>
      {/* dark PCB with subtle sheen */}
      <Box size={[0.07, h, d]} color="#10241c" metalness={0.25} roughness={0.62} edges="#0a1812" env={0.6} />
      {/* RGB accent stripe along the edge */}
      <mesh position={[-0.045, h * 0.46, 0]}>
        <boxGeometry args={[0.015, 0.05, d * 0.92]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      {/* CPU socket frame */}
      <mesh position={[-0.06, h * 0.2, -d * 0.12]}>
        <boxGeometry args={[0.06, 0.46, 0.46]} />
        <meshStandardMaterial color="#42424c" metalness={0.85} roughness={0.3} />
      </mesh>
      <mesh position={[-0.075, h * 0.2, -d * 0.12]}>
        <boxGeometry args={[0.03, 0.4, 0.4]} />
        <meshStandardMaterial color="#1c1c22" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* DIMM slots */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.05, h * 0.2, d * 0.16 + i * 0.11]}>
          <boxGeometry args={[0.035, 0.5, 0.05]} />
          <meshStandardMaterial color={i % 2 ? '#1a1a22' : '#2a2a34'} metalness={0.4} roughness={0.5} />
        </mesh>
      ))}
      {/* PCIe x16 slot (metal shielded) */}
      <mesh position={[-0.05, -h * 0.16, 0]}>
        <boxGeometry args={[0.04, 0.13, 1.4]} />
        <meshStandardMaterial color="#c9ccd2" metalness={0.9} roughness={0.25} />
      </mesh>
      {/* VRM heatsinks (finned) */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[-0.07, h * 0.42, -d * 0.32 * (s > 0 ? 0 : 1) - 0.1]}>
          <boxGeometry args={[0.1, 0.24, s > 0 ? 0.7 : 0.5]} />
          <meshStandardMaterial color="#26262c" metalness={0.85} roughness={0.3} />
        </mesh>
      ))}
      {/* chipset + M.2 heatsink covers */}
      <mesh position={[-0.07, -h * 0.34, d * 0.18]}>
        <boxGeometry args={[0.08, 0.05, 0.9]} />
        <meshStandardMaterial color="#1e1e26" metalness={0.7} roughness={0.4} />
      </mesh>
      <mesh position={[-0.08, -h * 0.05, -d * 0.34]}>
        <boxGeometry args={[0.09, 0.42, 0.42]} />
        <meshStandardMaterial color="#202028" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* rear I/O shroud with glow */}
      <mesh position={[-0.08, h * 0.34, -d * 0.46]}>
        <boxGeometry args={[0.1, 0.46, 0.16]} />
        <meshStandardMaterial color="#16161c" metalness={0.6} roughness={0.4} emissive={c.color} emissiveIntensity={0.5} />
      </mesh>
    </group>
  );
}

export function CpuPart({ c }: { c: Cpu }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  const w = c.dimensions.length * S;
  return (
    <group>
      {/* substrate */}
      <Box size={[0.04, w * 1.04, w * 1.04]} color="#0d0d12" metalness={0.3} roughness={0.6} />
      {/* IHS (brushed nickel) */}
      <mesh position={[-0.025, 0, 0]} castShadow>
        <boxGeometry args={[0.03, w * 0.82, w * 0.82]} />
        <meshStandardMaterial color="#d6d8dc" metalness={0.95} roughness={0.28} envMapIntensity={1.4} />
      </mesh>
      {/* engraved notch */}
      <mesh position={[-0.041, w * 0.28, w * 0.28]}>
        <boxGeometry args={[0.012, 0.06, 0.06]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.6} toneMapped={false} />
      </mesh>
    </group>
  );
}

export function RamPart({ c }: { c: Ram }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  const count = Math.max(2, c.modules);
  const tall = c.dimensions.height * S * 0.012 + 0.5; // taller for fancier kits
  const sticks = [];
  for (let i = 0; i < count; i++) {
    sticks.push(
      <group key={i} position={[0, 0, i * 0.12]}>
        {/* heatspreader */}
        <Box size={[0.16, tall, 0.06]} color={c.color} metalness={0.85} roughness={0.32} env={1.2} />
        {/* RGB diffuser bar on top */}
        <mesh position={[0, tall * 0.54, 0]}>
          <boxGeometry args={[0.165, 0.06, 0.07]} />
          <meshStandardMaterial color="#ffffff" emissive={c.color} emissiveIntensity={1.6} toneMapped={false} />
        </mesh>
      </group>,
    );
  }
  return <group>{sticks}</group>;
}

export function GpuPart({ c }: { c: Gpu }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  const len = c.dimensions.length * S; // -> Z
  const ht = c.dimensions.width * S;   // -> Y
  const th = c.dimensions.height * S;  // -> X (thickness)
  const fanCount = len > 2.6 ? 3 : 2;
  const fanR = Math.min(0.52, (len / fanCount) / 2 - 0.05, ht * 0.42);
  const fans = [];
  for (let i = 0; i < fanCount; i++) {
    const z = -len / 2 + (len / fanCount) * (i + 0.5);
    fans.push(
      <group key={i} position={[-th * 0.5 - 0.01, -ht * 0.04, z]} rotation={[0, Math.PI / 2, 0]}>
        <Fan radius={fanR} color="#0e0e14" glow="#39ffcf" />
      </group>,
    );
  }
  return (
    <group>
      {/* shroud */}
      <Box size={[th, ht, len]} color={c.color} metalness={0.6} roughness={0.42} edges="#08080a" env={1.1} />
      {/* darker top channel */}
      <mesh position={[0, ht * 0.5 + 0.005, 0]}>
        <boxGeometry args={[th * 0.96, 0.02, len * 0.98]} />
        <meshStandardMaterial color="#101015" metalness={0.7} roughness={0.4} />
      </mesh>
      {/* RGB logo strip along the top edge */}
      <mesh position={[0, ht * 0.5 + 0.018, len * 0.1]}>
        <boxGeometry args={[th * 0.5, 0.012, len * 0.34]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={1.5} toneMapped={false} />
      </mesh>
      {/* backplate */}
      <mesh position={[th * 0.5 + 0.012, 0, 0]} castShadow>
        <boxGeometry args={[0.02, ht * 0.96, len * 0.96]} />
        <meshStandardMaterial color="#15151b" metalness={0.7} roughness={0.35} />
      </mesh>
      {fans}
    </group>
  );
}

export function PsuPart({ c }: { c: Psu }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  const w = c.dimensions.width * S;
  const h = c.dimensions.height * S;
  const d = c.dimensions.length * S;
  return (
    <group>
      <Box size={[w, h, d]} color="#1c1c22" metalness={0.7} roughness={0.4} edges="#08080a" env={1} />
      {/* brushed side accent */}
      <mesh position={[-w / 2 - 0.008, 0, 0]}>
        <boxGeometry args={[0.016, h * 0.6, d * 0.55]} />
        <meshStandardMaterial color={c.color} metalness={0.6} roughness={0.4} emissive={c.color} emissiveIntensity={0.25} />
      </mesh>
      {/* intake fan grille on top */}
      <group position={[0, h * 0.5 + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <Fan radius={Math.min(0.62, w * 0.42)} color="#0c0c10" glow="#2f6df0" frame={false} />
      </group>
    </group>
  );
}

/** Air-cooler heatpipes helper. */
function Heatpipes({ hX, wY, dZ }: { hX: number; wY: number; dZ: number }) {
  const pipes = [];
  for (let i = 0; i < 6; i++) {
    const z = -dZ * 0.32 + (i / 5) * dZ * 0.64;
    pipes.push(
      <mesh key={i} position={[hX * 0.1, wY * 0.55, z]} rotation={[0, 0, Math.PI / 2]}>
        <cylinderGeometry args={[0.03, 0.03, hX * 0.8, 12]} />
        <meshStandardMaterial color="#c08a4a" metalness={0.95} roughness={0.25} envMapIntensity={1.4} />
      </mesh>,
    );
  }
  return <group>{pipes}</group>;
}

export function CoolerPart({ c }: { c: Cooler }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  if (c.coolerType === 'Air') {
    const hX = c.dimensions.height * S;
    const wY = c.dimensions.width * S;
    const dZ = c.dimensions.length * S;
    const fins = [];
    const n = 16;
    for (let i = 0; i < n; i++) {
      fins.push(
        <mesh key={i} position={[-hX * 0.5 + (i / (n - 1)) * hX * 0.86, wY * 0.12, 0]} castShadow>
          <boxGeometry args={[0.014, wY * 0.78, dZ * 0.82]} />
          <meshStandardMaterial color="#d2d6dc" metalness={0.92} roughness={0.22} envMapIntensity={1.5} />
        </mesh>,
      );
    }
    return (
      <group>
        {fins}
        <Heatpipes hX={hX} wY={wY} dZ={dZ} />
        {/* base block on CPU */}
        <mesh position={[hX * 0.45, -wY * 0.32, 0]}>
          <boxGeometry args={[0.12, 0.16, 0.42]} />
          <meshStandardMaterial color="#2a2a32" metalness={0.85} roughness={0.28} />
        </mesh>
        {/* fan on the -X face */}
        <group position={[-hX * 0.54, wY * 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Fan radius={Math.min(0.6, wY * 0.42)} color={c.color} glow="#26e0ff" />
        </group>
      </group>
    );
  }
  // AIO pump block (radiator is placed separately, see RadiatorPart)
  return (
    <group>
      <mesh castShadow>
        <cylinderGeometry args={[0.24, 0.26, 0.18, 28]} />
        <meshStandardMaterial color="#15151d" metalness={0.8} roughness={0.3} />
      </mesh>
      {/* infinity-mirror RGB top */}
      <mesh position={[0, 0.1, 0]}>
        <cylinderGeometry args={[0.2, 0.2, 0.03, 28]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={2.0} toneMapped={false} />
      </mesh>
      {/* braided tubes stub */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[s * 0.12, 0.16, -0.05]} rotation={[0.5, 0, 0]}>
          <cylinderGeometry args={[0.05, 0.05, 0.4, 12]} />
          <meshStandardMaterial color="#0e0e12" metalness={0.4} roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

/** AIO radiator + fans, mounted at the top of the case. */
export function RadiatorPart({ c }: { c: Cooler }) {
  const len = c.radiatorSizeMm * S;
  const fanCount = Math.round(c.radiatorSizeMm / 120);
  const fanR = Math.min(0.55, len / fanCount / 2 - 0.04);
  const fans = [];
  for (let i = 0; i < fanCount; i++) {
    const z = -len / 2 + len / (fanCount * 2) + (i * len) / fanCount;
    fans.push(
      <group key={i} position={[0, -0.2, z]} rotation={[Math.PI / 2, 0, 0]}>
        <Fan radius={fanR} color="#0e0e14" glow="#26e0ff" />
      </group>,
    );
  }
  return (
    <group>
      {/* finned radiator core */}
      <mesh castShadow>
        <boxGeometry args={[1.2, 0.14, len]} />
        <meshStandardMaterial color="#17171d" metalness={0.6} roughness={0.5} />
        <Edges color="#2c2c34" />
      </mesh>
      {/* end tanks */}
      {[-1, 1].map((s) => (
        <mesh key={s} position={[0, 0, (s * len) / 2]}>
          <boxGeometry args={[1.18, 0.16, 0.06]} />
          <meshStandardMaterial color="#0e0e12" metalness={0.7} roughness={0.4} />
        </mesh>
      ))}
      {fans}
    </group>
  );
}

export function StoragePart({ c }: { c: Storage }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  const len = c.dimensions.length * S;
  const wid = c.dimensions.width * S;
  if (c.iface === 'NVMe') {
    return (
      <group>
        {/* M.2 PCB */}
        <Box size={[0.03, wid, len]} color="#0e1c16" metalness={0.3} roughness={0.6} />
        {/* heatsink */}
        <mesh position={[-0.03, 0, 0]} castShadow>
          <boxGeometry args={[0.05, wid * 0.92, len * 0.86]} />
          <meshStandardMaterial color={c.color} metalness={0.85} roughness={0.3} envMapIntensity={1.2} />
        </mesh>
        <mesh position={[-0.056, 0, 0]}>
          <boxGeometry args={[0.012, wid * 0.5, len * 0.5]} />
          <meshStandardMaterial color="#ffffff" emissive={c.color} emissiveIntensity={0.5} toneMapped={false} />
        </mesh>
      </group>
    );
  }
  // 2.5" SATA / 3.5" HDD
  return (
    <group>
      <Box size={[wid * 0.4, wid, len]} color={c.color} metalness={0.75} roughness={0.35} edges="#08080a" env={1} />
      <mesh position={[-wid * 0.21, 0, 0]}>
        <boxGeometry args={[0.012, wid * 0.6, len * 0.5]} />
        <meshStandardMaterial color="#0a0a0e" metalness={0.3} roughness={0.7} />
      </mesh>
    </group>
  );
}

const RGB = ['#ff3b6b', '#39e06b', '#3b7bff', '#ffd23b', '#b14bff'];
export function FansPart({ c }: { c: Fans }) {
  if (c.modelUrl) return <Glb c={c} fit={maxDim(c)} />;
  const n = Math.min(3, c.count);
  const fans = [];
  for (let i = 0; i < n; i++) {
    fans.push(
      <group key={i} position={[0, (i - (n - 1) / 2) * 1.05, 0]}>
        <Fan radius={0.48} color={c.color} glow={RGB[i % RGB.length]} />
      </group>,
    );
  }
  return <group>{fans}</group>;
}

/** Expanding particle burst + red flash, shown when an incompatible build powers on. */
export function Burst() {
  const ref = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  const dirs = useRef(
    Array.from({ length: 44 }, () => new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()),
  );
  useFrame((_, dt) => {
    t.current = (t.current + dt) % 1.6;
    const e = t.current / 1.6;
    if (ref.current) {
      ref.current.children.forEach((m, i) => {
        const d = dirs.current[i];
        const r = e * 3.4;
        m.position.set(d.x * r, d.y * r, d.z * r);
        m.scale.setScalar(Math.max(0.01, 1 - e));
      });
    }
    if (light.current) light.current.intensity = Math.max(0, 9 * (1 - e * 1.5));
  });
  return (
    <group>
      <pointLight ref={light} color="#ff3b3b" position={[0, 0.4, 0]} intensity={9} distance={14} />
      <group ref={ref}>
        {dirs.current.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#ff6a3c" emissive="#ff3b1e" emissiveIntensity={3} toneMapped={false} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Airflow streaks. Density scales with the number of fans; streaks flow
 * front→back (intake→exhaust) and rise as they pass the CPU/cooler — picking up
 * heat (cool blue intake → warm orange exhaust).
 */
export function Airflow({ extent, fans, speed }: { extent: [number, number, number]; fans: number; speed: number }) {
  const ref = useRef<THREE.Group>(null);
  const n = Math.max(0, Math.min(24, fans * 2));
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.children.forEach((m) => {
      m.position.z -= dt * speed;
      m.position.y += dt * speed * 0.12;
      const mat = (m as THREE.Mesh).material as THREE.MeshBasicMaterial;
      const warmth = THREE.MathUtils.clamp((extent[2] - m.position.z) / (extent[2] * 2), 0, 1);
      mat.color.setRGB(0.04 + warmth * 0.96, 0.52 - warmth * 0.2, 1 - warmth * 0.8);
      if (m.position.z < -extent[2]) {
        m.position.z = extent[2];
        m.position.x = (Math.random() - 0.5) * extent[0] * 1.2;
        m.position.y = -extent[1] * 0.6 + Math.random() * extent[1] * 0.6;
      }
    });
  });
  const streaks = [];
  for (let i = 0; i < n; i++) {
    streaks.push(
      <mesh key={i} position={[(Math.random() - 0.5) * extent[0] * 1.2, -extent[1] * 0.6 + Math.random() * extent[1] * 1.4, (Math.random() - 0.5) * extent[2] * 2]}>
        <planeGeometry args={[0.05, 0.6]} />
        <meshBasicMaterial color="#0a86ff" transparent opacity={0.5} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>,
    );
  }
  return <group ref={ref}>{streaks}</group>;
}

export function CaseShell({ c }: { c: Case }) {
  const w = c.dimensions.width * S;
  const h = c.dimensions.height * S;
  const d = c.dimensions.length * S;
  const frame = '#0d0d11';
  return (
    <group>
      {/* steel frame edges */}
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#101015" transparent opacity={0.03} side={THREE.BackSide} />
        <Edges color="#3a3f4a" />
      </mesh>
      {/* motherboard tray (back panel, +X) */}
      <mesh position={[w / 2 - 0.02, 0, 0]} receiveShadow>
        <boxGeometry args={[0.04, h * 0.98, d * 0.98]} />
        <meshStandardMaterial color="#16181d" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* top panel */}
      <mesh position={[0, h / 2 - 0.02, 0]}>
        <boxGeometry args={[w * 0.98, 0.04, d * 0.98]} />
        <meshStandardMaterial color={frame} metalness={0.5} roughness={0.6} />
      </mesh>
      {/* bottom PSU shroud */}
      <mesh position={[0, -h / 2 + 0.02, 0]} receiveShadow>
        <boxGeometry args={[w * 0.98, 0.04, d * 0.98]} />
        <meshStandardMaterial color="#14151a" metalness={0.4} roughness={0.7} />
      </mesh>
      {/* shroud cover over PSU bay */}
      <mesh position={[0, -h / 2 + 0.5, 0]}>
        <boxGeometry args={[w * 0.9, 0.9, d * 0.6]} />
        <meshStandardMaterial color="#1a1b21" metalness={0.4} roughness={0.65} />
      </mesh>
      {/* tempered-glass side panel (camera side, -X) */}
      <mesh position={[-w / 2 + 0.02, 0, 0]}>
        <boxGeometry args={[0.025, h * 0.95, d * 0.95]} />
        <meshPhysicalMaterial
          color="#9fc7e8" transparent opacity={0.16} roughness={0.04} metalness={0}
          transmission={0.92} thickness={0.4} ior={1.5} reflectivity={0.5} side={THREE.DoubleSide}
        />
      </mesh>
      {/* front mesh panel (-Z) */}
      <mesh position={[0, 0, -d / 2 + 0.02]}>
        <boxGeometry args={[w * 0.96, h * 0.92, 0.03]} />
        <meshStandardMaterial color="#101116" metalness={0.5} roughness={0.55} />
      </mesh>
    </group>
  );
}

export { S };
