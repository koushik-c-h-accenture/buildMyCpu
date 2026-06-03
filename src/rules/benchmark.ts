import type { Build, Cooler, Cpu, Gpu, Ram, Category } from '../lib/types';
import { isBuildValid } from './compatibility';

export interface ScoreBreakdown {
  cpuScore: number;
  gpuScore: number;
  thermalFactor: number;
  synergyFactor: number;
  memoryFactor: number;
  finalScore: number;     // headline performance score
  coolingScore: number;   // 0-100, thermal headroom
  valueScore: number;     // performance per $100
  throughputScore: number; // memory + compute throughput proxy
  totalWatts: number;
  totalPrice: number;
}

const ALL: Category[] = ['CASE', 'MOBO', 'CPU', 'COOLER', 'RAM', 'GPU', 'PSU'];

/** CPU thermal headroom: the CPU cooler only cools the CPU (the GPU has its own). */
function cpuThermal(cooler: Cooler, cpu: Cpu): number {
  const ratio = cooler.dissipationWatts / Math.max(1, cpu.tdpWatts);
  if (ratio >= 1.3) return 1.0;
  if (ratio >= 1.0) return 0.92 + 0.08 * ((ratio - 1.0) / 0.3);
  return Math.max(0.75, 0.92 * ratio);
}

function synergy(cpuScore: number, gpuScore: number): number {
  if (cpuScore === 0) return 1;
  const ratio = gpuScore / cpuScore;
  if (ratio > 3.0) return 0.9;
  if (ratio < 0.4) return 0.92;
  return 1.0 + 0.1 * (1 - Math.min(1, Math.abs(ratio - 1.5) / 1.5));
}

function memoryFactor(ram: Ram): number {
  const speedF = Math.min(1.15, 0.9 + (ram.speedMhz - 3200) / 20000);
  const capF = Math.min(1.1, 0.95 + ram.capacityGb / 256);
  return speedF * capF;
}

/**
 * Deterministic multi-factor benchmark. Same build → same scores, every time.
 * Mirrored server-side in the submit-build Edge Function for authoritative scoring.
 */
export function runBenchmark(b: Build): ScoreBreakdown {
  if (!isBuildValid(b)) throw new Error('Cannot benchmark an invalid build');
  const cpu = b.CPU as Cpu;
  const gpu = b.GPU as Gpu;
  const ram = b.RAM as Ram;
  const cooler = b.COOLER as Cooler;

  const thermal = cpuThermal(cooler, cpu);
  const cpuScore = Math.round(cpu.benchBase * cpu.cores * cpu.boostClock * thermal * 6);
  const gpuScore = Math.round(gpu.benchBase * (gpu.vramGb / 8 + 1) * (1 + gpu.benchBase / 100) * 40);

  const synergyFactor = synergy(cpuScore, gpuScore);
  const memFactor = memoryFactor(ram);
  const finalScore = Math.round((cpuScore + gpuScore) * synergyFactor * memFactor);

  const totalWatts = ALL.reduce((s, c) => s + (b[c]?.tdpWatts ?? 0), 0);
  const totalPrice = ALL.reduce((s, c) => s + (b[c]?.priceUsd ?? 0), 0);

  // Cooling: headroom of cooler vs CPU heat, capped at 100.
  const coolingScore = Math.min(100, Math.round((cooler.dissipationWatts / Math.max(1, cpu.tdpWatts)) * 70));
  // Value: performance delivered per $100 spent.
  const valueScore = Math.round((finalScore / Math.max(1, totalPrice)) * 100);
  // Throughput: memory bandwidth proxy + threads + VRAM.
  const throughputScore = Math.round(
    (ram.speedMhz * ram.modules) / 100 + cpu.threads * 45 + gpu.vramGb * 25,
  );

  return {
    cpuScore,
    gpuScore,
    thermalFactor: Number(thermal.toFixed(3)),
    synergyFactor: Number(synergyFactor.toFixed(3)),
    memoryFactor: Number(memFactor.toFixed(3)),
    finalScore,
    coolingScore,
    valueScore,
    throughputScore,
    totalWatts,
    totalPrice,
  };
}
