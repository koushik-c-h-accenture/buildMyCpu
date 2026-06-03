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

## Known TODO / future
- Real GLB models + drag/snap assembly + cable routing (currently parametric
  boxes at real dimensions with fixed slots).
- Move catalog into a Supabase table to remove the function/catalog duplication.
- Code-split the 1.25MB bundle (Three.js).
