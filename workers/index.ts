import { deepseekChat } from './lib/deepseek';

interface Env {
  DEEPSEEK_API_KEY: string;
}

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type',
};

const PROMPTS: Record<string, string> = {
  'generate-plan': `你是学习规划师。生成4周学习计划JSON：{"weeks":[{"weekNumber":1,"theme":"","goals":[""],"tasks":[{"day":1,"tasks":[{"title":"","description":"具体描述（做什么、怎么做、完成标准，25-40字）","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning"}]}]}]}`,

  'coach-chat': `你是AI学习教练。简短回复2-3句并给建议。返回JSON：{"message":"","suggestions":[{"label":"","action":"upgrade|split|reduce"}]}`,

  'decompose-task': `你是任务拆解专家。拆成3-5个子任务。返回JSON：{"subtasks":[{"title":"","description":"","estimatedMinutes":30,"difficulty":2}]}`,

  'insights': `你是学习分析师。输出洞察JSON：{"overallAssessment":"","patterns":[{"type":"strength|weakness","description":"","suggestion":""}],"recommendations":[""]}`,
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

    if (!(path in PROMPTS)) {
      return new Response(JSON.stringify({ success: false, error: 'Unknown endpoint' }), {
        status: 404, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }

    try {
      const body: Record<string, any> = await request.json();
      let userMsg: string;

      if (path === 'generate-plan') {
        userMsg = `目标${body.goal} 每日${body.timePerDay}分钟 难度${body.difficultyTolerance}/10 风格${body.learningStyles?.join('、')} ${body.splitByHalfDay?'上下午拆分':''}`;
      } else if (path === 'coach-chat') {
        userMsg = `数据${JSON.stringify(body.stats)} 动作${JSON.stringify(body.recentActions)}`;
      } else if (path === 'decompose-task') {
        userMsg = `拆解"${body.taskTitle}" ${body.taskDescription} 总${body.estimatedMinutes}min`;
      } else {
        userMsg = `任务${JSON.stringify(body.allTasks)} 日志${JSON.stringify(body.dailyLogs)}`;
      }

      const content = await deepseekChat(
        [
          { role: 'system', content: PROMPTS[path] },
          { role: 'user', content: userMsg },
        ],
        env,
        { temperature: 0.7, jsonMode: true, maxTokens: path === 'generate-plan' ? 2048 : 4096 },
      );

      let cleaned = content.trim();
      if (cleaned.startsWith('```')) cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
      const data = JSON.parse(cleaned);
      return new Response(JSON.stringify({ success: true, ...data }), {
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    } catch (err: any) {
      return new Response(JSON.stringify({ success: false, error: err?.message || 'Server error' }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
