import type { Build } from './types';
import { supabase } from './supabase';
import { runBenchmark } from '../rules/benchmark';
import { isBuildValid } from '../rules/compatibility';

export interface SubmitResult {
  ok: boolean;
  rank?: number;
  score?: number;
  error?: string;
}

const clean = (s: string, max: number) => s.replace(/[<>]/g, '').trim().slice(0, max);

/**
 * Submits a build to the leaderboard. The score is computed deterministically
 * (runBenchmark) and the full component spec is stored, so any entry can be
 * re-verified/re-scored later by an admin if needed.
 */
export async function submitBuild(username: string, buildName: string, build: Build, competitionId?: string | null): Promise<SubmitResult> {
  if (!isBuildValid(build)) return { ok: false, error: 'Build is not valid' };
  const uname = clean(username, 24);
  const bname = clean(buildName, 40);
  if (!uname || !bname) return { ok: false, error: 'Username and build name are required' };

  const breakdown = runBenchmark(build);
  const ids = Object.fromEntries(Object.entries(build).map(([cat, c]) => [cat, c.id]));
  const cpu = build.CPU!, gpu = build.GPU;

  const { error } = await supabase.from('builds').insert({
    username: uname, build_name: bname,
    cpu_id: cpu.id, gpu_id: gpu?.id ?? 'igpu',
    cpu_label: cpu.model, gpu_label: gpu ? gpu.model : `${cpu.model} (iGPU)`,
    build_spec: ids, final_score: breakdown.finalScore, score_breakdown: breakdown,
    competition_id: competitionId ?? null,
  });
  if (error) {
    const hint = error.message.includes('does not exist') || error.code === 'PGRST205'
      ? ' — the leaderboard table isn\'t set up yet (see supabase/README.md)'
      : '';
    return { ok: false, error: error.message + hint };
  }

  const { count } = await supabase.from('builds')
    .select('*', { count: 'exact', head: true })
    .gt('final_score', breakdown.finalScore);
  return { ok: true, rank: (count ?? 0) + 1, score: breakdown.finalScore };
}
