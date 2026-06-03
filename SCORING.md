# Build My PC — Scoring Methodology

> Reference for competitors. The **Competition Score** (0–10,000) is deterministic and
> computed **server-side on submission**, so it cannot be gamed. The same methodology
> runs live in the app (`/scoring`).

## Goal

Reward the *best-engineered* PC — not merely the most expensive one. A winning build is
**powerful, affordable, power-efficient, cool, reliable, and upgradeable**. The score
forces real trade-offs between these dimensions.

## The Competition Score

A weighted blend of six sub-scores, each normalised to 0–100:

| Sub-score | Weight | What it measures |
|---|---|---|
| 🚀 Performance | **34%** | Raw CPU + GPU compute |
| 💲 Value | **18%** | Performance per dollar |
| ⚡ Efficiency | **16%** | Performance per watt |
| ❄️ Thermal | **12%** | Cooling headroom + airflow |
| 🛡️ Reliability | **10%** | PSU quality, load & thermal margins, acoustics |
| 📈 Scalability | **10%** | Upgrade headroom |

```
FinalScore = 100 × ( 0.34·Performance + 0.18·Value + 0.16·Efficiency
                   + 0.12·Thermal + 0.10·Reliability + 0.10·Scalability )
```

## 1. Performance Index (PI)

```
thermalFactor = cooler can dissipate CPU TDP?
                ≥1.3×  → 1.00 (no throttle)
                1.0–1.3× → 0.92–1.00
                <1.0×  → down to 0.75 (throttled)

cpuScore = benchBase × cores × boostClock × thermalFactor × 6
gpuScore = benchBase × (vramGB/8 + 1) × (1 + benchBase/100) × 40

synergy      = penalty for CPU↔GPU imbalance (0.90–1.10)
memoryFactor = reward for faster / larger RAM (≈0.90–1.27)

PI          = (cpuScore + gpuScore) × synergy × memoryFactor
Performance = min(100, PI / 7000 × 100)
```

## 2. Value & Efficiency (where strategy lives)

```
Value      = min(100, PI^0.80 / totalPrice  / 0.43 × 100)
Efficiency = min(100, PI^0.75 / totalWatts  / 1.10 × 100)
```

The **sub-linear exponents** model diminishing returns: the last few percent of
performance from ultra-premium parts costs disproportionately more money and watts.
A right-sized mid-range build can beat a flagship on these axes.

## 3. Thermal / Reliability / Scalability

```
Thermal     = (coolerDissipation / cpuTDP / 1.6 × 85) + min(15, airflowFans × 2.5)

Reliability = 0.30·psuEfficiency     (Bronze→Titanium)
            + 0.30·thermalHeadroom   (cooler margin over CPU TDP)
            + 0.25·psuLoadHeadroom   (not running the PSU near its limit)
            + 0.15·acoustics         (quieter cooler = better engineering)

Scalability = 0.25·freeRAMslots + 0.20·freeM.2slots + 0.25·psuHeadroom
            + 0.15·gpuClearance  + 0.15·fanMounts
```

## Worked example

`i9-14900K + RTX 4090 + 360mm AIO + DDR5-6000 + 990 Pro + RM1000x + O11 EVO + P12 fans`
→ Performance **100**, Value 82, Efficiency 89, Thermal 87, Reliability ~90, Scalability 61
→ **Competition Score ≈ 8,600**. Huge performance, but Value/Scalability leave points on
the table — a cheaper, more upgradeable build can close the gap.

## Strategy tips

1. **Match the cooler to the CPU.** A flagship CPU on a weak cooler throttles — you lose
   Performance *and* Thermal *and* Reliability at once.
2. **Don't overspend.** Every wasted dollar drops Value (18%).
3. **Right-size the PSU.** Enough headroom boosts Reliability + Scalability; a wildly
   oversized one wastes money (Value).
4. **Favour efficiency.** Efficient CPUs (e.g. X3D) and sensible GPUs lift Efficiency + Value.
5. **Leave room to grow.** Free RAM/M.2 slots, fan mounts, and GPU clearance raise Scalability.
6. **Balance wins.** The top of the leaderboard belongs to the most *well-rounded* build.

*Formulas are implemented in `src/rules/benchmark.ts` (client) and
`supabase/functions/submit-build/` (authoritative server copy).*
