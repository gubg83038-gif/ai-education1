export async function onRequest(context: any) {
  const steps: string[] = [];
  let status = 200;

  // Step 1: check key exists
  const key = context.env?.DEEPSEEK_API_KEY;
  if (!key) {
    return json({ ok: false, step: 'env', error: 'DEEPSEEK_API_KEY 未配置或为 undefined' }, 500);
  }
  steps.push(`key ok (开头: ${key.slice(0, 5)}... 长度: ${key.length})`);

  // Step 2: test basic DeepSeek call (no json_mode, minimal tokens)
  try {
    const basic = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [{ role: 'user', content: '回复OK即可' }],
        max_tokens: 5,
      }),
    });

    if (!basic.ok) {
      const errText = await basic.text();
      return json({
        ok: false, step: 'basic_call',
        status: basic.status,
        error: errText,
        hint: statusHint(basic.status),
      }, 500);
    }
    const basicData = await basic.json();
    steps.push(`basic call ok: ${basicData.choices?.[0]?.message?.content?.slice(0, 30)}`);
  } catch (e: any) {
    return json({ ok: false, step: 'basic_call', error: e.message }, 500);
  }

  // Step 3: test full plan generation with json_mode
  try {
    const full = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '返回JSON：{"test":"ok"}' },
          { role: 'user', content: '测试' },
        ],
        max_tokens: 20,
        response_format: { type: 'json_object' },
      }),
    });

    if (!full.ok) {
      const errText = await full.text();
      return json({
        ok: false, step: 'json_mode',
        status: full.status,
        error: errText,
        hint: statusHint(full.status),
      }, 500);
    }
    const fullData = await full.json();
    steps.push(`json_mode ok: ${fullData.choices?.[0]?.message?.content}`);
  } catch (e: any) {
    return json({ ok: false, step: 'json_mode', error: e.message }, 500);
  }

  // Step 4: test a real small plan
  try {
    const plan = await fetch('https://api.deepseek.com/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
      body: JSON.stringify({
        model: 'deepseek-chat',
        messages: [
          { role: 'system', content: '你是规划师。生成最小计划JSON：{"weeks":[{"weekNumber":1,"theme":"test","goals":[""],"tasks":[{"day":1,"tasks":[{"title":"t","description":"d","estimatedMinutes":30,"difficulty":2,"category":"阅读"}]}]}]}' },
          { role: 'user', content: '目标：测试。每日30分钟' },
        ],
        max_tokens: 500,
        response_format: { type: 'json_object' },
      }),
    });

    if (!plan.ok) {
      const errText = await plan.text();
      return json({
        ok: false, step: 'generate',
        status: plan.status,
        error: errText,
        hint: statusHint(plan.status),
      }, 500);
    }
    const planData = await plan.json();
    steps.push(`generate ok: ${planData.usage?.total_tokens} tokens used`);
  } catch (e: any) {
    return json({ ok: false, step: 'generate', error: e.message }, 500);
  }

  return json({ ok: true, steps });
}

function statusHint(code: number): string {
  if (code === 401) return 'Key 无效或过期，去 platform.deepseek.com 重新生成';
  if (code === 402) return '余额不足，需要充值（至少1元）';
  if (code === 429) return '请求太频繁，稍后重试';
  if (code === 500) return 'DeepSeek 服务端错误，稍后重试';
  return '未知错误';
}

function json(obj: any, status: number = 200) {
  return new Response(JSON.stringify(obj, null, 2), {
    status,
    headers: { 'Content-Type': 'application/json' },
  });
}
