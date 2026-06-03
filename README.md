# Build My PC 🖥️

A 3D PC-building simulator that runs in the browser. Assemble a PC from real-world
components, validate compatibility, boot it, run a simulated benchmark, and compete
on a global leaderboard — no login required.

## Architecture

- **Frontend (this repo):** React + TypeScript + React Three Fiber (Three.js), built
  with Vite and deployed to **GitHub Pages**.
- **Leaderboard backend:** **Supabase** (managed Postgres + an Edge Function that
  re-validates each build and computes the score authoritatively, so the leaderboard
  can't be faked).
- **Component data & 3D models:** bundled as static assets in this repo
  (`public/components/*.json`, `public/models/*.glb`).

## Status

🚧 Project scaffolding in progress.

## Secrets / configuration

Nothing secret lives in this repo. Build-time config is supplied via GitHub Actions secrets:

| Name | Type | Safe in frontend? |
|------|------|-------------------|
| `VITE_SUPABASE_URL` | Project URL | yes |
| `VITE_SUPABASE_ANON_KEY` | Publishable (anon) key | yes |
| Supabase service-role key | Edge Function secret only | **no — never** |
