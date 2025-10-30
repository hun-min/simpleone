import React, { useState, useEffect } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './App.css';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

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
  const [togglToken, setTogglToken] = useState('');
  const [togglPopup, setTogglPopup] = useState(false);
  const [settingsPopup, setSettingsPopup] = useState(false);
  const [togglEntries, setTogglEntries] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.body.className = darkMode ? 'dark-mode' : 'light-mode';
  }, [darkMode]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setViewMode('day');
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setViewMode('month');
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setViewMode('timeline');
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, []);

  useEffect(() => {
    const saved = localStorage.getItem('simpleoneData');
    if (saved) setDates(JSON.parse(saved));
    const savedLogs = localStorage.getItem('timerLogs');
    if (savedLogs) setTimerLogs(JSON.parse(savedLogs));
    const savedToken = localStorage.getItem('togglToken');
    if (savedToken) setTogglToken(savedToken);
    
    const unsubscribe = auth.onAuthStateChanged((firebaseUser) => {
      if (firebaseUser) {
        setUser({ id: firebaseUser.uid, email: firebaseUser.email });
        setUseFirebase(true);
        
        const docRef = doc(db, 'users', firebaseUser.uid);
        getDoc(docRef).then(docSnap => {
          if (docSnap.exists() && docSnap.data().dates) {
            setDates(docSnap.data().dates);
            setTimerLogs(docSnap.data().timerLogs || {});
            setTogglToken(docSnap.data().togglToken || '');
            localStorage.setItem('simpleoneData', JSON.stringify(docSnap.data().dates));
            if (docSnap.data().togglToken) localStorage.setItem('togglToken', docSnap.data().togglToken);
          }
        });
        
        onSnapshot(docRef, (doc) => {
          if (doc.exists() && doc.data().dates) {
            setDates(doc.data().dates);
            setTimerLogs(doc.data().timerLogs || {});
            setTogglToken(doc.data().togglToken || '');
            localStorage.setItem('simpleoneData', JSON.stringify(doc.data().dates));
            if (doc.data().togglToken) localStorage.setItem('togglToken', doc.data().togglToken);
          }
        });
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
      setIsSyncing(true);
      const docRef = doc(db, 'users', user.id);
      setDoc(docRef, { dates, timerLogs, togglToken }, { merge: true })
        .then(() => setIsSyncing(false))
        .catch(err => {
          console.error('Firebase 자동 저장 실패:', err);
          setIsSyncing(false);
        });
    }, 3000);
    
    return () => clearTimeout(timer);
  }, [dates, timerLogs, user, useFirebase, togglToken]);





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

    if (parentPath.length > 0) {
      // 하위할일 추가 (Shift+Enter)
      const parentTask = newDates[dateKey].find(t => t.id === parentPath[0]);
      if (parentTask) {
        newTask.indentLevel = (parentTask.indentLevel || 0) + 1;
        const parentIndex = newDates[dateKey].findIndex(t => t.id === parentPath[0]);
        newDates[dateKey].splice(parentIndex + 1, 0, newTask);
      }
    } else if (index === -1) {
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
      const id = Array.isArray(taskId) ? taskId[0] : taskId;
      const taskIdx = newDates[dateKey].findIndex(t => t.id === id);
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

  const toggleTimer = async (dateKey, taskPath) => {
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
      
      if (togglToken && togglEntries[key]) {
        try {
          await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${togglEntries[key]}`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });
          const newEntries = { ...togglEntries };
          delete newEntries[key];
          setTogglEntries(newEntries);
        } catch (err) {
          console.error('Toggl 종료 실패:', err);
        }
      }
      
      setActiveTimers({ ...activeTimers, [key]: false });
      setTimerSeconds({ ...timerSeconds, [key]: 0 });
    } else {
      setActiveTimers({ ...activeTimers, [key]: Date.now() });
      setTimerSeconds({ ...timerSeconds, [key]: 0 });
      
      if (togglToken) {
        try {
          const newDates = { ...dates };
          let tasks = newDates[dateKey];
          for (let i = 0; i < taskPath.length - 1; i++) {
            tasks = tasks.find(t => t.id === taskPath[i]).children;
          }
          const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
          
          const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: task.text || '(제목 없음)',
              start: new Date().toISOString(),
              duration: -1,
              created_with: 'SimpleOne'
            })
          });
          const data = await res.json();
          if (!res.ok) {
            console.error('Toggl API 에러:', data);
            alert('Toggl 연동 실패: ' + JSON.stringify(data));
          } else {
            setTogglEntries({ ...togglEntries, [key]: data.id });
          }
        } catch (err) {
          console.error('Toggl 시작 실패:', err);
        }
      }
    }
  };

  const moveTaskOrder = (dateKey, taskId, direction) => {
    const newDates = { ...dates };
    const tasks = newDates[dateKey];
    const idx = tasks.findIndex(t => t.id === taskId);
    if (direction === 'up' && idx > 0) {
      [tasks[idx - 1], tasks[idx]] = [tasks[idx], tasks[idx - 1]];
    } else if (direction === 'down' && idx < tasks.length - 1) {
      [tasks[idx], tasks[idx + 1]] = [tasks[idx + 1], tasks[idx]];
    }
    setDates(newDates);
    saveTasks(newDates);
  };

  const handleKeyDown = (e, dateKey, taskPath, taskIndex) => {
    if (e.altKey && e.key === 'ArrowUp') {
      e.preventDefault();
      moveTaskOrder(dateKey, taskPath[0], 'up');
      return;
    }
    if (e.altKey && e.key === 'ArrowDown') {
      e.preventDefault();
      moveTaskOrder(dateKey, taskPath[0], 'down');
      return;
    }
    if (e.key === 'Escape') {
      setSelectedTasks([]);
      setLastSelected(null);
      setShowSuggestions(false);
      return;
    }
    if (e.key === 'Delete' && selectedTasks.length > 1) {
      e.preventDefault();
      const newDates = { ...dates };
      selectedTasks.forEach(id => {
        const idx = newDates[dateKey].findIndex(t => t.id === id);
        if (idx !== -1) newDates[dateKey].splice(idx, 1);
      });
      setDates(newDates);
      saveTasks(newDates);
      setSelectedTasks([]);
      setLastSelected(null);
      return;
    }
    if (e.key === 'ArrowUp') {
      e.preventDefault();
      const { selectionStart } = e.target;
      const index = taskIndex;
      const tasks = dates[dateKey] || [];
      if (index > 0) {
        const prevTaskId = tasks[index - 1].id;
        requestAnimationFrame(() => {
          const input = document.querySelector(`input[data-task-id="${prevTaskId}"]`);
          if (input) {
            input.focus();
            input.setSelectionRange(Math.min(selectionStart, input.value.length), Math.min(selectionStart, input.value.length));
          }
        });
      }
      return;
    }
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      const { selectionStart } = e.target;
      const index = taskIndex;
      const tasks = dates[dateKey] || [];
      if (index < tasks.length - 1) {
        const nextTaskId = tasks[index + 1].id;
        requestAnimationFrame(() => {
          const input = document.querySelector(`input[data-task-id="${nextTaskId}"]`);
          if (input) {
            input.focus();
            input.setSelectionRange(Math.min(selectionStart, input.value.length), Math.min(selectionStart, input.value.length));
          }
        });
      }
      return;
    }
    if (e.key === 'ArrowLeft') {
      const { selectionStart, selectionEnd } = e.target;
      const index = taskIndex;
      const tasks = dates[dateKey] || [];
      if (selectionStart === 0 && selectionEnd === 0 && index > 0) {
        e.preventDefault();
        const prevTaskId = tasks[index - 1].id;
        requestAnimationFrame(() => {
          const input = document.querySelector(`input[data-task-id="${prevTaskId}"]`);
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      }
      return;
    }
    if (e.key === 'ArrowRight') {
      const { selectionStart, selectionEnd, value } = e.target;
      const index = taskIndex;
      const tasks = dates[dateKey] || [];
      if (selectionStart === value.length && selectionEnd === value.length && index < tasks.length - 1) {
        e.preventDefault();
        const nextTaskId = tasks[index + 1].id;
        requestAnimationFrame(() => {
          const input = document.querySelector(`input[data-task-id="${nextTaskId}"]`);
          if (input) {
            input.focus();
            input.setSelectionRange(0, 0);
          }
        });
      }
      return;
    }
    if (e.key === 'Enter') {
      e.preventDefault();
      if (showSuggestions && suggestions.length > 0) {
        // 자동완성 적용
        applyTaskFromHistory(dateKey, taskPath, suggestions[0]);
        setShowSuggestions(false);
      } else {
        // Shift+Enter는 하위할일 추가 (기존 로직 유지)
        if (e.shiftKey) {
          addTask(dateKey, taskPath);
          return;
        }
        addTask(dateKey, taskPath.slice(0, -1), taskIndex);
        setTimeout(() => {
          const inputs = document.querySelectorAll('.task-row input[type="text"], .task-row input:not([type="checkbox"]):not([type="number"])');
          const currentIndex = Array.from(inputs).findIndex(input => input === e.target);
          if (currentIndex >= 0 && currentIndex < inputs.length - 1) {
            inputs[currentIndex + 1].focus();
          }
        }, 50);
      }
    } else if (e.key === 'Backspace') {
      const { selectionStart, selectionEnd, value } = e.target;
      const index = taskIndex;
      const tasks = dates[dateKey] || [];
      if (selectionStart === 0 && selectionEnd === 0 && value === '' && index > 0) {
        e.preventDefault();
        const prevTaskId = tasks[index - 1].id;
        tasks.splice(index, 1);
        setDates({ ...dates, [dateKey]: tasks });
        saveTasks({ ...dates, [dateKey]: tasks });
        requestAnimationFrame(() => {
          const input = document.querySelector(`input[data-task-id="${prevTaskId}"]`);
          if (input) {
            input.focus();
            input.setSelectionRange(input.value.length, input.value.length);
          }
        });
      }
    } else if (e.key === 'Delete') {
      const { selectionStart, selectionEnd, value } = e.target;
      const index = taskIndex;
      const tasks = dates[dateKey] || [];
      if (selectionStart === value.length && selectionEnd === value.length && index < tasks.length - 1) {
        e.preventDefault();
        const nextTask = tasks[index + 1];
        const cursorPos = value.length;
        const currentTaskId = taskPath[0];
        const newDates = { ...dates };
        if (nextTask.text === '') {
          newDates[dateKey].splice(index + 1, 1);
        } else {
          newDates[dateKey][index].text += nextTask.text;
          newDates[dateKey].splice(index + 1, 1);
        }
        setDates(newDates);
        saveTasks(newDates);
        requestAnimationFrame(() => {
          const input = document.querySelector(`input[data-task-id="${currentTaskId}"]`);
          if (input) {
            input.focus();
            input.setSelectionRange(cursorPos, cursorPos);
          }
        });
      }
    } else if (e.key === 'Tab') {
      e.preventDefault();
      e.stopPropagation();
      const taskId = taskPath[taskPath.length - 1];
      const cursorPos = e.target.selectionStart;
      if (e.shiftKey) {
        moveTask(dateKey, taskId, 'outdent');
      } else {
        moveTask(dateKey, taskId, 'indent');
      }
      requestAnimationFrame(() => {
        const input = document.querySelector(`input[data-task-id="${taskId}"]`);
        if (input) {
          input.focus();
          input.setSelectionRange(cursorPos, cursorPos);
        }
      });
    } else if (e.key === 'Enter' && e.ctrlKey) {
      e.preventDefault();
      const newDates = { ...dates };
      let tasks = newDates[dateKey];
      for (let i = 0; i < taskPath.length - 1; i++) {
        tasks = tasks.find(t => t.id === taskPath[i]).children;
      }
      const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
      task.completed = !task.completed;
      setDates(newDates);
      saveTasks(newDates);
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
    if (e.target.tagName === 'INPUT' && e.target.type === 'text') {
      e.preventDefault();
      return;
    }
    e.dataTransfer.effectAllowed = 'move';
    setDraggedTask({ dateKey, taskPath });
  };

  const handleDragOver = (e, dateKey, taskPath) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = 'move';
    
    const rect = e.currentTarget.getBoundingClientRect();
    const midY = rect.top + rect.height / 2;
    const insertBefore = e.clientY < midY;
    
    setDragOverTask({ dateKey, taskPath, insertBefore });
  };

  const handleDrop = (e, dateKey, targetPath) => {
    e.preventDefault();
    const insertBefore = dragOverTask?.insertBefore;
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
    let newTargetIdx = targetIdx;
    if (sourceIdx < targetIdx) newTargetIdx--;
    if (!insertBefore) newTargetIdx++;
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
    const currentPath = [task.id];
    const timerKey = `${dateKey}-${currentPath.join('-')}`;
    const seconds = timerSeconds[timerKey] || 0;
    const taskKey = currentPath.join('-');
    const isSelected = selectedTask === taskKey;
    const showTaskSuggestions = showSuggestions && isSelected;
    
    return (
      <div 
        key={task.id} 
        style={{ position: 'relative' }}
        onDragOver={(e) => handleDragOver(e, dateKey, currentPath)}
        onDrop={(e) => handleDrop(e, dateKey, currentPath)}
      >
        <div 
          className={`task-row ${isSelected ? 'selected' : ''} ${selectedTasks.length > 1 && selectedTasks.includes(task.id) ? 'multi-selected' : ''} ${isDragging && draggedTask?.taskPath?.join('-') === currentPath.join('-') ? 'dragging' : ''} ${dragOverTask?.taskPath?.join('-') === currentPath.join('-') ? 'drag-over' : ''}`}
          draggable
          onDragStart={(e) => handleDragStart(e, dateKey, currentPath)}
          onTouchStart={(e) => handleTouchStart(e, dateKey, currentPath)}
          onTouchMove={handleTouchMove}
          onTouchEnd={(e) => handleTouchEnd(e, dateKey, currentPath)}
          onClick={(e) => {
            if (e.target.tagName !== 'INPUT' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'SPAN') {
              if (e.shiftKey && lastSelected) {
                handleShiftSelect(dateKey, task.id);
              } else if (e.ctrlKey || e.metaKey) {
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
            }
          }}
        >
          <div className="task-main">
            <input
              type="checkbox"
              checked={task.completed}
              onChange={(e) => updateTask(dateKey, currentPath, 'completed', e.target.checked)}
              style={{ marginLeft: (task.indentLevel || 0) * 24 }}
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
              style={{ opacity: task.completed ? 0.5 : 1 }}
              title="Shift+Enter: 하위할일 | Alt+↑↓: 순서 변경"
            />
          </div>
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
          <div className="task-controls">
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
            <button 
              onPointerDown={(e) => {
                e.preventDefault();
                const isTouch = e.pointerType === 'touch';
                if (isTouch) {
                  const pointerId = e.pointerId;
                  const onUp = (evt) => {
                    if (evt.pointerId !== pointerId) return;
                    window.removeEventListener('pointerup', onUp);
                    moveTask(dateKey, currentPath, 'indent');
                    const input = document.querySelector(`input[data-task-id="${task.id}"]`);
                    if (input) input.focus({ preventScroll: true });
                  };
                  window.addEventListener('pointerup', onUp);
                } else {
                  moveTask(dateKey, currentPath, 'indent');
                  const input = document.querySelector(`input[data-task-id="${task.id}"]`);
                  if (input) input.focus({ preventScroll: true });
                }
              }}
              className="control-btn" 
              title="들여쓰기 (Tab)"
            >&gt;</button>
            <button 
              onPointerDown={(e) => {
                e.preventDefault();
                const isTouch = e.pointerType === 'touch';
                if (isTouch) {
                  const pointerId = e.pointerId;
                  const onUp = (evt) => {
                    if (evt.pointerId !== pointerId) return;
                    window.removeEventListener('pointerup', onUp);
                    moveTask(dateKey, currentPath, 'outdent');
                    const input = document.querySelector(`input[data-task-id="${task.id}"]`);
                    if (input) input.focus({ preventScroll: true });
                  };
                  window.addEventListener('pointerup', onUp);
                } else {
                  moveTask(dateKey, currentPath, 'outdent');
                  const input = document.querySelector(`input[data-task-id="${task.id}"]`);
                  if (input) input.focus({ preventScroll: true });
                }
              }}
              className="control-btn" 
              title="내어쓰기 (Shift+Tab)"
            >&lt;</button>
            <button onClick={() => deleteTask(dateKey, currentPath)} className="control-btn delete-btn">🗑</button>
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

  const handleFirebaseLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser({ id: result.user.uid, email: result.user.email });
      setUseFirebase(true);
      
      const docRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().dates) {
        setDates(docSnap.data().dates);
        setTimerLogs(docSnap.data().timerLogs || {});
        setTogglToken(docSnap.data().togglToken || '');
        localStorage.setItem('simpleoneData', JSON.stringify(docSnap.data().dates));
        if (docSnap.data().togglToken) localStorage.setItem('togglToken', docSnap.data().togglToken);
      }
      
      onSnapshot(docRef, (doc) => {
        if (doc.exists() && doc.data().dates) {
          setDates(doc.data().dates);
          setTimerLogs(doc.data().timerLogs || {});
          setTogglToken(doc.data().togglToken || '');
          localStorage.setItem('simpleoneData', JSON.stringify(doc.data().dates));
          if (doc.data().togglToken) localStorage.setItem('togglToken', doc.data().togglToken);
        }
      });
    } catch (error) {
      alert('Firebase 로그인 실패: ' + error.message);
    }
  };

  const handleFirebaseLogout = async () => {
    try {
      await firebaseSignOut(auth);
      setUser(null);
      setUseFirebase(false);
    } catch (error) {
      alert('로그아웃 실패: ' + error.message);
    }
  };

  const handleLogout = async () => {
    try {
      await handleFirebaseLogout();
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
      setIsSyncing(true);
      const docRef = doc(db, 'users', user.id);
      await setDoc(docRef, { dates, timerLogs, togglToken }, { merge: true });
      setIsSyncing(false);
      alert('✅ 업로드 완료!');
    } catch (error) {
      console.error('업로드 에러:', error);
      setIsSyncing(false);
      alert('❌ 업로드 실패: ' + error.message);
    }
  };

  const forceDownload = async () => {
    if (!user) {
      alert('로그인이 필요합니다.');
      return;
    }
    try {
      setIsSyncing(true);
      const docRef = doc(db, 'users', user.id);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists() && docSnap.data().dates) {
        const data = docSnap.data();
        setDates(data.dates);
        setTimerLogs(data.timerLogs || {});
        setTogglToken(data.togglToken || '');
        localStorage.setItem('simpleoneData', JSON.stringify(data.dates));
        localStorage.setItem('timerLogs', JSON.stringify(data.timerLogs || {}));
        if (data.togglToken) localStorage.setItem('togglToken', data.togglToken);
        setIsSyncing(false);
        alert('✅ 다운로드 완료!');
      } else {
        setIsSyncing(false);
        alert('⚠️ 저장된 데이터가 없습니다.');
      }
    } catch (error) {
      console.error('다운로드 에러:', error);
      setIsSyncing(false);
      alert('❌ 다운로드 실패: ' + error.message);
    }
  };

  return (
    <div className="App">
      {togglPopup && (
        <div className="popup-overlay" onClick={() => setTogglPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3>⏱️ Toggl API</h3>
            <input
              type="text"
              value={togglToken}
              onChange={(e) => setTogglToken(e.target.value)}
              placeholder="API Token"
              style={{ width: '100%', padding: '8px', marginBottom: '10px' }}
            />
            <div className="popup-buttons">
              <button onClick={() => {
                localStorage.setItem('togglToken', togglToken);
                setTogglPopup(false);
              }}>저장</button>
              <button onClick={() => setTogglPopup(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
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
            <div className="popup-inputs" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                value={Math.floor(timePopup.time / 3600)}
                onChange={(e) => {
                  const h = parseInt(e.target.value) || 0;
                  const m = Math.floor((timePopup.time % 3600) / 60);
                  const s = timePopup.time % 60;
                  setTimePopup({ ...timePopup, time: h * 3600 + m * 60 + s });
                }}
                style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '24px' }}>:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={Math.floor((timePopup.time % 3600) / 60)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 2) return;
                  const h = Math.floor(timePopup.time / 3600);
                  const m = Math.min(parseInt(val) || 0, 59);
                  const s = timePopup.time % 60;
                  setTimePopup({ ...timePopup, time: h * 3600 + m * 60 + s });
                }}
                style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '24px' }}>:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={timePopup.time % 60}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 2) return;
                  const h = Math.floor(timePopup.time / 3600);
                  const m = Math.floor((timePopup.time % 3600) / 60);
                  const s = Math.min(parseInt(val) || 0, 59);
                  setTimePopup({ ...timePopup, time: h * 3600 + m * 60 + s });
                }}
                style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
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
            <div className="popup-inputs" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <input
                type="number"
                min="0"
                value={Math.floor(goalPopup.goalTime / 3600)}
                onChange={(e) => {
                  const h = parseInt(e.target.value) || 0;
                  const m = Math.floor((goalPopup.goalTime % 3600) / 60);
                  const s = goalPopup.goalTime % 60;
                  setGoalPopup({ ...goalPopup, goalTime: h * 3600 + m * 60 + s });
                }}
                style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '24px' }}>:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={Math.floor((goalPopup.goalTime % 3600) / 60)}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 2) return;
                  const h = Math.floor(goalPopup.goalTime / 3600);
                  const m = Math.min(parseInt(val) || 0, 59);
                  const s = goalPopup.goalTime % 60;
                  setGoalPopup({ ...goalPopup, goalTime: h * 3600 + m * 60 + s });
                }}
                style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
              />
              <span style={{ fontSize: '24px' }}>:</span>
              <input
                type="number"
                min="0"
                max="59"
                value={goalPopup.goalTime % 60}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val.length > 2) return;
                  const h = Math.floor(goalPopup.goalTime / 3600);
                  const m = Math.floor((goalPopup.goalTime % 3600) / 60);
                  const s = Math.min(parseInt(val) || 0, 59);
                  setGoalPopup({ ...goalPopup, goalTime: h * 3600 + m * 60 + s });
                }}
                style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
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
      {settingsPopup && (
        <div className="popup-overlay" onClick={() => setSettingsPopup(false)}>
          <div className="popup settings-popup" onClick={(e) => e.stopPropagation()}>
            <h3>⚙️ 설정</h3>
            <button onClick={() => setSettingsPopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div className="settings-section">
              <button onClick={() => setDarkMode(!darkMode)} className="settings-btn">
                {darkMode ? '☀️ 라이트 모드' : '🌙 다크 모드'}
              </button>
            </div>
            <div className="settings-section">
              <h4>💾 장치 저장</h4>
              <div style={{ display: 'flex', gap: '5px' }}>
                <button onClick={downloadBackup} className="settings-btn" style={{ width: 'auto', flex: 1 }}>💾 저장</button>
                <input
                  type="file"
                  accept=".json"
                  onChange={loadBackup}
                  style={{ display: 'none' }}
                  id="file-input"
                />
                <button onClick={() => document.getElementById('file-input').click()} className="settings-btn" style={{ width: 'auto', flex: 1 }}>📂 불러오기</button>
              </div>
            </div>
            <div className="settings-section">
              <h4>☁️ 클라우드 {user && isSyncing && <span style={{ fontSize: '14px', marginLeft: '5px', color: '#4ade80' }}>●</span>}</h4>
              {user ? (
                <>
                  <p style={{ fontSize: '12px', marginBottom: '10px' }}>{user.email}</p>
                  <div style={{ display: 'flex', gap: '5px' }}>
                    <button onClick={forceUpload} className="settings-btn" style={{ width: 'auto', flex: 1 }}>⬆️ 업로드</button>
                    <button onClick={forceDownload} className="settings-btn" style={{ width: 'auto', flex: 1 }}>⬇️ 다운로드</button>
                    <button onClick={handleLogout} className="settings-btn" style={{ width: 'auto', flex: 1 }}>로그아웃</button>
                  </div>
                </>
              ) : (
                <button onClick={handleFirebaseLogin} className="settings-btn">☁️ 로그인</button>
              )}
            </div>
            <div className="settings-section">
              <h4>⏱️ Toggl (API 입력) {togglToken && Object.values(togglEntries).length > 0 && <span style={{ fontSize: '14px', marginLeft: '5px', color: '#4ade80' }}>●</span>}</h4>
              <input
                type="text"
                value={togglToken}
                onChange={(e) => setTogglToken(e.target.value)}
                placeholder="API Token"
                style={{ width: '100%', padding: '8px', marginBottom: '10px', boxSizing: 'border-box' }}
              />
              <button onClick={() => {
                localStorage.setItem('togglToken', togglToken);
                alert('저장 완료!');
              }} className="settings-btn">저장</button>
            </div>
            <div className="settings-section" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <button onClick={() => setSettingsPopup(false)} className="settings-btn">닫기</button>
            </div>
          </div>
        </div>
      )}
      <div className="header">
        <h1>Simple One</h1>
        <div className="header-controls">
          <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
            {user && <span style={{ fontSize: '16px' }}>☁️{isSyncing && <span style={{ fontSize: '10px', color: '#4ade80', marginLeft: '2px' }}>●</span>}</span>}
            {togglToken && <span style={{ fontSize: '16px' }}>⏱️{Object.values(togglEntries).length > 0 && <span style={{ fontSize: '10px', color: '#4ade80', marginLeft: '2px' }}>●</span>}</span>}
            <button onClick={() => setSettingsPopup(true)} className="icon-btn" title="설정">
              ⚙️
            </button>
          </div>
        </div>
      </div>
      <div className="view-controls">
        <button onClick={() => setShowCalendar(!showCalendar)} className="icon-btn" title="캘린더">
          {showCalendar ? '▲' : '▼'}
        </button>
        <div className="view-mode-btns">
          <button onClick={() => setViewMode('day')} className={`icon-btn ${viewMode === 'day' ? 'active' : ''}`} title="일간 (Ctrl+1)">📋</button>
          <button onClick={() => setViewMode('month')} className={`icon-btn ${viewMode === 'month' ? 'active' : ''}`} title="월간 (Ctrl+2)">📊</button>
          <button onClick={() => setViewMode('timeline')} className={`icon-btn ${viewMode === 'timeline' ? 'active' : ''}`} title="타임라인 (Ctrl+3)">🕒</button>
        </div>
        {showCalendar && (
          <div className="calendar-container">
            <Calendar
              value={currentDate}
              onChange={setCurrentDate}
              calendarType="gregory"
              tileContent={({ date, view }) => {
                if (view !== 'month') return null;
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
                    style={{ top: `${topPos}%`, height: `${Math.max(height, 0.5)}%` }}
                    onClick={() => setLogEditPopup({ dateKey, logIndex: idx, log })}
                  >
                    <span className="timeline-time">{String(startHour).padStart(2, '0')}:{String(startMin).padStart(2, '0')}-{String(endHour).padStart(2, '0')}:{String(endMin).padStart(2, '0')}</span>
                    <span className="timeline-task">{log.taskName}</span>
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
              <div key={day} className="month-day">
                <div className="month-day-header" onClick={() => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setViewMode('day'); }}>
                  <strong>{day}일</strong>
                  {dayStats.total > 0 && <span className="month-day-stats">{dayStats.completed}/{dayStats.total}</span>}
                </div>
                <div className="month-tasks">
                  {dates[key]?.slice(0, expandedDays[key] ? undefined : 3).map(task => {
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
                  {dates[key]?.length > 3 && !expandedDays[key] && <div className="month-task-more" onClick={(e) => { e.stopPropagation(); setExpandedDays({ ...expandedDays, [key]: true }); }}>+{dates[key].length - 3}개 더</div>}
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
