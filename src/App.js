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
import { QuickStartPopup, QuickTimerPopup, PasswordSetupPopup, BackupHistoryPopup, DateChangePopup, ReasonPopup } from './components/SmallPopups';
import TaskCard from './components/TaskCard';
import TaskDetailPopup from './components/TaskDetailPopup';
import { useTimer } from './hooks/useTimer';
import { useLevelSystem } from './hooks/useLevelSystem';
import UniversalTimePicker from './components/common/UniversalTimePicker';
import HabitDashboard from './components/features/HabitDashboard';

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
  const levelStatus = useLevelSystem(timerLogs);
  const [goalPopup, setGoalPopup] = useState(null);
  const [taskHistory, setTaskHistory] = useState(() => {
    const saved = localStorage.getItem('taskHistory');
    return saved ? JSON.parse(saved) : {};
  });

  const [timePopup, setTimePopup] = useState(null);
  const [logEditPopup, setLogEditPopup] = useState(null);
  const [togglToken, setTogglToken] = useState('');
  const [levelPopup, setLevelPopup] = useState(false);
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
  const [editingOriginalText, setEditingOriginalText] = useState('');
  const [autocompleteData, setAutocompleteData] = useState({});
  const [subTaskSelectPopup, setSubTaskSelectPopup] = useState(null);
  const [currentSubTasks, setCurrentSubTasks] = useState({});
  const [passwordPopup, setPasswordPopup] = useState(null);
  const [passwordSetupPopup, setPasswordSetupPopup] = useState(null);
  const [backupHistoryPopup, setBackupHistoryPopup] = useState(null);
  const [dateChangePopup, setDateChangePopup] = useState(null);
  const [reasonPopup, setReasonPopup] = useState(null);
  const [reorderMode, setReorderMode] = useState(false);
  const [taskDetailPopup, setTaskDetailPopup] = useState(null);
  const skipFirebaseSave = useRef(false);
  const newlyCreatedTaskId = useRef(null);
  const newlyCreatedTasks = useRef(new Set());
  
  // 프로토콜 시스템 상태
  const [activeProtocol, setActiveProtocol] = useState(null);
  const [currentStep, setCurrentStep] = useState(0);
  const [timeLeft, setTimeLeft] = useState(0);
  const [protocolGoal, setProtocolGoal] = useState('');
  const [protocolAction, setProtocolAction] = useState('');
  const [awakenMethod, setAwakenMethod] = useState(() => {
    const saved = localStorage.getItem('awakenMethod');
    return saved || 'water';
  });
  const [protocolStats, setProtocolStats] = useState(() => {
    const saved = localStorage.getItem('protocolStats');
    return saved ? JSON.parse(saved) : { streak: 0, totalDays: 0, totalMinutes: 0, lastDate: null };
  });
  const [conditionPopup, setConditionPopup] = useState(false);
  const [protocolMode, setProtocolMode] = useState('normal');
  const [cruiseControlPopup, setCruiseControlPopup] = useState(false);
  const [isProtocolReviewing, setIsProtocolReviewing] = useState(false);
  const [reviewData, setReviewData] = useState({ obstacle: '', improvement: '' });
  
  // 젠 모드 상태
  const [isZenMode, setIsZenMode] = useState(false);
  const [zenSetupPopup, setZenSetupPopup] = useState(false);
  const initialZenTimeRef = useRef(0);

  const [habits, setHabits] = useState(() => {
    const saved = localStorage.getItem('habits');
    if (saved) {
      const parsed = JSON.parse(saved);
      return parsed.map(h => ({ ...h, spaceId: h.spaceId || 'default' }));
    }
    return [];
  });
  
  const [habitLogs, setHabitLogs] = useState(() => {
    const saved = localStorage.getItem('habitLogs');
    return saved ? JSON.parse(saved) : {};
  });

  const [showHabitDashboard, setShowHabitDashboard] = useState(() => {
    return localStorage.getItem('showHabitDashboard') === 'true';
  });

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
    const handleClick = (e) => {
      if (contextMenu && !e.target.closest('.context-menu')) {
        setContextMenu(null);
      }
    };
    document.addEventListener('click', handleClick);
    return () => document.removeEventListener('click', handleClick);
  }, [contextMenu]);

  useEffect(() => {
    const handleGlobalKeyDown = (e) => {
      if (e.key === 'Escape') {
        // 1순위: 컨텍스트 메뉴 (최상위)
        if (contextMenu) { setContextMenu(null); return; }
        if (spaceSelectPopup) { setSpaceSelectPopup(false); return; }

        // 2순위: 자식 팝업 (카드 상세 위에서 뜬 기능 팝업들)
        if (subTasksPopup) { setSubTasksPopup(null); return; }
        if (obstaclePopup) { setObstaclePopup(null); return; }
        if (timeEditPopup) { setTimeEditPopup(null); return; }
        if (timePopup) { setTimePopup(null); return; }
        if (logEditPopup) { setLogEditPopup(null); return; }
        if (goalPopup) { setGoalPopup(null); return; }
        if (taskHistoryPopup) { setTaskHistoryPopup(null); return; }
        if (deleteConfirm) { setDeleteConfirm(null); return; }
        if (subTaskSelectPopup) { setSubTaskSelectPopup(null); return; }
        if (dateChangePopup) { setDateChangePopup(null); return; }
        if (reasonPopup) { setReasonPopup(null); return; }
        if (passwordSetupPopup) { setPasswordSetupPopup(null); return; }
        if (backupHistoryPopup) { setBackupHistoryPopup(null); return; }

        // 3순위: 부모 팝업 (카드 상세)
        if (taskDetailPopup) { setTaskDetailPopup(null); return; }

        // 4순위: 전역 메인 팝업들
        if (quickStartPopup) { setQuickStartPopup(false); return; }
        if (conditionPopup) { setConditionPopup(false); return; }
        if (togglPopup) { setTogglPopup(false); return; }
        if (quickTimerPopup) { setQuickTimerPopup(false); return; }
        if (settingsPopup) { setSettingsPopup(false); return; }
        if (trashPopup) { setTrashPopup(false); return; }
        if (spacePopup) { setSpacePopup(false); return; }
        if (passwordPopup) { setPasswordPopup(null); return; }
        
        // 프로토콜 관련
        if (cruiseControlPopup) { setCruiseControlPopup(false); return; }
        if (isProtocolReviewing) { 
          if(window.confirm('회고를 닫으시겠습니까?')) setIsProtocolReviewing(false);
          return; 
        }
      }
      if (e.key === 'Delete' && !e.ctrlKey && !e.altKey && !e.shiftKey) {
        const activeElement = document.activeElement;
        if (activeElement && activeElement.tagName === 'TEXTAREA') {
          const taskId = parseInt(activeElement.getAttribute('data-task-id'));
          if (taskId && window.confirm('삭제하시겠습니까?')) {
            e.preventDefault();
            deleteTask(dateKey, taskId);
          }
        }
        return;
      }
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
        setViewMode('list');
      } else if (e.ctrlKey && e.key === '2') {
        e.preventDefault();
        setViewMode('all');
      } else if (e.ctrlKey && e.key === '3') {
        e.preventDefault();
        setViewMode('month');
      } else if (e.ctrlKey && e.key === '4') {
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
    window.addEventListener('keydown', handleGlobalKeyDown);
    return () => window.removeEventListener('keydown', handleGlobalKeyDown, true);
  }, [
    subTasksPopup, obstaclePopup, timeEditPopup, taskDetailPopup, contextMenu,
    quickStartPopup, conditionPopup, togglPopup, quickTimerPopup, settingsPopup,
    trashPopup, spacePopup, passwordPopup, logEditPopup, goalPopup, 
    taskHistoryPopup, deleteConfirm, subTaskSelectPopup, dateChangePopup,
    reasonPopup, passwordSetupPopup, backupHistoryPopup, cruiseControlPopup, 
    isProtocolReviewing, spaceSelectPopup, timePopup, currentDate, spaces, 
    selectedSpaceId, localPasswords
  ]);

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
          if (data.protocolStats) {
            setProtocolStats(data.protocolStats);
            localStorage.setItem('protocolStats', JSON.stringify(data.protocolStats));
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
            if (data.protocolStats) {
              setProtocolStats(data.protocolStats);
              localStorage.setItem('protocolStats', JSON.stringify(data.protocolStats));
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
    localStorage.setItem('protocolStats', JSON.stringify(protocolStats));
  }, [protocolStats]);

  useEffect(() => {
    localStorage.setItem('awakenMethod', awakenMethod);
  }, [awakenMethod]);
  
  // 각성 방식 옵션
  const awakenMethods = {
    coldWash: { name: '❄️ 찬물 세수', desc: '집에서만', instruction: '찬물로 얼굴을 씻으세요!' },
    water: { name: '💧 찬물 마시기', desc: '어디서나', instruction: '찬물 한 컵을 마시세요!' },
    breathing: { name: '😮 과호흡 30회', desc: '어디서나', instruction: '빠르게 30번 호흡하세요!' },
    clap: { name: '👏 박수 50번', desc: '어디서나', instruction: '큰 소리로 박수 50번!' },
    stretch: { name: '🤸 스트레칭', desc: '어디서나', instruction: '전신 스트레칭을 하세요!' },
    burpee: { name: '💪 버피 10개', desc: '어디서나', instruction: '버피 10개를 하세요!' }
  };

  // 프로토콜 단계 정의 (모드별 난이도 자동 조절)
  const getProtocolSteps = () => {
    const selectedMethod = awakenMethods[awakenMethod] || awakenMethods['water'];
    
    const config = {
      hard: {
        jumpCount: 50,
        jumpTime: 30,
        shout: '배에 힘주고 크게 소리치세요!',
        actionTime: 300,
        ment: '한계를 돌파합시다. 당신은 할 수 있습니다.'
      },
      normal: {
        jumpCount: 50,
        jumpTime: 30,
        shout: '큰 소리로 외치세요!',
        actionTime: 180,
        ment: '생각하지 마세요. 그냥 하세요.'
      },
      easy: {
        jumpCount: 10,
        jumpTime: 15,
        shout: '작게 속삭여도 좋습니다.',
        actionTime: 60,
        ment: '오늘은 자리에 앉는 것만으로도 성공입니다.'
      }
    };

    const current = config[protocolMode] || config.normal;

    return [
      {
        title: protocolMode === 'easy' ? '🌿 가벼운 스트레칭' : `🔥 ${current.jumpCount}점프`,
        duration: current.jumpTime,
        instruction: (goal) => protocolMode === 'easy' 
          ? `무리하지 마세요.\n가볍게 몸만 풀어줘도 충분합니다.` 
          : `지금 바로 제자리 뛰기 ${current.jumpCount}회!\n심장을 깨우세요!`,
        icon: protocolMode === 'easy' ? '🧘' : '💓'
      },
      {
        title: selectedMethod.name,
        duration: 30,
        instruction: (goal) => protocolMode === 'easy' 
          ? `(약하게 수행)\n${selectedMethod.instruction.split('!')[0]}` 
          : selectedMethod.instruction,
        icon: '🌊'
      },
      {
        title: protocolMode === 'easy' ? '💬 목표 속삭이기' : '📢 목표 선언',
        duration: 10,
        instruction: (goal) => `${current.shout}\n"나는 지금 ${goal} 한다!"`,
        icon: protocolMode === 'easy' ? '💭' : '🗣️',
        showGoalPrompt: true
      },
      {
        title: protocolMode === 'easy' ? '🌱 1분 진입' : '⚡ 즉시 실행',
        duration: current.actionTime,
        instruction: (goal, action) => `${current.ment}\n\n👉 ${action}`,
        icon: '🚀',
        isExecution: true
      }
    ];
  };
  
  const protocolSteps = getProtocolSteps();
  
  // 프로토콜 타이머
  useEffect(() => {
    if (activeProtocol && !cruiseControlPopup && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (activeProtocol && !cruiseControlPopup && timeLeft === 0) {
      const steps = getProtocolSteps();
      if (currentStep < steps.length - 1) {
        nextStep();
      } else {
        setCruiseControlPopup(true);
      }
    }
  }, [activeProtocol, cruiseControlPopup, timeLeft, currentStep, protocolMode, awakenMethod]);
  
  // 젠 모드 타이머
  useEffect(() => {
    if (isZenMode && timeLeft > 0) {
      const timer = setTimeout(() => setTimeLeft(timeLeft - 1), 1000);
      return () => clearTimeout(timer);
    } else if (isZenMode && timeLeft === 0) {
      alert('몰입 시간 종료! 수고하셨습니다.');
      finishZenSession();
    }
  }, [isZenMode, timeLeft]);
  
  // 젠 모드 시작
  const startZenSession = (minutes) => {
    if (!protocolGoal.trim()) {
      alert('목표를 입력하세요');
      return;
    }
    setZenSetupPopup(false);
    setTimeLeft(minutes * 60);
    initialZenTimeRef.current = minutes * 60;
    setIsZenMode(true);
    
    if (document.documentElement.requestFullscreen) {
      document.documentElement.requestFullscreen().catch(err => console.log(err));
    }
  };
  
  // 젠 모드 종료
  const finishZenSession = () => {
    if (document.fullscreenElement) {
      document.exitFullscreen().catch(err => console.log(err));
    }
    
    const duration = initialZenTimeRef.current - timeLeft;
    if (duration > 0) {
      skipFirebaseSave.current = true;
      const newDates = { ...dates };
      if (!newDates[dateKey]) newDates[dateKey] = [];
      
      // 젠 모드 카드 생성
      const zenTask = {
        id: Date.now(),
        text: protocolGoal.trim(),
        todayTime: duration,
        totalTime: duration,
        todayGoal: 0,
        totalGoal: 0,
        completed: true,
        completedAt: new Date().toISOString(),
        indentLevel: 0,
        spaceId: selectedSpaceId || 'default'
      };
      
      if (protocolAction.trim()) {
        if (!zenTask.subTasks) zenTask.subTasks = [];
        zenTask.subTasks.push({
          id: Date.now() + 1,
          text: protocolAction.trim(),
          completed: true,
          timestamp: Date.now()
        });
      }
      
      newDates[dateKey].push(zenTask);
      
      // 같은 이름 task들 totalTime 업데이트
      const taskName = zenTask.text;
      Object.keys(newDates).forEach(date => {
        newDates[date]?.forEach(t => {
          if (t.text === taskName) t.totalTime += duration;
        });
      });
      
      localStorage.setItem('dates', JSON.stringify(newDates));
      setDates(newDates);
      saveTasks(newDates, false);
      
      const newLogs = { ...timerLogs };
      if (!newLogs[dateKey]) newLogs[dateKey] = [];
      const startTime = new Date(Date.now() - duration * 1000).toISOString();
      newLogs[dateKey].push({
        taskName: protocolGoal.trim(),
        subTask: protocolAction.trim() || '',
        startTime,
        endTime: new Date().toISOString(),
        duration
      });
      setTimerLogs(newLogs);
      
      setTimeout(() => { skipFirebaseSave.current = false; }, 1000);
    }
    
    setIsZenMode(false);
    setProtocolGoal('');
    setProtocolAction('');
  };

  const { timerSeconds, quickTimerSeconds, setQuickTimerSeconds } = useTimer(activeTimers, quickTimer);

  // 습관 함수들
  const toggleHabit = (dateKey, habitId) => {
    const newLogs = { ...habitLogs };
    if (!newLogs[dateKey]) newLogs[dateKey] = {};
    
    const isNowChecked = !newLogs[dateKey][habitId];
    newLogs[dateKey][habitId] = isNowChecked;
    setHabitLogs(newLogs);
    localStorage.setItem('habitLogs', JSON.stringify(newLogs));

    const habit = habits.find(h => h.id === habitId);
    if (!habit) return;

    const newDates = { ...dates };
    if (!newDates[dateKey]) newDates[dateKey] = [];

    if (isNowChecked) {
        const exists = newDates[dateKey].some(t => t.habitId === habitId);
        if (!exists) {
            const newHabitTask = {
                id: Date.now(),
                text: habit.name,
                todayTime: 0,
                totalTime: 0,
                todayGoal: 0,
                totalGoal: 0,
                completed: true,
                completedAt: new Date().toISOString(),
                indentLevel: 0,
                spaceId: selectedSpaceId || 'default',
                habitId: habitId,
                icon: habit.icon
            };
            newDates[dateKey].push(newHabitTask);
        }
    } else {
        const taskIdx = newDates[dateKey].findIndex(t => t.habitId === habitId);
        if (taskIdx !== -1) {
            newDates[dateKey].splice(taskIdx, 1);
        }
    }

    setDates(newDates);
    saveTasks(newDates);
  };

  const addHabit = (name) => {
    const newHabits = [...habits, { id: Date.now(), name, icon: '✨', isActive: true, spaceId: selectedSpaceId || 'default' }];
    setHabits(newHabits);
    localStorage.setItem('habits', JSON.stringify(newHabits));
  };

  const reorderHabits = (newHabitList) => {
    const otherSpaceHabits = habits.filter(h => (h.spaceId || 'default') !== (selectedSpaceId || 'default'));
    const updatedHabits = [...otherSpaceHabits, ...newHabitList];
    setHabits(updatedHabits);
    localStorage.setItem('habits', JSON.stringify(updatedHabits));
  };
  
  const editHabit = (id, newName) => {
    if (!newName || !newName.trim()) return;
    const newHabits = habits.map(h => h.id === id ? { ...h, name: newName } : h);
    setHabits(newHabits);
    localStorage.setItem('habits', JSON.stringify(newHabits));
  };

  const deleteHabit = (id) => {
    if(window.confirm('이 습관을 삭제하시겠습니까?')) {
        const newHabits = habits.filter(h => h.id !== id);
        setHabits(newHabits);
        localStorage.setItem('habits', JSON.stringify(newHabits));
    }
  };

  const toggleHabitActive = (id) => {
    const newHabits = habits.map(h => h.id === id ? { ...h, isActive: !h.isActive } : h);
    setHabits(newHabits);
    localStorage.setItem('habits', JSON.stringify(newHabits));
  };

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
          quickTimer: quickTimerData,
          protocolStats
        }, { merge: true });
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [dates, user, useFirebase, spaces, selectedSpaceId, togglToken, timerLogs, quickTimer, quickTimerTaskId, protocolStats]);

  useEffect(() => {
    localStorage.setItem('spaces', JSON.stringify({ spaces, selectedSpaceId }));
    const spacesWithoutPasswords = spaces.map(s => ({ ...s, password: null }));
    if (user && useFirebase && !skipFirebaseSave.current && spaces.length > 0) {
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
    
    // 새로 만든 카드는 편집 모드로
    setEditingTaskId(taskId);
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
        if (task.isProtocol) {
          delete task.isProtocol;
        }
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
    if (window.confirm('타이머를 취소하시겠습니까? (Toggl 기록도 삭제됩니다)')) {
      const newActiveTimers = { ...activeTimers };
      delete newActiveTimers[timerKey];
      setActiveTimers(newActiveTimers);
      
      if (togglToken) {
        const knownEntryId = togglEntries[timerKey];
        
        const deleteToggl = async () => {
          try {
            if (knownEntryId) {
              await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${knownEntryId}`, {
                method: 'DELETE'
              });
              console.log('✅ Toggl 삭제 완료 (ID 기반)');
            } else {
              console.log('🕵️ ID 없음. 고스트 타이머 수색 시작...');
              
              for (let i = 1; i <= 20; i++) {
                await new Promise(resolve => setTimeout(resolve, 1000));
                
                console.log(`🔎 수색 중... (${i}/20초)`);
                
                const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
                  method: 'GET'
                });
                
                if (currentRes.ok) {
                  const currentData = await currentRes.json();
                  
                  if (currentData && currentData.id) {
                    await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
                      method: 'DELETE'
                    });
                    console.log(`🔫 잡았다! 고스트 타이머 삭제 완료 (시도 ${i}초차)`);
                    break;
                  }
                }
              }
              console.log('🤷 20초간 수색했으나 타이머가 생성되지 않음');
            }
          } catch (err) {
            console.error('Toggl 정리 중 오류:', err);
          }
          
          const newEntries = { ...togglEntries };
          delete newEntries[timerKey];
          setTogglEntries(newEntries);
        };
        
        deleteToggl();
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
  
  // 프로토콜 시작 - 컨디션 체크 팝업 먼저
  const startProtocol = () => {
    setConditionPopup(true);
  };
  
  // 컨디션 선택 후 목표 설정 팝업
  const confirmCondition = (mode) => {
    setProtocolMode(mode);
    setConditionPopup(false);
    setQuickStartPopup(true);
  };
  
  // 프로토콜 다음 단계
  const nextStep = () => {
    const next = currentStep + 1;
    const steps = getProtocolSteps();
    setCurrentStep(next);
    setTimeLeft(steps[next].duration);
  };
  
  // 크루즈 컨트롤 핸들러 (프로토콜 → 젠 모드 연결)
  const handleCruiseControl = (extend) => {
    setCruiseControlPopup(false);
    if (extend) {
      // 1. 프로토콜 완료 처리 (기록 저장)
      const seconds = Math.floor((Date.now() - activeProtocol.startTime) / 1000);
      skipFirebaseSave.current = true;
      const newDates = { ...dates };
      if (!newDates[dateKey]) newDates[dateKey] = [];
      
      const protocolTask = {
        id: Date.now(),
        text: protocolGoal.trim(),
        todayTime: seconds,
        totalTime: seconds,
        todayGoal: 0,
        totalGoal: 0,
        completed: true,
        completedAt: new Date().toISOString(),
        indentLevel: 0,
        spaceId: selectedSpaceId || 'default',
        isProtocol: true
      };
      
      if (protocolAction.trim()) {
        if (!protocolTask.subTasks) protocolTask.subTasks = [];
        protocolTask.subTasks.push({
          id: Date.now() + 1,
          text: protocolAction.trim(),
          completed: true,
          timestamp: Date.now()
        });
      }
      
      newDates[dateKey].push(protocolTask);
      localStorage.setItem('dates', JSON.stringify(newDates));
      setDates(newDates);
      saveTasks(newDates, false);
      
      const newLogs = { ...timerLogs };
      if (!newLogs[dateKey]) newLogs[dateKey] = [];
      newLogs[dateKey].push({
        taskName: '프로토콜',
        subTask: protocolAction || '',
        startTime: new Date(activeProtocol.startTime).toISOString(),
        endTime: new Date().toISOString(),
        duration: seconds
      });
      setTimerLogs(newLogs);
      
      setTimeout(() => { skipFirebaseSave.current = false; }, 1000);
      
      // 2. 젠 모드 활성화
      setIsZenMode(true);
      setTimeLeft(25 * 60);
      initialZenTimeRef.current = 25 * 60;
      if (!protocolGoal) setProtocolGoal('Deep Work');
      
      // 3. 프로토콜 UI 끄기
      setActiveProtocol(null);
      setCurrentStep(0);
      setProtocolAction('');
      
      // 4. 전체 화면 진입
      if (document.documentElement.requestFullscreen) {
        document.documentElement.requestFullscreen().catch(err => console.log(err));
      }
    } else {
      finalizeProtocol();
    }
  };
  
  // 프로토콜 취소
  const cancelProtocol = () => {
    if (!window.confirm('프로토콜을 취소하면 체크되지 않습니다. 정말 취소하시겠습니까?')) return;
    setActiveProtocol(null);
    setCruiseControlPopup(false);
    setCurrentStep(0);
    setTimeLeft(0);
    setProtocolGoal('');
    setProtocolAction('');
  };
  
  // 독립적인 회고 저장 함수 (저녁용)
  const saveDailyReview = () => {
    if (!reviewData.obstacle.trim() && !reviewData.improvement.trim()) {
      alert('방해물이나 개선사항 중 하나는 입력해주세요.');
      return;
    }
    const reviewText = `🛑방해: ${reviewData.obstacle || '-'} / 🚀개선: ${reviewData.improvement || '-'}`;
    
    const newDates = { ...dates };
    if (!newDates[dateKey]) newDates[dateKey] = [];
    
    const reviewTask = {
      id: Date.now(),
      text: '🌙 오늘 하루 회고',
      todayTime: 0,
      totalTime: 0,
      todayGoal: 0,
      totalGoal: 0,
      completed: true,
      completedAt: new Date().toISOString(),
      indentLevel: 0,
      spaceId: selectedSpaceId || 'default',
      subTasks: [{
        id: Date.now() + 1,
        text: reviewText,
        completed: true,
        timestamp: Date.now()
      }]
    };
    
    newDates[dateKey].push(reviewTask);
    localStorage.setItem('dates', JSON.stringify(newDates));
    setDates(newDates);
    saveTasks(newDates, false);
    
    setIsProtocolReviewing(false);
    setReviewData({ obstacle: '', improvement: '' });
    
    alert('🌙 회고가 저장되었습니다. 내일은 더 멋진 하루가 될 거예요!');
  };
  
  // 프로토콜 완료
  const finalizeProtocol = async () => {
    const seconds = Math.floor((Date.now() - activeProtocol.startTime) / 1000);
    
    skipFirebaseSave.current = true;
    const newDates = { ...dates };
    if (!newDates[dateKey]) newDates[dateKey] = [];
    
    // 프로토콜 카드 생성
    const protocolTask = {
      id: Date.now(),
      text: protocolGoal.trim(),
      todayTime: seconds,
      totalTime: seconds,
      todayGoal: 0,
      totalGoal: 0,
      completed: true,
      completedAt: new Date().toISOString(),
      indentLevel: 0,
      spaceId: selectedSpaceId || 'default',
      isProtocol: true
    };
    
    if (protocolAction.trim()) {
      if (!protocolTask.subTasks) protocolTask.subTasks = [];
      protocolTask.subTasks.push({
        id: Date.now() + 1,
        text: protocolAction.trim(),
        completed: true,
        timestamp: Date.now()
      });
    }
    
    newDates[dateKey].push(protocolTask);
    
    localStorage.setItem('dates', JSON.stringify(newDates));
    setDates(newDates);
    saveTasks(newDates, false);
    
    const newLogs = { ...timerLogs };
    if (!newLogs[dateKey]) newLogs[dateKey] = [];
    newLogs[dateKey].push({
      taskName: '프로토콜',
      subTask: protocolAction || '',
      startTime: new Date(activeProtocol.startTime).toISOString(),
      endTime: new Date().toISOString(),
      duration: seconds
    });
    setTimerLogs(newLogs);
    
    if (togglToken) {
      try {
        const description = protocolAction ? `프로토콜 - ${protocolAction}` : '프로토콜';
        const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            description,
            start: new Date(activeProtocol.startTime).toISOString(),
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
    
    setActiveProtocol(null);
    setCruiseControlPopup(false);
    setCurrentStep(0);
    setTimeLeft(0);
    setProtocolGoal('');
    setProtocolAction('');
    
    alert('🔥 시동 걸기 성공! 오늘 하루도 화이팅입니다.');
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
      if (log.taskName === '프로토콜') return false;
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
        if (data.protocolStats) {
          setProtocolStats(data.protocolStats);
          localStorage.setItem('protocolStats', JSON.stringify(data.protocolStats));
        }
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
          if (data.protocolStats) {
            setProtocolStats(data.protocolStats);
            localStorage.setItem('protocolStats', JSON.stringify(data.protocolStats));
          }
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
      
      let finalDates = dates;
      const localDates = localStorage.getItem('dates');
      if ((!dates || Object.keys(dates).length === 0) && localDates) {
          try { finalDates = JSON.parse(localDates); } catch (e) {}
      }

      const taskCount = finalDates 
        ? Object.values(finalDates).reduce((acc, list) => acc + (list?.length || 0), 0) 
        : 0;
      const summary = `할 일 ${taskCount}개 / 습관 ${habits.length}개`;

      const docSnap = await getDoc(docRef);
      const existingHistory = docSnap.exists() ? (docSnap.data().backupHistory || []) : [];
      
      const newSnapshot = {
        timestamp: new Date().toISOString(),
        summary: summary,
        backupData: {
            dates: finalDates,
            habits, habitLogs, timerLogs, spaces, protocolStats
        }
      };
      const newHistory = [newSnapshot, ...existingHistory].slice(0, 10);

      await setDoc(docRef, { 
        workspaces: { default: { dates: finalDates } },
        spaces, togglToken, timerLogs, protocolStats, habits, habitLogs, showHabitDashboard,
        backupHistory: newHistory,
        lastUpdated: new Date().toISOString()
      }, { merge: true });

      setIsSyncing(false);
      alert(`✅ 클라우드 저장 완료!\n${summary}`);

    } catch (error) {
      console.error('저장 중 오류:', error);
      setIsSyncing(false);
      alert('저장 실패: ' + error.message);
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
    const data = backup.backupData || backup;
    if (data.dates) {
      const updatedDates = {};
      Object.keys(data.dates).forEach(dateKey => {
        updatedDates[dateKey] = data.dates[dateKey].map(task => ({
          ...task,
          spaceId: task.spaceId || 'default'
        }));
      });
      setDates(updatedDates);
    }
    if (data.spaces) setSpaces(data.spaces);
    if (data.habits) setHabits(data.habits);
    if (data.habitLogs) setHabitLogs(data.habitLogs);
    if (data.togglToken) setTogglToken(data.togglToken);
    if (data.timerLogs) setTimerLogs(data.timerLogs);
    if (data.protocolStats) setProtocolStats(data.protocolStats);
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

  // 크루즈 컨트롤 팝업
  if (cruiseControlPopup) {
    return (
      <div className="App">
        <div className="popup-overlay">
          <div className="popup" style={{textAlign: 'center', maxWidth: '400px'}}>
            <h1 style={{fontSize: '48px', marginBottom: '10px'}}>🚀</h1>
            <h3>이륙 성공!</h3>
            <p style={{marginBottom: '20px', color: '#666'}}>뇌가 예열되었습니다.<br/>이 흐름 그대로 <strong>25분 뽀모도로</strong>를 달릴까요?</p>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px'}}>
              <button 
                onClick={() => handleCruiseControl(true)} 
                style={{padding: '16px', background: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'}}
              >
                네, 더 달릴래요! (25분)
              </button>
              <button 
                onClick={() => handleCruiseControl(false)} 
                style={{padding: '16px', background: '#eee', color: '#333', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer'}}
              >
                아니요, 여기까지.
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 회고 화면
  if (isProtocolReviewing) {
    return (
      <div className="App">
        <div className="popup-overlay">
          <div className="popup" style={{ maxWidth: '400px' }}>
            <h3>📝 {activeProtocol ? '마이크로 회고' : '오늘 하루 회고'}</h3>
            <div style={{ marginBottom: '20px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>😈 방해물 (Obstacle)</label>
              <input 
                className="popup-input"
                type="text" 
                placeholder="예: 스마트폰 알림, 잡생각..."
                value={reviewData.obstacle}
                onChange={(e) => setReviewData({ ...reviewData, obstacle: e.target.value })}
                autoFocus
              />
            </div>
            <div style={{ marginBottom: '30px' }}>
              <label style={{ display: 'block', marginBottom: '8px', fontSize: '14px', fontWeight: '600' }}>🚀 내일의 개선 (Improvement)</label>
              <input 
                className="popup-input"
                type="text" 
                placeholder="예: 폰을 멀리 두기..."
                value={reviewData.improvement}
                onChange={(e) => setReviewData({ ...reviewData, improvement: e.target.value })}
                onKeyDown={(e) => { if(e.key === 'Enter') finalizeProtocol(); }}
              />
            </div>
            <div style={{ display: 'flex', gap: '10px' }}>
              <button
                onClick={activeProtocol ? finalizeProtocol : saveDailyReview}
                style={{ flex: 1, padding: '16px', background: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                기록 저장하기 ✅
              </button>
              <button
                onClick={() => {
                  setIsProtocolReviewing(false);
                  setReviewData({ obstacle: '', improvement: '' });
                }}
                className="popup-cancel-btn"
                style={{ padding: '16px', background: '#8E8E93', color: 'white', border: 'none', borderRadius: '12px', fontSize: '16px', fontWeight: 'bold', cursor: 'pointer' }}
              >
                취소
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }
  
  // 프로토콜 진행 화면
  if (activeProtocol) {
    const steps = getProtocolSteps();
    const step = steps[currentStep];
    
    return (
      <div className="App" style={{ minHeight: '100vh', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: 'white', padding: '20px' }}>
        <div style={{ maxWidth: '95%', margin: '0 auto', paddingTop: '20px', width: '95%' }}>
          {/* 진행률 */}
          <div style={{ marginBottom: '30px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '14px', marginBottom: '8px' }}>
              <span>프로토콜 진행</span>
              <span>{currentStep + 1} / {steps.length}</span>
            </div>
            <div style={{ width: '100%', background: 'rgba(255,255,255,0.2)', borderRadius: '10px', height: '8px' }}>
              <div 
                style={{ 
                  height: '8px', 
                  borderRadius: '10px', 
                  background: 'linear-gradient(90deg, #4CAF50, #45a049)',
                  width: `${((currentStep / steps.length) * 100) + (25 * (1 - timeLeft / step.duration))}%`,
                  transition: 'width 0.5s ease'
                }}
              />
            </div>
          </div>
          
          {/* 현재 목표 */}
          <div style={{ textAlign: 'center', marginBottom: '30px', padding: '20px', background: 'rgba(255,255,255,0.1)', borderRadius: '15px' }}>
            <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)', marginBottom: '8px' }}>목표</div>
            <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{protocolGoal}</div>
          </div>
          
          {/* 현재 단계 */}
          <div style={{ textAlign: 'center', marginBottom: '30px' }}>
            <div style={{ fontSize: '48px', marginBottom: '15px' }}>{step.icon}</div>
            <h2 style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '15px' }}>{step.title}</h2>
            <div style={{ fontSize: '64px', fontWeight: 'bold', margin: '20px 0', color: '#FFD700' }}>{timeLeft}초</div>
            
            {step.showGoalPrompt && (
              <div style={{ background: 'rgba(255,215,0,0.2)', border: '2px solid #FFD700', borderRadius: '15px', padding: '15px', marginBottom: '15px' }}>
                <div style={{ fontSize: '22px', fontWeight: 'bold', marginBottom: '8px' }}>
                  "지금 {protocolGoal}!"
                </div>
                <div style={{ fontSize: '14px', color: 'rgba(255,255,255,0.8)' }}>
                  ↑ 이걸 큰 소리로 외치세요!
                </div>
              </div>
            )}
            
            <p style={{ fontSize: '16px', lineHeight: '1.5', whiteSpace: 'pre-line', color: 'rgba(255,255,255,0.9)' }}>
              {step.instruction(protocolGoal, protocolAction)}
            </p>
          </div>
          
          {/* 버튼 */}
          <div style={{ display: 'flex', gap: '15px', justifyContent: 'center' }}>
            <button
              onClick={currentStep === steps.length - 1 ? () => setCruiseControlPopup(true) : nextStep}
              style={{
                padding: '15px 40px',
                background: 'linear-gradient(135deg, #4CAF50, #45a049)',
                color: 'white',
                border: 'none',
                borderRadius: '12px',
                fontSize: '18px',
                fontWeight: 'bold',
                cursor: 'pointer',
                boxShadow: '0 4px 15px rgba(76,175,80,0.4)',
                transition: 'transform 0.2s ease'
              }}
              onMouseDown={(e) => e.target.style.transform = 'scale(0.95)'}
              onMouseUp={(e) => e.target.style.transform = 'scale(1)'}
              onMouseLeave={(e) => e.target.style.transform = 'scale(1)'}
            >
              {currentStep === steps.length - 1 ? '완료! ✅' : '다음 단계 →'}
            </button>
            <button
              onClick={cancelProtocol}
              style={{
                padding: '15px 30px',
                background: 'rgba(220,53,69,0.2)',
                color: '#dc3545',
                border: '2px solid #dc3545',
                borderRadius: '12px',
                fontSize: '16px',
                fontWeight: 'bold',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
            >
              취소 (체크 안 됨)
            </button>
          </div>
          
          {/* 단계 미리보기 */}
          <div style={{ marginTop: '40px', display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '15px' }}>
            {steps.map((s, index) => (
              <div
                key={index}
                style={{
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '10px',
                  padding: '15px',
                  textAlign: 'center',
                  transition: 'all 0.3s ease',
                  border: currentStep === index ? '2px solid #FFD700' : '2px solid transparent',
                  transform: currentStep === index ? 'scale(1.05)' : 'scale(1)',
                  opacity: currentStep > index ? 0.5 : 1
                }}
              >
                <div style={{ fontSize: '24px', marginBottom: '8px' }}>{s.icon}</div>
                <div style={{ fontSize: '12px', fontWeight: 'bold' }}>{s.title}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }
  
  // 컨디션 체크 팝업
  if (conditionPopup) {
    return (
      <div className="App">
        <div className="popup-overlay">
          <div className="popup" style={{textAlign: 'center', maxWidth: '400px'}}>
            <h3>🔋 현재 에너지 레벨은?</h3>
            <div style={{display: 'flex', flexDirection: 'column', gap: '10px', marginTop: '20px'}}>
              <button 
                onClick={() => confirmCondition('hard')}
                style={{padding: '20px', background: '#FF3B30', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer'}}
              >
                🔥 100% - 풀 파워 (Hard)
                <div style={{fontSize: '12px', marginTop: '5px', opacity: 0.8}}>고강도 목표 도전!</div>
              </button>
              <button 
                onClick={() => confirmCondition('normal')}
                style={{padding: '20px', background: '#007AFF', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer'}}
              >
                💧 70% - 보통 (Normal)
                <div style={{fontSize: '12px', marginTop: '5px', opacity: 0.8}}>평소 루틴대로 진행</div>
              </button>
              <button 
                onClick={() => confirmCondition('easy')}
                style={{padding: '20px', background: '#34C759', color: 'white', border: 'none', borderRadius: '12px', fontSize: '18px', fontWeight: 'bold', cursor: 'pointer'}}
              >
                🍃 30% - 절전 모드 (Easy)
                <div style={{fontSize: '12px', marginTop: '5px', opacity: 0.8}}>작게 시작해서 연속성 유지</div>
              </button>
            </div>
            <button onClick={() => setConditionPopup(false)} style={{marginTop: '20px', background: 'transparent', color: '#888', border: 'none', cursor: 'pointer'}}>취소</button>
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
      {isZenMode && (
        <div className="zen-mode-overlay">
          <div className="zen-goal">🎯 {protocolGoal}</div>
          <div className="zen-subtext">지금은 오직 이것에만 집중합니다.</div>
          
          <div className="zen-timer">
            {String(Math.floor(timeLeft / 60)).padStart(2, '0')}:{String(timeLeft % 60).padStart(2, '0')}
          </div>
          
          <div style={{color: '#4CAF50', fontSize: '18px', marginBottom: '40px', fontWeight:'bold', opacity: 0.8}}>
            ⚡ 절대 몰입 (Zen Mode)
          </div>

          <button className="zen-exit-btn" onClick={finishZenSession}>
            집중 완료 및 퇴근
          </button>
        </div>
      )}
      
      {zenSetupPopup && (
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setZenSetupPopup(false); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} style={{maxWidth:'500px'}}>
            <h3>🧘 젠 모드 (Zen Mode)</h3>
            <button onClick={() => setZenSetupPopup(false)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            
            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block', marginBottom:'8px', fontSize:'14px', fontWeight:'600'}}>🎯 목표</label>
              <input 
                type="text" 
                placeholder="예: 보고서 작성, 코딩, 공부..." 
                className="popup-input"
                value={protocolGoal}
                onChange={(e) => setProtocolGoal(e.target.value)}
                list="zen-goal-autocomplete"
              />
              <datalist id="zen-goal-autocomplete">
                {Object.keys(dates).flatMap(dateKey => 
                  (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId && t.text)
                ).filter((t, i, arr) => arr.findIndex(x => x.text === t.text) === i).map(task => (
                  <option key={task.id} value={task.text} />
                ))}
              </datalist>
            </div>

            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block', marginBottom:'8px', fontSize:'14px', fontWeight:'600'}}>⚡ 첫 동작</label>
              <input 
                type="text" 
                placeholder="예: 1장 읽기, 함수 하나 만들기..." 
                className="popup-input"
                value={protocolAction}
                onChange={(e) => setProtocolAction(e.target.value)}
              />
            </div>

            <div style={{marginBottom:'20px'}}>
              <label style={{display:'block', marginBottom:'8px', fontSize:'14px', fontWeight:'600'}}>⏱️ 시간 선택</label>
              <div style={{display:'grid', gridTemplateColumns:'1fr 1fr', gap:'10px'}}>
                <button onClick={() => { if(protocolGoal.trim()) startZenSession(25); else alert('목표를 입력하세요'); }} style={{padding:'15px', background:'#E8F5E9', color:'#2E7D32', border:'none', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>
                  🍅 25분<br/><span style={{fontSize:'11px', fontWeight:'normal'}}>뽀모도로</span>
                </button>
                <button onClick={() => { if(protocolGoal.trim()) startZenSession(50); else alert('목표를 입력하세요'); }} style={{padding:'15px', background:'#FFF3E0', color:'#E65100', border:'none', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>
                  🔥 50분<br/><span style={{fontSize:'11px', fontWeight:'normal'}}>딥 워크</span>
                </button>
                <button onClick={() => { if(protocolGoal.trim()) startZenSession(90); else alert('목표를 입력하세요'); }} style={{padding:'15px', background:'#F3E5F5', color:'#7B1FA2', border:'none', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>
                  🧠 90분<br/><span style={{fontSize:'11px', fontWeight:'normal'}}>울트라</span>
                </button>
                <button onClick={() => { if(protocolGoal.trim()) startZenSession(10); else alert('목표를 입력하세요'); }} style={{padding:'15px', background:'#E3F2FD', color:'#1565C0', border:'none', borderRadius:'12px', fontWeight:'bold', cursor:'pointer'}}>
                  ⚡ 10분<br/><span style={{fontSize:'11px', fontWeight:'normal'}}>가볍게</span>
                </button>
              </div>
            </div>
            <div className="popup-buttons">
              <button onClick={() => setZenSetupPopup(false)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {taskDetailPopup && (
        <TaskDetailPopup
          task={taskDetailPopup.task}
          dateKey={taskDetailPopup.dateKey}
          dates={dates}
          selectedSpaceId={selectedSpaceId}
          timerLogs={timerLogs}
          isRunning={activeTimers[`${taskDetailPopup.dateKey}-${taskDetailPopup.task.id}`]}
          seconds={timerSeconds[`${taskDetailPopup.dateKey}-${taskDetailPopup.task.id}`] || 0}
          currentSubTask={currentSubTasks[`${taskDetailPopup.dateKey}-${taskDetailPopup.task.id}`]}
          onClose={() => setTaskDetailPopup(null)}
          onStartTimer={() => toggleTimer(taskDetailPopup.dateKey, [taskDetailPopup.task.id])}
          editingTaskId={editingTaskId}
          setEditingTaskId={setEditingTaskId}
          updateTask={updateTask}
          autocompleteData={{
            ...autocompleteData,
            ...habits.reduce((acc, h) => ({ ...acc, [h.name]: { count: 1, lastUsed: Date.now() } }), {})
          }}
          setAutocompleteData={setAutocompleteData}
          editingOriginalText={editingOriginalText}
          setEditingOriginalText={setEditingOriginalText}
          cancelTimer={cancelTimer}
          setSubTasksPopup={setSubTasksPopup}
          setObstaclePopup={setObstaclePopup}
          setTimePopup={setTimePopup}
          setTaskHistoryPopup={setTaskHistoryPopup}
          setDateChangePopup={setDateChangePopup}
          setContextMenu={setContextMenu}
          deleteTask={deleteTask}
        />
      )}

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
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setTimeEditPopup(null); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} style={{ maxWidth: '400px' }}>
            <h3>⏰ 시간 기록 수정</h3>
            <button onClick={() => setTimeEditPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display:'block', marginBottom:'8px', color:'#888', fontSize:'12px', fontWeight:'bold'}}>시작 시간</label>
              <UniversalTimePicker
                type="time"
                value={`${String(new Date(timeEditPopup.startTime).getHours()).padStart(2,'0')}:${String(new Date(timeEditPopup.startTime).getMinutes()).padStart(2,'0')}`}
                onChange={(val) => {
                  const [h, m] = val.split(':');
                  const newDate = new Date(timeEditPopup.startTime);
                  newDate.setHours(parseInt(h), parseInt(m));
                  setTimeEditPopup({ ...timeEditPopup, startTime: newDate.getTime() });
                }}
              />
            </div>

            <div style={{marginBottom: '20px'}}>
              <label style={{display:'block', marginBottom:'8px', color:'#888', fontSize:'12px', fontWeight:'bold'}}>종료 시간</label>
              <UniversalTimePicker
                type="time"
                value={`${String(new Date(timeEditPopup.endTime).getHours()).padStart(2,'0')}:${String(new Date(timeEditPopup.endTime).getMinutes()).padStart(2,'0')}`}
                onChange={(val) => {
                  const [h, m] = val.split(':');
                  const newDate = new Date(timeEditPopup.endTime);
                  newDate.setHours(parseInt(h), parseInt(m));
                  setTimeEditPopup({ ...timeEditPopup, endTime: newDate.getTime() });
                }}
              />
            </div>

            <div className="popup-buttons">
              <button onClick={() => {
                const startDate = new Date(timeEditPopup.startTime);
                const endDate = new Date(timeEditPopup.endTime);
                
                if (endDate < startDate) endDate.setTime(startDate.getTime());

                if (timeEditPopup.isLog) {
                  const logStartTime = timeEditPopup.itemId.replace('log-', '');
                  const newLogs = { ...timerLogs };
                  const logIndex = newLogs[dateKey].findIndex(log => log.startTime === logStartTime);
                  
                  if (logIndex !== -1) {
                    const oldLogDuration = newLogs[dateKey][logIndex].duration;
                    const newDuration = Math.floor((endDate - startDate) / 1000);
                    newLogs[dateKey][logIndex].startTime = startDate.toISOString();
                    newLogs[dateKey][logIndex].endTime = endDate.toISOString();
                    newLogs[dateKey][logIndex].duration = newDuration;
                    setTimerLogs(newLogs);
                    
                    const taskName = newLogs[dateKey][logIndex].taskName;
                    const newDates = { ...dates };
                    const task = newDates[dateKey]?.find(t => t.text === taskName);
                    if (task) {
                      task.todayTime = task.todayTime - oldLogDuration + newDuration;
                      setDates(newDates);
                      saveTasks(newDates);
                    }
                  }
                } else {
                  const taskId = timeEditPopup.taskId;
                  const newDates = { ...dates };
                  const task = newDates[dateKey].find(t => t.id === taskId);
                  if (task) {
                    const currentDuration = task.todayTime;
                    const newDuration = Math.floor((endDate - startDate) / 1000);
                    const diff = newDuration - currentDuration;
                    
                    task.completedAt = endDate.toISOString();
                    task.todayTime = newDuration;
                    
                    const taskName = task.text;
                    Object.keys(newDates).forEach(d => {
                      newDates[d]?.forEach(t => {
                        if (t.text === taskName) t.totalTime += diff;
                      });
                    });
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
        onClose={() => setQuickStartPopup(false)}
        setActiveProtocol={setActiveProtocol}
        setCurrentStep={setCurrentStep}
        setTimeLeft={setTimeLeft}
        setProtocolGoal={setProtocolGoal}
        setProtocolAction={setProtocolAction}
        protocolSteps={protocolSteps}
        awakenMethod={awakenMethod}
        setAwakenMethod={setAwakenMethod}
        dates={dates}
        protocolMode={protocolMode}
      />



      {togglPopup && (
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setTogglPopup(false); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }}>
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
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setLogEditPopup(null); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }}>
            <h3>⏰ 타임라인 수정</h3>
            
            <div style={{marginBottom: '20px'}}>
              <label style={{display:'block', marginBottom:'8px', color:'#888', fontSize:'12px', fontWeight:'bold'}}>시작 시간</label>
              <UniversalTimePicker
                type="time"
                value={`${String(new Date(logEditPopup.log.startTime).getHours()).padStart(2,'0')}:${String(new Date(logEditPopup.log.startTime).getMinutes()).padStart(2,'0')}`}
                onChange={(val) => {
                  const [h, m] = val.split(':');
                  const date = new Date(logEditPopup.log.startTime);
                  date.setHours(parseInt(h), parseInt(m));
                  setLogEditPopup({ ...logEditPopup, log: { ...logEditPopup.log, startTime: date.toISOString() }});
                }}
              />
            </div>

            <div style={{marginBottom: '20px'}}>
              <label style={{display:'block', marginBottom:'8px', color:'#888', fontSize:'12px', fontWeight:'bold'}}>종료 시간</label>
              <UniversalTimePicker
                type="time"
                value={`${String(new Date(logEditPopup.log.endTime).getHours()).padStart(2,'0')}:${String(new Date(logEditPopup.log.endTime).getMinutes()).padStart(2,'0')}`}
                onChange={(val) => {
                  const [h, m] = val.split(':');
                  const date = new Date(logEditPopup.log.endTime);
                  date.setHours(parseInt(h), parseInt(m));
                  setLogEditPopup({ ...logEditPopup, log: { ...logEditPopup.log, endTime: date.toISOString() }});
                }}
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
              }} style={{borderColor:'#FF3B30', color:'#FF3B30'}}>삭제</button>
              <button onClick={() => setLogEditPopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {timePopup && (
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setTimePopup(null); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }}>
            <h3>
              {timePopup.type === 'startTime' ? '⏰ 언제 시작할까요?' : 
               timePopup.type === 'today' ? '⏱️ 오늘 수행 시간 수정' : '⏱️ 총 누적 시간 수정'}
            </h3>

            <UniversalTimePicker
              type={timePopup.type === 'startTime' ? 'time' : 'duration'}
              value={timePopup.type === 'startTime' ? (timePopup.startTime || '09:00') : (timePopup.time || 0)}
              onChange={(newVal) => {
                if (timePopup.type === 'startTime') {
                  setTimePopup({ ...timePopup, startTime: newVal });
                } else {
                  setTimePopup({ ...timePopup, time: newVal });
                }
              }}
            />
            {timePopup.type === 'startTime' && (
              <p style={{fontSize:'13px', color:'#888', marginTop:'10px'}}>
                이 작업의 예정 시간을 메모합니다.
              </p>
            )}
            <div className="popup-buttons" style={{marginTop: '30px'}}>
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
                }
                setTimePopup(null);
              }}>확인</button>
              <button onClick={() => setTimePopup(null)}>취소</button>
            </div>
          </div>
        </div>
      )}
      {goalPopup && (
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setGoalPopup(null); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }}>
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
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setDeleteConfirm(null); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }}>
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
          <div 
            className="context-menu" 
            style={{ 
              position: 'fixed', 
              left: Math.min(contextMenu.x, window.innerWidth - 200), 
              top: Math.min(contextMenu.y, window.innerHeight - 400),
              zIndex: 10002
            }}
            onClick={(e) => e.stopPropagation()}
          >
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
              toggleTimer(contextMenu.dateKey, [contextMenu.taskId]);
              setContextMenu(null);
            }}>
              ▶️ 타이머 시작
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
              if (window.confirm('삭제하시겠습니까?')) {
                deleteTask(contextMenu.dateKey, contextMenu.taskId);
              }
              setContextMenu(null);
            }} style={{ color: '#dc3545' }}>
              🗑️ 삭제
            </div>
          </div>
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
        <div className="popup-overlay" onClick={(e) => { if (popupMouseDownTarget.current === e.target) setSubTaskSelectPopup(null); }} onMouseDown={(e) => { if (e.target.className === 'popup-overlay') popupMouseDownTarget.current = e.target; }} style={{ zIndex: 10020 }}>
          <div className="popup" onClick={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} onMouseDown={(e) => { e.stopPropagation(); popupMouseDownTarget.current = null; }} style={{ maxWidth: '400px', zIndex: 10021 }}>
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
                      const prefix = subTaskSelectPopup.task.isProtocol ? '(프로토콜) ' : '';
                      const description = `${prefix}${subTaskSelectPopup.task.text} - ${subTaskText}`;
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
                  <h4 style={{ fontSize: '14px', marginBottom: '10px', color: '#666', textAlign: 'left' }}>또는 기존 하위할일 선택:</h4>
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
                        fontSize: '14px',
                        textAlign: 'left',
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center'
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
                            const prefix = subTaskSelectPopup.task.isProtocol ? '(프로토콜) ' : '';
                            const description = `${prefix}${subTaskSelectPopup.task.text} - ${subTask.text}`;
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
                      <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{subTask.text}</span>
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
        setReasonPopup={setReasonPopup}
      />

      {reasonPopup && (
        <div className="popup-overlay" onClick={() => setReasonPopup(null)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3>🤔 왜 완료하지 못했나요?</h3>
            <button onClick={() => setReasonPopup(null)} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
            <p style={{ fontSize: '14px', color: '#888', marginBottom: '15px' }}>완료하지 못한 이유를 적으면 방해요소로 기록됩니다.</p>
            <textarea
              id="reason-textarea"
              placeholder="예: 시간이 부족했다, 다른 일이 생겼다"
              style={{
                width: '100%',
                height: '100px',
                padding: '10px',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid rgba(255,255,255,0.2)',
                background: 'rgba(255,255,255,0.05)',
                color: 'inherit',
                resize: 'none',
                fontFamily: 'inherit',
                boxSizing: 'border-box'
              }}
            />
            <div className="popup-buttons" style={{ marginTop: '15px' }}>
              <button onClick={() => {
                const textarea = document.getElementById('reason-textarea');
                const reason = textarea.value.trim();
                const newDates = { ...dates };
                const taskIdx = newDates[reasonPopup.dateKey]?.findIndex(t => t.id === reasonPopup.taskId);
                if (taskIdx !== -1) {
                  const task = newDates[reasonPopup.dateKey][taskIdx];
                  if (reason) {
                    if (!task.obstacles) task.obstacles = [];
                    task.obstacles.push({ text: reason, timestamp: Date.now() });
                  }
                  newDates[reasonPopup.dateKey].splice(taskIdx, 1);
                  if (!newDates[reasonPopup.newDate]) newDates[reasonPopup.newDate] = [];
                  newDates[reasonPopup.newDate].push(task);
                  saveTasks(newDates);
                }
                setReasonPopup(null);
              }}>{document.getElementById('reason-textarea')?.value.trim() ? '저장하고 이동' : '그냥 이동'}</button>
              <button onClick={() => setReasonPopup(null)}>취소</button>
            </div>
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
      {/* 3. 메인 화면 헤더 (모바일 최적화: 2단 분리) */}
      <div className="header" style={{flexDirection: 'column', alignItems: 'stretch', gap: '12px'}}>

        {/* 1층: Simple One + 우측 버튼들 (휴지통, 설정) */}
        <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'center'}}>
          <h1 style={{ margin: 0 }}>Simple One</h1>

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
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

        {/* 2층: 공간 선택 + 레벨 뱃지 */}
        <div style={{display:'flex', justifyContent:'space-between', alignItems:'center'}}>
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

          <div style={{ 
            display: 'flex', alignItems: 'center', gap: '8px',
            cursor: 'pointer', padding: '6px 10px', borderRadius: '8px',
            background: 'rgba(0,0,0,0.03)', transition: 'background 0.2s'
          }} 
          onClick={() => setLevelPopup(true)}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.05)'} 
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(0,0,0,0.03)'}
          >
            <span style={{ 
              background: 'linear-gradient(135deg, #667eea, #764ba2)', 
              color: 'white', padding: '3px 10px', borderRadius: '12px', 
              fontSize: '12px', fontWeight: 'bold', boxShadow: '0 2px 4px rgba(0,0,0,0.2)'
            }}>
              Lv.{levelStatus.level} {levelStatus.title}
            </span>
            <div style={{ width: '80px', height: '6px', background: 'rgba(0,0,0,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
              <div style={{ width: `${levelStatus.progress}%`, height: '100%', background: 'linear-gradient(90deg, #667eea, #764ba2)', transition: 'width 0.5s ease' }} />
            </div>
          </div>
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
                  const hasProtocol = dates[key]?.some(t => t.isProtocol && (t.spaceId || 'default') === selectedSpaceId);
                  return (
                    <div>
                      {s.total > 0 && <div className="tile-stats">{s.completed}/{s.total}</div>}
                      {hasProtocol && <div style={{ fontSize: '16px', marginTop: '2px' }}>🔥</div>}
                    </div>
                  );
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
                      const subTasks = getSubTasks(dates, date, task.id);
                      const completedSubTasks = subTasks.filter(st => st.completed);
                      const completedCardsWithoutSubTasks = Object.keys(dates).reduce((count, key) => {
                        return count + (dates[key]?.filter(t => t.text === task.text && t.completed && (t.spaceId || 'default') === (task.spaceId || 'default') && (!t.subTasks || t.subTasks.length === 0)).length || 0);
                      }, 0);
                      const touchCount = completedSubTasks.length + completedCardsWithoutSubTasks;
                      let allObstacles = [];
                      Object.keys(dates).forEach(key => {
                        const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                        if (sameTask && sameTask.obstacles) {
                          allObstacles = allObstacles.concat(sameTask.obstacles);
                        }
                      });
                      
                      return (
                        <div key={task.id}
                          onClick={editingTaskId === task.id ? undefined : () => setTaskDetailPopup({ task, dateKey: date })}
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
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', minHeight: '24px' }}>
                            {editingTaskId === task.id ? (
                              <textarea
                                value={task.text}
                                onChange={(e) => updateTask(date, [task.id], 'text', e.target.value)}
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
                                  border: '1px solid #4CAF50',
                                  borderRadius: '4px',
                                  padding: '4px',
                                  background: 'rgba(76,175,80,0.1)',
                                  resize: 'none',
                                  fontFamily: 'inherit',
                                  outline: 'none',
                                  minHeight: '24px',
                                  height: '24px'
                                }}
                              />
                            ) : (
                              task.text
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span>⏱️ {formatTime(task.todayTime)}</span>
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
                      const subTasks = getSubTasks(dates, date, task.id);
                      const completedSubTasks = subTasks.filter(st => st.completed);
                      const completedCardsWithoutSubTasks = Object.keys(dates).reduce((count, key) => {
                        return count + (dates[key]?.filter(t => t.text === task.text && t.completed && (t.spaceId || 'default') === (task.spaceId || 'default') && (!t.subTasks || t.subTasks.length === 0)).length || 0);
                      }, 0);
                      const touchCount = completedSubTasks.length + completedCardsWithoutSubTasks;
                      let allObstacles = [];
                      Object.keys(dates).forEach(key => {
                        const sameTask = dates[key]?.find(t => t.text === task.text && (t.spaceId || 'default') === (task.spaceId || 'default'));
                        if (sameTask && sameTask.obstacles) {
                          allObstacles = allObstacles.concat(sameTask.obstacles);
                        }
                      });
                      
                      return (
                        <div key={task.id}
                          onClick={editingTaskId === task.id ? undefined : () => setTaskDetailPopup({ task, dateKey: date })}
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
                          <div style={{ fontWeight: 'bold', fontSize: '16px', marginBottom: '4px', minHeight: '24px' }}>
                            {editingTaskId === task.id ? (
                              <textarea
                                value={task.text}
                                onChange={(e) => updateTask(date, [task.id], 'text', e.target.value)}
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
                                  border: '1px solid #4CAF50',
                                  borderRadius: '4px',
                                  padding: '4px',
                                  background: 'rgba(76,175,80,0.1)',
                                  resize: 'none',
                                  fontFamily: 'inherit',
                                  outline: 'none',
                                  minHeight: '24px',
                                  height: '24px'
                                }}
                              />
                            ) : (
                              task.text
                            )}
                          </div>
                          <div style={{ fontSize: '13px', color: '#666', display: 'flex', gap: '12px', alignItems: 'center' }}>
                            <span>⏱️ {formatTime(task.todayTime)}</span>
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
              </div>
            );
          })}
        </div>
      ) : viewMode === 'list' ? (
        <div onClick={(e) => { if (reorderMode && !e.target.closest('.task-row, button, textarea, input')) setReorderMode(false); }}>
          {showHabitDashboard ? (
            <HabitDashboard 
              habits={habits.filter(h => (h.spaceId || 'default') === (selectedSpaceId || 'default'))}
              habitLogs={habitLogs}
              onToggleHabit={toggleHabit}
              onAddHabit={addHabit}
              onDeleteHabit={deleteHabit}
              onToggleHabitActive={toggleHabitActive}
              onEditHabit={editHabit}
              onReorderHabits={reorderHabits}
              isVisible={true}
              dateKey={dateKey}
              taskSuggestions={
                Array.from(new Set(
                  Object.values(dates).flat().map(t => t.text).filter(Boolean)
                ))
              }
              onVisibilityChange={(checked) => {
                setShowHabitDashboard(checked);
                localStorage.setItem('showHabitDashboard', checked);
              }}
            />
          ) : (
            <div style={{textAlign:'right', marginBottom:'10px'}}>
              <button 
                onClick={() => {
                  setShowHabitDashboard(true);
                  localStorage.setItem('showHabitDashboard', true);
                }}
                style={{fontSize:'12px', background:'transparent', border:'1px solid #ddd', color:'#888', padding:'4px 8px', borderRadius:'6px', cursor:'pointer'}}
              >
                🚘 습관 대시보드 열기
              </button>
            </div>
          )}
          <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px', margin: '20px 0', flexWrap: 'wrap' }}>
            <div style={{ display: 'flex', gap: '16px', fontSize: '16px', color: '#555', alignItems: 'center', width: '100%', justifyContent: 'center', marginBottom: '12px', fontWeight: '600' }}>
              <span>🔥 연속 {(() => {
                let streak = 0;
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                // 오늘부터 거꾸로 확인하면서 가장 최근 프로토콜 날짜 찾기
                let lastProtocolDate = null;
                for (let i = 0; i < 365; i++) {
                  const checkDate = new Date(today);
                  checkDate.setDate(checkDate.getDate() - i);
                  const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
                  const hasProtocol = dates[checkKey]?.some(t => t.isProtocol && (t.spaceId || 'default') === selectedSpaceId);
                  if (hasProtocol) {
                    lastProtocolDate = new Date(checkDate);
                    break;
                  }
                }
                
                // 가장 최근 프로토콜 날짜부터 연속일수 계산
                if (lastProtocolDate) {
                  for (let i = 0; i < 365; i++) {
                    const checkDate = new Date(lastProtocolDate);
                    checkDate.setDate(checkDate.getDate() - i);
                    const checkKey = `${checkDate.getFullYear()}-${String(checkDate.getMonth() + 1).padStart(2, '0')}-${String(checkDate.getDate()).padStart(2, '0')}`;
                    const hasProtocol = dates[checkKey]?.some(t => t.isProtocol && (t.spaceId || 'default') === selectedSpaceId);
                    if (hasProtocol) streak++;
                    else break;
                  }
                }
                
                return streak;
              })()}일</span>
              <span>📅 총 {(() => {
                let total = 0;
                Object.keys(dates).forEach(key => {
                  if (dates[key]?.some(t => t.isProtocol && (t.spaceId || 'default') === selectedSpaceId)) total++;
                });
                return total;
              })()}일</span>
              <span>⏱️ 총 {(() => {
                let totalMinutes = 0;
                Object.keys(dates).forEach(key => {
                  dates[key]?.forEach(t => {
                    if (t.isProtocol && (t.spaceId || 'default') === selectedSpaceId) {
                      totalMinutes += Math.floor(t.todayTime / 60);
                    }
                  });
                });
                return totalMinutes;
              })()}분</span>
            </div>
            <button 
              onClick={() => {
                if (quickTimer) {
                  stopQuickTimer();
                } else if (activeProtocol) {
                  // 프로토콜 진행 중이면 아무것도 하지 않음
                  return;
                } else {
                  startProtocol();
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
                background: quickTimer ? 'linear-gradient(135deg, #dc3545 0%, #c82333 100%)' : 'linear-gradient(135deg, #4CAF50 0%, #45a049 100%)', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontSize: '16px', 
                fontWeight: 'bold',
                boxShadow: quickTimer ? '0 4px 12px rgba(220,53,69,0.4)' : '0 4px 12px rgba(76,175,80,0.4)',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent',
                transition: 'all 0.2s ease'
              }}
            >
              {quickTimer ? `⏸ 완료하기 (${formatTime(quickTimerSeconds)})` : activeProtocol ? '🔄 프로토콜 진행 중...' : '✨ 원하는 것 이루기'}
            </button>
            <button 
              onClick={() => setIsProtocolReviewing(true)}
              style={{ 
                padding: '12px 24px', 
                background: 'transparent', 
                border: '1px solid #8E8E93', 
                color: '#8E8E93', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontSize: '14px', 
                fontWeight: 'bold',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              🌙 오늘 하루 마무리
            </button>
            <button 
              onClick={() => setZenSetupPopup(true)}
              style={{ 
                padding: '12px 24px', 
                background: '#333', 
                color: 'white', 
                border: 'none', 
                borderRadius: '12px', 
                cursor: 'pointer', 
                fontSize: '14px', 
                fontWeight: 'bold',
                touchAction: 'manipulation',
                WebkitTapHighlightColor: 'transparent'
              }}
            >
              🧘 젠 모드
            </button>
            {quickTimer && (
              <button
                onClick={() => {
                  if (window.confirm('타이머를 취소하시겠습니까?')) {
                    const newCurrentSubTasks = { ...currentSubTasks };
                    delete newCurrentSubTasks['quickTimer'];
                    setCurrentSubTasks(newCurrentSubTasks);
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
          
          {/* 현재 진행 중인 작업 표시 */}
          {(() => {
            const currentSubTask = currentSubTasks['quickTimer'];
            const taskText = quickTimerText || (quickTimerTaskId ? dates[dateKey]?.find(t => t.id === quickTimerTaskId)?.text : '');
            
            if (quickTimer && (taskText || currentSubTask)) {
              return (
                <div style={{
                  margin: '0 20px 20px 20px',
                  padding: '16px',
                  background: 'linear-gradient(135deg, rgba(255,193,7,0.1) 0%, rgba(255,152,0,0.1) 100%)',
                  border: '2px solid rgba(255,193,7,0.3)',
                  borderRadius: '12px',
                  textAlign: 'center'
                }}>
                  <div style={{ fontSize: '14px', color: '#FFC107', marginBottom: '8px', fontWeight: 'bold' }}>
                    🎯 현재 진행 중
                  </div>
                  {taskText && (
                    <div style={{ fontSize: '18px', fontWeight: 'bold', marginBottom: '4px' }}>
                      {taskText}
                    </div>
                  )}
                  {currentSubTask && (
                    <div style={{ fontSize: '16px', color: '#4CAF50', fontWeight: '500' }}>
                      → {currentSubTask}
                    </div>
                  )}
                </div>
              );
            }
            return null;
          })()}





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



            <div>
              {(() => {
                const allTasks = dates[dateKey]?.filter(t => (t.spaceId || 'default') === selectedSpaceId) || [];
                const incompleteTasks = allTasks.filter(t => !t.completed && !t.isProtocol);
                const completedTasks = allTasks.filter(t => t.completed && !t.isProtocol);
                const protocolTasks = allTasks.filter(t => t.isProtocol);
                
                return (
                  <>
                    {protocolTasks.length > 0 && (
                      <div style={{ marginBottom: '30px' }}>
                        <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#FF6B35' }}>🔥 프로토콜</h3>
                        <div className="task-grid">
                          {protocolTasks.map(task => {
                            const timerKey = `${dateKey}-${task.id}`;
                            const seconds = timerSeconds[timerKey] || 0;
                            const isRunning = activeTimers[timerKey];
                            const currentSubTask = currentSubTasks[timerKey];
                            
                            return (
                              <TaskCard
                                key={task.id}
                                task={task}
                                dateKey={dateKey}
                                dates={dates}
                                selectedSpaceId={selectedSpaceId}
                                timerLogs={timerLogs}
                                isRunning={isRunning}
                                seconds={seconds}
                                currentSubTask={currentSubTask}
                                onCardClick={() => setTaskDetailPopup({ task, dateKey })}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey });
                                }}
                                editingTaskId={editingTaskId}
                                setEditingTaskId={setEditingTaskId}
                                updateTask={updateTask}
                                autocompleteData={autocompleteData}
                                setAutocompleteData={setAutocompleteData}
                                editingOriginalText={editingOriginalText}
                                setEditingOriginalText={setEditingOriginalText}
                                draggedTaskId={draggedTaskId}
                                setDraggedTaskId={setDraggedTaskId}
                                reorderMode={reorderMode}
                                saveTasks={saveTasks}
                                cancelTimer={cancelTimer}
                                toggleTimer={toggleTimer}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                    
                    <div style={{ marginBottom: '30px' }}>
                      <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#333' }}>📝 할 일</h3>
                      <div className="task-grid">
                          {incompleteTasks.map(task => {
                            const timerKey = `${dateKey}-${task.id}`;
                            const seconds = timerSeconds[timerKey] || 0;
                            const isRunning = activeTimers[timerKey];
                            const currentSubTask = currentSubTasks[timerKey];
                            
                            return (
                              <TaskCard
                                key={task.id}
                                task={task}
                                dateKey={dateKey}
                                dates={dates}
                                selectedSpaceId={selectedSpaceId}
                                timerLogs={timerLogs}
                                isRunning={isRunning}
                                seconds={seconds}
                                currentSubTask={currentSubTask}
                                onCardClick={() => setTaskDetailPopup({ task, dateKey })}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey });
                                }}
                                editingTaskId={editingTaskId}
                                setEditingTaskId={setEditingTaskId}
                                updateTask={updateTask}
                                autocompleteData={autocompleteData}
                                setAutocompleteData={setAutocompleteData}
                                editingOriginalText={editingOriginalText}
                                setEditingOriginalText={setEditingOriginalText}
                                draggedTaskId={draggedTaskId}
                                setDraggedTaskId={setDraggedTaskId}
                                reorderMode={reorderMode}
                                saveTasks={saveTasks}
                                cancelTimer={cancelTimer}
                                toggleTimer={toggleTimer}
                              />
                            );
                          })}
                          <div 
                            onClick={() => addTask(dateKey)}
                            style={{
                              background: 'rgba(255,255,255,0.5)',
                              borderRadius: '12px',
                              padding: '8px 12px',
                              border: '2px dashed #ccc',
                              cursor: 'pointer',
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'center',
                              fontSize: '24px',
                              color: '#999'
                            }}
                          >
                            +
                          </div>
                      </div>
                    </div>
                    
                    {completedTasks.length > 0 && (
                      <div>
                        <h3 style={{ fontSize: '16px', marginBottom: '15px', color: '#666' }}>✅ 완료</h3>
                        <div className="task-grid">
                          {completedTasks.map(task => {
                            const timerKey = `${dateKey}-${task.id}`;
                            const seconds = timerSeconds[timerKey] || 0;
                            const isRunning = activeTimers[timerKey];
                            const currentSubTask = currentSubTasks[timerKey];
                            
                            return (
                              <TaskCard
                                key={task.id}
                                task={task}
                                dateKey={dateKey}
                                dates={dates}
                                selectedSpaceId={selectedSpaceId}
                                timerLogs={timerLogs}
                                isRunning={isRunning}
                                seconds={seconds}
                                currentSubTask={currentSubTask}
                                onCardClick={() => setTaskDetailPopup({ task, dateKey })}
                                onContextMenu={(e) => {
                                  e.preventDefault();
                                  setContextMenu({ x: e.clientX, y: e.clientY, taskId: task.id, dateKey });
                                }}
                                editingTaskId={editingTaskId}
                                setEditingTaskId={setEditingTaskId}
                                updateTask={updateTask}
                                autocompleteData={autocompleteData}
                                setAutocompleteData={setAutocompleteData}
                                editingOriginalText={editingOriginalText}
                                setEditingOriginalText={setEditingOriginalText}
                                draggedTaskId={draggedTaskId}
                                setDraggedTaskId={setDraggedTaskId}
                                reorderMode={reorderMode}
                                saveTasks={saveTasks}
                                cancelTimer={cancelTimer}
                                toggleTimer={toggleTimer}
                              />
                            );
                          })}
                        </div>
                      </div>
                    )}
                  </>
                );
              })()}
            </div>
            
            {reorderMode && (
              <div style={{ 
                position: 'fixed', 
                bottom: '20px', 
                left: '50%', 
                transform: 'translateX(-50%)', 
                background: '#dc3545', 
                color: 'white', 
                padding: '8px 16px', 
                borderRadius: '20px', 
                fontSize: '14px', 
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
        </div>
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
      {levelPopup && (
        <div className="popup-overlay" onClick={() => setLevelPopup(false)}>
          <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
            <h3 style={{ margin: '0 0 16px 0' }}>🏆 레벨 시스템</h3>
            <div style={{ marginBottom: '16px' }}>
              <div style={{ fontSize: '24px', fontWeight: 'bold', marginBottom: '8px' }}>
                Lv.{levelStatus.level} {levelStatus.title}
              </div>
              <div style={{ fontSize: '14px', color: '#666', marginBottom: '12px' }}>
                총 몰입시간: {Math.floor(levelStatus.totalMinutes / 60)}시간 {levelStatus.totalMinutes % 60}분
              </div>
              <div style={{ 
                width: '100%', 
                height: '12px', 
                background: 'rgba(0,0,0,0.1)', 
                borderRadius: '6px', 
                overflow: 'hidden',
                marginBottom: '8px'
              }}>
                <div style={{ 
                  width: `${levelStatus.progress}%`, 
                  height: '100%', 
                  background: 'linear-gradient(90deg, #667eea, #764ba2)', 
                  transition: 'width 0.5s ease' 
                }} />
              </div>
              <div style={{ fontSize: '13px', color: '#888' }}>
                다음 레벨: {levelStatus.nextTitle} ({levelStatus.progress}%)
              </div>
            </div>
            <div style={{ fontSize: '13px', lineHeight: '1.8' }}>
              <div><strong>🌱 Lv.1 비기너</strong> - 0~1시간</div>
              <div><strong>🥚 Lv.2 꿈꾸는 자</strong> - 1~5시간</div>
              <div><strong>🐣 Lv.3 해치링</strong> - 5~10시간</div>
              <div><strong>🦅 Lv.4 러너</strong> - 10~30시간</div>
              <div><strong>🔥 Lv.5 몰입가</strong> - 30~50시간</div>
              <div><strong>🧘 Lv.6 마스터</strong> - 50~100시간</div>
              <div><strong>👑 Lv.7 0.1%</strong> - 100시간+</div>
            </div>
            <button onClick={() => setLevelPopup(false)} style={{ marginTop: '16px', width: '100%' }}>닫기</button>
          </div>
        </div>
      )}
    </div>
  );
}

export default App;
