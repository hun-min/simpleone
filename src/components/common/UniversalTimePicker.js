import React, { useState, useEffect } from 'react';

const UniversalTimePicker = ({ value, type = 'duration', onChange }) => {
  // type: 'time' (시각, 예: 14:30) | 'duration' (기간, 예: 90초)
  
  const [h, setH] = useState('');
  const [m, setM] = useState('');
  const [s, setS] = useState('');

  // 초기값 파싱
  useEffect(() => {
    if (type === 'time') {
      // "14:30" 문자열 처리
      const [hour, min] = (value || '00:00').split(':');
      setH(hour);
      setM(min);
      setS('00'); // 시각 모드에선 초 무시
    } else {
      // 초 단위 정수 처리 (예: 3665초 -> 1시간 1분 5초)
      const totalSec = parseInt(value) || 0;
      setH(String(Math.floor(totalSec / 3600)).padStart(2, '0'));
      setM(String(Math.floor((totalSec % 3600) / 60)).padStart(2, '0'));
      setS(String(totalSec % 60).padStart(2, '0'));
    }
  }, [value, type]);

  // 값 변경 핸들러
  const handleChange = (field, val) => {
    // 빈 문자열이면 0으로 처리
    const parsed = val === '' ? 0 : parseInt(val);
    let newVal = isNaN(parsed) ? 0 : parsed;
    if (newVal < 0) newVal = 0;
    
    // 시간 제한 로직
    if (field === 'm' || field === 's') {
      if (newVal > 59) newVal = 59;
    }
    if (type === 'time' && field === 'h') {
      if (newVal > 23) newVal = 23;
    }

    const strVal = String(newVal).padStart(2, '0');
    
    let nextH = h, nextM = m, nextS = s;
    if (field === 'h') nextH = strVal;
    if (field === 'm') nextM = strVal;
    if (field === 's') nextS = strVal;

    // 부모에게 전달할 값 계산
    if (type === 'time') {
      onChange(`${nextH}:${nextM}`);
    } else {
      const totalSeconds = (parseInt(nextH) * 3600) + (parseInt(nextM) * 60) + parseInt(nextS);
      onChange(totalSeconds);
    }
    
    // 로컬 상태 업데이트
    if (field === 'h') setH(strVal);
    if (field === 'm') setM(strVal);
    if (field === 's') setS(strVal);
  };

  return (
    <div className="universal-picker">
      {/* 시(Hour) */}
      <div className="picker-column">
        <input 
          type="number" 
          value={h} 
          onChange={(e) => handleChange('h', e.target.value)}
          onClick={(e) => e.target.select()}
        />
        <span className="picker-label">시간</span>
      </div>

      <span className="picker-separator">:</span>

      {/* 분(Minute) */}
      <div className="picker-column">
        <input 
          type="number" 
          value={m} 
          onChange={(e) => handleChange('m', e.target.value)}
          onClick={(e) => e.target.select()}
        />
        <span className="picker-label">분</span>
      </div>

      {/* 초(Second) - duration 모드일 때만 표시 */}
      {type === 'duration' && (
        <>
          <span className="picker-separator">:</span>
          <div className="picker-column">
            <input 
              type="number" 
              value={s} 
              onChange={(e) => handleChange('s', e.target.value)}
              onClick={(e) => e.target.select()}
            />
            <span className="picker-label">초</span>
          </div>
        </>
      )}
    </div>
  );
};

export default UniversalTimePicker;
