import { useState, useMemo, useEffect, useRef } from 'react';
import type { Plan, Task, TaskStatus, DailyLog } from '../types';
import { adjustPlan } from '../engine/adjuster';
import { updateTaskStatus, saveDailyLog, getDailyLog, updatePlan, addTaskToPlan, updateTaskInPlan, deleteTaskFromPlan } from '../data/store';
import { Check, Clock, SkipForward, AlertCircle, ChevronRight, ChevronLeft, BarChart3, Battery, Brain, Plus, Trash2, Edit3, ArrowLeft, MoveUp, MoveDown, Sparkles, X, Lightbulb, Play, Timer, RotateCcw } from 'lucide-react';
import { CoachReview, ProcrastinationWarning, TodayPreview } from './Coach';

interface Props {
  planId: string;
  plan: Plan;
  onBack: () => void;
  onViewInsights: () => void;
}

const STATUS_CONFIG: Record<TaskStatus, { icon: React.ReactNode; label: string; className: string }> = {
  pending: { icon: <Clock size={14} />, label: '待开始', className: 'status-pending' },
  in_progress: { icon: <Play size={14} />, label: '进行中', className: 'status-progress' },
  completed: { icon: <Check size={14} />, label: '已完成', className: 'status-completed' },
  delayed: { icon: <AlertCircle size={14} />, label: '已延迟', className: 'status-delayed' },
  skipped: { icon: <SkipForward size={14} />, label: '已跳过', className: 'status-skipped' },
};

const DELAY_REASONS = ['时间不够', '难度太大', '精力不足', '有更紧急的事', '缺乏动力', '需要更多准备'];
const WEEKDAY_NAMES = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'];

function getWeekdayLabel(dateStr: string): string {
  if (!dateStr) return '';
  const [y, m, d] = dateStr.split('-').map(Number);
  const date = new Date(y, m - 1, d);
  return WEEKDAY_NAMES[date.getDay()];
}

function computeDate(startDate: string, offsetDays: number): string {
  const [y, m, d] = startDate.split('-').map(Number);
  const date = new Date(y, m - 1, d + offsetDays);
  return date.toISOString().split('T')[0];
}
const CATEGORIES = ['阅读', '练习', '实践', '观看', '整理', '输出', '复习', '休息', '自定义'];

