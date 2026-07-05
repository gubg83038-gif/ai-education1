import { deepseekChat } from './lib/deepseek';

interface Env {
  DEEPSEEK_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const SYSTEM_PROMPTS = {
  'generate-plan': `你是专业学习规划师。根据用户信息生成4周结构化学习计划。

返回严格JSON（不要markdown代码块）：
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "基础阶段",
      "goals": ["本周目标"],
      "tasks": [{ "day": 1, "tasks": [{ "title": "任务名", "description": "具体描述", "estimatedMinutes": 45, "difficulty": 3, "category": "阅读", "halfDay": "morning" }] }]
    }
  ]
}
规则：每周7天，每天2-5个任务；难度1-5前低后高；周三和周日穿插复习；任务具体可执行。`,

  'coach-chat': `你是AI学习教练。根据用户执行数据给出个性化反馈。
规则：简短温暖2-3句，基于数据不泛泛而谈。
返回JSON：{ "message": "教练回复", "suggestions": [{ "label": "按钮文字", "action": "upgrade|split|reduce" }] }`,

  'decompose-task': `你是任务拆解专家。把任务拆成3-5个可执行的子任务。
返回JSON：{ "subtasks": [{ "title": "", "description": "", "estimatedMinutes": number, "difficulty": 1-3 }] }`,

  'insights': `你是学习行为分析师。分析用户执行数据并输出洞察报告。
返回JSON：{ "overallAssessment": "总体评价", "patterns": [{ "type": "strength|weakness|pattern", "description": "", "suggestion": "" }], "recommendations": ["建议1"], "optimalSchedule": { "bestTimeOfDay": "上午|下午|晚间", "optimalSessionMinutes": 30, "suggestedDailyTasks": 3 } }`,
};

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    const path = url.pathname.replace('/api/ai/', '');

    if (request.method === 'OPTIONS') {
      return new Response(null, { headers: corsHeaders });
    }

    if (request.method !== 'POST') {
      return new Response(JSON.stringify({ success: false, error: 'Method not allowed' }), {
        status: 405, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    if (!(path in SYSTEM_PROMPTS)) {
      return new Response(JSON.stringify({ success: false, error: `Unknown endpoint: ${path}` }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body: Record<string, any> = await request.json();

      let userMessage: string;
      if (path === 'generate-plan') {
        userMessage = `目标：${body.goal}\n每日时间：${body.timePerDay}分钟\n难度承受：${body.difficultyTolerance}/10\n学习风格：${body.learningStyles?.join('、')}\n限制条件：${body.constraints || '无'}\n上下午拆分：${body.splitByHalfDay ? '是' : '否'}\n开始日期：${body.startDate}`;
      } else if (path === 'coach-chat') {
        userMessage = `执行数据：${JSON.stringify(body.stats)}\n近期动作：${JSON.stringify(body.recentActions)}`;
      } else if (path === 'decompose-task') {
        userMessage = `拆解："${body.taskTitle}"。描述：${body.taskDescription}。总时长约${body.estimatedMinutes}分钟。`;
      } else {
        userMessage = `任务数据：${JSON.stringify(body.allTasks?.slice(0, 50))}\n日志：${JSON.stringify(body.dailyLogs)}`;
      }

      const content = await deepseekChat(
        [
          { role: 'system', content: SYSTEM_PROMPTS[path as keyof typeof SYSTEM_PROMPTS] },
          { role: 'user', content: userMessage },
        ],
        env,
        { temperature: 0.7, jsonMode: true },
      );

      const data = JSON.parse(content);
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
