import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Edges } from '@react-three/drei';
import * as THREE from 'three';
import { useBuildStore } from '../store/buildStore';
import type { Case, Cooler, Cpu, Gpu, Mobo, Psu, Ram, Storage, Fans } from '../lib/types';

const S = 1 / 100; // mm -> scene units

/** A spinning fan (hub + blades + RGB glow ring), local spin axis = +Z. */
export function Fan({ radius = 0.45, color = '#15151b', glow = '#26e0ff' }: { radius?: number; color?: string; glow?: string }) {
  const ref = useRef<THREE.Group>(null);
  const ring = useRef<THREE.MeshStandardMaterial>(null);
  useFrame((_, dt) => {
    const phase = useBuildStore.getState().phase;
    if (ref.current) {
      const speed = phase === 'testing' ? 16 : phase === 'done' ? 5 : 1.3;
      ref.current.rotation.z += dt * speed;
    }
    // pulse the RGB ring brighter under load
    if (ring.current) ring.current.emissiveIntensity = phase === 'testing' ? 2.6 : 1.4;
  });
  const blades = [];
  for (let i = 0; i < 9; i++) {
    const a = (i / 9) * Math.PI * 2;
    blades.push(
      <mesh key={i} rotation={[0, 0, a]} position={[Math.cos(a) * radius * 0.55, Math.sin(a) * radius * 0.55, 0]}>
        <boxGeometry args={[radius * 0.62, radius * 0.2, radius * 0.12]} />
        <meshStandardMaterial color={color} metalness={0.2} roughness={0.7} />
      </mesh>,
    );
  }
  return (
    <group>
      {/* dark housing */}
      <mesh>
        <torusGeometry args={[radius, radius * 0.14, 8, 24]} />
        <meshStandardMaterial color="#0c0c10" metalness={0.4} roughness={0.6} />
      </mesh>
      {/* glowing RGB ring */}
      <mesh>
        <torusGeometry args={[radius * 0.92, radius * 0.06, 8, 28]} />
        <meshStandardMaterial ref={ring} color={glow} emissive={glow} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
      <group ref={ref}>
        <mesh rotation={[Math.PI / 2, 0, 0]}>
          <cylinderGeometry args={[radius * 0.28, radius * 0.28, radius * 0.18, 16]} />
          <meshStandardMaterial color="#202028" metalness={0.5} roughness={0.4} />
        </mesh>
        {blades}
      </group>
    </group>
  );
}

function Box({ size, color, metalness = 0.4, roughness = 0.55, edges }: {
  size: [number, number, number]; color: string; metalness?: number; roughness?: number; edges?: string;
}) {
  return (
    <mesh castShadow receiveShadow>
      <boxGeometry args={size} />
      <meshStandardMaterial color={color} metalness={metalness} roughness={roughness} />
      {edges && <Edges color={edges} />}
    </mesh>
  );
}

export function MoboPart({ c }: { c: Mobo }) {
  const h = c.dimensions.width * S; // 244 -> Y
  const d = c.dimensions.length * S; // 305 -> Z
  return (
    <group>
      {/* green PCB for instant recognition */}
      <Box size={[0.07, h, d]} color="#1c4a39" metalness={0.15} roughness={0.75} edges="#0c1a14" />
      {/* brand accent stripe */}
      <mesh position={[-0.04, h * 0.42, 0]}>
        <boxGeometry args={[0.02, 0.06, d * 0.9]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.5} toneMapped={false} />
      </mesh>
      {/* CPU socket */}
      <mesh position={[-0.06, h * 0.22, -d * 0.12]}>
        <boxGeometry args={[0.05, 0.42, 0.42]} />
        <meshStandardMaterial color="#3a3a42" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* DIMM slots */}
      {[0, 1, 2, 3].map((i) => (
        <mesh key={i} position={[-0.05, h * 0.22, d * 0.18 + i * 0.12]}>
          <boxGeometry args={[0.03, 0.5, 0.06]} />
          <meshStandardMaterial color="#111118" />
        </mesh>
      ))}
      {/* PCIe x16 slot */}
      <mesh position={[-0.05, -h * 0.18, 0]}>
        <boxGeometry args={[0.03, 0.12, 1.4]} />
        <meshStandardMaterial color="#c98a2a" metalness={0.5} roughness={0.4} />
      </mesh>
      {/* VRM heatsinks */}
      <mesh position={[-0.06, h * 0.42, -d * 0.1]}>
        <boxGeometry args={[0.08, 0.22, 0.8]} />
        <meshStandardMaterial color="#26262c" metalness={0.7} roughness={0.35} />
      </mesh>
    </group>
  );
}

export function CpuPart({ c }: { c: Cpu }) {
  const w = c.dimensions.length * S;
  return (
    <group>
      <Box size={[0.05, w, w]} color={c.color} metalness={0.7} roughness={0.3} />
      <mesh position={[-0.03, 0, 0]}>
        <boxGeometry args={[0.02, w * 0.6, w * 0.6]} />
        <meshStandardMaterial color="#d4d4d8" metalness={0.9} roughness={0.2} />
      </mesh>
    </group>
  );
}

