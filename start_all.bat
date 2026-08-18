@echo off
echo Starting VortX Labs Unified Background Worker...
echo.
start "VortX-Worker" .venv\Scripts\python daemons\vortx_worker.py
echo.
echo Worker started.
pause
