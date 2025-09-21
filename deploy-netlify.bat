@echo off
echo 🌐 VENO.AI - Deploy para Netlify
echo =================================

echo.
echo 📦 Instalando dependências...
call npm install

echo.
echo 🔨 Fazendo build do projeto...
call npm run build

echo.
echo 📤 Enviando para GitHub...
git add .
git commit -m "Deploy para Netlify - VENO.AI"
git push origin main

echo.
echo ✅ Deploy concluído!
echo 🌐 Netlify fará o deploy automaticamente
echo 🔗 Acesse: https://venoai.xyz
echo.
echo 📋 Próximos passos:
echo 1. Acesse: https://netlify.com
echo 2. Conecte com GitHub
echo 3. Selecione o repositório veno-ai
echo 4. Configure o domínio venoai.xyz
echo.
pause
