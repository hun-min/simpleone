#Persistent
#SingleInstance Force

; Scan for Run button every 2 seconds
SetTimer, AutoRunShell, 500

; Track last execution time
lastExecutionTime := 0

AutoRunShell:
    if WinActive("ahk_exe Code.exe")
    {
        ; Search for Run button image (full screen scan)
        ImageSearch, FoundX, FoundY, 0, 0, A_ScreenWidth, A_ScreenHeight, *50 C:\Users\hun\Resilio Sync\Sync\app\simpleone\runs.png
        
        if (ErrorLevel = 0)
        {
            currentTime := A_TickCount
            if (currentTime - lastExecutionTime > 1500)
            {
                ; Run button found! Execute immediately
                Send ^+{Enter}
                lastExecutionTime := A_TickCount
            }
        }
    }
return

; F1 key to test image recognition
F1::
    ImageSearch, TestX, TestY, 0, 0, A_ScreenWidth, A_ScreenHeight, *50 C:\Users\hun\Resilio Sync\Sync\app\simpleone\runs.png
    if (ErrorLevel = 0)
        MsgBox, Image FOUND at X:%TestX% Y:%TestY%
    else
        MsgBox, Image NOT FOUND!
return

; Ctrl+Alt+Q to terminate script
^!q::
    MsgBox, AWS Q auto-execution script terminated.
    ExitApp
return

; Pause key to pause/resume script
Pause::
    Pause, Toggle
    if (A_IsPaused)
        MsgBox, PAUSED
    else
        MsgBox, RESUMED
return