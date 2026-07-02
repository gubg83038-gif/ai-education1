import { useState, useMemo } from 'react';
import type { Plan, Task, TaskStatus, DailyLog } from '../types';
import { adjustPlan } from '../engine/adjuster';
import { updateTaskStatus, saveDailyLog, getDailyLog, savePlan } from '../data/store';
import { Check, Clock, SkipForward, AlertCircle, ChevronRight, ChevronLeft, BarChart3, Zap, Battery, Brain } from 'lucide-react';

interface Props {
  plan: Plan;
  onPlanUpdate: (plan: Plan) => void;
  onViewInsights: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; className: string }> = {
  pending: { icon: <Clock size={14} />, label: '待开始', className: 'status-pending' },
  in_progress: { icon: <Zap size={14} />, label: '进行中', className: 'status-progress' },
  completed: { icon: <Check size={14} />, label: '已完成', className: 'status-completed' },
  delayed: { icon: <AlertCircle size={14} />, label: '已延迟', className: 'status-delayed' },
  skipped: { icon: <SkipForward size={14} />, label: '已跳过', className: 'status-skipped' },
};

const DELAY_REASONS = [
  '时间不够',
  '难度太大',
  '精力不足',
  '有更紧急的事',
  '缺乏动力',
  '需要更多准备',
];

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日'];

