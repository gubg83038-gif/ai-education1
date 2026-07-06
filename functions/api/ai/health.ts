export async function onRequest(context: any) {
  const raw = context.env?.DEEPSEEK_API_KEY || '';
  return new Response(JSON.stringify({
    ok: true,
    hasKey: !!raw,
    keyPreview: raw ? raw.slice(0, 5) + '...' : '(空)',
  }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
