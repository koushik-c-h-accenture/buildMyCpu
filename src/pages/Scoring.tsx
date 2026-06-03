import { Link } from 'react-router-dom';

export default function Scoring() {
  return (
    <div className="page">
      <header className="topbar">
        <h1>📊 Scoring Methodology</h1>
        <Link className="btn" to="/">← Back to Builder</Link>
      </header>
      <div className="doc">
        <p>The <strong>Competition Score</strong> (0–10,000) rewards a balanced, professional
          build — not just the most expensive parts. It blends six sub-scores, each 0–100.</p>

        <h2>Weighting</h2>
        <table>
          <thead><tr><th>Sub-score</th><th>Weight</th><th>Rewards</th></tr></thead>
          <tbody>
            <tr><td>🚀 Performance</td><td>34%</td><td>Raw CPU + GPU compute throughput</td></tr>
            <tr><td>💲 Value</td><td>18%</td><td>Performance per dollar (diminishing returns on premium parts)</td></tr>
            <tr><td>⚡ Efficiency</td><td>16%</td><td>Performance per watt (power-efficient builds)</td></tr>
            <tr><td>❄️ Thermal</td><td>12%</td><td>Cooler headroom over CPU TDP + case airflow</td></tr>
            <tr><td>🛡️ Reliability</td><td>10%</td><td>PSU efficiency tier, load headroom, thermal margin, acoustics</td></tr>
            <tr><td>📈 Scalability</td><td>10%</td><td>Free RAM/M.2 slots, PSU headroom, GPU clearance, fan mounts</td></tr>
          </tbody>
        </table>
        <div className="formula">FinalScore = 100 × (0.34·Perf + 0.18·Value + 0.16·Eff + 0.12·Thermal + 0.10·Reliability + 0.10·Scalability)</div>

        <h2>Performance Index (PI)</h2>
        <div className="formula">cpuScore = benchBase × cores × boostClock × thermalFactor × 6
gpuScore = benchBase × (vram/8 + 1) × (1 + benchBase/100) × 40
PI = (cpuScore + gpuScore) × synergy × memoryFactor
Performance = min(100, PI / 7000 × 100)</div>
        <p><strong>thermalFactor</strong> throttles the CPU when the cooler can't dissipate its TDP
          (≥1.3× headroom = no throttle; below 1.0× = penalty down to 0.75×).
          <strong> synergy</strong> penalises CPU/GPU bottlenecks; <strong>memoryFactor</strong> rewards
          faster, larger RAM.</p>

        <h2>Value & Efficiency</h2>
        <div className="formula">Value      = min(100, PI^0.8 / totalPrice / 0.43 × 100)
Efficiency = min(100, PI^0.75 / totalWatts / 1.10 × 100)</div>
        <p>The sub-linear exponents model <em>diminishing returns</em>: the last 10% of performance from
          ultra-premium parts costs disproportionately more money and watts, so mid-range parts can win
          these axes. This is where strategy lives.</p>

        <h2>Thermal, Reliability, Scalability</h2>
        <div className="formula">Thermal     = (coolerDissipation / cpuTDP / 1.6 × 85) + min(15, airflowFans × 2.5)
Reliability = 0.30·psuEfficiency + 0.30·thermalHeadroom + 0.25·psuLoadHeadroom + 0.15·acoustics
Scalability = 0.25·freeRAMslots + 0.20·freeM.2 + 0.25·psuHeadroom + 0.15·gpuClearance + 0.15·fanMounts</div>

        <h2>Strategy tips for competitors</h2>
        <ul>
          <li>A flagship CPU on a weak cooler <em>throttles</em> — it loses Performance <em>and</em> Thermal/Reliability.</li>
          <li>Overspending tanks Value; an oversized PSU helps Reliability + Scalability but a hugely oversized one wastes Value.</li>
          <li>Efficient chips (e.g. X3D) and right-sized GPUs lift Efficiency and Value.</li>
          <li>Add case fans and leave free RAM/M.2 slots to maximise Scalability.</li>
          <li>The winning build is <strong>balanced</strong>: powerful, affordable, cool, efficient, and upgradeable.</li>
        </ul>
        <p className="muted">Scoring is deterministic and computed server-side on submission, so the
          leaderboard can't be gamed. Full formulas live in <code>SCORING.md</code> in the repo.</p>
      </div>
    </div>
  );
}
