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
  'generate-plan': `你是资深学习规划师。根据用户信息生成详细的4周学习计划JSON。

格式：{"weeks":[{"weekNumber":1,"theme":"主题","goals":["可量化目标"],"tasks":[{"day":1,"tasks":[{"title":"任务","description":"具体描述（含做什么、怎么做、完成标准，20-40字）","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning"}]}]}]}

规则：每周7天每天2-5个任务；难度1-5前两周偏低后两周递增；每天首任务为低难度热身；末任务为5-10分钟今日小结；周三穿插整理复习；周日安排本周回顾；描述务必具体可执行；总时长不超每日可用时间。`,


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
        userMessage = `请为以下用户生成极其详细的4周学习计划：

学习目标：${body.goal}
计划名称：${body.planName || ''}
每日可用时间：${body.timePerDay}分钟
难度承受力：${body.difficultyTolerance}/10
学习风格偏好：${body.learningStyles?.join('、')}
限制条件：${body.constraints || '无'}
上下午拆分计划：${body.splitByHalfDay ? '是' : '否'}
计划开始日期：${body.startDate}

要求：
- 每个任务的描述必须包含具体动作、推荐资源和完成标准
- 任务安排要合理利用用户的可用时间和学习风格
- 如果是上下午拆分，上午安排重点学习任务，下午安排练习和复习
- 每天第一个任务是热身任务（低难度），最后一个任务是今日小结（5-10分钟写总结）
- 请务必基于用户的实际目标来定制详细内容，不要泛泛而谈`;
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
        { temperature: isGeneratePlan ? 0.8 : 0.7, jsonMode: true, maxTokens: isGeneratePlan ? 3072 : 4096 },
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
      return new Response(JSON.stringify({ success: false, error: err.message }), {
        status: 500, headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      });
    }
  },
};
