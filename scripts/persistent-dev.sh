#!/bin/bash
# Persistent dev server — keeps running even if parent shell exits
cd /home/z/my-project

# Kill any existing server
pkill -9 -f "next dev" 2>/dev/null
sleep 2

# Start the dev server
/home/z/my-project/node_modules/.bin/next dev -H 0.0.0.0 -p 3000 >> /home/z/my-project/dev.log 2>&1 &
SRV_PID=$!
echo "[$(date)] Dev server started (PID: $SRV_PID)"

# Keep alive loop — check every 5s, restart if dead
while true; do
  sleep 5
  if ! kill -0 $SRV_PID 2>/dev/null; then
    echo "[$(date)] Server died, restarting..." >> /home/z/my-project/dev.log 2>&1
    /home/z/my-project/node_modules/.bin/next dev -H 0.0.0.0 -p 3000 >> /home/z/my-project/dev.log 2>&1 &
    SRV_PID=$!
    echo "[$(date)] Restarted (PID: $SRV_PID)"
  fi
done
