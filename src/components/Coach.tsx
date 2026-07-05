import { useMemo, useState, useEffect } from 'react';
import type { Plan, Task } from '../types';
import { Sparkles, ArrowRight, Brain, AlertTriangle } from 'lucide-react';
import { aiCoachChat } from '../lib/ai';

interface CoachProps {
  plan: Plan;
  recentlyChanged: Task[];
  onAction: (action: string) => void;
}

export function CoachReview({ plan, recentlyChanged, onAction }: CoachProps) {
  const [aiMsg, setAiMsg] = useState<string[]>([]);
  const [aiSuggestions, setAiSuggestions] = useState<{ label: string; action: string }[]>([]);
  const [aiLoading, setAiLoading] = useState(false);

  const allTasks = plan.weeks.flatMap(w => w.tasks);
  const completedToday = recentlyChanged.filter(t => t.status === 'completed');
  const delayedToday = recentlyChanged.filter(t => t.status === 'delayed');
  const totalCompleted = allTasks.filter(t => t.status === 'completed').length;
  const rate = allTasks.length > 0 ? Math.round((totalCompleted / allTasks.length) * 100) : 0;

  // Try AI coach first, fallback to rules
  useEffect(() => {
    if (recentlyChanged.length === 0) return;
    setAiLoading(true);
    aiCoachChat({
      stats: { totalTasks: allTasks.length, completedCount: totalCompleted, rate, totalWeeks: plan.weeks.length },
      recentActions: recentlyChanged.slice(-5).map(t => ({ title: t.title, status: t.status, delayedReason: t.delayedReason })),
    }).then(res => {
      setAiLoading(false);
      if (res.success && res.message) {
        setAiMsg([res.message]);
        setAiSuggestions(res.suggestions || []);
      }
    });
  }, [recentlyChanged.length]);

  const messages: string[] = aiMsg.length > 0 ? aiMsg : [];
  const suggestions: { label: string; action: string }[] = aiSuggestions.length > 0 ? aiSuggestions : [];

  // Fallback rules when AI is not available
  if (!aiLoading && aiMsg.length === 0) {

  if (completedToday.length >= 3) {
    messages.push('今天效率爆表！已经完成了' + completedToday.length + '个任务，这股势头很棒。');
    suggestions.push({ label: '挑战更高难度', action: 'upgrade' });
  } else if (completedToday.length === 1) {
    messages.push('完成了一个任务，小步快跑也是进步。接下来想尝试哪一个？');
  }

  if (delayedToday.length > 0) {
    const reasons = delayedToday.map(t => t.delayedReason).filter(Boolean);
    const topReason = reasons[0] || '未知原因';
    messages.push('注意到你把"' + delayedToday[0].title + '"延迟了（' + topReason + '），要不要试试把它拆成更小的步骤？');
    suggestions.push({ label: '拆分为微任务 (2分钟起步)', action: 'split' });
  }

  if (rate >= 70) {
    messages.push('总完成率' + rate + '%，你正在稳定地建立学习习惯。继续保持这个节奏！');
  } else if (rate < 30 && allTasks.length > 10) {
    messages.push('完成率偏低，别灰心。建议暂时降低每日任务量，先保证每次都完成，再逐渐加量。');
    suggestions.push({ label: '降低今日任务量', action: 'reduce' });
  }

  const highDiffPending = allTasks.filter(t => t.difficulty >= 4 && t.status === 'pending');
  if (highDiffPending.length >= 2) {
    messages.push('你还有' + highDiffPending.length + '个高难度任务待完成，建议安排在精力最好的时段。');
  }

  if (messages.length === 0) {
    messages.push('新的一天，按照你的节奏稳步推进吧。每完成一个任务都是对自己的投资。');
  }

  } // end fallback rules

  return (
    <div className="coach-banner">
      <div className="coach-banner-header">
        <Sparkles size={16} />
        <span>AI 学习教练</span>
      </div>
      {messages.map((msg, i) => (
        <p key={i}>{msg}</p>
      ))}
      {suggestions.length > 0 && (
        <div className="coach-actions">
          {suggestions.map((s, i) => (
            <button key={i} className="coach-btn" onClick={() => onAction(s.action)}>
              <Sparkles size={12} /> {s.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}

export function ProcrastinationWarning({ plan }: { plan: Plan }) {
  const allTasks = plan.weeks.flatMap(w => w.tasks);
  const byCategory: Record<string, Task[]> = {};

  allTasks.filter(t => t.status === 'delayed').forEach(t => {
    if (!byCategory[t.category]) byCategory[t.category] = [];
    byCategory[t.category].push(t);
  });

  const warnings: { category: string; count: number; msg: string }[] = [];
  for (const [cat, tasks] of Object.entries(byCategory)) {
    if (tasks.length >= 3) {
      warnings.push({
        category: cat,
        count: tasks.length,
        msg: '"' + cat + '"类任务已连续延迟' + tasks.length + '次，建议降低此类任务难度或调整到精力高峰期',
      });
    }
  }

  if (warnings.length === 0) return null;

  return (
    <div>
      {warnings.map((w, i) => (
        <div key={i} className="warning-banner">
          <AlertTriangle size={16} color="#d97706" />
          <span>{w.msg}</span>
        </div>
      ))}
    </div>
  );
}

export function TodayPreview({ plan }: { plan: Plan }) {
  const today = new Date().toISOString().split('T')[0];
  const todayTasks = plan.weeks.flatMap(w => w.tasks).filter(t => t.date === today);
  const pending = todayTasks.filter(t => t.status === 'pending' || t.status === 'in_progress');

  if (pending.length === 0) return null;

  return (
    <div className="today-preview">
      <div className="today-preview-header">
        <Brain size={14} />
        <span>今日预览 · {pending.length} 个待完成任务</span>
      </div>
      <div className="today-preview-tasks">
        {pending.slice(0, 5).map(t => (
          <span key={t.id} className="preview-chip">
            {t.difficulty >= 4 ? '🔥 ' : ''}{t.title}
          </span>
        ))}
        {pending.length > 5 && <span className="preview-chip">+{pending.length - 5} 更多</span>}
      </div>
    </div>
  );
}

export function GrowthMetrics({ plan }: { plan: Plan }) {
  const metrics = useMemo(() => {
    const allTasks = plan.weeks.flatMap(w => w.tasks);
    const completed = allTasks.filter(t => t.status === 'completed');
    const totalMinutes = completed.reduce((s, t) => s + t.estimatedMinutes, 0);
    const avgDifficulty = completed.length > 0
      ? completed.reduce((s, t) => s + t.difficulty, 0) / completed.length
      : 0;
    const streak = calculateStreak(plan);
    const totalDays = plan.weeks.length * 7;
    const activeDays = new Set(completed.map(t => t.date)).size;
    const consistency = Math.round((activeDays / totalDays) * 100);

    return { totalMinutes, avgDifficulty: Math.round(avgDifficulty * 10) / 10, streak, consistency };
  }, [plan]);

  return (
    <div className="growth-card">
      <div className="growth-header">
        <div className="card-icon"><Brain size={20} /></div>
        <h3>成长数据</h3>
      </div>
      <div className="growth-metrics">
        <div className="growth-metric">
          <div className="growth-value">{metrics.totalMinutes}</div>
          <div className="growth-label">累计学习分钟</div>
          <div className="growth-trend up">
            <ArrowRight size={10} /> 持续积累中
          </div>
        </div>
        <div className="growth-metric">
          <div className="growth-value">{metrics.streak}</div>
          <div className="growth-label">连续学习天数</div>
          <div className="growth-trend up">
            <ArrowRight size={10} /> 保持势头
          </div>
        </div>
        <div className="growth-metric">
          <div className="growth-value">{metrics.avgDifficulty}</div>
          <div className="growth-label">平均任务难度</div>
          <div className="growth-trend up">
            <ArrowRight size={10} /> 能力成长中
          </div>
        </div>
        <div className="growth-metric">
          <div className="growth-value">{metrics.consistency}%</div>
          <div className="growth-label">学习一致性</div>
          <div className={`growth-trend ${metrics.consistency >= 60 ? 'up' : 'down'}`}>
            <ArrowRight size={10} /> {metrics.consistency >= 60 ? '节奏稳定' : '需要加强'}
          </div>
        </div>
      </div>
    </div>
  );
}

function calculateStreak(plan: Plan): number {
  const allTasks = plan.weeks.flatMap(w => w.tasks);
  const completedDates = new Set(
    allTasks.filter(t => t.status === 'completed' && t.completedAt).map(t => t.date),
  );
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 30; i++) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    if (completedDates.has(d.toISOString().split('T')[0])) {
      streak++;
    } else if (i > 0) {
      break;
    }
  }
  return streak;
}
