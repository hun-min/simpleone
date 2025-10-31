# Workspace 기능 규칙

## 절대 금지 사항
1. ❌ Firebase 자동 업로드 제거 금지
2. ❌ useEffect 의존성 배열 무분별 수정 금지

## 무한 루프 방지 방법
- `useRef`로 업로드 플래그 관리
- onSnapshot에서 자신이 업로드한 데이터는 무시
