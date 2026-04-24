#!/bin/bash
cd /home/currenci/work/C.S.M.S/Code/Backend
source venv/bin/activate
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000