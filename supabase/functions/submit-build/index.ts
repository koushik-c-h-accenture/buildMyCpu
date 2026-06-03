// Authoritative scoring Edge Function (Deno).
//
// The client sends only component IDs + names. This function looks up the
// canonical components from catalog.json (generated from src/data/catalog.ts),
// re-validates compatibility, and re-computes the multi-factor score
// server-side, then inserts the row with the service-role key (bypasses RLS).
// The client can never submit a score it could fake.
//
// Deploy:  supabase functions deploy submit-build --no-verify-jwt
//
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
import catalogJson from './catalog.json' with { type: 'json' };

type Cat = 'CPU' | 'GPU' | 'MOBO' | 'RAM' | 'PSU' | 'COOLER' | 'CASE';
// deno-lint-ignore no-explicit-any
type Comp = any;
const CATALOG = catalogJson as Comp[];
const byId = (id: string) => CATALOG.find((c) => c.id === id);

const REQUIRED: Cat[] = ['CASE', 'MOBO', 'CPU', 'COOLER', 'RAM', 'GPU', 'PSU'];

// ---- validation (mirror of src/rules/compatibility.ts) ----------------------
function validate(b: Record<string, Comp>): string | null {
  for (const cat of REQUIRED) if (!b[cat]) return `Missing ${cat}`;
  const { CPU: cpu, GPU: gpu, MOBO: mobo, RAM: ram, PSU: psu, COOLER: cooler, CASE: pc } = b;
  if (cpu.socket !== mobo.socket) return `CPU ${cpu.socket} vs motherboard ${mobo.socket}`;
  if (ram.memoryType !== mobo.memoryType) return `Motherboard is ${mobo.memoryType}, RAM is ${ram.memoryType}`;
  if (cpu.memoryType !== ram.memoryType) return `CPU is ${cpu.memoryType}, RAM is ${ram.memoryType}`;
  if (ram.modules > mobo.memorySlots) return 'Too many RAM modules for the board';
  if (!pc.formFactorsSupported.includes(mobo.formFactor)) return `${mobo.formFactor} board doesn't fit the case`;
  if (gpu.dimensions.length > pc.maxGpuLengthMm) return 'GPU too long for the case';
  if (!cooler.supportedSockets.includes(cpu.socket)) return `Cooler doesn't support ${cpu.socket}`;
  if (cooler.coolerType === 'Air') {
    if (cooler.airHeightMm > pc.maxCoolerHeightMm) return 'Air cooler too tall for the case';
  } else if (!pc.radiatorSupportMm.includes(cooler.radiatorSizeMm)) {
    return `${cooler.radiatorSizeMm}mm radiator doesn't fit the case`;
  }
  const draw = REQUIRED.reduce((s, c) => s + (b[c].tdpWatts ?? 0), 0);
  if (psu.wattage < draw * 1.25) return `PSU too weak (need ~${Math.ceil(draw * 1.25)}W)`;
  return null;
}

// ---- scoring (mirror of src/rules/benchmark.ts) -----------------------------
function score(b: Record<string, Comp>) {
  const { CPU: cpu, GPU: gpu, RAM: ram, COOLER: cooler } = b;
  const ratio = cooler.dissipationWatts / Math.max(1, cpu.tdpWatts);
  const thermal = ratio >= 1.3 ? 1 : ratio >= 1 ? 0.92 + 0.08 * ((ratio - 1) / 0.3) : Math.max(0.75, 0.92 * ratio);

  const cpuScore = Math.round(cpu.benchBase * cpu.cores * cpu.boostClock * thermal * 6);
  const gpuScore = Math.round(gpu.benchBase * (gpu.vramGb / 8 + 1) * (1 + gpu.benchBase / 100) * 40);
  const r = cpuScore === 0 ? 1 : gpuScore / cpuScore;
  const synergy = r > 3 ? 0.9 : r < 0.4 ? 0.92 : 1 + 0.1 * (1 - Math.min(1, Math.abs(r - 1.5) / 1.5));
  const memFactor = Math.min(1.15, 0.9 + (ram.speedMhz - 3200) / 20000) * Math.min(1.1, 0.95 + ram.capacityGb / 256);
  const finalScore = Math.round((cpuScore + gpuScore) * synergy * memFactor);

  const totalWatts = REQUIRED.reduce((s, c) => s + (b[c].tdpWatts ?? 0), 0);
  const totalPrice = REQUIRED.reduce((s, c) => s + (b[c].priceUsd ?? 0), 0);
  const coolingScore = Math.min(100, Math.round((cooler.dissipationWatts / Math.max(1, cpu.tdpWatts)) * 70));
  const valueScore = Math.round((finalScore / Math.max(1, totalPrice)) * 100);
  const throughputScore = Math.round((ram.speedMhz * ram.modules) / 100 + cpu.threads * 45 + gpu.vramGb * 25);

  return {
    cpuScore, gpuScore, thermalFactor: +thermal.toFixed(3), synergyFactor: +synergy.toFixed(3),
    memoryFactor: +memFactor.toFixed(3), finalScore, coolingScore, valueScore, throughputScore,
    totalWatts, totalPrice,
  };
}

const clean = (s: unknown, max: number) => String(s ?? '').replace(/[<>]/g, '').trim().slice(0, max);
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

    const b: Record<string, Comp> = {};
    for (const [cat, id] of Object.entries(componentIds ?? {})) {
      const comp = byId(String(id));
      if (!comp || comp.category !== cat) return json({ message: `Unknown component for ${cat}` }, 400);
      b[cat] = comp;
    }

    const err = validate(b);
    if (err) return json({ message: `Invalid build: ${err}` }, 422);

    const breakdown = score(b);
    const admin = createClient(Deno.env.get('SUPABASE_URL')!, Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!);
    const { error } = await admin.from('builds').insert({
      username: uname, build_name: bname,
      cpu_id: b.CPU.id, gpu_id: b.GPU.id, cpu_label: b.CPU.model, gpu_label: b.GPU.model,
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
