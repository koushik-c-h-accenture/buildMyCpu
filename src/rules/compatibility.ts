import type {
  Build, Case, Cooler, Cpu, Gpu, Mobo, Psu, Ram, Storage,
} from '../lib/types';

export interface RuleResult {
  ok: boolean;
  code: string;
  message: string;
}

/** Estimated total system power draw under load, in watts (all present components). */
export function totalSystemDraw(b: Build): number {
  return Object.values(b).reduce((sum, c) => sum + (c?.tdpWatts ?? 0), 0);
}

/**
 * Pre-boot (POST) diagnostic. Nothing is mandatory to *select*, but the system
 * must be able to actually power on and run. Returns:
 *  - fatal:    problems that stop the PC from POSTing/running (block benchmark)
 *  - warnings: things that still run but degrade performance/reliability
 * Pure & deterministic.
 */
export function postCheck(b: Build): { fatal: RuleResult[]; warnings: RuleResult[] } {
  const fatal: RuleResult[] = [];
  const warnings: RuleResult[] = [];
  const F = (code: string, message: string) => fatal.push({ ok: false, code, message });
  const W = (code: string, message: string) => warnings.push({ ok: false, code, message });

  const cpu = b.CPU as Cpu | undefined;
  const gpu = b.GPU as Gpu | undefined;
  const mobo = b.MOBO as Mobo | undefined;
  const ram = b.RAM as Ram | undefined;
  const psu = b.PSU as Psu | undefined;
  const cooler = b.COOLER as Cooler | undefined;
  const pcCase = b.CASE as Case | undefined;
  const storage = b.STORAGE as Storage | undefined;

  // ---- fatal: can't POST without these ----
  if (!cpu) F('NO_CPU', "No CPU installed — the system won't POST");
  if (!mobo) F('NO_MOBO', 'No motherboard — nothing to connect the components to');
  if (!ram) F('NO_RAM', "No memory installed — the system won't POST");
  if (!psu) F('NO_PSU', 'No power supply — the system has no power');
  if (!gpu && cpu && !cpu.igpu) F('NO_DISPLAY', 'No graphics output — add a GPU, or a CPU with integrated graphics');

  // ---- fatal: incompatibilities (only when the relevant parts are present) ----
  if (cpu && mobo && cpu.socket !== mobo.socket) F('SOCKET', `CPU is ${cpu.socket} but the motherboard socket is ${mobo.socket} — they don't fit`);
  if (ram && mobo && ram.memoryType !== mobo.memoryType) F('RAM_TYPE', `Motherboard supports ${mobo.memoryType} but you selected ${ram.memoryType} memory`);
  if (cpu && ram && cpu.memoryType !== ram.memoryType) F('CPU_RAM', `CPU's memory controller is ${cpu.memoryType} but the RAM is ${ram.memoryType}`);
  if (ram && mobo && ram.modules > mobo.memorySlots) F('RAM_SLOTS', `RAM has ${ram.modules} modules but the motherboard only has ${mobo.memorySlots} slots`);
  if (mobo && pcCase && !pcCase.formFactorsSupported.includes(mobo.formFactor)) F('MOBO_FIT', `${mobo.formFactor} motherboard doesn't fit in the ${pcCase.brand} ${pcCase.model}`);
  if (gpu && pcCase && gpu.dimensions.length > pcCase.maxGpuLengthMm) F('GPU_LEN', `GPU is ${gpu.dimensions.length}mm long but the case only clears ${pcCase.maxGpuLengthMm}mm`);
  if (cooler && cpu && !cooler.supportedSockets.includes(cpu.socket)) F('COOLER_SOCK', `Cooler has no mounting bracket for the ${cpu.socket} socket`);
  if (cooler && pcCase) {
    if (cooler.coolerType === 'Air') {
      if (cooler.airHeightMm > pcCase.maxCoolerHeightMm) F('COOLER_H', `Air cooler is ${cooler.airHeightMm}mm tall but the case clearance is ${pcCase.maxCoolerHeightMm}mm`);
    } else if (!pcCase.radiatorSupportMm.includes(cooler.radiatorSizeMm)) {
      F('RAD_FIT', `${cooler.radiatorSizeMm}mm radiator can't be mounted in the ${pcCase.brand} ${pcCase.model}`);
    }
  }
  if (storage && mobo && storage.iface === 'NVMe' && mobo.m2Slots < 1) F('M2', 'The NVMe drive needs an M.2 slot but the motherboard has none');
  if (psu) {
    const draw = totalSystemDraw(b);
    if (psu.wattage < draw * 1.25) F('PSU_W', `PSU is ${psu.wattage}W but this build needs ~${Math.ceil(draw * 1.25)}W including headroom`);
  }

  // ---- warnings: runs, but with consequences ----
  if (cpu && !cooler) W('NO_COOLER', 'No CPU cooler — the CPU overheats and heavily throttles (major performance + reliability hit)');
  if (!storage) W('NO_STORAGE', 'No storage drive — no OS/boot disk, so it isn\'t a usable PC (reliability + scalability hit)');
  if (!pcCase) W('NO_CASE', 'Open-air bench — no airflow management, expansion or protection (scalability hit)');
  if (!gpu && cpu?.igpu) W('IGPU', 'Running on integrated graphics — very low graphics performance');

  return { fatal, warnings };
}

export function isRunnable(b: Build): boolean {
  return postCheck(b).fatal.length === 0;
}
/** A build can be benchmarked/submitted if it can POST (warnings are allowed). */
export function isBuildValid(b: Build): boolean {
  return isRunnable(b);
}
