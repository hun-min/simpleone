export const getTaskStats = (dates, dateKey, selectedSpaceId) => {
  const tasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId);
  const countTasks = (taskList) => {
    let total = 0;
    let completed = 0;
    taskList.forEach(task => {
      total++;
      if (task.completed) completed++;
      const childStats = countTasks(task.children || []);
      total += childStats.total;
      completed += childStats.completed;
    });
    return { total, completed };
  };
  return countTasks(tasks);
};

export const getStreak = (dates, taskText) => {
  if (!taskText) return 0;
  let streak = 0;
  const today = new Date();
  for (let i = 0; i < 365; i++) {
    const checkDate = new Date(today);
    checkDate.setDate(today.getDate() - i);
    const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
    const dayTasks = dates[key] || [];
    const found = dayTasks.find(t => t.text === taskText && t.completed);
    if (found) {
      streak++;
    } else {
      break;
    }
  }
  return streak;
};

export const getSubTasks = (dates, dateKey, taskId) => {
  const task = dates[dateKey]?.find(t => t.id === taskId);
  if (!task) return [];
  const allSubTasks = [];
  Object.keys(dates).forEach(key => {
    const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
    if (sameTask && sameTask.subTasks) {
      sameTask.subTasks.forEach(subTask => {
        allSubTasks.push({ ...subTask, dateKey: key });
      });
    }
  });
  return allSubTasks;
};
