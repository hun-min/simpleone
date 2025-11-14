#Persistent
#SingleInstance Force
SetTitleMatchMode, 2

; VS Code가 활성화되어 있을 때만 작동
#IfWinActive ahk_exe Code.exe

; 0.5초마다 화면 전체에서 shell 박스와 Run 버튼 찾기
SetTimer, AutoRunShell, 5000

AutoRunShell:
    ; VS Code 창이 활성화되어 있는지 확인
    if WinActive("ahk_exe Code.exe")
    {
        ; 화면 전체에서 shell 박스 배경색 찾기 (0x1F1F1F)
        PixelSearch, shellX, shellY, 0, 0, A_ScreenWidth, A_ScreenHeight, 0x1F1F1F, 10, Fast RGB
        shellFound := (ErrorLevel = 0)
        
        ; shell 박스를 찾았다면, 그 근처에서 Run 버튼 찾기
        runFound := false
        if (shellFound)
        {
            ; shell 박스 오른쪽 300픽셀 범위 내에서 Run 버튼 찾기
            searchLeft := shellX
            searchTop := shellY - 30
            searchRight := shellX + 300
            searchBottom := shellY + 30
            
            if (searchRight > A_ScreenWidth)
                searchRight := A_ScreenWidth
            if (searchTop < 0)
                searchTop := 0
            
            ; Run 버튼 색상 찾기 (0xCCCCCC)
            PixelSearch, runX, runY, searchLeft, searchTop, searchRight, searchBottom, 0xCCCCCC, 15, Fast RGB
            runFound := (ErrorLevel = 0)
        }
        
        ; shell 박스와 Run 버튼이 둘 다 발견되면 바로 실행
        if (shellFound && runFound)
        {
            Sleep 150
            Send ^+{Enter}
            Sleep 1000  ; 실행 후 1초 대기 (중복 실행 방지)
        }
    }
return

#IfWinActive

; Ctrl+Alt+Q로 스크립트 종료
^!q::
    MsgBox, AWS Q 자동 실행 스크립트를 종료합니다.
    ExitApp
return

; Pause 키로 스크립트 일시정지/재개
Pause::
    Pause, Toggle
    if (A_IsPaused)
        ToolTip, AWS Q 자동실행 일시정지
    else
        ToolTip, AWS Q 자동실행 재개
    Sleep 1000
    ToolTip
return