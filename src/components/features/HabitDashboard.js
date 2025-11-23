import React, { useState } from 'react';

const HabitDashboard = ({ habits, habitLogs, onToggleHabit, onAddHabit, onDeleteHabit, onToggleHabitActive, onEditHabit, isVisible, dateKey, taskSuggestions = [] }) => {
  if (!isVisible) return null;

  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [editMode, setEditMode] = useState(false);

  const todayLog = habitLogs[dateKey] || {};

  const handleAdd = () => {
    if (newHabitName.trim()) {
      onAddHabit(newHabitName);
      setNewHabitName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="habit-dashboard-container">
      <div className="dashboard-title">
        <span>🚘 {dateKey} <span style={{color:'#4CAF50', fontSize:'12px'}}>● STATUS</span></span>
        <button 
            onClick={() => setEditMode(!editMode)}
            style={{background: 'transparent', border: 'none', color: editMode ? '#FF4D4D' : '#666', fontSize:'12px', cursor:'pointer', textDecoration: 'underline'}}
        >
            {editMode ? '편집 완료' : '습관 관리'}
        </button>
      </div>
      
      <div className="dashboard-grid">
        {habits.map((habit) => {
          if (!habit.isActive && !editMode) return null;
          const isDone = !!todayLog[habit.id];
          
          return (
            <div 
                key={habit.id} 
                className={`dashboard-switch ${isDone ? 'active' : ''}`}
                style={{ opacity: habit.isActive ? 1 : 0.4, filter: habit.isActive ? 'none' : 'grayscale(100%)' }}
                onClick={() => {
                    if (editMode) onToggleHabitActive(habit.id);
                    else onToggleHabit(dateKey, habit.id);
                }}
            >
              <div className="switch-metal-plate"></div>
              <div className="switch-led-indicator">
                {editMode ? (
                    <span style={{fontSize:'10px', fontWeight:'bold', color: habit.isActive ? '#4CAF50' : '#666'}}>{habit.isActive ? 'ON' : 'OFF'}</span>
                ) : (
                    <div className={`led-light ${isDone ? 'on' : 'off'}`}></div>
                )}
              </div>
              <div className="switch-label">
                <span className="habit-icon">{habit.icon}</span>
                <span className="habit-name">{habit.name}</span>
              </div>
              
              {editMode && (
                  <div style={{position:'absolute', top:4, right:4, display:'flex', gap:'4px', zIndex:10}}>
                      <button 
                        onClick={(e) => { 
                            e.stopPropagation(); 
                            const newName = prompt("이름 수정:", habit.name);
                            if(newName) onEditHabit(habit.id, newName);
                        }}
                        style={{fontSize:'12px', background:'#333', color:'white', border:'1px solid #555', borderRadius:'4px', width:'24px', height:'24px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}
                      >✎</button>
                      <button 
                        onClick={(e) => { e.stopPropagation(); onDeleteHabit(habit.id); }}
                        style={{fontSize:'12px', background:'#FF3B30', color:'white', border:'none', borderRadius:'4px', width:'24px', height:'24px', cursor:'pointer', display:'flex', alignItems:'center', justifyContent:'center'}}
                      >×</button>
                  </div>
              )}
            </div>
          );
        })}

        {(editMode || habits.length === 0) && (
            <div className="dashboard-switch add-btn" onClick={() => setIsAdding(true)}>
                <div className="switch-metal-plate" style={{background:'#2c2c2c'}}></div>
                <div className="switch-label" style={{justifyContent:'center', color:'#666'}}>+</div>
            </div>
        )}
      </div>

      {isAdding && (
        <div className="dashboard-input-area">
            <input 
                autoFocus
                type="text" 
                value={newHabitName}
                onChange={(e) => setNewHabitName(e.target.value)}
                placeholder="새 습관 (기존 할 일 자동완성)"
                onKeyDown={(e) => e.key === 'Enter' && handleAdd()}
                list="habit-suggestions" 
            />
            
            <datalist id="habit-suggestions">
                {taskSuggestions.map((taskName, idx) => (
                    <option key={idx} value={taskName} />
                ))}
            </datalist>

            <button onClick={handleAdd}>등록</button>
            <button onClick={() => setIsAdding(false)} style={{background:'transparent', border:'1px solid #555', color:'#888'}}>취소</button>
        </div>
      )}
    </div>
  );
};

export default HabitDashboard;
