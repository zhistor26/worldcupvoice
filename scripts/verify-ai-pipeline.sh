#!/usr/bin/env bash
# 自动启动 AI 会话并轮询直到 TTS>0 或超时（需 feed:local 在跑）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

set -a
# shellcheck disable=SC1091
source server/.env.local
set +a

SECRET="${BACKEND_API_SECRET:?missing BACKEND_API_SECRET}"
HDR=(-H "Content-Type: application/json" -H "X-WorldCupVoice-Backend-Secret: ${SECRET}")

START_PAYLOAD='{
  "requester_id": "verify-script",
  "channel_name": "worldcup-live",
  "source_mode": "agora-gateway",
  "commentator_profile_id": "zh-cn-fish-meme",
  "agent_uid": 123456,
  "media_uid": 234567
}'

echo "==> POST /sessions/start"
START_JSON="$(curl -sf -X POST "http://localhost:8000/sessions/start" "${HDR[@]}" -d "${START_PAYLOAD}")"
SESSION_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["session_id"])' <<<"$START_JSON")"
AGENT_ID="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["agent_id"])' <<<"$START_JSON")"
echo "    session_id=${SESSION_ID}"

STATUS_PAYLOAD="$(python3 -c 'import json; print(json.dumps({"session_id":"'"${SESSION_ID}"'","agent_id":"'"${AGENT_ID}"'"}))')"

for i in $(seq 1 30); do
  curl -sf -X POST "http://localhost:8000/sessions/heartbeat" "${HDR[@]}" -d "${STATUS_PAYLOAD}" >/dev/null || true
  STATS="$(curl -sf -X POST "http://localhost:8000/sessions/status" "${HDR[@]}" -d "${STATUS_PAYLOAD}")"
  VISION="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["stats"]["vision_requests"])' <<<"$STATS")"
  TTS="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["stats"]["tts_requests"])' <<<"$STATS")"
  SENT="$(python3 -c 'import json,sys; print(json.load(sys.stdin)["stats"]["audio_sent_ms"])' <<<"$STATS")"
  echo "    [${i}/30] vision=${VISION} tts=${TTS} audio_sent_ms=${SENT}"
  if [[ "$TTS" -gt 0 && "$SENT" -gt 0 ]]; then
    echo "OK: AI pipeline produced TTS audio"
    curl -sf -X POST "http://localhost:8000/sessions/stop" "${HDR[@]}" -d "${STATUS_PAYLOAD}" >/dev/null || true
    exit 0
  fi
  sleep 4
done

echo "FAIL: TTS did not run within timeout"
docker logs worldcupvoice-agent-1 --tail 40 2>&1 || true
curl -sf -X POST "http://localhost:8000/sessions/stop" "${HDR[@]}" -d "${STATUS_PAYLOAD}" >/dev/null || true
exit 1
