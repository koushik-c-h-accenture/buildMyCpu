// Reusable scoring + rules content, shown both on the /scoring page and as a
// popup in the builder (and as the pre-game "waiting room").
export default function ScoringDoc() {
  return (
    <div className="doc">
      <p>The <strong>Competition Score</strong> (0–10,000) rewards a well-engineered build —
        powerful, affordable, power-efficient, cool, reliable, and upgradeable — not just the
        most expensive parts.</p>

      <h2>🎮 How the competition works</h2>
      <ol>
        <li><strong>A host creates a competition</strong> and gets a 6-character <strong>Game ID</strong>.
          They set the <strong>budget</strong>, the <strong>timer</strong>, how many <strong>builds each player</strong> may
          submit, and a private <strong>Host PIN</strong>.</li>
        <li><strong>Players join</strong> with the Game ID and a username.</li>
        <li>When the host <strong>starts the timer</strong>, a single global countdown runs for everyone —
          the same start and end for all participants.</li>
        <li>Build any PC <strong>within the budget</strong>. The Power-On test must pass (the rig has to
          actually run). You may submit up to the allowed number of builds (you only add a build name).</li>
        <li>The <strong>leaderboard stays hidden</strong> until the host reveals it (usually when the timer ends).
          Highest Competition Score wins.</li>
      </ol>

      <h2>🏗️ Build freely — the Power-On test judges it</h2>
      <p>Nothing is forced. When you press <strong>Power On &amp; Test</strong>:</p>
      <ul>
        <li><strong>Won't run (no score):</strong> missing CPU, motherboard, RAM, PSU, or display
          (no GPU and no integrated graphics), or any hard incompatibility (socket, memory type,
          fitment, insufficient wattage).</li>
        <li><strong>Runs with penalties:</strong> missing/weak parts still run but cost points —
          see below.</li>
      </ul>

      <h2>📊 Scoring weights</h2>
      <table>
        <thead><tr><th>Pillar</th><th>Weight</th><th>Rewards</th></tr></thead>
        <tbody>
          <tr><td>🚀 Performance</td><td>34%</td><td>Raw CPU + GPU compute (throttled by heat)</td></tr>
          <tr><td>💲 Value</td><td>18%</td><td>Performance per dollar</td></tr>
          <tr><td>⚡ Efficiency</td><td>16%</td><td>Performance per watt</td></tr>
          <tr><td>❄️ Thermal</td><td>12%</td><td>Cooling headroom over CPU heat + case airflow</td></tr>
          <tr><td>🛡️ Reliability</td><td>10%</td><td>PSU quality, load &amp; thermal margins, acoustics, has-storage</td></tr>
          <tr><td>📈 Scalability</td><td>10%</td><td>Free RAM/M.2 slots, PSU headroom, clearance, fan mounts</td></tr>
        </tbody>
      </table>
      <div className="formula">FinalScore = 100 × (0.34·Perf + 0.18·Value + 0.16·Eff + 0.12·Thermal + 0.10·Reliability + 0.10·Scalability)</div>

      <h2>🌡️ Heat management (it really matters)</h2>
      <p>If the CPU cooler can't dissipate the CPU's heat, the CPU <strong>throttles</strong> — its
        clock drops, so raw performance drops with it. Heat feeds three pillars at once:
        <strong>Performance</strong> (clock throttle), <strong>Thermal</strong>, and <strong>Reliability</strong>
        (thermal headroom). Case fans add airflow and lift the Thermal score.</p>
      <div className="formula">coolingRatio = coolerDissipation / cpuTDP
  ≥1.3× → no throttle (clock ×1.00)
  1.0–1.3× → mild throttle
  &lt;1.0× → heavy throttle (down to ×0.75 with a cooler)
  no cooler at all → ×0.45 (overheats immediately)</div>
      <p className="muted small">Example (253 W CPU): 360 mm AIO → score ~8,600 · 240 mm AIO → ~7,500 ·
        small air cooler → ~6,900 · <em>no cooler</em> → ~5,300.</p>

      <h2>🧩 Missing-component penalties</h2>
      <table>
        <thead><tr><th>Missing / weak</th><th>Consequence</th></tr></thead>
        <tbody>
          <tr><td>No CPU cooler</td><td>Heavy throttle → Performance, Thermal &amp; Reliability all drop</td></tr>
          <tr><td>No storage</td><td>No OS/boot disk → Reliability ×0.8, Scalability ×0.7</td></tr>
          <tr><td>No case (open bench)</td><td>No chassis airflow/expansion → Scalability ×0.7</td></tr>
          <tr><td>iGPU only (no GPU)</td><td>Integrated graphics → Performance drops sharply</td></tr>
          <tr><td>No / few case fans</td><td>Less airflow → lower Thermal headroom</td></tr>
        </tbody>
      </table>

      <h2>💡 Performance &amp; Value math</h2>
      <div className="formula">PI (Performance Index) = (cpuScore + gpuScore) × synergy × memoryFactor
Performance = min(100, PI / 7000 × 100)
Value       = min(100, PI^0.80 / totalPrice / 0.43 × 100)
Efficiency  = min(100, PI^0.75 / totalWatts / 1.10 × 100)</div>
      <p>The sub-linear exponents model <em>diminishing returns</em>: the last few percent of
        performance from ultra-premium parts costs disproportionately more money and watts, so
        a smart mid-range build can win Value and Efficiency.</p>

      <h2>🏆 Strategy tips</h2>
      <ul>
        <li>Match the cooler to the CPU — a flagship on a weak cooler throttles and loses three pillars at once.</li>
        <li>Don't overspend; every wasted dollar drops Value (18%).</li>
        <li>Right-size the PSU — enough headroom helps Reliability + Scalability, but a wildly oversized one wastes Value.</li>
        <li>Efficient CPUs (e.g. X3D) and sensible GPUs lift Efficiency and Value.</li>
        <li>Leave free RAM/M.2 slots and fan mounts to maximise Scalability.</li>
        <li>The winning build is <strong>balanced</strong>, not just expensive.</li>
      </ul>
    </div>
  );
}
