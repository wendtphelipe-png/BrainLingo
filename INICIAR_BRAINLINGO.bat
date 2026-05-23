@echo off
title BrainLingo - Servidor

echo ========================================================
echo INICIALIZANDO O SERVIDOR DO BRAINLINGO
echo ========================================================
echo.

node -v >nul 2>&1
if errorlevel 1 goto ERROR_NO_NODE

echo [1/3] Acessando pasta do projeto...
cd /d "D:\downloads\WebProjects\BrainLingo\backend"
if errorlevel 1 goto ERROR_NO_FOLDER

echo [2/3] Agendando abertura do painel no navegador...
start /min cmd /c "timeout /t 3 /nobreak > nul && start http://localhost:3001/admin"

echo [3/3] Iniciando o servidor de traducao...
echo.
echo --------------------------------------------------------
echo DICA: DEIXE ESTA JANELA ABERTA ENQUANTO ESTIVER USANDO!
echo --------------------------------------------------------
echo.

call npm start
if errorlevel 1 goto ERROR_SERVER_CRASH

goto END

:ERROR_NO_NODE
color 0C
echo [ERRO] O Node.js nao foi encontrado no seu computador!
echo Instale o Node.js em: https://nodejs.org/
echo.
pause
exit /b

:ERROR_NO_FOLDER
color 0C
echo [ERRO] Nao foi possivel acessar a pasta do backend!
echo.
pause
exit /b

:ERROR_SERVER_CRASH
color 0C
echo.
echo [ERRO] O servidor encontrou um problema e parou.
echo.
pause
exit /b

:END
