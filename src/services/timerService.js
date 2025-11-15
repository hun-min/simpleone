const startTogglTimer = async (togglToken, taskText) => {
  if (!togglToken) return null;
  
  try {
    // 현재 실행중인 타이머 중지
    try {
      const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
        method: 'GET',
        headers: { 'Content-Type': 'application/json' }
      });
      const currentText = await currentRes.text();
      if (currentText.trim() && currentRes.ok) {
        const currentData = JSON.parse(currentText);
        if (currentData?.id) {
          await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });
        }
      }
    } catch {}
    
    // 새 타이머 시작
    const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: taskText || '(제목 없음)',
        start: new Date().toISOString(),
        duration: -1,
        created_with: 'SimpleOne'
      })
    });
    
    const responseText = await res.text();
    if (res.ok && responseText.trim()) {
      const data = JSON.parse(responseText);
      return data.id;
    }
  } catch (err) {
    console.warn('Toggl 시작 실패:', err);
  }
  return null;
};

const stopTogglTimer = async (togglToken, entryId) => {
  if (!togglToken) return;
  
  try {
    // 저장된 entryId로 종료
    if (entryId) {
      const stopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${entryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (stopRes.ok) return;
    }
    
    // 실패시 현재 실행중인 타이머 종료
    const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    const currentText = await currentRes.text();
    if (currentText.trim() && currentRes.ok) {
      const currentData = JSON.parse(currentText);
      if (currentData?.id) {
        await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
      }
    }
  } catch (err) {
    console.warn('Toggl 종료 실패:', err);
  }
};

export const toggleTimer = async ({
  dateKey,
  taskPath,
  activeTimers,
  setActiveTimers,
  timerSeconds,
  setTimerSeconds,
  togglEntries,
  setTogglEntries,
  togglToken,
  dates,
  setDates,
  saveTasks,
  timerLogs,
  setTimerLogs
}) => {
  const key = `${dateKey}-${taskPath.join('-')}`;
  
  if (activeTimers[key]) {
    // 타이머 종료
    const startTime = activeTimers[key];
    const seconds = Math.floor((Date.now() - startTime) / 1000);
    
    // 태스크 업데이트
    const newDates = { ...dates };
    let tasks = newDates[dateKey];
    for (let i = 0; i < taskPath.length - 1; i++) {
      tasks = tasks.find(t => t.id === taskPath[i]).children;
    }
    const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
    task.todayTime += seconds;
    if (seconds >= 1) {
      task.completed = true;
      task.completedAt = new Date().toISOString();
    }
    
    // 같은 이름 태스크 totalTime 업데이트
    const taskName = task.text;
    Object.keys(newDates).forEach(date => {
      newDates[date]?.forEach(t => {
        if (t.text === taskName) t.totalTime += seconds;
      });
    });
    
    setDates(newDates);
    saveTasks(newDates);
    
    // 로그 추가
    const newLogs = { ...timerLogs };
    if (!newLogs[dateKey]) newLogs[dateKey] = [];
    newLogs[dateKey].push({
      taskName: task.text || '(제목 없음)',
      startTime: new Date(startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: seconds
    });
    setTimerLogs(newLogs);
    
    // Toggl 종료
    if (seconds >= 1) {
      stopTogglTimer(togglToken, togglEntries[key]);
    }
    
    // 상태 초기화
    setActiveTimers({ ...activeTimers, [key]: false });
    setTimerSeconds({ ...timerSeconds, [key]: 0 });
    setTogglEntries(prev => {
      const newEntries = { ...prev };
      delete newEntries[key];
      return newEntries;
    });
  } else {
    // 타이머 시작
    setActiveTimers({ ...activeTimers, [key]: Date.now() });
    setTimerSeconds({ ...timerSeconds, [key]: 0 });
    
    // Toggl 시작
    const newDates = { ...dates };
    let tasks = newDates[dateKey];
    for (let i = 0; i < taskPath.length - 1; i++) {
      tasks = tasks.find(t => t.id === taskPath[i]).children;
    }
    const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
    
    const entryId = await startTogglTimer(togglToken, task.text);
    if (entryId) {
      setTogglEntries({ ...togglEntries, [key]: entryId });
    }
  }
};

export const cancelTimer = async ({
  timerKey,
  togglToken,
  togglEntries,
  setTogglEntries,
  activeTimers,
  setActiveTimers
}) => {
  stopTogglTimer(togglToken, togglEntries[timerKey]);
  
  setActiveTimers({ ...activeTimers, [timerKey]: false });
  setTogglEntries(prev => {
    const newEntries = { ...prev };
    delete newEntries[timerKey];
    return newEntries;
  });
};
