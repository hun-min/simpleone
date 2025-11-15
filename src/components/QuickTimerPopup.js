import React from 'react';
import { formatTime } from '../utils/timeUtils';

export function QuickTimerPopup({ 
  quickTimerPopup, 
  quickTimerPopupText, 
  setQuickTimerPopupText,
  dates, 
  dateKey, 
  selectedSpaceId,
  assignQuickTime,
  saveAsUnassigned,
  onClose 
}) {
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
