// Authoritative scoring Edge Function (Deno).
//
// The client sends only component IDs + names. This function looks up the
// canonical specs, re-validates compatibility, and re-computes the score
// server-side, then inserts the row with the service-role key (bypasses RLS).
// The client can never submit a score it could fake.
//
// Deploy:  supabase functions deploy submit-build --no-verify-jwt
//
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';

// ---- Canonical catalog (subset of fields needed to validate + score) --------
// Keep in sync with src/data/catalog.ts.
type Cat = 'CPU' | 'GPU' | 'MOBO' | 'RAM' | 'PSU' | 'COOLER' | 'CASE';
interface Spec {
  category: Cat; label: string; tdp: number; bench: number; len?: number;
  // category-specific
  socket?: string; cores?: number; boostClock?: number; memoryType?: string;
  vramGb?: number; formFactor?: string; memorySlots?: number;
  capacityGb?: number; modules?: number; speedMhz?: number;
  wattage?: number; coolerType?: string; supportedSockets?: string[];
  radiatorSizeMm?: number; airHeightMm?: number; dissipationWatts?: number;
  formFactorsSupported?: string[]; maxGpuLengthMm?: number;
  maxCoolerHeightMm?: number; radiatorSupportMm?: number[];
}

const SPECS: Record<string, Spec> = {
  'case-lianli-o11d': { category: 'CASE', label: 'Lian Li O11 Dynamic', tdp: 0, bench: 1, formFactorsSupported: ['ATX','MicroATX','MiniITX','EATX'], maxGpuLengthMm: 420, maxCoolerHeightMm: 167, radiatorSupportMm: [240,360] },
  'case-nzxt-h510': { category: 'CASE', label: 'NZXT H510', tdp: 0, bench: 1, formFactorsSupported: ['ATX','MicroATX','MiniITX'], maxGpuLengthMm: 381, maxCoolerHeightMm: 165, radiatorSupportMm: [240,280] },
  'case-fractal-meshify2': { category: 'CASE', label: 'Fractal Meshify 2', tdp: 0, bench: 1, formFactorsSupported: ['EATX','ATX','MicroATX','MiniITX'], maxGpuLengthMm: 460, maxCoolerHeightMm: 185, radiatorSupportMm: [240,280,360] },

  'mobo-asus-z790-e': { category: 'MOBO', label: 'ASUS ROG STRIX Z790-E', tdp: 50, bench: 1, socket: 'LGA1700', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4 },
  'mobo-msi-b650-tomahawk': { category: 'MOBO', label: 'MSI B650 Tomahawk', tdp: 45, bench: 1, socket: 'AM5', formFactor: 'ATX', memoryType: 'DDR5', memorySlots: 4 },
  'mobo-gigabyte-b550': { category: 'MOBO', label: 'Gigabyte B550 AORUS Elite', tdp: 40, bench: 1, socket: 'AM4', formFactor: 'ATX', memoryType: 'DDR4', memorySlots: 4 },
  'mobo-asrock-z790m': { category: 'MOBO', label: 'ASRock Z790M-ITX', tdp: 40, bench: 1, socket: 'LGA1700', formFactor: 'MicroATX', memoryType: 'DDR5', memorySlots: 4 },

  'cpu-intel-i9-14900k': { category: 'CPU', label: 'Intel Core i9-14900K', tdp: 253, bench: 5.0, socket: 'LGA1700', cores: 24, boostClock: 6.0, memoryType: 'DDR5' },
  'cpu-amd-7800x3d': { category: 'CPU', label: 'AMD Ryzen 7 7800X3D', tdp: 120, bench: 4.6, socket: 'AM5', cores: 8, boostClock: 5.0, memoryType: 'DDR5' },
  'cpu-intel-i5-13600k': { category: 'CPU', label: 'Intel Core i5-13600K', tdp: 181, bench: 3.8, socket: 'LGA1700', cores: 14, boostClock: 5.1, memoryType: 'DDR5' },
  'cpu-amd-5600x': { category: 'CPU', label: 'AMD Ryzen 5 5600X', tdp: 65, bench: 2.8, socket: 'AM4', cores: 6, boostClock: 4.6, memoryType: 'DDR4' },

  'gpu-rtx-4090': { category: 'GPU', label: 'NVIDIA RTX 4090', tdp: 450, bench: 10.0, len: 304, vramGb: 24 },
  'gpu-rx-7900xtx': { category: 'GPU', label: 'AMD RX 7900 XTX', tdp: 355, bench: 8.5, len: 287, vramGb: 24 },
  'gpu-rtx-4070': { category: 'GPU', label: 'NVIDIA RTX 4070', tdp: 200, bench: 6.0, len: 244, vramGb: 12 },
  'gpu-rtx-3060': { category: 'GPU', label: 'NVIDIA RTX 3060', tdp: 170, bench: 4.0, len: 242, vramGb: 12 },

  'ram-corsair-ddr5-32': { category: 'RAM', label: 'Corsair Vengeance 32GB DDR5', tdp: 8, bench: 1, memoryType: 'DDR5', capacityGb: 32, modules: 2, speedMhz: 6000 },
  'ram-gskill-ddr5-64': { category: 'RAM', label: 'G.Skill Trident Z5 64GB DDR5', tdp: 10, bench: 1, memoryType: 'DDR5', capacityGb: 64, modules: 2, speedMhz: 6400 },
  'ram-corsair-ddr4-32': { category: 'RAM', label: 'Corsair Vengeance 32GB DDR4', tdp: 6, bench: 1, memoryType: 'DDR4', capacityGb: 32, modules: 2, speedMhz: 3600 },

  'psu-corsair-rm850x': { category: 'PSU', label: 'Corsair RM850x', tdp: 0, bench: 1, wattage: 850 },
  'psu-corsair-hx1000': { category: 'PSU', label: 'Corsair HX1000', tdp: 0, bench: 1, wattage: 1000 },
  'psu-evga-650b': { category: 'PSU', label: 'EVGA 650 BR', tdp: 0, bench: 1, wattage: 650 },

  'cooler-corsair-h150i': { category: 'COOLER', label: 'Corsair iCUE H150i', tdp: 10, bench: 1, coolerType: 'AIO', supportedSockets: ['LGA1700','AM5','AM4'], radiatorSizeMm: 360, airHeightMm: 0, dissipationWatts: 350 },
  'cooler-nzxt-x63': { category: 'COOLER', label: 'NZXT Kraken X63', tdp: 8, bench: 1, coolerType: 'AIO', supportedSockets: ['LGA1700','AM5','AM4'], radiatorSizeMm: 280, airHeightMm: 0, dissipationWatts: 280 },
  'cooler-noctua-nhd15': { category: 'COOLER', label: 'Noctua NH-D15', tdp: 6, bench: 1, coolerType: 'Air', supportedSockets: ['LGA1700','AM5','AM4'], radiatorSizeMm: 0, airHeightMm: 165, dissipationWatts: 250 },
  'cooler-cm-hyper212': { category: 'COOLER', label: 'Cooler Master Hyper 212', tdp: 4, bench: 1, coolerType: 'Air', supportedSockets: ['LGA1700','AM5','AM4'], radiatorSizeMm: 0, airHeightMm: 159, dissipationWatts: 150 },
};

