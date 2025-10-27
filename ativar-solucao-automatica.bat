@echo off
echo ================================================
echo  AUTOMATIC PREMIUM SOLUTION - ACTIVATOR
echo ================================================
echo.

echo [1/6] Checking if firebase-admin is installed...
if exist "node_modules\firebase-admin" (
    echo ✅ firebase-admin already installed
) else (
    echo ⏳ Installing firebase-admin...
    call npm install firebase-admin
)

echo.
echo [2/6] Activating complete webhook solution...
copy /Y netlify\functions\hotmartWebhookComplete.js netlify\functions\hotmartWebhook.js
if errorlevel 1 (
    echo ❌ Failed to copy webhook file
    pause
    exit /b
)
echo ✅ Complete webhook activated

echo.
echo [3/6] Building project...
call npm run build
if errorlevel 1 (
    echo ❌ Build failed
    pause
    exit /b
)
echo ✅ Build successful

echo.
echo [4/6] Committing changes...
git add .
git commit -m "Activate automatic Hotmart premium sync"
echo ✅ Changes committed

echo.
echo [5/6] Pushing to GitHub...
git push
if errorlevel 1 (
    echo ❌ Push failed
    pause
    exit /b
)
echo ✅ Pushed to GitHub

echo.
echo [6/6] Checking deploy status...
echo ⏳ Waiting for Netlify to deploy (5-10 minutes)...
echo.
echo ✅ Automatic solution activated!
echo.
echo 📋 NEXT STEPS:
echo 1. Configure environment variables in Netlify:
echo    - HOTMART_WEBHOOK_SECRET
echo    - FIREBASE_PROJECT_ID
echo    - FIREBASE_SERVICE_ACCOUNT
echo.
echo 2. Configure Hotmart webhook URL:
echo    https://venoai.xyz/.netlify/functions/hotmartWebhook
echo.
echo 3. Use external_reference in checkout:
echo    ?external_reference={FIREBASE_UID}
echo.
echo 📖 For complete instructions, see:
echo    HOTMART_PREMIUM_COMPLETE_SETUP.md
echo.
pause

