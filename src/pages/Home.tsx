import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { createCompetition, getCompetition } from '../lib/competition';
import { useCompStore } from '../store/compStore';
import { supabase } from '../lib/supabase';
import { SUPABASE_URL } from '../config';

const PROJECT_REF = SUPABASE_URL.match(/https:\/\/([^.]+)/)?.[1] ?? '';
const SQL_EDITOR = `https://supabase.com/dashboard/project/${PROJECT_REF}/sql/new`;

export default function Home() {
  const nav = useNavigate();
  const { setSession, clear } = useCompStore();
  const [tab, setTab] = useState<'join' | 'host'>('join');
  const [setupOk, setSetupOk] = useState<boolean | null>(null);
  useEffect(() => {
    supabase.from('competitions').select('game_id', { count: 'exact', head: true })
      .then(({ error }) => setSetupOk(!error));
  }, []);

  // join
  const [gameId, setGameId] = useState('');
  const [username, setUsername] = useState('');
  const [joinMsg, setJoinMsg] = useState('');
  const join = async () => {
    setJoinMsg('Checking…');
    const c = await getCompetition(gameId.trim());
    if (!c) { setJoinMsg('⚠️ No competition found for that Game ID'); return; }
    setSession(c.game_id, username.trim());
    nav('/build');
  };

  // host
  const [name, setName] = useState('');
  const [budget, setBudget] = useState(2000);
  const [maxSub, setMaxSub] = useState(3);
  const [maxTests, setMaxTests] = useState(0);
  const [duration, setDuration] = useState(20);
  const [autoFilter, setAutoFilter] = useState(false);
  const [pin, setPin] = useState('');
  const [created, setCreated] = useState<string | null>(null);
  const [hostMsg, setHostMsg] = useState('');
  const host = async () => {
    if (!name.trim() || !pin.trim()) { setHostMsg('Name and host PIN are required'); return; }
    setHostMsg('Creating…');
    const r = await createCompetition({ name: name.trim(), hostPin: pin.trim(), budgetUsd: budget, maxSubmissions: maxSub, durationMin: duration, maxTests, autoFilter });
    if (!r.ok) { setHostMsg(`⚠️ ${r.error}`); return; }
    setCreated(r.gameId!); setHostMsg('');
  };

  return (
    <div className="page">
      <header className="topbar">
        <h1>🖥️ Build My PC — Competition Arena</h1>
        <button className="btn" onClick={() => { clear(); nav('/build'); }}>🛠️ Practice (free build)</button>
      </header>

      <div className="home">
        {setupOk === false && (
          <div className="notice" style={{ marginBottom: 16, borderColor: 'var(--red)' }}>
            <strong>⚠️ One-time database setup required</strong>
            <p className="muted small">Hosting, joining, and the leaderboard need two Supabase tables that
              don't exist yet. Open the SQL editor, paste the setup SQL from <code>supabase/migrations/0002_competitions.sql</code>, and click Run.</p>
            <a className="btn primary" href={SQL_EDITOR} target="_blank" rel="noreferrer">Open Supabase SQL Editor →</a>
          </div>
        )}
        <div className="home-tabs">
          <button className={`tab ${tab === 'join' ? 'active' : ''}`} onClick={() => setTab('join')}>Join a Competition</button>
          <button className={`tab ${tab === 'host' ? 'active' : ''}`} onClick={() => setTab('host')}>Host a Competition</button>
        </div>

        {tab === 'join' && (
          <div className="card">
            <h2>Join with a Game ID</h2>
            <label>Game ID
              <input value={gameId} onChange={(e) => setGameId(e.target.value.toUpperCase())} placeholder="e.g. 7KQ2MP" maxLength={6} />
            </label>
            <label>Your username
              <input value={username} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. team-alpha" maxLength={24} />
            </label>
            <button className="btn primary wide" disabled={!gameId.trim() || !username.trim()} onClick={join}>Enter Arena →</button>
            {joinMsg && <p className="muted small">{joinMsg}</p>}
          </div>
        )}

        {tab === 'host' && (
          <div className="card">
            {!created ? (
              <>
                <h2>Create a Competition</h2>
                <label>Competition name<input value={name} onChange={(e) => setName(e.target.value)} placeholder="Q3 Build-Off" maxLength={40} /></label>
                <div className="row2">
                  <label>Budget ($)<input type="number" value={budget} min={300} step={50} onChange={(e) => setBudget(+e.target.value)} /></label>
                  <label>Timer (min)<input type="number" value={duration} min={1} max={180} onChange={(e) => setDuration(+e.target.value)} /></label>
                </div>
                <div className="row2">
                  <label>Max builds / user<input type="number" value={maxSub} min={1} max={50} onChange={(e) => setMaxSub(+e.target.value)} /></label>
                  <label>Max tests / user (0 = ∞)<input type="number" value={maxTests} min={0} max={200} onChange={(e) => setMaxTests(+e.target.value)} /></label>
                </div>
                <label className="check"><input type="checkbox" checked={autoFilter} onChange={(e) => setAutoFilter(e.target.checked)} /> Auto-filter incompatible parts for players (guided mode)</label>
                <label>Host PIN<input value={pin} onChange={(e) => setPin(e.target.value)} placeholder="secret PIN" maxLength={12} /></label>
                <button className="btn primary wide" onClick={host}>Create Competition</button>
                {hostMsg && <p className="muted small">{hostMsg}</p>}
              </>
            ) : (
              <>
                <h2>✅ Competition created</h2>
                <p>Share this Game ID with participants:</p>
                <div className="gameid">{created}</div>
                <p className="muted small">Keep your Host PIN safe — you'll need it to start the timer and reveal the leaderboard.</p>
                <button className="btn primary wide" onClick={() => nav(`/host/${created}`)}>Open Host Console →</button>
              </>
            )}
          </div>
        )}
      </div>
    </div>
  );
}
