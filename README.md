# Goal Tracker

## 설정 방법

1. Firebase 프로젝트 생성
   - https://console.firebase.google.com/ 접속
   - 새 프로젝트 생성
   - Firestore Database 활성화

2. Firebase 설정
   - 프로젝트 설정 > 일반 > 앱 추가 (웹)
   - 설정 정보를 `src/firebase.js`에 입력

3. 실행
   ```
   npm start
   ```

## 기능
- 할 일 작성
- 계층 구조 (Tab/Shift+Tab)
- 시간 추적 (오늘/총/목표)
- 날짜별 관리
- 실시간 동기화
