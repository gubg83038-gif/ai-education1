import type { UserProfile, Task, WeekPlan, Plan } from '../types';

const LEARNING_ACTIONS: Record<string, { title: string; desc: string; cat: string; baseMinutes: number; difficulty: number }[]> = {
  reading: [
    { title: '阅读核心材料', desc: '精读当周主题相关材料，做笔记', cat: '阅读', baseMinutes: 45, difficulty: 3 },
    { title: '整理阅读笔记', desc: '将阅读内容整理成思维导图', cat: '整理', baseMinutes: 30, difficulty: 2 },
    { title: '知识复盘', desc: '回顾本周阅读内容，整理要点', cat: '复习', baseMinutes: 25, difficulty: 2 },
    { title: '深度研读论文/文献', desc: '选择一篇相关论文深入研读', cat: '阅读', baseMinutes: 60, difficulty: 5 },
    { title: '写读书摘要', desc: '用自己语言总结所学内容', cat: '输出', baseMinutes: 35, difficulty: 3 },
    { title: '对比阅读', desc: '阅读不同作者对同一主题的观点', cat: '阅读', baseMinutes: 40, difficulty: 4 },
    { title: '术语表整理', desc: '整理并记忆核心术语和概念', cat: '整理', baseMinutes: 20, difficulty: 1 },
  ],
  handsOn: [
    { title: '动手实践项目', desc: '完成一个小型实践项目', cat: '实践', baseMinutes: 60, difficulty: 4 },
    { title: '练习题集', desc: '完成一组针对性练习', cat: '练习', baseMinutes: 30, difficulty: 2 },
    { title: '代码/实验复现', desc: '复现一个经典案例或实验', cat: '实践', baseMinutes: 50, difficulty: 4 },
    { title: '自由创作练习', desc: '基于所学自由创作作品', cat: '实践', baseMinutes: 45, difficulty: 3 },
    { title: '技能挑战', desc: '给自己设置一个小挑战并完成', cat: '练习', baseMinutes: 35, difficulty: 3 },
    { title: '项目进度推进', desc: '在主要项目上取得可量化的进展', cat: '实践', baseMinutes: 55, difficulty: 4 },
    { title: '调试与优化', desc: '找出之前作品中的问题并改进', cat: '实践', baseMinutes: 40, difficulty: 3 },
  ],
  visual: [
    { title: '观看教学视频', desc: '观看精选的教学视频并做笔记', cat: '观看', baseMinutes: 30, difficulty: 1 },
    { title: '制作知识图谱', desc: '用可视化工具绘制知识结构图', cat: '整理', baseMinutes: 35, difficulty: 3 },
    { title: '画图理解概念', desc: '用图表或插图解释核心概念', cat: '输出', baseMinutes: 30, difficulty: 2 },
    { title: '看案例拆解视频', desc: '观看并分析真实案例', cat: '观看', baseMinutes: 40, difficulty: 2 },
    { title: '制作讲解PPT/视频', desc: '把学到的内容做成讲解材料', cat: '输出', baseMinutes: 50, difficulty: 4 },
    { title: '信息图设计', desc: '将知识转化为信息图', cat: '输出', baseMinutes: 40, difficulty: 3 },
    { title: '视觉笔记', desc: '用绘图方式记录学习要点', cat: '整理', baseMinutes: 25, difficulty: 2 },
  ],
  mixed: [
    { title: '主题阅读', desc: '阅读当周主题的核心材料', cat: '阅读', baseMinutes: 35, difficulty: 2 },
    { title: '动手练习', desc: '完成一组实践练习', cat: '练习', baseMinutes: 35, difficulty: 3 },
    { title: '观看讲解', desc: '观看补充讲解视频', cat: '观看', baseMinutes: 25, difficulty: 1 },
    { title: '综合项目推进', desc: '在综合项目上取得进展', cat: '实践', baseMinutes: 45, difficulty: 4 },
    { title: '知识输出', desc: '写博客、做分享或教别人', cat: '输出', baseMinutes: 40, difficulty: 4 },
    { title: '错题/问题回顾', desc: '回顾之前遇到的难点', cat: '复习', baseMinutes: 30, difficulty: 3 },
    { title: '交叉学科探索', desc: '探索与主题相关的交叉领域', cat: '阅读', baseMinutes: 35, difficulty: 3 },
  ],
};

const WEEK_THEMES = ['基础搭建', '深入探索', '综合实践', '巩固与突破'];

