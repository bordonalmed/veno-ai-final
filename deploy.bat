@echo off
echo 🚀 VENO.AI - Deploy para GitHub
echo ================================

echo.
echo 📦 Instalando dependências...
call npm install

echo.
echo 🔨 Fazendo build do projeto...
call npm run build

echo.
echo 📤 Enviando para GitHub...
git add .
git commit -m "Deploy automático - VENO.AI"
git push origin main

echo.
echo ✅ Deploy concluído!
echo 🌐 Acesse: https://venoai.xyz
echo.
pause