export function RamPart({ c }: { c: Ram }) {
  const count = Math.max(2, c.modules);
  const sticks = [];
  for (let i = 0; i < count; i++) {
    sticks.push(
      <group key={i} position={[0, 0, i * 0.12]}>
        <Box size={[0.16, 0.52, 0.06]} color={c.color} metalness={0.6} roughness={0.35} />
        <mesh position={[0, 0.28, 0]}>
          <boxGeometry args={[0.17, 0.07, 0.065]} />
          <meshStandardMaterial color="#ffffff" emissive={c.color} emissiveIntensity={1.0} toneMapped={false} />
        </mesh>
      </group>,
    );
  }
  return <group>{sticks}</group>;
}

export function GpuPart({ c }: { c: Gpu }) {
  const len = c.dimensions.length * S; // 304 -> Z
  const ht = c.dimensions.width * S; // 137 -> Y
  const th = c.dimensions.height * S; // 61 -> X
  return (
    <group>
      {/* shroud */}
      <Box size={[th, ht, len]} color={c.color} metalness={0.5} roughness={0.5} edges="#0a0a0a" />
      {/* backplate */}
      <mesh position={[th * 0.5 + 0.01, 0, 0]}>
        <boxGeometry args={[0.02, ht * 0.95, len * 0.95]} />
        <meshStandardMaterial color="#1a1a20" metalness={0.6} roughness={0.4} />
      </mesh>
      {/* fans on the underside (-X face) */}
      {[-1, 1].map((s) => (
        <group key={s} position={[-th * 0.5 - 0.01, -ht * 0.05, s * len * 0.24]} rotation={[0, Math.PI / 2, 0]}>
          <Fan radius={Math.min(0.5, ht * 0.42)} color="#101015" glow="#39ffcf" />
        </group>
      ))}
    </group>
  );
}

