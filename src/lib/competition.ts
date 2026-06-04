import { supabase } from './supabase';

export interface Competition {
  game_id: string;
  name: string;
  host_pin: string;
  budget_usd: number;
  max_submissions: number;
  max_tests?: number; // 0 / undefined = unlimited
  duration_min: number;
  status: 'lobby' | 'running' | 'ended';
  started_at: string | null;
  ends_at: string | null;
  reveal: boolean;
  created_at: string;
}

const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
export function genGameId(): string {
  let s = '';
  for (let i = 0; i < 6; i++) s += ALPHABET[Math.floor(Math.random() * ALPHABET.length)];
  return s;
}

export async function createCompetition(p: {
  name: string; hostPin: string; budgetUsd: number; maxSubmissions: number; durationMin: number; maxTests: number;
}): Promise<{ ok: boolean; gameId?: string; error?: string }> {
  const game_id = genGameId();
  const base = {
    game_id, name: p.name, host_pin: p.hostPin, budget_usd: p.budgetUsd,
    max_submissions: p.maxSubmissions, duration_min: p.durationMin,
  };
  let { error } = await supabase.from('competitions').insert({ ...base, max_tests: p.maxTests });
  // Resilience: if the max_tests column hasn't been added yet, create without it.
  if (error && /max_tests/i.test(error.message)) {
    ({ error } = await supabase.from('competitions').insert(base));
  }
  if (error) {
    const hint = error.code === 'PGRST205' ? ' — run the SQL in supabase/migrations/0002_competitions.sql first' : '';
    return { ok: false, error: error.message + hint };
  }
  return { ok: true, gameId: game_id };
}

export async function getCompetition(gameId: string): Promise<Competition | null> {
  const { data } = await supabase.from('competitions').select('*').eq('game_id', gameId.toUpperCase()).maybeSingle();
  return (data as Competition) ?? null;
}

export async function startCompetition(gameId: string, pin: string): Promise<{ ok: boolean; error?: string }> {
  const c = await getCompetition(gameId);
  if (!c) return { ok: false, error: 'Game not found' };
  if (c.host_pin !== pin) return { ok: false, error: 'Wrong host PIN' };
  const ends = new Date(Date.now() + c.duration_min * 60000).toISOString();
  const { error } = await supabase.from('competitions')
    .update({ status: 'running', started_at: new Date().toISOString(), ends_at: ends })
    .eq('game_id', c.game_id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function setReveal(gameId: string, pin: string, reveal: boolean): Promise<{ ok: boolean; error?: string }> {
  const c = await getCompetition(gameId);
  if (!c) return { ok: false, error: 'Game not found' };
  if (c.host_pin !== pin) return { ok: false, error: 'Wrong host PIN' };
  const { error } = await supabase.from('competitions')
    .update({ reveal, status: reveal ? 'ended' : c.status }).eq('game_id', c.game_id);
  return error ? { ok: false, error: error.message } : { ok: true };
}

export async function countSubmissions(gameId: string, username: string): Promise<number> {
  const { count } = await supabase.from('builds').select('*', { count: 'exact', head: true })
    .eq('competition_id', gameId).eq('username', username);
  return count ?? 0;
}
