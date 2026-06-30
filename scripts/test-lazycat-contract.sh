#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

echo "==> Node unit (lazycat contracts)"
pnpm exec node --import tsx --test tests/unit/lazycat-netdisk-path.test.ts

echo "==> Python unit (fixture YAML contracts)"
if ! python3 -c "import yaml" 2>/dev/null; then
  pip3 install -q -r server/requirements-dev.txt
fi
PYTHONPATH=server python3 -m pytest server/tests/test_lazycat_second_dev.py -q

echo "OK: lazycat second-dev contract tests passed"
