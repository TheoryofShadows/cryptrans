@echo off
REM CrypTrans GitHub Initialization Script for Windows
echo ========================================
echo   CrypTrans GitHub Setup
echo ========================================
echo.

REM Check if git is installed
git --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Git is not installed!
    echo Please install Git from: https://git-scm.com/
    pause
    exit /b 1
)

echo [1/5] Initializing Git repository...
git init
if errorlevel 1 (
    echo ERROR: Failed to initialize repository
    pause
    exit /b 1
)

echo [2/5] Adding all files...
git add .
if errorlevel 1 (
    echo ERROR: Failed to add files
    pause
    exit /b 1
)

echo [3/5] Creating initial commit...
git commit -m "Initial commit: CrypTrans - Embodying Cypherpunk and Extropian Visions"
if errorlevel 1 (
    echo ERROR: Failed to commit
    pause
    exit /b 1
)

echo.
echo ========================================
echo   Setup Complete!
echo ========================================
echo.
echo Next steps:
echo.
echo 1. Create repository on GitHub:
echo    https://github.com/new
echo    Name: cryptrans
echo    Description: CrypTrans: Embodying Cypherpunk and Extropian Visions
echo.
echo 2. Add remote and push:
echo    git remote add origin https://github.com/YOUR_USERNAME/cryptrans.git
echo    git branch -M main
echo    git push -u origin main
echo.
echo 3. Start development:
echo    See QUICK_START.md for deployment instructions
echo.
pause

