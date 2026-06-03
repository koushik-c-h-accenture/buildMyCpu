import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import { getCompetition, type Competition } from '../lib/competition';
import type { LeaderboardRow } from '../lib/types';

export default function Leaderboard() {
  const { gameId } = useParams();
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [comp, setComp] = useState<Competition | null>(null);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'hidden' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      let competition: Competition | null = null;
      if (gameId) {
        competition = await getCompetition(gameId);
        setComp(competition);
        if (competition && !competition.reveal) { setStatus('hidden'); return; }
      }
      let q = supabase.from('builds')
        .select('id, username, build_name, cpu_label, gpu_label, final_score, created_at')
        .order('final_score', { ascending: false }).limit(100);
      q = gameId ? q.eq('competition_id', gameId.toUpperCase()) : q.is('competition_id', null);
      const { data, error } = await q;
      if (error) { setStatus('error'); setMessage(error.message); return; }
      setRows(data ?? []);
      setStatus((data?.length ?? 0) === 0 ? 'empty' : 'ready');
    })();
  }, [gameId]);

  return (
    <div className="page">
      <header className="topbar">
        <h1>🏆 {comp ? comp.name : 'Global'} Leaderboard{gameId ? ` · ${gameId}` : ''}</h1>
        <Link className="btn" to="/build">← Builder</Link>
      </header>

      {status === 'loading' && <p className="muted" style={{ padding: 20 }}>Loading…</p>}
      {status === 'hidden' && (
        <div style={{ padding: 20 }}><div className="notice">
          <strong>🔒 Leaderboard hidden</strong>
          <p className="muted">The host hasn't revealed the results yet. Check back when the competition ends.</p>
        </div></div>
      )}
      {status === 'empty' && <p className="muted" style={{ padding: 20 }}>No builds submitted yet.</p>}
      {status === 'error' && (
        <div style={{ padding: 20 }}><div className="notice">
          <strong>Leaderboard backend not ready.</strong>
          <p className="muted">Run the SQL in <code>supabase/migrations/</code>. Detail: {message}</p>
        </div></div>
      )}

      {status === 'ready' && (
        <div style={{ padding: 20 }}>
          <table className="lb">
            <thead><tr><th>#</th><th>Player</th><th>Build</th><th>CPU</th><th>GPU</th><th>Score</th></tr></thead>
            <tbody>
              {rows.map((r, i) => (
                <tr key={r.id}>
                  <td>{i + 1}</td><td>{r.username}</td><td>{r.build_name}</td>
                  <td>{r.cpu_label}</td><td>{r.gpu_label}</td>
                  <td className="score">{r.final_score.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
