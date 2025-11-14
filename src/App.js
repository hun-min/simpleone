import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './App.css';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { formatTime } from './utils/timeUtils';
import { getTaskStats, getStreak, getSubTasks } from './utils/taskUtils';
import { stopTogglTimer, startTogglTimer, saveTogglEntry } from './services/togglService';
import { updateTaskTimes, addTimerLog } from './services/taskService';
import SettingsPopup from './components/SettingsPopup';
import { TrashPopup, SpacePopup, DeleteConfirmPopup, GoalPopup } from './components/Popups';

function App() {
  const [dates, setDates] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTimers, setActiveTimers] = useState(() => {
    const saved = localStorage.getItem('activeTimers');
    return saved ? JSON.parse(saved) : {};
  });
  const [timerSeconds, setTimerSeconds] = useState({});
  const [history, setHistory] = useState([]);
  const [historyIndex, setHistoryIndex] = useState(-1);

  const [selectedTasks, setSelectedTasks] = useState([]);
  const [user, setUser] = useState(null);
  const [useFirebase, setUseFirebase] = useState(false);
  const [showCalendar, setShowCalendar] = useState(true);
  const [viewMode, setViewMode] = useState('list');
  const [timerLogs, setTimerLogs] = useState(() => {
    const saved = localStorage.getItem('timerLogs');
    return saved ? JSON.parse(saved) : {};
  });
  const [goalPopup, setGoalPopup] = useState(null);


  const [taskHistory, setTaskHistory] = useState(() => {
    const saved = localStorage.getItem('taskHistory');
    return saved ? JSON.parse(saved) : {};
  });

  const [timePopup, setTimePopup] = useState(null);
  const [logEditPopup, setLogEditPopup] = useState(null);
  const [togglToken, setTogglToken] = useState('');
  const [togglPopup, setTogglPopup] = useState(false);
  const [settingsPopup, setSettingsPopup] = useState(false);
  const [spacePopup, setSpacePopup] = useState(false);
  const [trashPopup, setTrashPopup] = useState(false);
  const [togglEntries, setTogglEntries] = useState({});
  const [isSyncing, setIsSyncing] = useState(false);
  const [expandedDays, setExpandedDays] = useState({});
  const [trash, setTrash] = useState(() => {
    const saved = localStorage.getItem('trash');
    return saved ? JSON.parse(saved) : [];
  });
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  const [spaces, setSpaces] = useState([]);
  const [localPasswords, setLocalPasswords] = useState(() => {
    const saved = localStorage.getItem('localPasswords');
    return saved ? JSON.parse(saved) : {};
  });
  const [selectedSpaceId, setSelectedSpaceId] = useState(null);
  const [subTasksPopup, setSubTasksPopup] = useState(null);
  const [draggedTaskId, setDraggedTaskId] = useState(null);
  const [obstaclePopup, setObstaclePopup] = useState(null);
  const [timeEditPopup, setTimeEditPopup] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [calendarActiveDate, setCalendarActiveDate] = useState(new Date());

  const [quickStartPopup, setQuickStartPopup] = useState(false);
  const [taskHistoryPopup, setTaskHistoryPopup] = useState(null);

  const [quickTimer, setQuickTimer] = useState(null);
  const [quickTimerSeconds, setQuickTimerSeconds] = useState(0);
  const [quickTimerTaskId, setQuickTimerTaskId] = useState(null);
  const [quickTimerPopup, setQuickTimerPopup] = useState(false);
  const [unassignedTimes, setUnassignedTimes] = useState(() => {
    const saved = localStorage.getItem('unassignedTimes');
    return saved ? JSON.parse(saved) : [];
  });
  const [quickTimerPopupText, setQuickTimerPopupText] = useState('');
  const [quickTimerText, setQuickTimerText] = useState('');
  const [quickTimerSuggestions, setQuickTimerSuggestions] = useState([]);
  const [quickTimerSuggestionIndex, setQuickTimerSuggestionIndex] = useState(-1);
  const quickTimerInputRef = useRef(null);
  const isSelectingSuggestion = useRef(false);
  const [spaceSelectPopup, setSpaceSelectPopup] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [autocompleteData, setAutocompleteData] = useState({}); // { taskId: { suggestions: [], selectedIndex: -1 } }

  const [passwordPopup, setPasswordPopup] = useState(null);
  const [passwordSetupPopup, setPasswordSetupPopup] = useState(null);
  const [backupHistoryPopup, setBackupHistoryPopup] = useState(null);
  const [dateChangePopup, setDateChangePopup] = useState(null);
  const skipFirebaseSave = useRef(false);
  const newlyCreatedTaskId = useRef(null);
  const newlyCreatedTasks = useRef(new Set()); // 새로 생성된 카드 ID 추적

  useEffect(() => {
    if (selectedSpaceId && passwordPopup && passwordPopup.spaceId === selectedSpaceId) {
      setPasswordPopup(null);
    }
  }, [selectedSpaceId, passwordPopup]);

  // 새로 생성된 카드에 자동 포커스
  useEffect(() => {
    if (newlyCreatedTaskId.current) {
      const taskId = newlyCreatedTaskId.current;
      newlyCreatedTaskId.current = null; // 한 번만 실행되도록 리셋
      
      setEditingTaskId(taskId);
      
      // 더 긴 지연으로 DOM이 완전히 렌더링된 후 포커스
      setTimeout(() => {
        requestAnimationFrame(() => {
          requestAnimationFrame(() => {
            const textarea = document.querySelector(`textarea[data-task-id="${taskId}"]`);
            if (textarea) {
              textarea.readOnly = false;
              // 포커스를 여러 번 시도하여 확실하게 유지
              textarea.focus({ preventScroll: true });
              setTimeout(() => {
                if (document.activeElement !== textarea) {
                  textarea.focus({ preventScroll: true });
                  try { textarea.setSelectionRange(0, 0); } catch (_) {}
                }
              }, 50);
              try { textarea.setSelectionRange(0, 0); } catch (_) {}
            }
          });
        });
      }, 200);
    }
  }, [dates]);

  const viewportStableTimer = useRef(null);
  const lastKeyboardHeight = useRef(0);


  useEffect(() => {
    document.body.className = 'light-mode';
  }, []);

  const focusWithoutKeyboard = (el) => {
    if (!el) return;
    const wasReadOnly = el.readOnly;
    const wasInputMode = el.inputMode;
    el.readOnly = true;
    el.inputMode = 'none';
    el.focus({ preventScroll: true });
    requestAnimationFrame(() => {
      el.readOnly = wasReadOnly;
      el.inputMode = wasInputMode;
    });
  };

  const focusKeyboardGuard = () => {
    const ae = document.activeElement;
    if (ae && ae.tagName === 'TEXTAREA') {
      focusWithoutKeyboard(ae);
    }
  };

  useEffect(() => {
    const handleContextMenu = (e) => {
      const isTaskRow = e.target.closest('.task-row');
      if (isTaskRow) {
        e.preventDefault();
      }
    };
    document.addEventListener('contextmenu', handleContextMenu);
    return () => document.removeEventListener('contextmenu', handleContextMenu);
  }, []);

  useEffect(() => {
    if (!window.visualViewport) return;
    const handleResize = () => {
      const vvh = window.visualViewport.height;
      const wh = window.innerHeight;
      const kbHeight = wh - vvh;
      if (viewportStableTimer.current) clearTimeout(viewportStableTimer.current);
      viewportStableTimer.current = setTimeout(() => {
        if (kbHeight >= 120 && lastKeyboardHeight.current < 40) {
          lastKeyboardHeight.current = kbHeight;
        } else if (kbHeight <= 40 && lastKeyboardHeight.current >= 120) {
          lastKeyboardHeight.current = kbHeight;
        }
      }, 120);
    };
    window.visualViewport.addEventListener('resize', handleResize);
    return () => {
      window.visualViewport.removeEventListener('resize', handleResize);
      if (viewportStableTimer.current) clearTimeout(viewportStableTimer.current);
    };
  }, []);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.altKey && ['1','2','3','4','5','6','7','8','9','0'].includes(e.key)) {
        e.preventDefault();
        const idx = e.key === '0' ? 9 : parseInt(e.key) - 1;
        if (idx < spaces.length) {
          const targetSpace = spaces[idx];
          const localPassword = localPasswords[targetSpace.id];
          if (localPassword) {
            setPasswordPopup({
              spaceName: targetSpace.name,
              spacePassword: localPassword,
              spaceId: targetSpace.id,
              onSuccess: () => setSelectedSpaceId(targetSpace.id),
              onFail: () => {}
            });
          } else {
            setSelectedSpaceId(targetSpace.id);
          }
        }
      } else if (e.ctrlKey && e.key === '1') {
        e.preventDefault();
        setViewMode('day');
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setViewMode('month');
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setViewMode('timeline');
      } else if (e.ctrlKey && e.key === ' ') {
        e.preventDefault();
        e.stopPropagation();
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'TEXTAREA') {
          const taskId = parseInt(activeElement.getAttribute('data-task-id'));
          const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;
          setDates(prev => {
            const newDates = { ...prev };
            const tasks = newDates[dateKey] || [];
            const task = tasks.find(t => t.id === taskId);
            if (task) {
              task.completed = !task.completed;
              if (task.completed) {
                task.completedAt = new Date().toISOString();
              } else {
                delete task.completedAt;
              }
            }
            return newDates;
          });
        }
      }
    };
    window.addEventListener('keydown', handleGlobalKeyDown, true);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [currentDate, spaces, selectedSpaceId, localPasswords]);

  useEffect(() => {
    const savedDates = localStorage.getItem('dates');
    if (savedDates) {
      const parsedDates = JSON.parse(savedDates);
      
      // dates의 모든 task에 spaceId: 'default' 추가
      const updatedDates = {};
      Object.keys(parsedDates).forEach(dateKey => {
        updatedDates[dateKey] = parsedDates[dateKey].map(task => ({
          ...task,
          spaceId: task.spaceId || 'default'
        }));
      });
      setDates(updatedDates);
    }
    
    const savedSpaces = localStorage.getItem('spaces');
    let initialSpaces = [{ id: 'default', name: '기본 공간' }];
    let initialSelectedSpaceId = 'default';
    if (savedSpaces) {
      const parsed = JSON.parse(savedSpaces);
      initialSpaces = parsed.spaces || [{ id: 'default', name: '기본 공간' }];
      initialSelectedSpaceId = parsed.selectedSpaceId || 'default';
    }
    setSpaces(initialSpaces);
    
    const savedLocalPasswords = localStorage.getItem('localPasswords');
    const localPwds = savedLocalPasswords ? JSON.parse(savedLocalPasswords) : {};
    setLocalPasswords(localPwds);
    
    const selectedSpace = initialSpaces.find(s => s.id === initialSelectedSpaceId);
    const localPassword = localPwds[initialSelectedSpaceId];
    
    if (selectedSpace && localPassword) {
      setPasswordPopup({
        spaceName: selectedSpace.name,
        spacePassword: localPassword,
        spaceId: initialSelectedSpaceId,
        onSuccess: () => {
          setSelectedSpaceId(initialSelectedSpaceId);
        },
        onFail: () => setSelectedSpaceId('default')
      });
    } else {
      setSelectedSpaceId(initialSelectedSpaceId);
    }
    
    const savedToken = localStorage.getItem('togglToken');
    if (savedToken) setTogglToken(savedToken);
    
    const unsubscribe = auth.onAuthStateChanged(async (firebaseUser) => {
      if (firebaseUser) {
        setUser({ id: firebaseUser.uid, email: firebaseUser.email });
        setUseFirebase(true);
        
        const docRef = doc(db, 'users', firebaseUser.uid);
        const docSnap = await getDoc(docRef);
        if (docSnap.exists()) {
          const data = docSnap.data();
          const workspaces = data.workspaces || {};
          const defaultWorkspace = workspaces.default || {};
          
          if (defaultWorkspace.dates) {
            const updatedDates = {};
            Object.keys(defaultWorkspace.dates).forEach(dateKey => {
              updatedDates[dateKey] = defaultWorkspace.dates[dateKey].map(task => ({
                ...task,
                spaceId: task.spaceId || 'default'
              }));
            });
            setDates(updatedDates);
            localStorage.setItem('dates', JSON.stringify(updatedDates));
          }
          if (data.spaces) {
            const currentSelectedSpaceId = selectedSpaceId || 'default';
            setSpaces(data.spaces);
            localStorage.setItem('spaces', JSON.stringify({ spaces: data.spaces, selectedSpaceId: currentSelectedSpaceId }));
          }
          if (data.togglToken) {
            setTogglToken(data.togglToken);
            localStorage.setItem('togglToken', data.togglToken);
          }
          if (data.quickTimer) {
            setQuickTimer(data.quickTimer.startTime);
            setQuickTimerTaskId(data.quickTimer.taskId || null);
          }
        }
        
        onSnapshot(docRef, (doc) => {
          if (doc.exists()) {
            const data = doc.data();
            const workspaces = data.workspaces || {};
            const defaultWorkspace = workspaces.default || {};
            
            if (skipFirebaseSave.current) return;
            skipFirebaseSave.current = true;
            if (defaultWorkspace.dates) {
              const updatedDates = {};
              Object.keys(defaultWorkspace.dates).forEach(dateKey => {
                updatedDates[dateKey] = defaultWorkspace.dates[dateKey].map(task => ({
                  ...task,
                  spaceId: task.spaceId || 'default'
                }));
              });
              setDates(updatedDates);
              localStorage.setItem('dates', JSON.stringify(updatedDates));
            }
            if (data.spaces) {
              const currentSelectedSpaceId = selectedSpaceId || 'default';
              setSpaces(data.spaces);
              localStorage.setItem('spaces', JSON.stringify({ spaces: data.spaces, selectedSpaceId: currentSelectedSpaceId }));
            }
            if (data.togglToken) {
              setTogglToken(data.togglToken);
              localStorage.setItem('togglToken', data.togglToken);
            }
            if (data.quickTimer) {
              setQuickTimer(data.quickTimer.startTime);
              setQuickTimerTaskId(data.quickTimer.taskId || null);
            } else if (data.quickTimer === null) {
              setQuickTimer(null);
              setQuickTimerTaskId(null);
            }
            setTimeout(() => { skipFirebaseSave.current = false; }, 100);
          }
        });
      }
    });
    
    return () => unsubscribe();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    localStorage.setItem('activeTimers', JSON.stringify(activeTimers));
  }, [activeTimers]);

  useEffect(() => {
    localStorage.setItem('unassignedTimes', JSON.stringify(unassignedTimes));
  }, [unassignedTimes]);

  useEffect(() => {
    localStorage.setItem('timerLogs', JSON.stringify(timerLogs));
  }, [timerLogs]);

  useEffect(() => {
    const hasActiveTimer = Object.values(activeTimers).some(timer => timer !== false) || quickTimer;
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
      if (quickTimer) {
        setQuickTimerSeconds(Math.floor((Date.now() - quickTimer) / 1000));
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [activeTimers, quickTimer]);

  useEffect(() => {
    localStorage.setItem('dates', JSON.stringify(dates));
    if (user && useFirebase && !skipFirebaseSave.current) {
      const timer = setTimeout(async () => {
        const activeElement = document.activeElement;
        const scrollTop = window.scrollY;
        
        const docRef = doc(db, 'users', user.id);
        const quickTimerData = quickTimer ? { startTime: quickTimer, taskId: quickTimerTaskId || null } : null;
        
        const docSnap = await getDoc(docRef);
        const existingData = docSnap.exists() ? docSnap.data() : {};
        const backupHistory = existingData.backupHistory || [];
        
        const newBackup = {
          timestamp: Date.now(),
          dates,
          spaces,
          togglToken
        };
        
        backupHistory.unshift(newBackup);
        if (backupHistory.length > 10) backupHistory.splice(10);
        
        setDoc(docRef, { 
          workspaces: { default: { dates } },
          spaces, 
          togglToken,
          quickTimer: quickTimerData,
          backupHistory
        }, { merge: true }).then(() => {
          window.scrollTo(0, scrollTop);
          if (activeElement && activeElement.tagName === 'TEXTAREA') {
            activeElement.focus({ preventScroll: true });
          }
        });
      }, 3000);
      return () => clearTimeout(timer);
    }
  }, [dates, user, useFirebase, spaces, selectedSpaceId, togglToken, quickTimer, quickTimerTaskId]);

  useEffect(() => {
    localStorage.setItem('spaces', JSON.stringify({ spaces, selectedSpaceId }));
    const spacesWithoutPasswords = spaces.map(s => ({ ...s, password: null }));
    if (user && useFirebase && !skipFirebaseSave.current) {
      const docRef = doc(db, 'users', user.id);
      setDoc(docRef, { spaces: spacesWithoutPasswords }, { merge: true });
    }
  }, [spaces, selectedSpaceId, user, useFirebase]);

  useEffect(() => {
    localStorage.setItem('localPasswords', JSON.stringify(localPasswords));
  }, [localPasswords]);

  useEffect(() => {
    if (selectedSpaceId && spaces.length > 0) {
      const space = spaces.find(s => s.id === selectedSpaceId);
      if (space && space.password) {
        const input = prompt(`"${space.name}" 비밀번호:`);
        if (input !== space.password) {
          alert('비밀번호가 틀렸습니다.');
          setSelectedSpaceId('default');
        }
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);







  const saveTasks = (newDates, addToHistory = true) => {
    setDates(newDates);
    if (addToHistory) {
      const newHistory = history.slice(0, historyIndex + 1);
      newHistory.push(JSON.parse(JSON.stringify(newDates)));
      setHistory(newHistory);
      setHistoryIndex(newHistory.length - 1);
    }
  };



  const downloadBackup = async () => {
    const dataStr = JSON.stringify({ dates, spaces, selectedSpaceId, timerLogs }, null, 2);
    const blob = new Blob([dataStr], { type: 'application/json' });
    
    if (window.showSaveFilePicker) {
      try {
        const handle = await window.showSaveFilePicker({
          suggestedName: `simpleone-${new Date().toISOString().split('T')[0]}.json`,
          types: [{
            description: 'JSON Files',
            accept: { 'application/json': ['.json'] }
          }]
        });
        const writable = await handle.createWritable();
        await writable.write(blob);
        await writable.close();
      } catch (err) {
        if (err.name !== 'AbortError') console.error(err);
      }
    } else {
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `simpleone-${new Date().toISOString().split('T')[0]}.json`;
      a.click();
      URL.revokeObjectURL(url);
    }
  };

  const loadBackup = (e) => {
    const file = e.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (event) => {
        try {
          const data = JSON.parse(event.target.result);
          if (data.dates) setDates(data.dates);
          if (data.spaces) {
            setSpaces(data.spaces);
            setSelectedSpaceId(data.selectedSpaceId || 'default');
          }
          if (data.timerLogs) setTimerLogs(data.timerLogs);
          alert('불러오기 완료!');
        } catch (err) {
          alert('파일 형식이 올바르지 않습니다.');
        }
      };
      reader.readAsText(file);
    }
  };

  const addSpace = () => {
    const name = prompt('새 공간 이름:');
    if (!name) return;
    const id = `space-${Date.now()}`;
    setSpaces([...spaces, { id, name, password: null }]);
    setSelectedSpaceId(id);
  };

  const renameSpace = (id) => {
    const space = spaces.find(s => s.id === id);
    if (!space) return;
    const name = prompt('공간 이름 변경:', space.name);
    if (!name || name === space.name) return;
    setSpaces(spaces.map(s => s.id === id ? { ...s, name } : s));
  };

  const changeSpacePassword = (id) => {
    const space = spaces.find(s => s.id === id);
    if (!space) return;
    
    const currentPassword = localPasswords[id];
    setPasswordSetupPopup({
      spaceId: id,
      spaceName: space.name,
      hasPassword: !!currentPassword,
      currentPassword: currentPassword || null
    });
  };

  const deleteSpace = (id) => {
    if (id === 'default') {
      alert('기본 공간은 삭제할 수 없습니다.');
      return;
    }
    const hasTasks = Object.values(dates).some(dayTasks => 
      dayTasks.some(t => (t.spaceId || 'default') === id)
    );
    if (hasTasks) {
      alert('공간에 할일이 있어 삭제할 수 없습니다.');
      return;
    }
    const space = spaces.find(s => s.id === id);
    if (!window.confirm(`"${space.name}" 공간을 삭제하시겠습니까?`)) return;
    setSpaces(spaces.filter(s => s.id !== id));
    if (selectedSpaceId === id) setSelectedSpaceId('default');
  };

  const addTask = (dateKey, parentPath = [], index = -1) => {
    console.log('[Enter] 시작');
    setSelectedTasks([]);
    console.log('[Enter] isMutatingList = true');
    
    const newDates = { ...dates };
    if (!newDates[dateKey]) newDates[dateKey] = [];
    
    const taskId = Date.now();
    newlyCreatedTaskId.current = taskId;
    newlyCreatedTasks.current.add(taskId);
    console.log('[Enter] 새 할일 생성:', taskId);
    const newTask = {
      id: taskId,
      text: '',
      todayTime: 0,
      totalTime: 0,
      todayGoal: 0,
      totalGoal: 0,
      completed: false,
      indentLevel: 0,
      spaceId: selectedSpaceId || 'default',
      type: 'task'
    };

    if (parentPath.length > 0) {
      // 하위할일 추가 (Shift+Enter) - 방해요소처럼 subTasks 배열에 추가
      const parentTask = newDates[dateKey].find(t => t.id === parentPath[0]);
      if (parentTask) {
        if (!parentTask.subTasks) {
          parentTask.subTasks = [];
        }
        parentTask.subTasks.push({
          id: Date.now(),
          text: '',
          completed: false,
          timestamp: Date.now()
        });
        // 카드는 만들지 않음
        return;
      }
    } else if (index === -1) {
      newDates[dateKey].unshift(newTask);
    } else {
      const currentTask = newDates[dateKey][index];
      newTask.indentLevel = currentTask ? currentTask.indentLevel : 0;
      newDates[dateKey].splice(index + 1, 0, newTask);
    }

    setDates(newDates);
    saveTasks(newDates);
    
    // 새로 생성된 카드를 편집 모드로 전환 (useEffect에서 포커스 처리)
    setEditingTaskId(newTask.id);
  };

  const deleteTask = (dateKey, taskId) => {
    focusKeyboardGuard();
    
    // 1min timer 방식: 스크롤 위치 저장 (지우기 전에 1min timer 확인 필수)
    const prevScrollTop = window.scrollY;
    
    const newDates = { ...dates };
    const newTrash = [...trash];
    
    if (selectedTasks.length > 0) {
      selectedTasks.forEach(id => {
        const idx = newDates[dateKey].findIndex(t => t.id === id);
        if (idx !== -1) {
          const deletedTask = newDates[dateKey][idx];
          newTrash.push({ task: deletedTask, dateKey, deletedAt: Date.now() });
          newDates[dateKey].splice(idx, 1);
        }
      });
      setSelectedTasks([]);
    } else {
      const id = Array.isArray(taskId) ? taskId[0] : taskId;
      const taskIdx = newDates[dateKey].findIndex(t => t.id === id);
      if (taskIdx !== -1) {
        const deletedTask = newDates[dateKey][taskIdx];
        newTrash.push({ task: deletedTask, dateKey, deletedAt: Date.now() });
        newDates[dateKey].splice(taskIdx, 1);
      }
    }
    
    setDates(newDates);
    saveTasks(newDates);
    setTrash(newTrash);
    localStorage.setItem('trash', JSON.stringify(newTrash));
    
    setTimeout(() => {
      window.scrollTo(0, prevScrollTop);
    }, 0);
  };

  const restoreFromTrash = (index) => {
    const newTrash = [...trash];
    const item = newTrash[index];
    const newDates = { ...dates };
    if (!newDates[item.dateKey]) newDates[item.dateKey] = [];
    newDates[item.dateKey].push(item.task);
    newTrash.splice(index, 1);
    setDates(newDates);
    saveTasks(newDates);
    setTrash(newTrash);
    localStorage.setItem('trash', JSON.stringify(newTrash));
  };

  const emptyTrash = () => {
    setTrash([]);
    localStorage.setItem('trash', JSON.stringify([]));
  };
  
  const updateTask = (dateKey, taskPath, field, value) => {
    const newDates = { ...dates };
    let task = newDates[dateKey];
    
    for (let i = 0; i < taskPath.length - 1; i++) {
      task = task.find(t => t.id === taskPath[i]).children;
    }
    task = task.find(t => t.id === taskPath[taskPath.length - 1]);
    
    // todayTime 업데이트 시 차이만큼 totalTime에도 추가
    if (field === 'todayTime' && task.text) {
      const diff = value - task.todayTime;
      task.todayTime = value;
      Object.keys(newDates).forEach(date => {
        const updateTasksRecursive = (tasks) => {
          tasks.forEach(t => {
            if (t.text === task.text) {
              t.totalTime += diff;
            }
            if (t.children) updateTasksRecursive(t.children);
          });
        };
        if (newDates[date]) updateTasksRecursive(newDates[date]);
      });
    } else if (field === 'totalTime' && task.text) {
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
      if (field === 'completed' && value === true) {
        task.completedAt = new Date().toISOString();
      } else if (field === 'completed' && value === false) {
        delete task.completedAt;
      }
      
      // 텍스트 변경 시 같은 이름의 할일에서 totalTime 가져오기
      if (field === 'text' && value.trim() && task.totalTime === 0) {
        let foundTotalTime = 0;
        Object.keys(dates).forEach(date => {
          const existingTask = dates[date].find(t => t.text === value.trim());
          if (existingTask && existingTask.totalTime > foundTotalTime) {
            foundTotalTime = existingTask.totalTime;
          }
        });
        if (foundTotalTime > 0) {
          task.totalTime = foundTotalTime;
        }
      }
    }

    setDates(newDates);
    saveTasks(newDates);
    
    // 할일 텍스트 변경 시 히스토리 저장
    if (field === 'text' && value.trim()) {
      const newHistory = { ...taskHistory };
      newHistory[value.trim()] = {
        todayGoal: task.todayGoal,
        totalGoal: task.totalGoal,
        totalTime: task.totalTime
      };
      setTaskHistory(newHistory);
      localStorage.setItem('taskHistory', JSON.stringify(newHistory));
    }
    

  };
  


  const toggleTimer = async (dateKey, taskPath) => {
    const key = `${dateKey}-${taskPath.join('-')}`;
    if (activeTimers[key]) {
      const startTime = activeTimers[key];
      const endTime = Date.now();
      const seconds = Math.floor((endTime - startTime) / 1000);
      
      const togglEntryId = togglEntries[key];
      
      const newDates = { ...dates };
      let tasks = newDates[dateKey];
      for (let i = 0; i < taskPath.length - 1; i++) {
        tasks = tasks.find(t => t.id === taskPath[i]).children;
      }
      const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
      task.todayTime += seconds;
      task.completed = true;
      task.completedAt = new Date().toISOString();
      task.completed = true;
      task.completedAt = new Date().toISOString();
      
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
      
      if (togglToken && seconds >= 1) {
        // Toggl 종료 - 여러 방법으로 시도하여 100% 성공 보장
        const stopToggl = async () => {
          let success = false;
          
          // 방법 1: 저장된 entryId로 종료 시도
          if (togglEntryId) {
            try {
              const stopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${togglEntryId}`, {
                method: 'PATCH',
                headers: { 'Content-Type': 'application/json' }
              });
              if (stopRes.ok) {
                success = true;
              }
            } catch {
              // 실패해도 계속 시도
            }
          }
          
          // 방법 2: 현재 실행 중인 타이머를 가져와서 종료 시도
          if (!success) {
            try {
              const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, { 
                method: 'GET',
                headers: { 'Content-Type': 'application/json' }
              });
              let currentData = null;
              try {
                const text = await currentRes.text();
                if (text.trim() && currentRes.ok) {
                  try {
                    currentData = JSON.parse(text);
                  } catch {
                    // JSON 파싱 실패해도 계속
                  }
                }
              } catch {
                // 응답 읽기 실패해도 계속
              }
              
              if (currentData && currentData.id) {
                try {
                  const forceStopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, { 
                    method: 'PATCH',
                    headers: { 'Content-Type': 'application/json' }
                  });
                  if (forceStopRes.ok) {
                    success = true;
                  }
                } catch {
                  // 강제 종료 실패해도 계속
                }
              }
            } catch {
              // 현재 타이머 확인 실패해도 계속
            }
          }
          
          // 로컬 상태는 항상 정리 (Toggl 성공 여부와 관계없이)
          const newEntries = { ...togglEntries };
          delete newEntries[key];
          setTogglEntries(newEntries);
        };
        
        // 비동기로 실행하되, 실패해도 로컬 타이머는 이미 정리됨
        stopToggl().catch(() => {
          // 모든 시도 실패해도 로컬 상태는 이미 정리됨
        });
      }
      
      const newActiveTimers = { ...activeTimers };
      newActiveTimers[key] = false;
      setActiveTimers(newActiveTimers);
      
      const newTimerSeconds = { ...timerSeconds };
      newTimerSeconds[key] = 0;
      setTimerSeconds(newTimerSeconds);
    } else {
      setActiveTimers({ ...activeTimers, [key]: Date.now() });
      setTimerSeconds({ ...timerSeconds, [key]: 0 });
      
      if (togglToken) {
        try {
          // 1. 먼저 현재 실행 중인 타이머가 있는지 확인하고 중지
          try {
            const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
              method: 'GET',
              headers: { 'Content-Type': 'application/json' }
            });
            let currentData = null;
            let currentText = '';
            try {
              currentText = await currentRes.text();
              if (currentText.trim() && currentRes.ok) {
                try {
                  currentData = JSON.parse(currentText);
                } catch {
                  // JSON이 아니면 무시하고 계속 진행
                }
              }
            } catch {
              // 응답 읽기 실패해도 계속 진행
            }
            
            // 실행 중인 타이머가 있으면 중지 시도 (실패해도 계속 진행)
            if (currentData && currentData.id) {
              try {
                await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
                  method: 'PATCH',
                  headers: { 'Content-Type': 'application/json' }
                });
              } catch {
                // 중지 실패해도 계속 진행
              }
            }
          } catch {
            // 현재 타이머 확인 실패해도 계속 진행
          }
          
          // 2. 새 타이머 시작
          const newDates = { ...dates };
          let tasks = newDates[dateKey];
          for (let i = 0; i < taskPath.length - 1; i++) {
            tasks = tasks.find(t => t.id === taskPath[i]).children;
          }
          const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
          
          try {
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
            
            let data = null;
            let responseText = '';
            try {
              responseText = await res.text();
              if (responseText.trim()) {
                try {
                  data = JSON.parse(responseText);
                } catch {
                  // JSON 파싱 실패 시에도 계속 진행 (타이머는 이미 시작됨)
                }
              }
            } catch {
              // 응답 읽기 실패해도 계속 진행
            }
            
            // 성공하면 entry ID 저장, 실패해도 타이머는 계속 실행
            if (res.ok && data && data.id) {
              setTogglEntries({ ...togglEntries, [key]: data.id });
            } else {
              // Toggl 시작 실패해도 로컬 타이머는 계속 실행
              console.warn('Toggl 시작 실패했지만 로컬 타이머는 계속 실행:', responseText.substring(0, 100));
            }
          } catch (startErr) {
            // Toggl 시작 중 오류가 발생해도 로컬 타이머는 계속 실행
            console.warn('Toggl 시작 중 오류 발생했지만 로컬 타이머는 계속 실행:', startErr);
          }
        } catch (err) {
          // 전체 Toggl 연동 실패해도 로컬 타이머는 계속 실행
          console.warn('Toggl 연동 실패했지만 로컬 타이머는 계속 실행:', err);
        }
      }
    }
  };








  const addSubTask = (dateKey, parentTaskId) => {
    const newDates = { ...dates };
    const task = newDates[dateKey]?.find(t => t.id === parentTaskId);
    if (!task) return;
    if (!task.subTasks) {
      task.subTasks = [];
    }
    task.subTasks.push({
      id: Date.now(),
      text: '',
      completed: false,
      timestamp: Date.now()
    });
    setDates(newDates);
    saveTasks(newDates);
  };

  const startQuickTimer = (taskId = null) => {
    const startTime = Date.now();
    setQuickTimer(startTime);
    setQuickTimerSeconds(0);
    const numericTaskId = taskId ? Number(taskId) : null;
    setQuickTimerTaskId(numericTaskId);
    if (user && useFirebase) {
      const docRef = doc(db, 'users', user.id);
      setDoc(docRef, { quickTimer: { startTime, taskId: numericTaskId } }, { merge: true });
    }
  };

  const stopQuickTimer = async () => {
    if (!quickTimer) {
      console.log('quickTimer 없음');
      return;
    }
    const seconds = Math.floor((Date.now() - quickTimer) / 1000);
    
    const numericTaskId = quickTimerTaskId ? Number(quickTimerTaskId) : null;
    
    console.log('stopQuickTimer 호출:', { quickTimerText, numericTaskId, seconds, dateKey });
    
    if (quickTimerText.trim()) {
      console.log('quickTimerText 있음, 새 할일 생성:', quickTimerText.trim());
      skipFirebaseSave.current = true;
      const newDates = { ...dates };
      if (!newDates[dateKey]) newDates[dateKey] = [];
      let existingTask = newDates[dateKey].find(t => t.text === quickTimerText.trim() && (t.spaceId || 'default') === selectedSpaceId);
      if (!existingTask) {
        existingTask = {
          id: Date.now(),
          text: quickTimerText.trim(),
          todayTime: 0,
          totalTime: 0,
          todayGoal: 0,
          totalGoal: 0,
          completed: false,
          indentLevel: 0,
          spaceId: selectedSpaceId || 'default'
        };
        newDates[dateKey].push(existingTask);
      }
      existingTask.todayTime += seconds;
      existingTask.completed = true;
      existingTask.completedAt = new Date().toISOString();
      const taskName = existingTask.text;
      Object.keys(newDates).forEach(date => {
        const updateTasksRecursive = (tasks) => {
          tasks.forEach(t => {
            if (t.text === taskName) t.totalTime += seconds;
            if (t.children) updateTasksRecursive(t.children);
          });
        };
        if (newDates[date]) updateTasksRecursive(newDates[date]);
      });
      localStorage.setItem('dates', JSON.stringify(newDates));
      setDates(newDates);
      saveTasks(newDates, false);
      const newLogs = { ...timerLogs };
      if (!newLogs[dateKey]) newLogs[dateKey] = [];
      newLogs[dateKey].push({
        taskName: existingTask.text,
        startTime: new Date(quickTimer).toISOString(),
        endTime: new Date().toISOString(),
        duration: seconds
      });
      setTimerLogs(newLogs);
      console.log('할일 생성 완료:', existingTask);
      
      if (togglToken) {
        try {
          const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: existingTask.text,
              start: new Date(quickTimer).toISOString(),
              duration: seconds,
              created_with: 'SimpleOne'
            })
          });
          if (!res.ok) {
            try {
              const text = await res.text();
              if (text.trim()) {
                try {
                  const errorData = JSON.parse(text);
                  console.error('Toggl 저장 실패:', errorData);
                } catch {
                  console.error('Toggl 저장 실패 (응답이 JSON이 아님):', text.substring(0, 100));
                }
              }
            } catch (err) {
              console.error('Toggl 저장 실패 (응답 읽기 실패):', err);
            }
          }
        } catch (err) {
          console.error('Toggl 저장 실패:', err);
        }
      }
      
      setTimeout(() => { skipFirebaseSave.current = false; }, 1000);
    } else if (numericTaskId) {
      console.log('numericTaskId 있음, 기존 할일에 시간 추가:', numericTaskId);
      skipFirebaseSave.current = true;
      const newDates = { ...dates };
      const task = newDates[dateKey]?.find(t => t.id === numericTaskId);
      if (task) {
        task.todayTime += seconds;
        task.completed = true;
        task.completedAt = new Date().toISOString();
        const taskName = task.text;
        Object.keys(newDates).forEach(date => {
          const updateTasksRecursive = (tasks) => {
            tasks.forEach(t => {
              if (t.text === taskName) t.totalTime += seconds;
              if (t.children) updateTasksRecursive(t.children);
            });
          };
          if (newDates[date]) updateTasksRecursive(newDates[date]);
        });
        localStorage.setItem('dates', JSON.stringify(newDates));
        setDates(newDates);
        saveTasks(newDates, false);
        const newLogs = { ...timerLogs };
        if (!newLogs[dateKey]) newLogs[dateKey] = [];
        newLogs[dateKey].push({
          taskName: task.text || '(제목 없음)',
          startTime: new Date(quickTimer).toISOString(),
          endTime: new Date().toISOString(),
          duration: seconds
        });
        setTimerLogs(newLogs);
        
        if (togglToken) {
          try {
            const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({
                description: task.text || '(제목 없음)',
                start: new Date(quickTimer).toISOString(),
                duration: seconds,
                created_with: 'SimpleOne'
              })
            });
            if (!res.ok) {
              try {
                const text = await res.text();
                if (text.trim()) {
                  try {
                    const errorData = JSON.parse(text);
                    console.error('Toggl 저장 실패:', errorData);
                  } catch {
                    console.error('Toggl 저장 실패 (응답이 JSON이 아님):', text.substring(0, 100));
                  }
                }
              } catch (err) {
                console.error('Toggl 저장 실패 (응답 읽기 실패):', err);
              }
            }
          } catch (err) {
            console.error('Toggl 저장 실패:', err);
          }
        }
      }
      setTimeout(() => { skipFirebaseSave.current = false; }, 1000);
    } else {
      console.log('텍스트도 taskId도 없음, 팝업 표시');
      setQuickTimerPopup({ seconds, startTime: quickTimer });
      setQuickTimerPopupText('');
      setQuickTimer(null);
      setQuickTimerSeconds(0);
      setQuickTimerTaskId(null);
      setQuickTimerText('');
      if (user && useFirebase) {
        const docRef = doc(db, 'users', user.id);
        setDoc(docRef, { quickTimer: null }, { merge: true });
      }
      return;
    }
    
    setQuickTimer(null);
    setQuickTimerSeconds(0);
    setQuickTimerTaskId(null);
    setQuickTimerText('');
    if (user && useFirebase) {
      const docRef = doc(db, 'users', user.id);
      setDoc(docRef, { quickTimer: null }, { merge: true });
    }
  };

  const assignQuickTime = (taskId) => {
    if (!quickTimerPopup) return;
    const seconds = quickTimerPopup.seconds;
    const newDates = { ...dates };
    const task = newDates[dateKey].find(t => t.id === taskId);
    if (task) {
      task.todayTime += seconds;
      task.completed = true;
      task.completedAt = new Date().toISOString();
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
        startTime: new Date(quickTimerPopup.startTime).toISOString(),
        endTime: new Date(quickTimerPopup.startTime + seconds * 1000).toISOString(),
        duration: seconds
      });
      setTimerLogs(newLogs);
    }
    setQuickTimerPopup(false);
  };

  const saveAsUnassigned = async () => {
    if (!quickTimerPopup) return;
    
    if (quickTimerPopupText.trim()) {
      const text = quickTimerPopupText.trim();
      const newDates = { ...dates };
      if (!newDates[dateKey]) newDates[dateKey] = [];
      let existingTask = newDates[dateKey].find(t => t.text === text && (t.spaceId || 'default') === selectedSpaceId);
      if (!existingTask) {
        existingTask = {
          id: Date.now(),
          text,
          todayTime: 0,
          totalTime: 0,
          todayGoal: 0,
          totalGoal: 0,
          completed: false,
          indentLevel: 0,
          spaceId: selectedSpaceId || 'default'
        };
        newDates[dateKey].push(existingTask);
      }
      existingTask.todayTime += quickTimerPopup.seconds;
      existingTask.completed = true;
      existingTask.completedAt = new Date().toISOString();
      const taskName = existingTask.text;
      Object.keys(newDates).forEach(date => {
        const updateTasksRecursive = (tasks) => {
          tasks.forEach(t => {
            if (t.text === taskName) t.totalTime += quickTimerPopup.seconds;
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
        taskName: existingTask.text,
        startTime: new Date(quickTimerPopup.startTime).toISOString(),
        endTime: new Date(quickTimerPopup.startTime + quickTimerPopup.seconds * 1000).toISOString(),
        duration: quickTimerPopup.seconds
      });
      setTimerLogs(newLogs);
      
      if (togglToken) {
        try {
          const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: existingTask.text,
              start: new Date(quickTimerPopup.startTime).toISOString(),
              duration: quickTimerPopup.seconds,
              created_with: 'SimpleOne'
            })
          });
          if (!res.ok) {
            try {
              const text = await res.text();
              if (text.trim()) {
                try {
                  const errorData = JSON.parse(text);
                  console.error('Toggl 저장 실패:', errorData);
                } catch {
                  console.error('Toggl 저장 실패 (응답이 JSON이 아님):', text.substring(0, 100));
                }
              }
            } catch (err) {
              console.error('Toggl 저장 실패 (응답 읽기 실패):', err);
            }
          }
        } catch (err) {
          console.error('Toggl 저장 실패:', err);
        }
      }
      
      setQuickTimerPopup(false);
      setQuickTimerPopupText('');
    } else {
      const newUnassigned = [...unassignedTimes, {
        dateKey,
        seconds: quickTimerPopup.seconds,
        startTime: quickTimerPopup.startTime,
        timestamp: Date.now(),
        text: ''
      }];
      setUnassignedTimes(newUnassigned);
      setQuickTimerPopup(false);
      setQuickTimerPopupText('');
    }
  };

  const assignUnassignedTime = async (index, taskId) => {
    const unassigned = unassignedTimes[index];
    const newDates = { ...dates };
    const task = newDates[unassigned.dateKey].find(t => t.id === taskId);
    if (task) {
      task.todayTime += unassigned.seconds;
      task.completed = true;
      task.completedAt = new Date().toISOString();
      const taskName = task.text;
      Object.keys(newDates).forEach(date => {
        const updateTasksRecursive = (tasks) => {
          tasks.forEach(t => {
            if (t.text === taskName) {
              t.totalTime += unassigned.seconds;
            }
            if (t.children) updateTasksRecursive(t.children);
          });
        };
        if (newDates[date]) updateTasksRecursive(newDates[date]);
      });
      setDates(newDates);
      saveTasks(newDates);
      const newLogs = { ...timerLogs };
      if (!newLogs[unassigned.dateKey]) newLogs[unassigned.dateKey] = [];
      newLogs[unassigned.dateKey].push({
        taskName: task.text || '(제목 없음)',
        startTime: new Date(unassigned.startTime).toISOString(),
        endTime: new Date(unassigned.startTime + unassigned.seconds * 1000).toISOString(),
        duration: unassigned.seconds
      });
      setTimerLogs(newLogs);
      
      if (togglToken) {
        try {
          const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description: task.text || '(제목 없음)',
              start: new Date(unassigned.startTime).toISOString(),
              duration: unassigned.seconds,
              created_with: 'SimpleOne'
            })
          });
          if (!res.ok) {
            try {
              const text = await res.text();
              if (text.trim()) {
                try {
                  const errorData = JSON.parse(text);
                  console.error('Toggl 저장 실패:', errorData);
                } catch {
                  console.error('Toggl 저장 실패 (응답이 JSON이 아님):', text.substring(0, 100));
                }
              }
            } catch (err) {
              console.error('Toggl 저장 실패 (응답 읽기 실패):', err);
            }
          }
        } catch (err) {
          console.error('Toggl 저장 실패:', err);
        }
      }
    }
    const newUnassigned = [...unassignedTimes];
    newUnassigned.splice(index, 1);
    setUnassignedTimes(newUnassigned);
  };

  const getTodayCompletedTasks = () => {
    const allLogs = timerLogs[dateKey] || [];
    const logs = allLogs.filter(log => {
      const task = (dates[dateKey] || []).find(t => t.text === log.taskName);
      return !task || (task.spaceId || 'default') === selectedSpaceId;
    });
    const completedItems = [];
    
    logs.forEach(log => {
      const startTime = new Date(log.startTime);
      const endTime = new Date(log.endTime);
      completedItems.push({
        text: log.taskName,
        completedTime: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}-${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
        sortTime: endTime.getTime(),
        id: `log-${log.startTime}`,
        startTime: log.startTime,
        endTime: log.endTime,
        isLog: true
      });
    });
    
    const tasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId && t.completed);
    tasks.forEach(t => {
      if (t.completedAt) {
        const time = new Date(t.completedAt);
        const timeDate = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
        if (timeDate === dateKey && !logs.find(log => log.taskName === t.text)) {
          const startTime = new Date(time.getTime() - (t.todayTime || 0) * 1000);
          completedItems.push({
            text: t.text,
            completedTime: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
            sortTime: time.getTime(),
            id: `task-${t.id}`,
            startTime: startTime.getTime(),
            endTime: time.getTime(),
            isLog: false,
            taskId: t.id
          });
        }
      }
    });
    
    return completedItems.sort((a, b) => a.sortTime - b.sortTime);
  };

  const dateKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}-${String(currentDate.getDate()).padStart(2, '0')}`;

  const handleFirebaseLogin = async () => {
    try {
      const result = await signInWithPopup(auth, googleProvider);
      setUser({ id: result.user.uid, email: result.user.email });
      setUseFirebase(true);
      
      const docRef = doc(db, 'users', result.user.uid);
      const docSnap = await getDoc(docRef);
      if (docSnap.exists()) {
        const data = docSnap.data();
        const workspaces = data.workspaces || {};
        const defaultWorkspace = workspaces.default || {};
        
        if (defaultWorkspace.dates) {
          const updatedDates = {};
          Object.keys(defaultWorkspace.dates).forEach(dateKey => {
            updatedDates[dateKey] = defaultWorkspace.dates[dateKey].map(task => ({
              ...task,
              spaceId: task.spaceId || 'default'
            }));
          });
          setDates(updatedDates);
        }
        if (data.spaces) {
          setSpaces(data.spaces);
        }
        if (data.togglToken) setTogglToken(data.togglToken);
      }
      
      onSnapshot(docRef, (doc) => {
        if (doc.exists()) {
          const data = doc.data();
          const workspaces = data.workspaces || {};
          const defaultWorkspace = workspaces.default || {};
          
          skipFirebaseSave.current = true;
          if (defaultWorkspace.dates) {
            const updatedDates = {};
            Object.keys(defaultWorkspace.dates).forEach(dateKey => {
              updatedDates[dateKey] = defaultWorkspace.dates[dateKey].map(task => ({
                ...task,
                spaceId: task.spaceId || 'default'
              }));
            });
            setDates(updatedDates);
          }
          if (data.spaces) {
            setSpaces(data.spaces);
          }
          if (data.togglToken) setTogglToken(data.togglToken);
          setTimeout(() => { skipFirebaseSave.current = false; }, 100);
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
      await setDoc(docRef, { 
        workspaces: { default: { dates } },
        spaces, 
        togglToken
      }, { merge: true });
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
      if (docSnap.exists()) {
        const data = docSnap.data();
        const backupHistory = data.backupHistory || [];
        
        if (backupHistory.length > 0) {
          setSettingsPopup(false);
          setBackupHistoryPopup(backupHistory);
          setIsSyncing(false);
        } else {
          const workspaces = data.workspaces || {};
          const defaultWorkspace = workspaces.default || {};
          
          if (defaultWorkspace.dates) {
            const updatedDates = {};
            Object.keys(defaultWorkspace.dates).forEach(dateKey => {
              updatedDates[dateKey] = defaultWorkspace.dates[dateKey].map(task => ({
                ...task,
                spaceId: task.spaceId || 'default'
              }));
            });
            setDates(updatedDates);
          }
          if (data.spaces) setSpaces(data.spaces);
          if (data.togglToken) setTogglToken(data.togglToken);
          setIsSyncing(false);
          alert('✅ 다운로드 완료!');
        }
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

  const restoreBackup = (backup) => {
    if (backup.dates) {
      const updatedDates = {};
      Object.keys(backup.dates).forEach(dateKey => {
        updatedDates[dateKey] = backup.dates[dateKey].map(task => ({
          ...task,
          spaceId: task.spaceId || 'default'
        }));
      });
      setDates(updatedDates);
    }
    if (backup.spaces) setSpaces(backup.spaces);
    if (backup.togglToken) setTogglToken(backup.togglToken);
    setBackupHistoryPopup(null);
    alert('✅ 복원 완료!');
  };

  if (spaceSelectPopup) {
    return (
      <div className="App">
        <div className="popup-overlay">
          <div className="popup" style={{ maxWidth: '400px' }}>
            <h3>📁 공간 선택</h3>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {spaces.map(space => (
                <div 
                  key={space.id} 
                  style={{ 
                    padding: '12px', 
                    marginBottom: '8px', 
                    background: 'rgba(255,255,255,0.05)', 
                    borderRadius: '8px', 
                    cursor: 'pointer',
                    border: '1px solid rgba(255,255,255,0.1)'
                  }}
                  onClick={() => {
                    const localPassword = localPasswords[space.id];
                    if (localPassword) {
                      setSpaceSelectPopup(false);
                      setPasswordPopup({
                        spaceName: space.name,
                        spacePassword: localPassword,
                        spaceId: space.id,
                        onSuccess: () => setSelectedSpaceId(space.id),
                        onFail: () => setSelectedSpaceId('default')
                      });
                    } else {
                      setSelectedSpaceId(space.id);
                      setSpaceSelectPopup(false);
                    }
                  }}
                >
                  <div style={{ fontSize: '16px', fontWeight: 'bold' }}>{space.name} {localPasswords[space.id] && '🔒'}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (passwordPopup) {
    return (
      <div className="App">
        <div className="popup-overlay">
          <div className="popup" style={{ maxWidth: '300px' }}>
            <h3>🔒 비밀번호</h3>
            <select
              value={passwordPopup.spaceId}
              onChange={(e) => {
                const space = spaces.find(s => s.id === e.target.value);
                const localPassword = localPasswords[e.target.value];
                if (space) {
                  if (localPassword) {
                    setPasswordPopup({
                      spaceName: space.name,
                      spacePassword: localPassword,
                      spaceId: space.id,
                      onSuccess: passwordPopup.onSuccess,
                      onFail: passwordPopup.onFail
                    });
                  } else {
                    setPasswordPopup(null);
                    setSelectedSpaceId(space.id);
                  }
                }
              }}
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'inherit',
                boxSizing: 'border-box'
              }}
            >
              {spaces.map(space => (
                <option key={space.id} value={space.id}>{space.name}{localPasswords[space.id] && ' 🔒'}</option>
              ))}
            </select>
            <input
              type="password"
              placeholder="비밀번호 입력"
              autoFocus
              style={{
                width: '100%',
                padding: '8px',
                marginBottom: '10px',
                fontSize: '14px',
                borderRadius: '4px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'inherit',
                boxSizing: 'border-box'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  if (e.target.value === passwordPopup.spacePassword) {
                    setPasswordPopup(null);
                    setSelectedSpaceId(passwordPopup.spaceId);
                  } else {
                    alert('비밀번호가 틀렸습니다.');
                    e.target.value = '';
                  }
                }
              }}
            />
            <div className="popup-buttons">
              <button onClick={(e) => {
                const input = e.target.parentElement.parentElement.querySelector('input[type="password"]');
                if (input.value === passwordPopup.spacePassword) {
                  setPasswordPopup(null);
                  setSelectedSpaceId(passwordPopup.spaceId);
                } else {
                  alert('비밀번호가 틀렸습니다.');
                  input.value = '';
                }
              }}>확인</button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="App">
      {subTasksPopup && (
        <div className="popup-overlay" onClick={() => setSubTasksPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px', userSelect: 'text' }}>
            <h3>📋 {dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text || '할일'} - 하위할일</h3>
            <button onClick={() => setSubTasksPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {(() => {
                const allSubTasks = getSubTasks(dates, subTasksPopup.dateKey, subTasksPopup.taskId);
                const groupedByDate = {};
                allSubTasks.forEach(subTask => {
                  const dateKey = subTask.dateKey;
                  if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                  }
                  groupedByDate[dateKey].push(subTask);
                });
                return Object.keys(groupedByDate).sort().map(dateKey => (
                  <div key={dateKey} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>{dateKey}</div>
                    {groupedByDate[dateKey].map(subTask => {
                      const task = dates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                      const subTaskIdx = task?.subTasks?.findIndex(st => st.id === subTask.id);
                      return (
                <div key={subTask.id} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '4px 8px', marginBottom: '2px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                  <input
                    type="checkbox"
                    checked={subTask.completed}
                            onChange={(e) => {
                              const newDates = { ...dates };
                              const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                              if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                taskToUpdate.subTasks[subTaskIdx].completed = e.target.checked;
                                setDates(newDates);
                                saveTasks(newDates);
                              }
                            }}
                  />
                  <input
                    type="text"
                    value={subTask.text}
                            onChange={(e) => {
                              const newDates = { ...dates };
                              const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                              if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                taskToUpdate.subTasks[subTaskIdx].text = e.target.value;
                                setDates(newDates);
                                saveTasks(newDates);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                e.preventDefault();
                                addSubTask(subTasksPopup.dateKey, subTasksPopup.taskId);
                              } else if (e.key === 'Backspace' && e.target.value === '') {
                                const newDates = { ...dates };
                                const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                                if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                  taskToUpdate.subTasks.splice(subTaskIdx, 1);
                                  setDates(newDates);
                                  saveTasks(newDates);
                                }
                              }
                            }}
                    style={{ flex: 1, background: 'transparent', border: 'none', color: subTask.completed ? '#4CAF50' : 'inherit', fontSize: '14px', outline: 'none' }}
                  />
                          <button
                            onClick={() => {
                              const newDates = { ...dates };
                              const taskToUpdate = newDates[dateKey]?.find(t => t.text === dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.text && (t.spaceId || 'default') === (dates[subTasksPopup.dateKey]?.find(t => t.id === subTasksPopup.taskId)?.spaceId || 'default'));
                              if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                taskToUpdate.subTasks.splice(subTaskIdx, 1);
                                setDates(newDates);
                                saveTasks(newDates);
                              }
                            }}
                            style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '14px', padding: '4px' }}
                          >
                            ✕
                          </button>
                </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
            <div className="popup-buttons">
              <button onClick={() => { addSubTask(subTasksPopup.dateKey, subTasksPopup.taskId); }}>+ 하위할일 추가</button>
              <button onClick={() => setSubTasksPopup(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {obstaclePopup && (
        <div className="popup-overlay" onClick={() => setObstaclePopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>🚧 {obstaclePopup.taskName} - 방해요소 ({(() => {
              let allObstacles = [];
              const sourceTask = dates[obstaclePopup.dateKey]?.find(t => t.id === obstaclePopup.taskId);
              Object.keys(dates).forEach(key => {
                const sameTask = dates[key]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                if (sameTask && sameTask.obstacles) {
                  allObstacles = allObstacles.concat(sameTask.obstacles.map(obs => ({ ...obs, dateKey: key })));
                }
              });
              return allObstacles.length;
            })()}개)</h3>
            <button onClick={() => setObstaclePopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {(() => {
                const sourceTask = dates[obstaclePopup.dateKey]?.find(t => t.id === obstaclePopup.taskId);
                const allObstacles = [];
                Object.keys(dates).forEach(key => {
                  const sameTask = dates[key]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                  if (sameTask && sameTask.obstacles) {
                    sameTask.obstacles.forEach(obs => {
                      allObstacles.push({ ...obs, dateKey: key });
                    });
                  }
                });
                
                const groupedByDate = {};
                allObstacles.forEach(obstacle => {
                  const dateKey = obstacle.dateKey;
                  if (!groupedByDate[dateKey]) {
                    groupedByDate[dateKey] = [];
                  }
                  groupedByDate[dateKey].push(obstacle);
                });
                
                return Object.keys(groupedByDate).sort().map(dateKey => (
                  <div key={dateKey} style={{ marginBottom: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#888', marginBottom: '8px', fontWeight: 'bold' }}>{dateKey}</div>
                    {groupedByDate[dateKey].map((obstacle, idx) => {
                      const task = dates[dateKey]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                      const obstacleIdx = task?.obstacles?.findIndex(obs => obs.timestamp === obstacle.timestamp);
                      return (
                  <div key={obstacle.timestamp} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px', marginBottom: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px' }}>
                    <input
                      type="text"
                      value={obstacle.text}
                      onChange={(e) => {
                        const newDates = { ...dates };
                              const taskToUpdate = newDates[dateKey]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                              if (taskToUpdate && taskToUpdate.obstacles && obstacleIdx !== -1) {
                                taskToUpdate.obstacles[obstacleIdx].text = e.target.value;
                          setDates(newDates);
                          saveTasks(newDates);
                        }
                      }}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          const newDates = { ...dates };
                          const taskToUpdate = newDates[obstaclePopup.dateKey].find(t => t.id === obstaclePopup.taskId);
                          if (taskToUpdate) {
                            if (!taskToUpdate.obstacles) taskToUpdate.obstacles = [];
                            taskToUpdate.obstacles.push({ text: '', timestamp: Date.now() });
                            setDates(newDates);
                            saveTasks(newDates);
                          }
                        }
                      }}
                      style={{ flex: 1, background: 'transparent', border: 'none', color: 'inherit', fontSize: '14px', outline: 'none' }}
                    />
                    <button
                      onClick={() => {
                        const newDates = { ...dates };
                              const taskToUpdate = newDates[dateKey]?.find(t => t.text === obstaclePopup.taskName && (t.spaceId || 'default') === (sourceTask?.spaceId || 'default'));
                              if (taskToUpdate && taskToUpdate.obstacles && obstacleIdx !== -1) {
                                taskToUpdate.obstacles.splice(obstacleIdx, 1);
                          setDates(newDates);
                          saveTasks(newDates);
                        }
                      }}
                      style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '16px' }}
                    >
                      ✕
                    </button>
                        </div>
                      );
                    })}
                  </div>
                ));
              })()}
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                const newDates = { ...dates };
                const taskToUpdate = newDates[obstaclePopup.dateKey].find(t => t.id === obstaclePopup.taskId);
                if (taskToUpdate) {
                  if (!taskToUpdate.obstacles) taskToUpdate.obstacles = [];
                  taskToUpdate.obstacles.push({ text: '', timestamp: Date.now() });
                  setDates(newDates);
                  saveTasks(newDates);
                }
              }}>+ 방해요소 추가</button>
              <button onClick={() => setObstaclePopup(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {timeEditPopup && (
        <div className="popup-overlay" onClick={() => setTimeEditPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>⏰ 시간 수정</h3>
            <button onClick={() => setTimeEditPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>시작 시간</label>
              <input
                type="time"
                defaultValue={(() => {
                  const start = new Date(timeEditPopup.startTime);
                  return `${String(start.getHours()).padStart(2, '0')}:${String(start.getMinutes()).padStart(2, '0')}`;
                })()}
                id="start-time-input"
                style={{ width: '100%', padding: '12px', fontSize: '18px', fontFamily: 'inherit', fontWeight: '500', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }}
                className="popup-input"
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px' }}>종료 시간</label>
              <input
                type="time"
                defaultValue={(() => {
                  const end = new Date(timeEditPopup.endTime);
                  return `${String(end.getHours()).padStart(2, '0')}:${String(end.getMinutes()).padStart(2, '0')}`;
                })()}
                id="end-time-input"
                style={{ width: '100%', padding: '12px', fontSize: '18px', fontFamily: 'inherit', fontWeight: '500', borderRadius: '8px', border: 'none', boxSizing: 'border-box' }}
                className="popup-input"
              />
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                const startInput = document.getElementById('start-time-input');
                const endInput = document.getElementById('end-time-input');
                const [startHour, startMin] = startInput.value.split(':').map(Number);
                const [endHour, endMin] = endInput.value.split(':').map(Number);
                
                const today = new Date();
                const startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
                const endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);
                
                if (timeEditPopup.isLog) {
                  // timerLogs 수정
                  const logStartTime = timeEditPopup.itemId.replace('log-', '');
                  const newLogs = { ...timerLogs };
                  const logIndex = newLogs[dateKey].findIndex(log => log.startTime === logStartTime);
                  if (logIndex !== -1) {
                    const oldDuration = newLogs[dateKey][logIndex].duration;
                    const newDuration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
                    newLogs[dateKey][logIndex].startTime = startDate.getTime();
                    newLogs[dateKey][logIndex].endTime = endDate.getTime();
                    newLogs[dateKey][logIndex].duration = newDuration;
                    setTimerLogs(newLogs);
                    
                    // 해당 task의 todayTime도 업데이트
                    const taskName = newLogs[dateKey][logIndex].taskName;
                    const newDates = { ...dates };
                    const task = newDates[dateKey]?.find(t => t.text === taskName);
                    if (task) {
                      task.todayTime = task.todayTime - oldDuration + newDuration;
                      setDates(newDates);
                      saveTasks(newDates);
                    }
                  }
                } else {
                  // task의 completedAt과 todayTime 수정
                  const taskId = timeEditPopup.taskId;
                  const newDates = { ...dates };
                  const task = newDates[dateKey].find(t => t.id === taskId);
                  if (task) {
                    task.completedAt = endDate.getTime();
                    const duration = Math.floor((endDate.getTime() - startDate.getTime()) / 1000);
                    task.todayTime = duration;
                    setDates(newDates);
                    saveTasks(newDates);
                  }
                }
                setTimeEditPopup(null);
              }}>저장</button>
              <button onClick={() => setTimeEditPopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {quickStartPopup && (
        <div className="popup-overlay" onClick={() => setQuickStartPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>⏱️ 작업 선택</h3>
            <button onClick={() => setQuickStartPopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {(() => {
                const filteredTasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId);
                if (filteredTasks.length === 0) {
                  return <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>작업이 없습니다.</p>;
                }
                return filteredTasks.map(task => {
                  const isSelected = quickTimerTaskId === task.id;
                  return (
                    <div 
                      key={task.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '8px', 
                        marginBottom: '4px', 
                        background: isSelected ? 'rgba(76,175,80,0.2)' : 'rgba(255,255,255,0.03)', 
                        borderRadius: '4px', 
                        fontSize: '14px',
                        cursor: 'pointer'
                      }}
                      onClick={(e) => {
                        e.stopPropagation();
                        setQuickTimerTaskId(Number(task.id));
                        setQuickTimerText(task.text);
                        setQuickStartPopup(false);
                        startQuickTimer(task.id);
                      }}
                    >
                      <span style={{ flex: 1, textAlign: 'left' }}>{task.text || '(제목 없음)'}</span>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="popup-buttons">
              <button onClick={() => setQuickStartPopup(false)}>닫기</button>
            </div>
          </div>
        </div>
      )}

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
                setLogEditPopup(null);
              }}>확인</button>
              <button onClick={() => {
                const newLogs = { ...timerLogs };
                newLogs[logEditPopup.dateKey].splice(logEditPopup.logIndex, 1);
                setTimerLogs(newLogs);
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
            {timePopup.type === 'today' && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>시작 시간</label>
                <div style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
                  <input
                    type="time"
                    value={timePopup.startTime || ''}
                    onChange={(e) => setTimePopup({ ...timePopup, startTime: e.target.value })}
                    style={{ flex: 1, padding: '8px', fontSize: '16px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'inherit' }}
                  />
                  {timePopup.startTime && (
                    <button
                      onClick={() => setTimePopup({ ...timePopup, startTime: '' })}
                      style={{ padding: '8px 12px', fontSize: '14px', borderRadius: '4px', border: '1px solid rgba(255,255,255,0.2)', background: 'rgba(255,255,255,0.05)', color: 'inherit', cursor: 'pointer' }}
                    >
                      ✕
                    </button>
                  )}
                </div>
              </div>
            )}
            <div className="popup-inputs" style={{ display: 'flex', gap: '5px', alignItems: 'center' }}>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', marginBottom: '4px' }}>시</label>
                <input
                  type="number"
                  min="0"
                  placeholder="00"
                  value={String(Math.floor(timePopup.time / 3600)).padStart(2, '0')}
                  onChange={(e) => {
                    const h = parseInt(e.target.value) || 0;
                    const m = Math.floor((timePopup.time % 3600) / 60);
                    const s = timePopup.time % 60;
                    setTimePopup({ ...timePopup, time: h * 3600 + m * 60 + s });
                  }}
                  onClick={(e) => e.target.select()}
                  style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
                />
              </div>
              <span style={{ fontSize: '24px', marginTop: '20px' }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', marginBottom: '4px' }}>분</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="00"
                  value={String(Math.floor((timePopup.time % 3600) / 60)).padStart(2, '0')}
                  onChange={(e) => {
                    const val = e.target.value;
                    const h = Math.floor(timePopup.time / 3600);
                    const m = Math.min(parseInt(val) || 0, 59);
                    const s = timePopup.time % 60;
                    setTimePopup({ ...timePopup, time: h * 3600 + m * 60 + s });
                  }}
                  onClick={(e) => e.target.select()}
                  style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
                />
              </div>
              <span style={{ fontSize: '24px', marginTop: '20px' }}>:</span>
              <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                <label style={{ fontSize: '12px', marginBottom: '4px' }}>초</label>
                <input
                  type="number"
                  min="0"
                  max="59"
                  placeholder="00"
                  value={String(timePopup.time % 60).padStart(2, '0')}
                  onChange={(e) => {
                    const val = e.target.value;
                    const h = Math.floor(timePopup.time / 3600);
                    const m = Math.floor((timePopup.time % 3600) / 60);
                    const s = Math.min(parseInt(val) || 0, 59);
                    setTimePopup({ ...timePopup, time: h * 3600 + m * 60 + s });
                  }}
                  onClick={(e) => e.target.select()}
                  style={{ width: '60px', fontSize: '24px', textAlign: 'center' }}
                />
              </div>
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                const field = timePopup.type === 'today' ? 'todayTime' : 'totalTime';
                updateTask(timePopup.dateKey, timePopup.path, field, timePopup.time);
                if (timePopup.type === 'today') {
                  if (timePopup.startTime) {
                    updateTask(timePopup.dateKey, timePopup.path, 'startTime', timePopup.startTime);
                  } else {
                    const newDates = { ...dates };
                    const task = newDates[timePopup.dateKey].find(t => t.id === timePopup.path[0]);
                    if (task) {
                      delete task.startTime;
                      setDates(newDates);
                    }
                  }
                }
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
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>오늘 목표</label>
              <div className="popup-inputs" style={{ display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                <input type="number" min="0" placeholder="00" value={String(Math.floor(goalPopup.todayGoal / 3600)).padStart(2, '0')} onChange={(e) => { const h = parseInt(e.target.value) || 0; const m = Math.floor((goalPopup.todayGoal % 3600) / 60); const s = goalPopup.todayGoal % 60; setGoalPopup({ ...goalPopup, todayGoal: h * 3600 + m * 60 + s }); }} onClick={(e) => e.target.select()} style={{ width: '50px', fontSize: '20px', textAlign: 'center' }} />
                <span style={{ fontSize: '20px' }}>:</span>
                <input type="number" min="0" max="59" placeholder="00" value={String(Math.floor((goalPopup.todayGoal % 3600) / 60)).padStart(2, '0')} onChange={(e) => { const h = Math.floor(goalPopup.todayGoal / 3600); const m = Math.min(parseInt(e.target.value) || 0, 59); const s = goalPopup.todayGoal % 60; setGoalPopup({ ...goalPopup, todayGoal: h * 3600 + m * 60 + s }); }} onClick={(e) => e.target.select()} style={{ width: '50px', fontSize: '20px', textAlign: 'center' }} />
                <span style={{ fontSize: '20px' }}>:</span>
                <input type="number" min="0" max="59" placeholder="00" value={String(goalPopup.todayGoal % 60).padStart(2, '0')} onChange={(e) => { const h = Math.floor(goalPopup.todayGoal / 3600); const m = Math.floor((goalPopup.todayGoal % 3600) / 60); const s = Math.min(parseInt(e.target.value) || 0, 59); setGoalPopup({ ...goalPopup, todayGoal: h * 3600 + m * 60 + s }); }} onClick={(e) => e.target.select()} style={{ width: '50px', fontSize: '20px', textAlign: 'center' }} />
              </div>
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ fontSize: '12px', marginBottom: '4px', display: 'block' }}>총 목표</label>
              <div className="popup-inputs" style={{ display: 'flex', gap: '5px', alignItems: 'center', justifyContent: 'center' }}>
                <input type="number" min="0" placeholder="00" value={String(Math.floor(goalPopup.totalGoal / 3600)).padStart(2, '0')} onChange={(e) => { const h = parseInt(e.target.value) || 0; const m = Math.floor((goalPopup.totalGoal % 3600) / 60); const s = goalPopup.totalGoal % 60; setGoalPopup({ ...goalPopup, totalGoal: h * 3600 + m * 60 + s }); }} onClick={(e) => e.target.select()} style={{ width: '50px', fontSize: '20px', textAlign: 'center' }} />
                <span style={{ fontSize: '20px' }}>:</span>
                <input type="number" min="0" max="59" placeholder="00" value={String(Math.floor((goalPopup.totalGoal % 3600) / 60)).padStart(2, '0')} onChange={(e) => { const h = Math.floor(goalPopup.totalGoal / 3600); const m = Math.min(parseInt(e.target.value) || 0, 59); const s = goalPopup.totalGoal % 60; setGoalPopup({ ...goalPopup, totalGoal: h * 3600 + m * 60 + s }); }} onClick={(e) => e.target.select()} style={{ width: '50px', fontSize: '20px', textAlign: 'center' }} />
                <span style={{ fontSize: '20px' }}>:</span>
                <input type="number" min="0" max="59" placeholder="00" value={String(goalPopup.totalGoal % 60).padStart(2, '0')} onChange={(e) => { const h = Math.floor(goalPopup.totalGoal / 3600); const m = Math.floor((goalPopup.totalGoal % 3600) / 60); const s = Math.min(parseInt(e.target.value) || 0, 59); setGoalPopup({ ...goalPopup, totalGoal: h * 3600 + m * 60 + s }); }} onClick={(e) => e.target.select()} style={{ width: '50px', fontSize: '20px', textAlign: 'center' }} />
              </div>
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                updateTask(goalPopup.dateKey, goalPopup.path, 'todayGoal', goalPopup.todayGoal);
                updateTask(goalPopup.dateKey, goalPopup.path, 'totalGoal', goalPopup.totalGoal);
                setGoalPopup(null);
              }}>확인</button>
              <button onClick={() => setGoalPopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {taskHistoryPopup && (
        <div className="popup-overlay" onClick={() => setTaskHistoryPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '600px', width: '90vw' }}>
            <h3>📊 {taskHistoryPopup.taskName} 기록</h3>
            <button onClick={() => setTaskHistoryPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            
            {/* 90일 히트맵 */}
            <div style={{ marginBottom: '20px' }}>
              <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>90일 히트맵</h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(15, 1fr)', gap: '2px' }}>
                {Array.from({ length: 90 }, (_, i) => {
                  const date = new Date();
                  date.setDate(date.getDate() - (89 - i));
                  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const dayTasks = dates[key] || [];
                  const taskIdx = dayTasks.findIndex(t => t.text === taskHistoryPopup.taskName);
                  const task = dayTasks[taskIdx];
                  const hasTask = !!task;
                  const isCompleted = task?.completed;
                  
                  const subTasks = task?.subTasks || [];
                  const completedSub = subTasks.filter(t => t.completed).length;
                  const totalSub = subTasks.length;
                  
                  return (
                    <div 
                      key={i} 
                      style={{ 
                        width: '100%', 
                        paddingBottom: '100%', 
                        background: isCompleted ? '#4CAF50' : hasTask ? '#FFA726' : '#333',
                        borderRadius: '2px',
                        position: 'relative',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center'
                      }}
                      title={`${key}: ${isCompleted ? '완료' : hasTask ? '진행중' : '없음'}${totalSub > 0 ? ` (하위: ${completedSub}/${totalSub})` : ''}`}
                    >
                      {totalSub > 0 && (
                        <span style={{ position: 'absolute', fontSize: '10px', color: 'white', fontWeight: 'bold', top: '50%', left: '50%', transform: 'translate(-50%, -50%)' }}>
                          {completedSub}/{totalSub}
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>
              <div style={{ display: 'flex', gap: '10px', marginTop: '10px', fontSize: '12px', justifyContent: 'center' }}>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#4CAF50', borderRadius: '2px', marginRight: '4px' }}></span>완료</span>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#FFA726', borderRadius: '2px', marginRight: '4px' }}></span>진행중</span>
                <span><span style={{ display: 'inline-block', width: '12px', height: '12px', background: '#333', borderRadius: '2px', marginRight: '4px' }}></span>없음</span>
              </div>
            </div>
            
            {/* 날짜별 기록 */}
            <div>
              <h4 style={{ fontSize: '14px', marginBottom: '10px' }}>날짜별 기록</h4>
              <div style={{ maxHeight: '300px', overflowY: 'auto' }}>
                {(() => {
                  const records = [];
                  Object.keys(dates).sort().reverse().forEach(dateKey => {
                    const task = dates[dateKey].find(t => t.text === taskHistoryPopup.taskName);
                    if (task) {
                      records.push({ dateKey, task });
                    }
                  });
                  if (records.length === 0) {
                    return <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>기록이 없습니다.</p>;
                  }
                  return records.map(({ dateKey, task }) => {
                    const subTasks = task.subTasks || [];
                    return (
                      <div key={dateKey} style={{ padding: '8px', marginBottom: '4px', background: 'rgba(255,255,255,0.03)', borderRadius: '4px', fontSize: '13px' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                          <span style={{ fontWeight: 'bold' }}>{dateKey}</span>
                          {task.completed && <span style={{ color: '#4CAF50' }}>✓ 완료</span>}
                        </div>
                        <div style={{ marginTop: '4px', color: '#888', fontSize: '12px' }}>
                          오늘: {formatTime(task.todayTime)} | 총: {formatTime(task.totalTime)}
                          {task.todayGoal > 0 && ` | 목표: ${formatTime(task.todayGoal)}`}
                        </div>
                        {subTasks.length > 0 && (
                          <div style={{ marginTop: '6px', paddingLeft: '8px', borderLeft: '2px solid #444' }}>
                            <div style={{ fontSize: '11px', color: '#aaa', marginBottom: '4px' }}>하위할일 ({subTasks.filter(t => t.completed).length}/{subTasks.length})</div>
                            {subTasks.map((sub, idx) => {
                              const subTaskIdx = task.subTasks?.findIndex(st => st.id === sub.id);
                              return (
                              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginBottom: '2px' }}>
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                    onChange={(e) => {
                                      const newDates = { ...dates };
                                      const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                      if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                        taskToUpdate.subTasks[subTaskIdx].completed = e.target.checked;
                                        setDates(newDates);
                                        saveTasks(newDates);
                                      }
                                    }}
                                  style={{ width: '12px', height: '12px' }}
                                />
                                <input
                                  type="text"
                                  value={sub.text}
                                    onChange={(e) => {
                                      const newDates = { ...dates };
                                      const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                      if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                        taskToUpdate.subTasks[subTaskIdx].text = e.target.value;
                                      setDates(newDates);
                                      saveTasks(newDates);
                                      }
                                    }}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Backspace' && e.target.value === '') {
                                        const newDates = { ...dates };
                                        const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                        if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                          taskToUpdate.subTasks.splice(subTaskIdx, 1);
                                          setDates(newDates);
                                          saveTasks(newDates);
                                        }
                                      }
                                    }}
                                  style={{ flex: 1, background: 'transparent', border: 'none', color: sub.completed ? '#4CAF50' : '#888', fontSize: '11px', padding: '2px' }}
                                />
                            <button
                              onClick={() => {
                                const newDates = { ...dates };
                                      const taskToUpdate = newDates[dateKey]?.find(t => t.text === taskHistoryPopup.taskName);
                                      if (taskToUpdate && taskToUpdate.subTasks && subTaskIdx !== -1) {
                                        taskToUpdate.subTasks.splice(subTaskIdx, 1);
                                setDates(newDates);
                                saveTasks(newDates);
                                      }
                              }}
                                    style={{ background: 'none', border: 'none', color: '#dc3545', cursor: 'pointer', fontSize: '11px', padding: '2px' }}
                            >
                                    ✕
                            </button>
                                </div>
                              );
                            })}
                          </div>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
            
            <div className="popup-buttons" style={{ marginTop: '20px' }}>
              <button onClick={() => setTaskHistoryPopup(null)}>닫기</button>
            </div>
          </div>
        </div>
      )}

      {deleteConfirm && (
        <div className="popup-overlay" onClick={() => setDeleteConfirm(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ 삭제 확인</h3>
            <p>정말 삭제하시겠습니까?</p>
            <div className="popup-buttons">
              <button onClick={() => {
                deleteTask(deleteConfirm.dateKey, deleteConfirm.taskId);
                setDeleteConfirm(null);
              }}>삭제</button>
              <button onClick={() => setDeleteConfirm(null)}>취소</button>
            </div>
          </div>
        </div>
      )}





      {contextMenu && contextMenu.taskIndex !== undefined && (
        <>
          <div className="popup-overlay" onClick={(e) => { e.preventDefault(); e.stopPropagation(); setContextMenu(null); }} onContextMenu={(e) => e.preventDefault()} onMouseDown={(e) => e.preventDefault()} />
          <div 
            className="context-menu" 
            style={{ 
              position: 'fixed', 
              left: Math.min(contextMenu.x, window.innerWidth - 200), 
              top: Math.min(contextMenu.y, window.innerHeight - 400),
              zIndex: 10002
            }}
          >
            <div className="context-menu-item" onClick={() => {
              setEditingTaskId(contextMenu.taskId);
              setTimeout(() => {
                const textarea = document.querySelector(`textarea[data-task-id="${contextMenu.taskId}"]`);
                if (textarea) {
                  textarea.focus();
                  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }
              }, 0);
              setContextMenu(null);
            }}>
              ✏️ 편집
            </div>
            <div className="context-menu-item" onClick={() => {
              const task = dates[contextMenu.dateKey].find(t => t.id === contextMenu.taskId);
              if (task) {
                updateTask(contextMenu.dateKey, [contextMenu.taskId], 'completed', !task.completed);
              }
              setContextMenu(null);
            }}>
              {dates[contextMenu.dateKey]?.find(t => t.id === contextMenu.taskId)?.completed ? '❌ 완료 취소' : '✅ 완료'}
            </div>
            <div className="context-menu-item" onClick={() => {
              setSubTasksPopup({ dateKey: contextMenu.dateKey, taskId: contextMenu.taskId });
              setContextMenu(null);
            }}>
              📋 하위할일
            </div>
            <div className="context-menu-item" onClick={() => {
              const task = dates[contextMenu.dateKey].find(t => t.id === contextMenu.taskId);
              if (task) {
                setObstaclePopup({ dateKey: contextMenu.dateKey, taskId: contextMenu.taskId, taskName: task.text });
              }
              setContextMenu(null);
            }}>
              🚧 방해요소 {(() => {
                const task = dates[contextMenu.dateKey]?.find(t => t.id === contextMenu.taskId);
                const count = (task?.obstacles || []).length;
                return count > 0 ? `(${count})` : '';
              })()}
            </div>
            <div className="context-menu-item" onClick={() => {
              const task = dates[contextMenu.dateKey].find(t => t.id === contextMenu.taskId);
              if (task && task.text) {
                setTaskHistoryPopup({ taskName: task.text });
              }
              setContextMenu(null);
            }}>
              📊 모아보기
            </div>
            <div className="context-menu-item" onClick={() => { setDateChangePopup({ dateKey: contextMenu.dateKey, taskId: contextMenu.taskId }); setContextMenu(null); }}>
              📅 날짜 변경
            </div>
            <div className="context-menu-item" onClick={() => {
              if (window.confirm('삭제하시겠습니까?')) {
                deleteTask(contextMenu.dateKey, contextMenu.taskId);
              }
              setContextMenu(null);
            }} style={{ color: '#dc3545' }}>
              🗑️ 삭제
            </div>
          </div>
        </>
      )}

      {quickTimerPopup && (
        <div className="popup-overlay" onClick={() => setQuickTimerPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>⏱️ {formatTime(quickTimerPopup.seconds)} 기록</h3>
            <button onClick={() => setQuickTimerPopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ marginBottom: '15px' }}>
              <p style={{ fontSize: '14px', color: '#888', marginBottom: '10px', textAlign: 'left' }}>어떤 작업을 하셨나요?</p>
              <input
                type="text"
                value={quickTimerPopupText}
                onChange={(e) => setQuickTimerPopupText(e.target.value)}
                placeholder="작업 이름 입력"
                style={{
                  width: '100%',
                  padding: '8px',
                  marginBottom: '10px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'inherit',
                  boxSizing: 'border-box'
                }}
                onKeyDown={async (e) => {
                  if (e.key === 'Enter' && e.target.value.trim()) {
                    const text = e.target.value.trim();
                    const newDates = { ...dates };
                    if (!newDates[dateKey]) newDates[dateKey] = [];
                    let existingTask = newDates[dateKey].find(t => t.text === text && (t.spaceId || 'default') === selectedSpaceId);
                    if (!existingTask) {
                      existingTask = {
                        id: Date.now(),
                        text,
                        todayTime: 0,
                        totalTime: 0,
                        todayGoal: 0,
                        totalGoal: 0,
                        completed: false,
                        indentLevel: 0,
                        spaceId: selectedSpaceId || 'default'
                      };
                      newDates[dateKey].push(existingTask);
                    }
                    existingTask.todayTime += quickTimerPopup.seconds;
                    existingTask.completed = true;
                    existingTask.completedAt = new Date().toISOString();
                    const taskName = existingTask.text;
                    Object.keys(newDates).forEach(date => {
                      const updateTasksRecursive = (tasks) => {
                        tasks.forEach(t => {
                          if (t.text === taskName) t.totalTime += quickTimerPopup.seconds;
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
                      taskName: existingTask.text,
                      startTime: new Date(quickTimerPopup.startTime).toISOString(),
                      endTime: new Date(quickTimerPopup.startTime + quickTimerPopup.seconds * 1000).toISOString(),
                      duration: quickTimerPopup.seconds
                    });
                    setTimerLogs(newLogs);
                    
                    if (togglToken) {
                      try {
                        const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            description: existingTask.text,
                            start: new Date(quickTimerPopup.startTime).toISOString(),
                            duration: quickTimerPopup.seconds,
                            created_with: 'SimpleOne'
                          })
                        });
                        if (!res.ok) {
                          console.error('Toggl 저장 실패:', await res.json());
                        }
                      } catch (err) {
                        console.error('Toggl 저장 실패:', err);
                      }
                    }
                    
                    setQuickTimerPopup(false);
                  }
                }}
              />
              <div style={{ maxHeight: '200px', overflowY: 'auto' }}>
                {(dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId).map(task => (
                  <div 
                    key={task.id} 
                    style={{ 
                      padding: '8px', 
                      marginBottom: '4px', 
                      background: 'rgba(255,255,255,0.03)', 
                      borderRadius: '4px', 
                      cursor: 'pointer',
                      fontSize: '14px',
                      textAlign: 'left'
                    }}
                    onClick={() => assignQuickTime(task.id)}
                  >
                    {task.text || '(제목 없음)'}
                  </div>
                ))}
              </div>
            </div>
            <div className="popup-buttons">
              <button onClick={saveAsUnassigned}>{quickTimerPopupText.trim() ? '완료' : '나중에'}</button>
              <button onClick={() => setQuickTimerPopup(false)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {trashPopup && (
        <TrashPopup
          trash={trash}
          onClose={() => setTrashPopup(false)}
          onRestore={restoreFromTrash}
          onEmpty={emptyTrash}
        />
      )}

      {passwordSetupPopup && (
        <div className="popup-overlay" onClick={() => setPasswordSetupPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '350px' }}>
            <h3>🔒 "{passwordSetupPopup.spaceName}" 비밀번호 {passwordSetupPopup.hasPassword ? '변경' : '설정'}</h3>
            <button onClick={() => setPasswordSetupPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            {passwordSetupPopup.hasPassword && (
              <div style={{ marginBottom: '15px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>현재 비밀번호</label>
                <input
                  type="password"
                  placeholder="현재 비밀번호 입력"
                  id="current-password"
                  style={{
                    width: '100%',
                    padding: '8px',
                    fontSize: '14px',
                    borderRadius: '4px',
                    border: '1px solid rgba(255,255,255,0.2)',
                    background: 'rgba(255,255,255,0.05)',
                    color: 'inherit',
                    boxSizing: 'border-box'
                  }}
                />
              </div>
            )}
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>새 비밀번호</label>
              <input
                type="password"
                placeholder="새 비밀번호 입력"
                id="new-password"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div style={{ marginBottom: '15px' }}>
              <label style={{ display: 'block', marginBottom: '5px', fontSize: '12px' }}>비밀번호 확인</label>
              <input
                type="password"
                placeholder="비밀번호 다시 입력"
                id="confirm-password"
                style={{
                  width: '100%',
                  padding: '8px',
                  fontSize: '14px',
                  borderRadius: '4px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'inherit',
                  boxSizing: 'border-box'
                }}
              />
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                const currentInput = document.getElementById('current-password');
                const newInput = document.getElementById('new-password');
                const confirmInput = document.getElementById('confirm-password');
                
                if (passwordSetupPopup.hasPassword) {
                  if (currentInput.value !== passwordSetupPopup.currentPassword) {
                    alert('현재 비밀번호가 틀렸습니다.');
                    return;
                  }
                }
                
                if (!newInput.value) {
                  alert('새 비밀번호를 입력해주세요.');
                  return;
                }
                
                if (newInput.value !== confirmInput.value) {
                  alert('비밀번호가 일치하지 않습니다.');
                  return;
                }
                
                setLocalPasswords({ ...localPasswords, [passwordSetupPopup.spaceId]: newInput.value });
                setPasswordSetupPopup(null);
              }}>확인</button>
              {passwordSetupPopup.hasPassword && (
                <button onClick={() => {
                  if (window.confirm('비밀번호를 제거하시겠습니까?')) {
                    const newPasswords = { ...localPasswords };
                    delete newPasswords[passwordSetupPopup.spaceId];
                    setLocalPasswords(newPasswords);
                    setPasswordSetupPopup(null);
                  }
                }} style={{ background: '#dc3545' }}>제거</button>
              )}
              <button onClick={() => setPasswordSetupPopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {spacePopup && (
        <SpacePopup
          spaces={spaces}
          localPasswords={localPasswords}
          onClose={() => setSpacePopup(false)}
          onRename={renameSpace}
          onChangePassword={changeSpacePassword}
          onDelete={deleteSpace}
        />
      )}

      {backupHistoryPopup && (
        <div className="popup-overlay" onClick={() => setBackupHistoryPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>☁️ 백업 목록</h3>
            <button onClick={() => setBackupHistoryPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {backupHistoryPopup.map((backup, idx) => {
                const date = new Date(backup.timestamp);
                const dateStr = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')} ${String(date.getHours()).padStart(2, '0')}:${String(date.getMinutes()).padStart(2, '0')}`;
                const taskCount = Object.values(backup.dates || {}).reduce((sum, tasks) => sum + tasks.length, 0);
                return (
                  <div 
                    key={idx} 
                    style={{ 
                      padding: '12px', 
                      marginBottom: '8px', 
                      background: 'rgba(255,255,255,0.05)', 
                      borderRadius: '8px', 
                      cursor: 'pointer',
                      border: '1px solid rgba(255,255,255,0.1)'
                    }}
                    onClick={() => restoreBackup(backup)}
                  >
                    <div style={{ fontSize: '14px', fontWeight: 'bold', marginBottom: '4px' }}>{dateStr}</div>
                    <div style={{ fontSize: '12px', color: '#888' }}>할일 {taskCount}개 | 공간 {(backup.spaces || []).length}개</div>
                  </div>
                );
              })}
            </div>
            <div className="popup-buttons">
              <button onClick={() => setBackupHistoryPopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}

      {dateChangePopup && (
        <div className="popup-overlay" onClick={() => setDateChangePopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ padding: '20px' }}>
            <h3>날짜 변경</h3>
            <Calendar
              onChange={(date) => {
                const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                if (newDate !== dateChangePopup.dateKey) {
                  const newDates = { ...dates };
                  const taskIdx = newDates[dateChangePopup.dateKey].findIndex(t => t.id === dateChangePopup.taskId);
                  if (taskIdx !== -1) {
                    const task = newDates[dateChangePopup.dateKey][taskIdx];
                    newDates[dateChangePopup.dateKey].splice(taskIdx, 1);
                    if (!newDates[newDate]) newDates[newDate] = [];
                    newDates[newDate].push(task);
                    saveTasks(newDates);
                  }
                }
                setDateChangePopup(null);
              }}
              value={new Date(dateChangePopup.dateKey)}
              calendarType="gregory"
            />
            <button onClick={() => setDateChangePopup(null)} style={{ marginTop: '10px', width: '100%' }}>취소</button>
          </div>
        </div>
      )}

      {settingsPopup && (
        <SettingsPopup
          user={user}
          isSyncing={isSyncing}
          togglToken={togglToken}
          setTogglToken={setTogglToken}
          onClose={() => setSettingsPopup(false)}
          onDownloadBackup={downloadBackup}
          onLoadBackup={loadBackup}
          onFirebaseLogin={handleFirebaseLogin}
          onLogout={handleLogout}
          onForceUpload={forceUpload}
          onForceDownload={forceDownload}
        />
      )}
      <div className="header">
        <div>
          <h1 style={{ margin: 0 }}>Simple One</h1>
          <div>
            <select value={selectedSpaceId} onChange={(e) => {
              if (e.target.value === '__manage__') {
                setSpacePopup(true);
                e.target.value = selectedSpaceId;
              } else {
                const space = spaces.find(s => s.id === e.target.value);
                const localPassword = localPasswords[e.target.value];
                if (space && localPassword) {
                  const targetId = e.target.value;
                  setPasswordPopup({
                    spaceName: space.name,
                    spacePassword: localPassword,
                    spaceId: targetId,
                    onSuccess: () => setSelectedSpaceId(targetId),
                    onFail: () => {}
                  });
                } else {
                  setSelectedSpaceId(e.target.value);
                }
              }
            }} style={{ padding: '4px 8px', fontSize: '14px' }} title="Alt+1~0: 공간 빠른 선택">
              {spaces.map((space, idx) => (
                <option key={space.id} value={space.id}>{space.name}</option>
              ))}
              <option value="__manage__">⚙️ 공간 관리</option>
            </select>
          </div>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '4px' }}>
          {user && <span style={{ fontSize: '16px' }}>☁️{isSyncing && <span style={{ fontSize: '10px', color: '#4ade80', marginLeft: '2px' }}>●</span>}</span>}
          {togglToken && <span style={{ fontSize: '16px' }}>⏱️{Object.values(togglEntries).length > 0 && <span style={{ fontSize: '10px', color: '#4ade80', marginLeft: '2px' }}>●</span>}</span>}
          <button onClick={() => setTrashPopup(true)} className="icon-btn" title="휴지통">
            🗑️
          </button>
          <button onClick={() => setSettingsPopup(true)} className="icon-btn" title="설정">
            ⚙️
          </button>
        </div>
      </div>
      <div className="view-controls">
        <button onClick={() => setShowCalendar(!showCalendar)} className="icon-btn" title="캘린더">
          {showCalendar ? '▲' : '▼'}
        </button>
        <div className="view-mode-btns">
          <button onClick={() => setViewMode('list')} className={`icon-btn ${viewMode === 'list' ? 'active' : ''}`} title="목록">📋</button>
          <button onClick={() => setViewMode('month')} className={`icon-btn ${viewMode === 'month' ? 'active' : ''}`} title="월별">📊</button>
          <button onClick={() => setViewMode('timeline')} className={`icon-btn ${viewMode === 'timeline' ? 'active' : ''}`} title="타임라인">🕒</button>
        </div>
        {showCalendar && (
          <div className="calendar-container">
            <div style={{ position: 'relative' }}>
              <Calendar
                value={currentDate}
                onChange={setCurrentDate}
                calendarType="gregory"
                showNavigation={true}
                activeStartDate={calendarActiveDate}
                onActiveStartDateChange={({ activeStartDate }) => setCalendarActiveDate(activeStartDate)}
                tileContent={({ date, view }) => {
                  if (view !== 'month') return null;
                  const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
                  const s = getTaskStats(dates, key, selectedSpaceId);
                  return s.total > 0 ? <div className="tile-stats">{s.completed}/{s.total}</div> : null;
                }}
              />
              <button 
                className="calendar-today-btn"
                onClick={() => {
                  const today = new Date();
                  setCurrentDate(today);
                  setCalendarActiveDate(today);
                  setViewMode('list');
                }}
              >
                📅
              </button>
            </div>
          </div>
        )}
      </div>
      
      {viewMode === 'timeline' ? (
        <div className="timeline-view">
          <h2>{dateKey} 타임라인</h2>
          {(() => {
            const allLogs = timerLogs[dateKey] || [];
            const logs = allLogs.filter(log => {
              const task = (dates[dateKey] || []).find(t => t.text === log.taskName);
              return !task || (task.spaceId || 'default') === selectedSpaceId;
            });
            const completedTasks = (dates[dateKey] || []).filter(t => t.completed && t.completedAt && (t.spaceId || 'default') === selectedSpaceId);
            const allItems = [
              ...logs.map(log => ({ type: 'log', data: log })),
              ...completedTasks.map(task => ({ type: 'task', data: task }))
            ];
            
            if (allItems.length === 0) {
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
                {completedTasks.map((task, idx) => {
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
          })()}
        </div>
      ) : viewMode === 'list' ? (
        <>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px', margin: '20px 0' }}>
            <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
              <button 
                onClick={quickTimer ? stopQuickTimer : () => setQuickStartPopup(true)}
                onTouchStart={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.transition = 'transform 0.1s';
                }}
                onTouchEnd={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.transition = '';
                }}
                onMouseDown={(e) => {
                  e.currentTarget.style.transform = 'scale(0.95)';
                  e.currentTarget.style.transition = 'transform 0.1s';
                }}
                onMouseUp={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.transition = '';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = '';
                  e.currentTarget.style.transition = '';
                }}
                style={{ 
                  padding: '16px 48px', 
                  background: quickTimer ? '#dc3545' : '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                {quickTimer ? `⏸ 멈추기 (${formatTime(quickTimerSeconds)})` : '▶ Do'}
              </button>
              {quickTimer && (
                <button
                  onClick={() => {
                    if (window.confirm('타이머를 취소하시겠습니까?')) {
                      setQuickTimer(null);
                      setQuickTimerSeconds(0);
                      setQuickTimerTaskId(null);
                      if (user && useFirebase) {
                        const docRef = doc(db, 'users', user.id);
                        setDoc(docRef, { quickTimer: null }, { merge: true });
                      }
                    }
                  }}
                  style={{
                    padding: '12px 16px',
                    fontSize: '14px',
                    borderRadius: '8px',
                    border: '1px solid rgba(220,53,69,0.5)',
                    background: 'rgba(220,53,69,0.1)',
                    color: '#dc3545',
                    cursor: 'pointer'
                  }}
                >
                  취소
                </button>
              )}
            </div>
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', gap: '8px', alignItems: 'center', position: 'relative' }}>
              <div style={{ flex: 1, position: 'relative' }}>
              <input
                type="text"
                value={quickTimerText}
                onChange={(e) => {
                  setQuickTimerText(e.target.value);
                    setQuickTimerSuggestionIndex(-1);
                  const val = e.target.value.toLowerCase();
                  if (val) {
                    const allTasks = [];
                    Object.keys(dates).forEach(key => {
                      (dates[key] || []).forEach(t => {
                        if (t.text && t.text.toLowerCase().includes(val) && !allTasks.find(at => at.text === t.text)) {
                          allTasks.push(t);
                        }
                      });
                    });
                      setQuickTimerSuggestions(allTasks.slice(0, 5));
                    } else {
                      setQuickTimerSuggestions([]);
                    }
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'ArrowDown') {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickTimerSuggestionIndex(prev => {
                        if (prev === -1) return 0;
                        return prev < quickTimerSuggestions.length - 1 ? prev + 1 : prev;
                      });
                    } else if (e.key === 'ArrowUp') {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickTimerSuggestionIndex(prev => {
                        if (prev === -1) return -1;
                        return prev > 0 ? prev - 1 : -1;
                      });
                    } else if (e.key === 'Enter') {
                      e.preventDefault();
                      e.stopPropagation();
                      if (quickTimerSuggestionIndex >= 0 && quickTimerSuggestions[quickTimerSuggestionIndex]) {
                        const selectedTask = quickTimerSuggestions[quickTimerSuggestionIndex];
                        setQuickTimerText(selectedTask.text);
                        setQuickTimerSuggestions([]);
                        setQuickTimerSuggestionIndex(-1);
                        isSelectingSuggestion.current = true;
                        // 타이머 시작하지 않음
                        setTimeout(() => {
                          isSelectingSuggestion.current = false;
                        }, 500);
                      } else if (quickTimerText.trim() && !isSelectingSuggestion.current) {
                        const taskId = quickTimerTaskId;
                        setQuickTimer(Date.now());
                        setQuickTimerSeconds(0);
                        if (user && useFirebase) {
                          const docRef = doc(db, 'users', user.id);
                          setDoc(docRef, { quickTimer: Date.now(), quickTimerTaskId: taskId }, { merge: true });
                        }
                      }
                    } else if (e.key === 'Escape') {
                      e.preventDefault();
                      e.stopPropagation();
                      setQuickTimerSuggestions([]);
                      setQuickTimerSuggestionIndex(-1);
                      isSelectingSuggestion.current = false;
                    }
                  }}
                onFocus={() => {
                  const val = quickTimerText.toLowerCase();
                  if (val) {
                    const allTasks = [];
                    Object.keys(dates).forEach(key => {
                      (dates[key] || []).forEach(t => {
                        if (t.text && t.text.toLowerCase().includes(val) && !allTasks.find(at => at.text === t.text)) {
                          allTasks.push(t);
                        }
                      });
                    });
                      setQuickTimerSuggestions(allTasks.slice(0, 5));
                  }
                }}
                  onBlur={(e) => {
                    // 클릭 이벤트가 완료될 시간을 주기 위해 지연
                  setTimeout(() => {
                      // 포커스가 자동완성 목록으로 이동하지 않았는지 확인
                      const activeElement = document.activeElement;
                      if (!activeElement || !activeElement.closest('[data-suggestion-list]')) {
                        if (!isSelectingSuggestion.current) {
                          setQuickTimerSuggestions([]);
                          setQuickTimerSuggestionIndex(-1);
                        }
                      }
                    }, 600);
                  }}
                  ref={quickTimerInputRef}
                id="quick-timer-input"
                placeholder="지금 뭐 하고 있나요?"
                style={{
                    width: '100%',
                  padding: '12px 16px',
                  fontSize: '16px',
                  borderRadius: '12px',
                  border: '2px solid rgba(255,215,0,0.3)',
                  background: 'rgba(255,215,0,0.05)',
                  color: 'inherit',
                  outline: 'none',
                  textAlign: 'left',
                  boxSizing: 'border-box',
                  fontWeight: '500'
                }}
              />
                {quickTimerSuggestions.length > 0 && (
                  <div 
                    data-suggestion-list
                    style={{ 
                      position: 'absolute', 
                      top: '100%', 
                      left: 0, 
                      right: 0, 
                      background: '#222', 
                      border: '1px solid rgba(255,255,255,0.2)', 
                      borderRadius: '8px', 
                      marginTop: '4px', 
                      padding: '8px', 
                      zIndex: 1000, 
                      maxHeight: '200px', 
                      overflowY: 'auto' 
                    }}
                  >
                    {quickTimerSuggestions.map((task, idx) => (
                      <div
                        key={task.id}
                        onMouseDown={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          isSelectingSuggestion.current = true;
                          const selectedText = task.text;
                          setQuickTimerText(selectedText);
                          setQuickTimerSuggestions([]);
                          setQuickTimerSuggestionIndex(-1);
                          // input에 포커스를 다시 주어서 타이머가 시작되지 않도록 함
                          setTimeout(() => {
                            if (quickTimerInputRef.current) {
                              quickTimerInputRef.current.focus();
                            }
                            // 더 긴 시간 후 플래그 해제 (onBlur가 실행되기 전까지)
                            setTimeout(() => {
                              isSelectingSuggestion.current = false;
                            }, 500);
                          }, 0);
                        }}
                        onClick={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                          isSelectingSuggestion.current = true;
                          // 추가로 플래그를 유지
                          setTimeout(() => {
                            isSelectingSuggestion.current = false;
                          }, 500);
                        }}
                        onMouseUp={(e) => {
                          e.preventDefault();
                          e.stopPropagation();
                        }}
                        style={{
                          padding: '8px',
                          cursor: 'pointer',
                          background: idx === quickTimerSuggestionIndex ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.05)',
                          marginBottom: idx < quickTimerSuggestions.length - 1 ? '4px' : '0',
                          borderRadius: '4px',
                          fontSize: '14px'
                        }}
                      >
                        {task.text}
                      </div>
                    ))}
                  </div>
                )}
              </div>
              <button
                onClick={() => setQuickStartPopup(true)}
                style={{
                  padding: '12px 16px',
                  fontSize: '18px',
                  fontWeight: 'bold',
                  borderRadius: '12px',
                  border: 'none',
                  background: '#FFD700',
                  color: 'white',
                  cursor: 'pointer',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
                }}
              >
                +
              </button>
            </div>

          </div>



          {unassignedTimes.filter(u => u.dateKey === dateKey).length > 0 && (
            <div style={{ margin: '20px 0', padding: '16px', borderRadius: '12px', background: 'rgba(255,193,7,0.1)', border: '1px solid rgba(255,193,7,0.3)' }}>
              <h3 style={{ margin: '0 0 10px 0', fontSize: '14px', color: '#FFC107' }}>⏱️ 미지정 시간</h3>
              {unassignedTimes.filter(u => u.dateKey === dateKey).map((unassigned, idx) => {
                const globalIdx = unassignedTimes.findIndex(u => u.timestamp === unassigned.timestamp);
                return (
                  <div key={unassigned.timestamp} style={{ marginBottom: '8px' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', fontSize: '13px', color: '#888', marginBottom: '4px' }}>
                      <span>{formatTime(unassigned.seconds)}</span>
                      <button
                        onClick={() => {
                          const newUnassigned = [...unassignedTimes];
                          newUnassigned.splice(globalIdx, 1);
                          setUnassignedTimes(newUnassigned);
                        }}
                        style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc3545',
                          cursor: 'pointer',
                          fontSize: '16px',
                          padding: '0 4px'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                    <input
                      type="text"
                      defaultValue={unassigned.text || ''}
                      placeholder="작업 이름 입력 또는 아래에서 선택"
                      style={{
                        width: '100%',
                        padding: '6px',
                        marginBottom: '4px',
                        fontSize: '13px',
                        borderRadius: '4px',
                        border: '1px solid rgba(255,255,255,0.2)',
                        background: 'rgba(255,255,255,0.05)',
                        color: 'inherit',
                        boxSizing: 'border-box'
                      }}
                      onKeyDown={async (e) => {
                        if (e.key === 'Enter' && e.target.value.trim()) {
                          const text = e.target.value.trim();
                          const newDates = { ...dates };
                          if (!newDates[unassigned.dateKey]) newDates[unassigned.dateKey] = [];
                          let existingTask = newDates[unassigned.dateKey].find(t => t.text === text && (t.spaceId || 'default') === selectedSpaceId);
                          if (!existingTask) {
                            existingTask = {
                              id: Date.now(),
                              text,
                              todayTime: 0,
                              totalTime: 0,
                              todayGoal: 0,
                              totalGoal: 0,
                              completed: false,
                              indentLevel: 0,
                              spaceId: selectedSpaceId || 'default'
                            };
                            newDates[unassigned.dateKey].push(existingTask);
                          }
                          existingTask.todayTime += unassigned.seconds;
                          existingTask.completed = true;
                          existingTask.completedAt = new Date().toISOString();
                          const taskName = existingTask.text;
                          Object.keys(newDates).forEach(date => {
                            const updateTasksRecursive = (tasks) => {
                              tasks.forEach(t => {
                                if (t.text === taskName) t.totalTime += unassigned.seconds;
                                if (t.children) updateTasksRecursive(t.children);
                              });
                            };
                            if (newDates[date]) updateTasksRecursive(newDates[date]);
                          });
                          setDates(newDates);
                          saveTasks(newDates);
                          const newLogs = { ...timerLogs };
                          if (!newLogs[unassigned.dateKey]) newLogs[unassigned.dateKey] = [];
                          newLogs[unassigned.dateKey].push({
                            taskName: existingTask.text,
                            startTime: new Date(unassigned.startTime).toISOString(),
                            endTime: new Date(unassigned.startTime + unassigned.seconds * 1000).toISOString(),
                            duration: unassigned.seconds
                          });
                          setTimerLogs(newLogs);
                          
                          if (togglToken) {
                            try {
                              const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
                                method: 'POST',
                                headers: { 'Content-Type': 'application/json' },
                                body: JSON.stringify({
                                  description: existingTask.text,
                                  start: new Date(unassigned.startTime).toISOString(),
                                  duration: unassigned.seconds,
                                  created_with: 'SimpleOne'
                                })
                              });
                              if (!res.ok) {
                                console.error('Toggl 저장 실패:', await res.json());
                              }
                            } catch (err) {
                              console.error('Toggl 저장 실패:', err);
                            }
                          }
                          
                          const newUnassigned = [...unassignedTimes];
                          newUnassigned.splice(globalIdx, 1);
                          setUnassignedTimes(newUnassigned);
                          e.target.value = '';
                        }
                      }}
                    />
                    <select 
                      onChange={(e) => {
                        if (e.target.value) {
                          assignUnassignedTime(globalIdx, parseInt(e.target.value));
                        }
                      }}
                      style={{ width: '100%', padding: '6px', fontSize: '13px', borderRadius: '4px' }}
                    >
                      <option value="">또는 기존 작업 선택...</option>
                      {(dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId).map(task => (
                        <option key={task.id} value={task.id}>{task.text || '(제목 없음)'}</option>
                      ))}
                    </select>
                  </div>
                );
              })}
            </div>
          )}

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '20px 0' }}>
              {(() => {
                const allTasks = dates[dateKey]?.filter(t => (t.spaceId || 'default') === selectedSpaceId) || [];
                const incompleteTasks = allTasks.filter(t => !t.completed);
                const completedTasks = allTasks.filter(t => t.completed);
                
                return (
                  <>
                    {incompleteTasks.map((task, idx, arr) => {
              const timerKey = `${dateKey}-${task.id}`;
              const seconds = timerSeconds[timerKey] || 0;
              const allTaskLogs = Object.values(timerLogs).flat().filter(log => log.taskName === task.text);
              const touchCount = allTaskLogs.length;
              const isRunning = activeTimers[timerKey];
              const cancelTimer = (e) => {
                e.stopPropagation();
                const newActiveTimers = { ...activeTimers };
                newActiveTimers[timerKey] = false;
                setActiveTimers(newActiveTimers);
                const newTimerSeconds = { ...timerSeconds };
                newTimerSeconds[timerKey] = 0;
                setTimerSeconds(newTimerSeconds);
              };
              
              return (
                <div 
                  key={task.id}
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
                      const newDates = { ...dates };
                      const tasks = newDates[dateKey];
                      const draggedIdx = tasks.findIndex(t => t.id === draggedTaskId);
                      const targetIdx = tasks.findIndex(t => t.id === task.id);
                      if (draggedIdx !== -1 && targetIdx !== -1) {
                        const [draggedTask] = tasks.splice(draggedIdx, 1);
                        tasks.splice(targetIdx, 0, draggedTask);
                        setDates(newDates);
                        saveTasks(newDates);
                      }
                    }
                    setDraggedTaskId(null);
                  }}
                  onDragEnd={() => setDraggedTaskId(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.currentTarget.dataset.contextMenuOpened = 'true';
                    setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey, taskIndex: idx, totalTasks: arr.length });
                    setTimeout(() => {
                      e.currentTarget.dataset.contextMenuOpened = 'false';
                    }, 100);
                  }}
                  onClick={(e) => {
                    if (e.currentTarget.dataset.contextMenuOpened === 'true') {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !e.target.closest('textarea') && !e.target.closest('.autocomplete-dropdown')) {
                      toggleTimer(dateKey, [task.id]);
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
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    e.currentTarget.dataset.touchStartTime = Date.now();
                    e.currentTarget.dataset.touchStartX = touch.clientX;
                    e.currentTarget.dataset.touchStartY = touch.clientY;
                    // 즉시 시각적 피드백
                    e.currentTarget.style.transform = 'scale(0.95)';
                    e.currentTarget.style.transition = 'transform 0.05s';
                    e.currentTarget.style.opacity = '0.9';
                    const longPressTimer = setTimeout(() => {
                      setContextMenu({ x: touch.clientX, y: touch.clientY, taskId: task.id, dateKey, taskIndex: idx, totalTasks: arr.length });
                      e.currentTarget.dataset.isLongPress = 'true';
                    }, 500);
                    e.currentTarget.dataset.longPressTimer = longPressTimer;
                  }}
                  onTouchEnd={(e) => {
                    const longPressTimer = e.currentTarget.dataset.longPressTimer;
                    const isLongPress = e.currentTarget.dataset.isLongPress === 'true';
                    const isDragging = e.currentTarget.dataset.isDragging === 'true';
                    const touchStartTime = parseInt(e.currentTarget.dataset.touchStartTime);
                    const touchDuration = Date.now() - touchStartTime;
                    
                    if (longPressTimer) {
                      clearTimeout(parseInt(longPressTimer));
                    }
                    
                    // 터치 피드백 복원
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.transition = '';
                    e.currentTarget.style.opacity = '';
                    
                    // 드래그 중이었으면 드래그 종료
                    if (isDragging) {
                      setDraggedTaskId(null);
                      e.currentTarget.dataset.isDragging = 'false';
                      e.currentTarget.dataset.dragStarted = 'false';
                      return;
                    }
                    
                    // 길게 누르지 않았고, 드래그도 아니고, 짧게 탭한 경우에만 타이머 토글
                    if (!isLongPress && !isDragging && touchDuration < 500 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'DIV' && !e.target.closest(`.autocomplete-dropdown`)) {
                      toggleTimer(dateKey, [task.id]);
                    }
                    
                    e.currentTarget.dataset.isLongPress = 'false';
                    e.currentTarget.dataset.dragStarted = 'false';
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const startX = parseFloat(e.currentTarget.dataset.touchStartX);
                    const startY = parseFloat(e.currentTarget.dataset.touchStartY);
                    const moveX = Math.abs(touch.clientX - startX);
                    const moveY = Math.abs(touch.clientY - startY);
                    
                    // 움직임이 감지되면 바로 드래그 모드로 전환 (5px 이상)
                    if (moveX > 5 || moveY > 5) {
                      if (e.currentTarget.dataset.longPressTimer) {
                        clearTimeout(parseInt(e.currentTarget.dataset.longPressTimer));
                        e.currentTarget.dataset.longPressTimer = null;
                      }
                      e.currentTarget.dataset.isDragging = 'true';
                      // 드래그 시작
                      if (!e.currentTarget.dataset.dragStarted) {
                        e.currentTarget.dataset.dragStarted = 'true';
                        setDraggedTaskId(task.id);
                      }
                    }
                  }}

                >
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <textarea
                      value={task.text}
                      readOnly={editingTaskId !== task.id}
                      onChange={(e) => {
                        // 편집 모드가 아닐 때는 변경 무시
                        if (editingTaskId !== task.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.target.value = task.text;
                          return;
                        }
                        updateTask(dateKey, [task.id], 'text', e.target.value);
                        // 텍스트가 입력되면 새로 생성된 카드 목록에서 제거
                        if (e.target.value.trim() !== '' && newlyCreatedTasks.current.has(task.id)) {
                          newlyCreatedTasks.current.delete(task.id);
                        }
                      }}
                      onInput={(e) => {
                        // 편집 모드가 아닐 때는 입력 무시
                        if (editingTaskId !== task.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.target.value = task.text;
                          return;
                        }
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                        
                        const val = e.target.value.toLowerCase();
                        if (val) {
                          const allTasks = [];
                          Object.keys(dates).forEach(key => {
                            (dates[key] || []).forEach(t => {
                              if (t.text && t.text.toLowerCase().includes(val) && t.text !== task.text && !allTasks.find(at => at.text === t.text)) {
                                allTasks.push(t);
                              }
                            });
                          });
                          if (allTasks.length > 0) {
                            setAutocompleteData(prev => ({
                              ...prev,
                              [task.id]: { suggestions: allTasks.slice(0, 5), selectedIndex: -1 }
                            }));
                          } else {
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                          }
                        } else {
                          setAutocompleteData(prev => {
                            const newData = { ...prev };
                            delete newData[task.id];
                            return newData;
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        // 편집 모드가 아닐 때
                        if (editingTaskId !== task.id) {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                            setEditingTaskId(task.id);
                            setTimeout(() => {
                              const textarea = document.querySelector(`textarea[data-task-id="${task.id}"]`);
                              if (textarea) {
                                textarea.focus();
                                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                              }
                            }, 0);
                            return;
                          } else if (e.key === 'Backspace') {
                          e.preventDefault();
                            return;
                          }
                          return;
                        }
                        
                        // 편집 모드일 때
                        const acData = autocompleteData[task.id];
                        if (acData && acData.suggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setAutocompleteData(prev => ({
                              ...prev,
                              [task.id]: {
                                ...prev[task.id],
                                selectedIndex: prev[task.id].selectedIndex < prev[task.id].suggestions.length - 1 
                                  ? prev[task.id].selectedIndex + 1 
                                  : prev[task.id].selectedIndex
                              }
                            }));
                            return;
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setAutocompleteData(prev => ({
                              ...prev,
                              [task.id]: {
                                ...prev[task.id],
                                selectedIndex: prev[task.id].selectedIndex > -1 
                                  ? prev[task.id].selectedIndex - 1 
                                  : -1
                              }
                            }));
                            return;
                          } else if (e.key === 'Enter' && acData.selectedIndex >= 0) {
                            e.preventDefault();
                            const selectedSuggestion = acData.suggestions[acData.selectedIndex];
                            const selectedText = typeof selectedSuggestion === 'string' ? selectedSuggestion : selectedSuggestion.text;
                            updateTask(dateKey, [task.id], 'text', selectedText);
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                            return;
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                            return;
                          }
                        }
                        if (e.key === 'Enter') {
                          // 편집 모드일 때 엔터 키로 편집 완료
                          if (editingTaskId === task.id) {
                            e.preventDefault();
                            setEditingTaskId(null);
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                            e.target.blur();
                          } else {
                            e.preventDefault();
                          }
                        } else if (e.key === 'Backspace' && editingTaskId !== task.id) {
                          // 편집 모드가 아닐 때만 백스페이스로 작업 삭제 방지
                          e.preventDefault();
                        } else if (e.key === 'Escape' && editingTaskId === task.id) {
                          e.preventDefault();
                          setEditingTaskId(null);
                          setAutocompleteData(prev => {
                            const newData = { ...prev };
                            delete newData[task.id];
                            return newData;
                          });
                        }
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        // 편집 모드가 아니면 포커스 제거하고 타이머 토글
                        if (editingTaskId !== task.id) {
                          e.target.blur();
                          toggleTimer(dateKey, [task.id]);
                        }
                      }}
                      onClick={(e) => {
                        // 편집 모드일 때는 타이머 시작하지 않음
                        if (editingTaskId !== task.id) {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleTimer(dateKey, [task.id]);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setAutocompleteData(prev => {
                            const newData = { ...prev };
                            delete newData[task.id];
                            return newData;
                          });
                          const textarea = document.querySelector(`textarea[data-task-id="${task.id}"]`);
                          
                          // 새로 생성된 카드이고 텍스트가 비어있으면 포커스 유지
                          if (newlyCreatedTasks.current.has(task.id) && textarea && textarea.value.trim() === '') {
                            if (document.activeElement !== textarea) {
                              textarea.focus({ preventScroll: true });
                              try { textarea.setSelectionRange(0, 0); } catch (_) {}
                            }
                            return; // 편집 모드 유지
                          }
                          
                          // 다른 곳에 포커스가 갔고, 새로 생성된 카드가 아니거나 텍스트가 있으면 편집 모드 종료
                          if (editingTaskId === task.id && document.activeElement !== textarea) {
                            if (!newlyCreatedTasks.current.has(task.id) || (textarea && textarea.value.trim() !== '')) {
                              setEditingTaskId(null);
                              newlyCreatedTasks.current.delete(task.id); // 더 이상 새로 생성된 카드가 아님
                            }
                          }
                        }, 300);
                      }}
                      placeholder="원하는 것"
                      rows={1}
                      data-task-id={task.id}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
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
                    {autocompleteData[task.id] && autocompleteData[task.id].suggestions.length > 0 && (
                      <div 
                        className="autocomplete-dropdown" 
                        style={{ 
                          position: 'absolute', 
                          bottom: '100%', 
                          left: editingTaskId === task.id ? '40px' : '0', 
                          right: 0, 
                          marginBottom: '4px', 
                          zIndex: 10000,
                          pointerEvents: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {autocompleteData[task.id].suggestions.map((suggestion, idx) => {
                          const isSelected = idx === autocompleteData[task.id].selectedIndex;
                          const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.text;
                          return (
                            <div
                              key={idx}
                              className={`autocomplete-item ${isSelected ? 'selected' : ''}`}
                              style={{
                                backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTask(dateKey, [task.id], 'text', suggestionText);
                                setAutocompleteData(prev => {
                                  const newData = { ...prev };
                                  delete newData[task.id];
                                  return newData;
                                });
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTask(dateKey, [task.id], 'text', suggestionText);
                                setAutocompleteData(prev => {
                                  const newData = { ...prev };
                                  delete newData[task.id];
                                  return newData;
                                });
                              }}
                            >
                              {suggestionText}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666', marginBottom: '8px', alignItems: 'center' }}>
                    <span>{isRunning ? `⏸ ${formatTime(task.todayTime + seconds)}` : `▶ ${formatTime(task.todayTime)}`}</span>
                    <span>총 {formatTime(task.totalTime)}</span>
                    {task.startTime && <span>🕐 {task.startTime}</span>}
                    {task.startTime && <span>🕐 {task.startTime}</span>}
                      <button onClick={cancelTimer} style={{ padding: '2px 6px', fontSize: '11px', borderRadius: '4px', border: '1px solid rgba(220,53,69,0.5)', background: 'rgba(220,53,69,0.1)', color: '#dc3545', cursor: 'pointer' }}>✕</button>
                    )}
                  </div>
                  {touchCount > 0 && (
                    <div style={{ fontSize: '13px', color: '#888' }}>✨ {touchCount}번</div>
                  )}
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {(() => {
                      const subTasks = getSubTasks(dates, dateKey, task.id);
                      // 모든 날짜에서 같은 텍스트를 가진 할일의 방해요소를 찾음
                      let allObstacles = [];
                      Object.keys(dates).forEach(key => {
                        const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                        if (sameTask && sameTask.obstacles) {
                          allObstacles = allObstacles.concat(sameTask.obstacles);
                        }
                      });
                      return (
                        <>
                          {subTasks.length > 0 && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubTasksPopup({ dateKey, taskId: task.id });
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
                          {allObstacles.length > 0 && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setObstaclePopup({ dateKey, taskId: task.id, taskName: task.text });
                              }}
                              style={{ 
                                fontSize: '11px', 
                                color: '#666', 
                                cursor: 'pointer',
                                padding: '2px 4px',
                                background: 'rgba(0,0,0,0.05)',
                                borderRadius: '4px'
                              }}
                              title="방해요소"
                            >
                              🚧({allObstacles.length})
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                );
              })}
              <div 
                onClick={() => addTask(dateKey)}
                style={{
                  background: 'rgba(255,255,255,0.5)',
                  borderRadius: '16px',
                  padding: '20px',
                  border: '2px dashed #ccc',
                  cursor: 'pointer',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '24px',
                  color: '#999',
                  minHeight: '120px'
                }}
              >
                + 
              </div>
                    {completedTasks.length > 0 && (
                      <div style={{ gridColumn: '1 / -1', height: '3px', background: 'linear-gradient(to right, transparent, #FFD700 20%, #FFD700 80%, transparent)', margin: '24px 0', borderRadius: '2px', boxShadow: '0 2px 8px rgba(255,215,0,0.3)' }} />
                    )}
                    {completedTasks.map((task, idx, arr) => {
              const timerKey = `${dateKey}-${task.id}`;
              const seconds = timerSeconds[timerKey] || 0;
              const allTaskLogs = Object.values(timerLogs).flat().filter(log => log.taskName === task.text);
              const touchCount = allTaskLogs.length;
              const isRunning = activeTimers[timerKey];
              
              return (
                <div 
                  key={task.id}
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
                      const newDates = { ...dates };
                      const tasks = newDates[dateKey];
                      const draggedIdx = tasks.findIndex(t => t.id === draggedTaskId);
                      const targetIdx = tasks.findIndex(t => t.id === task.id);
                      if (draggedIdx !== -1 && targetIdx !== -1) {
                        const [draggedTask] = tasks.splice(draggedIdx, 1);
                        tasks.splice(targetIdx, 0, draggedTask);
                        setDates(newDates);
                        saveTasks(newDates);
                      }
                    }
                    setDraggedTaskId(null);
                  }}
                  onDragEnd={() => setDraggedTaskId(null)}
                  onContextMenu={(e) => {
                    e.preventDefault();
                    e.currentTarget.dataset.contextMenuOpened = 'true';
                    setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey, taskIndex: idx, totalTasks: arr.length });
                    setTimeout(() => {
                      e.currentTarget.dataset.contextMenuOpened = 'false';
                    }, 100);
                  }}
                  onClick={(e) => {
                    if (e.currentTarget.dataset.contextMenuOpened === 'true') {
                      e.preventDefault();
                      e.stopPropagation();
                      return;
                    }
                    if (e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && !e.target.closest('textarea') && !e.target.closest('.autocomplete-dropdown')) {
                      toggleTimer(dateKey, [task.id]);
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
                  onTouchStart={(e) => {
                    const touch = e.touches[0];
                    e.currentTarget.dataset.touchStartTime = Date.now();
                    e.currentTarget.dataset.touchStartX = touch.clientX;
                    e.currentTarget.dataset.touchStartY = touch.clientY;
                    // 즉시 시각적 피드백
                    e.currentTarget.style.transform = 'scale(0.95)';
                    e.currentTarget.style.transition = 'transform 0.05s';
                    e.currentTarget.style.opacity = '0.9';
                    const longPressTimer = setTimeout(() => {
                      setContextMenu({ x: touch.clientX, y: touch.clientY, taskId: task.id, dateKey, taskIndex: idx, totalTasks: arr.length });
                      e.currentTarget.dataset.isLongPress = 'true';
                    }, 500);
                    e.currentTarget.dataset.longPressTimer = longPressTimer;
                  }}
                  onTouchEnd={(e) => {
                    const longPressTimer = e.currentTarget.dataset.longPressTimer;
                    const isLongPress = e.currentTarget.dataset.isLongPress === 'true';
                    const isDragging = e.currentTarget.dataset.isDragging === 'true';
                    const touchStartTime = parseInt(e.currentTarget.dataset.touchStartTime);
                    const touchDuration = Date.now() - touchStartTime;
                    
                    if (longPressTimer) {
                      clearTimeout(parseInt(longPressTimer));
                    }
                    
                    // 터치 피드백 복원
                    e.currentTarget.style.transform = '';
                    e.currentTarget.style.transition = '';
                    e.currentTarget.style.opacity = '';
                    
                    // 드래그 중이었으면 드래그 종료
                    if (isDragging) {
                      setDraggedTaskId(null);
                      e.currentTarget.dataset.isDragging = 'false';
                      e.currentTarget.dataset.dragStarted = 'false';
                      return;
                    }
                    
                    // 길게 누르지 않았고, 드래그도 아니고, 짧게 탭한 경우에만 타이머 토글
                    if (!isLongPress && !isDragging && touchDuration < 500 && e.target.tagName !== 'INPUT' && e.target.tagName !== 'TEXTAREA' && e.target.tagName !== 'BUTTON' && e.target.tagName !== 'DIV' && !e.target.closest(`.autocomplete-dropdown`)) {
                      toggleTimer(dateKey, [task.id]);
                    }
                    
                    e.currentTarget.dataset.isLongPress = 'false';
                    e.currentTarget.dataset.dragStarted = 'false';
                  }}
                  onTouchMove={(e) => {
                    const touch = e.touches[0];
                    const startX = parseFloat(e.currentTarget.dataset.touchStartX);
                    const startY = parseFloat(e.currentTarget.dataset.touchStartY);
                    const moveX = Math.abs(touch.clientX - startX);
                    const moveY = Math.abs(touch.clientY - startY);
                    
                    // 움직임이 감지되면 바로 드래그 모드로 전환 (5px 이상)
                    if (moveX > 5 || moveY > 5) {
                      if (e.currentTarget.dataset.longPressTimer) {
                        clearTimeout(parseInt(e.currentTarget.dataset.longPressTimer));
                        e.currentTarget.dataset.longPressTimer = null;
                      }
                      e.currentTarget.dataset.isDragging = 'true';
                      // 드래그 시작
                      if (!e.currentTarget.dataset.dragStarted) {
                        e.currentTarget.dataset.dragStarted = 'true';
                        setDraggedTaskId(task.id);
                      }
                    }
                  }}

                >
                  <div style={{ position: 'relative', marginBottom: '12px' }}>
                    <textarea
                      value={task.text}
                      readOnly={editingTaskId !== task.id}
                      onChange={(e) => {
                        // 편집 모드가 아닐 때는 변경 무시
                        if (editingTaskId !== task.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.target.value = task.text;
                          return;
                        }
                        updateTask(dateKey, [task.id], 'text', e.target.value);
                        // 텍스트가 입력되면 새로 생성된 카드 목록에서 제거
                        if (e.target.value.trim() !== '' && newlyCreatedTasks.current.has(task.id)) {
                          newlyCreatedTasks.current.delete(task.id);
                        }
                      }}
                      onInput={(e) => {
                        // 편집 모드가 아닐 때는 입력 무시
                        if (editingTaskId !== task.id) {
                          e.preventDefault();
                          e.stopPropagation();
                          e.target.value = task.text;
                          return;
                        }
                        e.target.style.height = 'auto';
                        e.target.style.height = e.target.scrollHeight + 'px';
                        
                        const val = e.target.value.toLowerCase();
                        if (val) {
                          const allTasks = [];
                          Object.keys(dates).forEach(key => {
                            (dates[key] || []).forEach(t => {
                              if (t.text && t.text.toLowerCase().includes(val) && t.text !== task.text && !allTasks.find(at => at.text === t.text)) {
                                allTasks.push(t);
                              }
                            });
                          });
                          if (allTasks.length > 0) {
                            setAutocompleteData(prev => ({
                              ...prev,
                              [task.id]: { suggestions: allTasks.slice(0, 5), selectedIndex: -1 }
                            }));
                          } else {
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                          }
                        } else {
                          setAutocompleteData(prev => {
                            const newData = { ...prev };
                            delete newData[task.id];
                            return newData;
                          });
                        }
                      }}
                      onKeyDown={(e) => {
                        // 편집 모드가 아닐 때
                        if (editingTaskId !== task.id) {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                            setEditingTaskId(task.id);
                            setTimeout(() => {
                              const textarea = document.querySelector(`textarea[data-task-id="${task.id}"]`);
                              if (textarea) {
                                textarea.focus();
                                textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                              }
                            }, 0);
                            return;
                          } else if (e.key === 'Backspace') {
                          e.preventDefault();
                            return;
                          }
                          return;
                        }
                        
                        // 편집 모드일 때
                        const acData = autocompleteData[task.id];
                        if (acData && acData.suggestions.length > 0) {
                          if (e.key === 'ArrowDown') {
                            e.preventDefault();
                            setAutocompleteData(prev => ({
                              ...prev,
                              [task.id]: {
                                ...prev[task.id],
                                selectedIndex: prev[task.id].selectedIndex < prev[task.id].suggestions.length - 1 
                                  ? prev[task.id].selectedIndex + 1 
                                  : prev[task.id].selectedIndex
                              }
                            }));
                            return;
                          } else if (e.key === 'ArrowUp') {
                            e.preventDefault();
                            setAutocompleteData(prev => ({
                              ...prev,
                              [task.id]: {
                                ...prev[task.id],
                                selectedIndex: prev[task.id].selectedIndex > -1 
                                  ? prev[task.id].selectedIndex - 1 
                                  : -1
                              }
                            }));
                            return;
                          } else if (e.key === 'Enter' && acData.selectedIndex >= 0) {
                            e.preventDefault();
                            const selectedSuggestion = acData.suggestions[acData.selectedIndex];
                            const selectedText = typeof selectedSuggestion === 'string' ? selectedSuggestion : selectedSuggestion.text;
                            updateTask(dateKey, [task.id], 'text', selectedText);
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                            return;
                          } else if (e.key === 'Escape') {
                            e.preventDefault();
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                            return;
                          }
                        }
                        if (e.key === 'Enter') {
                          // 편집 모드일 때 엔터 키로 편집 완료
                          if (editingTaskId === task.id) {
                            e.preventDefault();
                            setEditingTaskId(null);
                            setAutocompleteData(prev => {
                              const newData = { ...prev };
                              delete newData[task.id];
                              return newData;
                            });
                            e.target.blur();
                          } else {
                            e.preventDefault();
                          }
                        } else if (e.key === 'Backspace' && editingTaskId !== task.id) {
                          // 편집 모드가 아닐 때만 백스페이스로 작업 삭제 방지
                          e.preventDefault();
                        } else if (e.key === 'Escape' && editingTaskId === task.id) {
                          e.preventDefault();
                          setEditingTaskId(null);
                          setAutocompleteData(prev => {
                            const newData = { ...prev };
                            delete newData[task.id];
                            return newData;
                          });
                        }
                      }}
                      onFocus={(e) => {
                        e.stopPropagation();
                        // 편집 모드가 아니면 포커스 제거하고 타이머 토글
                        if (editingTaskId !== task.id) {
                          e.target.blur();
                          toggleTimer(dateKey, [task.id]);
                        }
                      }}
                      onClick={(e) => {
                        // 편집 모드일 때는 타이머 시작하지 않음
                        if (editingTaskId !== task.id) {
                          e.stopPropagation();
                          e.preventDefault();
                          toggleTimer(dateKey, [task.id]);
                        }
                      }}
                      onBlur={() => {
                        setTimeout(() => {
                          setAutocompleteData(prev => {
                            const newData = { ...prev };
                            delete newData[task.id];
                            return newData;
                          });
                          const textarea = document.querySelector(`textarea[data-task-id="${task.id}"]`);
                          
                          // 새로 생성된 카드이고 텍스트가 비어있으면 포커스 유지
                          if (newlyCreatedTasks.current.has(task.id) && textarea && textarea.value.trim() === '') {
                            if (document.activeElement !== textarea) {
                              textarea.focus({ preventScroll: true });
                              try { textarea.setSelectionRange(0, 0); } catch (_) {}
                            }
                            return; // 편집 모드 유지
                          }
                          
                          // 다른 곳에 포커스가 갔고, 새로 생성된 카드가 아니거나 텍스트가 있으면 편집 모드 종료
                          if (editingTaskId === task.id && document.activeElement !== textarea) {
                            if (!newlyCreatedTasks.current.has(task.id) || (textarea && textarea.value.trim() !== '')) {
                              setEditingTaskId(null);
                              newlyCreatedTasks.current.delete(task.id); // 더 이상 새로 생성된 카드가 아님
                            }
                          }
                        }, 300);
                      }}
                      placeholder="원하는 것"
                      rows={1}
                      data-task-id={task.id}
                      ref={(el) => {
                        if (el) {
                          el.style.height = 'auto';
                          el.style.height = el.scrollHeight + 'px';
                        }
                      }}
                      style={{ 
                        fontSize: '18px', 
                        fontWeight: '600', 
                        color: editingTaskId === task.id ? '#000' : '#666',
                        width: '100%',
                        maxWidth: '100%',
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
                        transform: editingTaskId === task.id ? 'scale(1.02)' : 'scale(1)',
                        boxSizing: 'border-box'
                      }}
                    />
                    {autocompleteData[task.id] && autocompleteData[task.id].suggestions.length > 0 && (
                      <div 
                        className="autocomplete-dropdown" 
                        style={{ 
                          position: 'absolute', 
                          bottom: '100%', 
                          left: editingTaskId === task.id ? '40px' : '0', 
                          right: 0, 
                          marginBottom: '4px', 
                          zIndex: 10000,
                          pointerEvents: 'auto'
                        }}
                        onClick={(e) => e.stopPropagation()}
                        onMouseDown={(e) => e.stopPropagation()}
                      >
                        {autocompleteData[task.id].suggestions.map((suggestion, idx) => {
                          const isSelected = idx === autocompleteData[task.id].selectedIndex;
                          const suggestionText = typeof suggestion === 'string' ? suggestion : suggestion.text;
                          return (
                            <div
                              key={idx}
                              className={`autocomplete-item ${isSelected ? 'selected' : ''}`}
                              style={{
                                backgroundColor: isSelected ? 'rgba(76, 175, 80, 0.2)' : 'transparent',
                                cursor: 'pointer',
                                userSelect: 'none'
                              }}
                              onClick={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTask(dateKey, [task.id], 'text', suggestionText);
                                setAutocompleteData(prev => {
                                  const newData = { ...prev };
                                  delete newData[task.id];
                                  return newData;
                                });
                              }}
                              onMouseDown={(e) => {
                                e.preventDefault();
                                e.stopPropagation();
                                updateTask(dateKey, [task.id], 'text', suggestionText);
                                setAutocompleteData(prev => {
                                  const newData = { ...prev };
                                  delete newData[task.id];
                                  return newData;
                                });
                              }}
                            >
                              {suggestionText}
                            </div>
                          );
                        })}
                      </div>
                    )}
                  </div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666', marginBottom: '8px', alignItems: 'center' }}>
                    <span>{isRunning ? `⏸ ${formatTime(task.todayTime + seconds)}` : `▶ ${formatTime(task.todayTime)}`}</span>
                    <span>총 {formatTime(task.totalTime)}</span>
                  </div>
                  {touchCount > 0 && (
                    <div style={{ fontSize: '13px', color: '#888' }}>✨ {touchCount}번</div>
                  )}
                  <div style={{ position: 'absolute', bottom: '12px', right: '12px', display: 'flex', gap: '6px', alignItems: 'center' }}>
                    {(() => {
                      const subTasks = getSubTasks(dates, dateKey, task.id);
                      // 모든 날짜에서 같은 텍스트를 가진 할일의 방해요소를 찾음
                      let allObstacles = [];
                      Object.keys(dates).forEach(key => {
                        const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                        if (sameTask && sameTask.obstacles) {
                          allObstacles = allObstacles.concat(sameTask.obstacles);
                        }
                      });
                      return (
                        <>
                          {subTasks.length > 0 && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setSubTasksPopup({ dateKey, taskId: task.id });
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
                          {allObstacles.length > 0 && (
                            <span 
                              onClick={(e) => {
                                e.stopPropagation();
                                setObstaclePopup({ dateKey, taskId: task.id, taskName: task.text });
                              }}
                              style={{ 
                                fontSize: '11px', 
                                color: '#666', 
                                cursor: 'pointer',
                                padding: '2px 4px',
                                background: 'rgba(0,0,0,0.05)',
                                borderRadius: '4px'
                              }}
                              title="방해요소"
                            >
                              🚧({allObstacles.length})
                            </span>
                          )}
                        </>
                      );
                    })()}
                  </div>
                </div>
                );
              })}
                  </>
                );
              })()}
            </div>

          <div className="completed-timeline">
            <h3>✓ 오늘 한 것들</h3>
            <div className="timeline-items">
              {getTodayCompletedTasks().length > 0 ? (
                getTodayCompletedTasks().map((item) => {
                  const streak = getStreak(item.text);
                  const isLog = item.id.startsWith('log-');
                  return (
                    <div key={item.id} className="timeline-item-compact" style={{ display: 'flex', alignItems: 'center', gap: '8px', position: 'relative' }}
                      onMouseEnter={(e) => {
                        const btn = e.currentTarget.querySelector('button');
                        if (btn) {
                          btn.style.opacity = 1;
                          btn.style.pointerEvents = 'auto';
                        }
                      }}
                      onMouseLeave={(e) => {
                        const btn = e.currentTarget.querySelector('button');
                        if (btn) {
                          btn.style.opacity = 0;
                          btn.style.pointerEvents = 'none';
                        }
                      }}
                    >
                      <span 
                        className="timeline-time" 
                        onClick={(e) => {
                          e.stopPropagation();
                          setTimeEditPopup({
                            itemId: item.id,
                            isLog: item.isLog,
                            startTime: item.startTime,
                            endTime: item.endTime,
                            taskId: item.taskId
                          });
                        }}
                        style={{ cursor: 'pointer', textDecoration: 'underline', textDecorationStyle: 'dotted' }}
                        title="시간 수정"
                      >
                        {item.completedTime}
                      </span>
                      {streak > 1 && <span className="streak">🔥 {streak}일</span>}
                      <span className="timeline-task-name" style={{ flex: 1, userSelect: 'none' }}>{item.text}</span>
                      <button
                        onClick={() => {
                          if (window.confirm('정말 삭제하시겠습니까?')) {
                            if (isLog) {
                              const logStartTime = item.id.replace('log-', '');
                              const newLogs = { ...timerLogs };
                              const logIndex = newLogs[dateKey].findIndex(log => log.startTime === logStartTime);
                              if (logIndex !== -1) {
                                newLogs[dateKey].splice(logIndex, 1);
                                setTimerLogs(newLogs);
                              }
                            } else {
                              const taskId = parseInt(item.id.replace('task-', ''));
                              const newDates = { ...dates };
                              const task = newDates[dateKey].find(t => t.id === taskId);
                              if (task) {
                                task.completed = false;
                                delete task.completedAt;
                                setDates(newDates);
                                saveTasks(newDates);
                              }
                            }
                          }
                        }}
                style={{
                          background: 'none',
                          border: 'none',
                          color: '#dc3545',
                  cursor: 'pointer',
                          fontSize: '14px',
                          padding: '4px',
                          opacity: 0,
                          pointerEvents: 'none'
                        }}
                      >
                        ✕
                      </button>
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '0 0 8px 0', margin: '0' }}>완료된 작업이 없습니다</p>
              )}
              </div>
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
                <div className="month-day-header" onClick={() => { setCurrentDate(new Date(currentDate.getFullYear(), currentDate.getMonth(), day)); setViewMode('list'); }}>
                  <strong>{day}일</strong>
                  {dayStats.total > 0 && <span className="month-day-stats">{dayStats.completed}/{dayStats.total}</span>}
                </div>
                <div className="month-tasks">
                  {dates[key]?.filter(t => (t.spaceId || 'default') === selectedSpaceId).slice(0, expandedDays[key] ? undefined : 3).map(task => {
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
                  {dates[key]?.filter(t => (t.spaceId || 'default') === selectedSpaceId).length > 3 && !expandedDays[key] && <div className="month-task-more" onClick={(e) => { e.stopPropagation(); setExpandedDays({ ...expandedDays, [key]: true }); }}>+{dates[key].filter(t => (t.spaceId || 'default') === selectedSpaceId).length - 3}개 더</div>}
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
