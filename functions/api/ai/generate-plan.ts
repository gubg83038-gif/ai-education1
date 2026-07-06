import { callDeepSeek, parseAIResponse } from '../../lib/deepseek';

const SYSTEM = `你是专业学习规划师。根据用户目标生成详细的4周学习计划JSON。

格式：{"weeks":[{"weekNumber":1,"theme":"","goals":[""],"tasks":[{"day":1,"tasks":[{"title":"","description":"","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning|afternoon"}]}]}]}

description 严格要求：
- 至少50字，必须包含3要素：1)具体做什么 2)用什么工具/书籍/资源 3)可量化完成标准
- 禁止："学习XX基础""了解XX概念""掌握XX"等笼统描述
- 正确示例："阅读《Python编程：从入门到实践》第4章if语句，在Jupyter中完成课后5道练习题，能独立写出判断成绩等级的程序并运行通过"
- 每个任务的description必须独一无二，不可与其他天重复

规则：
- 每周7天每天2-5个任务（总时长不超每日可用时间）
- 每天首任务：低难度热身（5-10分钟）
- 每天末任务：今日小结（写3-5条要点，5分钟）
- 难度1-5：前两周1-3为主，后两周3-5为主
- 周三穿插知识整理复习，周日安排本周回顾`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const userMsg = `用户目标：${body.goal}\n每日${body.timePerDay}分钟\n难度承受：${body.difficultyTolerance}/10\n偏好风格：${body.learningStyles?.join('、')}\n约束条件：${body.constraints || '无'}\n上下午拆分：${body.splitByHalfDay ? '是' : '否'}`;

    const raw = await callDeepSeek(context.env, SYSTEM, userMsg, { temperature: 0.8, maxTokens: 3072, jsonMode: true });
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
