import React from 'react';
import { formatTime } from '../utils/timeUtils';

export default function TaskCard({ 
  task, 
  dateKey,
  isRunning,
  seconds,
  touchCount,
  editingTaskId,
  setEditingTaskId,
  autocompleteData,
  setAutocompleteData,
  newlyCreatedTasks,
  draggedTaskId,
  setDraggedTaskId,
  onToggleTimer,
  onUpdateTask,
  onContextMenu,
  onCancelTimer,
  onSubTasksClick,
  onObstacleClick,
  getSubTasks
}) {
  return (
    <div 
      draggable
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
          // 드롭 처리는 부모에서
        }
        setDraggedTaskId(null);
      }}
      onDragEnd={() => setDraggedTaskId(null)}
      onContextMenu={onContextMenu}
      onClick={(e) => {
        if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !e.target.closest('textarea') && !e.target.closest('.autocomplete-dropdown')) {
          onToggleTimer();
        }
      }}
      style={{
        background: task.completed ? 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)' : 'linear-gradient(135deg, #f5f5f5 0%, #e8e8e8 100%)',
        borderRadius: '16px',
        padding: '20px',
        boxShadow: isRunning ? '0 8px 24px rgba(255,215,0,0.4)' : task.completed ? '0 4px 12px rgba(76,175,80,0.2)' : '0 4px 12px rgba(0,0,0,0.08)',
        transition: 'all 0.3s',
        border: isRunning ? '2px solid #FFD700' : task.completed ? '2px solid #66BB6A' : '2px solid #4CAF50',
        cursor: 'pointer',
        position: 'relative',
        opacity: task.completed ? 0.7 : 0.85,
        transform: isRunning ? 'scale(1.02)' : 'scale(1)',
        animation: isRunning ? 'pulse 2s infinite' : 'none'
      }}
    >
      <div style={{ position: 'relative', marginBottom: '12px' }}>
        <textarea
          value={task.text}
          readOnly={editingTaskId !== task.id}
          onChange={(e) => {
            if (editingTaskId !== task.id) {
              e.preventDefault();
              e.stopPropagation();
              e.target.value = task.text;
              return;
            }
            onUpdateTask('text', e.target.value);
            if (e.target.value.trim() !== '' && newlyCreatedTasks.current.has(task.id)) {
              newlyCreatedTasks.current.delete(task.id);
            }
          }}
          onKeyDown={(e) => {
            if (editingTaskId !== task.id) {
              if (e.key === 'Enter') {
                e.preventDefault();
                setEditingTaskId(task.id);
                return;
              }
              return;
            }
            if (e.key === 'Enter') {
              e.preventDefault();
              setEditingTaskId(null);
              e.target.blur();
            }
          }}
          onClick={(e) => {
            if (editingTaskId !== task.id) {
              e.stopPropagation();
              e.preventDefault();
              onToggleTimer();
            }
          }}
          placeholder="원하는 것"
          rows={1}
          data-task-id={task.id}
          style={{ 
            fontSize: '18px', 
            fontWeight: '600', 
            color: editingTaskId === task.id ? '#000' : '#666',
            width: '100%', 
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
            boxShadow: editingTaskId === task.id ? '0 4px 12px rgba(76, 175, 80, 0.4)' : 'none',
            transition: 'all 0.3s ease',
            transform: editingTaskId === task.id ? 'scale(1.02)' : 'scale(1)'
          }}
        />
      </div>
      <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666', marginBottom: '8px', alignItems: 'center' }}>
        <span>{isRunning ? `⏸ ${formatTime(task.todayTime + seconds)}` : `▶ ${formatTime(task.todayTime)}`}</span>
        <span>총 {formatTime(task.totalTime)}</span>
        {isRunning && (
          <button onClick={onCancelTimer} style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid rgba(220,53,69,0.5)', background: 'rgba(220,53,69,0.1)', color: '#dc3545', cursor: 'pointer' }}>✕</button>
        )}
      </div>
      {touchCount > 0 && (
        <div style={{ fontSize: '13px', color: '#888' }}>✨ {touchCount}번</div>
      )}
      <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
        {(() => {
          const subTasks = getSubTasks(dateKey, task.id);
          return (
            <>
              {subTasks.length > 0 && (
                <span 
                  onClick={(e) => {
                    e.stopPropagation();
                    onSubTasksClick();
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
                  📋({subTasks.length})
                </span>
              )}
            </>
          );
        })()}
      </div>
    </div>
  );
}
