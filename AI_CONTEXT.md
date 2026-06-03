# AI_CONTEXT — Build My PC

Read this first when starting a work session on this project.

## What it is
A browser-based 3D PC-building simulator. Users assemble a PC from real-world
components, validate compatibility, run a deterministic benchmark for a score,
and compete on a global leaderboard (no login required).

## Live & repo
- **Live:** https://koushik-c-h-accenture.github.io/buildMyCpu/
- **Repo:** github.com/koushik-c-h-accenture/buildMyCpu (public)
- **Deploy:** auto via GitHub Actions (`.github/workflows/deploy.yml`) on push to `main`.
  Pages Source = "GitHub Actions" (had to be enabled manually once — org blocks
  the workflow's `enablement: true` auto-enable).

## Local git / access
- This local repo (`/Users/koushik.c.h/Projects/claude/BuildCPU`) is its OWN git
  repo, separate from the surrounding `arbiter` working tree.
- Pushes use a dedicated SSH **deploy key**: `~/.ssh/buildmycpu_deploy`
  (configured via repo-local `core.sshCommand`). `gh` CLI auth is currently broken.

## Tech stack
- React 18 + TypeScript + Vite, React Three Fiber (Three.js) + drei, Zustand.
- Supabase (Postgres + Edge Function) for the leaderboard.
- `vite.config.ts` `base: '/buildMyCpu/'`; HashRouter (required for Pages SPA routing).

## Architecture notes
- **Components** are a bundled, typed catalog in `src/data/catalog.ts` (real dims/TDP).
- **Rules** in `src/rules/`: `compatibility.ts` (validation) + `benchmark.ts`
  (deterministic scoring: CPU+GPU × thermal × synergy × memory).
- **Authoritative scoring:** client sends only component IDs to the
  `submit-build` Edge Function, which re-validates + re-scores server-side. The
  `builds` table has RLS (public read; inserts only via service-role) so scores
  can't be faked. The function embeds a copy of specs (`SPECS`) that must stay in
  sync with `src/data/catalog.ts`.

## Supabase
- Project ref: `yafodyziiftuymadbult` (URL: https://yafodyziiftuymadbult.supabase.co)
- Anon/publishable key is public and baked into `src/config.ts` (env-overridable).
- **Outstanding one-time backend setup** (see `supabase/README.md`): run
  `supabase/migrations/0001_builds.sql` and deploy the `submit-build` function.
  Until done, the simulator works fully but the leaderboard shows a "backend not
  ready" notice.

## Scoring & categories (current)
- 9 categories: CASE, MOBO, CPU, COOLER, RAM, GPU, STORAGE, PSU (required) + FANS (optional).
  Defined in `src/lib/types.ts` (`REQUIRED_CATEGORIES` / `OPTIONAL_CATEGORIES`).
- **Competition Score 0–10,000** = weighted blend of 6 sub-scores (Performance, Value,
  Efficiency, Thermal, Reliability, Scalability). Full methodology in `SCORING.md` and the
  in-app `/scoring` page (`src/pages/Scoring.tsx`). Logic in `src/rules/benchmark.ts`.
- Edge function `submit-build` is **in sync**: it imports `catalog.json` (generated from
  `src/data/catalog.ts`) and re-implements the same validate + multi-factor score.
  Regenerate `catalog.json` whenever the catalog changes (tsx one-liner).
- "Power On & Test": compatible → load test (airflow streaks + heat light); incompatible →
  `Burst` (red flash + particle explosion) + error list. Phase machine in `buildStore.ts`.

## Backend deploy status (BLOCKER for submit)
- `builds` table + `submit-build` function are NOT yet deployed → leaderboard submit fails
  with "fetch failed". Needs a Supabase **access token** (publishable key can't create
  tables / deploy functions). Supabase CLI not installed locally.

## Known TODO / future
- AI build analysis (Claude API) — DEFERRED: user has no Anthropic API key. Code exists
  (`supabase/functions/analyze-build`, `src/lib/analyze.ts`) but is unwired/undeployed.
- Claude Artifact single-file build (sandbox likely blocks Supabase → local leaderboard only).
- buildmypc.in-style: product-card picker, save/share build URL, live PSU wattage meter.
- Real GLB models / product images (currently detailed procedural meshes).
- Code-split the ~1.29MB bundle (Three.js).

## 3D scene notes
- `src/scene/parts.tsx` = procedural part meshes (Fan, Mobo, Cpu, Ram, Gpu, Psu,
  Cooler air/AIO, Radiator, CaseShell). `S = 1/100` (mm→units).
- `src/scene/BuildScene.tsx` = layout/placement anchored to case interior bounds
  (motherboard tray on +X; camera views the open −X side), `Drop` entrance
  animation, fan spin tied to `phase` ('testing' = fast). Validation is deferred:
  no hints while building; full check fires on "Test & Benchmark" (phase machine
  in `src/store/buildStore.ts`: building → testing → done | failed).
