const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';
const WORKER_BASE = 'https://ai-education.y-study-ai.workers.dev/api/ai';

function getUserKey(): string | null {
  return localStorage.getItem('user_deepseek_key');
}

export function saveApiKey(key: string): void {
  localStorage.setItem('user_deepseek_key', key);
}

export function hasApiKey(): boolean {
  return !!getUserKey();
}

interface AIResult {
  success: boolean;
  error?: string;
  weeks?: any;
  message?: string;
  suggestions?: { label: string; action: string }[];
  overallAssessment?: string;
  recommendations?: string[];
}

async function callDeepSeek(
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const apiKey = getUserKey();
  if (!apiKey) throw new Error('NO_KEY');

  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}` },
    body: JSON.stringify({
      model: 'deepseek-chat',
      messages: [{ role: 'system', content: systemPrompt }, { role: 'user', content: userMessage }],
      temperature: options?.temperature ?? 0.7,
      max_tokens: options?.maxTokens ?? 4096,
      ...(options?.jsonMode ? { response_format: { type: 'json_object' } } : {}),
    }),
  });

  if (!res.ok) {
    const err = await res.text();
    const status = res.status;
    if (status === 401) {
      console.warn('[AI] DeepSeek 401 - API Key 无效，请去设置页更换 Key');
      throw new Error('API Key 无效，请去设置页重新填写');
    }
    throw new Error(`DeepSeek ${status}: ${err.slice(0, 100)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function callWorker(endpoint: string, body: Record<string, unknown>): Promise<AIResult> {
  try {
    const res = await fetch(`${WORKER_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    if (res.ok) {
      const json = await res.json();
      if (json.success) return json as AIResult;
    }
    return { success: false, error: 'Worker 响应异常' };
  } catch {
    return { success: false, error: 'AI 服务暂不可用' };
  }
}

function cleanJSON(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return s;
}

const GEN_PROMPT = `你是专业学习规划师。生成极其详细的4周学习计划JSON。

格式：{"weeks":[{"weekNumber":1,"theme":"","goals":[""],"tasks":[{"day":1,"tasks":[{"title":"","description":"必须详细：做什么、怎么做、用什么资源、什么标准算完成。至少35字","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning|afternoon"}]}]}]}

规则：每周7天每天2-5个任务，总时长不超可用时间；首任务热身，末任务小结；难度前低后高；描述必须具体可执行。`;

const COACH_PROMPT = `你是AI学习教练。简短温暖地给出反馈（2-3句）和可执行建议。返回JSON：{"message":"","suggestions":[{"label":"","action":"upgrade|split|reduce"}]}`;

const INSIGHT_PROMPT = `你是学习行为分析师。分析数据输出洞察JSON：{"overallAssessment":"","patterns":[{"type":"strength|weakness","description":"","suggestion":""}],"recommendations":[""]}`;

// ====== PUBLIC API ======

export async function aiGeneratePlan(params: {
  goal: string; timePerDay: number; difficultyTolerance: number;
  learningStyles: string[]; constraints: string; splitByHalfDay: boolean; startDate: string;
}): Promise<AIResult> {
  const userKey = getUserKey();
  const userMsg = `目标：${params.goal}\n每日${params.timePerDay}分钟\n难度${params.difficultyTolerance}/10\n风格：${params.learningStyles.join('、')}\n约束：${params.constraints || '无'}\n上下午：${params.splitByHalfDay ? '是' : '否'}`;

  if (userKey) {
    try {
      const raw = await callDeepSeek(GEN_PROMPT, userMsg, { temperature: 0.8, maxTokens: 4096, jsonMode: true });
      const data = JSON.parse(cleanJSON(raw));
      return { success: true, weeks: data.weeks };
    } catch (err: any) {
      return { success: false, error: err.message || '生成失败' };
    }
  }

  const workerRes = await callWorker('generate-plan', params as any);
  return workerRes;
}

export async function aiCoachChat(params: {
  stats: any; recentActions: any[];
}): Promise<AIResult> {
  const userKey = getUserKey();
  const userMsg = `数据：${JSON.stringify(params.stats)}\n动作：${JSON.stringify(params.recentActions)}`;

  if (userKey) {
    try {
      const raw = await callDeepSeek(COACH_PROMPT, userMsg, { temperature: 0.8, jsonMode: true });
      return { success: true, ...JSON.parse(cleanJSON(raw)) };
    } catch {
      return { success: false, error: '' };
    }
  }

  return callWorker('coach-chat', params as any);
}

export async function aiGetInsights(params: {
  allTasks: any[]; dailyLogs: any[];
}): Promise<AIResult> {
  const userKey = getUserKey();
  const userMsg = `任务：${JSON.stringify(params.allTasks)}\n日志：${JSON.stringify(params.dailyLogs)}`;

  if (userKey) {
    try {
      const raw = await callDeepSeek(INSIGHT_PROMPT, userMsg, { temperature: 0.6, jsonMode: true });
      return { success: true, ...JSON.parse(cleanJSON(raw)) };
    } catch {
      return { success: false, error: '' };
    }
  }

  return callWorker('insights', params as any);
}

export async function aiDecomposeTask(params: {
  taskTitle: string; taskDescription: string; estimatedMinutes: number;
}): Promise<AIResult> {
  const userKey = getUserKey();

  if (userKey) {
    try {
      const raw = await callDeepSeek(
        '把任务拆成3-5个可执行子任务。返回JSON：{"subtasks":[{"title":"","description":"","estimatedMinutes":30,"difficulty":2}]}',
        `拆解："${params.taskTitle}"。${params.taskDescription}。总时长${params.estimatedMinutes}min`,
        { temperature: 0.5, jsonMode: true }
      );
      return { success: true, ...JSON.parse(cleanJSON(raw)) };
    } catch {
      return { success: false, error: '' };
    }
  }

  return callWorker('decompose-task', params as any);
}
