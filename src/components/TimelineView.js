import React from 'react';
import { formatTime } from '../utils/timeUtils';

export function TimelineView({ dateKey, timerLogs, dates, selectedSpaceId, setLogEditPopup }) {
  const allLogs = timerLogs[dateKey] || [];
  const logs = allLogs.filter(log => {
    const task = (dates[dateKey] || []).find(t => t.text === log.taskName);
    return !task || (task.spaceId || 'default') === selectedSpaceId;
  });
  const completedTasks = (dates[dateKey] || []).filter(t => t.completed && t.completedAt && (t.spaceId || 'default') === selectedSpaceId);

  if (logs.length === 0 && completedTasks.length === 0) {
    return <p>오늘 기록된 타이머가 없습니다.</p>;
  }

  return (
    <div className="timeline-container">
      {logs.map((log, idx) => {
        const start = new Date(log.startTime);
        const end = new Date(log.endTime);
        const startHour = start.getHours();
        const startMin = start.getMinutes();
        const endHour = end.getHours();
        const endMin = end.getMinutes();
        const duration = log.duration;
        const topPos = (startHour * 60 + startMin) / 1440 * 100;
        const height = (duration / 60) / 1440 * 100;
        const isSameTime = startHour === endHour && startMin === endMin;
        
        return (
          <div 
            key={`log-${idx}`} 
            className="timeline-item" 
            style={{ top: `${topPos}%`, height: `${Math.max(height, 0.5)}%` }}
            onClick={() => setLogEditPopup({ dateKey, logIndex: idx, log })}
          >
            <span className="timeline-time">{isSameTime ? `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}` : `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}-${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`}</span>
            <span className="timeline-task">{log.taskName}</span>
            <span className="timeline-duration">({formatTime(duration)})</span>
          </div>
        );
      })}
      {completedTasks.map((task) => {
        const completedTime = new Date(task.completedAt);
        const endHour = completedTime.getHours();
        const endMin = completedTime.getMinutes();
        const duration = task.todayTime;
        const startTime = new Date(completedTime.getTime() - duration * 1000);
        const startHour = startTime.getHours();
        const startMin = startTime.getMinutes();
        const topPos = (startHour * 60 + startMin) / 1440 * 100;
        const height = (duration / 60) / 1440 * 100;
        const isSameTime = startHour === endHour && startMin === endMin;
        
        return (
          <div 
            key={`task-${task.id}`} 
            className="timeline-item timeline-completed" 
            style={{ top: `${topPos}%`, height: `${Math.max(height, 0.5)}%`, minHeight: '30px' }}
          >
            <span className="timeline-time">{isSameTime ? `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}` : `${String(startHour).padStart(2, '0')}:${String(startMin).padStart(2, '0')}-${String(endHour).padStart(2, '0')}:${String(endMin).padStart(2, '0')}`}</span>
            <span className="timeline-task">✓ {task.text}</span>
            <span className="timeline-duration">({formatTime(duration)})</span>
          </div>
        );
      })}
      <div className="timeline-hours">
        {Array.from({ length: 24 }, (_, i) => (
          <div key={i} className="timeline-hour" style={{ top: `${i / 24 * 100}%` }}>
            {String(i).padStart(2, '0')}:00
          </div>
        ))}
      </div>
    </div>
  );
}
