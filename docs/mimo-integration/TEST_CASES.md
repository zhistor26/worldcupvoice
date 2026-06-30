# 测试用例：小米 MiMo 默认栈

| 字段 | 值 |
|------|-----|
| 版本 | v0.1 |
| 日期 | 2026-06-29 |
| 关联 | [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## 1. 测试分层

| 层级 | 工具 | 目录 |
|------|------|------|
| 单元 | pytest + httpx mock | `server/tests/test_mimo_*.py` |
| 集成 | pytest + 真实 MiMo API（可选，`@pytest.mark.live`） | 同上 |
| E2E | 手动 / 脚本 | 本地 Agora + ffmpeg 推流 |

---

## 2. 前置条件

### 2.1 环境矩阵

| 编号 | VISION_PROVIDER | TTS_PROVIDER | MIMO_API_KEY | OPENAI_API_KEY | 用途 |
|------|-----------------|--------------|--------------|----------------|------|
| ENV-A | mimo | mimo | ✅ | ❌ | **默认生产配置** |
| ENV-B | mimo | fish_audio | ✅ | ❌ | MiMo 视觉 + Fish 语音 |
| ENV-C | openai | openai | ❌ | ✅ | 上游回退回归 |
| ENV-D | mimo | mimo | ❌ | ❌ | 负向：缺 Key |

### 2.2 通用前置

- Agora App ID + Certificate 已配置
- `BACKEND_API_SECRET` 前后端一致
- 后端 `GET /health` 返回 `{"status":"ok"}`

---

## 3. 配置与启动

### TC-CFG-01 默认 Provider 为 MiMo

| 项 | 内容 |
|----|------|
| 前置 | 未设置 `VISION_PROVIDER`、`TTS_PROVIDER` |
| 步骤 | 启动 `uvicorn`，加载 `get_settings()` |
| 期望 | `vision_provider == "mimo"`，`tts_provider == "mimo"` |

### TC-CFG-02 缺少 MIMO_API_KEY 启动失败

| 项 | 内容 |
|----|------|
| 前置 | ENV-D |
| 步骤 | `POST /sessions/start`（非仅 import settings） |
| 期望 | 明确错误：`MIMO_API_KEY is required when VISION_PROVIDER=mimo`；**不得**要求 `OPENAI_API_KEY` |

### TC-CFG-04 Profile 不覆盖全局 TTS_PROVIDER=mimo

| 项 | 内容 |
|----|------|
| 前置 | ENV-A；`commentator_profile_id=zh-cn-fish-meme`（内置 fish_audio） |
| 步骤 | `settings_for_commentator_profile` → 创建 commentator → mock TTS |
| 期望 | 实际 `tts_provider == mimo`，POST `/audio/speech` 而非 Fish API |

### TC-CFG-03 废弃 V2 模型名警告

| 项 | 内容 |
|----|------|
| 前置 | `MIMO_VISION_MODEL=mimo-v2-omni` |
| 步骤 | 启动后端 |
| 期望 | WARNING 日志提示 2026-06-30 下线，建议改为 `mimo-v2.5` |

---

## 4. 视觉（MiMo Vision）

### TC-V-01 单帧解说成功

| 项 | 内容 |
|----|------|
| 前置 | ENV-A；mock 或 live API |
| 输入 | 1 张 960px JPEG base64 + 足球 prompt |
| 步骤 | 调用 `_describe_frames([snapshot])` |
| 期望 | 返回非空字符串，长度 &lt; 200 字符；`_vision_requests += 1` |

### TC-V-02 多帧上下文

| 项 | 内容 |
|----|------|
| 前置 | ENV-A；`COMMENTARY_CONTEXT_FRAMES=4` |
| 输入 | 4 张连续帧 |
| 期望 | 请求体 `content` 含 1 text + 4 image_url；不抛异常 |

### TC-V-03 使用 mimo-v2.5 模型 ID

| 项 | 内容 |
|----|------|
| 步骤 | mock `httpx` 捕获 POST body |
| 期望 | `model == "mimo-v2.5"`（或 `MIMO_VISION_MODEL` 覆盖值） |

### TC-V-04 Auth 头正确

| 项 | 内容 |
|----|------|
| 步骤 | mock 捕获 headers |
| 期望 | 含 `api-key` 或 `Authorization: Bearer <MIMO_API_KEY>`（与实现对齐） |

### TC-V-05 OpenAI 回退回归

| 项 | 内容 |
|----|------|
| 前置 | ENV-C |
| 步骤 | `_describe_frames` |
| 期望 | POST `https://api.openai.com/v1/responses`，行为与上游一致 |

### TC-V-06 无效图片

| 项 | 内容 |
|----|------|
| 输入 | 空 base64 / 损坏 JPEG |
| 期望 | 4xx 时记录 error，session 不崩溃；可跳过本轮解说 |

---

## 5. TTS（MiMo TTS）

### TC-T-01 中文文本合成 PCM

| 项 | 内容 |
|----|------|
| 前置 | ENV-A |
| 输入 | `"快攻！球到了禁区前沿！"` |
| 步骤 | `_synthesize_speech(text)` |
| 期望 | 返回 `bytes`，长度 &gt; 0；可经 `_resample_pcm_mono` 处理 |

### TC-T-02 PCM 采样率对齐

| 项 | 内容 |
|----|------|
| 前置 | `COMMENTARY_AUDIO_SAMPLE_RATE=24000` |
| 期望 | 输出 PCM 可被 Agora `AudioConsumer` 消费，无爆音 |

### TC-T-03 使用 mimo-v2.5-tts 模型

| 项 | 内容 |
|----|------|
| 步骤 | mock 捕获 TTS 请求 |
| 期望 | `model == "mimo-v2.5-tts"` |

### TC-T-04 MiMo TTS 失败回退 Fish

| 项 | 内容 |
|----|------|
| 前置 | `TTS_PROVIDER=mimo`；MiMo 返回 500；已配置 `FISH_AUDIO_*` |
| 期望 | 日志 `MiMo TTS failed; falling back to Fish Audio`；返回 PCM |

### TC-T-05 MiMo TTS 失败回退 OpenAI

| 项 | 内容 |
|----|------|
| 前置 | MiMo + Fish 均失败；有 `OPENAI_API_KEY` |
| 期望 | 回退 OpenAI TTS 成功 |

### TC-T-06 全失败

| 项 | 内容 |
|----|------|
| 前置 | 无回退 Key |
| 期望 | `RuntimeError`，session 标记错误状态，不挂死进程 |

---

## 6. 限流与重试

### TC-RL-01 MiMo 429 退避

| 项 | 内容 |
|----|------|
| 模拟 | 首次 429 + `Retry-After: 8` |
| 期望 | `_vision_rate_limit_resume_at` 设置；8s 内跳过解说；之后恢复 |

### TC-RL-02 会话 RPM 不超限

| 项 | 内容 |
|----|------|
| 条件 | `COMMENTARY_INTERVAL_SECONDS=4`，单会话 15 分钟 |
| 期望 | 视觉请求约 ≤ 225 次 / 15min ≈ 15 RPM，低于账号 100 RPM |

### TC-RL-03 指数退避上限

| 项 | 内容 |
|----|------|
| 模拟 | 连续 4 次 429 |
| 期望 | 退避不超过 `OPENAI_RATE_LIMIT_MAX_BACKOFF_SECONDS`（60s） |

---

## 7. Session 集成

### TC-S-01 Start AI 端到端（mock MiMo）

| 项 | 内容 |
|----|------|
| 步骤 | `POST /sessions/start` + mock vision/tts |
| 期望 | 200；`commentator_profile_id` 正确；stats 含 `vision_requests` |

### TC-S-02 Heartbeat 维持

| 项 | 内容 |
|----|------|
| 步骤 | start → heartbeat × 3 |
| 期望 | 均 200；`state=running` |

### TC-S-03 Stop 释放

| 项 | 内容 |
|----|------|
| 步骤 | stop |
| 期望 | 无残留 asyncio task；MiMo 请求停止 |

### TC-S-04 无观众超时停服

| 项 | 内容 |
|----|------|
| 前置 | `VIEWER_HEARTBEAT_TIMEOUT_SECONDS=45` |
| 期望 | 45s 无 heartbeat 后 session 自动 stop，停止 MiMo 计费

---

## 8. E2E 手动用例

### TC-E2E-01 网页进门（无 AI）

| 步骤 | 期望 |
|------|------|
| 打开 `http://localhost:3000` | 页面加载 |
| 输入 `ACCESS_PASSWORD` | 进入直播间 UI |

### TC-E2E-02 无推流时 Start AI

| 步骤 | 期望 |
|------|------|
| 无 RTMP 推流，点 Start AI | booth 状态 `waiting for video` 或等价；不扣大量 MiMo |

### TC-E2E-03 完整链路（需 ffmpeg + Agora MG）

| 步骤 | 期望 |
|------|------|
| 1. `pnpm run media-gateway:key` | 获得 stream key |
| 2. `pnpm run stream:sample` | RTC 有画面 |
| 3. Start AI | 听到中文解说 + 字幕更新 |
| 4. 日志 | `vision_provider=mimo`，`tts_provider=mimo` |

### TC-E2E-04 Docker 双容器

| 步骤 | 期望 |
|------|------|
| `docker compose up`（待添加 compose） | web + agent 健康；`AGENT_BACKEND_URL` 互通 |

### TC-E2E-05 15 分钟会话上限

| 前置 | `LIVE_SESSION_MAX_SECONDS=900` |
| 期望 | 15 分钟后自动 stop，MiMo 不再请求 |

---

## 9. 安全

### TC-SEC-01 日志不泄露 Key

| 步骤 |  grep 日志 |
| 期望 | 不出现 `sk-` 完整串 |

### TC-SEC-02 .env.local 未进 Git

| 步骤 | `git status` |
| 期望 | `.env.local` 不在 staged 文件列表 |

---

## 10. 回归清单（发版前）

- [ ] TC-CFG-01～02
- [ ] TC-V-01～05
- [ ] TC-T-01～04
- [ ] TC-RL-01
- [ ] TC-S-01～03
- [ ] TC-E2E-01 + TC-E2E-03（有 Agora MG 时）
- [ ] TC-SEC-01～02
- [ ] 上游 `server/tests/test_*.py` 全绿

---

## 11. pytest 标记建议

```python
# conftest.py
import pytest

def pytest_configure(config):
    config.addinivalue_line("markers", "live: tests that call real MiMo API")

# 运行
# pytest -m "not live"          # CI 默认
# pytest -m live --env-file ... # 本地联调
```
