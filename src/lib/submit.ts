import type { Build } from './types';
import { SUPABASE_URL, SUPABASE_ANON_KEY } from '../config';

export interface SubmitResult {
  ok: boolean;
  rank?: number;
  score?: number;
  error?: string;
}

/**
 * Submits a build to the authoritative scoring Edge Function. The server
 * re-validates and re-scores from the component IDs — the client never sends
 * a score it could fake.
 */
export async function submitBuild(
  username: string,
  buildName: string,
  build: Build,
): Promise<SubmitResult> {
  const componentIds = Object.fromEntries(
    Object.entries(build).map(([cat, c]) => [cat, c.id]),
  );
  try {
    const res = await fetch(`${SUPABASE_URL}/functions/v1/submit-build`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        apikey: SUPABASE_ANON_KEY,
        Authorization: `Bearer ${SUPABASE_ANON_KEY}`,
      },
      body: JSON.stringify({ username, buildName, componentIds }),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      return { ok: false, error: data.message ?? `Submit failed (HTTP ${res.status})` };
    }
    return { ok: true, rank: data.rank, score: data.final_score };
  } catch (e) {
    return { ok: false, error: e instanceof Error ? e.message : 'Network error' };
  }
}
