import { useMemo } from 'react';

export const useLevelSystem = (timerLogs) => {
  const totalMinutes = useMemo(() => {
    let minutes = 0;
    Object.values(timerLogs).forEach(dayLogs => {
      dayLogs.forEach(log => {
        if (log.duration) {
          minutes += Math.floor(log.duration / 60);
        }
      });
    });
    return minutes;
  }, [timerLogs]);

  const levels = [
    { level: 1, title: "🌱 비기너", min: 0, max: 60 },
    { level: 2, title: "🥚 꿈꾸는 자", min: 60, max: 300 },
    { level: 3, title: "🐣 해츨링", min: 300, max: 600 },
    { level: 4, title: "🦅 러너", min: 600, max: 1800 },
    { level: 5, title: "🔥 몰입가", min: 1800, max: 3000 },
    { level: 6, title: "🧘 마스터", min: 3000, max: 6000 },
    { level: 7, title: "👑 0.1%", min: 6000, max: 999999 },
  ];

  const currentStatus = useMemo(() => {
    const current = levels.find(l => totalMinutes >= l.min && totalMinutes < l.max) || levels[levels.length - 1];
    const next = levels.find(l => l.level === current.level + 1);
    
    let progress = 0;
    if (next) {
      const totalRange = current.max - current.min;
      const currentProgress = totalMinutes - current.min;
      progress = Math.min(100, Math.floor((currentProgress / totalRange) * 100));
    } else {
      progress = 100;
    }

    return {
      ...current,
      totalMinutes,
      progress,
      nextTitle: next ? next.title : "신(God)"
    };
  }, [totalMinutes, levels]);

  return currentStatus;
};