export default function Dashboard({ plan, onPlanUpdate, onViewInsights }: Props) {
  const [activeWeek, setActiveWeek] = useState(() => {
    const today = new Date().toISOString().split('T')[0];
    for (const w of plan.weeks) {
      if (w.tasks.some(t => t.date >= today)) return w.weekNumber;
    }
    return 1;
  });

  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([new Date().getDay() || 7]));
  const [delayTask, setDelayTask] = useState<Task | null>(null);
  const [showDailyLog, setShowDailyLog] = useState(false);

  const today = new Date().toISOString().split('T')[0];
  const todayLog = getDailyLog(today);

  const currentWeek = plan.weeks.find(w => w.weekNumber === activeWeek) || plan.weeks[0];
  const allTasks = plan.weeks.flatMap(w => w.tasks);
  const completedCount = allTasks.filter(t => t.status === 'completed').length;

  const weekStats = useMemo(() => {
    const tasks = currentWeek.tasks;
    const completed = tasks.filter(t => t.status === 'completed').length;
    const total = tasks.length;
    return { completed, total, rate: total > 0 ? Math.round((completed / total) * 100) : 0 };
  }, [currentWeek]);

  const tasksByDay = useMemo(() => {
    const map: Record<number, Task[]> = {};
    currentWeek.tasks.forEach(t => {
      if (!map[t.day]) map[t.day] = [];
      map[t.day].push(t);
    });
    return map;
  }, [currentWeek]);

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'delayed') {
      setDelayTask(task);
      return;
    }
    applyStatusChange(task, newStatus);
  };

  const applyStatusChange = (task: Task, newStatus: TaskStatus, reason?: string) => {
    const updatedPlan = adjustPlan(plan, task, newStatus);
    if (reason) {
      const t = updatedPlan.weeks.flatMap(w => w.tasks).find(t => t.id === task.id);
      if (t) t.delayedReason = reason;
    }
    updateTaskStatus(task.id, newStatus, reason);
    savePlan(updatedPlan);
    onPlanUpdate(updatedPlan);
    setDelayTask(null);
  };

  const toggleDay = (day: number) => {
    const next = new Set(expandedDays);
    if (next.has(day)) next.delete(day); else next.add(day);
    setExpandedDays(next);
  };

  const handleDailyLogSave = (log: DailyLog) => {
    saveDailyLog(log);
    setShowDailyLog(false);
  };

  return (
    <div className="dashboard">
      <header className="dashboard-header">
        <div className="header-info">
          <h1>学习计划</h1>
          <p className="header-goal">目标: {plan.profile.goal.slice(0, 50)}{plan.profile.goal.length > 50 ? '...' : ''}</p>
        </div>
        <div className="header-actions">
          <div className="overall-progress">
            <BarChart3 size={16} />
            <span>{completedCount}/{allTasks.length} 已完成</span>
          </div>
          <button className="btn btn-outline" onClick={() => setShowDailyLog(true)}>
            <Brain size={16} /> 每日状态
          </button>
          <button className="btn btn-accent" onClick={onViewInsights}>
            <Zap size={16} /> 洞察报告
          </button>
        </div>
      </header>

      <div className="week-navigator">
        <button
          className="btn btn-icon"
          onClick={() => setActiveWeek(Math.max(1, activeWeek - 1))}
          disabled={activeWeek === 1}
        >
          <ChevronLeft size={20} />
        </button>
        {plan.weeks.map(w => (
          <button
            key={w.weekNumber}
            className={`week-tab ${activeWeek === w.weekNumber ? 'active' : ''}`}
            onClick={() => setActiveWeek(w.weekNumber)}
          >
            <span className="week-num">第{w.weekNumber}周</span>
            <span className="week-theme">{w.theme}</span>
            <div className="week-progress-bar">
              <div
                className="week-progress-fill"
                style={{
                  width: `${w.tasks.length > 0
                    ? Math.round((w.tasks.filter(t => t.status === 'completed').length / w.tasks.length) * 100)
                    : 0}%`,
                }}
              />
            </div>
          </button>
        ))}
        <button
          className="btn btn-icon"
          onClick={() => setActiveWeek(Math.min(4, activeWeek + 1))}
          disabled={activeWeek === 4}
        >
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="week-stats-bar">
        <div className="stat-item">
          <Check size={16} className="text-green" />
          <span>{weekStats.completed}/{weekStats.total} 任务完成</span>
        </div>
        <div className="stat-item">
          <Clock size={16} className="text-blue" />
          <span>完成率 {weekStats.rate}%</span>
        </div>
        <div className="stat-item">
          <Battery size={16} className="text-orange" />
          <span>主题: {currentWeek.theme}</span>
        </div>
      </div>

      <div className="week-goals">
        {currentWeek.goals.map((g, i) => (
          <span key={i} className="goal-tag">{g}</span>
        ))}
      </div>

      <div className="tasks-container">
        {WEEKDAYS.map((dayName, idx) => {
          const day = idx + 1;
          const dayTasks = tasksByDay[day] || [];
          const dateStr = dayTasks[0]?.date || '';
          const isToday = dateStr === today;
          const isExpanded = expandedDays.has(day);
          const dayCompleted = dayTasks.filter(t => t.status === 'completed').length;

          return (
            <div key={day} className={`day-group ${isToday ? 'today' : ''}`}>
              <div className="day-header" onClick={() => toggleDay(day)}>
                <div className="day-info">
                  <span className="day-name">{dayName}</span>
                  <span className="day-date">{dateStr}</span>
                  {isToday && <span className="today-badge">今天</span>}
                </div>
                <div className="day-meta">
                  <span className="day-progress-text">{dayCompleted}/{dayTasks.length}</span>
                  <ChevronRight
                    size={16}
                    className={`day-chevron ${isExpanded ? 'rotated' : ''}`}
                  />
                </div>
              </div>

              {isExpanded && (
                <div className="day-tasks">
                  {dayTasks.length === 0 ? (
                    <p className="empty-day">休息日，没有安排任务</p>
                  ) : (
                    dayTasks.map(task => (
                      <div key={task.id} className={`task-card ${task.status}`}>
                        <div className="task-main">
                          <div className="task-info">
                            <div className="task-header">
                              <span className={`task-status-badge ${STATUS_CONFIG[task.status].className}`}>
                                {STATUS_CONFIG[task.status].icon}
                                {STATUS_CONFIG[task.status].label}
                              </span>
                              <span className={`task-difficulty difficulty-${task.difficulty}`}>
                                {'★'.repeat(task.difficulty)}{'☆'.repeat(5 - task.difficulty)}
                              </span>
                              <span className="task-time">{task.estimatedMinutes}分钟</span>
                            </div>
                            <h4 className="task-title">{task.title}</h4>
                            <p className="task-desc">{task.description}</p>
                            {task.delayedReason && (
                              <p className="task-reason">延迟原因: {task.delayedReason}</p>
                            )}
                          </div>
                          <div className="task-actions">
                            {task.status === 'pending' || task.status === 'in_progress' ? (
                              <>
                                <button
                                  className="btn btn-success btn-sm"
                                  onClick={() => handleStatusChange(task, 'completed')}
                                  title="标记完成"
                                >
                                  <Check size={14} />
                                </button>
                                <button
                                  className="btn btn-warning btn-sm"
                                  onClick={() => handleStatusChange(task, 'in_progress')}
                                  title="开始执行"
                                >
                                  <Zap size={14} />
                                </button>
                                <button
                                  className="btn btn-danger btn-sm"
                                  onClick={() => handleStatusChange(task, 'delayed')}
                                  title="标记延迟"
                                >
                                  <AlertCircle size={14} />
                                </button>
                                <button
                                  className="btn btn-ghost btn-sm"
                                  onClick={() => handleStatusChange(task, 'skipped')}
                                  title="跳过"
                                >
                                  <SkipForward size={14} />
                                </button>
                              </>
                            ) : (
                              <button
                                className="btn btn-outline btn-sm"
                                onClick={() => handleStatusChange(task, 'pending')}
                              >
                                重置
                              </button>
                            )}
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {delayTask && (
        <div className="modal-overlay" onClick={() => setDelayTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>延迟原因</h3>
            <p>"{delayTask.title}" 为什么延迟了？</p>
            <div className="delay-reasons">
              {DELAY_REASONS.map(reason => (
                <button
                  key={reason}
                  className="btn btn-outline reason-btn"
                  onClick={() => applyStatusChange(delayTask, 'delayed', reason)}
                >
                  {reason}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={() => setDelayTask(null)}>取消</button>
          </div>
        </div>
      )}

      {showDailyLog && <DailyLogModal date={today} existingLog={todayLog} onSave={handleDailyLogSave} onClose={() => setShowDailyLog(false)} />}
    </div>
  );
}

function DailyLogModal({ date, existingLog, onSave, onClose }: {
  date: string;
  existingLog: DailyLog | null;
  onSave: (log: DailyLog) => void;
  onClose: () => void;
}) {
  const [energy, setEnergy] = useState(existingLog?.energyLevel || 5);
  const [focus, setFocus] = useState(existingLog?.focusLevel || 5);
  const [mood, setMood] = useState(existingLog?.mood || '正常');
  const [notes, setNotes] = useState(existingLog?.notes || '');
  const [distractions, setDistractions] = useState(existingLog?.distractions?.join(', ') || '');

  const handleSave = () => {
    onSave({
      date,
      energyLevel: energy,
      focusLevel: focus,
      mood,
      notes,
      distractions: distractions.split(/[,，]/).map(s => s.trim()).filter(Boolean),
      completedTaskIds: existingLog?.completedTaskIds || [],
    });
  };

  const moods = ['精力充沛', '正常', '有点累', '很疲惫', '焦虑', '专注', '分心'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal daily-log-modal" onClick={e => e.stopPropagation()}>
        <h3>每日状态记录</h3>
        <p className="modal-date">{date}</p>

        <div className="log-field">
          <label>精力水平 ({energy}/10)</label>
          <input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(Number(e.target.value))} />
        </div>

        <div className="log-field">
          <label>专注度 ({focus}/10)</label>
          <input type="range" min={1} max={10} value={focus} onChange={e => setFocus(Number(e.target.value))} />
        </div>

        <div className="log-field">
          <label>心情状态</label>
          <div className="mood-selector">
            {moods.map(m => (
              <button
                key={m}
                className={`btn btn-sm ${mood === m ? 'btn-primary' : 'btn-outline'}`}
                onClick={() => setMood(m)}
              >
                {m}
              </button>
            ))}
          </div>
        </div>

        <div className="log-field">
          <label>分心因素</label>
          <input
            type="text"
            value={distractions}
            onChange={e => setDistractions(e.target.value)}
            placeholder="例如：手机、社交媒体、噪音"
            className="input-text"
          />
        </div>

        <div className="log-field">
          <label>备注</label>
          <textarea
            value={notes}
            onChange={e => setNotes(e.target.value)}
            placeholder="今天学习的感受、遇到的困难..."
            className="input-text"
            rows={2}
          />
        </div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={handleSave}>保存</button>
        </div>
      </div>
    </div>
  );
}
