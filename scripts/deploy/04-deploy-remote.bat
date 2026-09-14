@echo off
chcp 65001 >nul
setlocal
cd /d "%~dp0\..\.."

echo ==> Proje: %CD%
echo ==> Branch: cursor/booking-quick-filters-ui

where git >nul 2>&1
if errorlevel 1 (
  echo HATA: git bulunamadi. Git for Windows kurulu olmali.
  pause
  exit /b 1
)

if not exist "%USERPROFILE%\.ssh\tatildeyiz_deploy" (
  echo HATA: SSH anahtari yok: %USERPROFILE%\.ssh\tatildeyiz_deploy
  pause
  exit /b 1
)

git fetch origin
git checkout cursor/booking-quick-filters-ui
git pull origin cursor/booking-quick-filters-ui
if errorlevel 1 (
  echo HATA: git pull basarisiz
  pause
  exit /b 1
)

echo ==> Sunucuya deploy basliyor...
ssh -i "%USERPROFILE%\.ssh\tatildeyiz_deploy" -o IdentitiesOnly=yes -o StrictHostKeyChecking=accept-new root@185.184.210.96 "cd /var/www/tatil-villa && bash scripts/deploy/02-deploy-update.sh"
set ERR=%ERRORLEVEL%
echo.
if "%ERR%"=="0" (
  echo DEPLOY TAMAMLANDI
) else (
  echo DEPLOY HATA - exit %ERR%
)
pause
exit /b %ERR%
