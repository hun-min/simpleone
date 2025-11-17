import React from 'react';
import Calendar from 'react-calendar';
import { formatTime } from '../utils/timeUtils';

export function QuickStartPopup({ quickStartPopup, dates, dateKey, selectedSpaceId, quickTimerTaskId, setQuickTimerTaskId, setQuickTimerText, startQuickTimer, onClose }) {
  if (!quickStartPopup) return null;
  
  const [inputText, setInputText] = React.useState('');
  
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()} style={{ maxWidth: '500px' }}>
        <h3>✨ 원하는 것 이루기</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
        
        <div style={{ marginBottom: '15px' }}>
          <input
            type="text"
            value={inputText}
            onChange={(e) => setInputText(e.target.value)}
            placeholder="원하는 것이 무엇인가요?"
            autoFocus
            onKeyDown={(e) => {
              if (e.key === 'Enter' && inputText.trim()) {
                setQuickTimerText(inputText.trim());
                onClose();
                startQuickTimer();
              }
            }}
            style={{
              width: '100%',
              padding: '12px',
              fontSize: '16px',
              borderRadius: '8px',
              border: '2px solid rgba(255,215,0,0.3)',
              background: 'rgba(255,215,0,0.05)',
              color: 'inherit',
              outline: 'none',
              boxSizing: 'border-box'
            }}
          />
        </div>
        
        <div style={{ marginBottom: '10px', fontSize: '12px', color: '#888' }}>또는 기존 작업 선택:</div>
        <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '10px' }}>
          {(() => {
            const filteredTasks = (dates[dateKey] || []).filter(t => (t.spaceId || 'default') === selectedSpaceId);
            if (filteredTasks.length === 0) {
              return <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>작업이 없습니다.</p>;
            }
            return filteredTasks.map(task => {
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
                    fontSize: '14px',
                    cursor: 'pointer'
                  }}
                  onClick={(e) => {
                    e.stopPropagation();
                    setQuickTimerTaskId(Number(task.id));
                    setQuickTimerText(task.text);
                    onClose();
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
          <button onClick={() => {
            if (inputText.trim()) {
              setQuickTimerText(inputText.trim());
              onClose();
              startQuickTimer();
            }
          }} disabled={!inputText.trim()}>확인</button>
          <button onClick={onClose}>취소</button>
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

export function DateChangePopup({ dateChangePopup, dates, saveTasks, onClose }) {
  if (!dateChangePopup) return null;

  return (
    <div className="popup-overlay" onClick={onClose}>
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
            onClose();
          }}
          value={new Date(dateChangePopup.dateKey)}
          calendarType="gregory"
        />
        <button onClick={onClose} style={{ marginTop: '10px', width: '100%' }}>취소</button>
      </div>
    </div>
  );
}
