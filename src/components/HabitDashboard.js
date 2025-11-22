import React, { useState, useEffect } from 'react';

const HabitDashboard = ({ dates, setDates, saveTasks, selectedSpaceId }) => {
  const today = new Date();
  const dateKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('myHabits');
    return saved ? JSON.parse(saved) : [
      { id: 1, name: '독서 10페이지', icon: '📚' },
      { id: 2, name: '스쿼트 50개', icon: '🏋️' },
      { id: 3, name: '3D 렌더링 1컷', icon: '🧊' },
    ];
  });

  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');

  const toggleHabit = (habitId) => {
    const newDates = { ...dates };
    if (!newDates[dateKey]) newDates[dateKey] = [];
    
    let habitLog = {};
    const habitLogTask = newDates[dateKey].find(t => t.id === 'habitLog' && (t.spaceId || 'default') === selectedSpaceId);
    if (habitLogTask) {
      habitLog = habitLogTask.habitLog || {};
    }
    
    habitLog[habitId] = !habitLog[habitId];
    
    if (habitLogTask) {
      habitLogTask.habitLog = habitLog;
    } else {
      newDates[dateKey].push({
        id: 'habitLog',
        habitLog,
        spaceId: selectedSpaceId || 'default'
      });
    }
    
    setDates(newDates);
    saveTasks(newDates);
  };

  const addHabit = () => {
    if (newHabitName.trim()) {
      const newHabits = [...habits, { id: Date.now(), name: newHabitName, icon: '✨' }];
      setHabits(newHabits);
      localStorage.setItem('myHabits', JSON.stringify(newHabits));
      setNewHabitName('');
      setIsAdding(false);
    }
  };

  const deleteHabit = (e, id) => {
    e.preventDefault();
    e.stopPropagation();
    if (window.confirm('이 습관 스위치를 제거하시겠습니까?')) {
      const newHabits = habits.filter(h => h.id !== id);
      setHabits(newHabits);
      localStorage.setItem('myHabits', JSON.stringify(newHabits));
    }
  };

  const getHabitLog = () => {
    const habitLogTask = dates[dateKey]?.find(t => t.id === 'habitLog' && (t.spaceId || 'default') === selectedSpaceId);
    return habitLogTask?.habitLog || {};
  };

  return (
    <div className="habit-dashboard-container">
      <h3 className="dashboard-title">
        🚘 AUTONOMOUS DRIVE <span style={{color:'#4CAF50', fontSize:'12px'}}>● ONLINE</span>
      </h3>
      
      <div className="dashboard-grid">
        {habits.map((habit) => {
          const habitLog = getHabitLog();
          const isDone = habitLog[habit.id] || false;
          
          return (
            <div 
              key={habit.id} 
              className={`dashboard-switch ${isDone ? 'active' : ''}`}
              onClick={() => toggleHabit(habit.id)}
              onContextMenu={(e) => deleteHabit(e, habit.id)}
            >
              <div className="switch-metal-plate"></div>
              
              <div className="switch-led-indicator">
                <div className={`led-light ${isDone ? 'on' : 'off'}`}></div>
              </div>

              <div className="switch-label">
                <span className="habit-icon">{habit.icon}</span>
                <span className="habit-name">{habit.name}</span>
              </div>

              <div className="switch-click-overlay"></div>
            </div>
          );
        })}

        <div className="dashboard-switch add-btn" onClick={() => setIsAdding(true)}>
          <div className="switch-metal-plate" style={{background:'#2c2c2c'}}></div>
          <div className="switch-label" style={{justifyContent:'center', color:'#666'}}>
            +
          </div>
        </div>
      </div>

      {isAdding && (
        <div className="dashboard-input-area">
          <input 
            autoFocus
            type="text" 
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="새 습관 이름..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') addHabit();
              if (e.key === 'Escape') setIsAdding(false);
            }}
          />
          <button onClick={addHabit}>장착</button>
          <button onClick={() => setIsAdding(false)}>취소</button>
        </div>
      )}
    </div>
  );
};

export default HabitDashboard;