export default function Dashboard({ planId, plan: initialPlan, onBack, onViewInsights }: Props) {
  const [plan, setPlan] = useState<Plan>(initialPlan);
  const [activeWeek, setActiveWeek] = useState(1);
  const [expandedDays, setExpandedDays] = useState<Set<number>>(new Set([new Date().getDay() || 7]));
  const [delayTask, setDelayTask] = useState<Task | null>(null);
  const [showDailyLog, setShowDailyLog] = useState(false);
  const [showAddTask, setShowAddTask] = useState<{ week: number; day: number } | null>(null);
  const [editingTask, setEditingTask] = useState<Task | null>(null);

  const [recentlyChanged, setRecentlyChanged] = useState<Task[]>([]);
  const [toast, setToast] = useState<{ message: string; type: 'success' | 'info'; week: number; day: number } | null>(null);

  const showToast = (message: string, type: 'success' | 'info' = 'info', week?: number, day?: number) => {
    setToast({ message, type, week: week || 0, day: day || 0 });
    setTimeout(() => setToast(null), 4000);
  };

  const [timerSeconds, setTimerSeconds] = useState(0);
  const timerTaskRef = useRef<Task | null>(null);
  const timerIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null);

  const startTimer = (task: Task) => {
    stopTimer();
    timerTaskRef.current = task;
    setTimerSeconds(0);
    timerIntervalRef.current = setInterval(() => {
      setTimerSeconds(s => s + 1);
    }, 1000);
  };

  const stopTimer = () => {
    if (timerIntervalRef.current) {
      clearInterval(timerIntervalRef.current);
      timerIntervalRef.current = null;
    }
    timerTaskRef.current = null;
    setTimerSeconds(0);
  };

  useEffect(() => {
    return () => stopTimer();
  }, []);

  const formatTime = (seconds: number) => {
    const m = Math.floor(seconds / 60);
    const s = seconds % 60;
    return `${m}:${s.toString().padStart(2, '0')}`;
  };

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

  const savePlan = (p: Plan) => {
    setPlan(p);
    updatePlan(planId, p);
  };

  const handleStatusChange = (task: Task, newStatus: TaskStatus) => {
    if (newStatus === 'delayed') { setDelayTask(task); return; }
    if (newStatus === 'completed') {
      if (task.date > today) {
        showToast(`无法提前完成${task.date}的任务，可先移到今天再完成`, 'info');
        return;
      }
      stopTimer();
      if (timerTaskRef.current?.id === task.id) {
        task.actualMinutes = Math.round(timerSeconds / 60);
      }
    }
    if (newStatus === 'in_progress') {
      startTimer(task);
    }
    if (newStatus === 'pending') {
      stopTimer();
    }
    applyStatusChange(task, newStatus);
  };

  const applyStatusChange = (task: Task, newStatus: TaskStatus, reason?: string) => {
    const updatedPlan = adjustPlan(plan, task, newStatus);
    if (reason) {
      const t = updatedPlan.weeks.flatMap(w => w.tasks).find(t => t.id === task.id);
      if (t) t.delayedReason = reason;
    }
    updateTaskStatus(planId, task.id, newStatus, reason);
    savePlan(updatedPlan);
    setDelayTask(null);
    setRecentlyChanged(prev => [...prev, { ...task, status: newStatus }].slice(-10));
  };

  const handleAddTask = (week: number, day: number, taskData: Partial<Task>) => {
    const dayDate = plan.weeks[week - 1]?.tasks[0]?.date || today;
    const newTask: Task = {
      id: `custom_${Date.now()}`,
      title: taskData.title || '新任务',
      description: taskData.description || '',
      estimatedMinutes: taskData.estimatedMinutes || 30,
      difficulty: taskData.difficulty || 3,
      week, day,
      date: dayDate,
      status: 'pending',
      category: taskData.category || '自定义',
      order: (tasksByDay[day] || []).length,
      isCustom: true,
    };
    const updated = addTaskToPlan(planId, newTask);
    if (updated) savePlan(updated);
    setShowAddTask(null);
  };

  const handleEditTask = (task: Task, updates: Partial<Task>) => {
    const updated = updateTaskInPlan(planId, task.id, updates);
    if (updated) savePlan(updated);
    setEditingTask(null);
  };

  const handleDeleteTask = (taskId: string) => {
    if (confirm('确定删除这个任务吗？')) {
      const updated = deleteTaskFromPlan(planId, taskId);
      if (updated) savePlan(updated);
    }
  };

  const handleMoveTask = (task: Task, direction: 'up' | 'down' | 'prevDay' | 'nextDay') => {
    let newDay = task.day;
    let newWeek = task.week;
    if (direction === 'prevDay') { newDay = task.day - 1; if (newDay < 1) { newDay = 7; newWeek = task.week - 1; } }
    if (direction === 'nextDay') { newDay = task.day + 1; if (newDay > 7) { newDay = 1; newWeek = task.week + 1; } }
    if (newWeek < 1 || newWeek > 4) return;

    const weekTasks = plan.weeks.find(w => w.weekNumber === newWeek)?.tasks;
    const newDate = weekTasks?.find(t => t.day === newDay)?.date || task.date;
    handleEditTask(task, { week: newWeek, day: newDay, date: newDate });
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

  const handleCoachAction = (action: string) => {
    const newPlan = structuredClone(plan);
    const allTasks = newPlan.weeks.flatMap(w => w.tasks);
    const today = new Date().toISOString().split('T')[0];
    const currentWeekTasks = allTasks.filter(t => t.date === today);
    const w = currentWeekTasks[0]?.week || activeWeek;
    const d = currentWeekTasks[0]?.day || (new Date().getDay() || 7);

    if (action === 'upgrade') {
      const pending = allTasks.filter(t => t.status === 'pending');
      const count = Math.min(3, pending.length);
      pending.slice(0, count).forEach(t => {
        t.difficulty = Math.min(5, t.difficulty + 1);
        t.estimatedMinutes = Math.round(t.estimatedMinutes * 1.1);
      });
      updatePlan(planId, newPlan);
      setPlan(newPlan);
      showToast(`第${w}周 周${d} · 已提升 ${count} 个任务难度，挑战加速！`, 'success', w, d);
    } else if (action === 'split') {
      const delayed = allTasks.filter(t => t.status === 'delayed');
      const task = delayed[0];
      if (task) {
        task.status = 'pending';
        const microTask: Task = {
          id: `micro_${Date.now()}`,
          title: '微行动: ' + task.title.slice(0, 15),
          description: '只需2分钟: ' + task.description.slice(0, 30),
          estimatedMinutes: 2,
          difficulty: 1,
          week: task.week,
          day: task.day,
          date: task.date,
          status: 'pending',
          category: task.category,
          order: task.order + 1,
          isCustom: true,
          delayedReason: undefined,
        };
        const week = newPlan.weeks.find(w => w.weekNumber === task.week);
        week?.tasks.push(microTask);
        updatePlan(planId, newPlan);
        setPlan(newPlan);
        showToast(`第${task.week}周 周${task.day} · 已恢复"${task.title.slice(0, 10)}"并新增微行动`, 'success', task.week, task.day);
      }
    } else if (action === 'reduce') {
      const todayStr = new Date().toISOString().split('T')[0];
      const todayTasks = allTasks.filter(t => t.date === todayStr && t.status === 'pending');
      const toSkip = todayTasks.filter(t => t.difficulty >= 3).slice(Math.floor(todayTasks.length / 2));
      toSkip.forEach(t => { t.status = 'skipped'; });
      updatePlan(planId, newPlan);
      setPlan(newPlan);
      showToast(`第${w}周 周${d} · 已跳过 ${toSkip.length} 个高难度任务，今天轻松点`, 'info', w, d);
    }
  };

  return (
    <div className="dashboard">
      {toast && (
        <div className={`toast toast-${toast.type}`} onClick={() => setToast(null)}>
          <Sparkles size={14} />
          <div className="toast-content">
            <span>{toast.message}</span>
          </div>
          <button className="toast-close" onClick={e => { e.stopPropagation(); setToast(null); }}><X size={12} /></button>
        </div>
      )}

      <header className="dashboard-header">
        <div className="header-info">
          <button className="btn btn-ghost btn-back" onClick={onBack}>
            <ArrowLeft size={16} /> 返回
          </button>
          <div>
            <h1>{plan.name || plan.profile.goal.slice(0, 30)}</h1>
            <p className="header-goal">目标: {plan.profile.goal.slice(0, 50)}{plan.profile.goal.length > 50 ? '...' : ''}</p>
          </div>
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
            <Lightbulb size={16} /> 洞察报告
          </button>
        </div>
      </header>

      <CoachReview plan={plan} recentlyChanged={recentlyChanged} onAction={handleCoachAction} />
      <ProcrastinationWarning plan={plan} />
      <TodayPreview plan={plan} />

      <div className="week-navigator">
        <button className="btn btn-icon" onClick={() => setActiveWeek(Math.max(1, activeWeek - 1))} disabled={activeWeek === 1}>
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
              <div className="week-progress-fill" style={{
                width: `${w.tasks.length > 0 ? Math.round((w.tasks.filter(t => t.status === 'completed').length / w.tasks.length) * 100) : 0}%`,
              }} />
            </div>
          </button>
        ))}
        <button className="btn btn-icon" onClick={() => setActiveWeek(Math.min(4, activeWeek + 1))} disabled={activeWeek === 4}>
          <ChevronRight size={20} />
        </button>
      </div>

      <div className="week-stats-bar">
        <div className="stat-item"><Check size={16} className="text-green" /><span>{weekStats.completed}/{weekStats.total} 任务</span></div>
        <div className="stat-item"><Clock size={16} className="text-blue" /><span>完成率 {weekStats.rate}%</span></div>
        <div className="stat-item"><Battery size={16} className="text-orange" /><span>主题: {currentWeek.theme}</span></div>
      </div>

      <div className="week-goals">
        {currentWeek.goals.map((g, i) => (<span key={i} className="goal-tag">{g}</span>))}
      </div>

      <div className="tasks-container">
        {Array.from({ length: 7 }, (_, idx) => {
          const day = idx + 1;
          const dayTasks = tasksByDay[day] || [];
          const dateStr = dayTasks[0]?.date || computeDate(plan.profile.startDate, (activeWeek - 1) * 7 + idx);
          const isToday = dateStr === today;
          const isExpanded = expandedDays.has(day);
          const dayCompleted = dayTasks.filter(t => t.status === 'completed').length;
          const dayLabel = getWeekdayLabel(dateStr);

          return (
            <div key={day} className={`day-group ${isToday ? 'today' : ''}`}>
              <div className="day-header" onClick={() => toggleDay(day)}>
                <div className="day-info">
                  <span className="day-name">{dayLabel}</span>
                  <span className="day-date">{dateStr}</span>
                  {isToday && <span className="today-badge">今天</span>}
                </div>
                <div className="day-meta">
                  <span className="day-progress-text">{dayCompleted}/{dayTasks.length}</span>
                  <button
                    className="btn btn-icon btn-sm"
                    onClick={e => { e.stopPropagation(); setShowAddTask({ week: activeWeek, day }); }}
                    title="添加任务"
                  >
                    <Plus size={14} />
                  </button>
                  <ChevronRight size={16} className={`day-chevron ${isExpanded ? 'rotated' : ''}`} />
                </div>
              </div>

              {isExpanded && (
                <div className="day-tasks">
                  {dayTasks.length === 0 ? (
                    <div className="empty-day">
                      <p>这一天还没有任务</p>
                      <button className="btn btn-outline btn-sm" onClick={() => setShowAddTask({ week: activeWeek, day })}>
                        <Plus size={14} /> 添加任务
                      </button>
                    </div>
                  ) : plan.profile.splitByHalfDay ? (
                    <HalfDayTasks
                      dayTasks={dayTasks}
                      today={today}
                      timerTaskRef={timerTaskRef}
                      timerSeconds={timerSeconds}
                      formatTime={formatTime}
                      stopTimer={stopTimer}
                      handleStatusChange={handleStatusChange}
                      handleEditTask={handleEditTask}
                      handleDeleteTask={handleDeleteTask}
                      handleMoveTask={handleMoveTask}
                      setEditingTask={setEditingTask}
                      activeWeek={activeWeek}
                      showToast={showToast}
                    />
                  ) : (
                    dayTasks.map((task) => (
                      <div key={task.id} className={`task-card ${task.status} ${task.isCustom ? 'custom-task' : ''}`}>
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
                              {task.isCustom && <span className="task-custom-badge">自定义</span>}
                            </div>
                            <h4 className="task-title">{task.title}</h4>
                            <p className="task-desc">{task.description}</p>
                            {task.status === 'in_progress' && timerTaskRef.current?.id === task.id && (
                              <div className="task-timer">
                                <Timer size={14} />
                                <span>{formatTime(timerSeconds)}</span>
                                <button className="btn btn-ghost btn-sm" onClick={stopTimer} title="停止计时"><RotateCcw size={12} /></button>
                              </div>
                            )}
                            {task.delayedReason && (
                              <p className="task-reason">延迟原因: {task.delayedReason}</p>
                            )}
                          </div>
                          <div className="task-actions-col">
                            <div className="task-actions">
                              {task.status === 'pending' || task.status === 'in_progress' ? (
                                <>
                                  {task.date <= today ? (
                                    <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(task, 'completed')} title="完成"><Check size={14} /></button>
                                  ) : (
                                    <button className="btn btn-info btn-sm" onClick={() => { handleEditTask(task, { date: today, week: activeWeek, day: new Date().getDay() || 7 }); showToast('任务已移到今天，现在可以完成了', 'success', activeWeek, new Date().getDay() || 7); }} title="移到今天"><ArrowLeft size={14} /> 移到今天</button>
                                  )}
                                  <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(task, 'in_progress')} title="开始"><Play size={14} /></button>
                                  <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(task, 'delayed')} title="延迟"><AlertCircle size={14} /></button>
                                  <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(task, 'skipped')} title="跳过"><SkipForward size={14} /></button>
                                </>
                              ) : (
                                <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange(task, 'pending')}>重置</button>
                              )}
                            </div>
                            <div className="task-tools">
                              <button className="btn btn-ghost btn-sm" onClick={() => setEditingTask(task)} title="编辑"><Edit3 size={12} /></button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTask(task.id)} title="删除"><Trash2 size={12} /></button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleMoveTask(task, 'prevDay')} title="移到前一天"><MoveUp size={12} /></button>
                              <button className="btn btn-ghost btn-sm" onClick={() => handleMoveTask(task, 'nextDay')} title="移到后一天"><MoveDown size={12} /></button>
                            </div>
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

      {/* Delay Modal */}
      {delayTask && (
        <div className="modal-overlay" onClick={() => setDelayTask(null)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>延迟原因</h3>
            <p>"{delayTask.title}" 为什么延迟了？</p>
            <div className="delay-reasons">
              {DELAY_REASONS.map(reason => (
                <button key={reason} className="btn btn-outline reason-btn" onClick={() => applyStatusChange(delayTask, 'delayed', reason)}>
                  {reason}
                </button>
              ))}
            </div>
            <button className="btn btn-ghost" onClick={() => setDelayTask(null)}>取消</button>
          </div>
        </div>
      )}

      {/* Daily Log Modal */}
      {showDailyLog && <DailyLogModal date={today} existingLog={todayLog} onSave={handleDailyLogSave} onClose={() => setShowDailyLog(false)} />}

      {/* Add Task Modal */}
      {showAddTask && (
        <AddTaskModal
          week={showAddTask.week}
          day={showAddTask.day}
          startDate={plan.profile.startDate}
          onSave={task => handleAddTask(showAddTask.week, showAddTask.day, task)}
          onClose={() => setShowAddTask(null)}
        />
      )}

      {/* Edit Task Modal */}
      {editingTask && (
        <EditTaskModal
          task={editingTask}
          onSave={updates => handleEditTask(editingTask, updates)}
          onClose={() => setEditingTask(null)}
        />
      )}
    </div>
  );
}

function DailyLogModal({ date, existingLog, onSave, onClose }: {
  date: string; existingLog: DailyLog | null; onSave: (log: DailyLog) => void; onClose: () => void;
}) {
  const [energy, setEnergy] = useState(existingLog?.energyLevel || 5);
  const [focus, setFocus] = useState(existingLog?.focusLevel || 5);
  const [mood, setMood] = useState(existingLog?.mood || '正常');
  const [notes, setNotes] = useState(existingLog?.notes || '');
  const [distractions, setDistractions] = useState(existingLog?.distractions?.join(', ') || '');

  const handleSave = () => {
    onSave({
      date, energyLevel: energy, focusLevel: focus, mood, notes,
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
        <div className="log-field"><label>精力水平 ({energy}/10)</label><input type="range" min={1} max={10} value={energy} onChange={e => setEnergy(Number(e.target.value))} /></div>
        <div className="log-field"><label>专注度 ({focus}/10)</label><input type="range" min={1} max={10} value={focus} onChange={e => setFocus(Number(e.target.value))} /></div>
        <div className="log-field"><label>心情状态</label><div className="mood-selector">{moods.map(m => <button key={m} className={`btn btn-sm ${mood === m ? 'btn-primary' : 'btn-outline'}`} onClick={() => setMood(m)}>{m}</button>)}</div></div>
        <div className="log-field"><label>分心因素</label><input type="text" value={distractions} onChange={e => setDistractions(e.target.value)} placeholder="手机、社交媒体..." className="input-text" /></div>
        <div className="log-field"><label>备注</label><textarea value={notes} onChange={e => setNotes(e.target.value)} placeholder="今天学习的感受..." className="input-text" rows={2} /></div>
        <div className="modal-actions"><button className="btn btn-ghost" onClick={onClose}>取消</button><button className="btn btn-primary" onClick={handleSave}>保存</button></div>
      </div>
    </div>
  );
}

function AddTaskModal({ week, day, onSave, onClose, startDate }: {
  week: number; day: number; onSave: (task: Partial<Task>) => void; onClose: () => void; startDate: string;
}) {
  const [nlInput, setNlInput] = useState('');
  const [title, setTitle] = useState('');
  const [desc, setDesc] = useState('');
  const [minutes, setMinutes] = useState(30);
  const [difficulty, setDifficulty] = useState(3);
  const [category, setCategory] = useState('自定义');
  const [useAdvanced, setUseAdvanced] = useState(false);

  const parseNaturalLanguage = (input: string) => {
    const trimmed = input.trim();
    if (!trimmed) return;

    const timeMatch = trimmed.match(/(\d+)\s*(分钟|min|小时|h)/i);
    const diffMatch = trimmed.match(/难度\s*(\d)/i) || trimmed.match(/(\d)星/i);
    const catMatch = trimmed.match(/[（(](.+?)[）)]/);

    const cleanTitle = trimmed
      .replace(/(\d+)\s*(分钟|min|小时|h)/gi, '')
      .replace(/难度\s*\d/gi, '')
      .replace(/[（(].+?[）)]/g, '')
      .trim();

    setTitle(cleanTitle || trimmed);
    if (timeMatch) {
      const val = parseInt(timeMatch[1]);
      setMinutes(timeMatch[2]?.includes('小时') || timeMatch[2] === 'h' ? val * 60 : val);
    }
    if (diffMatch) setDifficulty(Math.min(5, Math.max(1, parseInt(diffMatch[1]))));
    if (catMatch) setCategory(catMatch[1]);
  };

  const handleNlSubmit = () => {
    if (nlInput.trim()) parseNaturalLanguage(nlInput);
    setUseAdvanced(true);
  };

  const quickExamples = ['复习课程 30分钟', '阅读3章 难度3', '练习算法题 1小时', '整理笔记 15分钟'];

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>添加自定义任务</h3>
        <p>第{week}周 {getWeekdayLabel(computeDate(startDate, (week - 1) * 7 + day - 1))}</p>

        <div className="nl-input-wrapper">
          <label className="log-field-label">快速输入（可选）</label>
          <input
            type="text"
            className="input-text"
            value={nlInput}
            onChange={e => setNlInput(e.target.value)}
            placeholder="例如：复习数学 30分钟 难度3（练习）"
            onKeyDown={e => e.key === 'Enter' && handleNlSubmit()}
            autoFocus
          />
          <div className="nl-input-hint">支持：任务名 + 时间 + 难度N + (分类)</div>
          <div className="nl-examples">
            {quickExamples.map(ex => (
              <button key={ex} className="nl-example" onClick={() => { setNlInput(ex); parseNaturalLanguage(ex); }}>
                {ex}
              </button>
            ))}
          </div>
          {nlInput.trim() && !useAdvanced && (
            <button className="btn btn-primary btn-sm" style={{ marginTop: 8 }} onClick={handleNlSubmit}>
              <Sparkles size={12} /> 智能解析
            </button>
          )}
        </div>

        {(useAdvanced || !nlInput.trim()) && (
          <>
            <div className="log-field"><label>任务名称</label><input type="text" className="input-text" value={title} onChange={e => setTitle(e.target.value)} placeholder="输入任务名称" /></div>
            <div className="log-field"><label>描述</label><textarea className="input-text" value={desc} onChange={e => setDesc(e.target.value)} placeholder="任务描述（可选）" rows={2} /></div>
            <div className="form-row">
              <div className="log-field" style={{ flex: 1 }}><label>预估时间（分钟）</label><input type="number" className="input-text" value={minutes} onChange={e => setMinutes(Number(e.target.value))} min={5} max={240} /></div>
              <div className="log-field" style={{ flex: 1 }}><label>难度 (1-5)</label><div className="diff-selector">{[1, 2, 3, 4, 5].map(d => <button key={d} className={`btn btn-sm ${difficulty === d ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDifficulty(d)}>{'★'.repeat(d)}</button>)}</div></div>
            </div>
            <div className="log-field"><label>分类</label><div className="mood-selector">{CATEGORIES.map(c => <button key={c} className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategory(c)}>{c}</button>)}</div></div>
          </>
        )}

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => title.trim() && onSave({ title: title.trim(), description: desc.trim(), estimatedMinutes: minutes, difficulty, category })} disabled={!title.trim()}>
            添加
          </button>
        </div>
      </div>
    </div>
  );
}

function EditTaskModal({ task, onSave, onClose }: {
  task: Task; onSave: (updates: Partial<Task>) => void; onClose: () => void;
}) {
  const [title, setTitle] = useState(task.title);
  const [desc, setDesc] = useState(task.description);
  const [minutes, setMinutes] = useState(task.estimatedMinutes);
  const [difficulty, setDifficulty] = useState(task.difficulty);
  const [category, setCategory] = useState(task.category);

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal" onClick={e => e.stopPropagation()}>
        <h3>编辑任务</h3>

        <div className="log-field"><label>任务名称</label><input type="text" className="input-text" value={title} onChange={e => setTitle(e.target.value)} autoFocus /></div>
        <div className="log-field"><label>描述</label><textarea className="input-text" value={desc} onChange={e => setDesc(e.target.value)} rows={2} /></div>

        <div className="form-row">
          <div className="log-field" style={{ flex: 1 }}>
            <label>预估时间（分钟）</label>
            <input type="number" className="input-text" value={minutes} onChange={e => setMinutes(Number(e.target.value))} min={5} max={240} />
          </div>
          <div className="log-field" style={{ flex: 1 }}>
            <label>难度 (1-5)</label>
            <div className="diff-selector">
              {[1, 2, 3, 4, 5].map(d => (
                <button key={d} className={`btn btn-sm ${difficulty === d ? 'btn-primary' : 'btn-outline'}`} onClick={() => setDifficulty(d)}>{'★'.repeat(d)}</button>
              ))}
            </div>
          </div>
        </div>

        <div className="log-field"><label>分类</label><div className="mood-selector">{CATEGORIES.map(c => <button key={c} className={`btn btn-sm ${category === c ? 'btn-primary' : 'btn-outline'}`} onClick={() => setCategory(c)}>{c}</button>)}</div></div>

        <div className="modal-actions">
          <button className="btn btn-ghost" onClick={onClose}>取消</button>
          <button className="btn btn-primary" onClick={() => { onSave({ title: title.trim(), description: desc.trim(), estimatedMinutes: minutes, difficulty, category }); onClose(); }}>保存</button>
        </div>
      </div>
    </div>
  );
}

function HalfDayTasks({
  dayTasks, today, timerTaskRef, timerSeconds, formatTime, stopTimer,
  handleStatusChange, handleEditTask, handleDeleteTask, handleMoveTask,
  setEditingTask, activeWeek, showToast,
}: {
  dayTasks: Task[]; today: string; timerTaskRef: React.MutableRefObject<Task | null>;
  timerSeconds: number; formatTime: (s: number) => string; stopTimer: () => void;
  handleStatusChange: (t: Task, s: TaskStatus) => void;
  handleEditTask: (t: Task, u: Partial<Task>) => void;
  handleDeleteTask: (id: string) => void;
  handleMoveTask: (t: Task, d: 'up' | 'down' | 'prevDay' | 'nextDay') => void;
  setEditingTask: (t: Task) => void;
  activeWeek: number;
  showToast: (m: string, type: 'success' | 'info', w?: number, d?: number) => void;
}) {
  const morning = dayTasks.filter(t => t.halfDay === 'morning');
  const afternoon = dayTasks.filter(t => t.halfDay === 'afternoon');
  const unsorted = dayTasks.filter(t => !t.halfDay);

  const renderTask = (task: Task) => (
    <div key={task.id} className={`task-card ${task.status} ${task.isCustom ? 'custom-task' : ''} task-enter`}>
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
            {task.isCustom && <span className="task-custom-badge">自定义</span>}
          </div>
          <h4 className="task-title">{task.title}</h4>
          <p className="task-desc">{task.description}</p>
          {task.status === 'in_progress' && timerTaskRef.current?.id === task.id && (
            <div className="task-timer">
              <Timer size={14} />
              <span>{formatTime(timerSeconds)}</span>
              <button className="btn btn-ghost btn-sm" onClick={stopTimer} title="停止计时"><RotateCcw size={12} /></button>
            </div>
          )}
          {task.delayedReason && <p className="task-reason">延迟原因: {task.delayedReason}</p>}
        </div>
        <div className="task-actions-col">
          <div className="task-actions">
            {task.status === 'pending' || task.status === 'in_progress' ? (
              <>
                {task.date <= today ? (
                  <button className="btn btn-success btn-sm" onClick={() => handleStatusChange(task, 'completed')} title="完成"><Check size={14} /></button>
                ) : (
                  <button className="btn btn-info btn-sm" onClick={() => { handleEditTask(task, { date: today, week: activeWeek, day: new Date().getDay() || 7 }); showToast('任务已移到今天', 'success', activeWeek, new Date().getDay() || 7); }} title="移到今天"><ArrowLeft size={14} /></button>
                )}
                <button className="btn btn-warning btn-sm" onClick={() => handleStatusChange(task, 'in_progress')} title="开始"><Play size={14} /></button>
                <button className="btn btn-danger btn-sm" onClick={() => handleStatusChange(task, 'delayed')} title="延迟"><AlertCircle size={14} /></button>
                <button className="btn btn-ghost btn-sm" onClick={() => handleStatusChange(task, 'skipped')} title="跳过"><SkipForward size={14} /></button>
              </>
            ) : (
              <button className="btn btn-outline btn-sm" onClick={() => handleStatusChange(task, 'pending')}>重置</button>
            )}
          </div>
          <div className="task-tools">
            <button className="btn btn-ghost btn-sm" onClick={() => setEditingTask(task)} title="编辑"><Edit3 size={12} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleDeleteTask(task.id)} title="删除"><Trash2 size={12} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleMoveTask(task, 'prevDay')} title="移到前一天"><MoveUp size={12} /></button>
            <button className="btn btn-ghost btn-sm" onClick={() => handleMoveTask(task, 'nextDay')} title="移到后一天"><MoveDown size={12} /></button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="half-day-container">
      {morning.length > 0 && (
        <div className="half-day-section">
          <div className="half-day-header">
            <SunIcon /> <span>上午</span>
            <span className="half-day-count">{morning.length}个任务 · {morning.reduce((s, t) => s + t.estimatedMinutes, 0)}分钟</span>
          </div>
          {morning.map(renderTask)}
        </div>
      )}
      {afternoon.length > 0 && (
        <div className="half-day-section">
          <div className="half-day-header">
            <SunsetIcon /> <span>下午</span>
            <span className="half-day-count">{afternoon.length}个任务 · {afternoon.reduce((s, t) => s + t.estimatedMinutes, 0)}分钟</span>
          </div>
          {afternoon.map(renderTask)}
        </div>
      )}
      {unsorted.length > 0 && morning.length === 0 && afternoon.length === 0 && (
        <div>{unsorted.map(renderTask)}</div>
      )}
    </div>
  );
}

function SunIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f59e0b" strokeWidth="2" strokeLinecap="round">
      <circle cx="12" cy="12" r="5" />
      <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
      <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
      <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
      <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
    </svg>
  );
}

function SunsetIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="#f97316" strokeWidth="2" strokeLinecap="round">
      <path d="M17 18a5 5 0 0 0-10 0" />
      <line x1="12" y1="9" x2="12" y2="3" />
      <line x1="4.22" y1="10.22" x2="5.64" y2="11.64" /><line x1="1" y1="18" x2="3" y2="18" />
      <line x1="21" y1="18" x2="23" y2="18" /><line x1="18.36" y1="11.64" x2="19.78" y2="10.22" />
      <line x1="12" y1="3" x2="12" y2="3.01" />
      <polyline points="9 3 12 6 15 3" />
      <line x1="7" y1="21" x2="17" y2="21" />
    </svg>
  );
}
