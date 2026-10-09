#!/usr/bin/env bash
# Blue-green deploy for a single VPS: build the idle colour, check it, switch nginx, stop the old colour.
# Needs docker compose, nginx on the host, and a filled-in .env at the repo root.
set -euo pipefail
cd "$(dirname "$0")/.."

STATE=/etc/nginx/byi-active-color
UPSTREAMS=/etc/nginx/byi-upstreams.conf
CURRENT=$(cat "$STATE" 2>/dev/null || echo green)
if [ "$CURRENT" = "blue" ]; then NEXT=green; BP=8002; FP=3002; else NEXT=blue; BP=8001; FP=3001; fi
set -a; . ./.env; set +a
COMPOSE="docker compose --env-file .env -f deploy/docker-compose.prod.yml"

echo "==> Active: $CURRENT. Deploying: $NEXT"
docker network inspect byi >/dev/null 2>&1 || docker compose --env-file .env -f deploy/docker-compose.db.yml up -d
BACKEND_PORT=$BP FRONTEND_PORT=$FP $COMPOSE -p "byi-$NEXT" up -d --build

echo "==> Waiting for $NEXT to be healthy"
ok=0
for _ in $(seq 1 60); do
  if curl -fsS "http://127.0.0.1:$BP/healthz" >/dev/null && curl -fsS -o /dev/null "http://127.0.0.1:$FP/"; then ok=1; break; fi
  sleep 3
done
if [ "$ok" != 1 ]; then
  echo "New colour never became healthy; keeping $CURRENT live."
  BACKEND_PORT=$BP FRONTEND_PORT=$FP $COMPOSE -p "byi-$NEXT" logs --tail 80 || true
  BACKEND_PORT=$BP FRONTEND_PORT=$FP $COMPOSE -p "byi-$NEXT" down
  exit 1
fi

echo "==> Warming caches (pages were built before the API existed, so refresh them)"
PAGES="/ /ielts-test-dates /ielts-booking-nepal /ielts-fee-nepal /sitemap.xml"
for p in $PAGES; do curl -s -o /dev/null "http://127.0.0.1:$FP$p"; done
sleep 3
for p in $PAGES; do curl -s -o /dev/null "http://127.0.0.1:$FP$p"; done

echo "==> Switching nginx to $NEXT"
printf 'upstream byi_backend { server 127.0.0.1:%s; }\nupstream byi_frontend { server 127.0.0.1:%s; }\n' "$BP" "$FP" | sudo tee "$UPSTREAMS" >/dev/null
sudo nginx -t && sudo nginx -s reload
echo "$NEXT" | sudo tee "$STATE" >/dev/null

echo "==> Stopping $CURRENT"
if [ "$CURRENT" = "blue" ]; then OBP=8001; OFP=3001; else OBP=8002; OFP=3002; fi
BACKEND_PORT=$OBP FRONTEND_PORT=$OFP $COMPOSE -p "byi-$CURRENT" down 2>/dev/null || true
echo "Done. $NEXT is live."
