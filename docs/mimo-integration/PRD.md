# PRD：WorldCupVoice 默认接入小米 MiMo

| 字段 | 值 |
|------|-----|
| 版本 | v0.1 |
| 日期 | 2026-06-29 |
| 状态 | 草案 → 待开发 |
| 上游 | [zicojiao/worldcupvoice](https://github.com/zicojiao/worldcupvoice) |

---

## 1. 背景与问题

WorldCupVoice 原版依赖 **OpenAI** 完成两件事：

1. **视觉解说**：从 Agora RTC 采样 JPEG 帧 → 多模态模型生成短句解说词
2. **语音合成**：解说词 → PCM 音频 → 回灌 Agora 频道

对国内开发者与懒猫微服上架场景，存在：

- OpenAI 账号 / 支付 / 网络门槛
- 单供应商绑定，不利于成本控制与本地化
- 中文解说音色需额外接 Fish Audio

**小米 MiMo** 提供 OpenAI 兼容 API，且具备：

- 全模态模型 `mimo-v2.5`（图像理解）
- TTS 系列 `mimo-v2.5-tts`（当前限时免费，见[定价页](https://platform.xiaomimimo.com/)）
- 国内访问与中文场景友好

---

## 2. 产品目标

### 2.1 核心目标

将本 fork 的 **默认 AI 栈** 设为小米 MiMo：

| 能力 | 默认模型 | 环境变量 |
|------|----------|----------|
| 视觉解说 | `mimo-v2.5` | `VISION_PROVIDER=mimo`，`MIMO_VISION_MODEL=mimo-v2.5` |
| 语音合成 | `mimo-v2.5-tts` | `TTS_PROVIDER=mimo`，`MIMO_TTS_MODEL=mimo-v2.5-tts` |

### 2.2 非目标（本期不做）

- 替换 Agora RTC / Media Gateway（仍必选）
- 替换前端 Next.js 或访问门禁逻辑
- 实现 MiMo ASR（本项目无语音识别需求）
- 微服 OIDC / inject 免密（属 LPK 上架专题，另文）

### 2.3 成功指标

| 指标 | 验收标准 |
|------|----------|
| 默认开箱 | 仅配置 `MIMO_API_KEY` + Agora，即可 Start AI 并听到中文解说 |
| 延迟 | 单次视觉请求 P95 &lt; 8s（含网络，4 帧上下文） |
| 稳定性 | 连续 15 分钟会话无未捕获异常；429 可自动退避重试 |
| 成本 | 不依赖 OpenAI 即可完成完整解说链路 |
| 兼容 | `VISION_PROVIDER=openai` 可一键回退原版行为 |

---

## 3. 用户故事

### US-1 国内开发者本地调试

> 作为开发者，我只申请 MiMo 与 Agora，不配 OpenAI，也能在本地 Docker 跑通 AI 解说。

**验收**：`server/.env.local` 含 `MIMO_API_KEY`，Start AI 后日志出现 `vision_provider=mimo`。

### US-2 中文体育解说

> 作为观众，我希望默认解说员为中文梗解说风格，且语音自然。

**验收**：默认 `commentator_profile_id=zh-cn-fish-meme` 时，视觉走 MiMo；TTS 在 `TTS_PROVIDER=mimo` 时**不被 profile 的 fish_audio 覆盖**（见 ARCHITECTURE §2.1），输出简体中文短句。

### US-3 运营限流保护

> 作为系统，在 MiMo 返回 429 时应退避重试，而不是崩溃整个 session。

**验收**：见 [TEST_CASES.md](./TEST_CASES.md) TC-RL-01～03。

### US-4 懒猫微服部署

> 作为移植者，我通过 `lzc-deploy-params.yml` 让用户填写 `MIMO_API_KEY` 即可使用。

**验收**：deploy-params 文档列出 MiMo 字段；无 OpenAI 硬依赖。

---

## 4. 功能需求

### FR-1 视觉 Provider

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-1.1 | 支持 `VISION_PROVIDER=mimo`，调用 `POST {MIMO_BASE_URL}/chat/completions` | P0 |
| FR-1.2 | 默认模型 `mimo-v2.5`，可通过 `MIMO_VISION_MODEL` 覆盖 | P0 |
| FR-1.3 | 输入：文本 prompt + 1～N 张 `image_url`（base64 JPEG） | P0 |
| FR-1.4 | 输出：≤40 token 短句，与现有 `_extract_response_text` 语义一致 | P0 |
| FR-1.5 | 保留 `VISION_PROVIDER=openai` 走原 `/v1/responses` | P1 |

### FR-2 TTS Provider

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-2.1 | 支持 `TTS_PROVIDER=mimo`，调用 MiMo TTS API（OpenAI 兼容语音端点，见架构文档） | P0 |
| FR-2.2 | 默认模型 `mimo-v2.5-tts` | P0 |
| FR-2.3 | 输出 PCM mono，采样率对齐 `COMMENTARY_AUDIO_SAMPLE_RATE`（默认 24000） | P0 |
| FR-2.4 | MiMo TTS 失败时回退：Fish Audio → OpenAI TTS（若配置了 Key） | P1 |
| FR-2.5 | 保留 `fish_audio` / `elevenlabs` / `openai` 显式选择 | P1 |

### FR-3 配置与默认

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-3.1 | 未设置 `VISION_PROVIDER` 时默认 `mimo` | P0 |
| FR-3.2 | 未设置 `TTS_PROVIDER` 时默认 `mimo` | P0 |
| FR-3.3 | `server/.env.example` 注释说明 MiMo 字段 | P0 |
| FR-3.4 | 启动时校验：`VISION_PROVIDER=mimo` 且缺少 `MIMO_API_KEY` 时明确报错 | P0 |

### FR-4 可观测性

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-4.1 | 日志字段：`vision_provider`、`tts_provider`、`mimo_model`、请求耗时 | P1 |
| FR-4.2 | 统计 `_vision_requests` / `_tts_requests` 区分 provider | P1 |

---

## 5. 模型选型（默认）

依据 [MiMo 速率限制](https://mimo.mi.com/docs/zh-CN/api/guidance/rate-limit) 与 [产品定价](https://platform.xiaomimimo.com/)：

| 场景 | 模型 ID | RPM | 选型理由 |
|------|---------|-----|----------|
| 视觉解说（默认） | `mimo-v2.5` | 100 | Omni 全模态，支持图像；比 Pro 便宜 |
| 视觉（高质量备选） | `mimo-v2.5-pro` | 100 | 复杂画面 / 多球员识别 |
| 语音（默认） | `mimo-v2.5-tts` | 100 | 官方 TTS 系列，限时免费 |
| 文本兜底 | `mimo-v2-flash` | 100 | 仅文本，**不用于本项目视觉** |

**V2 系列下线提醒**（官方公告）：`mimo-v2-pro` / `mimo-v2-omni` / `mimo-v2-tts` 将于 **2026-06-30** 失效，一律使用 **V2.5** 系列 ID。

---

## 6. 环境变量契约

```bash
# 默认栈
VISION_PROVIDER=mimo          # 默认 mimo；可选 openai
TTS_PROVIDER=mimo             # 默认 mimo；可选 fish_audio | elevenlabs | openai

MIMO_API_KEY=sk-...           # 控制台申请，勿提交 Git
MIMO_BASE_URL=https://api.xiaomimimo.com/v1
MIMO_VISION_MODEL=mimo-v2.5
MIMO_TTS_MODEL=mimo-v2.5-tts
MIMO_TTS_VOICE=               # 可选：精品音色 ID（文档更新后填写）

# 回退
OPENAI_API_KEY=               # 仅 VISION_PROVIDER=openai 或 TTS 回退时需要
```

---

## 7. 里程碑

| 阶段 | 交付物 | 完成定义 |
|------|--------|----------|
| M0 文档 | PRD + ARCH + TEST | ✅ |
| M1 视觉+TTS+Docker | 代码 + compose | ✅ |
| M2 E2E | Agora 推流 + Start AI | 🔲 需 Media Gateway |
| M3 LPK | deploy-params 模板 | 🔲 |

---

## 8. 风险与对策

| 风险 | 影响 | 对策 |
|------|------|------|
| MiMo TTS 返回格式非 PCM | 音频无法发布到 Agora | 实现转码层；测试用例 TC-T-02 |
| 429 限流（100 RPM） | 解说卡顿 | 指数退避 + 拉长 `COMMENTARY_INTERVAL_SECONDS` |
| 视觉延迟高于 OpenAI | 解说滞后于画面 | 减少 `COMMENTARY_CONTEXT_FRAMES`；可选 flash 模型 |
| API Key 泄露 | 费用被盗用 | 仅 `.env.local`；控制台轮换 Key |
| V2 模型名误用 | 2026-06-30 后调用失败 | 默认写死 V2.5 ID；启动时 warn 废弃名 |

---

## 9. 开放问题

- [ ] MiMo TTS 默认精品音色 ID 以官方文档为准（实现前对照最新 API 文档）
- [ ] `mimo-v2.5-tts` PCM 采样率是否为 24000，需实测后写入 ARCHITECTURE
- [ ] 懒猫商店是否接受「用户自备 MiMo Key」— 上架策略另评审