const REQUIRED: Cat[] = ['CASE', 'MOBO', 'CPU', 'COOLER', 'RAM', 'GPU', 'PSU'];

function validate(b: Record<Cat, Spec>): string | null {
  for (const cat of REQUIRED) if (!b[cat]) return `Missing ${cat}`;
  const { CPU: cpu, GPU: gpu, MOBO: mobo, RAM: ram, PSU: psu, COOLER: cooler, CASE: pc } = b;
  if (cpu.socket !== mobo.socket) return `Socket mismatch: ${cpu.socket} vs ${mobo.socket}`;
  if (ram.memoryType !== mobo.memoryType) return `RAM type ${ram.memoryType} vs board ${mobo.memoryType}`;
  if (cpu.memoryType !== ram.memoryType) return `CPU supports ${cpu.memoryType}, RAM is ${ram.memoryType}`;
  if ((ram.modules ?? 0) > (mobo.memorySlots ?? 0)) return 'Too many RAM modules for board';
  if (!pc.formFactorsSupported!.includes(mobo.formFactor!)) return `${mobo.formFactor} board doesn't fit case`;
  if ((gpu.len ?? 0) > (pc.maxGpuLengthMm ?? 0)) return 'GPU too long for case';
  if (!cooler.supportedSockets!.includes(cpu.socket!)) return `Cooler doesn't support ${cpu.socket}`;
  if (cooler.coolerType === 'Air') {
    if ((cooler.airHeightMm ?? 0) > (pc.maxCoolerHeightMm ?? 0)) return 'Air cooler too tall for case';
  } else if (!pc.radiatorSupportMm!.includes(cooler.radiatorSizeMm!)) {
    return `${cooler.radiatorSizeMm}mm radiator doesn't fit case`;
  }
  const draw = REQUIRED.reduce((s, c) => s + b[c].tdp, 0);
  if ((psu.wattage ?? 0) < draw * 1.25) return `PSU too weak (need ~${Math.ceil(draw * 1.25)}W)`;
  return null;
}

