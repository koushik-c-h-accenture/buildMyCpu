# Build My PC 🖥️

A 3D PC-building simulator that runs in the browser. Assemble a PC from 385 real-world
components, validate compatibility, boot it, run a simulated benchmark, and compete
on a global leaderboard — no login required.

**Highlights**
- **Photoreal-ish real-time 3D:** studio lighting (image-based reflections), ACES tone
  mapping, bloom on RGB lighting, tempered-glass case, animated fans + heat airflow.
  Optional per-SKU GLB models drop in via a component's `modelUrl` (loader included).
- **385 components, current market (2025-2026):** RTX 50-series, Radeon RX 9000, Intel
  Core Ultra 200S (LGA1851), Ryzen 9000 / 9000X3D, DDR5-8000+, PCIe Gen5 SSDs, ATX 3.1 PSUs.
- **Multi-currency:** USD, INR, EUR, GBP, AUD, CAD, SGD, AED, JPY, BRL (offline rates).
- **Enterprise-grade competitions:** host a timed build-off (Game ID + PIN), budget caps,
  per-user build/test limits, guided or raw part lists, host-revealed leaderboard.

## Architecture

- **Frontend (this repo):** React + TypeScript + React Three Fiber (Three.js), built
  with Vite and deployed to **GitHub Pages**.
- **Leaderboard backend:** **Supabase** (managed Postgres + an Edge Function that
  re-validates each build and computes the score authoritatively, so the leaderboard
  can't be faked).
- **Component data & 3D models:** bundled as static assets in this repo
  (`public/components/*.json`, `public/models/*.glb`).

## Status

✅ Playable. Build a PC, validate compatibility, run the benchmark, get a score.
The global leaderboard activates once the Supabase backend is provisioned — see
[`supabase/README.md`](./supabase/README.md).

## Local dev

```bash
npm install
npm run dev      # http://localhost:5173
npm run build    # production build into dist/
```

## Live site

https://koushik-c-h-accenture.github.io/buildMyCpu/ (deploys automatically on
push to `main` via GitHub Actions).

## Secrets / configuration

Nothing secret lives in this repo. Build-time config is supplied via GitHub Actions secrets:

| Name | Type | Safe in frontend? |
|------|------|-------------------|
| `VITE_SUPABASE_URL` | Project URL | yes |
| `VITE_SUPABASE_ANON_KEY` | Publishable (anon) key | yes |
| Supabase service-role key | Edge Function secret only | **no — never** |
