# WorldCupVoice × 小米 MiMo 集成专题

本目录记录将 WorldCupVoice 从 **OpenAI 默认栈** 迁移为 **小米 MiMo 默认栈** 的产品、架构与测试规范。

| 文档 | 说明 |
|------|------|
| [PRD.md](./PRD.md) | 产品需求：目标、范围、默认模型、验收标准 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 技术架构：Provider 抽象、API 映射、限流与回退 |
| [TEST_CASES.md](./TEST_CASES.md) | 测试用例：单元 / 集成 / E2E / 限流 |

## 目标（一句话）

**视觉解说默认 `mimo-v2.5`，语音合成默认 `mimo-v2.5-tts`，OpenAI 仅作可选回退。**

## 凭证存放

| 项 | 位置 | 是否提交 Git |
|----|------|--------------|
| MiMo API Key | `server/.env.local` → `MIMO_API_KEY` | ❌ 已 gitignore |
| Agora 证书 | `server/.env.local` / 根目录 `.env.local` | ❌ |
| 本文档 | `docs/mimo-integration/` | ✅ 不含密钥 |

## 官方参考

- MiMo 控制台：https://platform.xiaomimimo.com/
- API 文档：https://mimo.mi.com/docs
- 速率限制：https://mimo.mi.com/docs/zh-CN/api/guidance/rate-limit
- 首次 API 调用：https://platform.xiaomimimo.com/docs/zh-CN/quick-start/first-api-call

## 实现状态

| 模块 | 状态 |
|------|------|
| PRD / 架构 / 测试用例文档 | ✅ |
| `server/.env.local` 默认 MiMo 配置 | ✅ |
| 后端 MiMo 视觉 + TTS 代码 | ✅ M1 |
| `docker-compose.yml` + `scripts/docker-up.sh` | ✅ |
| 本地 Docker 运行指南 | ✅ [DOCKER.md](../DOCKER.md) |
| LPK 三件套 | 🔲 见 [lazycat-second-dev](../lazycat-second-dev/README.md) |
