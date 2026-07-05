import { callDeepSeek, parseAIResponse } from '../_lib/deepseek';

const SYSTEM = `你是专业学习规划师。生成极其详细的4周学习计划JSON。

格式：{"weeks":[{"weekNumber":1,"theme":"","goals":[""],"tasks":[{"day":1,"tasks":[{"title":"","description":"必须详细：做什么、怎么做、用什么资源、什么标准算完成。至少35字","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning|afternoon"}]}]}]}

规则：每周7天每天2-5个任务；首任务热身，末任务小结；难度前低后高；描述具体可执行。`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const userMsg = `目标：${body.goal}\n每日${body.timePerDay}分钟\n难度${body.difficultyTolerance}/10\n风格：${body.learningStyles?.join('、')}\n约束：${body.constraints || '无'}\n上下午：${body.splitByHalfDay ? '是' : '否'}`;

    const raw = await callDeepSeek(context.env, SYSTEM, userMsg, { temperature: 0.8, maxTokens: 4096, jsonMode: true });
    const data = parseAIResponse(raw);

    return new Response(JSON.stringify({ success: true, weeks: data.weeks }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
