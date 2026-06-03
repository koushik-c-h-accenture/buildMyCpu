import { useMemo, useRef, useState } from 'react';
import { Link } from 'react-router-dom';
import BuildScene from '../scene/BuildScene';
import { useBuildStore } from '../store/buildStore';
import { byCategory } from '../data/catalog';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/types';
import { validateBuild } from '../rules/compatibility';
import { runBenchmark } from '../rules/benchmark';
import { submitBuild } from '../lib/submit';

export default function Builder() {
  const {
    build, activeCategory, setActiveCategory, setComponent, removeComponent,
    result, setResult, phase, setPhase, errors, setErrors, reset,
  } = useBuildStore();

  const parts = byCategory(activeCategory);
  const selectedCount = CATEGORY_ORDER.filter((c) => build[c]).length;
  const allSelected = selectedCount === CATEGORY_ORDER.length;
  const totals = useMemo(() => {
    let price = 0, watts = 0;
    for (const c of CATEGORY_ORDER) { price += build[c]?.priceUsd ?? 0; watts += build[c]?.tdpWatts ?? 0; }
    return { price, watts };
  }, [build]);

  const timer = useRef<number | null>(null);
  const runTest = () => {
    if (!allSelected) return;
    setPhase('testing');
    if (timer.current) window.clearTimeout(timer.current);
    timer.current = window.setTimeout(() => {
      const errs = validateBuild(build).filter((r) => !r.ok);
      if (errs.length) {
        setErrors(errs);
        setPhase('failed');
      } else {
        setResult(runBenchmark(build));
        setPhase('done');
      }
    }, 2200);
  };

  // submit modal
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
        <Link className="btn" to="/leaderboard">🏆 Leaderboard</Link>
      </header>

      <div className="layout">
        {/* Catalog */}
        <aside className="panel catalog">
          <div className="tabs">
            {CATEGORY_ORDER.map((cat) => (
              <button key={cat}
                className={`tab ${cat === activeCategory ? 'active' : ''} ${build[cat] ? 'filled' : ''}`}
                onClick={() => setActiveCategory(cat)}>
                {CATEGORY_LABELS[cat]}{build[cat] ? ' ✓' : ''}
              </button>
            ))}
          </div>
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

        {/* 3D viewport */}
        <main className="viewport">
          <BuildScene build={build} />
          {phase === 'testing' && (
            <div className="overlay">
              <div className="spinner" />
              <div>Running benchmark…</div>
              <div className="muted small">Stress-testing CPU &amp; GPU, checking thermals</div>
            </div>
          )}
        </main>

        {/* Inspector */}
        <aside className="panel inspector">
          {phase === 'building' && (
            <>
              <h2>Your Build</h2>
              <ul className="summary">
                {CATEGORY_ORDER.map((cat) => (
                  <li key={cat}>
                    <span className="muted">{CATEGORY_LABELS[cat]}</span>
                    <span>{build[cat] ? build[cat]!.model : '—'}</span>
                  </li>
                ))}
              </ul>
              <div className="totals">
                <div><span className="muted">Total cost</span><strong>${totals.price.toLocaleString()}</strong></div>
                <div><span className="muted">Est. power draw</span><strong>{totals.watts} W</strong></div>
              </div>
              <button className="btn primary wide" disabled={!allSelected} onClick={runTest}>
                ⚡ Test &amp; Benchmark
              </button>
              {!allSelected && (
                <p className="muted small center">Select all {CATEGORY_ORDER.length} components
                  ({selectedCount}/{CATEGORY_ORDER.length})</p>
              )}
            </>
          )}

          {phase === 'testing' && <p className="muted">Benchmarking in progress…</p>}

          {phase === 'failed' && (
            <>
              <h2 className="danger">❌ Build Failed</h2>
              <p className="muted small">Compatibility problems were detected during the pre-boot check:</p>
              <ul className="errors">
                {errors.map((e) => <li key={e.code}>{e.message}</li>)}
              </ul>
              <button className="btn primary wide" onClick={() => setPhase('building')}>← Fix the build</button>
            </>
          )}

          {phase === 'done' && result && (
            <>
              <h2 className="ok">✅ Benchmark Complete</h2>
              <div className="big-score">{result.finalScore.toLocaleString()}</div>
              <div className="muted center">Performance Score</div>
              <div className="stat-grid">
                <div className="stat"><span>❄️ Cooling</span><b>{result.coolingScore}/100</b></div>
                <div className="stat"><span>💲 Value</span><b>{result.valueScore}</b></div>
                <div className="stat"><span>📊 Throughput</span><b>{result.throughputScore.toLocaleString()}</b></div>
                <div className="stat"><span>⚡ Power</span><b>{result.totalWatts} W</b></div>
                <div className="stat"><span>🛒 Cost</span><b>${result.totalPrice.toLocaleString()}</b></div>
                <div className="stat"><span>🌡️ Thermal</span><b>×{result.thermalFactor}</b></div>
              </div>
              <ul className="breakdown">
                <li><span>CPU score</span><span>{result.cpuScore.toLocaleString()}</span></li>
                <li><span>GPU score</span><span>{result.gpuScore.toLocaleString()}</span></li>
                <li><span>Synergy</span><span>×{result.synergyFactor}</span></li>
                <li><span>Memory</span><span>×{result.memoryFactor}</span></li>
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
              <input value={username} maxLength={24} onChange={(e) => setUsername(e.target.value)} placeholder="e.g. SilentFan99" />
            </label>
            <label>Build name
              <input value={buildName} maxLength={40} onChange={(e) => setBuildName(e.target.value)} placeholder="e.g. The Inferno" />
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
