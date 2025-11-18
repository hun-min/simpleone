import React from 'react';
import { getTaskStats } from '../utils/taskUtils';

export function MonthView({ currentDate, dates, selectedSpaceId, timerLogs, expandedDays, setExpandedDays, setCurrentDate, setViewMode }) {
  return (
    <div className="month-view">
      <h2>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
      {Array.from({ length: 31 }, (_, i) => {
        const day = i + 1;
        const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
        const dayStats = getTaskStats(dates, key, selectedSpaceId);
        return (
          <div key={day} className="month-day">
            <div className="month-day-header" onClick={() => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setViewMode('list'); }}>
              <strong>{day}일</strong>
              {dayStats.total > 0 && <span className="month-day-stats">{dayStats.completed}/{dayStats.total}</span>}
            </div>
            <div className="month-tasks">
              {dates[key]?.filter(t => (t.spaceId || 'default') === selectedSpaceId).map(task => {
                const taskLogs = timerLogs[key]?.filter(log => log.taskName === task.text) || [];
                const times = taskLogs.map(log => {
                  const start = new Date(log.startTime);
                  const end = new Date(log.endTime);
                  return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}-${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                }).join(', ');
                return (
                  <div key={task.id} className="month-task" style={{ opacity: task.completed ? 0.5 : 1 }}>
                    {task.text || '(제목 없음)'}
                    {times && <span className="month-task-time">{times}</span>}
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
}
