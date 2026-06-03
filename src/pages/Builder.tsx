import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BuildScene from '../scene/BuildScene';
import { useBuildStore } from '../store/buildStore';
import { byCategory } from '../data/catalog';
import {
  CATEGORY_LABELS, CATEGORY_ORDER, REQUIRED_CATEGORIES, OPTIONAL_CATEGORIES,
} from '../lib/types';
import { validateBuild } from '../rules/compatibility';
import { runBenchmark } from '../rules/benchmark';
import { submitBuild } from '../lib/submit';

const SUBSCORES = [
  ['performance', '🚀 Performance'], ['value', '💲 Value'], ['efficiency', '⚡ Efficiency'],
  ['thermal', '❄️ Thermal'], ['reliability', '🛡️ Reliability'], ['scalability', '📈 Scalability'],
] as const;

function Bar({ v }: { v: number }) {
  return <div className="bar"><div className="bar-fill" style={{ width: `${v}%` }} /></div>;
}

export default function Builder() {
  const {
    build, activeCategory, setActiveCategory, setComponent, removeComponent,
    result, setResult, phase, setPhase, errors, setErrors, reset,
  } = useBuildStore();

  const parts = byCategory(activeCategory);
  const selectedCount = REQUIRED_CATEGORIES.filter((c) => build[c]).length;
  const allSelected = selectedCount === REQUIRED_CATEGORIES.length;
  const totals = useMemo(() => {
    let price = 0, watts = 0;
    for (const c of CATEGORY_ORDER) { price += build[c]?.priceUsd ?? 0; watts += build[c]?.tdpWatts ?? 0; }
    return { price, watts };
  }, [build]);

  const timer = useRef<number | null>(null);
  const runTest = () => {
    if (!allSelected) return;
    const errs = validateBuild(build).filter((r) => !r.ok);
    setPhase('testing');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      if (errs.length) { setErrors(errs); setPhase('failed'); }
      else { setResult(runBenchmark(build)); setPhase('done'); }
    }, errs.length ? 1400 : 2400);
  };

  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [buildName, setBuildName] = useState('');
  const [submitState, setSubmitState] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: '' });
  const onSubmit = async () => {
    setSubmitState({ busy: true, msg: '' });
    const r = await submitBuild(username.trim(), buildName.trim(), build);
    setSubmitState({ busy: false, msg: r.ok ? `✅ Submitted! Rank #${r.rank ?? '—'}` : `⚠️ ${r.error}` });
  };

  return (
    <div className="builder">
      <header className="topbar">
        <h1>🖥️ Build My PC</h1>
        <div style={{ display: 'flex', gap: 8 }}>
          <Link className="btn" to="/scoring">📊 Scoring</Link>
          <Link className="btn" to="/leaderboard">🏆 Leaderboard</Link>
        </div>
      </header>

      <div className="layout">
        <aside className="panel catalog">
          <div className="tabs">
            {CATEGORY_ORDER.map((cat) => (
              <button key={cat}
                className={`tab ${cat === activeCategory ? 'active' : ''} ${build[cat] ? 'filled' : ''}`}
                onClick={() => setActiveCategory(cat)}>
                {CATEGORY_LABELS[cat]}{build[cat] ? ' ✓' : OPTIONAL_CATEGORIES.includes(cat) ? ' *' : ''}
              </button>
            ))}
          </div>
          {OPTIONAL_CATEGORIES.includes(activeCategory) && (
            <p className="muted small">Optional — improves airflow/thermals &amp; scalability.</p>
          )}
          <div className="parts">
            {parts.map((p) => {
              const selected = build[activeCategory]?.id === p.id;
              return (
                <button key={p.id} className={`part ${selected ? 'selected' : ''}`}
                  onClick={() => (selected ? removeComponent(activeCategory) : setComponent(p))}>
                  <span className="dot" style={{ background: p.color }} />
                  <span className="part-name">{p.brand} {p.model}</span>
                  <span className="part-meta">${p.priceUsd}{p.tdpWatts ? ` · ${p.tdpWatts}W` : ''}</span>
                </button>
              );
            })}
          </div>
          <button className="btn ghost wide" onClick={reset}>Reset build</button>
        </aside>

        <main className="viewport">
          <BuildScene build={build} />
          {phase === 'testing' && (
            <div className="overlay">
              <div className="spinner" />
              <div>Powering on &amp; stress-testing…</div>
              <div className="muted small">CPU + GPU load, thermals, power delivery</div>
            </div>
          )}
        </main>

        <aside className="panel inspector">
          {phase === 'building' && (
            <>
              <h2>Your Build</h2>
              <ul className="summary">
                {CATEGORY_ORDER.map((cat) => (
                  <li key={cat}>
                    <span className="muted">{CATEGORY_LABELS[cat]}</span>
                    <span>{build[cat] ? build[cat]!.model : (OPTIONAL_CATEGORIES.includes(cat) ? '— (optional)' : '—')}</span>
                  </li>
                ))}
              </ul>
              <div className="totals">
                <div><span className="muted">Total cost</span><strong>${totals.price.toLocaleString()}</strong></div>
                <div><span className="muted">Est. power</span><strong>{totals.watts} W</strong></div>
              </div>
              <button className="btn primary wide" disabled={!allSelected} onClick={runTest}>🔌 Power On &amp; Test</button>
              {!allSelected && (
                <p className="muted small center">Select all {REQUIRED_CATEGORIES.length} required parts
                  ({selectedCount}/{REQUIRED_CATEGORIES.length})</p>
              )}
            </>
          )}

          {phase === 'testing' && <p className="muted">Benchmark running…</p>}

          {phase === 'failed' && (
            <>
              <h2 className="danger">💥 Build Failed — it won't POST</h2>
              <p className="muted small">The system shut down. Incompatibilities detected:</p>
              <ul className="errors">{errors.map((e) => <li key={e.code}>{e.message}</li>)}</ul>
              <button className="btn primary wide" onClick={() => setPhase('building')}>← Fix the build</button>
            </>
          )}

          {phase === 'done' && result && (
            <>
              <h2 className="ok">✅ Benchmark Complete</h2>
              <div className="big-score">{result.finalScore.toLocaleString()}</div>
              <div className="muted center">Competition Score (/10,000)</div>
              <div className="subscores">
                {SUBSCORES.map(([k, label]) => (
                  <div className="subscore" key={k}>
                    <div className="subscore-top"><span>{label}</span><b>{result[k]}</b></div>
                    <Bar v={result[k] as number} />
                  </div>
                ))}
              </div>
              <ul className="breakdown">
                <li><span>Performance Index</span><span>{result.performanceIndex.toLocaleString()}</span></li>
                <li><span>Perf / Watt</span><span>{result.perfPerWatt}</span></li>
                <li><span>Perf / $</span><span>{result.perfPerDollar}</span></li>
                <li><span>Power draw</span><span>{result.totalWatts} W</span></li>
                <li><span>Total cost</span><span>${result.totalPrice.toLocaleString()}</span></li>
                <li><span>Build weight</span><span>{result.totalWeightKg} kg</span></li>
              </ul>
              <button className="btn accent wide" onClick={() => { setModalOpen(true); setSubmitState({ busy: false, msg: '' }); }}>
                🏆 Submit to Leaderboard
              </button>
              <button className="btn ghost wide" onClick={() => setPhase('building')}>Tweak build</button>
            </>
          )}
        </aside>
      </div>

      {modalOpen && (
        <div className="modal-backdrop" onClick={() => setModalOpen(false)}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <h3>Submit your build</h3>
            <label>Username
              <input value={username} maxLength={24} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. team-alpha" />
            </label>
            <label>Build name
              <input value={buildName} maxLength={40} onChange={(e) => setBuildName(e.target.value)} placeholder="e.g. The Workhorse" />
            </label>
            <div className="modal-actions">
              <button className="btn ghost" onClick={() => setModalOpen(false)}>Cancel</button>
              <button className="btn accent" disabled={submitState.busy || !username.trim() || !buildName.trim()} onClick={onSubmit}>
                {submitState.busy ? 'Submitting…' : 'Submit'}
              </button>
            </div>
            {submitState.msg && <p className="muted" style={{ marginTop: 10 }}>{submitState.msg}</p>}
          </div>
        </div>
      )}
    </div>
  );
}
