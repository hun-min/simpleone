# 중요 주의사항

## 작업 방식
- **절대 사용자 의도를 유추해서 임의로 수정하지 말것**
- **사용자가 추가 요청한 기능을 임의로 제거하지 말 것**
- 확실하지 않을 때는 반드시 먼저 질문하고 확인받은 후 작업
- 사용자가 요청한 것만 정확히 수행

## 배포 방식
- **빌드 경고 있으면 Vercel 배포 안 됨 - 반드시 경고 제거 후 배포**
- **git add, commit, push를 한 번에 실행할 것**
- 예: `git add . && git commit -m "메시지" && git push`
- 사용자가 "배포 ㄱ" 하면 한 번에 처리

## 최근 실수 사례
- 추가(+) 버튼 기능을 잘못 이해하고 임의로 변경함
- 사용자 확인 없이 UI를 대폭 수정함
- git 명령어를 여러 번 나눠서 실행해서 사용자를 불편하게 함
- Shift+Del 확인 팝업을 포커스 문제 때문이라며 임의로 제거함 (별개의 기능인데도)


## 치명적 실수 사례 (2025-01-XX)
### Toggl 재시도 로직 삭제 사건
- **문제**: "1초 미만일 때 Toggl 전송 안 함" 기능 추가 중 기존 재시도 로직 전체를 삭제함
- **원인**: `shouldSendToToggl` 조건 추가하면서 불필요하게 전체 조건문 구조를 변경
- **결과**: Toggl 타이머가 멈추지 않는 치명적 버그 발생
- **교훈**: 
  - 기존 로직을 절대 함부로 수정하지 말 것
  - 조건 추가 시 기존 구조 유지할 것
  - 수정 전 관련 코드 전체 확인 필수

### toggleTimer 함수의 Toggl 정지 로직 (절대 삭제 금지)
```javascript
if (togglToken && togglEntryId) {
  const stopToggl = async (retryCount = 0) => {
    try {
      // PATCH 요청
      if (!stopRes.ok) throw new Error('Toggl 종료 실패');
      // togglEntries 삭제
    } catch (err) {
      if (retryCount < 2) {
        setTimeout(() => stopToggl(retryCount + 1), 2000); // 재시도
      } else {
        // 강제 종료: 현재 실행중인 타이머 조회 후 PATCH
        // 실패해도 togglEntries 삭제
      }
    }
  };
  stopToggl();
}
```
- **3번 재시도 (2초 간격)**
- **강제 종료 (GET → PATCH)**
- **반드시 togglEntries 삭제**
