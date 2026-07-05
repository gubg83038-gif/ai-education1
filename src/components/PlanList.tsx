import { useState, useEffect, useCallback } from 'react';
import type { Plan } from '../types';
import { useAuth } from '../context/AuthContext';
import { getPlans, deletePlan } from '../data/store';
import Onboarding from './Onboarding';
import Settings from './Settings';
import { Plus, Trash2, BarChart3, Calendar, Target, LogOut, Sparkles } from 'lucide-react';

interface Props {
  onSelectPlan: (planId: string) => void;
}

export default function PlanList({ onSelectPlan }: Props) {
  const { user, logout } = useAuth();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [showOnboarding, setShowOnboarding] = useState(false);
  const [showSettings, setShowSettings] = useState(false);

  const refreshPlans = useCallback(() => {
    setPlans(getPlans());
  }, []);

  useEffect(() => {
    refreshPlans();
  }, [refreshPlans]);

  const handleCreatePlan = () => {
    setShowOnboarding(true);
  };

  const handleOnboardingComplete = useCallback(() => {
    setShowOnboarding(false);
    refreshPlans();
  }, [refreshPlans]);

  const handleDeletePlan = (planId: string) => {
    if (confirm('确定要删除这个计划吗？')) {
      deletePlan(planId);
      refreshPlans();
    }
  };

  const getCompletionRate = (plan: Plan) => {
    const allTasks = plan.weeks.flatMap(w => w.tasks);
    if (allTasks.length === 0) return 0;
    const completed = allTasks.filter(t => t.status === 'completed').length;
    return Math.round((completed / allTasks.length) * 100);
  };

  if (showOnboarding) {
    return <Onboarding onComplete={handleOnboardingComplete} onCancel={() => setShowOnboarding(false)} />;
  }

  return (
    <div className="plan-list-page">
      <header className="plan-list-header">
        <div>
          <h1>我的学习计划</h1>
          <p>你好，{user?.username} — 共 {plans.length} 个计划</p>
        </div>
        <div className="header-actions">
          <button className="btn btn-ghost" onClick={() => setShowSettings(true)} title="AI 设置">
            <Sparkles size={16} />
          </button>
          <button className="btn btn-primary" onClick={handleCreatePlan}>
            <Plus size={16} /> 新建计划
          </button>
          <button className="btn btn-ghost" onClick={logout}>
            <LogOut size={16} /> 退出
          </button>
        </div>
      </header>

      {plans.length === 0 ? (
        <div className="empty-state">
          <Target size={48} />
          <h3>还没有学习计划</h3>
          <p>点击「新建计划」开始你的学习之旅</p>
          <button className="btn btn-accent" onClick={handleCreatePlan}>
            <Plus size={16} /> 创建第一个计划
          </button>
        </div>
      ) : (
        <div className="plan-grid">
          {plans.map(plan => {
            const rate = getCompletionRate(plan);
            const allTasks = plan.weeks.flatMap(w => w.tasks);
            const completed = allTasks.filter(t => t.status === 'completed').length;

            return (
              <div key={plan.id} className="plan-card" onClick={() => onSelectPlan(plan.id)}>
                <div className="plan-card-header">
                  <h3>{plan.name || plan.profile.goal.slice(0, 30)}</h3>
                  <button
                    className="btn btn-icon btn-delete"
                    onClick={e => { e.stopPropagation(); handleDeletePlan(plan.id); }}
                  >
                    <Trash2 size={16} />
                  </button>
                </div>

                <p className="plan-goal-text">{plan.profile.goal}</p>

                <div className="plan-stats">
                  <div className="plan-stat">
                    <BarChart3 size={14} />
                    <span>{completed}/{allTasks.length} 任务</span>
                  </div>
                  <div className="plan-stat">
                    <Calendar size={14} />
                    <span>第{plan.weeks.length}周计划</span>
                  </div>
                </div>

                <div className="plan-progress">
                  <div className="plan-progress-bar">
                    <div className="plan-progress-fill" style={{ width: `${rate}%` }} />
                  </div>
                  <span className="plan-progress-text">{rate}%</span>
                </div>

                <div className="plan-tags">
                  {plan.profile.learningStyles.map(s => (
                    <span key={s} className="plan-tag">{s === 'visual' ? '视觉型' : s === 'reading' ? '阅读型' : s === 'hands-on' ? '实践型' : '混合型'}</span>
                  ))}
                  <span className="plan-tag">{plan.profile.timePerDay}分钟/天</span>
                </div>
              </div>
            );
          }          )}
        </div>
      )}
      {showSettings && <Settings onClose={() => setShowSettings(false)} />}
    </div>
  );
}
