import { useState } from 'react';
import type { UserProfile } from '../types';
import { generatePlan } from '../engine/planGenerator';
import { addPlan } from '../data/store';
import { Target, Clock, BarChart3, BookOpen, AlertTriangle, FileText } from 'lucide-react';

interface Props {
  onComplete: () => void;
}

const DIMENSIONS = [
  {
    key: 'goal' as const,
    label: '学习目标',
    icon: Target,
    placeholder: '例如：通过PMP认证、掌握Python数据分析、雅思7分',
    hint: '用逗号分隔多个子目标，系统会自动拆解',
    type: 'text' as const,
  },
  {
    key: 'planName' as const,
    label: '计划名称',
    icon: FileText,
    placeholder: '例如：2024考研复习、Java学习冲刺',
    hint: '给你的计划起个名字，方便区分多个计划',
    type: 'text' as const,
  },
  {
    key: 'timePerDay' as const,
    label: '每日可用时间（分钟）',
    icon: Clock,
    placeholder: '30-180',
    hint: '建议如实填写，过高估计会导致计划难以执行',
    type: 'range' as const,
    min: 15,
    max: 240,
    step: 5,
  },
  {
    key: 'difficultyTolerance' as const,
    label: '难度承受力（1-10）',
    icon: BarChart3,
    placeholder: '5',
    hint: '1=只接受简单任务，10=喜欢高难度挑战',
    type: 'range' as const,
    min: 1,
    max: 10,
    step: 1,
  },
  {
    key: 'learningStyle' as const,
    label: '学习风格偏好',
    icon: BookOpen,
    placeholder: '',
    hint: '选择最符合你习惯的学习方式',
    type: 'select' as const,
    options: [
      { value: 'visual', label: '视觉型 - 偏好视频、图表、图像' },
      { value: 'reading', label: '阅读型 - 偏好文字、书籍、文档' },
      { value: 'hands-on', label: '实践型 - 偏好动手操作、做项目' },
      { value: 'mixed', label: '混合型 - 多种方式结合' },
    ],
  },
  {
    key: 'constraints' as const,
    label: '限制条件与备注',
    icon: AlertTriangle,
    placeholder: '例如：周末只能学习1小时、周三有固定会议',
    hint: '任何可能影响计划的约束条件',
    type: 'text' as const,
  },
];

export default function Onboarding({ onComplete }: Props) {
  const [profile, setProfile] = useState<UserProfile & { planName: string }>({
    goal: '',
    planName: '',
    timePerDay: 60,
    difficultyTolerance: 5,
    learningStyle: 'mixed',
    constraints: '',
    startDate: new Date().toISOString().split('T')[0],
  });

  const [step, setStep] = useState(0);
  const [isGenerating, setIsGenerating] = useState(false);

  const dim = DIMENSIONS[step];
  const Icon = dim.icon;

  const handleNext = () => {
    if (step < DIMENSIONS.length - 1) {
      setStep(step + 1);
    } else {
      setIsGenerating(true);
      setTimeout(() => {
        const plan = generatePlan(profile);
        plan.name = profile.planName || profile.goal.slice(0, 20);
        addPlan(plan);
        setIsGenerating(false);
        onComplete();
      }, 1500);
    }
  };

  const handlePrev = () => {
    if (step > 0) setStep(step - 1);
  };

  const canNext = () => {
    if (dim.key === 'goal') return profile.goal.trim().length > 0;
    if (dim.key === 'planName') return profile.planName.trim().length > 0;
    return true;
  };

  if (isGenerating) {
    return (
      <div className="onboarding generating">
        <div className="generating-content">
          <div className="spinner" />
          <h2>AI 正在为你生成专属学习计划...</h2>
          <p>分析目标结构 · 匹配学习风格 · 优化任务分配</p>
          <div className="progress-dots">
            <span className="dot active" />
            <span className="dot active" />
            <span className="dot" />
            <span className="dot" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="onboarding">
      <div className="onboarding-card">
        <div className="step-indicator">
          {DIMENSIONS.map((_, i) => (
            <div key={i} className={`step-dot ${i === step ? 'active' : i < step ? 'done' : ''}`} />
          ))}
        </div>

        <div className="dimension-content">
          <div className="dimension-header">
            <Icon size={32} />
            <h2>{dim.label}</h2>
          </div>
          <p className="dimension-hint">{dim.hint}</p>

          {dim.type === 'text' && (
            <textarea
              className="input-text"
              value={String(profile[dim.key] || '')}
              onChange={e => setProfile({ ...profile, [dim.key]: e.target.value })}
              placeholder={dim.placeholder}
              rows={3}
              autoFocus
            />
          )}

          {dim.type === 'range' && (
            <div className="range-container">
              <span className="range-value">{profile[dim.key] as number}{dim.key === 'timePerDay' ? '分钟' : ''}</span>
              <input
                type="range"
                min={dim.min}
                max={dim.max}
                step={dim.step}
                value={profile[dim.key] as number}
                onChange={e => setProfile({ ...profile, [dim.key]: Number(e.target.value) })}
                className="input-range"
              />
              <div className="range-labels">
                <span>{dim.min}{dim.key === 'timePerDay' ? 'min' : ''}</span>
                <span>{dim.max}{dim.key === 'timePerDay' ? 'min' : ''}</span>
              </div>
            </div>
          )}

          {dim.type === 'select' && (
            <div className="select-group">
              {dim.options!.map(opt => (
                <button
                  key={opt.value}
                  className={`select-option ${profile.learningStyle === opt.value ? 'selected' : ''}`}
                  onClick={() => setProfile({ ...profile, learningStyle: opt.value as UserProfile['learningStyle'] })}
                >
                  {opt.label}
                </button>
              ))}
            </div>
          )}

          {dim.key === 'constraints' && (
            <div className="date-picker">
              <label>计划开始日期</label>
              <input
                type="date"
                value={profile.startDate}
                onChange={e => setProfile({ ...profile, startDate: e.target.value })}
                className="input-date"
              />
            </div>
          )}
        </div>

        <div className="onboarding-actions">
          {step > 0 && (
            <button className="btn btn-secondary" onClick={handlePrev}>上一步</button>
          )}
          <button className="btn btn-primary" onClick={handleNext} disabled={!canNext()}>
            {step === DIMENSIONS.length - 1 ? '生成计划' : '下一步'}
          </button>
        </div>
      </div>
    </div>
  );
}
