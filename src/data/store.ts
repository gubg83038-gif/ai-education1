import type { AppState, Plan, DailyLog, TaskStatus } from '../types';

const STORAGE_KEY = 'ai_education_plan';

export function loadState(): AppState {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { plan: null, dailyLogs: [], taskHistory: [] };
}

export function saveState(state: AppState): void {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

export function savePlan(plan: Plan): void {
  const state = loadState();
  state.plan = plan;
  saveState(state);
}

export function updateTaskStatus(taskId: string, newStatus: TaskStatus, reason?: string): Plan | null {
  const state = loadState();
  if (!state.plan) return null;

  const allTasks = state.plan.weeks.flatMap(w => w.tasks);
  const task = allTasks.find(t => t.id === taskId || t.id === `${taskId}_carry`);
  if (!task) return null;

  const fromStatus = task.status;
  task.status = newStatus;

  if (newStatus === 'completed') {
    task.completedAt = new Date().toISOString();
    task.actualMinutes = task.estimatedMinutes;
  }
  if (newStatus === 'delayed' && reason) {
    task.delayedReason = reason;
  }

  state.taskHistory.push({
    taskId,
    fromStatus,
    toStatus: newStatus,
    timestamp: new Date().toISOString(),
  });

  saveState(state);
  return state.plan;
}

export function saveDailyLog(log: DailyLog): void {
  const state = loadState();
  const existing = state.dailyLogs.findIndex(l => l.date === log.date);
  if (existing >= 0) {
    state.dailyLogs[existing] = log;
  } else {
    state.dailyLogs.push(log);
  }
  saveState(state);
}

export function getDailyLog(date: string): DailyLog | null {
  const state = loadState();
  return state.dailyLogs.find(l => l.date === date) || null;
}

export function clearPlan(): void {
  localStorage.removeItem(STORAGE_KEY);
}