function parseGoal(goal: string): string[] {
  return goal.split(/[,，、;；]/).map(s => s.trim()).filter(Boolean);
}

function generateTaskId(week: number, day: number, index: number): string {
  return `w${week}d${day}t${index}`;
}

function shuffleArray<T>(arr: T[]): T[] {
  const a = [...arr];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

export function generatePlan(profile: UserProfile): Plan {
  const subgoals = parseGoal(profile.goal);
  const actions = LEARNING_ACTIONS[profile.learningStyle] || LEARNING_ACTIONS.mixed;
  const weeks: WeekPlan[] = [];

  for (let w = 1; w <= 4; w++) {
    const theme = WEEK_THEMES[w - 1];
    const weekGoals = subgoals.map((g, i) => {
      const progress = Math.round((w / 4) * 100);
      const goalText = i === 0
        ? `${g} - 完成${theme}阶段(${progress}%)`
        : `${g} - ${theme}阶段推进`;
      return goalText;
    });

    const tasks: Task[] = [];
    const daysInWeek = 7;
    for (let d = 1; d <= daysInWeek; d++) {
      const isRestDay = (profile.timePerDay <= 30 && (d === 6 || d === 7));
      if (isRestDay) {
        tasks.push({
          id: generateTaskId(w, d, 0),
          title: '休息与反思',
          description: '回顾本周进展，放松身心，为下周充电',
          estimatedMinutes: 15,
          difficulty: 1,
          week: w,
          day: d,
          date: getDateString(profile.startDate, (w - 1) * 7 + d - 1),
          status: 'pending',
          category: '休息',
          order: 0,
        });
        continue;
      }

      const dayActions = getDayActions(actions, profile, w, d);
      let remainingMinutes = profile.timePerDay;
      let taskIndex = 0;

      for (const action of dayActions) {
        if (remainingMinutes <= 10) break;
        const adjustedMinutes = Math.min(action.baseMinutes, remainingMinutes);
        remainingMinutes -= adjustedMinutes;

        tasks.push({
          id: generateTaskId(w, d, taskIndex),
          title: action.title,
          description: action.desc,
          estimatedMinutes: adjustedMinutes,
          difficulty: adjustDifficulty(action.difficulty, profile.difficultyTolerance, w),
          week: w,
          day: d,
          date: getDateString(profile.startDate, (w - 1) * 7 + d - 1),
          status: 'pending',
          category: action.cat,
          order: taskIndex,
        });
        taskIndex++;
      }
    }

    weeks.push({ weekNumber: w, theme, tasks, goals: weekGoals });
  }

  return {
    id: `plan_${Date.now()}`,
    profile,
    weeks,
    createdAt: new Date().toISOString(),
  };
}

function getDayActions(
  actions: typeof LEARNING_ACTIONS[string],
  profile: UserProfile,
  week: number,
  day: number,
) {
  const shuffled = shuffleArray(actions);
  const count = Math.min(
    Math.max(2, Math.floor(profile.timePerDay / 25)),
    shuffled.length,
  );

  const selected = shuffled.slice(0, count);
  selected.sort((a, b) => {
    if (week <= 2) return a.difficulty - b.difficulty;
    return b.difficulty - a.difficulty;
  });

  if (day === 3 || day === 7) {
    const review = actions.find(a => a.cat === '复习' || a.cat === '整理');
    if (review && !selected.find(s => s.cat === review.cat)) {
      selected[selected.length - 1] = review;
    }
  }

  return selected;
}

function adjustDifficulty(baseDifficulty: number, tolerance: number, week: number): number {
  const toleranceFactor = (tolerance - 5) / 10;
  const weekFactor = (week - 1) * 0.1;
  return Math.max(1, Math.min(5, Math.round(baseDifficulty + toleranceFactor + weekFactor)));
}

function getDateString(startDate: string, offsetDays: number): string {
  const d = new Date(startDate);
  d.setDate(d.getDate() + offsetDays);
  return d.toISOString().split('T')[0];
}

export function getTodayTasks(plan: Plan): Task[] {
  const today = new Date().toISOString().split('T')[0];
  return plan.weeks.flatMap(w => w.tasks).filter(t => t.date === today);
}

export function getCurrentWeekTasks(plan: Plan): Task[] {
  const today = new Date().toISOString().split('T')[0];
  const currentWeek = plan.weeks.find(w =>
    w.tasks.some(t => t.date === today),
  );
  return currentWeek?.tasks || plan.weeks[0]?.tasks || [];
}
