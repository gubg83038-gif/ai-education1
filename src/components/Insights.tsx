import { useMemo, useState, useEffect } from 'react';
import type { Plan, InsightReport } from '../types';
import { generateInsights } from '../engine/insights';
import { getDailyLogs } from '../data/store';
import { aiGetInsights } from '../lib/ai';
import {
  TrendingUp, Target, AlertTriangle, Lightbulb, Brain,
  Clock, Zap, Star, Activity, ChevronRight, Sparkles,
} from 'lucide-react';
import { GrowthMetrics } from './Coach';

interface Props {
  plan: Plan;
  onBack: () => void;
}

export default function Insights({ plan, onBack }: Props) {
  const dailyLogs = getDailyLogs();
  const fallbackReport = useMemo(() => generateInsights(plan, dailyLogs), [plan, dailyLogs]);
  const [aiReport, setAiReport] = useState<{ overallAssessment?: string; recommendations?: string[] } | null>(null);

  useEffect(() => {
    const allTasks = plan.weeks.flatMap(w => w.tasks).map(t => ({
      title: t.title, status: t.status, difficulty: t.difficulty, category: t.category, delayedReason: t.delayedReason,
    }));
    aiGetInsights({ allTasks: allTasks as any, dailyLogs }).then(res => {
      if (res.success) setAiReport(res as any);
    });
  }, [plan]);

  const recommendations = aiReport?.recommendations || fallbackReport.recommendations;

  return (
    <div className="insights-page">
      <header className="insights-header">
        <button className="btn btn-ghost" onClick={onBack}>
          <ChevronRight size={16} className="rotate-180" /> 返回
        </button>
        <h1>洞察报告</h1>
        <p>基于你的执行数据，AI 分析你的学习模式</p>
      </header>

      {aiReport?.overallAssessment && (
        <div className="coach-banner" style={{ marginBottom: 20 }}>
          <div className="coach-banner-header"><Sparkles size={14} /> AI 总评</div>
          <p>{aiReport.overallAssessment}</p>
        </div>
      )}

      <div className="insights-grid">
        <OverallCard report={fallbackReport} />
        <WeeklyTrendCard report={fallbackReport} />
        <CognitiveCard report={fallbackReport} />
        <DifficultyCard report={fallbackReport} />
        <ProcrastinationCard report={fallbackReport} />
        <RecommendationsCard report={fallbackReport} aiRecs={recommendations} />
        <GrowthMetrics plan={plan} />
      </div>
    </div>
  );
}

function OverallCard({ report }: { report: InsightReport }) {
  const rate = report.overallCompletion;
  const color = rate >= 80 ? 'var(--success)' : rate >= 50 ? 'var(--warning)' : 'var(--danger)';
  const emoji = rate >= 80 ? '🔥' : rate >= 50 ? '💪' : '🌱';

  return (
    <div className="insight-card overall-card">
      <div className="card-icon">
        <Target size={24} />
      </div>
      <h3>总体完成率</h3>
      <div className="big-number" style={{ color }}>{rate}%</div>
      <p className="card-sub">{emoji} {rate >= 80 ? '表现优异！' : rate >= 50 ? '稳步前进中' : '还有提升空间'}</p>
      <div className="progress-ring">
        <svg viewBox="0 0 100 100">
          <circle cx="50" cy="50" r="42" fill="none" stroke="var(--border)" strokeWidth="8" />
          <circle
            cx="50" cy="50" r="42" fill="none" stroke={color} strokeWidth="8"
            strokeDasharray={`${rate * 2.64} 264`} strokeLinecap="round"
            transform="rotate(-90 50 50)"
          />
        </svg>
      </div>
    </div>
  );
}

