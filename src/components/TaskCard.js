import React from 'react';
import { formatTime } from '../utils/timeUtils';
import { getSubTasks } from '../utils/taskUtils';

const TaskCard = ({
  task,
  dateKey,
  dates,
  isRunning,
  seconds,
  editingTaskId,
  setEditingTaskId,
  autocompleteData,
  setAutocompleteData,
  updateTask,
  toggleTimer,
  cancelTimer,
  setContextMenu,
  setSubTasksPopup,
  setObstaclePopup,
  draggedTaskId,
  setDraggedTaskId,
  saveTasks,
  timerLogs,
  newlyCreatedTasks
}) => {
  const timerKey = `${dateKey}-${task.id}`;
  const allTaskLogs = Object.values(timerLogs).flat().filter(log => log.taskName === task.text);
  const touchCount = allTaskLogs.length;

  const handleDragStart = (e) => {
    setDraggedTaskId(task.id);
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
  };

  const handleDrop = (e) => {
    e.preventDefault();
    if (draggedTaskId && draggedTaskId !== task.id) {
      const newDates = { ...dates };
      const tasks = newDates[dateKey];
      const draggedIdx = tasks.findIndex(t => t.id === draggedTaskId);
      const targetIdx = tasks.findIndex(t => t.id === task.id);
      if (draggedIdx !== -1 && targetIdx !== -1) {
        const [draggedTask] = tasks.splice(draggedIdx, 1);
        tasks.splice(targetIdx, 0, draggedTask);
        saveTasks(newDates);
      }
    }
    setDraggedTaskId(null);
  };

  const handleContextMenu = (e) => {
    e.preventDefault();
    e.currentTarget.dataset.contextMenuOpened = 'true';
    setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey });
    setTimeout(() => {
      e.currentTarget.dataset.contextMenuOpened = 'false';
    }, 100);
  };

  const handleClick = (e) => {
    if (e.button === 2 || e.currentTarget.dataset.contextMenuOpened === 'true') {
      e.preventDefault();
      e.stopPropagation();
      return;
    }
    if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !e.target.closest('textarea') && !e.target.closest('.autocomplete-dropdown')) {
      toggleTimer(dateKey, [task.id]);
    }
  };

  const handleTouchStart = (e) => {
    const touch = e.touches[0];
    const rect = e.currentTarget.getBoundingClientRect();
    e.currentTarget.dataset.touchStartTime = Date.now();
    e.currentTarget.dataset.touchStartX = touch.clientX;
    e.currentTarget.dataset.touchStartY = touch.clientY;
    e.currentTarget.dataset.offsetX = touch.clientX - rect.left;
    e.currentTarget.dataset.offsetY = touch.clientY - rect.top;
    e.currentTarget.style.transform = 'scale(0.95)';
    e.currentTarget.style.transition = 'transform 0.05s';
    e.currentTarget.style.opacity = '0.9';
    const longPressTimer = setTimeout(() => {
      setContextMenu({ x: touch.clientX, y: touch.clientY, taskId: task.id, dateKey });
      e.currentTarget.dataset.isLongPress = 'true';
    }, 500);
    e.currentTarget.dataset.longPressTimer = longPressTimer;
  };

  const handleTouchEnd = (e) => {
    const longPressTimer = e.currentTarget.dataset.longPressTimer;
    const isLongPress = e.currentTarget.dataset.isLongPress === 'true';
    const isDragging = e.currentTarget.dataset.isDragging === 'true';
    const touchStartTime = parseInt(e.currentTarget.dataset.touchStartTime);
    const touchDuration = Date.now() - touchStartTime;
    
    if (longPressTimer) clearTimeout(parseInt(longPressTimer));
    
    // 정리
    document.querySelectorAll('.drop-indicator').forEach(el => el.remove());
    
    if (isDragging) {
      // 드롭 위치 계산
      const touch = e.changedTouches[0];
      const dropTarget = document.elementFromPoint(touch.clientX, touch.clientY);
      const targetCard = dropTarget?.closest('[draggable="true"]');
      
      if (targetCard && targetCard !== e.currentTarget) {
        const targetTaskId = parseInt(targetCard.querySelector('textarea')?.dataset.taskId);
        if (targetTaskId && targetTaskId !== task.id) {
          const newDates = { ...dates };
          const tasks = newDates[dateKey];
          const draggedIdx = tasks.findIndex(t => t.id === task.id);
          const targetIdx = tasks.findIndex(t => t.id === targetTaskId);
          if (draggedIdx !== -1 && targetIdx !== -1) {
            const [draggedTask] = tasks.splice(draggedIdx, 1);
            tasks.splice(targetIdx, 0, draggedTask);
            saveTasks(newDates);
          }
        }
      }
      
      setDraggedTaskId(null);
      return;
    }
    
    e.currentTarget.style.transform = '';
    e.currentTarget.style.transition = '';
    e.currentTarget.style.opacity = '';
    e.currentTarget.style.position = '';
    e.currentTarget.style.left = '';
    e.currentTarget.style.top = '';
    e.currentTarget.style.width = '';
    e.currentTarget.style.height = '';
    e.currentTarget.style.zIndex = '';
    
    if (!isLongPress && !isDragging && touchDuration < 500 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'DIV' && !e.target.closest('.autocomplete-dropdown')) {
      toggleTimer(dateKey, [task.id]);
    }
    
    e.currentTarget.dataset.isLongPress = 'false';
    e.currentTarget.dataset.dragStarted = 'false';
  };

  const handleTouchMove = (e) => {
    const touch = e.touches[0];
    const startY = parseFloat(e.currentTarget.dataset.touchStartY);
    const moveY = Math.abs(touch.clientY - startY);
    
    // 빠른 세로 스크롤이면 드래그 안함
    if (moveY > 30 && Date.now() - parseInt(e.currentTarget.dataset.touchStartTime) < 150) {
      return;
    }
    
    if (moveY > 10) {
      if (e.currentTarget.dataset.longPressTimer) {
        clearTimeout(parseInt(e.currentTarget.dataset.longPressTimer));
      }
      e.currentTarget.dataset.isDragging = 'true';
      setDraggedTaskId(task.id);
    }
  };

  const handleTextChange = (e) => {
    if (editingTaskId !== task.id) {
      e.preventDefault();
      e.stopPropagation();
      e.target.value = task.text;
      return;
    }
    updateTask(dateKey, [task.id], 'text', e.target.value);
    if (e.target.value.trim() !== '' && newlyCreatedTasks.current.has(task.id)) {
      newlyCreatedTasks.current.delete(task.id);
    }
  };

  const handleTextInput = (e) => {
    if (editingTaskId !== task.id) {
      e.preventDefault();
      e.stopPropagation();
      e.target.value = task.text;
      return;
    }
    e.target.style.height = 'auto';
    e.target.style.height = e.target.scrollHeight + 'px';
    
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
        setAutocompleteData(prev => ({
          ...prev,
          [task.id]: { suggestions: allTasks.slice(0, 5), selectedIndex: -1 }
        }));
      } else {
        setAutocompleteData(prev => {
          const newData = { ...prev };
          delete newData[task.id];
          return newData;
        });
      }
    } else {
      setAutocompleteData(prev => {
        const newData = { ...prev };
        delete newData[task.id];
        return newData;
      });
    }
  };

  const handleKeyDown = (e) => {
    if (editingTaskId !== task.id) {
      if (e.key === 'Enter') {
        e.preventDefault();
        setEditingTaskId(task.id);
        setTimeout(() => {
          const textarea = document.querySelector(`textarea[data-task-id="${task.id}"]`);
          if (textarea) {
            textarea.focus();
            textarea.setSelectionRange(textarea.value.length, textarea.value.length);
          }
        }, 0);
        return;
      } else if (e.key === 'Backspace') {
        e.preventDefault();
        return;
      }
      return;
    }
    
    const acData = autocompleteData[task.id];
    if (acData && acData.suggestions.length > 0) {
      if (e.key === 'ArrowDown') {
        e.preventDefault();
        setAutocompleteData(prev => ({
          ...prev,
          [task.id]: {
            ...prev[task.id],
            selectedIndex: prev[task.id].selectedIndex < prev[task.id].suggestions.length - 1 
              ? prev[task.id].selectedIndex + 1 
              : prev[task.id].selectedIndex
          }
        }));
        return;
      } else if (e.key === 'ArrowUp') {
        e.preventDefault();
        setAutocompleteData(prev => ({
          ...prev,
          [task.id]: {
            ...prev[task.id],
            selectedIndex: prev[task.id].selectedIndex > -1 
              ? prev[task.id].selectedIndex - 1 
              : -1
          }
        }));
        return;
      } else if (e.key === 'Enter' && acData.selectedIndex >= 0) {
        e.preventDefault();
        const selectedSuggestion = acData.suggestions[acData.selectedIndex];
        const selectedText = typeof selectedSuggestion === 'string' ? selectedSuggestion : selectedSuggestion.text;
        updateTask(dateKey, [task.id], 'text', selectedText);
        setAutocompleteData(prev => {
          const newData = { ...prev };
          delete newData[task.id];
          return newData;
        });
        return;
      } else if (e.key === 'Escape') {
        e.preventDefault();
        setAutocompleteData(prev => {
          const newData = { ...prev };
          delete newData[task.id];
          return newData;
        });
        return;
      }
    }
    if (e.key === 'Enter') {
      if (editingTaskId === task.id) {
        e.preventDefault();
        setEditingTaskId(null);
        setAutocompleteData(prev => {
          const newData = { ...prev };
          delete newData[task.id];
          return newData;
        });
        e.target.blur();
      } else {
        e.preventDefault();
      }
    } else if (e.key === 'Backspace' && editingTaskId !== task.id) {
      e.preventDefault();
    } else if (e.key === 'Escape' && editingTaskId === task.id) {
      e.preventDefault();
      setEditingTaskId(null);
      setAutocompleteData(prev => {
        const newData = { ...prev };
        delete newData[task.id];
        return newData;
      });
    }
  };

  const handleFocus = (e) => {
    e.stopPropagation();
    if (editingTaskId !== task.id) {
      e.target.blur();
    }
  };

  const handleTextClick = (e) => {
    if (editingTaskId !== task.id) {
      e.stopPropagation();
      e.preventDefault();
      toggleTimer(dateKey, [task.id]);
    }
  };

  const handleBlur = () => {
    setTimeout(() => {
      setAutocompleteData(prev => {
        const newData = { ...prev };
        delete newData[task.id];
        return newData;
      });
      const textarea = document.querySelector(`textarea[data-task-id="${task.id}"]`);
      
      if (newlyCreatedTasks.current.has(task.id) && textarea && textarea.value.trim() === '') {
        if (document.activeElement !== textarea) {
          textarea.focus({ preventScroll: true });
          try { textarea.setSelectionRange(0, 0); } catch (_) {}
        }
        return;
      }
      
      if (editingTaskId === task.id && document.activeElement !== textarea) {
        if (!newlyCreatedTasks.current.has(task.id) || (textarea && textarea.value.trim() !== '')) {
          setEditingTaskId(null);
          newlyCreatedTasks.current.delete(task.id);
        }
      }
    }, 300);
  };

  const subTasks = getSubTasks(dates, dateKey, task.id);
  const incompleteSubTasks = subTasks.filter(st => !st.completed);
  let allObstacles = [];
  Object.keys(dates).forEach(key => {
    const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
    if (sameTask && sameTask.obstacles) {
      allObstacles = allObstacles.concat(sameTask.obstacles);
    }
  });

  return (
    <div 
      draggable
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDrop={handleDrop}
      onDragEnd={() => setDraggedTaskId(null)}
      onContextMenu={handleContextMenu}
      onClick={handleClick}
      onTouchStart={handleTouchStart}
      onTouchEnd={handleTouchEnd}
      onTouchMove={handleTouchMove}
      style={{
        background: task.completed ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: isRunning ? '0 8px 24px rgba(255,215,0,0.4)' : task.completed ? '0 4px 12px rgba(76,175,80,0.2)' : '0 4px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.3s',
        border: isRunning ? '2px solid #FFD700' : task.completed ? '2px solid #66BB6A' : '2px solid #4CAF50',
        cursor: 'pointer',
        position: 'relative',
        opacity: draggedTaskId === task.id ? 0.8 : (task.completed ? 0.7 : 0.85),
        transform: isRunning ? 'scale(1.02)' : 'scale(1)',
        animation: isRunning ? 'pulse 2s infinite' : 'none'
      }}
    >
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <textarea
          value={task.text}
          readOnly={editingTaskId !== task.id}
          onChange={handleTextChange}
          onInput={handleTextInput}
          onKeyDown={handleKeyDown}
          onFocus={handleFocus}
          onClick={handleTextClick}
          onBlur={handleBlur}
          placeholder="원하는 것"
          rows={1}
          data-task-id={task.id}
          ref={(el) => {
            if (el) {
              el.style.height = 'auto';
              el.style.height = el.scrollHeight + 'px';
            }
          }}
          style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: editingTaskId === task.id ? '#000' : '#666',
            width: '100%', 
            maxWidth: '100%',
            border: editingTaskId === task.id ? '3px solid #4CAF50' : 'none', 
            background: editingTaskId === task.id ? 'rgba(76, 175, 80, 0.25)' : 'transparent', 
            outline: 'none', 
            resize: 'none', 
            overflow: 'hidden', 
            fontFamily: 'inherit', 
            lineHeight: '1.4', 
            cursor: editingTaskId === task.id ? 'text' : 'pointer', 
            userSelect: editingTaskId === task.id ? 'text' : 'none',
            borderRadius: editingTaskId === task.id ? '12px' : '0',
            padding: editingTaskId === task.id ? '12px' : '0',
            flex: 1,
            boxSizing: 'border-box',
            boxShadow: editingTaskId === task.id ? '0 4px 12px rgba(76, 175, 80, 0.4)' : 'none',
            transition: 'all 0.3s ease',
            transform: editingTaskId === task.id ? 'scale(1.02)' : 'scale(1)'
          }}
        />
        {autocompleteData[task.id] && autocompleteData[task.id].suggestions.length > 0 && (
          <div 
            className="autocomplete-dropdown" 
            style={{ 
              position: 'absolute', 
              bottom: '100%', 
              left: editingTaskId === task.id ? '40px' : '0', 
              right: 0, 
              marginBottom: '4px', 
              zIndex: 10000,
              pointerEvents: 'auto'
            }}
            onClick={(e) => e.stopPropagation()}
            onMouseDown={(e) => e.stopPropagation()}
          >
            {autocompleteData[task.id].suggestions.map((suggestion, idx) => {
              const isSelected = idx === autocompleteData[task.id].selectedIndex;
              const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.text;
              return (
                <div
                  key={idx}
                  className={`autocomplete-item ${isSelected ? 'selected' : ''}`}
                  style={{
                    backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                    cursor: 'pointer',
                    userSelect: 'none'
                  }}
                  onClick={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateTask(dateKey, [task.id], 'text', suggestionText);
                    setAutocompleteData(prev => {
                      const newData = { ...prev };
                      delete newData[task.id];
                      return newData;
                    });
                  }}
                  onMouseDown={(e) => {
                    e.preventDefault();
                    e.stopPropagation();
                    updateTask(dateKey, [task.id], 'text', suggestionText);
                    setAutocompleteData(prev => {
                      const newData = { ...prev };
                      delete newData[task.id];
                      return newData;
                    });
                  }}
                >
                  {suggestionText}
                </div>
              );
            })}
          </div>
        )}
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666', marginBottom: '8px', alignItems: 'center' }}>
        <span>{isRunning ? `⏸ ${formatTime(task.todayTime + seconds)}` : `▶ ${formatTime(task.todayTime)}`}</span>
        <span>총 {formatTime(task.totalTime)}</span>
        {task.startTime && <span>🕐 {task.startTime}</span>}
        {isRunning && (
          <button onClick={cancelTimer} style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid rgba(220,53,69,0.5)', background: 'rgba(220,53,69,0.1)', color: '#dc3545', cursor: 'pointer' }}>✕</button>
        )}
      </div>
      {touchCount > 0 && (
        <div style={{ fontSize: '13px', color: '#888' }}>✨ {touchCount}번</div>
      )}
      <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        {task.desiredStartTime && (
          <span 
            style={{ 
              fontSize: '11px', 
              color: '#666', 
              padding: '2px 4px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '4px'
            }}
            title="원하는 시작시간"
          >
            ⏰{task.desiredStartTime}
          </span>
        )}
        {incompleteSubTasks.length > 0 && (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setSubTasksPopup({ dateKey, taskId: task.id });
            }}
            style={{ 
              fontSize: '11px', 
              color: '#666', 
              cursor: 'pointer',
              padding: '2px 4px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '4px'
            }}
            title="하위할일"
          >
            📋({incompleteSubTasks.length})
          </span>
        )}
        {allObstacles.length > 0 && (
          <span 
            onClick={(e) => {
              e.stopPropagation();
              setObstaclePopup({ dateKey, taskId: task.id, taskName: task.text });
            }}
            style={{ 
              fontSize: '11px', 
              color: '#666', 
              cursor: 'pointer',
              padding: '2px 4px',
              background: 'rgba(0,0,0,0.05)',
              borderRadius: '4px'
            }}
            title="방해요소"
          >
            🚧({allObstacles.length})
          </span>
        )}
      </div>
    </div>
  );
};

export default TaskCard;
