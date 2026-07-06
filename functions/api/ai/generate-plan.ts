import { callDeepSeek, parseAIResponse } from '../../lib/deepseek';

const SYSTEM = `你是专业学习规划师。根据用户目标生成完整的2周学习计划JSON。

格式：{"weeks":[{"weekNumber":1,"theme":"基础搭建","goals":["本周可量化目标"],"tasks":[{"day":1,"tasks":[{"title":"","description":"至少50字：做什么+用什么资源+完成标准","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning|afternoon"}]}]},{"weekNumber":2,"theme":"综合实践","goals":[""],"tasks":[{"day":1,"tasks":[...]}]}]}

description 严格要求：
- 至少50字，包含3要素：1)具体做什么 2)工具/书籍/资源 3)可量化完成标准
- 禁止模糊词如"学习XX基础""了解XX概念"
- 正确示例："阅读《Python编程》第4-5章if语句和字典，在Jupyter完成课后5道练习题，能独立写判断成绩的程序并运行通过"
- 每个任务的description必须独一无二

规则：
- 每周7天，每天2-3个任务（总时长不超可用时间）
- 每天首任务：低难度热身（5-10分钟）
- 每天末任务：今日小结（写3-5条要点，5分钟）
- 第1周难度1-3为主，第2周难度3-5为主
- 周三穿插知识整理复习，周日做本周回顾`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const userMsg = `用户目标：${body.goal}\n每日${body.timePerDay}分钟\n难度承受：${body.difficultyTolerance}/10\n偏好风格：${body.learningStyles?.join('、')}\n约束条件：${body.constraints || '无'}\n上下午拆分：${body.splitByHalfDay ? '是' : '否'}`;

    const raw = await callDeepSeek(context.env, SYSTEM, userMsg, { temperature: 0.8, maxTokens: 4096, jsonMode: true });
    const data = parseAIResponse(raw);

    return new Response(JSON.stringify({ success: true, weeks: data.weeks }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    console.error('[generate-plan]', err.message);
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
