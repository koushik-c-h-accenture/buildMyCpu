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
      `CPU is ${cpu.socket} but the motherboard socket is ${mobo.socket} — they don't fit`);
  }
  if (ram && mobo) {
    add(ram.memoryType === mobo.memoryType, 'RAM_TYPE',
      `Motherboard supports ${mobo.memoryType} but you selected ${ram.memoryType} memory`);
    add(ram.modules <= mobo.memorySlots, 'RAM_SLOTS',
      `RAM has ${ram.modules} modules but the motherboard only has ${mobo.memorySlots} slots`);
  }
  if (cpu && ram) {
    add(cpu.memoryType === ram.memoryType, 'CPU_RAM_TYPE',
      `CPU's memory controller is ${cpu.memoryType} but the RAM is ${ram.memoryType}`);
  }
  if (mobo && pcCase) {
    add(pcCase.formFactorsSupported.includes(mobo.formFactor), 'MOBO_FIT',
      `${mobo.formFactor} motherboard doesn't fit in the ${pcCase.brand} ${pcCase.model}`);
  }
  if (gpu && pcCase) {
    add(gpu.dimensions.length <= pcCase.maxGpuLengthMm, 'GPU_LENGTH',
      `GPU is ${gpu.dimensions.length}mm long but the case only clears ${pcCase.maxGpuLengthMm}mm`);
  }
  if (cooler && cpu) {
    add(cooler.supportedSockets.includes(cpu.socket), 'COOLER_SOCKET',
      `Cooler has no mounting bracket for the ${cpu.socket} socket`);
  }
  if (cooler && pcCase) {
    if (cooler.coolerType === 'Air') {
      add(cooler.airHeightMm <= pcCase.maxCoolerHeightMm, 'COOLER_HEIGHT',
        `Air cooler is ${cooler.airHeightMm}mm tall but the case clearance is ${pcCase.maxCoolerHeightMm}mm`);
    } else {
      add(pcCase.radiatorSupportMm.includes(cooler.radiatorSizeMm), 'RADIATOR_FIT',
        `${cooler.radiatorSizeMm}mm radiator can't be mounted in the ${pcCase.brand} ${pcCase.model}`);
    }
  }
  if (psu) {
    const draw = totalSystemDraw(b);
    add(psu.wattage >= draw * 1.25, 'PSU_WATTAGE',
      `PSU is ${psu.wattage}W but this build needs ~${Math.ceil(draw * 1.25)}W including headroom`);
  }

  return results;
}

export function isBuildValid(b: Build): boolean {
  return validateBuild(b).every((r) => r.ok);
}

export function blockingErrors(b: Build): RuleResult[] {
  return validateBuild(b).filter((r) => !r.ok);
}
