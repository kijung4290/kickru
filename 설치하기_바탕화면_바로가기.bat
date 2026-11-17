@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [벤치에서 발롱까지 에디션] 바탕화면 & 시작메뉴 단독 앱 바로가기를 설치합니다...
powershell.exe -NoProfile -ExecutionPolicy Bypass -File "%~dp0install-shortcut.ps1"
echo.
echo 설치 완료! 바탕화면의 [벤치에서 발롱까지 에디션] 아이콘으로 단독 앱처럼 실행할 수 있습니다.
pause