export function PsuPart({ c }: { c: Psu }) {
  const w = c.dimensions.width * S;
  const h = c.dimensions.height * S;
  const d = c.dimensions.length * S;
  return (
    <group>
      <Box size={[w, h, d]} color="#23232a" metalness={0.55} roughness={0.45} edges="#0a0a0a" />
      {/* brand label plate (camera-facing -X side) */}
      <mesh position={[-w / 2 - 0.01, 0, 0]}>
        <boxGeometry args={[0.02, h * 0.55, d * 0.5]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={0.3} toneMapped={false} />
      </mesh>
      <group position={[0, h * 0.5 + 0.01, 0]} rotation={[Math.PI / 2, 0, 0]}>
        <Fan radius={Math.min(0.6, w * 0.4)} color="#0c0c10" glow="#2f6df0" />
      </group>
    </group>
  );
}

export function CoolerPart({ c }: { c: Cooler }) {
  if (c.coolerType === 'Air') {
    const hX = c.dimensions.height * S; // 165 -> X (extends off board)
    const wY = c.dimensions.width * S;
    const dZ = c.dimensions.length * S;
    // finned tower: stack of thin plates along X
    const fins = [];
    const n = 10;
    for (let i = 0; i < n; i++) {
      fins.push(
        <mesh key={i} position={[-hX * 0.5 + (i / (n - 1)) * hX * 0.9, wY * 0.1, 0]}>
          <boxGeometry args={[0.025, wY * 0.8, dZ * 0.85]} />
          <meshStandardMaterial color="#c8ccd2" metalness={0.85} roughness={0.25} />
        </mesh>,
      );
    }
    return (
      <group>
        {fins}
        {/* base block on CPU */}
        <mesh position={[hX * 0.45, -wY * 0.3, 0]}>
          <boxGeometry args={[0.12, 0.18, 0.4]} />
          <meshStandardMaterial color="#2a2a30" metalness={0.7} roughness={0.3} />
        </mesh>
        {/* fan on the -X face */}
        <group position={[-hX * 0.55, wY * 0.1, 0]} rotation={[0, Math.PI / 2, 0]}>
          <Fan radius={Math.min(0.6, wY * 0.4)} color={c.color} glow="#26e0ff" />
        </group>
      </group>
    );
  }
  // AIO: this part renders only the pump block on the CPU; the radiator is a
  // separate piece placed at the top of the case (see BuildScene).
  return (
    <group>
      <mesh>
        <cylinderGeometry args={[0.22, 0.22, 0.16, 24]} />
        <meshStandardMaterial color="#1a1a22" metalness={0.6} roughness={0.3} emissive={c.color} emissiveIntensity={0.5} />
      </mesh>
      <mesh position={[0, 0.09, 0]}>
        <cylinderGeometry args={[0.18, 0.18, 0.03, 24]} />
        <meshStandardMaterial color={c.color} emissive={c.color} emissiveIntensity={1.4} toneMapped={false} />
      </mesh>
    </group>
  );
}

/** AIO radiator + fans, mounted at top of case. */
export function RadiatorPart({ c }: { c: Cooler }) {
  const len = c.radiatorSizeMm * S; // 360 -> Z
  const fanR = Math.min(0.55, len / (c.radiatorSizeMm / 120) / 2 - 0.05);
  const fanCount = Math.round(c.radiatorSizeMm / 120);
  const fans = [];
  for (let i = 0; i < fanCount; i++) {
    const z = -len / 2 + len / (fanCount * 2) + (i * len) / fanCount;
    fans.push(
      <group key={i} position={[0, -0.18, z]} rotation={[Math.PI / 2, 0, 0]}>
        <Fan radius={fanR} color="#101015" glow="#26e0ff" />
      </group>,
    );
  }
  return (
    <group>
      <mesh>
        <boxGeometry args={[1.2, 0.12, len]} />
        <meshStandardMaterial color="#15151b" metalness={0.5} roughness={0.5} />
        <Edges color="#2a2a32" />
      </mesh>
      {fans}
    </group>
  );
}

export function StoragePart({ c }: { c: Storage }) {
  const len = c.dimensions.length * S;
  const wid = c.dimensions.width * S;
  return (
    <group>
      <Box size={[0.04, wid, len]} color={c.color} metalness={0.6} roughness={0.4} edges="#0a0a0a" />
      <mesh position={[-0.03, 0, 0]}>
        <boxGeometry args={[0.02, wid * 0.7, len * 0.5]} />
        <meshStandardMaterial color="#0a0a0e" />
      </mesh>
    </group>
  );
}

const RGB = ['#ff3b6b', '#39e06b', '#3b7bff', '#ffd23b'];
export function FansPart({ c }: { c: Fans }) {
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

/** Expanding particle burst + red flash, shown when an incompatible build is powered on. */
export function Burst() {
  const ref = useRef<THREE.Group>(null);
  const light = useRef<THREE.PointLight>(null);
  const t = useRef(0);
  const dirs = useRef(
    Array.from({ length: 36 }, () => new THREE.Vector3(Math.random() * 2 - 1, Math.random() * 2 - 1, Math.random() * 2 - 1).normalize()),
  );
  useFrame((_, dt) => {
    t.current = (t.current + dt) % 1.6;
    const e = t.current / 1.6;
    if (ref.current) {
      ref.current.children.forEach((m, i) => {
        const d = dirs.current[i];
        const r = e * 3.2;
        m.position.set(d.x * r, d.y * r, d.z * r);
        m.scale.setScalar(Math.max(0.01, 1 - e));
      });
    }
    if (light.current) light.current.intensity = Math.max(0, 6 * (1 - e * 1.5));
  });
  return (
    <group>
      <pointLight ref={light} color="#ff3b3b" position={[0, 0.4, 0]} intensity={6} distance={12} />
      <group ref={ref}>
        {dirs.current.map((_, i) => (
          <mesh key={i}>
            <sphereGeometry args={[0.09, 8, 8]} />
            <meshStandardMaterial color="#ff5a3c" emissive="#ff3b1e" emissiveIntensity={2} />
          </mesh>
        ))}
      </group>
    </group>
  );
}

/**
 * Airflow streaks. Density scales with the number of fans, and the streaks flow
 * front→back (intake→exhaust) with an upward drift as they pass the CPU/cooler —
 * picking up heat (cool blue intake → warm orange exhaust).
 */
export function Airflow({ extent, fans, speed }: { extent: [number, number, number]; fans: number; speed: number }) {
  const ref = useRef<THREE.Group>(null);
  const n = Math.max(0, Math.min(20, fans * 2));
  useFrame((_, dt) => {
    if (!ref.current) return;
    ref.current.children.forEach((m) => {
      m.position.z -= dt * speed;
      m.position.y += dt * speed * 0.12; // rises as it heats up
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
        <meshBasicMaterial color="#0a86ff" transparent opacity={0.55} side={THREE.DoubleSide} toneMapped={false} />
      </mesh>,
    );
  }
  return <group ref={ref}>{streaks}</group>;
}

export function CaseShell({ c }: { c: Case }) {
  const w = c.dimensions.width * S;
  const h = c.dimensions.height * S;
  const d = c.dimensions.length * S;
  return (
    <group>
      <mesh>
        <boxGeometry args={[w, h, d]} />
        <meshStandardMaterial color="#aeb6c4" transparent opacity={0.05} side={THREE.BackSide} />
        <Edges color="#7b8290" />
      </mesh>
      {/* back panel (motherboard tray side) — medium grey backdrop for contrast */}
      <mesh position={[w / 2 - 0.02, 0, 0]}>
        <boxGeometry args={[0.04, h * 0.98, d * 0.98]} />
        <meshStandardMaterial color="#3b414c" metalness={0.2} roughness={0.85} />
      </mesh>
      {/* bottom PSU shroud */}
      <mesh position={[0, -h / 2 + 0.02, 0]}>
        <boxGeometry args={[w * 0.98, 0.04, d * 0.98]} />
        <meshStandardMaterial color="#2f343d" metalness={0.2} roughness={0.85} />
      </mesh>
    </group>
  );
}

export { S };
