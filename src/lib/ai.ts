import type { DailyLog } from '../types';

interface AIResult {
  success: boolean;
  error?: string;
  plan?: any;
  weeks?: any;
  message?: string;
  suggestions?: { label: string; action: string }[];
  subtasks?: { title: string; description: string; estimatedMinutes: number; difficulty: number }[];
  overallAssessment?: string;
  patterns?: { type: string; description: string; suggestion: string }[];
  recommendations?: string[];
  optimalSchedule?: { bestTimeOfDay: string; optimalSessionMinutes: number; suggestedDailyTasks: number };
}

const API_BASE = import.meta.env.PROD
  ? 'https://ai-education.odd-nectarine.workers.dev/api/ai'
  : '/api/ai';

async function postAI(endpoint: string, body: object): Promise<AIResult> {
  try {
    const res = await fetch(`${API_BASE}/${endpoint}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const json = await res.json();
    if (json.success) return json as AIResult;
    return { success: false, error: json.error || '未知错误' };
  } catch {
    return { success: false, error: 'API 不可用，请检查网络或稍后重试' };
  }
}

export async function aiGeneratePlan(params: {
  goal: string;
  timePerDay: number;
  difficultyTolerance: number;
  learningStyles: string[];
  constraints: string;
  splitByHalfDay: boolean;
  startDate: string;
}) {
  return postAI('generate-plan', params);
}

export async function aiCoachChat(params: {
  stats: Record<string, unknown>;
  recentActions: Record<string, unknown>[];
}) {
  return postAI('coach-chat', params);
}

export async function aiDecomposeTask(params: {
  taskTitle: string;
  taskDescription: string;
  estimatedMinutes: number;
}) {
  return postAI('decompose-task', params);
}

export async function aiGetInsights(params: {
  allTasks: Record<string, unknown>[];
  dailyLogs: DailyLog[];
}) {
  return postAI('insights', params);
}

