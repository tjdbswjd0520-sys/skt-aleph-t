@echo off
chcp 65001 >nul
cd /d "%~dp0"
if not "%~1"=="" goto run_arg
echo TXT 또는 JSON 파일 경로를 입력하세요.
set /p "INPUT=파일 경로: "
py tools\update_portfolio.py "%INPUT%"
goto finish
:run_arg
py tools\update_portfolio.py "%~1"
:finish
echo.
pause
