@echo off
chcp 65001 >nul
cd /d "%~dp0"
echo Instalando o Protocolo Automatico...
where python >nul 2>nul || (echo Python nao encontrado. Instale em https://www.python.org/downloads/ marcando "Add python.exe to PATH". & pause & exit /b 1)
python -m venv .venv || (pause & exit /b 1)
.venv\Scripts\python -m pip install --upgrade pip
.venv\Scripts\python -m pip install -r requirements.txt || (pause & exit /b 1)
if not exist config.yaml copy config.example.yaml config.yaml >nul
if not exist "%USERPROFILE%\Documents\Protocolar" mkdir "%USERPROFILE%\Documents\Protocolar"
echo.
echo Instalacao concluida. Revise o arquivo config.yaml e depois abra iniciar.bat
pause