function WeeklyTrendCard({ report }: { report: InsightReport }) {
  const maxRate = Math.max(...report.weeklyTrend.map(w => w.rate), 1);

  return (
    <div className="insight-card">
      <div className="card-icon">
        <TrendingUp size={24} />
      </div>
      <h3>四周趋势</h3>
      <div className="weekly-bars">
        {report.weeklyTrend.map(w => (
          <div key={w.week} className="week-bar-item">
            <div className="bar-container">
              <div
                className="bar-fill"
                style={{ height: `${(w.rate / Math.max(maxRate, 1)) * 100}%` }}
              />
            </div>
            <span className="bar-label">W{w.week}</span>
            <span className="bar-value">{w.rate}%</span>
          </div>
        ))}
      </div>
      <p className="card-sub">
        {report.weeklyTrend[3]?.rate > report.weeklyTrend[0]?.rate
          ? '📈 整体呈上升趋势，继续保持！'
          : '📉 后期有所回落，注意保持节奏'}
      </p>
    </div>
  );
}

function CognitiveCard({ report }: { report: InsightReport }) {
  const cp = report.cognitiveProfile;
  return (
    <div className="insight-card">
      <div className="card-icon">
        <Brain size={24} />
      </div>
      <h3>认知画像</h3>
      <div className="profile-list">
        <div className="profile-item">
          <Clock size={14} />
          <span>最佳时段</span>
          <strong>{cp.bestTimeOfDay}</strong>
        </div>
        <div className="profile-item">
          <Zap size={14} />
          <span>最佳学习时长</span>
          <strong>{cp.optimalSessionLength}分钟/次</strong>
        </div>
        <div className="profile-item">
          <Star size={14} />
          <span>擅长任务类型</span>
          <strong>{cp.preferredTaskType}</strong>
        </div>
      </div>
      {cp.struggleAreas.length > 0 && (
        <div className="struggle-tags">
          <span className="tag-label">需要加强:</span>
          {cp.struggleAreas.map((area, i) => (
            <span key={i} className="tag tag-struggle">{area}</span>
          ))}
        </div>
      )}
    </div>
  );
}

function DifficultyCard({ report }: { report: InsightReport }) {
  return (
    <div className="insight-card">
      <div className="card-icon">
        <Activity size={24} />
      </div>
      <h3>难度适应分析</h3>
      <div className="difficulty-grid">
        {report.difficultyAnalysis.map(d => (
          <div key={d.level} className="diff-item">
            <div className="diff-stars">{'★'.repeat(d.level)}{'☆'.repeat(5 - d.level)}</div>
            <div className="diff-bar">
              <div
                className="diff-fill"
                style={{
                  width: `${d.completionRate}%`,
                  backgroundColor: d.completionRate >= 70 ? 'var(--success)' : d.completionRate >= 40 ? 'var(--warning)' : 'var(--danger)',
                }}
              />
            </div>
            <span className="diff-percent">{d.completionRate}%</span>
          </div>
        ))}
      </div>
      <p className="card-sub">
        {report.difficultyAnalysis.some(d => d.level >= 4 && d.completionRate < 50)
          ? '高难度任务完成率偏低，建议降低难度或增加准备时间'
          : '各难度任务完成率较为均衡'}
      </p>
    </div>
  );
}

function ProcrastinationCard({ report }: { report: InsightReport }) {
  const patterns = report.procrastinationPatterns;
  return (
    <div className="insight-card">
      <div className="card-icon">
        <AlertTriangle size={24} />
      </div>
      <h3>拖延模式分析</h3>
      {patterns.length === 0 ? (
        <p className="card-sub">暂无足够数据进行分析，继续使用以获取洞察</p>
      ) : (
        <div className="patterns-list">
          {patterns.map((p, i) => (
            <div key={i} className="pattern-item">
              <div className="pattern-header">
                <span className="pattern-name">{p.pattern}</span>
                <span className="pattern-count">x{p.frequency}</span>
              </div>
              <p className="pattern-suggestion">💡 {p.suggestion}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function RecommendationsCard({ report, aiRecs }: { report: InsightReport; aiRecs?: string[] }) {
  const recs = aiRecs || report.recommendations;
  return (
    <div className="insight-card recommendations-card">
      <div className="card-icon">
        <Lightbulb size={24} />
      </div>
      <h3>AI 个性化建议</h3>
      <ul className="recommendations-list">
        {recs.map((rec, i) => (
          <li key={i}>
            <span className="rec-num">{i + 1}</span>
            <span>{rec}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
