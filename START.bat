@echo off
chcp 65001 > nul
echo ========================================
echo TradingView Chart Spring 시작
echo ========================================
echo.
echo 이 스크립트는 Flask와 Spring Boot를 동시에 실행합니다.
echo.
echo Flask (Port 5000): Yahoo Finance API 백엔드
echo Spring Boot (Port 8080): 메인 웹 서버
echo.
echo ========================================
echo.

REM Flask 서비스 시작
echo [1/2] Flask 서비스 시작 중...
start "Flask Service" cmd /k "cd flask-service && python -m venv venv && venv\Scripts\activate && pip install -q -r requirements.txt && python app.py"
echo Flask 서비스가 백그라운드에서 시작되었습니다.
echo.

REM 잠시 대기 (Flask가 시작될 시간을 줌)
timeout /t 3 /nobreak > nul

echo [2/2] Spring Boot 서비스 시작 중...
echo.
gradlew.bat bootRun

pause

