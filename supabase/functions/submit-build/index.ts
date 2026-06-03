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

const REQUIRED: Cat[] = ['CASE', 'MOBO', 'CPU', 'COOLER', 'RAM', 'GPU', 'STORAGE', 'PSU'];
const clampN = (n: number, lo = 0, hi = 100) => Math.max(lo, Math.min(hi, n));
const draw = (b: Record<string, Comp>) => Object.values(b).reduce((s, c) => s + (c.tdpWatts ?? 0), 0);

// ---- validation (mirror of src/rules/compatibility.ts) ----------------------
function validate(b: Record<string, Comp>): string | null {
  for (const cat of REQUIRED) if (!b[cat]) return `Missing ${cat}`;
  const { CPU: cpu, GPU: gpu, MOBO: mobo, RAM: ram, PSU: psu, COOLER: cooler, CASE: pc, STORAGE: st } = b;
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
  if (st.iface === 'NVMe' && mobo.m2Slots < 1) return 'No M.2 slot for the NVMe drive';
  if (psu.wattage < draw(b) * 1.25) return `PSU too weak (need ~${Math.ceil(draw(b) * 1.25)}W)`;
  return null;
}

// ---- scoring (mirror of src/rules/benchmark.ts — see SCORING.md) -------------
const PERF_REF = 7000, VAL_REF = 0.43, EFF_REF = 1.10;
const W = { performance: 0.34, value: 0.18, efficiency: 0.16, thermal: 0.12, reliability: 0.10, scalability: 0.10 };

function score(b: Record<string, Comp>) {
  const { CPU: cpu, GPU: gpu, RAM: ram, COOLER: cooler, MOBO: mobo, PSU: psu, CASE: pc, STORAGE: st, FANS: fans } = b;
  const coolRatio = cooler.dissipationWatts / Math.max(1, cpu.tdpWatts);
  const thermalFactor = coolRatio >= 1.3 ? 1 : coolRatio >= 1 ? 0.92 + 0.08 * ((coolRatio - 1) / 0.3) : Math.max(0.75, 0.92 * coolRatio);
  const cpuScore = Math.round(cpu.benchBase * cpu.cores * cpu.boostClock * thermalFactor * 6);
  const gpuScore = Math.round(gpu.benchBase * (gpu.vramGb / 8 + 1) * (1 + gpu.benchBase / 100) * 40);
  const r = cpuScore === 0 ? 1 : gpuScore / cpuScore;
  const synergy = r > 3 ? 0.9 : r < 0.4 ? 0.92 : 1 + 0.1 * (1 - Math.min(1, Math.abs(r - 1.5) / 1.5));
  const memFactor = Math.min(1.15, 0.9 + (ram.speedMhz - 3200) / 20000) * Math.min(1.1, 0.95 + ram.capacityGb / 256);
  const performanceIndex = Math.round((cpuScore + gpuScore) * synergy * memFactor);

  const totalWatts = draw(b);
  const totalPrice = Object.values(b).reduce((s, c) => s + (c.priceUsd ?? 0), 0);

  const performance = clampN((performanceIndex / PERF_REF) * 100);
  const value = clampN((Math.pow(performanceIndex, 0.8) / totalPrice / VAL_REF) * 100);
  const efficiency = clampN((Math.pow(performanceIndex, 0.75) / totalWatts / EFF_REF) * 100);
  const airflow = pc.includedFans + (fans?.count ?? 0);
  const thermal = clampN((coolRatio / 1.6) * 85 + Math.min(15, airflow * 2.5));
  const psuEff = clampN(((psu.efficiencyPct - 80) / 14) * 100);
  const psuLoad = clampN(((psu.wattage - totalWatts) / psu.wattage / 0.5) * 100);
  const thermHead = clampN(((coolRatio - 1) / 0.6) * 100);
  const quiet = clampN(((40 - cooler.noiseDb) / 16) * 100);
  const reliability = clampN(0.3 * psuEff + 0.3 * thermHead + 0.25 * psuLoad + 0.15 * quiet);
  const freeRam = clampN(((mobo.memorySlots - ram.modules) / mobo.memorySlots) * 100);
  const freeM2 = clampN(((mobo.m2Slots - (st.iface === 'NVMe' ? 1 : 0)) / mobo.m2Slots) * 100);
  const psuHead = clampN(((psu.wattage / Math.max(1, totalWatts) - 1) / 0.8) * 100);
  const gpuClear = clampN(((pc.maxGpuLengthMm - gpu.dimensions.length) / pc.maxGpuLengthMm) * 200);
  const fanRoom = clampN((pc.fanMounts / 10) * 100);
  const scalability = clampN(0.25 * freeRam + 0.2 * freeM2 + 0.25 * psuHead + 0.15 * gpuClear + 0.15 * fanRoom);

  const composite = W.performance * performance + W.value * value + W.efficiency * efficiency +
    W.thermal * thermal + W.reliability * reliability + W.scalability * scalability;
  const finalScore = Math.round(composite * 100);

  return {
    cpuScore, gpuScore, performanceIndex,
    perfPerWatt: +(performanceIndex / totalWatts).toFixed(1), perfPerDollar: +(performanceIndex / totalPrice).toFixed(2),
    totalWatts, totalPrice, synergyFactor: +synergy.toFixed(3), memoryFactor: +memFactor.toFixed(3), thermalFactor: +thermalFactor.toFixed(3),
    performance: Math.round(performance), value: Math.round(value), efficiency: Math.round(efficiency),
    thermal: Math.round(thermal), reliability: Math.round(reliability), scalability: Math.round(scalability),
    finalScore,
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
