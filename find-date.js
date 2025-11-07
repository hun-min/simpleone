// 브라우저 콘솔에서 실행할 코드
const dates = JSON.parse(localStorage.getItem('dates') || '{}');
const keys = Object.keys(dates);
console.log('모든 날짜 키:', keys);

// 2025-11-4 형식 찾기
const wrongFormat = keys.filter(k => k.match(/^\d{4}-\d{1,2}-\d{1}$/));
console.log('잘못된 형식 (2025-11-4):', wrongFormat);

// 해당 날짜의 데이터 확인
wrongFormat.forEach(key => {
  console.log(`\n${key}:`, dates[key]);
});

// 수정 방법
if (wrongFormat.length > 0) {
  console.log('\n수정 방법:');
  wrongFormat.forEach(key => {
    const [year, month, day] = key.split('-');
    const correctKey = `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
    console.log(`"${key}" → "${correctKey}"`);
  });
}
