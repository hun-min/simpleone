import React from 'react';
import { formatTime } from '../utils/timeUtils';

export function TaskHistoryPopup({ taskHistoryPopup, dates, setDates, saveTasks, onClose }) {
  if (!taskHistoryPopup) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
        <h3>📊 {taskHistoryPopup.taskName} 기록</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
        
        <div style={{ marginBottom: '20px' }}>
          <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>90일 히트맵</h4>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '2px' }}>
            {Array.from({ length: 90 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (89 - i));
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const dayTasks = dates[key] || [];
              const task = dayTasks.find(t => t.text === taskHistoryPopup.taskName);
              const hasTask = !!task;
              const isCompleted = task?.completed;
              const subTasks = task?.subTasks || [];
              const completedSub = subTasks.filter(t => t.completed).length;
              const totalSub = subTasks.length;
              
              return (
                <div 
                  key={i} 
                  style={{ 
                    width: '100%', 
                    paddingBottom: '100%', 
                    background: isCompleted ? '#4CAF50' : hasTask ? '#FFA726' : '#333',
                    borderRadius: '2px',
                    position: 'relative',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center'
                  }}
                  title={`${key}: ${isCompleted ? '완료' : hasTask ? '진행중' : '없음'}${totalSub > 0 ? ` (하위: ${completedSub}/${totalSub})` : ''}`}
                >
                  {totalSub > 0 && (
                    <span style={{ position: 'absolute', fontSize: '10px', color: 'white', fontWeight: 'bold', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                      {completedSub}/{totalSub}
                    </span>
                  )}
                </div>
              );
            })}
          </div>
          <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '12px', justifyContent: 'center' }}>
            <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4CAF50', borderRadius: '2px', marginRight: '4px' }}></span>완료</span>
            <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#FFA726', borderRadius: '2px', marginRight: '4px' }}></span>진행중</span>
            <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#333', borderRadius: '2px', marginRight: '4px' }}></span>없음</span>
          </div>
        </div>
        
        <div>
          <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>날짜별 기록</h4>
          <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
            {(() => {
              const records = [];
              Object.keys(dates).sort().reverse().forEach(dateKey => {
                const task = dates[dateKey].find(t => t.text === taskHistoryPopup.taskName);
                if (task) {
                  records.push({ dateKey, task });
                }
              });
              if (records.length === 0) {
                return <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>기록이 없습니다.</p>;
              }
              return records.map(({ dateKey, task }) => {
                const subTasks = task.subTasks || [];
                return (
                  <div key={dateKey} style={{ padding: '8px', marginBottom: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '13px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                      <span style={{ fontWeight: 'bold' }}>{dateKey}</span>
                      {task.completed && <span style={{ color: '#4CAF50' }}>✓ 완료</span>}
                    </div>
                    <div style={{ marginTop: '4px', color: '#888', fontSize: '12px' }}>
                      오늘: {formatTime(task.todayTime)} | 총: {formatTime(task.totalTime)}
                      {task.todayGoal > 0 && ` | 목표: ${formatTime(task.todayGoal)}`}
                    </div>
                    {subTasks.length > 0 && (
                      <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid #444' }}>
                        <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>하위할일 ({subTasks.filter(t => t.completed).length}/{subTasks.length})</div>
                        {subTasks.map((sub) => {
                          const subTaskIdx = task.subTasks?.findIndex(st => st.id === sub.id);
                          return (
                            <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginBottom: '2px' }}>
                              <input
                                type="checkbox"
                                checked={sub.completed}
                                onChange={(e) => {
                                  const newDates = { ...dates };
                                  const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                  if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                    taskToUpdate.subTasks[subTaskIdx].completed = e.target.checked;
                                    setDates(newDates);
                                    saveTasks(newDates);
                                  }
                                }}
                                style={{ width: '12px', height: '12px' }}
                              />
                              <input
                                type="text"
                                value={sub.text}
                                onChange={(e) => {
                                  const newDates = { ...dates };
                                  const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                  if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                    taskToUpdate.subTasks[subTaskIdx].text = e.target.value;
                                    setDates(newDates);
                                    saveTasks(newDates);
                                  }
                                }}
                                onKeyDown={(e) => {
                                  if (e.key === 'Backspace' && e.target.value === '') {
                                    const newDates = { ...dates };
                                    const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                    if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                      taskToUpdate.subTasks.splice(subTaskIdx, 1);
                                      setDates(newDates);
                                      saveTasks(newDates);
                                    }
                                  }
                                }}
                                style={{ flex: 1, background: 'transparent', border: 'none', color: sub.completed ? '#4CAF50' : '#888', fontSize: '11px', padding: '2px' }}
                              />
                              <button
                                onClick={() => {
                                  const newDates = { ...dates };
                                  const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                  if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                    taskToUpdate.subTasks.splice(subTaskIdx, 1);
                                    setDates(newDates);
                                    saveTasks(newDates);
                                  }
                                }}
                                style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '11px', padding: '2px' }}
                              >
                                ✕
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              });
            })()}
          </div>
        </div>
        
        <div className="popup-buttons" style={{ marginTop: '20px' }}>
          <button onClick={onClose}>닫기</button>
        </div>
      </div>
    </div>
  );
}
