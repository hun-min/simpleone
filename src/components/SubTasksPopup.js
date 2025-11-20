import React from 'react';
import { getSubTasks } from '../utils/taskUtils';

export function SubTasksPopup({ 
  subTasksPopup, 
  dates, 
  setDates, 
  saveTasks, 
  addSubTask, 
  onClose,
  popupMouseDownTarget 
}) {
  if (!subTasksPopup) return null;

  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);

  return (
    <div className="popup-overlay" 
      onMouseDown={(e) => { popupMouseDownTarget.current = e.target; }}
      onMouseUp={(e) => { if (e.target === e.currentTarget && popupMouseDownTarget.current === e.currentTarget) onClose(); }}
    >
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', userSelect: 'text' }}>
        <h3>📋 {dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text || '할일'} - 하위할일</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
          {(() => {
            const allSubTasks = getSubTasks(dates, subTasksPopup.dateKey, subTasksPopup.taskId);
            const groupedByDate = {};
            allSubTasks.forEach(subTask => {
              const dateKey = subTask.dateKey;
              if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
              }
              groupedByDate[dateKey].push(subTask);
            });
            return Object.keys(groupedByDate).sort().reverse().map(dateKey => (
              <div key={dateKey} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>{dateKey}</div>
                {groupedByDate[dateKey].sort((a, b) => b.timestamp - a.timestamp).map(subTask => {
                  const task = dates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                  const subTaskIdx = task?.subTasks?.findIndex(st => st.id === subTask.id);
                  return (
                    <div key={subTask.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', marginBottom: '2px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                      <input
                        type="checkbox"
                        checked={subTask.completed}
                        onChange={(e) => {
                          const newDates = { ...dates };
                          const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                          if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                            taskToUpdate.subTasks[subTaskIdx].completed = e.target.checked;
                            setDates(newDates);
                            saveTasks(newDates);
                            // 강제 리렌더링
                            setTimeout(() => setDates({...newDates}), 0);
                          }
                        }}
                      />
                      <input
                        type="text"
                        value={subTask.text}
                        onChange={(e) => {
                          const newDates = { ...dates };
                          const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                          if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                            taskToUpdate.subTasks[subTaskIdx].text = e.target.value;
                            setDates(newDates);
                            saveTasks(newDates);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            addSubTask(subTasksPopup.dateKey, subTasksPopup.taskId);
                          } else if (e.key === 'Backspace' && e.target.value === '') {
                            e.preventDefault();
                            const newDates = { ...dates };
                            const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                            if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                              taskToUpdate.subTasks.splice(subTaskIdx, 1);
                              setDates(newDates);
                              saveTasks(newDates);
                            }
                          } else if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            const inputs = Array.from(e.target.closest('.popup').querySelectorAll('input[type="text"]'));
                            const currentIndex = inputs.indexOf(e.target);
                            if (currentIndex < inputs.length - 1) {
                              inputs[currentIndex + 1].focus();
                            }
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            const inputs = Array.from(e.target.closest('.popup').querySelectorAll('input[type="text"]'));
                            const currentIndex = inputs.indexOf(e.target);
                            if (currentIndex > 0) {
                              inputs[currentIndex - 1].focus();
                            }
                          }
                        }}
                        style={{ flex: 1, background: 'transparent', border: 'none', color: subTask.completed ? '#4CAF50' : 'inherit', fontSize: '14px', outline: 'none' }}
                      />
                      <button
                        onClick={() => {
                          const newDates = { ...dates };
                          const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                          if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                            taskToUpdate.subTasks.splice(subTaskIdx, 1);
                            setDates(newDates);
                            saveTasks(newDates);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })}
              </div>
            ));
          })()}
        </div>
        <div className="popup-buttons">
          <button onClick={() => { 
            addSubTask(subTasksPopup.dateKey, subTasksPopup.taskId); 
            setTimeout(() => {
              const inputs = document.querySelectorAll('.popup input[type="text"]');
              if (inputs.length > 0) inputs[0].focus();
            }, 50);
          }}>+ 하위할일 추가</button>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
