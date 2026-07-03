import { useState } from 'react';
import type { UserProfile } from '../types';
import { generatePlanOptions } from '../engine/planOptions';
import { generatePlan } from '../engine/planGenerator';
import { addPlan } from '../data/store';
import { Sparkles, Clock, BarChart3, ChevronLeft, Zap, Star } from 'lucide-react';

interface Props {
  profile: UserProfile & { planName: string };
  onBack: () => void;
  onComplete: () => void;
}

export default function PlanOptionsSelector({ profile, onBack, onComplete }: Props) {
  const [options] = useState(() => generatePlanOptions(profile));
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [isGenerating, setIsGenerating] = useState(false);

  const handleConfirm = () => {
    if (!selectedId) return;
    setIsGenerating(true);

    const option = options.find(o => o.id === selectedId)!;
    setTimeout(() => {
      const plan = generatePlan(option.profile);
      plan.name = profile.planName || profile.goal.slice(0, 20);
      addPlan(plan);
      setIsGenerating(false);
      onComplete();
    }, 1200);
  };

  if (isGenerating) {
    return (
      <div className="onboarding generating">
        <div className="generating-content">
          <div className="spinner" />
          <h2>AI 正在生成你选择的计划...</h2>
          <p>根据你的偏好定制 · 优化任务分配 · 匹配学习节奏</p>
          <div className="progress-dots">
            <span className="dot active" />
            <span className="dot active" />
            <span className="dot active" />
            <span className="dot" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="plan-options-page">
      <header className="options-header">
        <div className="options-header-top">
          <button className="btn btn-ghost" onClick={onBack}>
            <ChevronLeft size={16} /> 返回修改
          </button>
          <h1>选择适合你的学习策略</h1>
        </div>
        <p>根据你的目标"{profile.goal.slice(0, 40)}{profile.goal.length > 40 ? '...' : ''}"，AI 生成了 {options.length} 种不同的方案</p>
      </header>

      <div className="options-grid">
        {options.map((option, idx) => (
          <div
            key={option.id}
            className={`option-card ${selectedId === option.id ? 'selected' : ''}`}
            onClick={() => setSelectedId(option.id)}
            style={{ animationDelay: `${idx * 0.1}s` }}
          >
            <div className="option-emoji">{option.emoji}</div>
            <div className="option-header">
              <h3>{option.name}</h3>
              {selectedId === option.id && <span className="option-check">✓</span>}
            </div>
            <p className="option-desc">{option.description}</p>

            <div className="option-tags">
              {option.tags.map(tag => (
                <span key={tag} className={`option-tag ${tag === '推荐' ? 'recommended' : ''}`}>
                  {tag === '推荐' && <Star size={10} />} {tag}
                </span>
              ))}
            </div>

            <div className="option-stats">
              <div className="option-stat">
                <Clock size={14} />
                <span>每日 {option.profile.timePerDay} 分钟</span>
              </div>
              <div className="option-stat">
                <BarChart3 size={14} />
                <span>难度 {option.profile.difficultyTolerance}/10</span>
              </div>
            </div>

            <div className="option-preview">
              <span className="preview-label">前三日任务预览</span>
              {option.previewTasks.map(day => (
                <div key={day.day} className="preview-day">
                  <span className="preview-day-label">第{day.day}天</span>
                  {day.tasks.map((t, i) => (
                    <div key={i} className="preview-task-chip">
                      <span className={`task-difficulty difficulty-${t.difficulty}`}>
                        {'★'.repeat(t.difficulty)}
                      </span>
                      <span>{t.title}</span>
                      <span className="preview-mins">{t.minutes}min</span>
                    </div>
                  ))}
                </div>
              ))}
            </div>

            <div className="option-strategy">
              <Sparkles size={12} />
              <span>{option.strategy}</span>
            </div>
          </div>
        ))}
      </div>

      <div className="options-actions">
        <button className="btn btn-secondary" onClick={onBack}>返回修改</button>
        <button
          className="btn btn-accent"
          onClick={handleConfirm}
          disabled={!selectedId}
        >
          <Zap size={16} />
          {selectedId ? '确认选择，生成计划' : '请先选择一个方案'}
        </button>
      </div>
    </div>
  );
}
