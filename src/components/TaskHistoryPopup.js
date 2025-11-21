import React from 'react';
import { formatTime } from '../utils/timeUtils';

export function TaskHistoryPopup({ taskHistoryPopup, dates, setDates, saveTasks, onClose }) {
  if (!taskHistoryPopup) return null;

  return (
    <div className="popup-overlay" onClick={onClose} style={{zIndex: 10020}}>
      {/* 1. 팝업 너비를 800px로 넓힘 */}
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '800px', width: '95vw', padding: '30px' }}>
        
        {/* 헤더 */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:'20px', paddingBottom:'15px', borderBottom:'1px solid rgba(0,0,0,0.1)'}}>
            <h3 style={{margin:0, fontSize:'22px'}}>📊 {taskHistoryPopup.taskName} <span style={{fontSize:'14px', color:'#888', fontWeight:'normal'}}>히스토리</span></h3>
            <button onClick={onClose} style={{ background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: '#888' }}>✕</button>
        </div>
        
        {/* 2. 히트맵 (잔디 심기) */}
        <div style={{ marginBottom: '30px', background:'rgba(0,0,0,0.02)', padding:'15px', borderRadius:'12px' }}>
          <h4 style={{ fontSize: '13px', marginBottom: '10px', color:'#666', textTransform:'uppercase' }}>최근 90일 몰입 기록</h4>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: '4px', justifyContent: 'center' }}>
            {Array.from({ length: 90 }, (_, i) => {
              const date = new Date();
              date.setDate(date.getDate() - (89 - i));
              const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
              const dayTasks = dates[key] || [];
              const task = dayTasks.find(t => t.text === taskHistoryPopup.taskName);
              const hasTask = !!task;
              const isCompleted = task?.completed;
              
              // 색상 로직: 완료(초록) > 진행중(노랑) > 없음(회색)
              let bgColor = 'rgba(0,0,0,0.05)'; // 없음
              if (isCompleted) bgColor = '#4CAF50';
              else if (hasTask) bgColor = '#FFB74D';

              return (
                <div 
                  key={i} 
                  style={{ 
                    width: '12px', height: '12px', 
                    background: bgColor,
                    borderRadius: '2px',
                    cursor: 'help'
                  }}
                  title={`${key}: ${isCompleted ? '완료' : hasTask ? '진행중' : '없음'}`}
                />
              );
            })}
          </div>
        </div>
        
        {/* 3. 타임라인 리스트 */}
        <h4 style={{ fontSize: '14px', marginBottom: '15px', color:'#666' }}>상세 기록</h4>
        <div style={{ maxHeight: '50vh', overflowY: 'auto', paddingRight:'5px' }}>
            {(() => {
              const records = [];
              Object.keys(dates).sort().reverse().forEach(dateKey => {
                const task = dates[dateKey].find(t => t.text === taskHistoryPopup.taskName);
                if (task) records.push({ dateKey, task });
              });

              if (records.length === 0) {
                return <div style={{ textAlign: 'center', padding: '40px', color: '#999' }}>기록이 없습니다.</div>;
              }

              return records.map(({ dateKey, task }) => {
                const subTasks = task.subTasks || [];
                return (
                  <div key={dateKey} style={{ display:'flex', gap:'15px', marginBottom: '20px' }}>
                    
                    {/* 왼쪽: 날짜 */}
                    <div style={{ minWidth: '60px', textAlign:'right' }}>
                        <div style={{ fontWeight:'bold', fontSize:'16px', color:'#333' }}>
                            {dateKey.split('-')[1]}.{dateKey.split('-')[2]}
                        </div>
                        <div style={{ fontSize:'12px', color:'#999' }}>
                            {dateKey.split('-')[0]}
                        </div>
                    </div>

                    {/* 오른쪽: 내용 카드 */}
                    <div style={{ flex:1, background:'rgba(255,255,255,0.5)', border:'1px solid rgba(0,0,0,0.08)', borderRadius:'12px', padding:'15px' }}>
                        
                        {/* 카드 헤더 */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom:'8px' }}>
                            <div style={{ display:'flex', alignItems:'center', gap:'8px' }}>
                                {task.completed ? (
                                    <span style={{ background:'#E8F5E9', color:'#2E7D32', padding:'2px 8px', borderRadius:'6px', fontSize:'12px', fontWeight:'bold' }}>✓ 완료</span>
                                ) : (
                                    <span style={{ background:'#FFF3E0', color:'#EF6C00', padding:'2px 8px', borderRadius:'6px', fontSize:'12px', fontWeight:'bold' }}>진행중</span>
                                )}
                                <span style={{ fontSize:'13px', color:'#666', fontWeight:'500' }}>
                                    ⏱️ {formatTime(task.todayTime)} 수행
                                </span>
                            </div>
                        </div>

                        {/* 하위 할일 (편집 가능) - popup-list-item 클래스 적용하여 디자인 통일 */}
                        {subTasks.length > 0 && (
                            <div style={{ marginTop: '10px', borderTop:'1px solid #eee', paddingTop:'10px' }}>
                                {subTasks.map((sub) => {
                                    const subTaskIdx = task.subTasks?.findIndex(st => st.id === sub.id);
                                    return (
                                        <div key={sub.id} className="popup-list-item" style={{background:'transparent', borderBottom:'1px solid #f5f5f5', padding:'4px 0'}}>
                                            <input
                                                type="checkbox"
                                                checked={sub.completed}
                                                onChange={(e) => {
                                                    const newDates = { ...dates };
                                                    const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                                    if (taskToUpdate?.subTasks && subTaskIdx !== -1) {
                                                        taskToUpdate.subTasks[subTaskIdx].completed = e.target.checked;
                                                        setDates(newDates);
                                                        saveTasks(newDates);
                                                    }
                                                }}
                                            />
                                            <input
                                                type="text"
                                                value={sub.text}
                                                onChange={(e) => {
                                                    const newDates = { ...dates };
                                                    const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                                    if (taskToUpdate?.subTasks && subTaskIdx !== -1) {
                                                        taskToUpdate.subTasks[subTaskIdx].text = e.target.value;
                                                        setDates(newDates);
                                                        saveTasks(newDates);
                                                    }
                                                }}
                                                style={{ color: sub.completed ? '#999' : '#333', textDecoration: sub.completed ? 'line-through' : 'none' }}
                                            />
                                            {/* 삭제 버튼 */}
                                            <button
                                                onClick={() => {
                                                    if(window.confirm('삭제하시겠습니까?')) {
                                                        const newDates = { ...dates };
                                                        const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                                        if (taskToUpdate?.subTasks && subTaskIdx !== -1) {
                                                            taskToUpdate.subTasks.splice(subTaskIdx, 1);
                                                            setDates(newDates);
                                                            saveTasks(newDates);
                                                        }
                                                    }
                                                }}
                                            >
                                                ✕
                                            </button>
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                  </div>
                );
              });
            })()}
        </div>
        
        <div className="popup-buttons" style={{ marginTop: '20px' }}>
          <button onClick={onClose} style={{background:'#f0f0f0', color:'#333', border:'none'}}>닫기</button>
        </div>
      </div>
    </div>
  );
}
