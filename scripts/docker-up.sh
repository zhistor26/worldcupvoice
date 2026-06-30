#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if [[ ! -f .env.local ]]; then
  echo "Missing .env.local — copy from .env.example and fill Agora + MiMo keys."
  exit 1
fi
if [[ ! -f server/.env.local ]]; then
  echo "Missing server/.env.local — copy from server/.env.example."
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

echo "Building and starting web:3000 + agent:8000 ..."
docker compose up --build "$@"
