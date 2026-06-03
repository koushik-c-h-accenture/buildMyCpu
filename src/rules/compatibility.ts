import type {
  Build, Case, Cooler, Cpu, Gpu, Mobo, Psu, Ram, Category,
} from '../lib/types';

export interface RuleResult {
  ok: boolean;
  code: string;
  message: string;
}

const REQUIRED: Category[] = ['CASE', 'MOBO', 'CPU', 'COOLER', 'RAM', 'GPU', 'PSU'];

/** Estimated total system power draw under load, in watts. */
export function totalSystemDraw(b: Build): number {
  return REQUIRED.reduce((sum, cat) => sum + (b[cat]?.tdpWatts ?? 0), 0);
}

/**
 * Validates a build against real-world compatibility rules.
 * Returns one RuleResult per check (ok or failing). Pure & deterministic so the
 * exact same function can run server-side in the scoring Edge Function.
 */
export function validateBuild(b: Build): RuleResult[] {
  const results: RuleResult[] = [];
  const add = (ok: boolean, code: string, message: string) =>
    results.push({ ok, code, message });

  // Presence
  for (const cat of REQUIRED) {
    if (!b[cat]) add(false, `MISSING_${cat}`, `No ${cat} selected`);
  }
  const cpu = b.CPU as Cpu | undefined;
  const gpu = b.GPU as Gpu | undefined;
  const mobo = b.MOBO as Mobo | undefined;
  const ram = b.RAM as Ram | undefined;
  const psu = b.PSU as Psu | undefined;
  const cooler = b.COOLER as Cooler | undefined;
  const pcCase = b.CASE as Case | undefined;

  if (cpu && mobo) {
    add(cpu.socket === mobo.socket, 'SOCKET_MISMATCH',
      `CPU socket ${cpu.socket} vs motherboard ${mobo.socket}`);
  }
  if (ram && mobo) {
    add(ram.memoryType === mobo.memoryType, 'RAM_TYPE',
      `${ram.memoryType} RAM vs ${mobo.memoryType} motherboard`);
    add(ram.modules <= mobo.memorySlots, 'RAM_SLOTS',
      `${ram.modules} modules need ${ram.modules} slots; board has ${mobo.memorySlots}`);
  }
  if (cpu && ram) {
    add(cpu.memoryType === ram.memoryType, 'CPU_RAM_TYPE',
      `CPU supports ${cpu.memoryType}, RAM is ${ram.memoryType}`);
  }
  if (mobo && pcCase) {
    add(pcCase.formFactorsSupported.includes(mobo.formFactor), 'MOBO_FIT',
      `${mobo.formFactor} board not supported by this case`);
  }
  if (gpu && pcCase) {
    add(gpu.dimensions.length <= pcCase.maxGpuLengthMm, 'GPU_LENGTH',
      `GPU is ${gpu.dimensions.length}mm; case fits ${pcCase.maxGpuLengthMm}mm`);
  }
  if (cooler && cpu) {
    add(cooler.supportedSockets.includes(cpu.socket), 'COOLER_SOCKET',
      `Cooler doesn't support socket ${cpu.socket}`);
  }
  if (cooler && pcCase) {
    if (cooler.coolerType === 'Air') {
      add(cooler.airHeightMm <= pcCase.maxCoolerHeightMm, 'COOLER_HEIGHT',
        `Air cooler ${cooler.airHeightMm}mm exceeds case max ${pcCase.maxCoolerHeightMm}mm`);
    } else {
      add(pcCase.radiatorSupportMm.includes(cooler.radiatorSizeMm), 'RADIATOR_FIT',
        `${cooler.radiatorSizeMm}mm radiator not supported by this case`);
    }
  }
  if (psu) {
    const draw = totalSystemDraw(b);
    add(psu.wattage >= draw * 1.25, 'PSU_WATTAGE',
      `PSU ${psu.wattage}W vs recommended ${Math.ceil(draw * 1.25)}W (25% headroom)`);
  }

  return results;
}

export function isBuildValid(b: Build): boolean {
  return validateBuild(b).every((r) => r.ok);
}

export function blockingErrors(b: Build): RuleResult[] {
  return validateBuild(b).filter((r) => !r.ok);
}
