import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import BuildScene from '../scene/BuildScene';
import { useBuildStore } from '../store/buildStore';
import { byCategory } from '../data/catalog';
import { CATEGORY_LABELS, CATEGORY_ORDER } from '../lib/types';
import { validateBuild, isBuildValid } from '../rules/compatibility';
import { runBenchmark } from '../rules/benchmark';
import { submitBuild } from '../lib/submit';

export default function Builder() {
  const { build, activeCategory, setActiveCategory, setComponent, removeComponent, result, setResult, reset } =
    useBuildStore();

  const checks = useMemo(() => validateBuild(build), [build]);
  const errors = checks.filter((c) => !c.ok);
  const valid = isBuildValid(build);
  const parts = byCategory(activeCategory);

  const [modalOpen, setModalOpen] = useState(false);
  const [username, setUsername] = useState('');
  const [buildName, setBuildName] = useState('');
  const [submitState, setSubmitState] = useState<{ busy: boolean; msg: string }>({ busy: false, msg: '' });

  const onBenchmark = () => {
    if (!valid) return;
    setResult(runBenchmark(build));
  };

  const onSubmit = async () => {
    setSubmitState({ busy: true, msg: '' });
    const r = await submitBuild(username.trim(), buildName.trim(), build);
    if (r.ok) {
      setSubmitState({ busy: false, msg: `Submitted! Rank #${r.rank ?? '—'}` });
    } else {
      setSubmitState({ busy: false, msg: `⚠️ ${r.error}` });
    }
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
              <button
                key={cat}
                className={`tab ${cat === activeCategory ? 'active' : ''} ${build[cat] ? 'filled' : ''}`}
                onClick={() => setActiveCategory(cat)}
              >
                {CATEGORY_LABELS[cat]}{build[cat] ? ' ✓' : ''}
              </button>
            ))}
          </div>
          <div className="parts">
            {parts.map((p) => {
              const selected = build[activeCategory]?.id === p.id;
              return (
                <button
                  key={p.id}
                  className={`part ${selected ? 'selected' : ''}`}
                  onClick={() => (selected ? removeComponent(activeCategory) : setComponent(p))}
                >
                  <span className="dot" style={{ background: p.color }} />
                  <span className="part-name">{p.brand} {p.model}</span>
                  <span className="part-meta">${p.priceUsd}{p.tdpWatts ? ` · ${p.tdpWatts}W` : ''}</span>
                </button>
              );
            })}
          </div>
          <button className="btn ghost wide" onClick={reset}>Reset build</button>
        </aside>

        {/* 3D */}
        <main className="viewport">
          <BuildScene build={build} />
        </main>

        {/* Validation + benchmark */}
        <aside className="panel inspector">
          <h2>Pre-Boot Check</h2>
          {errors.length === 0 ? (
            <p className="ok">✅ All checks passed — ready to benchmark.</p>
          ) : (
            <ul className="errors">
              {errors.map((e) => <li key={e.code}>❌ {e.message}</li>)}
            </ul>
          )}

          <button className="btn primary wide" disabled={!valid} onClick={onBenchmark}>
            ⚡ Run Benchmark
          </button>

          {result && (
            <div className="result">
              <div className="big-score">{result.finalScore.toLocaleString()}</div>
              <div className="muted">Performance Score</div>
              <ul className="breakdown">
                <li><span>CPU</span><span>{result.cpuScore.toLocaleString()}</span></li>
                <li><span>GPU</span><span>{result.gpuScore.toLocaleString()}</span></li>
                <li><span>Thermal</span><span>×{result.thermalFactor}</span></li>
                <li><span>Synergy</span><span>×{result.synergyFactor}</span></li>
                <li><span>Memory</span><span>×{result.memoryFactor}</span></li>
              </ul>
              <button className="btn accent wide" onClick={() => { setModalOpen(true); setSubmitState({ busy: false, msg: '' }); }}>
                Submit to Leaderboard
              </button>
            </div>
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
