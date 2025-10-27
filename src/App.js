import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './App.css';
import { auth, googleProvider, db } from './firebase';
import { signInWithPopup, signOut, onAuthStateChanged } from 'firebase/auth';
import { doc, setDoc, onSnapshot } from 'firebase/firestore';

function App() {
  const [dates, setDates] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTimers, setActiveTimers] = useState({});
  const [timerSeconds, setTimerSeconds] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);
  const [draggedTask, setDraggedTask] = useState(null);
  const [dragOverTask, setDragOverTask] = useState(null);
  const [user, setUser] = useState(null);
  const [useFirebase, setUseFirebase] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [viewMode, setViewMode] = useState('day'); // 'day', 'month', or 'timeline'
  const [timerLogs, setTimerLogs] = useState({});

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser && useFirebase) {
        const docRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            setDates(doc.data().dates || {});
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        const saved = localStorage.getItem('goalTrackerData');
        if (saved) setDates(JSON.parse(saved));
        const savedLogs = localStorage.getItem('timerLogs');
        if (savedLogs) setTimerLogs(JSON.parse(savedLogs));
      }
    });
    return () => unsubscribe();
  }, [useFirebase]);

  useEffect(() => {
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        const updated = {};
        Object.keys(prev).forEach(key => {
          updated[key] = prev[key] + 1;
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, []);

  useEffect(() => {
    if (Object.keys(dates).length > 0) {
      localStorage.setItem('goalTrackerData', JSON.stringify(dates));
      
      if (user && useFirebase) {
        const docRef = doc(db, 'users', user.uid);
        setDoc(docRef, { dates }, { merge: true });
      }
      
      const backups = [];
      for (let i = 0; i < 10; i++) {
        const backup = localStorage.getItem(`backup_${i}`);
        if (backup) backups.push(backup);
      }
      
      backups.unshift(JSON.stringify({ dates, timestamp: new Date().toISOString() }));
      if (backups.length > 10) backups.pop();
      
      backups.forEach((backup, i) => {
        localStorage.setItem(`backup_${i}`, backup);
      });
    }
  }, [dates, user, useFirebase]);

  const saveTasks = (newDates, addToHistory = true) => {
    localStorage.setItem('goalTrackerData', JSON.stringify(newDates));
    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newDates)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };

  const undo = () => {
    if (historyIndex > 0) {
      setHistoryIndex(historyIndex - 1);
      setDates(history[historyIndex - 1]);
      saveTasks(history[historyIndex - 1], false);
    }
  };

  const redo = () => {
    if (historyIndex < history.length - 1) {
      setHistoryIndex(historyIndex + 1);
      setDates(history[historyIndex + 1]);
      saveTasks(history[historyIndex + 1], false);
    }
  };

  const downloadBackup = () => {
    const dataStr = JSON.stringify({ dates }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `goal-tracker-${new Date().toISOString().split('T')[0]}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const loadBackup = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          setDates(data.dates || {});
          saveTasks(data.dates || {});
          alert('불러오기 완료!');
        } catch (err) {
          alert('파일 형식이 올바르지 않습니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  const addTask = (dateKey, parentPath = [], index = -1) => {
    const newDates = { ...dates };
    if (!newDates[dateKey]) newDates[dateKey] = [];
    
    const newTask = {
      id: Date.now(),
      text: '',
      todayTime: 0,
      totalTime: 0,
      goalTime: 0,
      completed: false,
      children: []
    };

    if (parentPath.length === 0) {
      if (index === -1) {
        newDates[dateKey].push(newTask);
      } else {
        newDates[dateKey].splice(index + 1, 0, newTask);
      }
    } else {
      let parent = newDates[dateKey];
      for (let i = 0; i < parentPath.length - 1; i++) {
        parent = parent.find(t => t.id === parentPath[i]).children;
      }
      const task = parent.find(t => t.id === parentPath[parentPath.length - 1]);
      if (index === -1) {
        task.children.push(newTask);
      } else {
        task.children.splice(index + 1, 0, newTask);
      }
    }

    setDates(newDates);
    saveTasks(newDates);
  };

  const deleteTask = (dateKey, taskPath) => {
    const newDates = { ...dates };
    
    // 삭제할 태스크 찾기
    let tasks = newDates[dateKey];
    if (taskPath.length > 1) {
      for (let i = 0; i < taskPath.length - 1; i++) {
        tasks = tasks.find(t => t.id === taskPath[i]).children;
      }
    }
    
    const taskIdx = tasks.findIndex(t => t.id === taskPath[taskPath.length - 1]);
    const deletedTask = tasks[taskIdx];
    
    // 하위 할일을 현재 레벨로 이동
    if (deletedTask.children && deletedTask.children.length > 0) {
      tasks.splice(taskIdx, 1, ...deletedTask.children);
    } else {
      tasks.splice(taskIdx, 1);
    }
    
    setDates(newDates);
    saveTasks(newDates);
  };

  const moveTask = (dateKey, taskPath, direction) => {
    const newDates = { ...dates };
    let tasks = newDates[dateKey];
    
    if (taskPath.length > 1) {
      for (let i = 0; i < taskPath.length - 1; i++) {
        tasks = tasks.find(t => t.id === taskPath[i]).children;
      }
    }
    
    const idx = tasks.findIndex(t => t.id === taskPath[taskPath.length - 1]);
    const task = tasks[idx];
    
    if (direction === 'indent' && idx > 0) {
      tasks.splice(idx, 1);
      tasks[idx - 1].children.push(task);
    } else if (direction === 'outdent' && taskPath.length > 1) {
      tasks.splice(idx, 1);
      let parentTasks = newDates[dateKey];
      for (let i = 0; i < taskPath.length - 2; i++) {
        parentTasks = parentTasks.find(t => t.id === taskPath[i]).children;
      }
      const parentIdx = parentTasks.findIndex(t => t.id === taskPath[taskPath.length - 2]);
      parentTasks.splice(parentIdx + 1, 0, task);
    } else if (direction === 'up' && idx > 0) {
      [tasks[idx], tasks[idx - 1]] = [tasks[idx - 1], tasks[idx]];
    } else if (direction === 'down' && idx < tasks.length - 1) {
      [tasks[idx], tasks[idx + 1]] = [tasks[idx + 1], tasks[idx]];
    }
    
    setDates(newDates);
    saveTasks(newDates);
  };

  const handleDragStart = (e, task, path) => {
    setDraggedTask({ task, path });
    e.dataTransfer.effectAllowed = 'move';
  };

  const handleDragOver = (e, targetPath) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTask(targetPath);
  };

  const handleDrop = (e, targetPath, dateKey) => {
    e.preventDefault();
    if (!draggedTask || draggedTask.path.join('-') === targetPath.join('-')) return;
    
    const newDates = { ...dates };
    
    // Remove from source
    let sourceTasks = newDates[dateKey];
    if (draggedTask.path.length > 1) {
      for (let i = 0; i < draggedTask.path.length - 1; i++) {
        sourceTasks = sourceTasks.find(t => t.id === draggedTask.path[i]).children;
      }
    }
    const sourceIdx = sourceTasks.findIndex(t => t.id === draggedTask.path[draggedTask.path.length - 1]);
    const [movedTask] = sourceTasks.splice(sourceIdx, 1);
    
    // Add to target
    let targetTasks = newDates[dateKey];
    if (targetPath.length > 0) {
      for (let i = 0; i < targetPath.length; i++) {
        targetTasks = targetTasks.find(t => t.id === targetPath[i]).children;
      }
    }
    targetTasks.push(movedTask);
    
    setDates(newDates);
    saveTasks(newDates);
    setDraggedTask(null);
    setDragOverTask(null);
  };

  const updateTask = (dateKey, taskPath, field, value) => {
    const newDates = { ...dates };
    let task = newDates[dateKey];
    
    for (let i = 0; i < taskPath.length - 1; i++) {
      task = task.find(t => t.id === taskPath[i]).children;
    }
    task = task.find(t => t.id === taskPath[taskPath.length - 1]);
    task[field] = value;

    setDates(newDates);
    saveTasks(newDates);
  };

  const toggleTimer = (dateKey, taskPath) => {
    const key = `${dateKey}-${taskPath.join('-')}`;
    if (activeTimers[key]) {
      const seconds = timerSeconds[key] || 0;
      const endTime = new Date();
      const startTime = new Date(endTime.getTime() - seconds * 1000);
      
      const newDates = { ...dates };
      let tasks = newDates[dateKey];
      for (let i = 0; i < taskPath.length - 1; i++) {
        tasks = tasks.find(t => t.id === taskPath[i]).children;
      }
      const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
      task.todayTime += seconds;
      task.totalTime += seconds;
      
      setDates(newDates);
      saveTasks(newDates);
      
      const newLogs = { ...timerLogs };
      if (!newLogs[dateKey]) newLogs[dateKey] = [];
      newLogs[dateKey].push({
        taskName: task.text || '(제목 없음)',
        startTime: startTime.toISOString(),
        endTime: endTime.toISOString(),
        duration: seconds
      });
      setTimerLogs(newLogs);
      localStorage.setItem('timerLogs', JSON.stringify(newLogs));
      
      setActiveTimers({ ...activeTimers, [key]: false });
      setTimerSeconds({ ...timerSeconds, [key]: 0 });
    } else {
      setActiveTimers({ ...activeTimers, [key]: true });
      setTimerSeconds({ ...timerSeconds, [key]: 0 });
    }
  };

  const handleKeyDown = (e, dateKey, taskPath, taskIndex) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      if (e.shiftKey) {
        addTask(dateKey, taskPath);
      } else {
        addTask(dateKey, taskPath.slice(0, -1), taskIndex);
        setTimeout(() => {
          const inputs = document.querySelectorAll('.task-row input[type="text"], .task-row input:not([type="checkbox"]):not([type="number"])');
          const currentIndex = Array.from(inputs).findIndex(input => input === e.target);
          if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
          }
        }, 50);
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      if (e.shiftKey) {
        moveTask(dateKey, taskPath, 'outdent');
      } else {
        moveTask(dateKey, taskPath, 'indent');
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      const inputs = document.querySelectorAll('.task-row input[type="text"]');
      const currentIndex = Array.from(inputs).findIndex(input => input === e.target);
      if (currentIndex > 0) {
        inputs[currentIndex - 1].focus();
      }
    } else if (e.key === 'ArrowDown') {
      e.preventDefault();
      const inputs = document.querySelectorAll('.task-row input[type="text"]');
      const currentIndex = Array.from(inputs).findIndex(input => input === e.target);
      if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
        inputs[currentIndex + 1].focus();
      }
    } else if (e.key === 'z' && e.ctrlKey && !e.shiftKey) {
      e.preventDefault();
      undo();
    } else if ((e.key === 'y' && e.ctrlKey) || (e.key === 'z' && e.ctrlKey && e.shiftKey)) {
      e.preventDefault();
      redo();
    }
  };

  const formatTime = (seconds) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = seconds % 60;
    if (h > 0) return `${h}h ${m}m ${s}s`;
    if (m > 0) return `${m}m ${s}s`;
    return `${s}s`;
  };

  const renderTask = (task, dateKey, path = [], taskIndex = 0) => {
    const currentPath = [...path, task.id];
    const timerKey = `${dateKey}-${currentPath.join('-')}`;
    const seconds = timerSeconds[timerKey] || 0;
    const isDragOver = dragOverTask && dragOverTask.join('-') === currentPath.join('-');
    
    return (
      <div key={task.id} style={{ marginLeft: path.length * 30 }}>
        <div 
          className={`task-row ${isDragOver ? 'drag-over' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, task, currentPath)}
          onDragOver={(e) => handleDragOver(e, currentPath)}
          onDrop={(e) => handleDrop(e, currentPath, dateKey)}
        >
          <span className="drag-handle">⋮⋮</span>
          <input
            type="checkbox"
            checked={task.completed}
            onChange={(e) => updateTask(dateKey, currentPath, 'completed', e.target.checked)}
          />
          <input
            type="text"
            value={task.text}
            onChange={(e) => updateTask(dateKey, currentPath, 'text', e.target.value)}
            onKeyDown={(e) => handleKeyDown(e, dateKey, currentPath, taskIndex)}
            placeholder="할 일"
            style={{ textDecoration: task.completed ? 'line-through' : 'none' }}
          />
          <span className="time-display">
            {formatTime(task.todayTime + (activeTimers[timerKey] ? seconds : 0))}
          </span>
          <span className="time-display">{formatTime(task.totalTime)}</span>
          <input
            type="number"
            value={task.goalTime}
            onChange={(e) => updateTask(dateKey, currentPath, 'goalTime', parseInt(e.target.value) || 0)}
            placeholder="목표"
            className="goal-input"
          />
          <button onClick={() => toggleTimer(dateKey, currentPath)} className="timer-btn">
            {activeTimers[timerKey] ? `⏸ ${Math.floor(seconds / 60)}:${String(seconds % 60).padStart(2, '0')}` : '▶'}
          </button>
          <div className="task-controls">
            <button onClick={() => moveTask(dateKey, currentPath, 'up')} className="move-btn">↑</button>
            <button onClick={() => moveTask(dateKey, currentPath, 'down')} className="move-btn">↓</button>
            <button onClick={() => addTask(dateKey, currentPath)} className="add-btn">+</button>
            <button onClick={() => deleteTask(dateKey, currentPath)} className="delete-btn">🗑</button>
          </div>
        </div>
        {task.children?.map((child, idx) => renderTask(child, dateKey, currentPath, idx))}
      </div>
    );
  };

  const getTaskStats = (dateKey) => {
    const tasks = dates[dateKey] || [];
    const countTasks = (taskList) => {
      let total = 0;
      let completed = 0;
      taskList.forEach(task => {
        total++;
        if (task.completed) completed++;
        const childStats = countTasks(task.children || []);
        total += childStats.total;
        completed += childStats.completed;
      });
      return { total, completed };
    };
    return countTasks(tasks);
  };

  const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
  const stats = getTaskStats(dateKey);

  const handleGoogleLogin = async () => {
    try {
      await signInWithPopup(auth, googleProvider);
      setUseFirebase(true);
    } catch (error) {
      alert('로그인 실패: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      setUseFirebase(false);
    } catch (error) {
      alert('로그아웃 실패: ' + error.message);
    }
  };

  return (
    <div className="App">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        <h1>Goal Tracker</h1>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          {user ? (
            <>
              <span style={{ fontSize: '14px', color: '#666' }}>{user.email}</span>
              <button onClick={handleLogout} style={{ padding: '10px 20px' }}>로그아웃</button>
            </>
          ) : (
            <button onClick={handleGoogleLogin} style={{ padding: '10px 20px', background: '#4285f4', color: 'white', border: 'none', borderRadius: '4px' }}>🔐 Google 로그인</button>
          )}
          <input
            type="file"
            accept=".json"
            onChange={loadBackup}
            style={{ display: 'none' }}
            id="file-input"
          />
          <button onClick={() => document.getElementById('file-input').click()} style={{ padding: '10px 20px' }}>📂 불러오기</button>
          <button onClick={downloadBackup} style={{ padding: '10px 20px' }}>💾 저장</button>
        </div>
      </div>
      <div>
        <button onClick={() => setShowCalendar(!showCalendar)} style={{ padding: '8px 16px', marginBottom: '10px' }}>
          {showCalendar ? '📅 캘린더 접기' : '📅 캘린더 펼치기'}
        </button>
        <button onClick={() => setViewMode(viewMode === 'day' ? 'month' : viewMode === 'month' ? 'timeline' : 'day')} style={{ padding: '8px 16px', marginLeft: '10px', marginBottom: '10px' }}>
          {viewMode === 'day' ? '📊 월간 보기' : viewMode === 'month' ? '🕒 타임라인' : '📋 일간 보기'}
        </button>
        {showCalendar && (
          <div className="calendar-container">
            <Calendar
              value={currentDate}
              onChange={setCurrentDate}
              calendarType="gregory"
              tileContent={({ date }) => {
                const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                const s = getTaskStats(key);
                return s.total > 0 ? <div className="tile-stats">{s.completed}/{s.total}</div> : null;
              }}
            />
          </div>
        )}
      </div>
      
      {viewMode === 'timeline' ? (
        <div className="timeline-view">
          <h2>{dateKey} 타임라인</h2>
          {timerLogs[dateKey] && timerLogs[dateKey].length > 0 ? (
            <div className="timeline-container">
              {timerLogs[dateKey].map((log, idx) => {
                const start = new Date(log.startTime);
                const end = new Date(log.endTime);
                const startHour = start.getHours();
                const startMin = start.getMinutes();
                const duration = log.duration;
                const durationMin = Math.floor(duration / 60);
                const topPos = (startHour * 60 + startMin) / 1440 * 100;
                const height = (duration / 60) / 1440 * 100;
                
                return (
                  <div key={idx} className="timeline-item" style={{ top: `${topPos}%`, height: `${Math.max(height, 2)}%` }}>
                    <div className="timeline-time">{String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')}</div>
                    <div className="timeline-task">{log.taskName}</div>
                    <div className="timeline-duration">{formatTime(duration)}</div>
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
          ) : (
            <p>오늘 기록된 타이머가 없습니다.</p>
          )}
        </div>
      ) : viewMode === 'day' ? (
        <>
          <div className="date-header">
            <h2>{dateKey}</h2>
            <span>{stats.completed}/{stats.total} 완료</span>
          </div>
          
          <button onClick={() => addTask(dateKey)}>+ 할 일 추가</button>
          
          <div className="tasks">
            {dates[dateKey]?.map((task, idx) => renderTask(task, dateKey, [], idx))}
          </div>
        </>
      ) : (
        <div className="month-view">
          <h2>{currentDate.getFullYear()}년 {currentDate.getMonth() + 1}월</h2>
          {Array.from({ length: 31 }, (_, i) => {
            const day = i + 1;
            const key = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(day).padStart(2, '0')}`;
            const dayStats = getTaskStats(key);
            return (
              <div key={day} className="month-day" onClick={() => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setViewMode('day'); }}>
                <div className="month-day-header">
                  <strong>{day}일</strong>
                  {dayStats.total > 0 && <span className="month-day-stats">{dayStats.completed}/{dayStats.total}</span>}
                </div>
                <button onClick={(e) => { e.stopPropagation(); addTask(key); }} className="month-add-btn">+</button>
                <div className="month-tasks">
                  {dates[key]?.slice(0, 3).map(task => (
                    <div key={task.id} className="month-task" style={{ textDecoration: task.completed ? 'line-through' : 'none' }}>
                      {task.text || '(제목 없음)'}
                    </div>
                  ))}
                  {dates[key]?.length > 3 && <div className="month-task-more">+{dates[key].length - 3}개 더</div>}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export default App;
