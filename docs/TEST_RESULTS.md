# WorldCupVoice 懒猫微服移植联调 — 测试报告

| 字段 | 值 |
|------|-----|
| 日期 | 2026-06-29 |
| 分支 | `main`（MiMo + Docker 本地栈） |
| 测试环境 | macOS + Docker Desktop；Node 22；Python 3.11（agent 容器） |
| 上游 | [zicojiao/worldcupvoice](https://github.com/zicojiao/worldcupvoice) |

---

## 1. 目标与范围

将 WorldCupVoice（Agora 实时 AI 足球解说）在本地 Docker 环境跑通，默认使用**小米 MiMo** 替代 OpenAI 完成视觉解说 + TTS，并验证前端 E2E、后端 AI 管线、本地 RTC 推流旁路。

**不在本次范围：** LPK 三件套（`lzc-build.yml` / `lzc-manifest.yml` / `package.yml`）、懒猫应用商店提审、Agora Media Gateway 正式开通。

---

## 2. 架构与组件

```text
浏览器 (localhost:3000)
    ↓ ACCESS_PASSWORD + Agora RTC
web (Next.js 16)
    ↓ AGENT_BACKEND_URL=http://agent:8000
agent (FastAPI + Agora Python SDK)
    ├── Vision: MiMo chat/completions (mimo-v2.5)
    ├── TTS: MiMo chat/completions + audio.pcm16 (voice=冰糖)
    └── RTC 发布: 解说音频 + 字幕 transcript
本地推流旁路 (pnpm feed:local)
    └── publish-local-feed.mjs → Agora RTC UID 234567（不经 RTMP）
```

| 组件 | 状态 | 说明 |
|------|------|------|
| `docker-compose.yml` | ✅ | web:3000 + agent:8000 |
| MiMo Vision | ✅ | `mimo-v2.5`，`max_tokens=512` |
| MiMo TTS | ✅ | 不用 `/audio/speech`（404），走 chat + `audio.format=pcm16` |
| 中文字幕 UI | ✅ | 左侧「解说字幕」+ 画面底部叠字 |
| Playwright E2E | ✅ 5/5 | 进门、密码、直播间 |
| AI 管线脚本 | ✅ | `scripts/verify-ai-pipeline.sh` |
| Media Gateway RTMP | ⚠️ 未通 | API 403：`appid is not allowed to use Media Gateway Service` |
| 本地 RTC 推流 | ✅ | `pnpm run feed:local` + 足球测试片 |

---

## 3. 自动化测试结果

### 3.1 Playwright E2E（2026-06-29）

```bash
ACCESS_PASSWORD=dev123 pnpm test:e2e
```

| # | 用例 | 结果 | 耗时 |
|---|------|------|------|
| 1 | 首页加载并显示 Enter Live Booth | ✅ PASS | 3.2s |
| 2 | 点击 Enter Live Booth 弹出访问码对话框 | ✅ PASS | 1.2s |
| 3 | 错误访问码显示错误提示 | ✅ PASS | 0.95s |
| 4 | 正确访问码进入直播间 | ✅ PASS | 1.7s |
| 5 | 访问码对话框可取消 | ✅ PASS | 0.81s |

**合计：5 passed (9.3s)**

### 3.2 AI 管线验收脚本

```bash
bash scripts/verify-ai-pipeline.sh
```

| 指标 | 结果 |
|------|------|
| `POST /sessions/start` | ✅ 200 |
| Vision 请求计数 | ✅ ≥1 |
| TTS 请求计数 | ✅ ≥1 |
| `audio_sent_ms` | ✅ 1890～3940 ms |
| 脚本结论 | `OK: AI pipeline produced TTS audio` |

**典型日志（修复后）：**

```text
AI_AUDIO_PIPELINE channel=worldcup-live turn=1
  describe_ms=7338 transcript_ms=1045 tts_ms=1760
  audio_publish_ms=1761 audio_drain_ms=1964 total_ms=12111
  pcm_bytes=192000 sent_bytes=192000 pcm_ms=4000
  text='演播室信号正常，彩条就位，导播准备切入正式比赛画面！'
```

### 3.3 后端单元测试

| 环境 | 结果 | 说明 |
|------|------|------|
| 宿主机 Python 3.14 | ⚠️ 收集失败 | `audioop` 在 3.13+ 已移除 |
| agent 容器 Python 3.11 | ⚠️ 未装 pytest | 生产镜像未包含 dev 依赖 |
| 新增 `test_mimo_provider.py` | 📝 已提交 | mock MiMo API；CI 需在 3.11 + pytest 环境运行 |

建议在 Docker 开发阶段或 CI 使用：

```bash
pip install pytest httpx
python -m pytest server/tests/ -m "not live"
```

---

## 4. 关键 Bug 与修复记录

### BUG-001：中文解说全部被跳过（根因）

| 项 | 内容 |
|----|------|
| 现象 | Vision 有输出，但无字幕、无声音；日志大量 `Skipped repetitive visual commentary` |
| 根因 | `_normalize_commentary()` 用 `[^a-z0-9 ]+` 剥掉全部汉字 → 空串 → `_is_repetitive_commentary` 判定为重复并 `return True` |
| 修复 | 归一化保留 CJK（`\u4e00-\u9fff`）；仅对真正空文本跳过 |
| 文件 | `server/app/backend_commentator.py` |
| 验证 | `verify-ai-pipeline.sh` 通过；`AI_AUDIO_PIPELINE` 有 `sent_bytes>0` |

### BUG-002：MiMo Vision 空文案 / NO_CALL

| 项 | 内容 |
|----|------|
| 现象 | `Generated MiMo visual commentary: NO_CALL` 或空 content |
| 原因 | `max_tokens` 过小，推理 token 占满 |
| 修复 | `max_tokens` 提升至 **512**；`COMMENTARY_DEV_TEST_FEED=true` 时启用中文回退句库 |
| 状态 | ✅ 已缓解；真实画面下 MiMo 也能产出中文解说 |

### BUG-003：MiMo TTS `/audio/speech` 404

| 项 | 内容 |
|----|------|
| 修复 | 改用 `POST /v1/chat/completions` + `modalities: ["text","audio"]` + `audio: {format:"pcm16", voice:"冰糖"}` |
| 状态 | ✅ PCM 可重采样至 24kHz 推入 Agora |

### BUG-004：去重窗口过严（次要）

| 项 | 内容 |
|----|------|
| 旧逻辑 | 18s 窗口 + 词重叠 0.72 + `previous_calls[-4]` |
| 新逻辑 | **仅 3 秒内与上一句完全相同**才跳过（循环测试片场景） |

### BUG-005：Agora Media Gateway

| 项 | 内容 |
|----|------|
| 现象 | `createMediaGatewayKey` / RTMP 推流返回 403 |
| 绕过 | `scripts/publish-local-feed.mjs` 直接以 UID 234567 发布 RTC 视频 |
| 待办 | 控制台确认 MG 权限或联系 Agora 支持 |

---

## 5. 手动 E2E 操作清单

### 5.1 一键 Docker

```bash
cd worldcupvoice
cp .env.example .env.local          # 填 Agora + ACCESS_PASSWORD
cp server/.env.example server/.env.local  # 填 MiMo + Agora + BACKEND_API_SECRET
./scripts/docker-up.sh
```

### 5.2 本地推流（推荐）

```bash
# 自备或下载 Mixkit 足球俯拍片到 samples/soccer-aerial-mixkit-41372.mp4
RTMP_INPUT=samples/soccer-aerial-mixkit-41372.mp4 pnpm run feed:local
```

### 5.3 浏览器

1. 打开 http://localhost:3000
2. 密码 `dev123`（或 `.env.local` 中 `ACCESS_PASSWORD`）
3. **Enter Live Booth** → **Start AI**
4. 硬刷新 `Cmd+Shift+R` 若 UI 仍为英文旧文案

**期望：** 左侧「解说字幕」打字效果 + 底部叠字 + 中文语音解说。

---

## 6. 配置要点（无真实密钥）

| 变量 | 位置 | 说明 |
|------|------|------|
| `VISION_PROVIDER` | server | 默认 `mimo` |
| `TTS_PROVIDER` | server | 默认 `mimo` |
| `MIMO_API_KEY` | server/.env.local | 勿提交 Git |
| `MIMO_VISION_MODEL` | server | `mimo-v2.5` |
| `COMMENTARY_DEV_TEST_FEED` | server | `true` 时 NO_CALL 用中文回退 |
| `BACKEND_API_SECRET` | 前后端一致 | session API 鉴权 |
| `NEXT_PUBLIC_AGORA_APP_ID` | 根 .env.local | web build 注入 |

详见 `docs/mimo-integration/` 与 `docs/DOCKER.md`。

---

## 7. 安全与 Git  hygiene

- [x] `.env.local`、`server/.env.local` 在 `.gitignore`
- [x] `samples/*.mp4` 不提交（第三方素材自备）
- [x] 文档仅用 `sk-...` 占位符
- [ ] **建议轮换** 已在本地联调中使用的 Agora 证书与 MiMo Key

---

## 8. 已知限制与后续

| 优先级 | 项 | 说明 |
|--------|-----|------|
| P0 | LPK 打包 | 规格见 [lazycat-second-dev/PRD.md](./lazycat-second-dev/PRD.md) |
| P0 | 懒猫上架 | inject 免密、网盘 MP4 — [TEST_CASES](./lazycat-second-dev/TEST_CASES.md) |
| P1 | Media Gateway | 正式 RTMP 推流替代 `feed:local` |
| P2 | pytest in Docker | agent 镜像可选 dev stage 跑单测 |
| P2 | 多轮解说稳定性 | 长会话 RPM / 去重策略调优 |

---

## 9. 发版前快速回归命令

```bash
# 1. 容器健康
curl -s http://localhost:8000/health

# 2. E2E
ACCESS_PASSWORD=dev123 pnpm test:e2e

# 3. AI 管线（需 feed:local 或 RTC 有画面）
bash scripts/verify-ai-pipeline.sh

# 4. 确认无密钥 staged
git status
```

---

## 10. 结论

**本地 Docker + MiMo 默认栈已跑通。** 修复中文归一化后，AI 解说管线可稳定产出 TTS 音频与中文字幕；Playwright 5/5 通过。Media Gateway 与 LPK 上架为下一阶段工作。
