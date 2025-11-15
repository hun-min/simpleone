#NoEnv
SetBatchLines, -1

isRunning := false
prevClipboard := ""

Menu, Tray, Tip, OFF

F12::
    isRunning := !isRunning
    if (isRunning) {
        ToolTip, ON
        SetTimer, Check, 3000
    } else {
        ToolTip, OFF
        SetTimer, Check, Off
        Menu, Tray, Tip, OFF
    }
    SetTimer, HideTip, -1000
return

Check:
    ; VS Code 창인지 확인
    WinGetActiveTitle, activeTitle
    if (!InStr(activeTitle, "Visual Studio Code"))
        return
    
    Send, ^a
    Sleep, 50
    Send, ^c
    Sleep, 100
    current := Clipboard
    
    ; 새로 추가된 부분만 추출
    oldLen := StrLen(prevClipboard)
    newText := ""
    if (StrLen(current) > oldLen) {
        newText := SubStr(current, oldLen + 1)
    }
    
    ; 새 텍스트에서만 "shell reject run" 카운트
    count := 0
    pos := 1
    Loop {
        pos := InStr(newText, "shell reject run", false, pos)
        if (pos = 0)
            break
        count++
        pos++
    }
    
    Menu, Tray, Tip, ON: %count%개
    if (count >= 3) {
        ToolTip, %count%개 발견! 실행
        SetTimer, HideTip, -1000
        Send, ^+{Enter}
        Sleep, 1000
    }
    
    prevClipboard := current
return

HideTip:
    ToolTip
return
