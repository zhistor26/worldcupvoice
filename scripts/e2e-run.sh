#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

BASE_URL="${PLAYWRIGHT_BASE_URL:-http://localhost:3000}"
ACCESS_PASSWORD="${ACCESS_PASSWORD:-dev123}"

if ! curl -sf "${BASE_URL}" >/dev/null 2>&1; then
  echo "Frontend not reachable at ${BASE_URL} — starting Docker..."
  ./scripts/docker-up.sh -d
  echo "Waiting for services..."
  for _ in $(seq 1 30); do
    if curl -sf "${BASE_URL}" >/dev/null 2>&1; then
      break
    fi
    sleep 2
  done
fi

if ! curl -sf "${BASE_URL}" >/dev/null 2>&1; then
  echo "ERROR: ${BASE_URL} still not reachable."
  exit 1
fi

echo "Running Playwright E2E against ${BASE_URL} ..."
ACCESS_PASSWORD="${ACCESS_PASSWORD}" PLAYWRIGHT_BASE_URL="${BASE_URL}" pnpm exec playwright test "$@"
