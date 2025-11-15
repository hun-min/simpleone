import React from 'react';

export function ObstaclePopup({ 
  obstaclePopup, 
  dates, 
  setDates, 
  saveTasks, 
  onClose,
  popupMouseDownTarget 
}) {
  if (!obstaclePopup) return null;

  return (
    <div className="popup-overlay" 
      onMouseDown={(e) => { popupMouseDownTarget.current = e.target; }}
      onMouseUp={(e) => { if (e.target === e.currentTarget && popupMouseDownTarget.current === e.currentTarget) onClose(); }}
    >
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>🚧 {obstaclePopup.taskName} - 방해요소 ({(() => {
          let allObstacles = [];
          const sourceTask = dates[obstaclePopup.dateKey]?.find(t => t.id === obstaclePopup.taskId);
          Object.keys(dates).forEach(key => {
            const sameTask = dates[key]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
            if (sameTask && sameTask.obstacles) {
              allObstacles = allObstacles.concat(sameTask.obstacles.map(obs => ({ ...obs, dateKey: key })));
            }
          });
          return allObstacles.length;
        })()}개)</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
        <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
          {(() => {
            const sourceTask = dates[obstaclePopup.dateKey]?.find(t => t.id === obstaclePopup.taskId);
            const allObstacles = [];
            Object.keys(dates).forEach(key => {
              const sameTask = dates[key]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
              if (sameTask && sameTask.obstacles) {
                sameTask.obstacles.forEach(obs => {
                  allObstacles.push({ ...obs, dateKey: key });
                });
              }
            });
            
            const groupedByDate = {};
            allObstacles.forEach(obstacle => {
              const dateKey = obstacle.dateKey;
              if (!groupedByDate[dateKey]) {
                groupedByDate[dateKey] = [];
              }
              groupedByDate[dateKey].push(obstacle);
            });
            
            return Object.keys(groupedByDate).sort().reverse().map(dateKey => (
              <div key={dateKey} style={{ marginBottom: '16px' }}>
                <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>{dateKey}</div>
                {groupedByDate[dateKey].sort((a, b) => b.timestamp - a.timestamp).map((obstacle, idx) => {
                  const task = dates[dateKey]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                  const obstacleIdx = task?.obstacles?.findIndex(obs => obs.timestamp === obstacle.timestamp);
                  return (
                    <div key={obstacle.timestamp} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', marginBottom: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                      <input
                        type="text"
                        value={obstacle.text}
                        onChange={(e) => {
                          const newDates = { ...dates };
                          const taskToUpdate = newDates[dateKey]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                          if (taskToUpdate && taskToUpdate.obstacles && obstacleIdx !== -1) {
                            taskToUpdate.obstacles[obstacleIdx].text = e.target.value;
                            setDates(newDates);
                            saveTasks(newDates);
                          }
                        }}
                        onKeyDown={(e) => {
                          if (e.key === 'Enter') {
                            e.preventDefault();
                            const newDates = { ...dates };
                            const taskToUpdate = newDates[obstaclePopup.dateKey].find(t => t.id === obstaclePopup.taskId);
                            if (taskToUpdate) {
                              if (!taskToUpdate.obstacles) taskToUpdate.obstacles = [];
                              taskToUpdate.obstacles.unshift({ text: '', timestamp: Date.now() });
                              setDates(newDates);
                              saveTasks(newDates);
                            }
                          } else if (e.key === 'Backspace' && e.target.value === '') {
                            e.preventDefault();
                            const newDates = { ...dates };
                            const taskToUpdate = newDates[dateKey]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                            if (taskToUpdate && taskToUpdate.obstacles && obstacleIdx !== -1) {
                              taskToUpdate.obstacles.splice(obstacleIdx, 1);
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
                        style={{ flex: 1, background: 'transparent', border: 'none', color: 'inherit', fontSize: '14px', outline: 'none' }}
                      />
                      <button
                        onClick={() => {
                          const newDates = { ...dates };
                          const taskToUpdate = newDates[dateKey]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                          if (taskToUpdate && taskToUpdate.obstacles && obstacleIdx !== -1) {
                            taskToUpdate.obstacles.splice(obstacleIdx, 1);
                            setDates(newDates);
                            saveTasks(newDates);
                          }
                        }}
                        style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '16px' }}
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
            const newDates = { ...dates };
            const taskToUpdate = newDates[obstaclePopup.dateKey].find(t => t.id === obstaclePopup.taskId);
            if (taskToUpdate) {
              if (!taskToUpdate.obstacles) taskToUpdate.obstacles = [];
              taskToUpdate.obstacles.unshift({ text: '', timestamp: Date.now() });
              setDates(newDates);
              saveTasks(newDates);
            }
          }}>+ 방해요소 추가</button>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