function score(b: Record<Cat, Spec>) {
  const cpu = b.CPU, gpu = b.GPU, ram = b.RAM, cooler = b.COOLER;
  const heat = cpu.tdp + gpu.tdp;
  const ratio = cooler.dissipationWatts! / heat;
  const thermal = ratio >= 1.3 ? 1 : ratio >= 1 ? 0.85 + 0.15 * ((ratio - 1) / 0.3) : Math.max(0.7, 0.85 * ratio);

  const cpuScore = Math.round(cpu.bench * cpu.cores! * cpu.boostClock! * thermal * 6);
  const gpuScore = Math.round(gpu.bench * (gpu.vramGb! / 8 + 1) * (1 + (gpu.bench / 100) * thermal) * 40);

  const r = cpuScore === 0 ? 1 : gpuScore / cpuScore;
  const synergy = r > 3 ? 0.9 : r < 0.4 ? 0.92 : 1 + 0.1 * (1 - Math.min(1, Math.abs(r - 1.5) / 1.5));
  const memFactor = Math.min(1.15, 0.9 + (ram.speedMhz! - 3200) / 20000) * Math.min(1.1, 0.95 + ram.capacityGb! / 256);

  const finalScore = Math.round((cpuScore + gpuScore) * thermal * synergy * memFactor);
  return { cpuScore, gpuScore, thermalFactor: +thermal.toFixed(3), synergyFactor: +synergy.toFixed(3), memoryFactor: +memFactor.toFixed(3), finalScore };
}

const clean = (s: unknown, max: number) =>
  String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);

const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  try {
    const { username, buildName, componentIds } = await req.json();
    const uname = clean(username, 24);
    const bname = clean(buildName, 40);
    if (!uname || !bname) return json({ message: 'Username and build name are required' }, 400);

    // Resolve canonical specs from IDs (ignore anything else the client sent).
    const b = {} as Record<Cat, Spec>;
    for (const [cat, id] of Object.entries(componentIds ?? {})) {
      const spec = SPECS[String(id)];
      if (!spec || spec.category !== cat) return json({ message: `Unknown component for ${cat}` }, 400);
      b[cat as Cat] = spec;
    }

    const err = validate(b);
    if (err) return json({ message: `Invalid build: ${err}` }, 422);

    const breakdown = score(b);

    const admin = createClient(
      Deno.env.get('SUPABASE_URL')!,
      Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!,
    );
    const { error } = await admin.from('builds').insert({
      username: uname, build_name: bname,
      cpu_id: (componentIds as Record<string, string>).CPU,
      gpu_id: (componentIds as Record<string, string>).GPU,
      cpu_label: b.CPU.label, gpu_label: b.GPU.label,
      build_spec: componentIds, final_score: breakdown.finalScore, score_breakdown: breakdown,
    });
    if (error) return json({ message: error.message }, 500);

    const { count } = await admin.from('builds')
      .select('*', { count: 'exact', head: true })
      .gt('final_score', breakdown.finalScore);

    return json({ final_score: breakdown.finalScore, rank: (count ?? 0) + 1 });
  } catch (e) {
    return json({ message: e instanceof Error ? e.message : 'Bad request' }, 400);
  }
});
