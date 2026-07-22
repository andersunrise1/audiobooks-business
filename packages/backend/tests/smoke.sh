#!/usr/bin/env bash
# Integration smoke test for the backend API. Requires the server already
# running (PORT default 3000) against a reachable Postgres with migrations applied.
set -euo pipefail

BASE_URL="${BASE_URL:-http://localhost:3000}"
EMAIL="smoke-$(date +%s)@techspeak.test"
PASSWORD="correct-horse-battery-staple"

fail() {
  echo "FAIL: $1" >&2
  exit 1
}

echo "-> waiting for server"
for i in $(seq 1 20); do
  if curl -sf "$BASE_URL/api/health" > /dev/null 2>&1; then
    break
  fi
  [ "$i" = "20" ] && fail "server did not become healthy in time"
  sleep 0.5
done
curl -sf "$BASE_URL/api/health" | grep -q '"status":"ok"' || fail "health check"

echo "-> register"
REGISTER_RES=$(curl -sf -X POST "$BASE_URL/api/auth/register" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\",\"name\":\"Smoke Test\"}")
ACCESS_TOKEN=$(node -e "console.log(JSON.parse(process.argv[1]).accessToken)" "$REGISTER_RES")
[ -n "$ACCESS_TOKEN" ] && [ "$ACCESS_TOKEN" != "undefined" ] || fail "register did not return accessToken"

echo "-> login"
LOGIN_RES=$(curl -sf -X POST "$BASE_URL/api/auth/login" \
  -H 'Content-Type: application/json' \
  -d "{\"email\":\"$EMAIL\",\"password\":\"$PASSWORD\"}")
node -e "if (!JSON.parse(process.argv[1]).accessToken) process.exit(1)" "$LOGIN_RES" || fail "login did not return accessToken"

echo "-> list audiobooks (public)"
curl -sf "$BASE_URL/api/audiobooks" > /dev/null || fail "GET /api/audiobooks"

echo "-> user progress without token is rejected"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/user/progress")
[ "$STATUS" = "401" ] || fail "expected 401 without token, got $STATUS"

echo "-> user progress with token"
curl -sf -H "Authorization: Bearer $ACCESS_TOKEN" "$BASE_URL/api/user/progress" > /dev/null || fail "GET /api/user/progress with token"

echo "-> unknown route returns 404"
STATUS=$(curl -s -o /dev/null -w '%{http_code}' "$BASE_URL/api/does-not-exist")
[ "$STATUS" = "404" ] || fail "expected 404, got $STATUS"

echo "All smoke checks passed."
