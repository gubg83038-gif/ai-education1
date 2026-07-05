const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

interface Env {
  DEEPSEEK_API_KEY: string;
}

export async function deepseekChat(
  messages: { role: 'system' | 'user' | 'assistant'; content: string }[],
  env: Env,
  options?: { temperature?: number; jsonMode?: boolean; maxTokens?: number }
): Promise<string> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置');

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages,
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`DeepSeek API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}
