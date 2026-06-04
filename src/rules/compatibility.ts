import type {
  Build, Category, Component, Case, Cooler, Cpu, Gpu, Mobo, Psu, Ram, Storage,
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

  // ---- fatal: the machine physically cannot run without these ----
  if (!cpu) F('NO_CPU', 'No CPU installed — the processor executes every instruction. Without a CPU the PC cannot run at all.');
  if (!mobo) F('NO_MOBO', 'No motherboard — it is the backbone that connects and powers every part. Without it there is nothing to wire the components into.');
  if (!ram) F('NO_RAM', 'No memory (RAM) installed — the CPU needs RAM to load and execute code. Without memory the system cannot boot.');
  if (!psu) F('NO_PSU', 'No power supply (PSU) — there is no source of power for the components, so the PC stays completely dead.');
  if (!gpu && cpu && !cpu.igpu) F('NO_DISPLAY', 'No graphics output — this CPU has no integrated graphics and no dedicated GPU is fitted, so the PC cannot drive a display.');

  // ---- fatal: incompatibilities (only when the relevant parts are present) ----
  if (cpu && mobo && cpu.socket !== mobo.socket) F('SOCKET', `CPU socket mismatch — the ${cpu.brand} ${cpu.model} uses the ${cpu.socket} socket but the motherboard has a ${mobo.socket} socket, so the CPU physically will not fit.`);
  if (ram && mobo && ram.memoryType !== mobo.memoryType) F('RAM_TYPE', `Memory standard mismatch — the motherboard only accepts ${mobo.memoryType}, but the RAM is ${ram.memoryType}. The modules are keyed differently and cannot seat.`);
  if (cpu && ram && cpu.memoryType !== ram.memoryType) F('CPU_RAM', `Memory controller mismatch — this CPU's built-in memory controller supports ${cpu.memoryType}, but the RAM is ${ram.memoryType}.`);
  if (ram && mobo && ram.modules > mobo.memorySlots) F('RAM_SLOTS', `Not enough memory slots — the kit has ${ram.modules} modules but the motherboard provides only ${mobo.memorySlots} DIMM slots.`);
  if (mobo && pcCase && !pcCase.formFactorsSupported.includes(mobo.formFactor)) F('MOBO_FIT', `Motherboard too large for the case — a ${mobo.formFactor} board does not fit the ${pcCase.brand} ${pcCase.model} (it supports ${pcCase.formFactorsSupported.join(', ')}).`);
  if (gpu && pcCase && gpu.dimensions.length > pcCase.maxGpuLengthMm) F('GPU_LEN', `Graphics card too long — the ${gpu.model} is ${gpu.dimensions.length}mm but the ${pcCase.model} only has ${pcCase.maxGpuLengthMm}mm of clearance, so it will not physically fit.`);
  if (cooler && cpu && !cooler.supportedSockets.includes(cpu.socket)) F('COOLER_SOCK', `Cooler cannot mount — the ${cooler.model} has no bracket for the ${cpu.socket} socket, so it cannot attach to the CPU.`);
  if (cooler && pcCase) {
    if (cooler.coolerType === 'Air') {
      if (cooler.airHeightMm > pcCase.maxCoolerHeightMm) F('COOLER_H', `Air cooler too tall — the ${cooler.model} stands ${cooler.airHeightMm}mm but the ${pcCase.model} clears only ${pcCase.maxCoolerHeightMm}mm, so the side panel will not close.`);
    } else if (!pcCase.radiatorSupportMm.includes(cooler.radiatorSizeMm)) {
      F('RAD_FIT', `Radiator has no mount — the ${cooler.radiatorSizeMm}mm radiator has no compatible mounting point in the ${pcCase.model}.`);
    }
  }
  if (storage && mobo && storage.iface === 'NVMe' && mobo.m2Slots < 1) F('M2', `No M.2 slot — the ${storage.model} is an NVMe drive that needs an M.2 slot, but this motherboard has none (use a SATA drive instead).`);
  if (psu) {
    const draw = totalSystemDraw(b);
    if (psu.wattage < draw * 1.25) F('PSU_W', `Power supply too weak — the components draw about ${Math.ceil(draw * 1.25)}W under load (including safe headroom), but the PSU delivers only ${psu.wattage}W; it would overload and shut down.`);
  }

  // ---- warnings: the PC runs, but with real consequences ----
  if (cpu && !cooler) W('NO_COOLER', 'No CPU cooler — the CPU has nothing to carry its heat away, so it overheats within seconds and throttles hard to protect itself. Big performance and lifespan hit.');
  if (!storage) W('NO_STORAGE', 'No storage drive — there is no disk to install an operating system on, so the machine powers on but has nothing to boot. Not a usable PC.');
  if (!pcCase) W('NO_CASE', 'No case (open-air bench) — the components run exposed with no chassis airflow, cable management, dust protection, or room to expand.');
  if (!gpu && cpu?.igpu) W('IGPU', `No dedicated GPU — relying on the ${cpu.model}'s integrated graphics. Fine for desktop work, but far too weak for serious gaming or GPU workloads.`);

  return { fatal, warnings };
}

// Physical/standard "won't fit" conflicts (excludes missing-part and wattage,
// which are sizing concerns rather than fitment). Used for guided filtering.
const FIT_CODES = ['SOCKET', 'RAM_TYPE', 'CPU_RAM', 'RAM_SLOTS', 'MOBO_FIT', 'GPU_LEN', 'COOLER_SOCK', 'COOLER_H', 'RAD_FIT', 'M2'];

/**
 * Guided-mode helper: from a category's parts, keep only those compatible with
 * the components already chosen. When filtering PSUs, also drop ones that can't
 * power the current build (same headroom the Power-On test enforces).
 */
export function compatibleParts<T extends Component>(cat: Category, parts: T[], build: Build): T[] {
  const codes = cat === 'PSU' ? [...FIT_CODES, 'PSU_W'] : FIT_CODES;
  return parts.filter((p) => {
    const test = { ...build, [cat]: p } as Build;
    return !postCheck(test).fatal.some((r) => codes.includes(r.code));
  });
}

export function isRunnable(b: Build): boolean {
  return postCheck(b).fatal.length === 0;
}
/** A build can be benchmarked/submitted if it can POST (warnings are allowed). */
export function isBuildValid(b: Build): boolean {
  return isRunnable(b);
}
