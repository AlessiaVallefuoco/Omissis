#!/bin/bash
# Omissis demo: serve this folder on http://127.0.0.1:8000 and open it in the browser.
cd "$(dirname "$0")" || exit 1
PORT=8000
while lsof -i :"$PORT" >/dev/null 2>&1; do PORT=$((PORT + 1)); done
echo "Omissis demo running on http://127.0.0.1:$PORT  (close this window to stop)"
( sleep 1; open "http://127.0.0.1:$PORT" ) &
if command -v python3 >/dev/null 2>&1; then
  python3 -m http.server "$PORT" --bind 127.0.0.1
else
  echo "python3 not found. Install it, or run: npx serve -l $PORT"
  read -r
fi
