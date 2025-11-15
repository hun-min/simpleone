// 이 파일은 App.js의 간소화된 버전입니다.
// TaskCard 컴포넌트를 사용하여 중복 코드를 제거했습니다.
// 
// 사용 방법:
// 1. 현재 App.js를 App_backup.js로 백업
// 2. 이 파일의 내용을 App.js에 복사
// 3. TaskCard import 추가: import TaskCard from './components/TaskCard';
// 4. useTimer import 추가: import { useTimer } from './hooks/useTimer';
//
// 변경사항:
// - 중복된 카드 렌더링 로직을 TaskCard 컴포넌트로 통합
// - 타이머 로직을 useTimer 훅으로 분리
// - cancelTimer 함수를 별도로 정의하여 재사용
//
// 적용할 코드 (App.js의 해당 부분을 교체):

// 1. import 추가 (파일 상단)
import TaskCard from './components/TaskCard';
import { useTimer } from './hooks/useTimer';

// 2. useTimer 훅 사용 (timerSeconds, setTimerSeconds, quickTimerSeconds 관련 useEffect 제거)
const { timerSeconds, quickTimerSeconds, setQuickTimerSeconds } = useTimer(activeTimers, quickTimer);

// 3. cancelTimer 함수 정의 (toggleTimer 함수 근처)
const cancelTimer = async (e, timerKey) => {
  e.stopPropagation();
  if (togglToken && togglEntries[timerKey]) {
    const stopToggl = async () => {
      let success = false;
      try {
        const stopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${togglEntries[timerKey]}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
        if (stopRes.ok) success = true;
      } catch {}
      if (!success) {
        try {
          const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
            method: 'GET',
            headers: { 'Content-Type': 'application/json' }
          });
          let currentData = null;
          try {
            const text = await currentRes.text();
            if (text.trim() && currentRes.ok) {
              try {
                currentData = JSON.parse(text);
              } catch {}
            }
          } catch {}
          if (currentData && currentData.id) {
            try {
              const forceStopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
              });
              if (forceStopRes.ok) success = true;
            } catch {}
          }
        } catch {}
      }
      const newEntries = { ...togglEntries };
      delete newEntries[timerKey];
      setTogglEntries(newEntries);
    };
    stopToggl().catch(() => {});
  }
  const newActiveTimers = { ...activeTimers };
  newActiveTimers[timerKey] = false;
  setActiveTimers(newActiveTimers);
};

// 4. 카드 렌더링 부분 교체 (incompleteTasks.map 부분)
{incompleteTasks.map((task) => {
  const timerKey = `${dateKey}-${task.id}`;
  const seconds = timerSeconds[timerKey] || 0;
  const isRunning = activeTimers[timerKey];
  
  return (
    <TaskCard
      key={task.id}
      task={task}
      dateKey={dateKey}
      dates={dates}
      isRunning={isRunning}
      seconds={seconds}
      editingTaskId={editingTaskId}
      setEditingTaskId={setEditingTaskId}
      autocompleteData={autocompleteData}
      setAutocompleteData={setAutocompleteData}
      updateTask={updateTask}
      toggleTimer={toggleTimer}
      cancelTimer={(e) => cancelTimer(e, timerKey)}
      setContextMenu={setContextMenu}
      setSubTasksPopup={setSubTasksPopup}
      setObstaclePopup={setObstaclePopup}
      draggedTaskId={draggedTaskId}
      setDraggedTaskId={setDraggedTaskId}
      saveTasks={saveTasks}
      timerLogs={timerLogs}
      newlyCreatedTasks={newlyCreatedTasks}
    />
  );
})}

// 5. 완료된 카드도 동일하게 교체 (completedTasks.map 부분)
{completedTasks.map((task) => {
  const timerKey = `${dateKey}-${task.id}`;
  const seconds = timerSeconds[timerKey] || 0;
  const isRunning = activeTimers[timerKey];
  
  return (
    <TaskCard
      key={task.id}
      task={task}
      dateKey={dateKey}
      dates={dates}
      isRunning={isRunning}
      seconds={seconds}
      editingTaskId={editingTaskId}
      setEditingTaskId={setEditingTaskId}
      autocompleteData={autocompleteData}
      setAutocompleteData={setAutocompleteData}
      updateTask={updateTask}
      toggleTimer={toggleTimer}
      cancelTimer={(e) => cancelTimer(e, timerKey)}
      setContextMenu={setContextMenu}
      setSubTasksPopup={setSubTasksPopup}
      setObstaclePopup={setObstaclePopup}
      draggedTaskId={draggedTaskId}
      setDraggedTaskId={setDraggedTaskId}
      saveTasks={saveTasks}
      timerLogs={timerLogs}
      newlyCreatedTasks={newlyCreatedTasks}
    />
  );
})}

// 이렇게 수정하면:
// - 약 500줄의 중복 코드 제거
// - 유지보수 용이
// - 버그 수정 시 한 곳만 수정하면 됨
