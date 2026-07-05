import { callDeepSeek, parseAIResponse } from '../../lib/deepseek';

const SYSTEM = `你是AI学习教练。简短温暖2-3句反馈，给可执行建议。返回JSON：{"message":"","suggestions":[{"label":"","action":"upgrade|split|reduce"}]}`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const userMsg = `数据：${JSON.stringify(body.stats)}\n动作：${JSON.stringify(body.recentActions)}`;

    const raw = await callDeepSeek(context.env, SYSTEM, userMsg, { temperature: 0.8, jsonMode: true });
    const data = parseAIResponse(raw);

    return new Response(JSON.stringify({ success: true, ...data }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
