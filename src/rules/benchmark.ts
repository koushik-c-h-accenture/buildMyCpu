import type { Build, Cooler, Cpu, Gpu, Ram } from '../lib/types';
import { isBuildValid, totalSystemDraw } from './compatibility';

export interface ScoreBreakdown {
  cpuScore: number;
  gpuScore: number;
  thermalFactor: number;
  synergyFactor: number;
  memoryFactor: number;
  finalScore: number;
}

/**
 * Thermal efficiency 0.70–1.00. Insufficient cooling throttles boost clocks.
 */
function thermalEfficiency(b: Build): number {
  const cooler = b.COOLER as Cooler;
  const heat = (b.CPU?.tdpWatts ?? 0) + (b.GPU?.tdpWatts ?? 0);
  const capacity = cooler.dissipationWatts;
  if (heat === 0) return 1;
  const ratio = capacity / heat;
  if (ratio >= 1.3) return 1.0;
  if (ratio >= 1.0) return 0.85 + 0.15 * ((ratio - 1.0) / 0.3);
  return Math.max(0.7, 0.85 * ratio);
}

/** Rewards balanced CPU/GPU pairings, penalises bottlenecks. */
function synergy(cpuScore: number, gpuScore: number): number {
  if (cpuScore === 0) return 1;
  const ratio = gpuScore / cpuScore;
  if (ratio > 3.0) return 0.9; // CPU bottleneck
  if (ratio < 0.4) return 0.92; // GPU underpowered
  // peak bonus near a balanced ratio (~1.5)
  const bonus = 0.1 * (1 - Math.min(1, Math.abs(ratio - 1.5) / 1.5));
  return 1.0 + bonus;
}

function memoryFactor(b: Build): number {
  const ram = b.RAM as Ram;
  const speedF = Math.min(1.15, 0.9 + (ram.speedMhz - 3200) / 20000);
  const capF = Math.min(1.1, 0.95 + ram.capacityGb / 256);
  return speedF * capF;
}

/**
 * Deterministic performance score. Same build → same score, every time.
 * Mirrored server-side in the submit-build Edge Function for authoritative scoring.
 */
export function runBenchmark(b: Build): ScoreBreakdown {
  if (!isBuildValid(b)) {
    throw new Error('Cannot benchmark an invalid build');
  }
  const cpu = b.CPU as Cpu;
  const gpu = b.GPU as Gpu;

  const thermal = thermalEfficiency(b);
  const effectiveCpuClock = cpu.boostClock * thermal;
  const effectiveGpuClock = 1 + (gpu.benchBase / 100) * thermal;

  const cpuScore = Math.round(cpu.benchBase * cpu.cores * effectiveCpuClock * 6);
  const gpuScore = Math.round(gpu.benchBase * (gpu.vramGb / 8 + 1) * effectiveGpuClock * 40);

  const synergyFactor = synergy(cpuScore, gpuScore);
  const memFactor = memoryFactor(b);

  const finalScore = Math.round(
    (cpuScore + gpuScore) * thermal * synergyFactor * memFactor,
  );

  return {
    cpuScore,
    gpuScore,
    thermalFactor: Number(thermal.toFixed(3)),
    synergyFactor: Number(synergyFactor.toFixed(3)),
    memoryFactor: Number(memFactor.toFixed(3)),
    finalScore,
  };
}

export { totalSystemDraw };
