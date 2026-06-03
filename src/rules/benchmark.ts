import type { Build, Case, Cooler, Cpu, Gpu, Mobo, Psu, Ram, Storage, Fans } from '../lib/types';
import { isBuildValid, totalSystemDraw } from './compatibility';

export interface ScoreBreakdown {
  // raw
  cpuScore: number;
  gpuScore: number;
  performanceIndex: number;
  perfPerWatt: number;
  perfPerDollar: number;
  totalWatts: number;
  totalPrice: number;
  totalWeightKg: number;
  // factors
  synergyFactor: number;
  memoryFactor: number;
  thermalFactor: number;
  // 0-100 sub-scores
  performance: number;
  value: number;
  efficiency: number;
  thermal: number;
  reliability: number;
  scalability: number;
  // headline 0-10000
  finalScore: number;
}

export interface StressReport {
  cpuTempC: number;
  gpuTempC: number;
  baseClockGhz: number;
  effectiveClockGhz: number;
  throttling: boolean;
  fpsIndex: number;
  powerDrawW: number;
  airflowFans: number;
}

/**
 * Simulates a sustained CPU+GPU load test and reports the steady-state thermals,
 * effective clock (after any throttling), and power draw. Deterministic.
 */
export function stressReport(b: Build): StressReport {
  const cpu = b.CPU as Cpu, gpu = b.GPU as Gpu, cooler = b.COOLER as Cooler;
  const pcCase = b.CASE as Case, fans = b.FANS as Fans | undefined;
  const airflowFans = pcCase.includedFans + (fans?.count ?? 0);

  const coolRatio = cooler.dissipationWatts / Math.max(1, cpu.tdpWatts);
  const thermalFactor = coolRatio >= 1.3 ? 1 : coolRatio >= 1 ? 0.92 + 0.08 * ((coolRatio - 1) / 0.3) : Math.max(0.75, 0.92 * coolRatio);
  // steady-state CPU temp: hotter when cooler is undersized, cooler with more airflow
  const cpuTempC = Math.round(Math.min(105, 38 + (cpu.tdpWatts / cooler.dissipationWatts) * 72 - airflowFans * 1.5));
  const gpuTempC = Math.round(Math.min(92, 58 + (gpu.tdpWatts / 350) * 26 - airflowFans * 1.6));
  const effectiveClockGhz = Number((cpu.boostClock * thermalFactor).toFixed(2));

  return {
    cpuTempC, gpuTempC,
    baseClockGhz: cpu.boostClock,
    effectiveClockGhz,
    throttling: thermalFactor < 0.999 || cpuTempC >= 95,
    fpsIndex: Math.round(gpu.benchBase * (gpu.vramGb / 8 + 1) * 14),
    powerDrawW: totalSystemDraw(b),
    airflowFans,
  };
}

// ----- tuning constants (documented in SCORING.md) -----
const PERF_REF = 7000;     // performance index of a top-tier build
const VAL_REF = 0.43;      // PI^0.8 / price reference
const EFF_REF = 1.10;      // PI^0.75 / watts reference
const WEIGHTS = {          // competition-score weighting (sum = 1)
  performance: 0.34, value: 0.18, efficiency: 0.16,
  thermal: 0.12, reliability: 0.10, scalability: 0.10,
};
// rough per-category mass (g) for the informational build-weight metric
const WEIGHT_G: Record<string, number> = {
  CASE: 7000, MOBO: 900, CPU: 50, COOLER: 1000, RAM: 90,
  GPU: 1150, STORAGE: 60, PSU: 1700, FANS: 450,
};

const clamp = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));

function synergy(cpuScore: number, gpuScore: number): number {
  if (cpuScore === 0) return 1;
  const r = gpuScore / cpuScore;
  if (r > 3.0) return 0.9;
  if (r < 0.4) return 0.92;
  return 1.0 + 0.1 * (1 - Math.min(1, Math.abs(r - 1.5) / 1.5));
}
function memoryFactor(ram: Ram): number {
  return Math.min(1.15, 0.9 + (ram.speedMhz - 3200) / 20000) * Math.min(1.1, 0.95 + ram.capacityGb / 256);
}

/**
 * Deterministic, multi-dimensional benchmark. Same build → same scores.
 * Mirrored server-side in the submit-build Edge Function (authoritative).
 * See SCORING.md for the full methodology.
 */
