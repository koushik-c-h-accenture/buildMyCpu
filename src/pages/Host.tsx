import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { getCompetition, startCompetition, setReveal, type Competition } from '../lib/competition';
import { supabase } from '../lib/supabase';

function useCountdown(endsAt: string | null) {
  const [left, setLeft] = useState(0);
  useEffect(() => {
    if (!endsAt) return;
    const tick = () => setLeft(Math.max(0, Math.floor((new Date(endsAt).getTime() - Date.now()) / 1000)));
    tick(); const id = setInterval(tick, 1000); return () => clearInterval(id);
  }, [endsAt]);
  return left;
}

export default function Host() {
  const { gameId = '' } = useParams();
  const [comp, setComp] = useState<Competition | null>(null);
  const [pin, setPin] = useState('');
  const [msg, setMsg] = useState('');
  const [entries, setEntries] = useState(0);

  const refresh = async () => {
    const c = await getCompetition(gameId); setComp(c);
    const { count } = await supabase.from('builds').select('*', { count: 'exact', head: true }).eq('competition_id', gameId.toUpperCase());
    setEntries(count ?? 0);
  };
  useEffect(() => { refresh(); const id = setInterval(refresh, 5000); return () => clearInterval(id); }, [gameId]);

  const left = useCountdown(comp?.ends_at ?? null);
  const mm = String(Math.floor(left / 60)).padStart(2, '0');
  const ss = String(left % 60).padStart(2, '0');

  const start = async () => { const r = await startCompetition(gameId, pin); setMsg(r.ok ? 'Timer started!' : `⚠️ ${r.error}`); refresh(); };
  const reveal = async () => { const r = await setReveal(gameId, pin, true); setMsg(r.ok ? 'Leaderboard revealed!' : `⚠️ ${r.error}`); refresh(); };

  if (!comp) return (
    <div className="page"><header className="topbar"><h1>Host Console</h1><Link className="btn" to="/">← Home</Link></header>
      <div className="home"><div className="card"><p className="muted">Loading game <b>{gameId}</b>… if this persists, the competition wasn't found or the backend isn't set up.</p></div></div></div>
  );

  return (
    <div className="page">
      <header className="topbar"><h1>🎛️ Host Console — {comp.name}</h1><Link className="btn" to="/">← Home</Link></header>
      <div className="home"><div className="card">
        <div className="gameid">{comp.game_id}</div>
        <ul className="summary">
          <li><span className="muted">Status</span><span><b>{comp.status.toUpperCase()}</b></span></li>
          <li><span className="muted">Budget</span><span>${comp.budget_usd.toLocaleString()}</span></li>
          <li><span className="muted">Timer</span><span>{comp.duration_min} min</span></li>
          <li><span className="muted">Max builds / user</span><span>{comp.max_submissions}</span></li>
          <li><span className="muted">Max tests / user</span><span>{comp.max_tests ? comp.max_tests : 'Unlimited'}</span></li>
          <li><span className="muted">Submissions so far</span><span>{entries}</span></li>
          {comp.status === 'running' && <li><span className="muted">Time left</span><span><b>{mm}:{ss}</b></span></li>}
        </ul>

        <label>Host PIN<input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="enter to authorize" maxLength={12} /></label>
        <div className="row2">
          <button className="btn primary" disabled={comp.status !== 'lobby' || !pin} onClick={start}>▶ Start Timer</button>
          <button className="btn accent" disabled={comp.reveal || !pin} onClick={reveal}>🏆 Reveal Leaderboard</button>
        </div>
        {msg && <p className="muted small">{msg}</p>}
        {comp.reveal && <Link className="btn wide" to={`/board/${comp.game_id}`}>View Leaderboard →</Link>}
      </div></div>
    </div>
  );
}
