@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Gravacao de roteiro
echo.
set /p URL=Endereco (URL) da pagina de login do sistema: 
set /p NOME=Nome do roteiro (ex.: tjsp-esaj, trt2-pje, tjrs-eproc): 
.venv\Scripts\python -m app gravar "%URL%" "%NOME%"
pause
