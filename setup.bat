@echo off
echo Arc Raiders Countdown Bot Setup
echo ================================
echo.

echo Checking if Node.js is installed...
node --version >nul 2>&1
if %errorlevel% neq 0 (
    echo Node.js is not installed!
    echo Please install Node.js from https://nodejs.org/
    echo Then run this script again.
    pause
    exit /b 1
)

echo Node.js is installed!
echo.

echo Installing dependencies...
npm install

if %errorlevel% neq 0 (
    echo Failed to install dependencies!
    pause
    exit /b 1
)

echo.
echo Setup complete!
echo.
echo Next steps:
echo 1. Create a Discord bot at https://discord.com/developers/applications
echo 2. Edit config.js with your bot token and channel ID
echo 3. Run: npm start
echo.
pause
