#!/bin/bash
# Combined: start dev + verify with agent-browser, keeping server alive throughout
cd /home/z/my-project
pkill -9 -f "next dev" 2>/dev/null
sleep 1
setsid bash -c 'cd /home/z/my-project && exec /home/z/my-project/node_modules/.bin/next dev -H 0.0.0.0 -p 3000 > /home/z/my-project/dev.log 2>&1' < /dev/null & disown
SRV=$!
echo "dev PID $SRV"

# Wait for boot
for i in $(seq 1 15); do
  sleep 2
  CODE=$(curl -s -o /dev/null -w "%{http_code}" http://localhost:3000/ 2>/dev/null)
  [ "$CODE" = "200" ] && { echo "UP after ${i} tries"; break; }
done

# Check server alive
if [ "$(curl -s -o /dev/null -w '%{http_code}' http://localhost:3000/ 2>/dev/null)" != "200" ]; then
  echo "FAILED to start"; exit 1
fi

export AGENT_BROWSER_SESSION="shankar-verify"
echo "=== HOME PAGE ==="
agent-browser open "http://localhost:81/" 2>&1 | tail -1
sleep 4
agent-browser screenshot /home/z/my-project/verify-home.png 2>&1 | tail -1

# Add an item to cart
echo "=== ADD TO CART ==="
agent-browser snapshot -i 2>&1 > /tmp/snap1.txt
ADD_REF=$(grep -oE '@e[0-9]+' /tmp/snap1.txt | head -30 | tail -10 | head -1)
# find first "Add" button ref
ADD_REF=$(grep -i "add " /tmp/snap1.txt | head -1 | grep -oE '@e[0-9]+' | head -1)
echo "Add button ref: $ADD_REF"
if [ -n "$ADD_REF" ]; then
  agent-browser click "$ADD_REF" 2>&1 | tail -1
  sleep 2
fi

echo "=== GO TO CART ==="
agent-browser open "http://localhost:81/cart" 2>&1 | tail -1
sleep 3
agent-browser snapshot -i 2>&1 | head -25

echo "=== ADMIN LOGIN ==="
agent-browser open "http://localhost:81/admin" 2>&1 | tail -1
sleep 3
agent-browser snapshot -i 2>&1 | head -15

# Fill admin login
EMAIL_REF=$(agent-browser snapshot -i 2>&1 | grep -i "email" | grep -oE '@e[0-9]+' | head -1)
echo "email ref: $EMAIL_REF"
if [ -n "$EMAIL_REF" ]; then
  agent-browser fill "$EMAIL_REF" "utkarshmaurya88409@gmail.com" 2>&1 | tail -1
fi
# Find password field
PW_REF=$(agent-browser snapshot -i 2>&1 | grep -i "password" | grep -oE '@e[0-9]+' | head -1)
echo "pw ref: $PW_REF"
if [ -n "$PW_REF" ]; then
  agent-browser fill "$PW_REF" "0987654321" 2>&1 | tail -1
fi
# Find sign in button
SIGN_REF=$(agent-browser snapshot -i 2>&1 | grep -i "sign in" | grep -oE '@e[0-9]+' | head -1)
echo "sign ref: $SIGN_REF"
if [ -n "$SIGN_REF" ]; then
  agent-browser click "$SIGN_REF" 2>&1 | tail -1
  sleep 4
  agent-browser snapshot -i 2>&1 | head -20
  agent-browser screenshot /home/z/my-project/verify-admin.png 2>&1 | tail -1
fi

echo "=== MENU PAGE ==="
agent-browser open "http://localhost:81/menu" 2>&1 | tail -1
sleep 3
agent-browser screenshot /home/z/my-project/verify-menu.png 2>&1 | tail -1

echo "=== CHECK DEV LOG FOR ERRORS ==="
grep -iE "error|⨯|unhandled" /home/z/my-project/dev.log | tail -10 || echo "no errors in dev log"

echo "=== FINAL STATUS ==="
ps -p $SRV >/dev/null 2>&1 && echo "dev server STILL ALIVE" || echo "dev server DIED"
echo "DONE"
