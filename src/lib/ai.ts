const DEEPSEEK_URL = 'https://api.deepseek.com/v1/chat/completions';

interface AIResult {
  success: boolean;
  error?: string;
  weeks?: any;
  message?: string;
  suggestions?: { label: string; action: string }[];
  overallAssessment?: string;
  recommendations?: string[];
  subtasks?: { title: string; description: string; estimatedMinutes: number; difficulty: number }[];
}

let cachedKey: string | null = null;

async function getProxyKey(): Promise<string | null> {
  if (cachedKey) return cachedKey;
  try {
    const res = await fetch('/api/ai/proxy-key', { method: 'POST' });
    if (res.ok) {
      const data = await res.json();
      if (data.success && data.key) {
        cachedKey = data.key;
        return data.key;
      }
    }
  } catch {}
  return null;
}

function cleanJSON(raw: string): string {
  let s = raw.trim();
  if (s.startsWith('```')) s = s.replace(/^```(?:json)?\s*/i, '').replace(/\s*```$/, '');
  return s;
}

async function callDeepSeekDirect(
  key: string,
  systemPrompt: string,
  userMessage: string,
  options?: { temperature?: number; maxTokens?: number; jsonMode?: boolean }
): Promise<string> {
  const res = await fetch(DEEPSEEK_URL, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${key}` },
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
    throw new Error(`DeepSeek ${res.status}: ${err.slice(0, 100)}`);
  }

  const data = await res.json();
  return data.choices[0].message.content;
}

async function postAI(endpoint: string, body: Record<string, unknown>): Promise<AIResult> {
  try {
    const res = await fetch(`/api/ai/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.success) return json as AIResult;
    return { success: false, error: json.error || '服务异常' };
  } catch {
    return { success: false, error: 'AI 服务不可用' };
  }
}

const GEN_PROMPT = `你是专业学习规划师。根据用户目标生成完整的2周学习计划JSON。

格式：{"weeks":[{"weekNumber":1,"theme":"基础搭建","goals":["本周可量化目标"],"tasks":[{"day":1,"tasks":[{"title":"","description":"至少50字：做什么+用什么资源+完成标准","estimatedMinutes":45,"difficulty":3,"category":"阅读|练习|实践|观看|整理|输出|复习","halfDay":"morning|afternoon"}]}]},{"weekNumber":2,"theme":"综合实践","goals":[""],"tasks":[...]}]}

description 严格要求：
- 至少50字，包含3要素：1)具体做什么 2)工具/书籍/资源 3)可量化完成标准
- 禁止模糊词如"学习XX基础""了解XX概念"
- 正确示例："阅读《Python编程》第4-5章if语句和字典，在Jupyter完成课后5道练习题，能独立写判断成绩的程序并运行通过"
- 每个任务的description必须独一无二

规则：每周7天每天2-3个任务（不超可用时间）；首任务热身末任务小结；第1周难度1-3为主，第2周3-5为主；周三复习周日回顾`;

const COACH_PROMPT = `你是AI学习教练。简短温暖2-3句反馈，给可执行建议。返回JSON：{"message":"","suggestions":[{"label":"","action":"upgrade|split|reduce"}]}`;

const INSIGHT_PROMPT = `你是学习行为分析师。输出洞察JSON：{"overallAssessment":"","patterns":[{"type":"strength|weakness","description":"","suggestion":""}],"recommendations":[""]}`;

// ====== PUBLIC API ======

export async function aiGeneratePlan(params: {
  goal: string; timePerDay: number; difficultyTolerance: number;
  learningStyles: string[]; constraints: string; splitByHalfDay: boolean; startDate: string;
}): Promise<AIResult> {
  const userMsg = `用户目标：${params.goal}\n每日${params.timePerDay}分钟\n难度承受：${params.difficultyTolerance}/10\n偏好风格：${params.learningStyles?.join('、')}\n约束条件：${params.constraints || '无'}\n上下午拆分：${params.splitByHalfDay ? '是' : '否'}`;

  // 1) 尝试拿代理 Key → 浏览器直调（无超时）
  const key = await getProxyKey();
  if (key) {
    try {
      const raw = await callDeepSeekDirect(key, GEN_PROMPT, userMsg, { temperature: 0.8, maxTokens: 8192, jsonMode: true });
      const data = JSON.parse(cleanJSON(raw));
      return { success: true, weeks: data.weeks };
    } catch (err: any) {
      return { success: false, error: err.message || 'AI 生成失败' };
    }
  }

  // 2) 代理 Key 不可用 → Pages Function 兜底
  return postAI('generate-plan', params as any);
}

export async function aiCoachChat(params: {
  stats: any; recentActions: any[];
}): Promise<AIResult> {
  const userMsg = `数据：${JSON.stringify(params.stats)}\n动作：${JSON.stringify(params.recentActions)}`;

  const key = await getProxyKey();
  if (key) {
    try {
      const raw = await callDeepSeekDirect(key, COACH_PROMPT, userMsg, { temperature: 0.8, jsonMode: true });
      return { success: true, ...JSON.parse(cleanJSON(raw)) };
    } catch {}
  }

  return postAI('coach-chat', params as any);
}

export async function aiGetInsights(params: {
  allTasks: any[]; dailyLogs: any[];
}): Promise<AIResult> {
  const userMsg = `任务：${JSON.stringify(params.allTasks)}\n日志：${JSON.stringify(params.dailyLogs)}`;

  const key = await getProxyKey();
  if (key) {
    try {
      const raw = await callDeepSeekDirect(key, INSIGHT_PROMPT, userMsg, { temperature: 0.6, jsonMode: true });
      return { success: true, ...JSON.parse(cleanJSON(raw)) };
    } catch {}
  }

  return postAI('insights', params as any);
}

export async function aiDecomposeTask(params: {
  taskTitle: string; taskDescription: string; estimatedMinutes: number;
}): Promise<AIResult> {
  return postAI('decompose-task', params as any);
}

export async function testAIConnection(): Promise<boolean> {
  const key = await getProxyKey();
  if (!key) return false;
  try {
    const raw = await callDeepSeekDirect(key, '回复OK', '', { maxTokens: 5 });
    return raw.includes('OK');
  } catch {
    return false;
  }
}
