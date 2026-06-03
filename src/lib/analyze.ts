import type { Build, Category } from './types';
import type { ScoreBreakdown } from '../rules/benchmark';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

const ORDER: Category[] = ['CPU', 'GPU', 'MOBO', 'RAM', 'COOLER', 'CASE', 'PSU'];

export async function analyzeBuild(build: Build, scores: ScoreBreakdown): Promise<{ ok: boolean; analysis?: string; error?: string }> {
  const parts = ORDER.filter((c) => build[c]).map((c) => ({
    category: c, name: `${build[c]!.brand} ${build[c]!.model}`,
    priceUsd: build[c]!.priceUsd, tdpWatts: build[c]!.tdpWatts,
  }));
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/analyze-build`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}` },
      body: JSON.stringify({ parts, scores }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) return { ok: false, error: data.message ?? `HTTP ${res.status}` };
    return { ok: true, analysis: data.analysis };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
