// Public Supabase config. The anon/publishable key is designed to be exposed in
// the frontend bundle, so we ship working defaults and allow env overrides for
// local dev or future environments.
export const SUPABASE_URL =
  import.meta.env.VITE_SUPABASE_URL ?? 'https://yafodyziiftuymadbult.supabase.co';

export const SUPABASE_ANON_KEY =
  import.meta.env.VITE_SUPABASE_ANON_KEY ??
  'sb_publishable_qoDOoFABjIW7SRKOgyNcpQ_8QoYJBHs';
