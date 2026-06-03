// Public Supabase config. The anon/publishable key is designed to be exposed in
// the frontend bundle, so we ship working defaults and allow env overrides for
// local dev or future environments.
// NOTE: use `||` not `??` — in CI an unset secret resolves to an empty string
// (not undefined), and we want that to fall back to the working public defaults.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL || 'https://yafodyziiftuymadbult.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ||
  'sb_publishable_qoDOoFABjIW7SRKOgyNcpQ_8QoYJBHs';
