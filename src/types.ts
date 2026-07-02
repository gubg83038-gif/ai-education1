export interface UserProfile {
  goal: string;
  timePerDay: number;
  difficultyTolerance: number;
  learningStyle: 'visual' | 'reading' | 'hands-on' | 'mixed';
  constraints: string;
  startDate: string;
}

export type TaskStatus = 'pending' | 'in_progress' | 'completed' | 'delayed' | 'skipped';

export interface Task {
  id: string;
  title: string;
  description: string;
  estimatedMinutes: number;
  difficulty: number;
  week: number;
  day: number;
  date: string;
  status: TaskStatus;
  category: string;
  actualMinutes?: number;
  completedAt?: string;
  delayedReason?: string;
  order: number;
  isCustom?: boolean;
}

export interface WeekPlan {
  weekNumber: number;
  theme: string;
  tasks: Task[];
  goals: string[];
}

export interface Plan {
  id: string;
  name: string;
  profile: UserProfile;
  weeks: WeekPlan[];
  createdAt: string;
}

export interface DailyLog {
  date: string;
  energyLevel: number;
  focusLevel: number;
  mood: string;
  notes: string;
  distractions: string[];
  completedTaskIds: string[];
}

export interface InsightReport {
  overallCompletion: number;
  weeklyTrend: { week: number; rate: number }[];
  peakPerformanceTime: string;
  procrastinationPatterns: {
    pattern: string;
    frequency: number;
    suggestion: string;
  }[];
  difficultyAnalysis: {
    level: number;
    completionRate: number;
    avgDelay: number;
  }[];
  recommendations: string[];
  cognitiveProfile: {
    bestTimeOfDay: string;
    optimalSessionLength: number;
    preferredTaskType: string;
    struggleAreas: string[];
  };
}

export interface AppState {
  plan: Plan | null;
  dailyLogs: DailyLog[];
  taskHistory: { taskId: string; fromStatus: TaskStatus; toStatus: TaskStatus; timestamp: string }[];
}

export interface UserAccount {
  id: string;
  username: string;
  passwordHash: string;
  plans: Plan[];
  dailyLogs: DailyLog[];
  taskHistory: { taskId: string; fromStatus: TaskStatus; toStatus: TaskStatus; timestamp: string }[];
  createdAt: string;
}

export interface AppData {
  users: UserAccount[];
  currentUserId: string | null;
}
