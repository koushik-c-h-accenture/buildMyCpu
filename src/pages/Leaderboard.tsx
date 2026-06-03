import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { supabase } from '../lib/supabase';
import type { LeaderboardRow } from '../lib/types';

export default function Leaderboard() {
  const [rows, setRows] = useState<LeaderboardRow[]>([]);
  const [status, setStatus] = useState<'loading' | 'ready' | 'empty' | 'error'>('loading');
  const [message, setMessage] = useState('');

  useEffect(() => {
    (async () => {
      const { data, error } = await supabase
        .from('builds')
        .select('id, username, build_name, cpu_label, gpu_label, final_score, created_at')
        .order('final_score', { ascending: false })
        .limit(100);

      if (error) {
        // Table not created yet, or backend not provisioned.
        setStatus('error');
        setMessage(error.message);
        return;
      }
      setRows(data ?? []);
      setStatus((data?.length ?? 0) === 0 ? 'empty' : 'ready');
    })();
  }, []);

  return (
    <div className="page">
      <header className="topbar">
        <h1>🏆 Global Leaderboard</h1>
        <Link className="btn" to="/">← Back to Builder</Link>
      </header>

      {status === 'loading' && <p className="muted">Loading…</p>}
      {status === 'empty' && <p className="muted">No builds yet — be the first to submit one!</p>}
      {status === 'error' && (
        <div className="notice">
          <strong>Leaderboard backend not ready yet.</strong>
          <p className="muted">The <code>builds</code> table or Edge Function hasn't been
            provisioned in Supabase. See <code>supabase/README.md</code> for the one-time setup.</p>
          <p className="muted" style={{ fontSize: 12 }}>Detail: {message}</p>
        </div>
      )}

      {status === 'ready' && (
        <table className="lb">
          <thead>
            <tr><th>#</th><th>Username</th><th>Build</th><th>CPU</th><th>GPU</th><th>Score</th></tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={r.id}>
                <td>{i + 1}</td>
                <td>{r.username}</td>
                <td>{r.build_name}</td>
                <td>{r.cpu_label}</td>
                <td>{r.gpu_label}</td>
                <td className="score">{r.final_score.toLocaleString()}</td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
