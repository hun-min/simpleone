import React from 'react';
import { getSubTasks } from '../utils/taskUtils';

function TaskCard({ 
  task, 
  dateKey, 
  dates,
  selectedSpaceId,
  timerLogs,
  isRunning,
  seconds,
  currentSubTask,
  onCardClick,
  onContextMenu,
  editingTaskId,
  setEditingTaskId,
  updateTask,
  autocompleteData,
  setAutocompleteData,
  editingOriginalText,
  setEditingOriginalText,
  draggedTaskId,
  setDraggedTaskId,
  reorderMode,
  saveTasks,
  cancelTimer
}) {
  const timerKey = `${dateKey}-${task.id}`;
  const allSubTasks = getSubTasks(dates, dateKey, task.id);
  const allCompletedSubTasks = allSubTasks.filter(st => st.completed);
  const touchCount = Object.values(timerLogs).flat().filter(log => log.taskName === task.text).length;
  let allObstacles = [];
  Object.keys(dates).forEach(key => {
    const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
    if (sameTask && sameTask.obstacles) {
      allObstacles = allObstacles.concat(sameTask.obstacles);
    }
  });

  return (
    <div
      draggable={true}
      onDragStart={(e) => {
        setDraggedTaskId(task.id);
        e.dataTransfer.effectAllowed = 'move';
      }}
      onDragOver={(e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = 'move';
      }}
      onDrop={(e) => {
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
      }}
      onDragEnd={() => setDraggedTaskId(null)}
      onClick={editingTaskId === task.id ? undefined : onCardClick}
      style={{ 
        padding: '8px 12px', 
        marginBottom: '6px', 
        background: isRunning ? 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' : (task.isProtocol ? 'linear-gradient(135deg, #FFE5D9 0%, #FFD4C4 100%)' : (task.completed ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)')),
        borderRadius: '12px',
        border: isRunning ? '2px solid #FFD700' : (task.isProtocol ? '2px solid #FF6B35' : (task.completed ? '2px solid #66BB6A' : '2px solid #4CAF50')),
        cursor: 'pointer',
        touchAction: 'manipulation',
        WebkitTapHighlightColor: 'transparent',
        boxShadow: isRunning ? '0 4px 12px rgba(255,215,0,0.3)' : (task.isProtocol ? '0 4px 12px rgba(255,107,53,0.3)' : (task.completed ? '0 2px 8px rgba(76,175,80,0.2)' : '0 2px 8px rgba(0,0,0,0.1)')),
        transition: 'all 0.2s',
        opacity: draggedTaskId === task.id ? 0.5 : (task.completed ? 0.8 : 1)
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
        <div style={{ flex: 1, minWidth: 0 }}>
          {editingTaskId === task.id ? (
            <textarea
              value={task.text}
              onChange={(e) => {
                updateTask(dateKey, [task.id], 'text', e.target.value);
                e.target.style.height = 'auto';
                e.target.style.height = e.target.scrollHeight + 'px';
              }}
              onBlur={() => setEditingTaskId(null)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  setEditingTaskId(null);
                }
              }}
              autoFocus
              placeholder="할 일 입력"
              rows={1}
              style={{
                width: '100%',
                fontWeight: 'bold',
                fontSize: '16px',
                marginBottom: '4px',
                height: '24px',
                lineHeight: '1.4',
                border: 'none',
                background: 'transparent',
                resize: 'none',
                outline: 'none',
                fontFamily: 'inherit',
                color: 'inherit',
                overflow: 'hidden'
              }}
            />
          ) : (
            <div 
              style={{ 
                fontWeight: 'bold', 
                fontSize: '16px', 
                marginBottom: '4px', 
                minHeight: '24px',
                lineHeight: '1.4',
                wordBreak: 'break-word'
              }}
            >
              {task.text || '(제목 없음)'}
            </div>
          )}
        </div>
        {isRunning && (
          <button 
            onClick={(e) => {
              e.stopPropagation();
              cancelTimer(e, timerKey);
            }} 
            style={{ 
              padding: '4px 8px', 
              fontSize: '12px', 
              borderRadius: '4px', 
              border: '1px solid rgba(220,53,69,0.5)', 
              background: 'rgba(220,53,69,0.1)', 
              color: '#dc3545', 
              cursor: 'pointer',
              marginLeft: '8px'
            }}
          >
            ✕
          </button>
        )}
      </div>
      <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px', alignItems: 'center', marginTop: '4px' }}>
        {touchCount > 0 && <span>✨ {touchCount}번</span>}
        {allSubTasks.length > 0 && <span>📋({allCompletedSubTasks.length}/{allSubTasks.length})</span>}
        {allObstacles.length > 0 && <span>🚧({allObstacles.length})</span>}
      </div>
    </div>
  );
}

export default TaskCard;