export function runBenchmark(b: Build): ScoreBreakdown {
  if (!isBuildValid(b)) throw new Error('Cannot benchmark an invalid build');
  const cpu = b.CPU as Cpu, gpu = b.GPU as Gpu, ram = b.RAM as Ram;
  const mobo = b.MOBO as Mobo, psu = b.PSU as Psu, cooler = b.COOLER as Cooler;
  const pcCase = b.CASE as Case, storage = b.STORAGE as Storage;
  const fans = b.FANS as Fans | undefined;

  // --- raw performance ---
  const coolRatio = cooler.dissipationWatts / Math.max(1, cpu.tdpWatts);
  const thermalFactor = coolRatio >= 1.3 ? 1 : coolRatio >= 1 ? 0.92 + 0.08 * ((coolRatio - 1) / 0.3) : Math.max(0.75, 0.92 * coolRatio);
  const cpuScore = Math.round(cpu.benchBase * cpu.cores * cpu.boostClock * thermalFactor * 6);
  const gpuScore = Math.round(gpu.benchBase * (gpu.vramGb / 8 + 1) * (1 + gpu.benchBase / 100) * 40);
  const synergyFactor = synergy(cpuScore, gpuScore);
  const memFactor = memoryFactor(ram);
  const performanceIndex = Math.round((cpuScore + gpuScore) * synergyFactor * memFactor);

  const totalWatts = totalSystemDraw(b);
  const totalPrice = Object.values(b).reduce((s, c) => s + (c?.priceUsd ?? 0), 0);
  const totalWeightKg = Number((Object.keys(b).reduce((s, k) => s + (WEIGHT_G[k] ?? 0), 0) / 1000).toFixed(1));

  // --- 0-100 sub-scores ---
  const performance = clamp((performanceIndex / PERF_REF) * 100);
  const value = clamp((Math.pow(performanceIndex, 0.8) / totalPrice / VAL_REF) * 100);
  const efficiency = clamp((Math.pow(performanceIndex, 0.75) / totalWatts / EFF_REF) * 100);

  const airflow = (pcCase.includedFans + (fans?.count ?? 0));
  const thermal = clamp((coolRatio / 1.6) * 85 + Math.min(15, airflow * 2.5));

  const psuEff = clamp(((psu.efficiencyPct - 80) / 14) * 100);
  const psuLoad = clamp(((psu.wattage - totalWatts) / psu.wattage / 0.5) * 100);
  const thermHead = clamp(((coolRatio - 1) / 0.6) * 100);
  const quiet = clamp(((40 - cooler.noiseDb) / 16) * 100);
  const reliability = clamp(0.3 * psuEff + 0.3 * thermHead + 0.25 * psuLoad + 0.15 * quiet);

  const freeRam = clamp(((mobo.memorySlots - ram.modules) / mobo.memorySlots) * 100);
  const freeM2 = clamp(((mobo.m2Slots - (storage.iface === 'NVMe' ? 1 : 0)) / mobo.m2Slots) * 100);
  const psuHead = clamp(((psu.wattage / Math.max(1, totalWatts) - 1) / 0.8) * 100);
  const gpuClear = clamp(((pcCase.maxGpuLengthMm - gpu.dimensions.length) / pcCase.maxGpuLengthMm) * 200);
  const fanRoom = clamp((pcCase.fanMounts / 10) * 100);
  const scalability = clamp(0.25 * freeRam + 0.2 * freeM2 + 0.25 * psuHead + 0.15 * gpuClear + 0.15 * fanRoom);

  const composite =
    WEIGHTS.performance * performance + WEIGHTS.value * value + WEIGHTS.efficiency * efficiency +
    WEIGHTS.thermal * thermal + WEIGHTS.reliability * reliability + WEIGHTS.scalability * scalability;
  const finalScore = Math.round(composite * 100); // 0-10000

  return {
    cpuScore, gpuScore, performanceIndex,
    perfPerWatt: Number((performanceIndex / totalWatts).toFixed(1)),
    perfPerDollar: Number((performanceIndex / totalPrice).toFixed(2)),
    totalWatts, totalPrice, totalWeightKg,
    synergyFactor: Number(synergyFactor.toFixed(3)),
    memoryFactor: Number(memFactor.toFixed(3)),
    thermalFactor: Number(thermalFactor.toFixed(3)),
    performance: Math.round(performance), value: Math.round(value), efficiency: Math.round(efficiency),
    thermal: Math.round(thermal), reliability: Math.round(reliability), scalability: Math.round(scalability),
    finalScore,
  };
}
