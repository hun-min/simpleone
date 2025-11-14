export const updateTaskTimes = (dates, dateKey, taskPath, seconds) => {
  const newDates = { ...dates };
  let tasks = newDates[dateKey];
  
  for (let i = 0; i < taskPath.length - 1; i++) {
    tasks = tasks.find(t => t.id === taskPath[i]).children;
  }
  const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
  
  task.todayTime += seconds;
  task.completed = true;
  task.completedAt = new Date().toISOString();
  
  const taskName = task.text;
  Object.keys(newDates).forEach(date => {
    const updateTasksRecursive = (tasks) => {
      tasks.forEach(t => {
        if (t.text === taskName) {
          t.totalTime += seconds;
        }
        if (t.children) updateTasksRecursive(t.children);
      });
    };
    if (newDates[date]) updateTasksRecursive(newDates[date]);
  });
  
  return { newDates, task };
};

export const addTimerLog = (timerLogs, dateKey, taskText, startTime, endTime, seconds) => {
  const newLogs = { ...timerLogs };
  if (!newLogs[dateKey]) newLogs[dateKey] = [];
  newLogs[dateKey].push({
    taskName: taskText || '(제목 없음)',
    startTime: new Date(startTime).toISOString(),
    endTime: new Date(endTime).toISOString(),
    duration: seconds
  });
  return newLogs;
};
