import { callDeepSeek, parseAIResponse } from '../../lib/deepseek';

const WEEK_SYSTEM = (weekNum: number, totalWeeks: number) => `你是学习规划师。只生成第${weekNum}周（共${totalWeeks}周）的${weekNum === 1 ? '基础搭建' : weekNum === 2 ? '深入探索' : weekNum === 3 ? '综合实践' : '巩固突破'}阶段计划JSON。

格式：{"week":{"weekNumber":${weekNum},"theme":"","goals":["本周可量化目标"],"tasks":[{"day":1,"tasks":[{"title":"","description":"至少50字：做什么+用什么资源+完成标准","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning|afternoon"}]}]}}

description 严格要求：
- 至少50字，包含3要素：1)具体做什么 2)工具/书籍/资源 3)可量化完成标准
- 禁止模糊词如"学习XX基础""了解XX概念"
- 正确示例："阅读《Python编程》第4-5章if语句和字典，在Jupyter完成课后5道练习题，能独立写判断成绩的程序并运行通过"
- 每个任务的description必须独一无二

规则：7天每天2-5个任务（总时长不超可用时间）；首任务热身，末任务小结；难度1-5（前两周1-3为主，后两周3-5为主）；周三穿插复习，周日做本周回顾`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const baseInfo = `目标：${body.goal}\n每日${body.timePerDay}分钟\n难度${body.difficultyTolerance}/10\n风格：${body.learningStyles?.join('、')}\n约束：${body.constraints || '无'}\n上下午拆分：${body.splitByHalfDay ? '是' : '否'}`;

    const weeks: any[] = [];
    for (let w = 1; w <= 4; w++) {
      const userMsg = `${baseInfo}\n\n请只生成第${w}周的计划。`;
      try {
        const raw = await callDeepSeek(context.env, WEEK_SYSTEM(w, 4), userMsg, { temperature: 0.8, maxTokens: 1024, jsonMode: true });
        const data = parseAIResponse(raw);
        weeks.push(data.week || { weekNumber: w, theme: '学习阶段', goals: [], tasks: [] });
      } catch (err: any) {
        weeks.push({ weekNumber: w, theme: '阶段 ' + w, goals: ['本周目标'], tasks: [], _error: err.message });
      }
    }

    return new Response(JSON.stringify({ success: true, weeks }), {
      headers: { 'Content-Type': 'application/json' },
    });
  } catch (err: any) {
    return new Response(JSON.stringify({ success: false, error: err.message }), {
      status: 500, headers: { 'Content-Type': 'application/json' },
    });
  }
}
