import React from 'react';

export default function SettingsPopup({ 
  user, 
  isSyncing, 
  togglToken, 
  setTogglToken,
  onClose,
  onDownloadBackup,
  onLoadBackup,
  onFirebaseLogin,
  onLogout,
  onForceUpload,
  onForceDownload
}) {
  return (
    <div className="popup-overlay" onClick={onClose}>
      <div className="popup settings-popup" onClick={(e) => e.stopPropagation()}>
        <h3>⚙️ 설정</h3>
        <button onClick={onClose} style={{ position: 'absolute', top: '10px', right: '10px', background: 'none', border: 'none', fontSize: '20px', cursor: 'pointer', color: '#888' }}>✕</button>

        <div className="settings-section">
          <h4>💾 장치 저장</h4>
          <div style={{ display: 'flex', gap: '5px' }}>
            <button onClick={onDownloadBackup} className="settings-btn" style={{ width: 'auto', flex: 1 }}>💾 저장</button>
            <input
              type="file"
              accept=".json"
              onChange={onLoadBackup}
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
                <button onClick={onForceUpload} className="settings-btn" style={{ width: 'auto', flex: 1 }}>⬆️ 업로드</button>
                <button onClick={onForceDownload} className="settings-btn" style={{ width: 'auto', flex: 1 }}>⬇️ 다운로드</button>
                <button onClick={onLogout} className="settings-btn" style={{ width: 'auto', flex: 1 }}>로그아웃</button>
              </div>
            </>
          ) : (
            <button onClick={onFirebaseLogin} className="settings-btn">☁️ 로그인</button>
          )}
        </div>
        
        <div className="settings-section">
          <h4>⏱️ Toggl 연동</h4>
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
          <button onClick={onClose} className="settings-btn">닫기</button>
        </div>
      </div>
    </div>
  );
}
