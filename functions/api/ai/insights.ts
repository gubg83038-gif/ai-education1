import { callDeepSeek, parseAIResponse } from '../_lib/deepseek';

const SYSTEM = `你是学习行为分析师。输出洞察JSON：{"overallAssessment":"","patterns":[{"type":"strength|weakness","description":"","suggestion":""}],"recommendations":[""]}`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const userMsg = `任务：${JSON.stringify(body.allTasks)}\n日志：${JSON.stringify(body.dailyLogs)}`;

    const raw = await callDeepSeek(context.env, SYSTEM, userMsg, { temperature: 0.6, jsonMode: true });
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
