#!/bin/bash
cd \Users\Administrator\Desktop\IT\Personal_Projects\C.S.M.S\Code
source venv/bin/activate
exec python -m uvicorn main:app --host 0.0.0.0 --port 8000