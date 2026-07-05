import { callDeepSeek, parseAIResponse } from '../_lib/deepseek';

const SYSTEM = `你是任务拆解专家。拆成3-5个子任务。返回JSON：{"subtasks":[{"title":"","description":"","estimatedMinutes":30,"difficulty":2}]}`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const userMsg = `拆解："${body.taskTitle}"。${body.taskDescription}。总时长${body.estimatedMinutes}min`;

    const raw = await callDeepSeek(context.env, SYSTEM, userMsg, { temperature: 0.5, jsonMode: true });
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
