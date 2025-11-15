#NoEnv
SetBatchLines, -1

isRunning := false

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
    if (!InStr(activeTitle, "Visual Studio Code") && !InStr(activeTitle, "Visual Studio Code"))
        return
    
    Send, ^a
    Sleep, 50
    Send, ^c
    Sleep, 100
    text := Clipboard
    
    ; 마지막 1000자만 확인
    textLen := StrLen(text)
    if (textLen > 1000)
        text := SubStr(text, textLen - 999)
    
    count := 0
    pos := 1
    Loop {
        pos := InStr(text, "shell reject run", false, pos)
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
return

HideTip:
    ToolTip
return
