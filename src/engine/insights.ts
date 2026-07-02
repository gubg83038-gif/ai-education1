import type { Plan, DailyLog, InsightReport, Task } from '../types';

export function generateInsights(plan: Plan, logs: DailyLog[]): InsightReport {
  const allTasks = plan.weeks.flatMap(w => w.tasks);
  const completedTasks = allTasks.filter(t => t.status === 'completed');
  const delayedTasks = allTasks.filter(t => t.status === 'delayed');

  const overallCompletion = allTasks.length > 0
    ? Math.round((completedTasks.length / allTasks.length) * 100)
    : 0;

  const weeklyTrend = plan.weeks.map(w => {
    const weekTasks = w.tasks;
    const completed = weekTasks.filter(t => t.status === 'completed').length;
    return {
      week: w.weekNumber,
      rate: weekTasks.length > 0 ? Math.round((completed / weekTasks.length) * 100) : 0,
    };
  });

  const peakPerformanceTime = analyzeBestTime(completedTasks);
  const procrastinationPatterns = analyzeProcrastination(delayedTasks, logs);
  const difficultyAnalysis = analyzeDifficulty(allTasks);
  const recommendations = generateRecommendations(allTasks, logs, overallCompletion);
  const cognitiveProfile = buildCognitiveProfile(allTasks, logs);

  return {
    overallCompletion,
    weeklyTrend,
    peakPerformanceTime,
    procrastinationPatterns,
    difficultyAnalysis,
    recommendations,
    cognitiveProfile,
  };
}

function analyzeBestTime(tasks: Task[]): string {
  const completed = tasks.filter(t => t.completedAt);
  if (completed.length === 0) return '数据不足，继续记录以获取分析';

  const hourCounts: Record<number, number> = {};
  completed.forEach(t => {
    if (t.completedAt) {
      const hour = new Date(t.completedAt).getHours();
      hourCounts[hour] = (hourCounts[hour] || 0) + 1;
    }
  });

  let bestHour = 9;
  let maxCount = 0;
  for (const [hour, count] of Object.entries(hourCounts)) {
    if (count > maxCount) {
      maxCount = count;
      bestHour = Number(hour);
    }
  }

  if (bestHour < 8) return '清晨 (6:00-8:00) - 你是早起型学习者';
  if (bestHour < 12) return '上午 (8:00-12:00) - 上午是你的黄金时段';
  if (bestHour < 14) return '午后 (12:00-14:00) - 午后效率较高';
  if (bestHour < 18) return '下午 (14:00-18:00) - 下午是你的高效期';
  return '晚间 (18:00-24:00) - 你是夜猫子型学习者';
}

function analyzeProcrastination(delayedTasks: Task[], logs: DailyLog[]) {
  const patterns: InsightReport['procrastinationPatterns'] = [];

  const byDifficulty: Record<number, number> = {};
  delayedTasks.forEach(t => {
    byDifficulty[t.difficulty] = (byDifficulty[t.difficulty] || 0) + 1;
  });

  let maxDifficulty = 1;
  let maxCount = 0;
  for (const [diff, count] of Object.entries(byDifficulty)) {
    if (count > maxCount) {
      maxCount = count;
      maxDifficulty = Number(diff);
    }
  }

  if (maxCount > 0) {
    patterns.push({
      pattern: `难度${maxDifficulty}的任务最容易拖延`,
      frequency: maxCount,
      suggestion: maxDifficulty >= 4
        ? '建议将高难度任务拆分为更小的子任务，降低启动门槛'
        : '尝试使用番茄钟法，设定25分钟专注时间',
    });
  }

  const byCategory: Record<string, number> = {};
  delayedTasks.forEach(t => {
    byCategory[t.category] = (byCategory[t.category] || 0) + 1;
  });

  let topCategory = '';
  let topCatCount = 0;
  for (const [cat, count] of Object.entries(byCategory)) {
    if (count > topCatCount) {
      topCatCount = count;
      topCategory = cat;
    }
  }

  if (topCatCount > 0) {
    patterns.push({
      pattern: `"${topCategory}"类任务的拖延频率最高(${topCatCount}次)`,
      frequency: topCatCount,
      suggestion: topCategory === '输出'
        ? '输出类任务往往需要更多心理准备，建议先做5分钟启动'
        : `尝试将"${topCategory}"类任务安排在精力最充沛的时段`,
    });
  }

  const lowEnergyLogs = logs.filter(l => l.energyLevel <= 3);
  if (lowEnergyLogs.length > 0) {
    patterns.push({
      pattern: `有${lowEnergyLogs.length}天能量水平较低，与拖延高度相关`,
      frequency: lowEnergyLogs.length,
      suggestion: '低能量日可以安排低难度任务，保持学习连续性而非追求高强度',
    });
  }

  return patterns;
}

