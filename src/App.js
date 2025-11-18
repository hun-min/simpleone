import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './App.css';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';
import { formatTime } from './utils/timeUtils';
import { getTaskStats, getStreak, getSubTasks } from './utils/taskUtils';
import SettingsPopup from './components/SettingsPopup';
import { TrashPopup, SpacePopup, DeleteConfirmPopup, GoalPopup } from './components/Popups';
import { SubTasksPopup } from './components/SubTasksPopup';
import { ObstaclePopup } from './components/ObstaclePopup';
import { TimelineView } from './components/TimelineView';
import { MonthView } from './components/MonthView';
import { TaskHistoryPopup } from './components/TaskHistoryPopup';
import { QuickStartPopup, QuickTimerPopup, PasswordSetupPopup, BackupHistoryPopup, DateChangePopup } from './components/SmallPopups';
import TaskCard from './components/TaskCard';
import { useTimer } from './hooks/useTimer';

function App() {
  const [dates, setDates] = useState({});
  const [currentDate, setCurrentDate] = useState(new Date());
  const [activeTimers, setActiveTimers] = useState(() => {
    const saved = localStorage.getItem('activeTimers');
    return saved ? JSON.parse(saved) : {};
  });
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
  const popupMouseDownTarget = useRef(null);
  const [obstaclePopup, setObstaclePopup] = useState(null);
  const [timeEditPopup, setTimeEditPopup] = useState(null);
  const [contextMenu, setContextMenu] = useState(null);
  const [calendarActiveDate, setCalendarActiveDate] = useState(new Date());

  const [quickStartPopup, setQuickStartPopup] = useState(false);
  const [taskHistoryPopup, setTaskHistoryPopup] = useState(null);
  const [quickTimer, setQuickTimer] = useState(null);
  const [quickTimerTaskId, setQuickTimerTaskId] = useState(null);
  const [quickTimerPopup, setQuickTimerPopup] = useState(false);
  const [unassignedTimes, setUnassignedTimes] = useState(() => {
    const saved = localStorage.getItem('unassignedTimes');
    return saved ? JSON.parse(saved) : [];
  });
  const [quickTimerPopupText, setQuickTimerPopupText] = useState('');
  const [quickTimerText, setQuickTimerText] = useState('');
  const [spaceSelectPopup, setSpaceSelectPopup] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [autocompleteData, setAutocompleteData] = useState({});
  const [subTaskSelectPopup, setSubTaskSelectPopup] = useState(null);
  const [currentSubTasks, setCurrentSubTasks] = useState({});
  const [passwordPopup, setPasswordPopup] = useState(null);
  const [passwordSetupPopup, setPasswordSetupPopup] = useState(null);
  const [backupHistoryPopup, setBackupHistoryPopup] = useState(null);
  const [dateChangePopup, setDateChangePopup] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const skipFirebaseSave = useRef(false);
  const newlyCreatedTaskId = useRef(null);
  const newlyCreatedTasks = useRef(new Set());

  useEffect(() => {
    if (selectedSpaceId && passwordPopup && passwordPopup.spaceId === selectedSpaceId) {
      setPasswordPopup(null);
    }
  }, [selectedSpaceId, passwordPopup]);

  // 새로 생성된 카드에 자동 포커스
  useEffect(() => {
    if (newlyCreatedTaskId.current) {
      const taskId = newlyCreatedTaskId.current;
      newlyCreatedTaskId.current = null;
      
      setEditingTaskId(taskId);
      
      // DOM 렌더링 후 포커스
      setTimeout(() => {
        const textarea = document.querySelector(`textarea[data-task-id="${taskId}"]`);
        if (textarea) {
          textarea.focus();
          textarea.setSelectionRange(0, 0);
        }
      }, 100);
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
          if (data.timerLogs) {
            setTimerLogs(data.timerLogs);
            localStorage.setItem('timerLogs', JSON.stringify(data.timerLogs));
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
            if (data.timerLogs) {
              setTimerLogs(data.timerLogs);
              localStorage.setItem('timerLogs', JSON.stringify(data.timerLogs));
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

  const { timerSeconds, quickTimerSeconds, setQuickTimerSeconds } = useTimer(activeTimers, quickTimer);

  useEffect(() => {
    localStorage.setItem('dates', JSON.stringify(dates));
    if (user && useFirebase && !skipFirebaseSave.current) {
      const timer = setTimeout(() => {
        const docRef = doc(db, 'users', user.id);
        const quickTimerData = quickTimer ? { startTime: quickTimer, taskId: quickTimerTaskId || null } : null;
        
        setDoc(docRef, { 
          workspaces: { default: { dates } },
          spaces, 
          togglToken,
          timerLogs,
          quickTimer: quickTimerData
        }, { merge: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [dates, user, useFirebase, spaces, selectedSpaceId, togglToken, timerLogs, quickTimer, quickTimerTaskId]);

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
    setSelectedTasks([]);
    
    const newDates = { ...dates };
    if (!newDates[dateKey]) newDates[dateKey] = [];
    
    const taskId = Date.now();
    newlyCreatedTaskId.current = taskId;
    newlyCreatedTasks.current.add(taskId);
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
        parentTask.subTasks.unshift({
          id: Date.now(),
          text: '',
          completed: false,
          timestamp: Date.now()
        });
        // 카드는 만들지 않음
        return;
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
        newDates[date]?.forEach(t => {
          if (t.text === task.text) {
            t.totalTime += diff;
          }
        });
      });
    } else if (field === 'totalTime' && task.text) {
      Object.keys(newDates).forEach(date => {
        newDates[date]?.forEach(t => {
          if (t.text === task.text) {
            t.totalTime = value;
          }
        });
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
  


  const cancelTimer = (e, timerKey) => {
    e.stopPropagation();
    if (window.confirm('타이머를 취소하시겠습니까?')) {
      const newActiveTimers = { ...activeTimers };
      delete newActiveTimers[timerKey];
      setActiveTimers(newActiveTimers);
      
      if (togglToken && togglEntries[timerKey]) {
        const stopToggl = async (retryCount = 0) => {
          try {
            const stopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${togglEntries[timerKey]}`, {
              method: 'PATCH'
            });
            if (!stopRes.ok) throw new Error('Toggl 종료 실패');
            const newEntries = { ...togglEntries };
            delete newEntries[timerKey];
            setTogglEntries(newEntries);
          } catch (err) {
            if (retryCount < 2) {
              setTimeout(() => stopToggl(retryCount + 1), 2000);
            } else {
              try {
                const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`);
                const currentData = await currentRes.json();
                if (currentData?.id) {
                  await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
                    method: 'PATCH'
                  });
                }
              } catch {}
              const newEntries = { ...togglEntries };
              delete newEntries[timerKey];
              setTogglEntries(newEntries);
            }
          }
        };
        stopToggl();
      }
    }
  };

  const toggleTimer = async (dateKey, taskPath) => {
    const key = `${dateKey}-${taskPath.join('-')}`;
    
    if (activeTimers[key]) {
      // 타이머 종료
      const seconds = Math.floor((Date.now() - activeTimers[key]) / 1000);
      const newDates = { ...dates };
      let tasks = newDates[dateKey];
      for (let i = 0; i < taskPath.length - 1; i++) {
        tasks = tasks.find(t => t.id === taskPath[i]).children;
      }
      const task = tasks.find(t => t.id === taskPath[taskPath.length - 1]);
      
      task.todayTime += seconds;
      if (seconds >= 1) {
        task.completed = true;
        task.completedAt = new Date().toISOString();
      }
      
      // 현재 하위할일 완료 처리
      const currentSubTask = currentSubTasks[key];
      if (currentSubTask && seconds >= 1) {
        if (!task.subTasks) task.subTasks = [];
        const existingSubTask = task.subTasks.find(st => st.text === currentSubTask);
        if (existingSubTask) {
          existingSubTask.completed = true;
        } else {
          task.subTasks.push({
            id: Date.now(),
            text: currentSubTask,
            completed: true,
            timestamp: Date.now()
          });
        }
      }
      
      // 같은 이름 task들 totalTime 업데이트
      const taskName = task.text;
      Object.keys(newDates).forEach(date => {
        newDates[date]?.forEach(t => {
          if (t.text === taskName) t.totalTime += seconds;
        });
      });
      
      // 로그 저장 (1초 이상일 때만)
      if (seconds >= 1) {
        const newLogs = { ...timerLogs };
        if (!newLogs[dateKey]) newLogs[dateKey] = [];
        newLogs[dateKey].push({
          taskName: task.text || '(제목 없음)',
          subTask: currentSubTask || '',
          startTime: new Date(activeTimers[key]).toISOString(),
          endTime: new Date().toISOString(),
          duration: seconds
        });
        setTimerLogs(newLogs);
      }
      
      // Toggl 종료
      if (togglToken && togglEntries[key] && seconds >= 1) {
        await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${togglEntries[key]}`, {
          method: 'PATCH'
        }).catch(() => {});
      }
      
      // 상태 업데이트
      const newActiveTimers = { ...activeTimers };
      delete newActiveTimers[key];
      const newEntries = { ...togglEntries };
      delete newEntries[key];
      const newCurrentSubTasks = { ...currentSubTasks };
      delete newCurrentSubTasks[key];
      
      setActiveTimers(newActiveTimers);
      setTogglEntries(newEntries);
      setCurrentSubTasks(newCurrentSubTasks);
      setDates(newDates);
      saveTasks(newDates);
    } else {
      // 하위할일 선택 팝업 띄우기
      const task = dates[dateKey]?.find(t => t.id === taskPath[taskPath.length - 1]);
      setSubTaskSelectPopup({ dateKey, taskPath, task });
    }
  };








  const addSubTask = (dateKey, parentTaskId) => {
    const newDates = { ...dates };
    const task = newDates[dateKey]?.find(t => t.id === parentTaskId);
    if (!task) return;
    if (!task.subTasks) {
      task.subTasks = [];
    }
    task.subTasks.unshift({
      id: Date.now(),
      text: '',
      completed: false,
      timestamp: Date.now()
    });
    setDates(newDates);
    saveTasks(newDates);
  };

  const startQuickTimer = (taskId = null) => {
    if (taskId) {
      const task = dates[dateKey]?.find(t => t.id === Number(taskId));
      setSubTaskSelectPopup({ dateKey, taskPath: [Number(taskId)], task, isQuickTimer: true });
    } else {
      // 새 할일 작성 시에도 하위할일 선택 팝업 띄우기
      setSubTaskSelectPopup({ dateKey, taskPath: [], task: null, isQuickTimer: true });
    }
  };

  const stopQuickTimer = async () => {
    if (!quickTimer) return;
    const seconds = Math.floor((Date.now() - quickTimer) / 1000);
    
    const quickTimerKey = 'quickTimer';
    const currentSubTask = currentSubTasks[quickTimerKey];
    
    if (quickTimerText.trim()) {
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
      
      // 하위할일 완료 처리
      if (currentSubTask && seconds >= 1) {
        if (!existingTask.subTasks) existingTask.subTasks = [];
        const existingSubTask = existingTask.subTasks.find(st => st.text === currentSubTask);
        if (existingSubTask) {
          existingSubTask.completed = true;
        } else {
          existingTask.subTasks.push({
            id: Date.now(),
            text: currentSubTask,
            completed: true,
            timestamp: Date.now()
          });
        }
      }
      
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
        subTask: currentSubTask || '',
        startTime: new Date(quickTimer).toISOString(),
        endTime: new Date().toISOString(),
        duration: seconds
      });
      setTimerLogs(newLogs);
      
      if (togglToken) {
        try {
          const description = currentSubTask ? `${existingTask.text} - ${currentSubTask}` : existingTask.text;
          const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              description,
              start: new Date(quickTimer).toISOString(),
              duration: seconds,
              created_with: 'SimpleOne'
            })
          });
          if (!res.ok) {
            console.error('Toggl 저장 실패');
          }
        } catch (err) {
          console.error('Toggl 저장 실패:', err);
        }
      }
      
      setTimeout(() => { skipFirebaseSave.current = false; }, 1000);
    }
    
    // 상태 정리
    const newCurrentSubTasks = { ...currentSubTasks };
    delete newCurrentSubTasks[quickTimerKey];
    setCurrentSubTasks(newCurrentSubTasks);
    
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
          const startTime = t.startTime ? 
            new Date(`${timeDate}T${t.startTime}:00`) : 
            new Date(time.getTime() - (t.todayTime || 0) * 1000);
          const endTime = new Date(t.completedAt);
          completedItems.push({
            text: t.text,
            completedTime: `${String(startTime.getHours()).padStart(2, '0')}:${String(startTime.getMinutes()).padStart(2, '0')}-${String(endTime.getHours()).padStart(2, '0')}:${String(endTime.getMinutes()).padStart(2, '0')}`,
            sortTime: endTime.getTime(),
            id: `task-${t.id}`,
            startTime: startTime.getTime(),
            endTime: endTime.getTime(),
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
        togglToken,
        timerLogs
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
          if (data.timerLogs) setTimerLogs(data.timerLogs);
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
    if (backup.timerLogs) setTimerLogs(backup.timerLogs);
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
      <SubTasksPopup
        subTasksPopup={subTasksPopup}
        dates={dates}
        setDates={setDates}
        saveTasks={saveTasks}
        addSubTask={addSubTask}
        onClose={() => setSubTasksPopup(null)}
        popupMouseDownTarget={popupMouseDownTarget}
      />

      <ObstaclePopup
        obstaclePopup={obstaclePopup}
        dates={dates}
        setDates={setDates}
        saveTasks={saveTasks}
        onClose={() => setObstaclePopup(null)}
        popupMouseDownTarget={popupMouseDownTarget}
      />

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
                let startDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), startHour, startMin);
                let endDate = new Date(today.getFullYear(), today.getMonth(), today.getDate(), endHour, endMin);
                
                // 종료 시간이 시작 시간보다 작으면 시작 시간으로 설정
                if (endDate.getTime() < startDate.getTime()) {
                  endDate = new Date(startDate.getTime());
                }
                
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

      <QuickStartPopup
        quickStartPopup={quickStartPopup}
        dates={dates}
        dateKey={dateKey}
        selectedSpaceId={selectedSpaceId}
        quickTimerTaskId={quickTimerTaskId}
        setQuickTimerTaskId={setQuickTimerTaskId}
        setQuickTimerText={setQuickTimerText}
        startQuickTimer={startQuickTimer}
        onClose={() => setQuickStartPopup(false)}
      />



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
            <h3>{timePopup.type === 'today' ? '📅 오늘 시간' : timePopup.type === 'startTime' ? '⏰ 시작시간 설정' : '⏱️ 총 시간'}</h3>
            {timePopup.type === 'startTime' && (
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
                if (timePopup.type === 'startTime') {
                  if (timePopup.startTime) {
                    updateTask(timePopup.dateKey, timePopup.path, 'desiredStartTime', timePopup.startTime);
                  } else {
                    const newDates = { ...dates };
                    const task = newDates[timePopup.dateKey].find(t => t.id === timePopup.path[0]);
                    if (task) {
                      delete task.desiredStartTime;
                      setDates(newDates);
                      saveTasks(newDates);
                    }
                  }
                } else {
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
      <TaskHistoryPopup
        taskHistoryPopup={taskHistoryPopup}
        dates={dates}
        setDates={setDates}
        saveTasks={saveTasks}
        onClose={() => setTaskHistoryPopup(null)}
      />



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





      {contextMenu && (
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
                  textarea.readOnly = false;
                  textarea.focus();
                  textarea.setSelectionRange(textarea.value.length, textarea.value.length);
                }
              }, 50);
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
              if (task) {
                setTimePopup({
                  type: 'startTime',
                  dateKey: contextMenu.dateKey,
                  path: [contextMenu.taskId],
                  startTime: task.desiredStartTime || ''
                });
              }
              setContextMenu(null);
            }}>
              ⏰ 시작시간 {(() => {
                const task = dates[contextMenu.dateKey]?.find(t => t.id === contextMenu.taskId);
                return task?.desiredStartTime ? `(${task.desiredStartTime})` : '';
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
              setReorderMode(!reorderMode); 
              setContextMenu(null); 
            }}>
              {reorderMode ? '❌ 순서변경 취소' : '🔄 순서 변경'}
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

      <QuickTimerPopup
        quickTimerPopup={quickTimerPopup}
        quickTimerPopupText={quickTimerPopupText}
        setQuickTimerPopupText={setQuickTimerPopupText}
        dates={dates}
        dateKey={dateKey}
        selectedSpaceId={selectedSpaceId}
        assignQuickTime={assignQuickTime}
        saveAsUnassigned={saveAsUnassigned}
        onClose={() => setQuickTimerPopup(false)}
      />

      {subTaskSelectPopup && (
        <div className="popup-overlay" onClick={() => setSubTaskSelectPopup(null)} style={{ zIndex: 10003 }}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px', zIndex: 10004 }}>
            <h3>🎯 무엇을 할까요?</h3>
            <button onClick={() => setSubTaskSelectPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            
            <input
              type="text"
              placeholder="구체적으로 무엇을 할지 입력하세요"
              autoFocus
              style={{
                width: '100%',
                padding: '12px',
                marginBottom: '15px',
                fontSize: '16px',
                borderRadius: '8px',
                border: '2px solid #4CAF50',
                background: 'rgba(76,175,80,0.1)',
                color: 'inherit',
                boxSizing: 'border-box'
              }}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && e.target.value.trim()) {
                  const subTaskText = e.target.value.trim();
                  const key = subTaskSelectPopup.isQuickTimer ? 'quickTimer' : `${subTaskSelectPopup.dateKey}-${subTaskSelectPopup.taskPath.join('-')}`;
                  
                  if (subTaskSelectPopup.isQuickTimer) {
                    const startTime = Date.now();
                    setQuickTimer(startTime);
                    setQuickTimerSeconds(0);
                    setQuickTimerTaskId(subTaskSelectPopup.task?.id || null);
                    setCurrentSubTasks({ ...currentSubTasks, [key]: subTaskText });
                    // 새 할일 작성 시 quickTimerText 초기화
                    if (!subTaskSelectPopup.task) {
                      setQuickTimerText('');
                    }
                    if (user && useFirebase) {
                      const docRef = doc(db, 'users', user.id);
                      setDoc(docRef, { quickTimer: { startTime, taskId: subTaskSelectPopup.task?.id || null } }, { merge: true });
                    }
                  } else {
                    setActiveTimers({ ...activeTimers, [key]: Date.now() });
                    setCurrentSubTasks({ ...currentSubTasks, [key]: subTaskText });
                    
                    // Toggl 시작
                    if (togglToken && subTaskSelectPopup.task) {
                      const description = `${subTaskSelectPopup.task.text} - ${subTaskText}`;
                      fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          description,
                          start: new Date().toISOString(),
                          duration: -1,
                          created_with: 'SimpleOne'
                        })
                      }).then(res => res.json()).then(data => {
                        if (data?.id) setTogglEntries({ ...togglEntries, [key]: data.id });
                      }).catch(err => console.error('Toggl 시작 실패:', err));
                    }
                  }
                  
                  setSubTaskSelectPopup(null);
                }
              }}
            />
            
            {(() => {
              if (!subTaskSelectPopup.task) return null;
              const allSubTasks = getSubTasks(dates, subTaskSelectPopup.dateKey, subTaskSelectPopup.task.id);
              const incompleteSubTasks = allSubTasks.filter(st => !st.completed);
              return incompleteSubTasks.length > 0 && (
                <div>
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>또는 기존 하위할일 선택:</h4>
                  <div style={{ maxHeight: '60vh', overflowY: 'auto' }}>
                    {incompleteSubTasks.map((subTask, idx) => (
                    <div 
                      key={subTask.id}
                      style={{ 
                        padding: '8px 12px', 
                        marginBottom: '4px', 
                        background: 'rgba(255,255,255,0.05)', 
                        borderRadius: '6px', 
                        cursor: 'pointer',
                        border: '1px solid rgba(255,255,255,0.1)',
                        fontSize: '14px'
                      }}
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        const key = subTaskSelectPopup.isQuickTimer ? 'quickTimer' : `${subTaskSelectPopup.dateKey}-${subTaskSelectPopup.taskPath.join('-')}`;
                        
                        if (subTaskSelectPopup.isQuickTimer) {
                          const startTime = Date.now();
                          setQuickTimer(startTime);
                          setQuickTimerSeconds(0);
                          setQuickTimerTaskId(subTaskSelectPopup.task?.id || null);
                          setCurrentSubTasks({ ...currentSubTasks, [key]: subTask.text });
                          // 새 할일 작성 시 quickTimerText 초기화
                          if (!subTaskSelectPopup.task) {
                            setQuickTimerText('');
                          }
                          if (user && useFirebase) {
                            const docRef = doc(db, 'users', user.id);
                            setDoc(docRef, { quickTimer: { startTime, taskId: subTaskSelectPopup.task?.id || null } }, { merge: true });
                          }
                        } else {
                          setActiveTimers({ ...activeTimers, [key]: Date.now() });
                          setCurrentSubTasks({ ...currentSubTasks, [key]: subTask.text });
                          
                          // Toggl 시작
                          if (togglToken) {
                            const description = `${subTaskSelectPopup.task.text} - ${subTask.text}`;
                            fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
                              method: 'POST',
                              headers: { 'Content-Type': 'application/json' },
                              body: JSON.stringify({
                                description,
                                start: new Date().toISOString(),
                                duration: -1,
                                created_with: 'SimpleOne'
                              })
                            }).then(res => res.json()).then(data => {
                              if (data?.id) setTogglEntries({ ...togglEntries, [key]: data.id });
                            }).catch(err => console.error('Toggl 시작 실패:', err));
                          }
                        }
                        
                        setSubTaskSelectPopup(null);
                      }}
                    >
                      {subTask.text}
                      </div>
                    ))}
                  </div>
                </div>
              );
            })()}
            
            <div className="popup-buttons" style={{ marginTop: '15px' }}>
              <button onClick={() => {
                const input = document.querySelector('input[placeholder="구체적으로 무엇을 할지 입력하세요"]');
                if (input && input.value.trim()) {
                  const subTaskText = input.value.trim();
                  const key = subTaskSelectPopup.isQuickTimer ? 'quickTimer' : `${subTaskSelectPopup.dateKey}-${subTaskSelectPopup.taskPath.join('-')}`;
                  
                  if (subTaskSelectPopup.isQuickTimer) {
                    const startTime = Date.now();
                    setQuickTimer(startTime);
                    setQuickTimerSeconds(0);
                    setQuickTimerTaskId(subTaskSelectPopup.task?.id || null);
                    setCurrentSubTasks({ ...currentSubTasks, [key]: subTaskText });
                    // 새 할일 작성 시 quickTimerText 초기화
                    if (!subTaskSelectPopup.task) {
                      setQuickTimerText('');
                    }
                    if (user && useFirebase) {
                      const docRef = doc(db, 'users', user.id);
                      setDoc(docRef, { quickTimer: { startTime, taskId: subTaskSelectPopup.task?.id || null } }, { merge: true });
                    }
                  } else {
                    setActiveTimers({ ...activeTimers, [key]: Date.now() });
                    setCurrentSubTasks({ ...currentSubTasks, [key]: subTaskText });
                    
                    if (togglToken && subTaskSelectPopup.task) {
                      const description = `${subTaskSelectPopup.task.text} - ${subTaskText}`;
                      fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
                        method: 'POST',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          description,
                          start: new Date().toISOString(),
                          duration: -1,
                          created_with: 'SimpleOne'
                        })
                      }).then(res => res.json()).then(data => {
                        if (data?.id) setTogglEntries({ ...togglEntries, [key]: data.id });
                      }).catch(err => console.error('Toggl 시작 실패:', err));
                    }
                  }
                  
                  setSubTaskSelectPopup(null);
                }
              }}>확인</button>
              <button onClick={() => setSubTaskSelectPopup(null)}>취소</button>
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

      <PasswordSetupPopup
        passwordSetupPopup={passwordSetupPopup}
        localPasswords={localPasswords}
        setLocalPasswords={setLocalPasswords}
        onClose={() => setPasswordSetupPopup(null)}
      />



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

      <BackupHistoryPopup
        backupHistoryPopup={backupHistoryPopup}
        restoreBackup={restoreBackup}
        onClose={() => setBackupHistoryPopup(null)}
      />



      <DateChangePopup
        dateChangePopup={dateChangePopup}
        dates={dates}
        saveTasks={saveTasks}
        onClose={() => setDateChangePopup(null)}
      />



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
          <button onClick={() => setViewMode('all')} className={`icon-btn ${viewMode === 'all' ? 'active' : ''}`} title="전체보기">📜</button>
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
          <TimelineView
            dateKey={dateKey}
            timerLogs={timerLogs}
            dates={dates}
            selectedSpaceId={selectedSpaceId}
            setLogEditPopup={setLogEditPopup}
          />
        </div>
      ) : viewMode === 'all' ? (
        <div style={{ padding: '20px 0' }}>
          <h2>📜 전체보기</h2>
          {Object.keys(dates).sort((a, b) => new Date(b) - new Date(a)).map(date => {
            const allTasks = dates[date]?.filter(t => (t.spaceId || 'default') === selectedSpaceId) || [];
            const incompleteTasks = allTasks.filter(t => !t.completed);
            const completedTasks = allTasks.filter(t => t.completed);
            const allTaskLogs = Object.values(timerLogs).flat();
            if (allTasks.length === 0) return null;
            
            return (
              <div key={date} style={{ marginBottom: '40px' }}>
                <h3 style={{ fontSize: '18px', marginBottom: '15px', color: '#333', borderBottom: '2px solid #eee', paddingBottom: '8px' }}>{date}</h3>
                
                {incompleteTasks.length > 0 && (
                  <div style={{ marginBottom: '20px' }}>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#333' }}>📝 할 일</h4>
                    {incompleteTasks.map(task => {
                      const touchCount = allTaskLogs.filter(log => log.taskName === task.text).length;
                      const subTasks = getSubTasks(dates, date, task.id);
                      const completedSubTasks = subTasks.filter(st => st.completed);
                      let allObstacles = [];
                      Object.keys(dates).forEach(key => {
                        const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                        if (sameTask && sameTask.obstacles) {
                          allObstacles = allObstacles.concat(sameTask.obstacles);
                        }
                      });
                      
                      return (
                        <div key={task.id}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.currentTarget.dataset.touchStartTime = Date.now();
                            e.currentTarget.dataset.hasMoved = 'false';
                            const menuTimer = setTimeout(() => {
                              if (e.currentTarget.dataset.hasMoved === 'false') {
                                const touch = e.touches?.[0] || { clientX: 0, clientY: 0 };
                                setContextMenu({ x: touch.clientX, y: touch.clientY, taskId: task.id, dateKey: date });
                              }
                            }, 1500);
                            e.currentTarget.dataset.menuTimer = menuTimer;
                          }}
                          onTouchMove={(e) => {
                            e.currentTarget.dataset.hasMoved = 'true';
                            if (e.currentTarget.dataset.menuTimer) {
                              clearTimeout(parseInt(e.currentTarget.dataset.menuTimer));
                            }
                          }}
                          onTouchEnd={(e) => {
                            if (e.currentTarget.dataset.menuTimer) {
                              clearTimeout(parseInt(e.currentTarget.dataset.menuTimer));
                            }
                            const touchDuration = Date.now() - parseInt(e.currentTarget.dataset.touchStartTime);
                            if (e.currentTarget.dataset.hasMoved === 'false' && touchDuration < 500) {
                              toggleTimer(date, [task.id]);
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey: date });
                          }}
                          style={{ 
                            padding: '12px 16px', 
                            marginBottom: '8px', 
                            background: 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                            borderRadius: '12px',
                            border: '2px solid #4CAF50',
                            cursor: 'pointer',
                            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
                            transition: 'all 0.2s'
                          }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{task.text}</div>
                          <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span>▶ {formatTime(task.todayTime)}</span>
                            <span>총 {formatTime(task.totalTime)}</span>
                            {touchCount > 0 && <span>✨ {touchCount}번</span>}
                            {subTasks.length > 0 && <span>📋({completedSubTasks.length}/{subTasks.length})</span>}
                            {allObstacles.length > 0 && <span>🚧({allObstacles.length})</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
                
                {completedTasks.length > 0 && (
                  <div>
                    <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#666' }}>✅ 완료</h4>
                    {completedTasks.map(task => {
                      const touchCount = allTaskLogs.filter(log => log.taskName === task.text).length;
                      const subTasks = getSubTasks(dates, date, task.id);
                      const completedSubTasks = subTasks.filter(st => st.completed);
                      let allObstacles = [];
                      Object.keys(dates).forEach(key => {
                        const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                        if (sameTask && sameTask.obstacles) {
                          allObstacles = allObstacles.concat(sameTask.obstacles);
                        }
                      });
                      
                      return (
                        <div key={task.id}
                          onTouchStart={(e) => {
                            e.preventDefault();
                            e.currentTarget.dataset.touchStartTime = Date.now();
                            const menuTimer = setTimeout(() => {
                              const touch = e.touches?.[0] || { clientX: 0, clientY: 0 };
                              setContextMenu({ x: touch.clientX, y: touch.clientY, taskId: task.id, dateKey: date });
                            }, 1500);
                            e.currentTarget.dataset.menuTimer = menuTimer;
                          }}
                          onTouchEnd={(e) => {
                            if (e.currentTarget.dataset.menuTimer) {
                              clearTimeout(parseInt(e.currentTarget.dataset.menuTimer));
                            }
                          }}
                          onContextMenu={(e) => {
                            e.preventDefault();
                            setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey: date });
                          }}
                          style={{ 
                            padding: '12px 16px', 
                            marginBottom: '8px', 
                            background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                            borderRadius: '12px',
                            border: '2px solid #66BB6A',
                            cursor: 'pointer',
                            opacity: 0.8,
                            boxShadow: '0 2px 8px rgba(76,175,80,0.2)'
                          }}>
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>{task.text}</div>
                          <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span>⏱️ {formatTime(task.todayTime)}</span>
                            {touchCount > 0 && <span>✨ {touchCount}번</span>}
                            {subTasks.length > 0 && <span>📋({completedSubTasks.length}/{subTasks.length})</span>}
                            {allObstacles.length > 0 && <span>🚧({allObstacles.length})</span>}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <>
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '20px 0' }}>
            <button 
              onClick={() => {
                if (quickTimer) {
                  stopQuickTimer();
                } else {
                  setQuickStartPopup(true);
                }
              }}
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
              {quickTimer ? (
                (() => {
                  const currentSubTask = currentSubTasks['quickTimer'];
                  const taskText = quickTimerText || (quickTimerTaskId ? dates[dateKey]?.find(t => t.id === quickTimerTaskId)?.text : '');
                  return `⏸ ${taskText ? taskText : '원하는 것 이루기'} ${currentSubTask ? `- ${currentSubTask}` : ''} (${formatTime(quickTimerSeconds)})`;
                })()
              ) : '✨ 원하는 것 이루기'}
            </button>
            {quickTimer && (
              <button
                onClick={() => {
                  if (window.confirm('타이머를 취소하시겠습니까?')) {
                    setQuickTimer(null);
                    setQuickTimerSeconds(0);
                    setQuickTimerTaskId(null);
                    setQuickTimerText('');
                    if (user && useFirebase) {
                      const docRef = doc(db, 'users', user.id);
                      setDoc(docRef, { quickTimer: null }, { merge: true });
                    }
                  }
                }}
                style={{
                  padding: '8px 12px',
                  background: 'none',
                  border: '2px solid #dc3545',
                  borderRadius: '8px',
                  cursor: 'pointer',
                  fontSize: '20px',
                  color: '#dc3545',
                  touchAction: 'manipulation',
                  WebkitTapHighlightColor: 'transparent'
                }}
              >
                ✕
              </button>
            )}
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

            {reorderMode && (
              <div style={{ 
                position: 'fixed', 
                top: '20px', 
                right: '20px', 
                background: '#dc3545', 
                color: 'white', 
                padding: '12px 20px', 
                borderRadius: '8px', 
                fontSize: '16px', 
                fontWeight: 'bold',
                zIndex: 1000,
                cursor: 'pointer',
                boxShadow: '0 4px 12px rgba(220,53,69,0.3)'
              }}
              onClick={() => setReorderMode(false)}
              >
                ❌ 순서변경 취소
              </div>
            )}

            <div style={{ padding: '20px 0' }}>
              {(() => {
                const allTasks = dates[dateKey]?.filter(t => (t.spaceId || 'default') === selectedSpaceId) || [];
                const incompleteTasks = allTasks.filter(t => !t.completed);
                const completedTasks = allTasks.filter(t => t.completed);
                const allTaskLogs = Object.values(timerLogs).flat();
                
                return (
                  <>
                    {incompleteTasks.length > 0 && (
                      <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333' }}>📝 할 일</h3>
                        {incompleteTasks.map(task => {
                          const timerKey = `${dateKey}-${task.id}`;
                          const seconds = timerSeconds[timerKey] || 0;
                          const isRunning = activeTimers[timerKey];
                          
                          // 어루만짐 계산: 하위할일 완료개수 + 타이머 시작 횟수 + 상위할일 완료횟수
                          const subTasks = getSubTasks(dates, dateKey, task.id);
                          const completedSubTasks = subTasks.filter(st => st.completed);
                          const timerStartCount = allTaskLogs.filter(log => log.taskName === task.text).length;
                          let completedTaskCount = 0;
                          Object.keys(dates).forEach(key => {
                            const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                            if (sameTask && sameTask.completed) {
                              completedTaskCount++;
                            }
                          });
                          const touchCount = completedSubTasks.length + timerStartCount + completedTaskCount;
                          let allObstacles = [];
                          Object.keys(dates).forEach(key => {
                            const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                            if (sameTask && sameTask.obstacles) {
                              allObstacles = allObstacles.concat(sameTask.obstacles);
                            }
                          });
                          
                          return (
                            <div key={task.id} 
                              draggable={reorderMode}
                              onDragStart={reorderMode ? (e) => {
                                setDraggedTaskId(task.id);
                                e.dataTransfer.effectAllowed = 'move';
                              } : undefined}
                              onDragOver={reorderMode ? (e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              } : undefined}
                              onDrop={reorderMode ? (e) => {
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
                              } : undefined}
                              onDragEnd={reorderMode ? () => setDraggedTaskId(null) : undefined}
                              onClick={reorderMode ? undefined : (editingTaskId === task.id ? undefined : () => toggleTimer(dateKey, [task.id]))}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey });
                              }}
                              style={{ 
                                padding: '12px 16px', 
                                marginBottom: '8px', 
                                background: isRunning ? 'linear-gradient(135deg, #fff3cd 0%, #ffeaa7 100%)' : 'linear-gradient(135deg, #f8f9fa 0%, #e9ecef 100%)',
                                borderRadius: '12px',
                                border: isRunning ? '2px solid #FFD700' : '2px solid #4CAF50',
                                cursor: reorderMode ? 'grab' : 'pointer',
                                boxShadow: isRunning ? '0 4px 12px rgba(255,215,0,0.3)' : '0 2px 8px rgba(0,0,0,0.1)',
                                transition: 'all 0.2s',
                                opacity: draggedTaskId === task.id ? 0.5 : 1,
                                border: reorderMode ? '2px dashed #007bff' : (isRunning ? '2px solid #FFD700' : '2px solid #4CAF50')
                              }}>
                              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                                <div style={{ flex: 1 }}>
                                  <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                                    {editingTaskId === task.id ? (
                                      <textarea
                                        value={task.text}
                                        onChange={(e) => updateTask(dateKey, [task.id], 'text', e.target.value)}
                                        onKeyDown={(e) => {
                                          if (e.key === 'Enter') {
                                            e.preventDefault();
                                            setEditingTaskId(null);
                                            e.target.blur();
                                          } else if (e.key === 'Escape') {
                                            e.preventDefault();
                                            setEditingTaskId(null);
                                            e.target.blur();
                                          }
                                        }}
                                        onBlur={() => setEditingTaskId(null)}
                                        autoFocus
                                        data-task-id={task.id}
                                        style={{
                                          width: '100%',
                                          fontSize: '16px',
                                          fontWeight: 'bold',
                                          border: '2px solid #4CAF50',
                                          borderRadius: '8px',
                                          padding: '8px',
                                          background: 'rgba(76,175,80,0.1)',
                                          resize: 'none',
                                          fontFamily: 'inherit',
                                          outline: 'none'
                                        }}
                                      />
                                    ) : (
                                      task.text || ''
                                    )}
                                  </div>
                                  <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                    <span>{isRunning ? `⏸ ${formatTime(task.todayTime + seconds)}` : `▶ ${formatTime(task.todayTime)}`}</span>
                                    <span>총 {formatTime(task.totalTime)}</span>
                                    {task.desiredStartTime && <span>⏰ {task.desiredStartTime}</span>}
                                    {touchCount > 0 && <span>✨ {touchCount}번</span>}
                                    {subTasks.length > 0 && <span>📋({completedSubTasks.length}/{subTasks.length})</span>}
                                    {allObstacles.length > 0 && <span>🚧({allObstacles.length})</span>}
                                  </div>
                                  {(() => {
                                    const currentSubTask = currentSubTasks[timerKey];
                                    if (currentSubTask && isRunning) {
                                      return (
                                        <div style={{ 
                                          marginTop: '6px',
                                          fontSize: '12px',
                                          color: '#4CAF50',
                                          fontWeight: 'bold'
                                        }}>
                                          🎯 {currentSubTask}
                                        </div>
                                      );
                                    }
                                    return null;
                                  })()}
                                </div>
                                {isRunning && (
                                  <button onClick={(e) => cancelTimer(e, timerKey)} style={{ padding: '4px 8px', fontSize: '12px', borderRadius: '4px', border: '1px solid rgba(220,53,69,0.5)', background: 'rgba(220,53,69,0.1)', color: '#dc3545', cursor: 'pointer' }}>✕</button>
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
                    
                    <div 
                      onClick={() => addTask(dateKey)}
                      style={{
                        padding: '16px',
                        marginBottom: '30px',
                        background: 'rgba(76,175,80,0.1)',
                        borderRadius: '12px',
                        border: '2px dashed #4CAF50',
                        cursor: 'pointer',
                        textAlign: 'center',
                        fontSize: '16px',
                        color: '#4CAF50',
                        fontWeight: 'bold'
                      }}
                    >
                      + 새 할일 추가
                    </div>
                    
                    {completedTasks.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#666' }}>✅ 완료</h3>
                        {completedTasks.map(task => {
                          // 어루만짐 계산: 하위할일 완료개수 + 타이머 시작 횟수 + 상위할일 완료횟수
                          const subTasks = getSubTasks(dates, dateKey, task.id);
                          const completedSubTasks = subTasks.filter(st => st.completed);
                          const timerStartCount = allTaskLogs.filter(log => log.taskName === task.text).length;
                          let completedTaskCount = 0;
                          Object.keys(dates).forEach(key => {
                            const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                            if (sameTask && sameTask.completed) {
                              completedTaskCount++;
                            }
                          });
                          const touchCount = completedSubTasks.length + timerStartCount + completedTaskCount;
                          let allObstacles = [];
                          Object.keys(dates).forEach(key => {
                            const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                            if (sameTask && sameTask.obstacles) {
                              allObstacles = allObstacles.concat(sameTask.obstacles);
                            }
                          });
                          
                          return (
                            <div key={task.id}
                              draggable={reorderMode}
                              onDragStart={reorderMode ? (e) => {
                                setDraggedTaskId(task.id);
                                e.dataTransfer.effectAllowed = 'move';
                              } : undefined}
                              onDragOver={reorderMode ? (e) => {
                                e.preventDefault();
                                e.dataTransfer.dropEffect = 'move';
                              } : undefined}
                              onDrop={reorderMode ? (e) => {
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
                              } : undefined}
                              onDragEnd={reorderMode ? () => setDraggedTaskId(null) : undefined}
                              onClick={reorderMode ? undefined : (editingTaskId === task.id ? undefined : () => toggleTimer(dateKey, [task.id]))}
                              onContextMenu={(e) => {
                                e.preventDefault();
                                setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey });
                              }}
                              style={{ 
                                padding: '12px 16px', 
                                marginBottom: '8px', 
                                background: 'linear-gradient(135deg, #e8f5e9 0%, #c8e6c9 100%)',
                                borderRadius: '12px',
                                border: '2px solid #66BB6A',
                                cursor: reorderMode ? 'grab' : 'pointer',
                                opacity: draggedTaskId === task.id ? 0.5 : 0.8,
                                boxShadow: '0 2px 8px rgba(76,175,80,0.2)',
                                border: reorderMode ? '2px dashed #007bff' : '2px solid #66BB6A'
                              }}>
                              <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px' }}>
                                {editingTaskId === task.id ? (
                                  <textarea
                                    value={task.text}
                                    onChange={(e) => updateTask(dateKey, [task.id], 'text', e.target.value)}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter') {
                                        e.preventDefault();
                                        setEditingTaskId(null);
                                        e.target.blur();
                                      } else if (e.key === 'Escape') {
                                        e.preventDefault();
                                        setEditingTaskId(null);
                                        e.target.blur();
                                      }
                                    }}
                                    onBlur={() => setEditingTaskId(null)}
                                    autoFocus
                                    data-task-id={task.id}
                                    style={{
                                      width: '100%',
                                      fontSize: '16px',
                                      fontWeight: 'bold',
                                      border: '2px solid #4CAF50',
                                      borderRadius: '8px',
                                      padding: '8px',
                                      background: 'rgba(76,175,80,0.1)',
                                      resize: 'none',
                                      fontFamily: 'inherit',
                                      outline: 'none'
                                    }}
                                  />
                                ) : (
                                  task.text || ''
                                )}
                              </div>
                              <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px', alignItems: 'center' }}>
                                <span>⏱️ {formatTime(task.todayTime)}</span>
                                {task.desiredStartTime && <span>⏰ {task.desiredStartTime}</span>}
                                {touchCount > 0 && <span>✨ {touchCount}번</span>}
                                {subTasks.length > 0 && <span>📋({completedSubTasks.length}/{subTasks.length})</span>}
                                {allObstacles.length > 0 && <span>🚧({allObstacles.length})</span>}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    )}
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
                          opacity: 1,
                          pointerEvents: 'auto'
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
      ) : viewMode === 'month' ? (
        <MonthView
          currentDate={currentDate}
          dates={dates}
          selectedSpaceId={selectedSpaceId}
          timerLogs={timerLogs}
          expandedDays={expandedDays}
          setExpandedDays={setExpandedDays}
          setCurrentDate={setCurrentDate}
          setViewMode={setViewMode}
        />
      ) : null}
    </div>
  );
}

export default App;
