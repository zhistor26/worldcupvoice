#!/usr/bin/env bash
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

run_node_test() {
  if command -v pnpm >/dev/null 2>&1; then
    pnpm exec node --import tsx --test "$@"
  else
    node --import tsx --test "$@"
  fi
}

echo "==> Node unit (lazycat contracts)"
run_node_test tests/unit/lazycat-netdisk-path.test.ts tests/unit/commentary-match.test.ts

echo "==> Node integration (access gate + agora token routes)"
run_node_test tests/integration/access-gate.test.ts tests/integration/agora-token-route.test.ts

echo "==> Python unit (fixture YAML contracts)"
if ! python3 -c "import yaml" 2>/dev/null; then
  pip3 install -q -r server/requirements-dev.txt
fi
PYTHONPATH=server python3 -m pytest server/tests/test_lazycat_second_dev.py -q

echo "OK: lazycat second-dev contract tests passed"
