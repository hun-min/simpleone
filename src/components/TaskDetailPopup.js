import React from 'react';

function TaskDetailPopup({ 
  task, 
  dateKey, 
  dates,
  selectedSpaceId,
  timerLogs,
  isRunning,
  seconds,
  currentSubTask,
  onClose,
  onStartTimer,
  editingTaskId,
  setEditingTaskId,
  updateTask,
  autocompleteData,
  setAutocompleteData,
  editingOriginalText,
  setEditingOriginalText,
  cancelTimer,
  setSubTasksPopup,
  setObstaclePopup,
  setTimePopup,
  setTaskHistoryPopup,
  setDateChangePopup,
  setContextMenu,
  deleteTask
}) {
  const timerKey = `${dateKey}-${task.id}`;
  
  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };
  
  const allSubTasks = (() => {
    const result = [];
    const normalizedText = task.text.trim().replace(/\s+/g, ' ');
    Object.keys(dates).forEach(key => {
      const sameTask = dates[key]?.find(t => {
        const tNormalized = t.text.trim().replace(/\s+/g, ' ');
        return tNormalized === normalizedText && (t.spaceId || 'default') === (task.spaceId || 'default');
      });
      if (sameTask && sameTask.subTasks) {
        sameTask.subTasks.forEach(st => result.push({ ...st, dateKey: key }));
      }
    });
    return result;
  })();
  const completedSubTasks = allSubTasks.filter(st => st.completed);
  const completedCardsWithoutSubTasks = Object.keys(dates).reduce((count, key) => {
    const normalizedText = task.text.trim().replace(/\s+/g, ' ');
    return count + (dates[key]?.filter(t => {
      const tNormalized = t.text.trim().replace(/\s+/g, ' ');
      return tNormalized === normalizedText && t.completed && (t.spaceId || 'default') === (task.spaceId || 'default') && (!t.subTasks || t.subTasks.length === 0);
    }).length || 0);
  }, 0);
  const touchCount = completedSubTasks.length + completedCardsWithoutSubTasks;
  const allObstacles = (() => {
    const result = [];
    const normalizedText = task.text.trim().replace(/\s+/g, ' ');
    Object.keys(dates).forEach(key => {
      const sameTask = dates[key]?.find(t => {
        const tNormalized = t.text.trim().replace(/\s+/g, ' ');
        return tNormalized === normalizedText && (t.spaceId || 'default') === (task.spaceId || 'default');
      });
      if (sameTask && sameTask.obstacles) {
        result.push(...sameTask.obstacles);
      }
    });
    return result;
  })();

  const popupMouseDownTarget = React.useRef(null);

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) onClose(); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }} style={{ zIndex: 10005 }}>
      <div 
        className="popup" 
        onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} 
        style={{ 
          maxWidth: '500px', 
          width: '90%',
          zIndex: 10006,
          position: 'relative'
        }}
      >
        <button 
          onClick={onClose} 
          style={{ 
            position: 'absolute', 
            top: '10px', 
            right: '10px', 
            background: 'none', 
            border: 'none', 
            fontSize: '24px', 
            cursor: 'pointer', 
            color: '#888',
            padding: '4px 8px'
          }}
        >
          ✕
        </button>

        {/* 타이머 버튼 - 오른쪽 위 */}
        {isRunning ? (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateTask(dateKey, [task.id], 'completed', !task.completed);
              }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '170px',
                padding: '8px 16px',
                background: task.completed ? '#4CAF50' : '#fff',
                color: task.completed ? 'white' : '#4CAF50',
                border: task.completed ? 'none' : '2px solid #4CAF50',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                height: '36px'
              }}
            >
              ✅ 완료
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer();
              }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '90px',
                padding: '8px 16px',
                background: '#FFC107',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                height: '36px'
              }}
            >
              ⏸ {formatTime(seconds)}
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                cancelTimer(e, timerKey);
              }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '50px',
                padding: '8px 12px',
                background: '#dc3545',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold'
              }}
            >
              ✕
            </button>
          </>
        ) : (
          <>
            <button
              onClick={(e) => {
                e.stopPropagation();
                updateTask(dateKey, [task.id], 'completed', !task.completed);
              }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '170px',
                padding: '8px 16px',
                background: task.completed ? '#4CAF50' : '#fff',
                color: task.completed ? 'white' : '#4CAF50',
                border: task.completed ? 'none' : '2px solid #4CAF50',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                height: '36px'
              }}
            >
              ✅ 완료
            </button>
            <button
              onClick={(e) => {
                e.stopPropagation();
                onStartTimer();
              }}
              style={{
                position: 'absolute',
                top: '10px',
                right: '50px',
                padding: '8px 16px',
                background: '#4CAF50',
                color: 'white',
                border: 'none',
                borderRadius: '8px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 'bold',
                height: '36px'
              }}
            >
              ▶ 시작
            </button>
          </>
        )}

        <h3 style={{ marginTop: '40px', marginBottom: '20px' }}>📝 상세 정보</h3>

        {/* 할일 텍스트 */}
        <div style={{ marginBottom: '20px' }}>
          <div style={{ fontWeight: 'bold', fontSize: '18px', marginBottom: '8px', minHeight: '24px', position: 'relative' }}>
            <textarea
              value={task.text}
              onChange={(e) => updateTask(dateKey, [task.id], 'text', e.target.value)}
              onInput={(e) => {
                const val = e.target.value.toLowerCase();
                if (val) {
                  const allTasks = [];
                  Object.keys(dates).forEach(key => {
                    (dates[key] || []).forEach(t => {
                      if (t.text && t.text.toLowerCase().includes(val) && t.text !== task.text && !allTasks.find(at => at.text === t.text)) {
                        allTasks.push(t);
                      }
                    });
                  });
                  if (allTasks.length > 0) {
                    setAutocompleteData(prev => ({ ...prev, [task.id]: { suggestions: allTasks.slice(0, 5), selectedIndex: -1 } }));
                  } else {
                    setAutocompleteData(prev => { const newData = { ...prev }; delete newData[task.id]; return newData; });
                  }
                } else {
                  setAutocompleteData(prev => { const newData = { ...prev }; delete newData[task.id]; return newData; });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === 'Delete') {
                  e.stopPropagation();
                }
                const acData = autocompleteData[task.id];
                if (acData && acData.suggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setAutocompleteData(prev => ({ ...prev, [task.id]: { ...prev[task.id], selectedIndex: prev[task.id].selectedIndex < prev[task.id].suggestions.length - 1 ? prev[task.id].selectedIndex + 1 : prev[task.id].selectedIndex } }));
                    return;
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setAutocompleteData(prev => ({ ...prev, [task.id]: { ...prev[task.id], selectedIndex: prev[task.id].selectedIndex > -1 ? prev[task.id].selectedIndex - 1 : -1 } }));
                    return;
                  } else if (e.key === 'Enter' && acData.selectedIndex >= 0) {
                    e.preventDefault();
                    const selectedText = acData.suggestions[acData.selectedIndex].text;
                    updateTask(dateKey, [task.id], 'text', selectedText);
                    setAutocompleteData(prev => { const newData = { ...prev }; delete newData[task.id]; return newData; });
                    return;
                  }
                }
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onClick={(e) => e.stopPropagation()}
              data-task-id={task.id}
              style={{
                width: '100%',
                fontSize: '18px',
                fontWeight: 'bold',
                border: '1px solid #ddd',
                borderRadius: '4px',
                padding: '8px',
                background: 'rgba(0,0,0,0.02)',
                resize: 'none',
                fontFamily: 'inherit',
                outline: 'none',
                minHeight: '24px',
                height: 'auto',
                lineHeight: '24px',
                overflow: 'hidden',
                cursor: 'text'
              }}
            />
            {autocompleteData[task.id] && autocompleteData[task.id].suggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', zIndex: 10007, background: '#fff', border: '1px solid #4CAF50', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {autocompleteData[task.id].suggestions.map((suggestion, idx) => (
                  <div key={idx} onMouseDown={(e) => { e.preventDefault(); updateTask(dateKey, [task.id], 'text', suggestion.text); setAutocompleteData(prev => { const newData = { ...prev }; delete newData[task.id]; return newData; }); }} style={{ padding: '8px', cursor: 'pointer', background: idx === autocompleteData[task.id].selectedIndex ? 'rgba(76,175,80,0.2)' : 'transparent', textAlign: 'left' }}>{suggestion.text}</div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* 상세 정보 */}
        <div style={{ fontSize: '14px', color: '#666', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <div style={{ display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
            <span 
              onClick={() => setTimePopup({ type: 'today', dateKey, path: [task.id], time: task.todayTime || 0, startTime: task.startTime || '' })}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'rgba(76,175,80,0.1)' }}
            >
              ⏱️ 오늘 {formatTime(task.todayTime || 0)}
            </span>
            <span 
              onClick={() => setTimePopup({ type: 'total', dateKey, path: [task.id], time: task.totalTime || 0 })}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'rgba(76,175,80,0.1)' }}
            >
              총 {formatTime(task.totalTime || 0)}
            </span>
          </div>

          {task.desiredStartTime && (
            <div 
              onClick={() => setTimePopup({ type: 'startTime', dateKey, path: [task.id], startTime: task.desiredStartTime || '' })}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,193,7,0.1)', display: 'inline-block', width: 'fit-content' }}
            >
              ⏰ 시작시간 {task.desiredStartTime}
            </div>
          )}

          {touchCount > 0 && (
            <div style={{ padding: '4px 8px', borderRadius: '4px', background: 'rgba(255,152,0,0.1)', display: 'inline-block', width: 'fit-content' }}>
              ✨ {touchCount}번 어루만짐
            </div>
          )}

          {allSubTasks.length > 0 && (
            <div 
              onClick={() => setSubTasksPopup({ dateKey, taskId: task.id })}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'rgba(33,150,243,0.1)', display: 'inline-block', width: 'fit-content' }}
            >
              📋 하위할일 ({completedSubTasks.length}/{allSubTasks.length})
            </div>
          )}

          {allObstacles.length > 0 && (
            <div 
              onClick={() => setObstaclePopup({ dateKey, taskId: task.id, taskName: task.text })}
              style={{ cursor: 'pointer', padding: '4px 8px', borderRadius: '4px', background: 'rgba(244,67,54,0.1)', display: 'inline-block', width: 'fit-content' }}
            >
              🚧 방해요소 ({allObstacles.length})
            </div>
          )}

          {isRunning && (
            <div style={{ 
              marginTop: '8px',
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              background: 'rgba(255,193,7,0.2)',
              borderRadius: '8px',
              border: '2px solid #FFC107'
            }}>
              <div style={{ color: '#FFC107', marginBottom: '4px' }}>⏱️ {formatTime(seconds)}</div>
              {currentSubTask && <div style={{ color: '#4CAF50', fontSize: '14px' }}>🎯 {currentSubTask}</div>}
            </div>
          )}
        </div>

        {/* 액션 버튼들 */}
        <div style={{ marginTop: '20px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
          <button 
            onClick={() => setSubTasksPopup({ dateKey, taskId: task.id })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f8f9fa', cursor: 'pointer', fontSize: '14px' }}
          >
            📋 하위할일 관리
          </button>
          <button 
            onClick={() => setObstaclePopup({ dateKey, taskId: task.id, taskName: task.text })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f8f9fa', cursor: 'pointer', fontSize: '14px' }}
          >
            🚧 방해요소 관리
          </button>
          <button 
            onClick={() => setTaskHistoryPopup({ taskName: task.text })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f8f9fa', cursor: 'pointer', fontSize: '14px' }}
          >
            📊 모아보기
          </button>
          <button 
            onClick={() => setDateChangePopup({ dateKey, taskId: task.id })}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #ddd', background: '#f8f9fa', cursor: 'pointer', fontSize: '14px' }}
          >
            📅 날짜 변경
          </button>
          <button 
            onClick={() => {
              if (window.confirm('삭제하시겠습니까?')) {
                deleteTask(dateKey, task.id);
                onClose();
              }
            }}
            style={{ padding: '10px', borderRadius: '8px', border: '1px solid #dc3545', background: 'rgba(220,53,69,0.1)', color: '#dc3545', cursor: 'pointer', fontSize: '14px', fontWeight: 'bold' }}
          >
            🗑️ 삭제
          </button>
        </div>
      </div>
    </div>
  );
}

export default TaskDetailPopup;
