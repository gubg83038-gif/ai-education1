interface Env {
  DEEPSEEK_API_KEY: string;
}

async function doFetch(
  apiKey: string,
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 25000);

  try {
    return await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: systemPrompt },
          { role: 'user', content: userMessage },
        ],
        temperature: options?.temperature ?? 0.7,
        max_tokens: options?.maxTokens ?? 4096,
        ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
      }),
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

export async function callDeepSeek(
  env: Env,
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const apiKey = env.DEEPSEEK_API_KEY;
  if (!apiKey) throw new Error('DEEPSEEK_API_KEY 未配置');

  // Try twice with a 2s gap between retries
  let lastError: Error | null = null;
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const res = await doFetch(apiKey, systemPrompt, userMessage, options);

      if (res.ok) {
        const data = await res.json();
        return data.choices[0].message.content;
      }

      const errText = await res.text();
      lastError = new Error(`DeepSeek ${res.status}: ${errText.slice(0, 200)}`);

      // Don't retry auth errors
      if (res.status === 401 || res.status === 403) throw lastError;
    } catch (err: any) {
      if (err.name === 'AbortError') {
        lastError = new Error('AI 响应超时，请稍后重试');
      } else if (err.message?.includes('401') || err.message?.includes('403')) {
        throw err;
      } else {
        lastError = err;
      }
    }

    if (attempt === 0) await new Promise(r => setTimeout(r, 2000));
  }

  throw lastError || new Error('AI 服务请求失败');
}

function cleanJSON(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return s;
}

export function parseAIResponse(raw: string): any {
  return JSON.parse(cleanJSON(raw));
}
