import { Canvas } from '@react-three/fiber';
import { OrbitControls, Edges, Html } from '@react-three/drei';
import type { Build, Category, Component } from '../lib/types';

// Render scale: millimetres -> scene units (1 unit = 100mm).
const S = 1 / 100;

// Fixed placement slots inside the case (in scene units), roughly anatomical.
const SLOTS: Record<Category, [number, number, number]> = {
  CASE: [0, 0, 0],
  MOBO: [-0.6, 0.3, -0.9],
  CPU: [-0.6, 1.1, -0.85],
  COOLER: [-0.6, 1.5, -0.7],
  RAM: [0.4, 1.0, -0.85],
  GPU: [-0.2, -0.2, -0.5],
  PSU: [-0.9, -1.4, -0.4],
};

function Part({ component, position }: { component: Component; position: [number, number, number] }) {
  const { length, width, height } = component.dimensions;
  return (
    <mesh position={position}>
      <boxGeometry args={[length * S, height * S, width * S]} />
      <meshStandardMaterial color={component.color} metalness={0.3} roughness={0.6} />
      <Edges color="#000000" />
      <Html position={[0, height * S / 2 + 0.15, 0]} center distanceFactor={10}>
        <div style={{
          fontSize: 10, color: '#cdd6f4', background: 'rgba(20,20,28,0.8)',
          padding: '1px 5px', borderRadius: 4, whiteSpace: 'nowrap',
          pointerEvents: 'none', fontFamily: 'system-ui',
        }}>{component.model}</div>
      </Html>
    </mesh>
  );
}

function CaseShell({ pcCase }: { pcCase: Component }) {
  const { length, width, height } = pcCase.dimensions;
  return (
    <mesh position={[0, 0, 0]}>
      <boxGeometry args={[width * S, height * S, length * S]} />
      <meshStandardMaterial color={pcCase.color} transparent opacity={0.12} />
      <Edges color="#7f849c" />
    </mesh>
  );
}

export default function BuildScene({ build }: { build: Build }) {
  const pcCase = build.CASE;
  return (
    <Canvas camera={{ position: [4, 3, 5], fov: 45 }} style={{ background: '#11111b' }}>
      <ambientLight intensity={0.6} />
      <directionalLight position={[5, 8, 5]} intensity={1.1} castShadow />
      <directionalLight position={[-5, 3, -5]} intensity={0.4} />

      {pcCase && <CaseShell pcCase={pcCase} />}
      {(Object.keys(build) as Category[])
        .filter((cat) => cat !== 'CASE' && build[cat])
        .map((cat) => (
          <Part key={cat} component={build[cat]!} position={SLOTS[cat]} />
        ))}

      {!pcCase && (
        <Html center>
          <div style={{ color: '#6c7086', fontFamily: 'system-ui', fontSize: 14 }}>
            Select a case to begin →
          </div>
        </Html>
      )}

      <gridHelper args={[12, 12, '#313244', '#1e1e2e']} position={[0, -2.3, 0]} />
      <OrbitControls enablePan enableZoom enableRotate minDistance={2} maxDistance={20} />
    </Canvas>
  );
}
