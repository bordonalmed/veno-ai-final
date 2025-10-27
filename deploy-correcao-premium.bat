@echo off
echo 🚀 VENO.AI - Deploy da Correção de Sincronização Premium
echo ========================================================
echo.

echo 📝 Verificando mudanças...
git status

echo.
echo ⏸️  Pressione qualquer tecla para continuar com o deploy...
pause

echo.
echo 📦 Fazendo commit das mudanças...
git add .
git commit -m "Fix: Sincronização de plano Premium entre dispositivos (Firebase)"

echo.
echo 🔨 Fazendo build do projeto...
call npm run build

echo.
echo 📤 Enviando para GitHub...
git push origin main

echo.
echo ✅ Deploy iniciado!
echo 🌐 Netlify fará o deploy automaticamente em alguns minutos
echo 🔗 Acesse: https://venoai.xyz
echo.
echo 📋 Para testar:
echo 1. Aguarde o deploy (5-10 minutos)
echo 2. Faça upgrade para Premium em um dispositivo
echo 3. Abra em outro dispositivo (celular ou outro computador)
echo 4. O status Premium deve aparecer automaticamente
echo.
pause

