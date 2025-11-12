import React, { useState, useEffect, useRef } from 'react';
import Calendar from 'react-calendar';
import 'react-calendar/dist/Calendar.css';
import './App.css';
import { auth, db, googleProvider } from './firebase';
import { signInWithPopup, signOut as firebaseSignOut } from 'firebase/auth';
import { doc, setDoc, getDoc, onSnapshot } from 'firebase/firestore';

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
  const [timerLogs, setTimerLogs] = useState({});
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
  const [showTop6, setShowTop6] = useState(() => {
    const saved = localStorage.getItem('showTop6');
    return saved !== null ? JSON.parse(saved) : true;
  });
  const [contextMenu, setContextMenu] = useState(null);
  const [calendarActiveDate, setCalendarActiveDate] = useState(new Date());

  const [addTop6Popup, setAddTop6Popup] = useState(false);
  const [selectedTop6Ids, setSelectedTop6Ids] = useState([]);
  const [quickStartPopup, setQuickStartPopup] = useState(false);
  const [taskHistoryPopup, setTaskHistoryPopup] = useState(null);
  const [top6TaskIdsBySpace, setTop6TaskIdsBySpace] = useState(() => {
    const saved = localStorage.getItem('top6TaskIdsBySpace');
    return saved ? JSON.parse(saved) : {};
  });
  const [draggedTop6Index, setDraggedTop6Index] = useState(null);
  const [editingTop6Index, setEditingTop6Index] = useState(null);
  const [editingTop6Text, setEditingTop6Text] = useState('');
  const [top6ContextMenu, setTop6ContextMenu] = useState(null);
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
  const [spaceSelectPopup, setSpaceSelectPopup] = useState(false);
  const [editingTaskId, setEditingTaskId] = useState(null);
  const [isMobile, setIsMobile] = useState(false);

  const [passwordPopup, setPasswordPopup] = useState(null);
  const [passwordSetupPopup, setPasswordSetupPopup] = useState(null);
  const [backupHistoryPopup, setBackupHistoryPopup] = useState(null);
  const [dateChangePopup, setDateChangePopup] = useState(null);
  const skipFirebaseSave = useRef(false);
  const newlyCreatedTaskId = useRef(null);

  useEffect(() => {
    if (selectedSpaceId && passwordPopup && passwordPopup.spaceId === selectedSpaceId) {
      setPasswordPopup(null);
    }
  }, [selectedSpaceId, passwordPopup]);

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
    const checkMobile = () => {
      setIsMobile('ontouchstart' in window && window.innerWidth < 768);
    };
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
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
      window.removeEventListener('resize', checkMobile);
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
          if (data.top6TaskIdsBySpace) {
            setTop6TaskIdsBySpace(data.top6TaskIdsBySpace);
            localStorage.setItem('top6TaskIdsBySpace', JSON.stringify(data.top6TaskIdsBySpace));
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
            if (data.top6TaskIdsBySpace !== undefined) {
              setTop6TaskIdsBySpace(data.top6TaskIdsBySpace);
              localStorage.setItem('top6TaskIdsBySpace', JSON.stringify(data.top6TaskIdsBySpace));
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
          togglToken,
          top6TaskIdsBySpace
        };
        
        backupHistory.unshift(newBackup);
        if (backupHistory.length > 10) backupHistory.splice(10);
        
        setDoc(docRef, { 
          workspaces: { default: { dates } },
          spaces, 
          togglToken,
          top6TaskIdsBySpace,
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
  }, [dates, user, useFirebase, spaces, selectedSpaceId, togglToken, top6TaskIdsBySpace, quickTimer, quickTimerTaskId]);

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

    saveTasks(newDates);
    console.log('[Enter] saveTasks 완료');
    
    console.log('[Enter] requestAnimationFrame 1');
    requestAnimationFrame(() => {
      console.log('[Enter] requestAnimationFrame 2');
      requestAnimationFrame(() => {
        console.log('[Enter] 포커스 시도');
        const textarea = document.querySelector(`textarea[data-task-id="${newTask.id}"]`);
        console.log('[Enter] textarea 찾음:', !!textarea);
        if (textarea) {
          textarea.focus({ preventScroll: true });
          try { textarea.setSelectionRange(0, 0); } catch (_) {}
          console.log('[Enter] 포커스 완료, activeElement:', document.activeElement.getAttribute('data-task-id'));
        }
        console.log('[Enter] 끝');
      });
    });
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

  const moveTask = (dateKey, taskId, direction) => {
    console.log('moveTask 호출:', { taskId, direction });
    const activeInput = document.activeElement;
    const caret = (activeInput && activeInput.tagName === 'TEXTAREA') ? activeInput.selectionStart : 0;
    
    focusKeyboardGuard();
    
    // 1min timer 방식: 스크롤 위치 저장 (지우기 전에 1min timer 확인 필수)
    const prevScrollTop = window.scrollY;
    
    const newDates = { ...dates };
    const tasks = newDates[dateKey];
    console.log('selectedTasks.length:', selectedTasks.length, 'selectedTasks:', selectedTasks);
    
    if (selectedTasks.length > 0) {
      console.log('다중 선택 분기');
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
      console.log('단일 작업: idx =', idx, 'taskId =', taskId, 'tasks.length =', tasks.length);
      const task = tasks[idx];
      if (task) {
        console.log('작업:', task.text, 'indentLevel:', task.indentLevel);
        if (direction === 'indent') {
          task.indentLevel = (task.indentLevel || 0) + 1;
        } else if (direction === 'outdent' && task.indentLevel > 0) {
          task.indentLevel -= 1;
        }
        console.log('변경 후:', task.indentLevel);
      }
    }
    
    saveTasks(newDates);
    
    setTimeout(() => {
      window.scrollTo(0, prevScrollTop);
      const textarea = document.querySelector(`textarea[data-task-id="${taskId}"]`);
      if (textarea && activeInput && activeInput.tagName === 'TEXTAREA') {
        textarea.focus({ preventScroll: true });
        try { textarea.setSelectionRange(caret, caret); } catch (_) {}
      }
      setEditingTaskId(taskId);
    }, 0);
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
      
      if (togglToken && togglEntryId) {
        const stopToggl = async (retryCount = 0) => {
          try {
            const stopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${togglEntryId}`, {
              method: 'PATCH',
              headers: { 'Content-Type': 'application/json' }
            });
            if (!stopRes.ok) {
              throw new Error('Toggl 종료 실패');
            }
            const newEntries = { ...togglEntries };
            delete newEntries[key];
            setTogglEntries(newEntries);
          } catch (err) {
            console.error(`Toggl 종료 실패 (시도 ${retryCount + 1}/3):`, err);
            if (retryCount < 2) {
              setTimeout(() => stopToggl(retryCount + 1), 2000);
            } else {
              console.log('Toggl 강제 종료 시도');
              try {
                const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, { method: 'GET' });
                const currentData = await currentRes.json();
                if (currentRes.ok && currentData && currentData.id) {
                  await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, { method: 'PATCH' });
                }
              } catch (forceErr) {
                console.error('Toggl 강제 종료 실패:', forceErr);
              }
            }
          }
        };
        stopToggl();
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
          const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
            method: 'GET'
          });
          const currentData = await currentRes.json();
          if (currentRes.ok && currentData && currentData.id) {
            await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
              method: 'PATCH'
            });
          }
          
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
            alert('Toggl 연동 실패: ' + (data.error || JSON.stringify(data)));
          } else {
            setTogglEntries({ ...togglEntries, [key]: data.id });
          }
        } catch (err) {
          console.error('Toggl 시작 실패:', err);
        }
      }
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







  const getTaskStats = (dateKey) => {

    const tasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId);
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

  const getStreak = (taskText) => {
    if (!taskText) return 0;
    let streak = 0;
    const today = new Date();
    for (let i = 0; i < 365; i++) {
      const checkDate = new Date(today);
      checkDate.setDate(today.getDate() - i);
      const key = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
      const dayTasks = dates[key] || [];
      const found = dayTasks.find(t => t.text === taskText && t.completed);
      if (found) {
        streak++;
      } else {
        break;
      }
    }
    return streak;
  };

  useEffect(() => {
    localStorage.setItem('top6TaskIdsBySpace', JSON.stringify(top6TaskIdsBySpace));
  }, [top6TaskIdsBySpace]);

  useEffect(() => {
    localStorage.setItem('showTop6', JSON.stringify(showTop6));
  }, [showTop6]);

  const getTop6Tasks = () => {
    const key = `${dateKey}-${selectedSpaceId}`;
    const currentSpaceIds = top6TaskIdsBySpace[key] || [];
    const todayTasks = dates[dateKey] || [];
    return currentSpaceIds.map(id => todayTasks.find(t => t.id === id && (t.spaceId || 'default') === selectedSpaceId)).filter(t => t);
  };

  const toggleTop6 = (taskId) => {
    const key = `${dateKey}-${selectedSpaceId}`;
    if ((top6TaskIdsBySpace[key] || []).includes(taskId)) {
      setTop6TaskIdsBySpace({ ...top6TaskIdsBySpace, [key]: (top6TaskIdsBySpace[key] || []).filter(id => id !== taskId) });
    } else if ((top6TaskIdsBySpace[key] || []).length < 6) {
      setTop6TaskIdsBySpace({ ...top6TaskIdsBySpace, [key]: [...(top6TaskIdsBySpace[key] || []), taskId] });
    }
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
            console.error('Toggl 저장 실패:', await res.json());
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
              console.error('Toggl 저장 실패:', await res.json());
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
            console.error('Toggl 저장 실패:', await res.json());
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
            console.error('Toggl 저장 실패:', await res.json());
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
    const tasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId);
    return tasks.filter(t => t.completed).map(t => {
      const logs = timerLogs[dateKey] || [];
      const taskLogs = logs.filter(log => log.taskName === t.text);
      const lastLog = taskLogs[taskLogs.length - 1];
      let time;
      let originalDate = null;
      if (lastLog) {
        time = new Date(lastLog.endTime);
      } else if (t.completedAt) {
        time = new Date(t.completedAt);
      } else {
        time = new Date();
      }
      const timeDate = `${time.getFullYear()}-${String(time.getMonth() + 1).padStart(2, '0')}-${String(time.getDate()).padStart(2, '0')}`;
      if (timeDate !== dateKey) originalDate = timeDate;
      return {
        ...t,
        completedTime: `${String(time.getHours()).padStart(2, '0')}:${String(time.getMinutes()).padStart(2, '0')}`,
        originalDate,
        sortTime: time.getTime()
      };
    }).sort((a, b) => a.sortTime - b.sortTime);
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
        if (data.top6TaskIdsBySpace) setTop6TaskIdsBySpace(data.top6TaskIdsBySpace);
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
          if (data.top6TaskIdsBySpace !== undefined) setTop6TaskIdsBySpace(data.top6TaskIdsBySpace);
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
        top6TaskIdsBySpace
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
          if (data.top6TaskIdsBySpace) setTop6TaskIdsBySpace(data.top6TaskIdsBySpace);
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
    if (backup.top6TaskIdsBySpace) setTop6TaskIdsBySpace(backup.top6TaskIdsBySpace);
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
      {quickStartPopup && (
        <div className="popup-overlay" onClick={() => setQuickStartPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>⏱️ 작업 선택</h3>
            <button onClick={() => setQuickStartPopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {(() => {
                const tasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId);
                if (tasks.length === 0) {
                  return <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>작업이 없습니다.</p>;
                }
                return tasks.map(task => {
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
      {addTop6Popup && (
        <div className="popup-overlay" onClick={() => { setAddTop6Popup(false); setSelectedTop6Ids([]); }}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
            <h3>📋 오늘 달성할 것 선택</h3>
            <button onClick={() => { setAddTop6Popup(false); setSelectedTop6Ids([]); }} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div style={{ maxHeight: '400px', overflowY: 'auto', marginBottom: '10px' }}>
              {(() => {
                const key = `${dateKey}-${selectedSpaceId}`;
                const tasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId && !(top6TaskIdsBySpace[key] || []).includes(t.id));
                if (tasks.length === 0) {
                  return <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>추가할 작업이 없습니다.</p>;
                }
                return tasks.map(task => {
                  const key = `${dateKey}-${selectedSpaceId}`;
                  const isSelected = selectedTop6Ids.includes(task.id);
                  const currentTotal = (top6TaskIdsBySpace[key] || []).length + selectedTop6Ids.filter(id => !(top6TaskIdsBySpace[key] || []).includes(id)).length;
                  const canSelect = isSelected || currentTotal < 6;
                  return (
                    <div 
                      key={task.id} 
                      style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '8px', 
                        padding: '8px', 
                        marginBottom: '4px', 
                        background: 'rgba(255,255,255,0.03)', 
                        borderRadius: '4px', 
                        cursor: canSelect ? 'pointer' : 'not-allowed',
                        opacity: canSelect ? 1 : 0.5,
                        fontSize: '14px' 
                      }} 
                      onClick={() => {
                        if (!canSelect) return;
                        if (isSelected) {
                          setSelectedTop6Ids(selectedTop6Ids.filter(id => id !== task.id));
                        } else {
                          setSelectedTop6Ids([...selectedTop6Ids, task.id]);
                        }
                      }}
                    >
                      <input type="checkbox" checked={isSelected} readOnly style={{ cursor: canSelect ? 'pointer' : 'not-allowed' }} />
                      <span style={{ flex: 1, textAlign: 'left' }}>{task.text || '(제목 없음)'}</span>
                    </div>
                  );
                });
              })()}
            </div>
            <div className="popup-buttons">
              <button onClick={() => {
                const key = `${dateKey}-${selectedSpaceId}`;
                setTop6TaskIdsBySpace({ ...top6TaskIdsBySpace, [key]: [...(top6TaskIdsBySpace[key] || []), ...selectedTop6Ids] });
                setAddTop6Popup(false);
                setSelectedTop6Ids([]);
              }}>확인</button>
              <button onClick={() => { setAddTop6Popup(false); setSelectedTop6Ids([]); }}>취소</button>
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
                  
                  let subTasks = [];
                  if (task && taskIdx !== -1) {
                    const baseLevel = task.indentLevel || 0;
                    for (let j = taskIdx + 1; j < dayTasks.length; j++) {
                      const nextTask = dayTasks[j];
                      if ((nextTask.indentLevel || 0) <= baseLevel) break;
                      subTasks.push(nextTask);
                    }
                  }
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
                    const dayTasks = dates[dateKey] || [];
                    const taskIdx = dayTasks.findIndex(t => t.text === taskHistoryPopup.taskName);
                    let subTasks = [];
                    if (taskIdx !== -1) {
                      const baseLevel = task.indentLevel || 0;
                      for (let j = taskIdx + 1; j < dayTasks.length; j++) {
                        const nextTask = dayTasks[j];
                        if ((nextTask.indentLevel || 0) <= baseLevel) break;
                        subTasks.push(nextTask);
                      }
                    }
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
                            {subTasks.map((sub, idx) => (
                              <div key={sub.id} style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '11px', marginBottom: '2px' }}>
                                <input
                                  type="checkbox"
                                  checked={sub.completed}
                                  onChange={(e) => updateTask(dateKey, [sub.id], 'completed', e.target.checked)}
                                  style={{ width: '12px', height: '12px' }}
                                />
                                <input
                                  type="text"
                                  value={sub.text}
                                  onChange={(e) => updateTask(dateKey, [sub.id], 'text', e.target.value)}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      e.preventDefault();
                                      const newDates = { ...dates };
                                      const newTask = {
                                        id: Date.now(),
                                        text: '',
                                        todayTime: 0,
                                        totalTime: 0,
                                        todayGoal: 0,
                                        totalGoal: 0,
                                        completed: false,
                                        indentLevel: sub.indentLevel || 0,
                                        spaceId: sub.spaceId || 'default'
                                      };
                                      const taskIdx = newDates[dateKey].findIndex(t => t.id === sub.id);
                                      newDates[dateKey].splice(taskIdx + 1, 0, newTask);
                                      setDates(newDates);
                                      saveTasks(newDates);
                                    } else if (e.key === 'Backspace') {
                                      const { selectionStart, selectionEnd, value } = e.target;
                                      if (selectionStart === 0 && selectionEnd === 0 && value === '') {
                                        e.preventDefault();
                                        const newDates = { ...dates };
                                        const taskIdx = newDates[dateKey].findIndex(t => t.id === sub.id);
                                        if (taskIdx !== -1) {
                                          newDates[dateKey].splice(taskIdx, 1);
                                          setDates(newDates);
                                          saveTasks(newDates);
                                        }
                                      }
                                    } else if (e.key === 'ArrowUp') {
                                      e.preventDefault();
                                      if (idx > 0) {
                                        const prevSub = subTasks[idx - 1];
                                        const input = e.target.parentElement.parentElement.querySelector(`input[data-sub-id="${prevSub.id}"]`);
                                        if (input) input.focus();
                                      }
                                    } else if (e.key === 'ArrowDown') {
                                      e.preventDefault();
                                      if (idx < subTasks.length - 1) {
                                        const nextSub = subTasks[idx + 1];
                                        const input = e.target.parentElement.parentElement.querySelector(`input[data-sub-id="${nextSub.id}"]`);
                                        if (input) input.focus();
                                      }
                                    }
                                  }}
                                  data-sub-id={sub.id}
                                  style={{ flex: 1, background: 'transparent', border: 'none', color: sub.completed ? '#4CAF50' : '#888', fontSize: '11px', padding: '2px' }}
                                />
                              </div>
                            ))}
                            <button
                              onClick={() => {
                                const newDates = { ...dates };
                                const newTask = {
                                  id: Date.now(),
                                  text: '',
                                  todayTime: 0,
                                  totalTime: 0,
                                  todayGoal: 0,
                                  totalGoal: 0,
                                  completed: false,
                                  indentLevel: (task.indentLevel || 0) + 1,
                                  spaceId: task.spaceId || 'default'
                                };
                                newDates[dateKey].splice(taskIdx + subTasks.length + 1, 0, newTask);
                                setDates(newDates);
                                saveTasks(newDates);
                              }}
                              style={{ marginTop: '4px', padding: '2px 6px', fontSize: '10px', background: '#4CAF50', color: 'white', border: 'none', borderRadius: '3px', cursor: 'pointer' }}
                            >
                              + 하위할일 추가
                            </button>
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



      {top6ContextMenu && (
        <>
          <div className="popup-overlay" onClick={() => setTop6ContextMenu(null)} onContextMenu={(e) => e.preventDefault()} />
          <div 
            className="context-menu" 
            style={{ 
              position: 'fixed', 
              left: top6ContextMenu.x, 
              top: top6ContextMenu.y,
              zIndex: 10002
            }}
          >
            <div 
              className="context-menu-item" 
              onClick={() => {
                const key = `${dateKey}-${selectedSpaceId}`;
                setTop6TaskIdsBySpace({ ...top6TaskIdsBySpace, [key]: (top6TaskIdsBySpace[key] || []).filter(id => id !== top6ContextMenu.taskId) });
                setTop6ContextMenu(null);
              }}
              onContextMenu={(e) => e.preventDefault()}
            >
              ✕ 오늘 달성에서 제거
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
        <div className="popup-overlay" onClick={() => setTrashPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()}>
            <h3>🗑️ 휴지통 ({trash.length})</h3>
            <button onClick={() => setTrashPopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            {trash.length > 0 ? (
              <>
                <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '10px' }}>
                  {trash.map((item, idx) => (
                    <div key={idx} style={{ display: 'flex', gap: '5px', marginBottom: '5px', fontSize: '12px', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.task.text || '(제목 없음)'}</span>
                      <button onClick={() => restoreFromTrash(idx)} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>↶</button>
                    </div>
                  ))}
                </div>
                <div className="settings-section" style={{ borderBottom: 'none', paddingBottom: '0', display: 'flex', gap: '5px' }}>
                  <button onClick={() => { if (window.confirm('휴지통을 비우시겠습니까?')) emptyTrash(); }} className="settings-btn" style={{ background: '#dc3545' }}>비우기</button>
                  <button onClick={() => setTrashPopup(false)} className="settings-btn">닫기</button>
                </div>
              </>
            ) : (
              <>
                <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>휴지통이 비어있습니다.</p>
                <div className="settings-section" style={{ borderBottom: 'none', paddingBottom: '0' }}>
                  <button onClick={() => setTrashPopup(false)} className="settings-btn">닫기</button>
                </div>
              </>
            )}
          </div>
        </div>
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
        <div className="popup-overlay" onClick={() => setSpacePopup(false)}>
          <div className="popup settings-popup" onClick={(e) => e.stopPropagation()}>
            <h3>📁 공간 관리</h3>
            <button onClick={() => setSpacePopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <div className="settings-section">
              {spaces.map(space => (
                <div key={space.id} style={{ display: 'flex', gap: '5px', marginBottom: '8px', alignItems: 'center' }}>
                  <span style={{ flex: 1, fontSize: '14px' }}>{space.name}{localPasswords[space.id] && ' 🔒'}</span>
                  <button onClick={() => { setSpacePopup(false); setTimeout(() => renameSpace(space.id), 100); }} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0 }}>✎</button>
                  <button onClick={() => { setSpacePopup(false); setTimeout(() => changeSpacePassword(space.id), 100); }} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0 }}>🔒</button>
                  <button onClick={() => deleteSpace(space.id)} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0 }}>×</button>
                </div>
              ))}
            </div>
            <div className="settings-section" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <button onClick={() => { setSpacePopup(false); setTimeout(() => addSpace(), 100); }} className="settings-btn">+ 새 공간</button>
            </div>
          </div>
        </div>
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
        <div className="popup-overlay" onClick={() => setSettingsPopup(false)}>
          <div className="popup settings-popup" onClick={(e) => e.stopPropagation()}>
            <h3>⚙️ 설정</h3>
            <button onClick={() => setSettingsPopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>

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
              <h4>☁️ 클라우드 백업 {user && isSyncing && <span style={{ fontSize: '14px', marginLeft: '5px', color: '#4ade80' }}>●</span>}</h4>
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
              <h4>⏱️ Toggl 연동 {togglToken && Object.values(togglEntries).length > 0 && <span style={{ fontSize: '14px', marginLeft: '5px', color: '#4ade80' }}>●</span>}</h4>
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
                  const s = getTaskStats(key);
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
                onClick={quickTimer ? stopQuickTimer : startQuickTimer}
                style={{ 
                  padding: '16px 48px', 
                  background: quickTimer ? '#dc3545' : '#4CAF50', 
                  color: 'white', 
                  border: 'none', 
                  borderRadius: '12px', 
                  cursor: 'pointer', 
                  fontSize: '18px', 
                  fontWeight: 'bold',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)'
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
                  ✕
                </button>
              )}
            </div>
            <div style={{ width: '100%', maxWidth: '600px', display: 'flex', gap: '8px', alignItems: 'center' }}>
              <input
                type="text"
                value={quickTimerText}
                onChange={(e) => setQuickTimerText(e.target.value)}
                placeholder="지금 뭐 하고 있나요?"
                style={{
                  flex: 1,
                  padding: '8px 12px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'inherit',
                  outline: 'none',
                  textAlign: 'left',
                  boxSizing: 'border-box'
                }}
              />
              <button
                onClick={() => setQuickStartPopup(true)}
                style={{
                  padding: '8px 16px',
                  fontSize: '14px',
                  borderRadius: '8px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.05)',
                  color: 'inherit',
                  cursor: 'pointer'
                }}
              >
                +
              </button>
            </div>

          </div>

          <div className="top6-view">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '10px' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                <h3 style={{ margin: 0 }}>📋 오늘 달성할 것들</h3>
                <span style={{ fontSize: '14px', color: '#888' }}>{getTop6Tasks().filter(t => t.completed).length}/6 ({Math.round(getTop6Tasks().filter(t => t.completed).length / 6 * 100)}%)</span>
              </div>
              <button onClick={() => setShowTop6(!showTop6)} style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '16px' }}>
                {showTop6 ? '▲' : '▼'}
              </button>
            </div>
            {showTop6 && (
            <>
            <div className="top6-progress">
              {Array.from({ length: 6 }, (_, i) => {
                const task = getTop6Tasks()[i];
                if (task) {
                  const streak = getStreak(task.text);
                  return (
                    <div 
                      key={task.id} 
                      className={`top6-item ${task.completed ? 'completed' : ''}`}
                      draggable
                      onDragStart={(e) => {
                        e.dataTransfer.effectAllowed = 'move';
                        setDraggedTop6Index(i);
                      }}
                      onDragOver={(e) => {
                        e.preventDefault();
                        e.dataTransfer.dropEffect = 'move';
                      }}
                      onDrop={(e) => {
                        e.preventDefault();
                        if (draggedTop6Index !== null && draggedTop6Index !== i) {
                          const key = `${dateKey}-${selectedSpaceId}`;
                          const currentIds = top6TaskIdsBySpace[key] || [];
                          const newIds = [...currentIds];
                          const [movedId] = newIds.splice(draggedTop6Index, 1);
                          newIds.splice(i, 0, movedId);
                          setTop6TaskIdsBySpace({ ...top6TaskIdsBySpace, [key]: newIds });
                          setDraggedTop6Index(null);
                        }
                      }}
                      onDragEnd={() => setDraggedTop6Index(null)}
                      onContextMenu={(e) => {
                        e.preventDefault();
                        const menuHeight = 60;
                        const menuWidth = 150;
                        let x = e.clientX;
                        let y = e.clientY;
                        if (y + menuHeight > window.innerHeight) y = window.innerHeight - menuHeight - 10;
                        if (x + menuWidth > window.innerWidth) x = window.innerWidth - menuWidth - 10;
                        setTop6ContextMenu({ x, y, taskId: task.id });
                      }}
                    >
                      <input
                        type="checkbox"
                        checked={task.completed}
                        onChange={(e) => updateTask(dateKey, [task.id], 'completed', e.target.checked)}
                      />
                      <textarea
                        value={task.text}
                        onChange={(e) => {
                          updateTask(dateKey, [task.id], 'text', e.target.value);
                          e.target.style.height = 'auto';
                          e.target.style.height = e.target.scrollHeight + 'px';
                        }}
                        rows={1}
                        style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontSize: '15px', resize: 'none', overflow: 'hidden', padding: '0 4px', lineHeight: '24px', minHeight: '24px' }}
                      />
                      {streak > 1 && <span className="streak">🔥 {streak}일</span>}
                      <span className="top6-remove" onClick={(e) => {
                        e.stopPropagation();
                        const key = `${dateKey}-${selectedSpaceId}`;
                        setTop6TaskIdsBySpace({ ...top6TaskIdsBySpace, [key]: (top6TaskIdsBySpace[key] || []).filter(id => id !== task.id) });
                      }}>✕</span>
                    </div>
                  );
                } else {
                  if (editingTop6Index === i) {
                    return (
                      <div key={`empty-${i}`} className="top6-item empty">
                        <input type="checkbox" disabled />
                        <textarea
                          value={editingTop6Text}
                          onChange={(e) => {
                            setEditingTop6Text(e.target.value);
                            e.target.style.height = 'auto';
                            e.target.style.height = e.target.scrollHeight + 'px';
                          }}
                          onBlur={() => {
                            if (editingTop6Text.trim()) {
                              const newDates = { ...dates };
                              if (!newDates[dateKey]) newDates[dateKey] = [];
                              const newTask = {
                                id: Date.now(),
                                text: editingTop6Text.trim(),
                                todayTime: 0,
                                totalTime: 0,
                                todayGoal: 0,
                                totalGoal: 0,
                                completed: false,
                                indentLevel: 0,
                                spaceId: selectedSpaceId || 'default'
                              };
                              newDates[dateKey].push(newTask);
                              setDates(newDates);
                              saveTasks(newDates);
                              const key = `${dateKey}-${selectedSpaceId}`;
                              setTop6TaskIdsBySpace({ ...top6TaskIdsBySpace, [key]: [...(top6TaskIdsBySpace[key] || []), newTask.id] });
                            }
                            setEditingTop6Index(null);
                            setEditingTop6Text('');
                          }}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') {
                              e.preventDefault();
                              e.target.blur();
                            } else if (e.key === 'Escape') {
                              setEditingTop6Index(null);
                              setEditingTop6Text('');
                            }
                          }}
                          autoFocus
                          placeholder="할 일 입력"
                          rows={1}
                          style={{ flex: 1, background: 'transparent', border: 'none', outline: 'none', color: 'inherit', fontSize: '15px', resize: 'none', overflow: 'hidden', padding: '0 4px', lineHeight: '24px', minHeight: '24px' }}
                        />
                      </div>
                    );
                  }
                  return (
                    <div 
                      key={`empty-${i}`} 
                      className="top6-item empty"
                      onClick={() => {
                        setEditingTop6Index(i);
                        setEditingTop6Text('');
                      }}
                      style={{ cursor: 'pointer' }}
                    >
                      <input type="checkbox" disabled />
                      <span className="top6-text" style={{ opacity: 0.3 }}>+</span>
                    </div>
                  );
                }
              })}
            </div>
            <div className="top6-stats" onClick={() => setAddTop6Popup(true)} style={{ cursor: 'pointer', padding: '8px' }}>
              +
            </div>
            </>
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

          <div className="completed-timeline">
            <h3>✓ 오늘 한 것들</h3>
            <div className="timeline-items">
              {getTodayCompletedTasks().length > 0 ? (
                getTodayCompletedTasks().map((task) => {
                  const streak = getStreak(task.text);
                  return (
                    <div key={task.id} className="timeline-item-compact">
                      <span className="timeline-time">{task.completedTime}</span>
                      {streak > 1 && <span className="streak">🔥 {streak}일</span>}
                      <span className="timeline-task-name">{task.text}</span>
                      {task.originalDate && <span className="timeline-original-date">({task.originalDate})</span>}
                    </div>
                  );
                })
              ) : (
                <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '0 0 8px 0', margin: '0' }}>완료된 작업이 없습니다</p>
              )}
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '16px', padding: '20px 0' }}>
            {dates[dateKey]?.filter(t => (t.spaceId || 'default') === selectedSpaceId).map((task) => {
              const timerKey = `${dateKey}-${task.id}`;
              const seconds = timerSeconds[timerKey] || 0;
              const allTaskLogs = Object.values(timerLogs).flat().filter(log => log.taskName === task.text);
              const touchCount = allTaskLogs.length;
              const isRunning = activeTimers[timerKey];
              
              return (
                <div 
                  key={task.id}
                  onClick={() => toggleTimer(dateKey, [task.id])}
                  style={{
                    background: 'white',
                    borderRadius: '16px',
                    padding: '20px',
                    boxShadow: isRunning ? '0 8px 24px rgba(255,215,0,0.4)' : '0 4px 12px rgba(0,0,0,0.08)',
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    border: isRunning ? '2px solid #FFD700' : '2px solid transparent'
                  }}
                >
                  <div style={{ fontSize: '18px', fontWeight: '600', marginBottom: '12px', color: '#333' }}>{task.text || '원하는 것'}</div>
                  <div style={{ display: 'flex', gap: '12px', fontSize: '14px', color: '#666' }}>
                    <span>오늘 {formatTime(task.todayTime + (isRunning ? seconds : 0))}</span>
                    <span>총 {formatTime(task.totalTime)}</span>
                  </div>
                  {touchCount > 0 && (
                    <div style={{ marginTop: '8px', fontSize: '13px', color: '#888' }}>✨ {touchCount}번의 손길</div>
                  )}
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
      {isMobile && editingTaskId && (() => {
        const task = dates[dateKey]?.find(t => t.id === editingTaskId);
        const timerKey = `${dateKey}-${editingTaskId}`;
        const seconds = timerSeconds[timerKey] || 0;
        const showMoreMenu = contextMenu && contextMenu.taskId === editingTaskId;
        return (
          <div className="keyboard-menu">
            {showMoreMenu ? (
              <>
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleTop6(editingTaskId);
                    setContextMenu(null);
                    setTimeout(() => {
                      const textarea = document.querySelector(`textarea[data-task-id="${editingTaskId}"]`);
                      if (textarea) textarea.focus({ preventScroll: true });
                    }, 0);
                  }}
                >
                  ⭐
                </button>
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    if (task && task.text) {
                      setTaskHistoryPopup({ taskName: task.text });
                    }
                    setContextMenu(null);
                  }}
                >
                  📊
                </button>
                {task && (task.indentLevel || 0) > 0 && (
                  <>
                    <button 
                      className="keyboard-menu-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        const newType = task.type === 'habit' ? 'task' : 'habit';
                        updateTask(dateKey, [task.id], 'type', newType);
                        setContextMenu(null);
                        setTimeout(() => {
                          const textarea = document.querySelector(`textarea[data-task-id="${editingTaskId}"]`);
                          if (textarea) textarea.focus({ preventScroll: true });
                        }, 0);
                      }}
                    >
                      🔄
                    </button>
                    <button 
                      className="keyboard-menu-btn"
                      onMouseDown={(e) => e.preventDefault()}
                      onClick={(e) => {
                        e.preventDefault();
                        const newType = task.type === 'environment' ? 'task' : 'environment';
                        updateTask(dateKey, [task.id], 'type', newType);
                        setContextMenu(null);
                        setTimeout(() => {
                          const textarea = document.querySelector(`textarea[data-task-id="${editingTaskId}"]`);
                          if (textarea) textarea.focus({ preventScroll: true });
                        }, 0);
                      }}
                    >
                      🌍
                    </button>
                  </>
                )}
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setDateChangePopup({ dateKey, taskId: editingTaskId });
                    setContextMenu(null);
                  }}
                >
                  📅
                </button>
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setContextMenu(null);
                    setTimeout(() => {
                      const textarea = document.querySelector(`textarea[data-task-id="${editingTaskId}"]`);
                      if (textarea) textarea.focus({ preventScroll: true });
                    }, 0);
                  }}
                >
                  ✕
                </button>
              </>
            ) : (
              <>
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    if (task) {
                      setTimePopup({ dateKey, path: [task.id], type: 'today', time: task.todayTime });
                    }
                  }}
                >
                  📅 {task && formatTime(task.todayTime + (activeTimers[timerKey] ? seconds : 0))}
                </button>
                {task && task.totalTime > task.todayTime && (
                  <button 
                    className="keyboard-menu-btn"
                    onMouseDown={(e) => e.preventDefault()}
                    onClick={(e) => {
                      e.preventDefault();
                      setTimePopup({ dateKey, path: [task.id], type: 'total', time: task.totalTime });
                    }}
                  >
                    ⏱️ {formatTime(task.totalTime)}
                  </button>
                )}
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    if (task) {
                      setGoalPopup({ dateKey, path: [task.id], todayGoal: task.todayGoal, totalGoal: task.totalGoal });
                    }
                  }}
                >
                  🎯
                </button>
                <button 
                  className="keyboard-menu-btn timer"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    toggleTimer(dateKey, [editingTaskId]);
                    setTimeout(() => {
                      const textarea = document.querySelector(`textarea[data-task-id="${editingTaskId}"]`);
                      if (textarea) textarea.focus({ preventScroll: true });
                    }, 0);
                  }}
                >
                  {activeTimers[timerKey] ? '⏸' : '▶'}
                </button>
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    moveTask(dateKey, editingTaskId, 'indent');
                  }}
                >
                  &gt;
                </button>
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    moveTask(dateKey, editingTaskId, 'outdent');
                  }}
                >
                  &lt;
                </button>
                <button 
                  className="keyboard-menu-btn"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    setContextMenu({ x: 0, y: 0, taskId: editingTaskId, dateKey, isBottomMenu: true });
                    setTimeout(() => {
                      const textarea = document.querySelector(`textarea[data-task-id="${editingTaskId}"]`);
                      if (textarea) textarea.focus({ preventScroll: true });
                    }, 0);
                  }}
                >
                  ⋯
                </button>
                <button 
                  className="keyboard-menu-btn delete"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={(e) => {
                    e.preventDefault();
                    if (window.confirm(`"${task?.text || '(제목 없음)'}" 삭제하시겠습니까?`)) {
                      deleteTask(dateKey, editingTaskId);
                      setEditingTaskId(null);
                    }
                  }}
                >
                  🗑
                </button>
              </>
            )}
          </div>
        );
      })()}
    </div>
  );
}

export default App;
