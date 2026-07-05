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
  'generate-plan': `生成一个4周学习计划的JSON，格式：{"weeks":[{"weekNumber":1,"theme":"","goals":[""],"tasks":[{"day":1,"tasks":[{"title":"","description":"","estimatedMinutes":30,"difficulty":2,"category":"阅读"}]}]}]}。每天2-3个任务。`,


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
        userMessage = `目标：${body.goal}\n每日${body.timePerDay}分钟\n难度承受${body.difficultyTolerance}/10\n风格：${body.learningStyles?.join('、')}\n约束：${body.constraints || '无'}\n上下午：${body.splitByHalfDay ? '是' : '否'}`;
      } else if (path === 'coach-chat') {
        userMessage = `执行数据：${JSON.stringify(body.stats)}\n近期动作：${JSON.stringify(body.recentActions)}`;
      } else if (path === 'decompose-task') {
        userMessage = `拆解："${body.taskTitle}"。描述：${body.taskDescription}。总时长约${body.estimatedMinutes}分钟。`;
      } else {
        userMessage = `任务数据：${JSON.stringify(body.allTasks?.slice(0, 50))}\n日志：${JSON.stringify(body.dailyLogs)}`;
      }

      const isGeneratePlan = path === 'generate-plan';
      const content = await deepseekChat(
        [
          { role: 'system', content: SYSTEM_PROMPTS[path as keyof typeof SYSTEM_PROMPTS] },
          { role: 'user', content: userMessage },
        ],
        env,
        { temperature: 0.8, jsonMode: true, maxTokens: 4096 },
      );

      // Handle markdown-wrapped JSON from DeepSeek
      let cleaned = content.trim();
      if (cleaned.startsWith('```')) {
        cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      }
      const data = JSON.parse(cleaned);
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err?.message || err?.toString() || 'Unknown error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
