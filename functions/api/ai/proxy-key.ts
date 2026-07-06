export async function onRequest(context: any) {
  const key = context.env?.DEEPSEEK_API_KEY;
  if (!key) {
    return new Response(JSON.stringify({ success: false, error: 'Key not configured' }), {
      status: 500,
      headers: { 'Content-Type': 'application/json' },
    });
  }

  return new Response(JSON.stringify({ success: true, key }), {
    headers: { 'Content-Type': 'application/json' },
  });
}
