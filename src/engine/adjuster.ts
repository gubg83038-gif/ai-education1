import type { Plan, Task, TaskStatus } from '../types';

export function adjustPlan(plan: Plan, changedTask: Task, newStatus: TaskStatus): Plan {
  const updatedPlan = structuredClone(plan);
  const allTasks = updatedPlan.weeks.flatMap(w => w.tasks);
  const task = allTasks.find(t => t.id === changedTask.id);
  if (!task) return plan;

  task.status = newStatus;
  const now = new Date().toISOString();

  if (newStatus === 'completed') {
    task.completedAt = now;
    task.actualMinutes = task.estimatedMinutes;
  }

  if (newStatus === 'delayed') {
    handleDelay(updatedPlan, task);
  }

  if (newStatus === 'skipped') {
    handleSkip(updatedPlan, task);
  }

  return updatedPlan;
}

function handleDelay(plan: Plan, delayedTask: Task): void {
  const allTasks = plan.weeks.flatMap(w => w.tasks);
  const sameDayTasks = allTasks.filter(
    t => t.week === delayedTask.week && t.day === delayedTask.day && t.id !== delayedTask.id && t.status === 'pending',
  );

  const extraPerTask = Math.ceil(delayedTask.estimatedMinutes / Math.max(sameDayTasks.length, 1));
  sameDayTasks.forEach(t => {
    t.estimatedMinutes += extraPerTask;
  });

  const nextDay = delayedTask.day + 1 <= 7 ? delayedTask.day + 1 : 1;
  const nextWeek = delayedTask.day + 1 <= 7 ? delayedTask.week : delayedTask.week + 1;

  if (nextWeek <= 4) {
    const nextDayTasks = allTasks.filter(
      t => t.week === nextWeek && t.day === nextDay && t.status === 'pending',
    );
    if (nextDayTasks.length > 0) {
      const carryTask: Task = {
        ...delayedTask,
        id: `${delayedTask.id}_carry`,
        week: nextWeek,
        day: nextDay,
        date: nextDayTasks[0].date,
        status: 'pending',
        order: nextDayTasks.length,
        title: `[延期] ${delayedTask.title}`,
        description: `从第${delayedTask.week}周第${delayedTask.day}天延期: ${delayedTask.description}`,
        estimatedMinutes: Math.round(delayedTask.estimatedMinutes * 0.8),
        difficulty: Math.max(1, delayedTask.difficulty - 1),
      };
      const weekPlan = plan.weeks.find(w => w.weekNumber === nextWeek);
      weekPlan?.tasks.push(carryTask);
    }
  }
}

function handleSkip(plan: Plan, skippedTask: Task): void {
  const allTasks = plan.weeks.flatMap(w => w.tasks);
  const similarTasks = allTasks.filter(
    t => t.category === skippedTask.category && t.status === 'pending' && t.id !== skippedTask.id,
  );
  similarTasks.forEach(t => {
    t.estimatedMinutes = Math.round(t.estimatedMinutes * 1.1);
    t.difficulty = Math.min(5, t.difficulty + 1);
  });
}
