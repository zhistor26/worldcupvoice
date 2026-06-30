#!/usr/bin/env bash
# 一键：生成 Agora RTMP 密钥 + 推送本地测试画面到直播间
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

if ! command -v ffmpeg >/dev/null 2>&1; then
  echo "ERROR: 需要 ffmpeg。运行: brew install ffmpeg"
  exit 1
fi

if [[ ! -f .env.local ]]; then
  echo "ERROR: 缺少 .env.local"
  exit 1
fi

set -a
# shellcheck disable=SC1091
source .env.local
set +a

for var in AGORA_CUSTOMER_ID AGORA_CUSTOMER_SECRET AGORA_MEDIA_GATEWAY_REGION; do
  if [[ -z "${!var:-}" ]]; then
    echo "ERROR: .env.local 未配置 ${var}"
    echo ""
    echo "请先在 Agora 控制台完成："
    echo "  1. 项目 → 开启 Media Gateway"
    echo "  2. Developer Toolkit → RESTful API → 创建 Customer ID / Secret"
    echo "  3. 写入 .env.local："
    echo "     AGORA_CUSTOMER_ID=..."
    echo "     AGORA_CUSTOMER_SECRET=..."
    echo "     AGORA_MEDIA_GATEWAY_REGION=cn"
    exit 1
  fi
done

CLIP="${RTMP_INPUT:-}"
if [[ -z "$CLIP" ]]; then
  if ls samples/*.mp4 >/dev/null 2>&1; then
    CLIP="$(ls samples/*.mp4 | head -1)"
  else
    echo "ERROR: 没有可推流的 mp4。把视频放到 samples/ 或设置 RTMP_INPUT"
    exit 1
  fi
fi

echo "==> 1/2 创建 Media Gateway stream key ..."
KEY_OUTPUT="$(pnpm run media-gateway:key 2>&1)"
echo "$KEY_OUTPUT"

STREAM_KEY="$(echo "$KEY_OUTPUT" | sed -n 's/^Stream key: //p' | tail -1)"
if [[ -z "$STREAM_KEY" ]]; then
  echo "ERROR: 未能解析 stream key"
  exit 1
fi

echo ""
echo "==> 2/2 推送画面: $CLIP"
echo "    保持此终端运行；浏览器直播间应出现画面，再点 Start AI"
echo "    按 Ctrl+C 停止推流"
echo ""

export RTMP_STREAM_KEY="$STREAM_KEY"
export RTMP_INPUT="$CLIP"
export AGORA_MEDIA_GATEWAY_REGION="${AGORA_MEDIA_GATEWAY_REGION:-cn}"
exec pnpm run stream:sample
