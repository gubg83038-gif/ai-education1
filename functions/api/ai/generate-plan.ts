import { callDeepSeek, parseAIResponse } from '../../lib/deepseek';

const SYSTEM = `你是专业学习规划师，必须生成极其详细的4周学习计划JSON。

格式：{"weeks":[{"weekNumber":1,"theme":"","goals":[""],"tasks":[{"day":1,"tasks":[{"title":"","description":"","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning|afternoon"}]}]}]}

description要求（非常重要）：
- 至少50字，必须包含：1)具体做什么 2)用什么工具/书籍/教程/资源 3)怎么判断完成（可量化标准）
- 错误示例："学习Python基础"（太笼统）
- 正确示例："阅读《Python编程：从入门到实践》第4-5章if语句和字典部分，在Jupyter Notebook中完成每章课后5道练习题，能独立写出判断成绩等级的程序"
规则：
- 每周7天每天2-5个任务，总时长不超过用户每日可用时间
- 首任务为低难度热身（5-10分钟），末任务为今日小结（写3-5条笔记）
- 难度1-5自然递增，前两周1-3为主，后两周3-5为主
- 周三穿插知识整理复习，周日安排本周回顾
- 每个description必须独一无二，不能复制粘贴
- 任务具体到章节、题号、页数等层级`;

export async function onRequest(context: any) {
  if (context.request.method !== 'POST') {
    return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
      status: 405, headers: { 'Content-Type': 'application/json' },
    });
  }

  try {
    const body = await context.request.json();
    const userMsg = `目标：${body.goal}\n每日${body.timePerDay}分钟\n难度${body.difficultyTolerance}/10\n风格：${body.learningStyles?.join('、')}\n约束：${body.constraints || '无'}\n上下午：${body.splitByHalfDay ? '是' : '否'}`;

    const raw = await callDeepSeek(context.env, SYSTEM, userMsg, { temperature: 0.8, maxTokens: 8192, jsonMode: true });
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
