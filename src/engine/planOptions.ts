import type { UserProfile } from '../types';

export interface PlanOption {
  id: string;
  name: string;
  emoji: string;
  description: string;
  strategy: string;
  profile: UserProfile;
  previewTasks: { day: number; tasks: { title: string; difficulty: number; minutes: number }[] }[];
  tags: string[];
}

export function generatePlanOptions(baseProfile: UserProfile & { planName: string }): PlanOption[] {
  const { planName, ...profile } = baseProfile;
  const options: PlanOption[] = [];

  // Option 1: Steady & Balanced
  const steadyProfile: UserProfile = {
    ...profile,
    timePerDay: Math.max(30, profile.timePerDay),
    difficultyTolerance: Math.max(3, Math.min(7, profile.difficultyTolerance)),
    learningStyles: profile.learningStyles,
  };
  options.push({
    id: 'steady',
    name: '稳扎稳打',
    emoji: '🎯',
    description: '均衡分配理论学习和实践练习，每天任务量适中，难度稳步递增，适合大多数学习者。',
    strategy: '采用2周递进策略：基础搭建→综合实践，每周穿插不同类型的任务保持新鲜感。',
    profile: steadyProfile,
    previewTasks: generatePreview(steadyProfile, 'balanced'),
    tags: ['均衡', '推荐', '2周递进'],
  });

  // Option 2: Light & Easy
  const lightProfile: UserProfile = {
    ...profile,
    timePerDay: Math.max(15, Math.floor(profile.timePerDay * 0.6)),
    difficultyTolerance: Math.max(1, profile.difficultyTolerance - 2),
    learningStyles: profile.learningStyles,
  };
  options.push({
    id: 'light',
    name: '轻量入门',
    emoji: '🌱',
    description: '降低每日任务量和难度，先建立每日学习的习惯和信心，适合刚开始培养学习习惯或时间紧张的用户。',
    strategy: '以"最小可行行动"为原则，每天只安排2-3个短任务，重点在保持连续性而非强度。',
    profile: lightProfile,
    previewTasks: generatePreview(lightProfile, 'light'),
    tags: ['初学者', '低压力', '重习惯'],
  });

  // Option 3: Intensive
  const intensiveProfile: UserProfile = {
    ...profile,
    timePerDay: Math.min(240, profile.timePerDay + Math.floor(profile.timePerDay * 0.4)),
    difficultyTolerance: Math.min(10, profile.difficultyTolerance + 2),
    learningStyles: profile.learningStyles,
  };
  options.push({
    id: 'intensive',
    name: '冲刺加速',
    emoji: '🚀',
    description: '高密度任务安排，难度快速爬升，适合时间充裕、目标紧迫、抗压能力强的学习者。',
    strategy: '压缩学习周期，每天安排更多任务，快速从基础过渡到综合应用，用高强度换取高效率。',
    profile: intensiveProfile,
    previewTasks: generatePreview(intensiveProfile, 'intensive'),
    tags: ['高强度', '快速见效', '挑战型'],
  });

  // Option 4: Practice-heavy
  const practiceProfile: UserProfile = {
    ...profile,
    timePerDay: profile.timePerDay,
    difficultyTolerance: profile.difficultyTolerance,
    learningStyles: profile.learningStyles.includes('mixed')
      ? ['hands-on']
      : [...profile.learningStyles.filter(s => s !== 'visual' && s !== 'reading'), 'hands-on'],
  };
  options.push({
    id: 'practice',
    name: '实践导向',
    emoji: '🔧',
    description: '大幅增加动手实践类任务的比例，减少纯阅读和观看，通过"做中学"快速掌握技能。',
    strategy: '实践任务占比60%以上，每个理论知识点都配有对应的练习或项目，强调输出倒逼输入。',
    profile: practiceProfile,
    previewTasks: generatePreview(practiceProfile, 'hands-on'),
    tags: ['动手实践', '项目驱动', '做中学'],
  });

  return options;
}

function generatePreview(profile: UserProfile, variant: string) {
  const preview: PlanOption['previewTasks'] = [];

  for (let d = 1; d <= 3; d++) {
    const tasks: { title: string; difficulty: number; minutes: number }[] = [];

    if (variant === 'light') {
      tasks.push({ title: '核心概念学习', difficulty: 2, minutes: Math.floor(profile.timePerDay * 0.6) });
      if (profile.timePerDay > 20) {
        tasks.push({ title: '简单练习巩固', difficulty: 2, minutes: Math.floor(profile.timePerDay * 0.4) });
      }
    } else if (variant === 'intensive') {
      tasks.push({ title: '主题深度学习', difficulty: 4, minutes: Math.floor(profile.timePerDay * 0.4) });
      tasks.push({ title: '高强度练习', difficulty: 4, minutes: Math.floor(profile.timePerDay * 0.3) });
      tasks.push({ title: '复习与复盘', difficulty: 3, minutes: Math.floor(profile.timePerDay * 0.3) });
    } else if (variant === 'hands-on') {
      tasks.push({ title: '动手实践项目', difficulty: 4, minutes: Math.floor(profile.timePerDay * 0.5) });
      tasks.push({ title: '理论知识补充', difficulty: 2, minutes: Math.floor(profile.timePerDay * 0.25) });
      tasks.push({ title: '成果检查与优化', difficulty: 3, minutes: Math.floor(profile.timePerDay * 0.25) });
    } else {
      tasks.push({ title: '核心材料阅读', difficulty: 3, minutes: Math.floor(profile.timePerDay * 0.35) });
      tasks.push({ title: '针对性练习', difficulty: 3, minutes: Math.floor(profile.timePerDay * 0.35) });
      tasks.push({ title: '知识整理与回顾', difficulty: 2, minutes: Math.floor(profile.timePerDay * 0.3) });
    }

    preview.push({ day: d, tasks });
  }

  return preview;
}
