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

async function postAI(endpoint: string, body: Record<string, unknown>): Promise<AIResult> {
  try {
    const res = await fetch(`/api/ai/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (res.status === 500) {
      return { success: false, error: 'AI 服务繁忙，请稍后重试（可能是网络延迟或请求超时）' };
    }

    const json = await res.json();
    if (json.success) return json as AIResult;
    return { success: false, error: json.error || 'AI 响应异常' };
  } catch {
    return { success: false, error: '网络连接失败，请检查网络后重试' };
  }
}

export async function aiGeneratePlan(params: {
  goal: string; timePerDay: number; difficultyTolerance: number;
  learningStyles: string[]; constraints: string; splitByHalfDay: boolean; startDate: string;
}): Promise<AIResult> {
  return postAI('generate-plan', params as any);
}

export async function aiCoachChat(params: {
  stats: any; recentActions: any[];
}): Promise<AIResult> {
  return postAI('coach-chat', params as any);
}

export async function aiGetInsights(params: {
  allTasks: any[]; dailyLogs: any[];
}): Promise<AIResult> {
  return postAI('insights', params as any);
}

export async function aiDecomposeTask(params: {
  taskTitle: string; taskDescription: string; estimatedMinutes: number;
}): Promise<AIResult> {
  return postAI('decompose-task', params as any);
}

export async function testAIConnection(): Promise<boolean> {
  const res = await aiCoachChat({ stats: { test: 1 }, recentActions: [] });
  return res.success;
}
