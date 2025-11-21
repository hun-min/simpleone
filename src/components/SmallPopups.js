import React from 'react';
import Calendar from 'react-calendar';
import { formatTime } from '../utils/timeUtils';

export function QuickStartPopup({ quickStartPopup, onClose, setActiveProtocol, setCurrentStep, setTimeLeft, setProtocolGoal, setProtocolAction, protocolSteps, awakenMethod, setAwakenMethod, dates, protocolMode }) {
  if (!quickStartPopup) return null;
  
  const [goalText, setGoalText] = React.useState('');
  const [actionText, setActionText] = React.useState('');
  const [goalSuggestions, setGoalSuggestions] = React.useState([]);
  const [selectedIndex, setSelectedIndex] = React.useState(-1);
  
  React.useEffect(() => {
    const handleKeyDown = (e) => {
      if (e.key === 'Escape') {
        e.preventDefault();
        e.stopPropagation();
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown, true);
    return () => window.removeEventListener('keydown', handleKeyDown, true);
  }, [onClose]);
  
  const updateGoalSuggestions = (value) => {
    if (!value.trim()) {
      setGoalSuggestions([]);
      return;
    }
    const allGoals = new Set();
    Object.values(dates).forEach(dayTasks => {
      dayTasks.forEach(task => {
        if (task.text && task.text.toLowerCase().includes(value.toLowerCase())) {
          allGoals.add(task.text);
        }
      });
    });
    setGoalSuggestions(Array.from(allGoals).slice(0, 5));
  };
  
  const awakenMethods = {
    coldWash: { name: '❄️ 찬물 세수', desc: '집에서만' },
    water: { name: '💧 찬물 마시기', desc: '어디서나' },
    breathing: { name: '😮 과호흡 30회', desc: '어디서나' },
    clap: { name: '👏 박수 50번', desc: '어디서나' },
    stretch: { name: '🤸 스트레칭', desc: '어디서나' },
    burpee: { name: '💪 버피 10개', desc: '어디서나' }
  };
  
  const startProtocol = () => {
    if (!goalText.trim() || !actionText.trim()) {
      alert('목표와 첫 동작을 모두 입력하세요!');
      return;
    }
    
    setProtocolGoal(goalText.trim());
    setProtocolAction(actionText.trim());
    setActiveProtocol({ startTime: Date.now() });
    setCurrentStep(0);
    setTimeLeft(protocolSteps[0].duration);
    onClose();
  };
  
  const popupMouseDownTarget = React.useRef(null);
  
  return (
    <div className="popup-overlay" 
      onMouseDown={(e) => { popupMouseDownTarget.current = e.target; }}
      onMouseUp={(e) => { if (e.target === e.currentTarget && popupMouseDownTarget.current === e.currentTarget) onClose(); }}
      style={{ zIndex: 10005 }}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ width: '600px', maxWidth: '90vw', maxHeight: '90vh', overflowY: 'auto', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#191F28', border: 'none', zIndex: 10006 }}>
        <h3 style={{ fontSize: '20px', textAlign: 'center', marginBottom: '15px', background: 'linear-gradient(45deg, #FFD700, #FFA500)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>🚀 원하는 모든 걸 이루는 시스템</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '15px', right: '15px', background: 'none', border: 'none', fontSize: '24px', cursor: 'pointer', color: 'rgba(255,255,255,0.8)' }}>✕</button>
        
        <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(255,255,255,0.1)', borderRadius: '8px' }}>
          <p style={{ fontSize: '13px', lineHeight: '1.4', margin: '0', textAlign: 'center' }}>
            <strong>각성 → 선언 → 즉시 실행</strong><br/>
            프로토콜을 완료해야만 체크됩니다!
          </p>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>🎯 목표 (예: 영어 공부, 운동)</label>
          <div style={{ position: 'relative' }}>
            <input
              type="text"
              value={goalText}
              onChange={(e) => {
                setGoalText(e.target.value);
                updateGoalSuggestions(e.target.value);
                setSelectedIndex(-1);
              }}
              onKeyDown={(e) => {
                if (goalSuggestions.length > 0) {
                  if (e.key === 'ArrowDown') {
                    e.preventDefault();
                    setSelectedIndex(prev => prev < goalSuggestions.length - 1 ? prev + 1 : prev);
                  } else if (e.key === 'ArrowUp') {
                    e.preventDefault();
                    setSelectedIndex(prev => prev > -1 ? prev - 1 : -1);
                  } else if (e.key === 'Enter' && selectedIndex >= 0) {
                    e.preventDefault();
                    setGoalText(goalSuggestions[selectedIndex]);
                    setGoalSuggestions([]);
                    setSelectedIndex(-1);
                  }
                }
              }}
              placeholder="영어 공부"
              style={{
                width: '100%',
                padding: '12px',
                fontSize: '15px',
                borderRadius: '10px',
                border: '2px solid rgba(255,215,0,0.5)',
                background: 'rgba(255,255,255,0.9)',
                color: '#333',
                outline: 'none',
                boxSizing: 'border-box',
                fontWeight: 'bold'
              }}
            />
            {goalSuggestions.length > 0 && (
              <div style={{ position: 'absolute', top: '100%', left: 0, right: 0, marginTop: '4px', zIndex: 10007, background: '#fff', border: '1px solid #4CAF50', borderRadius: '4px', boxShadow: '0 2px 8px rgba(0,0,0,0.1)' }}>
                {goalSuggestions.map((suggestion, idx) => (
                  <div
                    key={idx}
                    onMouseDown={(e) => {
                      e.preventDefault();
                      setGoalText(suggestion);
                      setGoalSuggestions([]);
                      setSelectedIndex(-1);
                    }}
                    style={{ padding: '8px', cursor: 'pointer', background: idx === selectedIndex ? 'rgba(76,175,80,0.2)' : 'transparent', textAlign: 'left', color: '#333' }}
                    onMouseEnter={(e) => e.target.style.background = 'rgba(76,175,80,0.2)'}
                    onMouseLeave={(e) => e.target.style.background = idx === selectedIndex ? 'rgba(76,175,80,0.2)' : 'transparent'}
                  >
                    {suggestion}
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>⚡ 첫 동작 (예: 단어 10개 읽기)</label>
          <input
            type="text"
            value={actionText}
            onChange={(e) => setActionText(e.target.value)}
            placeholder="영어 단어 10개 읽기"
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '15px',
              borderRadius: '10px',
              border: '2px solid rgba(76,175,80,0.5)',
              background: 'rgba(255,255,255,0.9)',
              color: '#333',
              outline: 'none',
              boxSizing: 'border-box',
              fontWeight: 'bold'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '6px', fontSize: '14px', fontWeight: 'bold' }}>🔥 각성 방식 선택</label>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '6px' }}>
            {Object.entries(awakenMethods).map(([key, method]) => (
              <div
                key={key}
                onClick={() => setAwakenMethod(key)}
                style={{
                  padding: '10px',
                  borderRadius: '8px',
                  border: awakenMethod === key ? '2px solid #FFD700' : '2px solid rgba(255,255,255,0.3)',
                  background: awakenMethod === key ? 'rgba(255,215,0,0.2)' : 'rgba(255,255,255,0.1)',
                  cursor: 'pointer',
                  textAlign: 'center',
                  transition: 'all 0.2s'
                }}
              >
                <div style={{ fontSize: '16px', fontWeight: 'bold', marginBottom: '4px' }}>{method.name}</div>
                <div style={{ fontSize: '12px', color: 'rgba(255,255,255,0.7)' }}>({method.desc})</div>
              </div>
            ))}
          </div>
        </div>
        
        <div style={{ marginBottom: '15px', padding: '12px', background: 'rgba(255,193,7,0.2)', borderRadius: '8px', border: '1px solid rgba(255,193,7,0.5)' }}>
          <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', color: '#FFC107' }}>💡 프로토콜 단계</h4>
          <div style={{ fontSize: '14px', lineHeight: '1.5' }}>
            {protocolMode === 'easy' ? (
              <>
                1. 🌿 가벼운 스트레칭 (15초)<br/>
                2. {awakenMethods[awakenMethod]?.name || '💧 찬물 마시기'} (30초)<br/>
                3. 💬 목표 속삭이기 (10초) - "지금 {goalText || '목표'}!"<br/>
                4. 🌱 1분 진입 (1분) - {actionText || '첫 동작'}
              </>
            ) : protocolMode === 'hard' ? (
              <>
                1. 🔥 50점프 (30초) - 심장 깨우기<br/>
                2. {awakenMethods[awakenMethod]?.name || '💧 찬물 마시기'} (30초)<br/>
                3. 📢 목표 선언 (10초) - "지금 {goalText || '목표'}!"<br/>
                4. ⚡ 즉시 실행 (5분) - {actionText || '첫 동작'}
              </>
            ) : (
              <>
                1. 🔥 50점프 (30초) - 심장 깨우기<br/>
                2. {awakenMethods[awakenMethod]?.name || '💧 찬물 마시기'} (30초)<br/>
                3. 📢 목표 선언 (10초) - "지금 {goalText || '목표'}!"<br/>
                4. ⚡ 즉시 실행 (3분) - {actionText || '첫 동작'}
              </>
            )}
          </div>
        </div>
        
        <div className="popup-buttons" style={{ display: 'flex', gap: '10px' }}>
          <button 
            onClick={startProtocol}
            disabled={!goalText.trim() || !actionText.trim()}
            style={{
              flex: 1,
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '10px',
              border: 'none',
              background: (!goalText.trim() || !actionText.trim()) ? 'rgba(255,255,255,0.3)' : 'linear-gradient(135deg, #4CAF50, #45a049)',
              color: 'white',
              cursor: (!goalText.trim() || !actionText.trim()) ? 'not-allowed' : 'pointer',
              boxShadow: '0 4px 15px rgba(76,175,80,0.4)',
              transition: 'all 0.2s ease',
              whiteSpace: 'nowrap'
            }}
          >
            🚀 프로토콜 시작!
          </button>
          <button 
            onClick={onClose}
            className="popup-cancel-btn"
            style={{
              padding: '12px',
              fontSize: '16px',
              fontWeight: 'bold',
              borderRadius: '10px',
              border: '2px solid rgba(255,255,255,0.5)',
              background: 'transparent',
              color: 'white',
              cursor: 'pointer'
            }}
          >
            취소
          </button>
        </div>
      </div>
    </div>
  );
}

export function QuickTimerPopup({ quickTimerPopup, quickTimerPopupText, setQuickTimerPopupText, dates, dateKey, selectedSpaceId, assignQuickTime, saveAsUnassigned, onClose }) {
  if (!quickTimerPopup) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3>⏱️ {formatTime(quickTimerPopup.seconds)} 기록</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
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
            onKeyDown={(e) => {
              if (e.key === 'Enter' && e.target.value.trim()) {
                saveAsUnassigned();
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
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

export function PasswordSetupPopup({ passwordSetupPopup, localPasswords, setLocalPasswords, onClose }) {
  if (!passwordSetupPopup) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '350px' }}>
        <h3>🔒 "{passwordSetupPopup.spaceName}" 비밀번호 {passwordSetupPopup.hasPassword ? '변경' : '설정'}</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
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
            onClose();
          }}>확인</button>
          {passwordSetupPopup.hasPassword && (
            <button onClick={() => {
              if (window.confirm('비밀번호를 제거하시겠습니까?')) {
                const newPasswords = { ...localPasswords };
                delete newPasswords[passwordSetupPopup.spaceId];
                setLocalPasswords(newPasswords);
                onClose();
              }
            }} style={{ background: '#dc3545' }}>제거</button>
          )}
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

export function BackupHistoryPopup({ backupHistoryPopup, restoreBackup, onClose }) {
  if (!backupHistoryPopup) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>☁️ 백업 목록</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
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
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

export function DateChangePopup({ dateChangePopup, dates, saveTasks, onClose, setReasonPopup }) {
  if (!dateChangePopup) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ padding: '20px' }}>
        <h3>날짜 변경</h3>
        <Calendar
          onChange={(date) => {
            const newDate = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
            if (newDate !== dateChangePopup.dateKey) {
              const taskIdx = dates[dateChangePopup.dateKey]?.findIndex(t => t.id === dateChangePopup.taskId);
              if (taskIdx !== -1) {
                const task = dates[dateChangePopup.dateKey][taskIdx];
                const oldDate = new Date(dateChangePopup.dateKey);
                const selectedDate = new Date(newDate);
                const today = new Date();
                today.setHours(0, 0, 0, 0);
                
                if (!task.completed && selectedDate >= today && oldDate < today) {
                  setReasonPopup({ dateKey: dateChangePopup.dateKey, taskId: dateChangePopup.taskId, newDate });
                  onClose();
                  return;
                }
                
                const newDates = { ...dates };
                newDates[dateChangePopup.dateKey].splice(taskIdx, 1);
                if (!newDates[newDate]) newDates[newDate] = [];
                newDates[newDate].push(task);
                saveTasks(newDates);
              }
            }
            onClose();
          }}
          value={new Date(dateChangePopup.dateKey)}
          calendarType="gregory"
        />
        <div className="popup-buttons" style={{ marginTop: '10px' }}>
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}

export function ReasonPopup({ reasonPopup, dates, saveTasks, onClose }) {
  if (!reasonPopup) return null;
  const [reason, setReason] = React.useState('');

  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '400px' }}>
        <h3>🤔 왜 완료하지 못했나요?</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
        <p style={{ fontSize: '14px', color: '#888', marginBottom: '15px' }}>완료하지 못한 이유를 적으면 방해요소로 기록됩니다.</p>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
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
            const newDates = { ...dates };
            const taskIdx = newDates[reasonPopup.dateKey]?.findIndex(t => t.id === reasonPopup.taskId);
            if (taskIdx !== -1) {
              const task = newDates[reasonPopup.dateKey][taskIdx];
              if (reason.trim()) {
                if (!task.obstacles) task.obstacles = [];
                task.obstacles.push({ text: reason.trim(), timestamp: Date.now() });
              }
              newDates[reasonPopup.dateKey].splice(taskIdx, 1);
              if (!newDates[reasonPopup.newDate]) newDates[reasonPopup.newDate] = [];
              newDates[reasonPopup.newDate].push(task);
              saveTasks(newDates);
            }
            onClose();
          }}>{reason.trim() ? '저장하고 이동' : '그냥 이동'}</button>
          <button className="popup-cancel-btn" onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}
