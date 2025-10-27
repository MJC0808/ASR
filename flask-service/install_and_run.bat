@echo off
chcp 65001 > nul
echo ========================================
echo Flask Service - Clean Install
echo ========================================
echo.

REM Remove old venv
if exist "venv\" (
    echo Removing old virtual environment...
    rmdir /s /q venv
)

REM Create new venv
echo Creating new virtual environment...
python -m venv venv
echo.

REM Activate venv
echo Activating virtual environment...
call venv\Scripts\activate.bat

REM Upgrade pip
echo Upgrading pip...
python -m pip install --upgrade pip
echo.

REM Install dependencies one by one
echo Installing Flask...
pip install Flask
echo.

echo Installing flask-cors...
pip install flask-cors
echo.

echo Installing requests...
pip install requests
echo.

echo Installing python-dotenv...
pip install python-dotenv
echo.

echo Installing pandas (this may take a moment)...
pip install pandas
echo.

echo Installing yfinance...
pip install yfinance
echo.

REM Create .env if not exists
if not exist ".env" (
    echo Creating .env file...
    (
        echo FLASK_PORT=5000
        echo FLASK_DEBUG=True
    ) > .env
    echo.
)

REM Run Flask
echo ========================================
echo Starting Flask service...
echo Port: 5000
echo URL: http://localhost:5000
echo ========================================
echo.
python app.py

pause