function analyzeDifficulty(tasks: Task[]) {
  const analysis: InsightReport['difficultyAnalysis'] = [];
  for (let level = 1; level <= 5; level++) {
    const levelTasks = tasks.filter(t => t.difficulty === level);
    if (levelTasks.length === 0) continue;
    const completed = levelTasks.filter(t => t.status === 'completed').length;
    const delayed = levelTasks.filter(t => t.status === 'delayed');
    const avgDelay = delayed.length > 0
      ? Math.round(delayed.reduce((sum, t) => sum + t.estimatedMinutes, 0) / delayed.length)
      : 0;

    analysis.push({
      level,
      completionRate: Math.round((completed / levelTasks.length) * 100),
      avgDelay,
    });
  }
  return analysis;
}

function generateRecommendations(tasks: Task[], logs: DailyLog[], overallRate: number): string[] {
  const recs: string[] = [];

  if (overallRate < 30) {
    recs.push('当前完成率较低，建议适当降低每日任务量，先建立完成习惯再逐步增加');
    recs.push('尝试"最小行动法"：每天只承诺完成1个核心任务');
  } else if (overallRate < 60) {
    recs.push('完成率正在提升中，建议关注被延迟任务的规律，针对性调整');
  } else if (overallRate >= 80) {
    recs.push('完成率优秀！可以考虑适当提高任务难度或增加挑战性目标');
  }

  const avgEnergy = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + l.energyLevel, 0) / logs.length * 10) / 10
    : 0;
  if (avgEnergy > 0 && avgEnergy < 4) {
    recs.push('平均精力水平偏低，检查睡眠和休息是否充足');
  }

  const skipped = tasks.filter(t => t.status === 'skipped').length;
  if (skipped > tasks.length * 0.2) {
    recs.push(`跳过了${skipped}个任务，建议审视这些任务是否真的必要`);
  }

  recs.push('每周安排一次15分钟的"计划回顾"，根据实际情况调整下周任务分配');

  return recs;
}

function buildCognitiveProfile(tasks: Task[], logs: DailyLog[]) {
  const completedByCat: Record<string, number> = {};
  const totalByCat: Record<string, number> = {};
  tasks.forEach(t => {
    totalByCat[t.category] = (totalByCat[t.category] || 0) + 1;
    if (t.status === 'completed') {
      completedByCat[t.category] = (completedByCat[t.category] || 0) + 1;
    }
  });

  let bestCat = '';
  let bestRate = 0;
  let worstCat = '';
  let worstRate = 1;
  for (const [cat, total] of Object.entries(totalByCat)) {
    const rate = (completedByCat[cat] || 0) / total;
    if (rate > bestRate) { bestRate = rate; bestCat = cat; }
    if (rate < worstRate) { worstRate = rate; worstCat = cat; }
  }

  const avgFocus = logs.length > 0
    ? Math.round(logs.reduce((s, l) => s + l.focusLevel, 0) / logs.length * 10) / 10
    : 0;

  const optimalSession = avgFocus >= 8 ? 50 : avgFocus >= 6 ? 35 : 25;

  return {
    bestTimeOfDay: '上午',
    optimalSessionLength: optimalSession,
    preferredTaskType: bestCat || '混合型',
    struggleAreas: worstCat ? [worstCat, '高难度任务'] : [],
  };
}
