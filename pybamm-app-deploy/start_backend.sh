#!/bin/bash
cd "$(dirname "$0")/backend"
echo "🔋 Starting PyBaMM backend on http://localhost:8000"
echo "📖 API docs at http://localhost:8000/docs"
python3 -m uvicorn main:app --host 0.0.0.0 --port 8000 --reload
