// AI build-analysis Edge Function (Deno).
//
// Calls Claude to produce a concise performance analysis of a build. The
// ANTHROPIC_API_KEY lives only here (server-side), never in the frontend bundle.
//
// Deploy:
//   supabase secrets set ANTHROPIC_API_KEY=sk-ant-...
//   supabase functions deploy analyze-build --no-verify-jwt
//
const CORS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
};

const SYSTEM = `You are a veteran PC-building expert. Given a parts list and benchmark
scores, write a SHORT analysis (max ~140 words) for an enthusiast. Cover, briefly:
1) the biggest bottleneck or imbalance (CPU vs GPU),
2) cooling adequacy,
3) value for money,
4) one concrete upgrade suggestion.
Be specific and use the real part names. Plain text, no markdown headers.`;

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: CORS });
  const json = (body: unknown, status = 200) =>
    new Response(JSON.stringify(body), { status, headers: { ...CORS, 'Content-Type': 'application/json' } });

  const key = Deno.env.get('ANTHROPIC_API_KEY');
  if (!key) return json({ message: 'AI analysis is not configured (missing ANTHROPIC_API_KEY)' }, 503);

  try {
    const { parts, scores } = await req.json();
    const partList = (parts ?? []).map((p: { category: string; name: string; priceUsd: number; tdpWatts: number }) =>
      `- ${p.category}: ${p.name} ($${p.priceUsd}, ${p.tdpWatts}W)`).join('\n');
    const prompt = `Parts:\n${partList}\n\nScores: ${JSON.stringify(scores)}\n\nAnalyze this build.`;

    const res = await fetch('https://api.anthropic.com/v1/messages', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-api-key': key,
        'anthropic-version': '2023-06-01',
      },
      body: JSON.stringify({
        model: 'claude-sonnet-4-6',
        max_tokens: 400,
        system: [{ type: 'text', text: SYSTEM, cache_control: { type: 'ephemeral' } }],
        messages: [{ role: 'user', content: prompt }],
      }),
    });
    const data = await res.json();
    if (!res.ok) return json({ message: data.error?.message ?? 'Claude API error' }, 502);
    const text = (data.content ?? []).filter((c: { type: string }) => c.type === 'text').map((c: { text: string }) => c.text).join('\n');
    return json({ analysis: text.trim() });
  } catch (e) {
    return json({ message: e instanceof Error ? e.message : 'Bad request' }, 400);
  }
});
