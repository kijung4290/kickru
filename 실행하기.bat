@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo [벤치에서 발롱까지 - 커스텀 에디터 버전] 서버를 시작합니다...
echo 브라우저가 열리지 않으면 http://localhost:3300 으로 접속하세요.
start "" cmd /c "timeout /t 1 /nobreak >nul && start http://localhost:3300"
node server.js
pause
