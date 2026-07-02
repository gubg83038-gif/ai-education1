import type { AppData, UserAccount, Plan, DailyLog, TaskStatus } from '../types';

const DATA_KEY = 'ai_education_data';

function loadData(): AppData {
  try {
    const raw = localStorage.getItem(DATA_KEY);
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return { users: [], currentUserId: null };
}

function saveData(data: AppData): void {
  localStorage.setItem(DATA_KEY, JSON.stringify(data));
}

function hashSimple(str: string): string {
  let hash = 0;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash |= 0;
  }
  return 'h_' + Math.abs(hash).toString(36);
}

export function register(username: string, password: string): UserAccount | null {
  const data = loadData();
  if (data.users.find(u => u.username === username)) return null;

  const user: UserAccount = {
    id: 'u_' + Date.now(),
    username,
    passwordHash: hashSimple(password),
    plans: [],
    dailyLogs: [],
    taskHistory: [],
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  data.currentUserId = user.id;
  saveData(data);
  return user;
}

export function login(username: string, password: string): UserAccount | null {
  const data = loadData();
  const user = data.users.find(u => u.username === username && u.passwordHash === hashSimple(password));
  if (!user) return null;

  data.currentUserId = user.id;
  saveData(data);
  return user;
}

export function logout(): void {
  const data = loadData();
  data.currentUserId = null;
  saveData(data);
}

export function getCurrentUser(): UserAccount | null {
  const data = loadData();
  if (!data.currentUserId) return null;
  return data.users.find(u => u.id === data.currentUserId) || null;
}

export function updateUserPlans(plans: Plan[]): void {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return;
  user.plans = plans;
  saveData(data);
}

export function addPlan(plan: Plan): void {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return;
  user.plans.push(plan);
  saveData(data);
}

export function updatePlan(planId: string, plan: Plan): void {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return;
  const idx = user.plans.findIndex(p => p.id === planId);
  if (idx >= 0) user.plans[idx] = plan;
  saveData(data);
}

export function deletePlan(planId: string): void {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return;
  user.plans = user.plans.filter(p => p.id !== planId);
  saveData(data);
}

export function getPlans(): Plan[] {
  const user = getCurrentUser();
  return user?.plans || [];
}

export function getPlan(planId: string): Plan | null {
  const user = getCurrentUser();
  return user?.plans.find(p => p.id === planId) || null;
}

export function addTaskToPlan(planId: string, task: import('../types').Task): Plan | null {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return null;
  const plan = user.plans.find(p => p.id === planId);
  if (!plan) return null;
  const week = plan.weeks.find(w => w.weekNumber === task.week);
  if (!week) return null;
  week.tasks.push(task);
  saveData(data);
  return plan;
}

export function updateTaskInPlan(planId: string, taskId: string, updates: Partial<import('../types').Task>): Plan | null {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return null;
  const plan = user.plans.find(p => p.id === planId);
  if (!plan) return null;
  for (const week of plan.weeks) {
    const task = week.tasks.find(t => t.id === taskId);
    if (task) {
      Object.assign(task, updates);
      saveData(data);
      return plan;
    }
  }
  return plan;
}

export function deleteTaskFromPlan(planId: string, taskId: string): Plan | null {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return null;
  const plan = user.plans.find(p => p.id === planId);
  if (!plan) return null;
  for (const week of plan.weeks) {
    week.tasks = week.tasks.filter(t => t.id !== taskId);
  }
  saveData(data);
  return plan;
}

export function updateTaskStatus(planId: string, taskId: string, newStatus: TaskStatus, reason?: string): Plan | null {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return null;
  const plan = user.plans.find(p => p.id === planId);
  if (!plan) return null;

  const allTasks = plan.weeks.flatMap(w => w.tasks);
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

  user.taskHistory.push({
    taskId,
    fromStatus,
    toStatus: newStatus,
    timestamp: new Date().toISOString(),
  });

  saveData(data);
  return plan;
}

export function getDailyLogs(): DailyLog[] {
  const user = getCurrentUser();
  return user?.dailyLogs || [];
}

export function saveDailyLog(log: DailyLog): void {
  const data = loadData();
  const user = data.users.find(u => u.id === data.currentUserId);
  if (!user) return;
  const existing = user.dailyLogs.findIndex(l => l.date === log.date);
  if (existing >= 0) {
    user.dailyLogs[existing] = log;
  } else {
    user.dailyLogs.push(log);
  }
  saveData(data);
}

export function getDailyLog(date: string): DailyLog | null {
  const logs = getDailyLogs();
  return logs.find(l => l.date === date) || null;
}

// Legacy support - migrate old single-plan data
export function loadState() {
  try {
    const raw = localStorage.getItem('ai_education_plan');
    if (raw) return JSON.parse(raw);
  } catch { /* ignore */ }
  return null;
}

export function migrateLegacyData(): boolean {
  const legacy = loadState();
  if (!legacy || !legacy.plan) return false;
  const data = loadData();
  if (data.users.length > 0) return false;

  const user: UserAccount = {
    id: 'u_legacy',
    username: '默认用户',
    passwordHash: hashSimple('admin'),
    plans: [{ ...legacy.plan, name: '我的计划' }],
    dailyLogs: legacy.dailyLogs || [],
    taskHistory: legacy.taskHistory || [],
    createdAt: new Date().toISOString(),
  };

  data.users.push(user);
  data.currentUserId = user.id;
  saveData(data);
  localStorage.removeItem('ai_education_plan');
  return true;
}
