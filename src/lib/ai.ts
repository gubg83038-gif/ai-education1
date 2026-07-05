const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

function getApiKey(): string | null {
  return localStorage.getItem('user_deepseek_key');
}

export function saveApiKey(key: string): void {
  localStorage.setItem('user_deepseek_key', key);
}

export function hasApiKey(): boolean {
  return !!getApiKey();
}

interface AIResult {
  success: boolean;
  error?: string;
  weeks?: any;
  message?: string;
  suggestions?: { label: string; action: string }[];
  subtasks?: { title: string; description: string; estimatedMinutes: number; difficulty: number }[];
  overallAssessment?: string;
  patterns?: { type: string; description: string; suggestion: string }[];
  recommendations?: string[];
}

async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const apiKey = getApiKey();
  if (!apiKey) throw new Error('请先在设置中填写 DeepSeek API Key');

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
    },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userMessage },
      ],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const errText = await res.text();
    throw new Error(`API ${res.status}: ${errText.slice(0, 200)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function postAI(endpoint: string, body: object): Promise<AIResult> {
  try {
    const res = await fetch(`/api/ai/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json as AIResult;
    }
  } catch {}

  try {
    const res = await fetch(`https://ai-education.y-study-ai.workers.dev/api/ai/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json as AIResult;
    }
  } catch {}

  return { success: false, error: '服务不可用' };
}

const GEN_SYSTEM = `你是专业学习规划师。你必须生成非常详细的4周学习计划。

返回JSON格式：
{
  "weeks": [
    {
      "weekNumber": 1,
      "theme": "阶段主题（4字）",
      "goals": ["可量化目标"],
      "tasks": [
        {
          "day": 1,
          "tasks": [
            {
              "title": "具体任务名",
              "description": "必须详细说明：1)具体做什么 2)怎么做/用什么资源 3)做到什么程度算完成。至少40字，必须包含可执行的动作",
              "estimatedMinutes": 45,
              "difficulty": 3,
              "category": "阅读|练习|实践|观看|整理|输出|复习",
              "halfDay": "morning|afternoon"
            }
          ]
        }
      ]
    }
  ]
}

严格要求：
- 每个任务描述至少40字，必须具体到"学习XX教程的第X章""完成X道XX类型的练习题""写一篇XX字的XX""用XX工具完成XX功能"
- 不要说"学习Python基础"，要说"阅读《Python编程从入门到实践》第1-2章，完成每章课后练习，能解释变量和数据类型的概念"
- 每天2-5个任务，首任务为低难度热身，末任务为5-10分钟的今日小结
- 难度1-5，前两周偏低后两周递增
- 每周三穿插复习整理，周日做本周回顾
- 上下午拆分时halfDay填morning或afternoon`;

export async function aiGeneratePlanDirect(params: {
  goal: string;
  timePerDay: number;
  difficultyTolerance: number;
  learningStyles: string[];
  constraints: string;
  splitByHalfDay: boolean;
  startDate: string;
}): Promise<AIResult> {
  try {
    const userMsg = `目标：${params.goal}\n每日${params.timePerDay}分钟\n难度承受：${params.difficultyTolerance}/10\n学习风格：${params.learningStyles.join('、')}\n限制：${params.constraints || '无'}\n上下午拆分：${params.splitByHalfDay ? '是' : '否'}\n开始日期：${params.startDate}`;

    const content = await callDeepSeek(GEN_SYSTEM, userMsg, { temperature: 0.8, maxTokens: 4096, jsonMode: true });
    
    let cleaned = content.trim();
    if (cleaned.startsWith('```')) {
      cleaned = cleaned.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
    }
    const data = JSON.parse(cleaned);
    return { success: true, weeks: data.weeks };
  } catch (err: any) {
    return { success: false, error: err.message || '生成失败' };
  }
}

export async function aiCoachChatDirect(params: {
  stats: any;
  recentActions: any[];
}): Promise<AIResult> {
  try {
    const content = await callDeepSeek(
      `你是AI学习教练。简短温暖地给出反馈（2-3句）和可执行建议。返回JSON：{"message":"","suggestions":[{"label":"","action":"upgrade|split|reduce"}]}`,
      `数据：${JSON.stringify(params.stats)}\n动作：${JSON.stringify(params.recentActions)}`,
      { temperature: 0.8, jsonMode: true }
    );
    return { success: true, ...JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function aiGetInsightsDirect(params: {
  allTasks: any[];
  dailyLogs: any[];
}): Promise<AIResult> {
  try {
    const content = await callDeepSeek(
      `你是学习行为分析师。分析数据输出洞察JSON：{"overallAssessment":"","patterns":[{"type":"strength|weakness","description":"","suggestion":""}],"recommendations":[""]}`,
      `任务：${JSON.stringify(params.allTasks)}\n日志：${JSON.stringify(params.dailyLogs)}`,
      { temperature: 0.6, jsonMode: true }
    );
    return { success: true, ...JSON.parse(content.trim().replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '')) };
  } catch (err: any) {
    return { success: false, error: err.message };
  }
}

export async function aiGeneratePlan(params: {
  goal: string; timePerDay: number; difficultyTolerance: number;
  learningStyles: string[]; constraints: string; splitByHalfDay: boolean; startDate: string;
}): Promise<AIResult> {
  // Try direct first (if user has API key)
  const direct = await aiGeneratePlanDirect(params);
  if (direct.success) return direct;

  // Fall back to Worker proxy
  return postAI('generate-plan', params);
}

export async function aiCoachChat(params: {
  stats: any;
  recentActions: any[];
}): Promise<AIResult> {
  const direct = await aiCoachChatDirect(params);
  if (direct.success) return direct;
  return postAI('coach-chat', params);
}

export async function aiGetInsights(params: {
  allTasks: any[];
  dailyLogs: any[];
}): Promise<AIResult> {
  const direct = await aiGetInsightsDirect(params);
  if (direct.success) return direct;
  return postAI('insights', params);
}

export async function aiDecomposeTask(params: {
  taskTitle: string; taskDescription: string; estimatedMinutes: number;
}): Promise<AIResult> {
  return postAI('decompose-task', params);
}

export async function aiRegeneratePlan(profile: {
  goal: string; timePerDay: number; difficultyTolerance: number;
  learningStyles: string[]; constraints: string; splitByHalfDay: boolean; startDate: string;
}): Promise<AIResult> {
  return aiGeneratePlan(profile);
}
