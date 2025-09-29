@echo off
echo Iniciando VENO.AI com configuracoes otimizadas...
echo.

REM Limpar cache do npm
echo Limpando cache do npm...
npm cache clean --force

REM Configurar Node.js para usar mais memoria
set NODE_OPTIONS=--max-old-space-size=4096

REM Iniciar aplicacao
echo Iniciando aplicacao React...
echo.
echo A aplicacao sera aberta em: http://localhost:3000
echo.
echo Pressione Ctrl+C para parar o servidor
echo.

npm start
