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
  const [touchStart, setTouchStart] = useState(null);
  const [isDragging, setIsDragging] = useState(false);
  const [selectedTasks, setSelectedTasks] = useState([]);
  const [lastSelected, setLastSelected] = useState(null);
  const [user, setUser] = useState(null);
  const [useFirebase, setUseFirebase] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [viewMode, setViewMode] = useState('day');
  const [timerLogs, setTimerLogs] = useState({});
  const [goalPopup, setGoalPopup] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [taskHistory, setTaskHistory] = useState(() => {
    const saved = localStorage.getItem('taskHistory');
    return saved ? JSON.parse(saved) : {};
  });
  const [suggestions, setSuggestions] = useState([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [timePopup, setTimePopup] = useState(null);
  const [logEditPopup, setLogEditPopup] = useState(null);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);

  useEffect(() => {
    const unsubscribe = onAuthStateChanged(auth, (currentUser) => {
      setUser(currentUser);
      if (currentUser) {
        setUseFirebase(true);
        const docRef = doc(db, 'users', currentUser.uid);
        const unsubscribeSnapshot = onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            setDates(doc.data().dates || {});
            setTimerLogs(doc.data().timerLogs || {});
          }
        });
        return () => unsubscribeSnapshot();
      } else {
        setUseFirebase(false);
        const saved = localStorage.getItem('simpleoneData');
        if (saved) setDates(JSON.parse(saved));
        const savedLogs = localStorage.getItem('timerLogs');
        if (savedLogs) setTimerLogs(JSON.parse(savedLogs));
      }
    });
    return () => unsubscribe();
  }, []);

  useEffect(() => {
    const hasActiveTimer = Object.values(activeTimers).some(timer => timer !== false);
    if (!hasActiveTimer) return;
    
    const interval = setInterval(() => {
      setTimerSeconds(prev => {
        const updated = {};
        Object.keys(activeTimers).forEach(key => {
          if (activeTimers[key]) {
            updated[key] = Math.floor((Date.now() - activeTimers[key]) / 1000);
          }
        });
        return updated;
      });
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimers]);

  useEffect(() => {
    if (Object.keys(dates).length > 0) {
      localStorage.setItem('simpleoneData', JSON.stringify(dates));
      
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
  }, [dates]);

  useEffect(() => {
    if (!user || !useFirebase || Object.keys(dates).length === 0) return;
    
    const timer = setTimeout(() => {
      const docRef = doc(db, 'users', user.uid);
      setDoc(docRef, { dates, timerLogs }, { merge: true }).catch(err => {
        console.error('Firebase 저장 실패:', err);
      });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [dates, timerLogs, user, useFirebase]);

  const saveTasks = (newDates, addToHistory = true) => {
    localStorage.setItem('simpleoneData', JSON.stringify(newDates));
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
    a.download = `simpleone-${new Date().toISOString().split('T')[0]}.json`;
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
      indentLevel: 0
    };

    if (index === -1) {
      newDates[dateKey].push(newTask);
    } else {
      const currentTask = newDates[dateKey][index];
      newTask.indentLevel = currentTask ? currentTask.indentLevel : 0;
      newDates[dateKey].splice(index + 1, 0, newTask);
    }

    setDates(newDates);
    saveTasks(newDates);
  };

  const deleteTask = (dateKey, taskId) => {
    const newDates = { ...dates };
    if (selectedTasks.length > 0) {
      selectedTasks.forEach(id => {
        const idx = newDates[dateKey].findIndex(t => t.id === id);
        if (idx !== -1) newDates[dateKey].splice(idx, 1);
      });
      setSelectedTasks([]);
    } else {
      const taskIdx = newDates[dateKey].findIndex(t => t.id === taskId);
      newDates[dateKey].splice(taskIdx, 1);
    }
    setDates(newDates);
    saveTasks(newDates);
  };

  const moveTask = (dateKey, taskId, direction) => {
    const newDates = { ...dates };
    const tasks = newDates[dateKey];
    
    if (selectedTasks.length > 0) {
      selectedTasks.forEach(id => {
        const task = tasks.find(t => t.id === id);
        if (task) {
          if (direction === 'indent') {
            task.indentLevel = (task.indentLevel || 0) + 1;
          } else if (direction === 'outdent' && task.indentLevel > 0) {
            task.indentLevel -= 1;
          }
        }
      });
    } else {
      const idx = tasks.findIndex(t => t.id === taskId);
      const task = tasks[idx];
      if (direction === 'indent') {
        task.indentLevel = (task.indentLevel || 0) + 1;
      } else if (direction === 'outdent' && task.indentLevel > 0) {
        task.indentLevel -= 1;
      }
    }
    
    setDates(newDates);
    saveTasks(newDates);
  };

  const getCurrentTaskNames = () => {
    const taskNames = new Set();
    Object.keys(dates).forEach(dateKey => {
      const collectNames = (tasks) => {
        tasks.forEach(task => {
          if (task.text && task.text.trim()) {
            taskNames.add(task.text.trim());
          }
          if (task.children) collectNames(task.children);
        });
      };
      if (dates[dateKey]) collectNames(dates[dateKey]);
    });
    return taskNames;
  };
  
  const updateTask = (dateKey, taskPath, field, value) => {
    const newDates = { ...dates };
    let task = newDates[dateKey];
    
    for (let i = 0; i < taskPath.length - 1; i++) {
      task = task.find(t => t.id === taskPath[i]).children;
    }
    task = task.find(t => t.id === taskPath[taskPath.length - 1]);
    
    // totalTime 업데이트 시 모든 날짜의 같은 할일에 적용
    if (field === 'totalTime' && task.text) {
      Object.keys(newDates).forEach(date => {
        const updateTasksRecursive = (tasks) => {
          tasks.forEach(t => {
            if (t.text === task.text) {
              t.totalTime = value;
            }
            if (t.children) updateTasksRecursive(t.children);
          });
        };
        if (newDates[date]) updateTasksRecursive(newDates[date]);
      });
    } else {
      task[field] = value;
    }

    setDates(newDates);
    saveTasks(newDates);
    
    // 할일 텍스트 변경 시 히스토리 저장
    if (field === 'text' && value.trim()) {
      const newHistory = { ...taskHistory };
      newHistory[value.trim()] = {
        goalTime: task.goalTime,
        totalTime: task.totalTime
      };
      setTaskHistory(newHistory);
      localStorage.setItem('taskHistory', JSON.stringify(newHistory));
    }
    
    // 자동완성 제안 - 현재 존재하는 할일만
    if (field === 'text' && value) {
      const currentTasks = getCurrentTaskNames();
      const matches = Array.from(currentTasks).filter(taskName => 
        taskName.toLowerCase().startsWith(value.toLowerCase()) && taskName !== value
      );
      setSuggestions(matches);
      setShowSuggestions(matches.length > 0);
    } else {
      setShowSuggestions(false);
    }
  };
  
  const applyTaskFromHistory = (dateKey, taskPath, taskName) => {
    const newDates = { ...dates };
    let task = newDates[dateKey];
    
    for (let i = 0; i < taskPath.length - 1; i++) {
      task = task.find(t => t.id === taskPath[i]).children;
    }
    task = task.find(t => t.id === taskPath[taskPath.length - 1]);
    
    // 현재 존재하는 할일에서 데이터 찾기
    let foundTask = null;
    Object.keys(dates).forEach(date => {
      const findTask = (tasks) => {
        for (const t of tasks) {
          if (t.text === taskName) {
            foundTask = t;
            return true;
          }
          if (t.children && findTask(t.children)) return true;
        }
        return false;
      };
      if (dates[date] && !foundTask) findTask(dates[date]);
    });
    
    if (foundTask) {
      task.text = taskName;
      task.goalTime = foundTask.goalTime || 0;
      task.totalTime = foundTask.totalTime || 0;
    } else {
      task.text = taskName;
    }
    
    setDates(newDates);
    saveTasks(newDates);
    setShowSuggestions(false);
  };

  const toggleTimer = (dateKey, taskPath) => {
    const key = `${dateKey}-${taskPath.join('-')}`;
    if (activeTimers[key]) {
      const startTime = activeTimers[key];
      const endTime = Date.now();
      const seconds = Math.floor((endTime - startTime) / 1000);
      
      const newDates = { ...dates };
      let tasks = newDates[dateKey];
      for (let i = 0; i < taskPath.length - 1; i++) {
        tasks = tasks.find(t => t.id === taskPath[i]).children;
      }
      const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
      task.todayTime += seconds;
      
      // totalTime은 모든 날짜의 같은 할일에 적용
      const taskName = task.text;
      Object.keys(newDates).forEach(date => {
        const updateTasksRecursive = (tasks) => {
          tasks.forEach(t => {
            if (t.text === taskName) {
              t.totalTime += seconds;
            }
            if (t.children) updateTasksRecursive(t.children);
          });
        };
        if (newDates[date]) updateTasksRecursive(newDates[date]);
      });
      
      setDates(newDates);
      saveTasks(newDates);
      
      const newLogs = { ...timerLogs };
      if (!newLogs[dateKey]) newLogs[dateKey] = [];
      newLogs[dateKey].push({
        taskName: task.text || '(제목 없음)',
        startTime: new Date(startTime).toISOString(),
        endTime: new Date(endTime).toISOString(),
        duration: seconds
      });
      setTimerLogs(newLogs);
      localStorage.setItem('timerLogs', JSON.stringify(newLogs));
      
      setActiveTimers({ ...activeTimers, [key]: false });
      setTimerSeconds({ ...timerSeconds, [key]: 0 });
    } else {
      setActiveTimers({ ...activeTimers, [key]: Date.now() });
      setTimerSeconds({ ...timerSeconds, [key]: 0 });
    }
  };

  const handleKeyDown = (e, dateKey, taskPath, taskIndex) => {
    if (e.key === 'Escape') {
      setSelectedTasks([]);
      setLastSelected(null);
      setShowSuggestions(false);
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        // 자동완성 적용
        applyTaskFromHistory(dateKey, taskPath, suggestions[0]);
        setShowSuggestions(false);
      } else if (e.shiftKey) {
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
    } else if (e.key === 'Backspace' && e.target.value === '') {
      e.preventDefault();
      const tasks = dates[dateKey];
      const currentIdx = tasks.findIndex(t => t.id === taskPath[0]);
      deleteTask(dateKey, taskPath);
      setTimeout(() => {
        if (currentIdx > 0) {
          const prevTask = tasks[currentIdx - 1];
          const input = document.querySelector(`input[data-task-id="${prevTask.id}"]`);
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        }
      }, 50);
    } else if (e.key === 'Delete' && e.target.selectionStart === e.target.value.length) {
      e.preventDefault();
      const tasks = dates[dateKey];
      const currentIdx = tasks.findIndex(t => t.id === taskPath[0]);
      if (currentIdx < tasks.length - 1) {
        const nextTask = tasks[currentIdx + 1];
        if (nextTask.text === '') {
          deleteTask(dateKey, [nextTask.id]);
          setTimeout(() => {
            const input = document.querySelector(`input[data-task-id="${taskPath[0]}"]`);
            if (input) {
              input.focus();
              input.setSelectionRange(input.value.length, input.value.length);
            }
          }, 50);
        } else {
          const newDates = { ...dates };
          newDates[dateKey][currentIdx].text += nextTask.text;
          newDates[dateKey].splice(currentIdx + 1, 1);
          setDates(newDates);
          saveTasks(newDates);
        }
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const cursorPos = e.target.selectionStart;
      const taskId = taskPath[taskPath.length - 1];
      if (e.shiftKey) {
        moveTask(dateKey, taskId, 'outdent');
      } else {
        moveTask(dateKey, taskId, 'indent');
      }
      setTimeout(() => {
        const input = document.querySelector(`input[data-task-id="${taskId}"]`);
        if (input) {
          input.focus();
          input.setSelectionRange(cursorPos, cursorPos);
        }
      }, 0);
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

  const handleDragStart = (e, dateKey, taskPath) => {
    if (e.target.tagName === 'INPUT') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask({ dateKey, taskPath });
  };

  const handleDragOver = (e, dateKey, taskPath) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    setDragOverTask({ dateKey, taskPath });
  };

  const handleDrop = (e, dateKey, targetPath) => {
    e.preventDefault();
    setDragOverTask(null);
    if (!draggedTask || draggedTask.dateKey !== dateKey) return;
    if (draggedTask.taskPath.join('-') === targetPath.join('-')) {
      setDraggedTask(null);
      return;
    }
    
    const newDates = { ...dates };
    const tasks = newDates[dateKey];
    
    const sourceIdx = tasks.findIndex(t => t.id === draggedTask.taskPath[0]);
    const targetIdx = tasks.findIndex(t => t.id === targetPath[0]);
    
    const [movedTask] = tasks.splice(sourceIdx, 1);
    const newTargetIdx = sourceIdx < targetIdx ? targetIdx - 1 : targetIdx;
    tasks.splice(newTargetIdx, 0, movedTask);
    
    setDates(newDates);
    saveTasks(newDates);
    setDraggedTask(null);
  };

  const handleTouchStart = (e, dateKey, taskPath) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'BUTTON') return;
    setTouchStart({ x: e.touches[0].clientX, y: e.touches[0].clientY, time: Date.now() });
    setTimeout(() => {
      if (touchStart && Date.now() - touchStart.time >= 500) {
        setIsDragging(true);
        setDraggedTask({ dateKey, taskPath });
      }
    }, 500);
  };

  const handleTouchMove = (e) => {
    if (!touchStart) return;
    const dx = Math.abs(e.touches[0].clientX - touchStart.x);
    const dy = Math.abs(e.touches[0].clientY - touchStart.y);
    if (dx > 10 || dy > 10) {
      setTouchStart(null);
    }
  };

  const handleTouchEnd = (e, dateKey, targetPath) => {
    setTouchStart(null);
    if (isDragging && draggedTask) {
      handleDrop({ preventDefault: () => {} }, dateKey, targetPath);
      setIsDragging(false);
      setDragOverTask(null);
    }
  };

  const handleShiftSelect = (dateKey, taskId) => {
    const tasks = dates[dateKey] || [];
    if (!lastSelected) {
      setSelectedTasks([taskId]);
      setLastSelected(taskId);
      return;
    }
    
    const lastIdx = tasks.findIndex(t => t.id === lastSelected);
    const currentIdx = tasks.findIndex(t => t.id === taskId);
    const start = Math.min(lastIdx, currentIdx);
    const end = Math.max(lastIdx, currentIdx);
    
    const selected = tasks.slice(start, end + 1).map(t => t.id);
    setSelectedTasks(selected);
  };

  const renderTask = (task, dateKey, path = [], taskIndex = 0) => {
    const currentPath = [...path, task.id];
    const timerKey = `${dateKey}-${currentPath.join('-')}`;
    const seconds = timerSeconds[timerKey] || 0;
    const taskKey = currentPath.join('-');
    const isSelected = selectedTask === taskKey;
    const showTaskSuggestions = showSuggestions && isSelected;
    
    return (
      <div 
        key={task.id} 
        style={{ marginLeft: path.length * 30, position: 'relative' }}
        onDragOver={(e) => handleDragOver(e, dateKey, currentPath)}
        onDrop={(e) => handleDrop(e, dateKey, currentPath)}
      >
        <div 
          className={`task-row ${isSelected ? 'selected' : ''} ${selectedTasks.includes(task.id) ? 'multi-selected' : ''} ${isDragging && draggedTask?.taskPath?.join('-') === currentPath.join('-') ? 'dragging' : ''} ${dragOverTask?.taskPath?.join('-') === currentPath.join('-') ? 'drag-over' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, dateKey, currentPath)}
          onTouchStart={(e) => handleTouchStart(e, dateKey, currentPath)}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleTouchEnd(e, dateKey, currentPath)}
        >
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
            onFocus={() => setSelectedTask(taskKey)}
            onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
            onMouseDown={(e) => {
              if (e.shiftKey && lastSelected) {
                e.preventDefault();
                handleShiftSelect(dateKey, task.id);
              } else if (e.ctrlKey || e.metaKey) {
                e.preventDefault();
                if (selectedTasks.includes(task.id)) {
                  setSelectedTasks(selectedTasks.filter(id => id !== task.id));
                } else {
                  setSelectedTasks([...selectedTasks, task.id]);
                  setLastSelected(task.id);
                }
              } else {
                setSelectedTasks([task.id]);
                setLastSelected(task.id);
              }
            }}
            placeholder="할 일"
            data-task-id={task.id}
            style={{ textDecoration: task.completed ? 'line-through' : 'none' }}
            draggable={false}
          />
          {showTaskSuggestions && suggestions.length > 0 && (
            <div className="autocomplete-dropdown">
              {suggestions.slice(0, 5).map((suggestion, idx) => (
                <div 
                  key={idx} 
                  className="autocomplete-item"
                  onClick={() => applyTaskFromHistory(dateKey, currentPath, suggestion)}
                >
                  {suggestion}
                  {taskHistory[suggestion] && (
                    <span className="autocomplete-info">
                      🎯 {formatTime(taskHistory[suggestion].goalTime)}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
          <span className="time-display clickable" onClick={() => setTimePopup({ dateKey, path: currentPath, type: 'today', time: task.todayTime })} title="오늘 시간 수정">
            {formatTime(task.todayTime + (activeTimers[timerKey] ? seconds : 0))}
          </span>
          <span className="time-display">/</span>
          <span className="time-display clickable" onClick={() => setTimePopup({ dateKey, path: currentPath, type: 'total', time: task.totalTime })} title="총 시간 수정">
            {formatTime(task.totalTime)}
          </span>
          <span className="time-display">/</span>
          <span className="time-display goal-display" onClick={() => setGoalPopup({ dateKey, path: currentPath, goalTime: task.goalTime })} title="목표 시간 설정">
            🎯 {formatTime(task.goalTime)}
          </span>
          <button onClick={() => toggleTimer(dateKey, currentPath)} className="control-btn timer-btn">
            {activeTimers[timerKey] ? `⏸` : '▶'}
          </button>
          <button onClick={() => moveTask(dateKey, currentPath, 'indent')} className="control-btn">&gt;</button>
          <button onClick={() => moveTask(dateKey, currentPath, 'outdent')} className="control-btn">&lt;</button>
          <button onClick={() => deleteTask(dateKey, currentPath)} className="control-btn delete-btn">🗑</button>
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
      const result = await signInWithPopup(auth, googleProvider);
      setUseFirebase(true);
      if (Object.keys(dates).length > 0 || Object.keys(timerLogs).length > 0) {
        const docRef = doc(db, 'users', result.user.uid);
        await setDoc(docRef, { dates, timerLogs }, { merge: true });
      }
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

  const forceUpload = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      const docRef = doc(db, 'users', user.uid);
      await setDoc(docRef, { dates, timerLogs }, { merge: true });
      alert('업로드 완료!');
    } catch (error) {
      alert('업로드 실패: ' + error.message);
    }
  };

  return (
    <div className="App">
      {logEditPopup && (
        <div className="popup-overlay" onClick={() => setLogEditPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3>⏰ 타임라인 수정</h3>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>시작 시간</label>
              <input
                type="time"
                value={new Date(logEditPopup.log.startTime).toTimeString().slice(0, 5)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':');
                  const date = new Date(logEditPopup.log.startTime);
                  date.setHours(parseInt(h), parseInt(m), 0);
                  setLogEditPopup({ ...logEditPopup, log: { ...logEditPopup.log, startTime: date.toISOString() }});
                }}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #555' }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>종료 시간</label>
              <input
                type="time"
                value={new Date(logEditPopup.log.endTime).toTimeString().slice(0, 5)}
                onChange={(e) => {
                  const [h, m] = e.target.value.split(':');
                  const date = new Date(logEditPopup.log.endTime);
                  date.setHours(parseInt(h), parseInt(m), 0);
                  setLogEditPopup({ ...logEditPopup, log: { ...logEditPopup.log, endTime: date.toISOString() }});
                }}
                style={{ width: '100%', padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid #555' }}
              />
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                const newLogs = { ...timerLogs };
                const start = new Date(logEditPopup.log.startTime);
                const end = new Date(logEditPopup.log.endTime);
                const duration = Math.floor((end - start) / 1000);
                newLogs[logEditPopup.dateKey][logEditPopup.logIndex] = {
                  ...logEditPopup.log,
                  duration
                };
                setTimerLogs(newLogs);
                localStorage.setItem('timerLogs', JSON.stringify(newLogs));
                setLogEditPopup(null);
              }}>확인</button>
              <button onClick={() => {
                const newLogs = { ...timerLogs };
                newLogs[logEditPopup.dateKey].splice(logEditPopup.logIndex, 1);
                setTimerLogs(newLogs);
                localStorage.setItem('timerLogs', JSON.stringify(newLogs));
                setLogEditPopup(null);
              }}>삭제</button>
              <button onClick={() => setLogEditPopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {timePopup && (
        <div className="popup-overlay" onClick={() => setTimePopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3>{timePopup.type === 'today' ? '📅 오늘 시간' : '⏱️ 총 시간'}</h3>
            <div className="popup-inputs">
              <input
                type="text"
                value={`${String(Math.floor(timePopup.time / 3600)).padStart(2, '0')}:${String(Math.floor((timePopup.time % 3600) / 60)).padStart(2, '0')}:${String(timePopup.time % 60).padStart(2, '0')}`}
                onChange={(e) => {
                  const parts = e.target.value.split(':');
                  if (parts.length === 3) {
                    const h = parseInt(parts[0]) || 0;
                    const m = parseInt(parts[1]) || 0;
                    const s = parseInt(parts[2]) || 0;
                    setTimePopup({ ...timePopup, time: h * 3600 + m * 60 + s });
                  }
                }}
                placeholder="00:00:00"
                style={{ width: '120px', fontSize: '24px' }}
              />
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                const field = timePopup.type === 'today' ? 'todayTime' : 'totalTime';
                updateTask(timePopup.dateKey, timePopup.path, field, timePopup.time);
                setTimePopup(null);
              }}>확인</button>
              <button onClick={() => setTimePopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {goalPopup && (
        <div className="popup-overlay" onClick={() => setGoalPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3>🎯 목표 시간</h3>
            <div className="popup-inputs">
              <input
                type="text"
                value={`${String(Math.floor(goalPopup.goalTime / 3600)).padStart(2, '0')}:${String(Math.floor((goalPopup.goalTime % 3600) / 60)).padStart(2, '0')}:${String(goalPopup.goalTime % 60).padStart(2, '0')}`}
                onChange={(e) => {
                  const parts = e.target.value.split(':');
                  if (parts.length === 3) {
                    const h = parseInt(parts[0]) || 0;
                    const m = parseInt(parts[1]) || 0;
                    const s = parseInt(parts[2]) || 0;
                    setGoalPopup({ ...goalPopup, goalTime: h * 3600 + m * 60 + s });
                  }
                }}
                placeholder="00:00:00"
                style={{ width: '120px', fontSize: '24px' }}
              />
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                updateTask(goalPopup.dateKey, goalPopup.path, 'goalTime', goalPopup.goalTime);
                setGoalPopup(null);
              }}>확인</button>
              <button onClick={() => setGoalPopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
      <div className="header">
        <h1>Simple One</h1>
        <div className="header-controls">
          <button onClick={() => setDarkMode(!darkMode)} className="icon-btn" title="다크모드">
            {darkMode ? '☀️' : '🌙'}
          </button>
          {user ? (
            <>
              <button onClick={handleLogout} className="icon-btn google-btn" title="로그아웃">☁️</button>
              <button onClick={forceUpload} className="icon-btn" title="강제 업로드">⬆️</button>
            </>
          ) : (
            <button onClick={handleGoogleLogin} className="icon-btn logout-btn" title="Google 로그인">
              <span style={{ position: 'relative', display: 'inline-block' }}>
                ☁️
                <span style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%)', fontSize: '24px', color: 'white' }}>/</span>
              </span>
            </button>
          )}
          <input
            type="file"
            accept=".json"
            onChange={loadBackup}
            style={{ display: 'none' }}
            id="file-input"
          />
          <button onClick={() => document.getElementById('file-input').click()} className="icon-btn" title="불러오기">📂</button>
          <button onClick={downloadBackup} className="icon-btn" title="저장">💾</button>
        </div>
      </div>
      <div className="view-controls">
        <button onClick={() => setShowCalendar(!showCalendar)} className="icon-btn" title="캘린더">
          {showCalendar ? '⌄' : '⌃'}
        </button>
        <div className="view-mode-btns">
          <button onClick={() => setViewMode('day')} className={`icon-btn ${viewMode === 'day' ? 'active' : ''}`} title="일간">📋</button>
          <button onClick={() => setViewMode('month')} className={`icon-btn ${viewMode === 'month' ? 'active' : ''}`} title="월간">📊</button>
          <button onClick={() => setViewMode('timeline')} className={`icon-btn ${viewMode === 'timeline' ? 'active' : ''}`} title="타임라인">🕒</button>
        </div>
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
                const endHour = end.getHours();
                const endMin = end.getMinutes();
                const duration = log.duration;
                const topPos = (startHour * 60 + startMin) / 1440 * 100;
                const height = (duration / 60) / 1440 * 100;
                
                return (
                  <div 
                    key={idx} 
                    className="timeline-item" 
                    style={{ top: `${topPos}%`, height: `${Math.max(height, 0.5)}%`, minHeight: '40px' }}
                    onClick={() => setLogEditPopup({ dateKey, logIndex: idx, log })}
                  >
                    <div className="timeline-time">{String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')} - {String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}</div>
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
