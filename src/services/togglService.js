export const stopTogglTimer = async (togglToken, togglEntryId, key, togglEntries, setTogglEntries) => {
  let success = false;
  
  if (togglEntryId) {
    try {
      const stopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${togglEntryId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' }
      });
      if (stopRes.ok) success = true;
    } catch {}
  }
  
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
          } catch {}
        }
      } catch {}
      
      if (currentData && currentData.id) {
        try {
          const forceStopRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, { 
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' }
          });
          if (forceStopRes.ok) success = true;
        } catch {}
      }
    } catch {}
  }
  
  const newEntries = { ...togglEntries };
  delete newEntries[key];
  setTogglEntries(newEntries);
};

export const startTogglTimer = async (togglToken, taskText) => {
  try {
    const currentRes = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' }
    });
    let currentData = null;
    try {
      const currentText = await currentRes.text();
      if (currentText.trim() && currentRes.ok) {
        try {
          currentData = JSON.parse(currentText);
        } catch {}
      }
    } catch {}
    
    if (currentData && currentData.id) {
      try {
        await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}&entryId=${currentData.id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' }
        });
      } catch {}
    }
  } catch {}
  
  try {
    const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: taskText || '(제목 없음)',
        start: new Date().toISOString(),
        duration: -1,
        created_with: 'SimpleOne'
      })
    });
    
    let data = null;
    try {
      const responseText = await res.text();
      if (responseText.trim()) {
        try {
          data = JSON.parse(responseText);
        } catch {}
      }
    } catch {}
    
    if (res.ok && data && data.id) {
      return data.id;
    }
  } catch (err) {
    console.warn('Toggl 시작 중 오류:', err);
  }
  return null;
};

export const saveTogglEntry = async (togglToken, taskText, startTime, duration) => {
  try {
    const res = await fetch(`/api/toggl?token=${encodeURIComponent(togglToken)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        description: taskText,
        start: new Date(startTime).toISOString(),
        duration: duration,
        created_with: 'SimpleOne'
      })
    });
    if (!res.ok) {
      console.error('Toggl 저장 실패');
    }
  } catch (err) {
    console.error('Toggl 저장 실패:', err);
  }
};
