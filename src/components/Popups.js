import React from 'react';

export function TrashPopup({ trash, onClose, onRestore, onEmpty }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <h3>🗑️ 휴지통 ({trash.length})</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
        {trash.length > 0 ? (
          <>
            <div style={{ maxHeight: '300px', overflowY: 'auto', marginBottom: '10px' }}>
              {trash.map((item, idx) => (
                <div key={idx} style={{ display: 'flex', gap: '5px', marginBottom: '5px', fontSize: '12px', alignItems: 'center', padding: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px' }}>
                  <span style={{ flex: 1, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{item.task.text || '(제목 없음)'}</span>
                  <button onClick={() => onRestore(idx)} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0, background: 'none', border: 'none', fontSize: '18px', cursor: 'pointer' }}>↶</button>
                </div>
              ))}
            </div>
            <div className="settings-section" style={{ borderBottom: 'none', paddingBottom: '0', display: 'flex', gap: '5px' }}>
              <button onClick={() => { if (window.confirm('휴지통을 비우시겠습니까?')) onEmpty(); }} className="settings-btn" style={{ background: '#dc3545' }}>비우기</button>
              <button onClick={onClose} className="settings-btn">닫기</button>
            </div>
          </>
        ) : (
          <>
            <p style={{ fontSize: '14px', color: '#888', textAlign: 'center', padding: '20px' }}>휴지통이 비어있습니다.</p>
            <div className="settings-section" style={{ borderBottom: 'none', paddingBottom: '0' }}>
              <button onClick={onClose} className="settings-btn">닫기</button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

export function SpacePopup({ spaces, localPasswords, onClose, onRename, onChangePassword, onDelete }) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup settings-popup" onClick={(e) => e.stopPropagation()}>
        <h3>📁 공간 관리</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>
        <div className="settings-section">
          {spaces.map(space => (
            <div key={space.id} style={{ display: 'flex', gap: '5px', marginBottom: '8px', alignItems: 'center' }}>
              <span style={{ flex: 1, fontSize: '14px' }}>{space.name}{localPasswords[space.id] && ' 🔒'}</span>
              <button onClick={() => { onClose(); setTimeout(() => onRename(space.id), 100); }} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0 }}>✎</button>
              <button onClick={() => { onClose(); setTimeout(() => onChangePassword(space.id), 100); }} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0 }}>🔒</button>
              <button onClick={() => onDelete(space.id)} className="settings-btn" style={{ width: 'auto', padding: '4px 8px', margin: 0 }}>×</button>
            </div>
          ))}
        </div>
        <div className="settings-section" style={{ borderBottom: 'none', paddingBottom: '0' }}>
          <button onClick={() => { onClose(); setTimeout(() => window.addSpace && window.addSpace(), 100); }} className="settings-btn">+ 새 공간</button>
        </div>
      </div>
    </div>
  );
}

export function DeleteConfirmPopup({ onConfirm, onCancel }) {
  return (
    <div className="popup-overlay" onClick={onCancel}>
      <div className="popup" onClick={(e) => e.stopPropagation()}>
        <h3>🗑️ 삭제 확인</h3>
        <p>정말 삭제하시겠습니까?</p>
        <div className="popup-buttons">
          <button onClick={onConfirm}>삭제</button>
          <button onClick={onCancel}>취소</button>
        </div>
      </div>
    </div>
  );
}

export function GoalPopup({ goalPopup, setGoalPopup, onSave, onClose }) {
  if (!goalPopup) return null;
  
  return (
    <div className="popup-overlay" onClick={onClose}>
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
          <button onClick={onSave}>확인</button>
          <button onClick={onClose}>취소</button>
        </div>
      </div>
    </div>
  );
}
