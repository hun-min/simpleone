import { useState, useEffect } from 'react';

export const useTimer = (activeTimers, quickTimer) => {
  const [timerSeconds, setTimerSeconds] = useState({});
  const [quickTimerSeconds, setQuickTimerSeconds] = useState(0);

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

  return { timerSeconds, quickTimerSeconds, setQuickTimerSeconds };
};
