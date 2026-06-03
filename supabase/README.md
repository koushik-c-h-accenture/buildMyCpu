# Supabase backend setup (one-time)

The frontend deploys automatically to GitHub Pages and works as a single-player
simulator with **zero backend**. The global leaderboard needs two things set up
once in your Supabase project (`yafodyziiftuymadbult`).

## 1. Create the leaderboard table

Dashboard → **SQL Editor** → paste the contents of
[`migrations/0001_builds.sql`](./migrations/0001_builds.sql) → **Run**.

This creates `public.builds` with Row-Level Security: public can read the
leaderboard, but nobody can insert with the anon key. Only the Edge Function
(service-role) can write — so scores can't be faked.

## 2. Deploy the scoring Edge Function

Requires the [Supabase CLI](https://supabase.com/docs/guides/cli):

```bash
supabase login                       # uses a fresh personal access token
supabase link --project-ref yafodyziiftuymadbult
supabase functions deploy submit-build --no-verify-jwt
```

`SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` are injected into the function
runtime automatically — you do **not** need to set them.

## 3. Done

Reload the deployed app, build a PC, run the benchmark, and submit. The
leaderboard page will populate. Until these steps are done, the Leaderboard page
shows a friendly "backend not ready" notice and the rest of the app works fine.

## Keeping specs in sync

The function embeds a canonical copy of component specs (`SPECS` in
`functions/submit-build/index.ts`) that must match `src/data/catalog.ts`. When
you add components, update both. (A future improvement is to move the catalog
into a Supabase table the function reads, eliminating the duplication.)
