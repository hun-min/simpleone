import React, { useState, useRef } from 'react';

const HabitDashboard = ({ habits, habitLogs, onToggleHabit, onAddHabit, onDeleteHabit, onToggleHabitActive, onEditHabit, onReorderHabits, isVisible, onVisibilityChange, dateKey, taskSuggestions = [] }) => {
  // 완전히 숨겨진 상태(체크해제)이고, 편집 모드도 아니면 렌더링 안 함
  // (단, 부모에서 강제로 보여주는 경우는 제외 - 여기선 onVisibilityChange가 있으면 제어권이 내부에 있음)
  if (!isVisible && !onVisibilityChange) return null;

  const [isAdding, setIsAdding] = useState(false);
  const [newHabitName, setNewHabitName] = useState('');
  const [editMode, setEditMode] = useState(false);
  
  const dragItem = useRef();
  const dragOverItem = useRef();
  const longPressTimer = useRef(null);

  const dragStart = (e, position) => {
    if (navigator.vibrate) navigator.vibrate(50);
    dragItem.current = position;
    e.target.style.opacity = '0.5';
  };

  const dragEnter = (e, position) => {
    dragOverItem.current = position;
    e.preventDefault();
  };

  const drop = (e) => {
    e.target.style.opacity = '1';
    const copyListItems = [...habits];
    const dragItemContent = copyListItems[dragItem.current];
    copyListItems.splice(dragItem.current, 1);
    copyListItems.splice(dragOverItem.current, 0, dragItemContent);
    dragItem.current = null;
    dragOverItem.current = null;
    onReorderHabits(copyListItems);
  };

  const handleTouchStart = (e, habit) => {
    if (!editMode) return;
    longPressTimer.current = setTimeout(() => {
      if(window.confirm(`'${habit.name}' 습관을 삭제하시겠습니까?`)) {
        onDeleteHabit(habit.id);
      }
    }, 600);
  };

  const handleTouchEnd = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const handleTouchMove = () => {
    if (longPressTimer.current) clearTimeout(longPressTimer.current);
  };

  const todayLog = habitLogs[dateKey] || {};

  const handleAdd = () => {
    if (newHabitName.trim()) {
      onAddHabit(newHabitName);
      setNewHabitName('');
      setIsAdding(false);
    }
  };

  return (
    <div className="habit-dashboard-container" onContextMenu={(e) => e.preventDefault()}>
      {/* 타이틀 영역 */}
      <div className="dashboard-title">
        <span>🚘 AUTONOMOUS DRIVE <span style={{color:'#4CAF50', fontSize:'12px'}}>● ONLINE</span></span>

        {/* [수정] 텍스트: 관리 / 완료 */}
        <button 
          onClick={() => setEditMode(!editMode)}
          style={{
            background: 'transparent', 
            border: 'none', 
            color: editMode ? '#FF4D4D' : '#666', 
            fontSize:'12px', 
            cursor:'pointer',
            textDecoration: 'underline'
          }}
        >
          {editMode ? '완료' : '관리'}
        </button>
      </div>

      {/* ★ [수정] 편집 모드일 때만 보이는 '대시보드 끄기' 옵션 */}
      {editMode && (
        <div style={{background:'rgba(255,0,0,0.1)', padding:'8px', marginBottom:'10px', borderRadius:'8px', display:'flex', justifyContent:'center'}}>
          <label style={{fontSize:'13px', color:'#FF4D4D', cursor:'pointer', display:'flex', alignItems:'center', gap:'6px', fontWeight:'bold'}}>
            <input 
              type="checkbox" 
              checked={isVisible} 
              onChange={(e) => onVisibilityChange(e.target.checked)} 
            />
            대시보드 화면에 표시 (체크 해제 시 숨김)
          </label>
        </div>
      )}
      
      {/* 습관 그리드 */}
      <div className="dashboard-grid">
        {habits.map((habit, index) => {
          // 비활성화된 습관은 편집 모드가 아닐 땐 숨김
          if (!habit.isActive && !editMode) return null;
          const isDone = !!todayLog[habit.id];
          
          return (
            <div 
              key={habit.id} 
              className={`dashboard-switch ${isDone ? 'active' : ''}`}
              style={{ opacity: habit.isActive ? 1 : 0.4, filter: habit.isActive ? 'none' : 'grayscale(100%)', cursor: editMode ? 'grab' : 'pointer' }}
              draggable={editMode}
              onDragStart={(e) => editMode && dragStart(e, index)}
              onDragEnter={(e) => editMode && dragEnter(e, index)}
              onDragEnd={drop}
              onDragOver={(e) => e.preventDefault()}
              onTouchStart={(e) => handleTouchStart(e, habit)}
              onTouchEnd={handleTouchEnd}
              onTouchMove={handleTouchMove}
              onContextMenu={(e) => {
                e.preventDefault();
                if(editMode && window.confirm(`'${habit.name}' 습관을 삭제하시겠습니까?`)) {
                  onDeleteHabit(habit.id);
                }
              }}
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
              
              {/* 편집 모드일 때 수정 버튼 (삭제는 우클릭으로 대체 가능하지만 직관성을 위해 X도 유지) */}
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
                </div>
              )}
              <div className="switch-click-overlay"></div>
            </div>
          );
        })}

        {/* 추가 버튼 */}
        {(editMode || habits.length === 0) && (
          <div className="dashboard-switch add-btn" onClick={() => setIsAdding(true)}>
            <div className="switch-metal-plate" style={{background:'#2c2c2c'}}></div>
            <div className="switch-label" style={{justifyContent:'center', color:'#666'}}>+</div>
          </div>
        )}
      </div>

      {/* 추가 입력창 */}
      {isAdding && (
        <div className="dashboard-input-area">
          <input 
            autoFocus
            type="text" 
            value={newHabitName}
            onChange={(e) => setNewHabitName(e.target.value)}
            placeholder="새 습관 (할일 자동완성)"
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
