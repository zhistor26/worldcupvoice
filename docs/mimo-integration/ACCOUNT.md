# MiMo 账号与配额记录（不含密钥）

> **密钥仅存 `server/.env.local` → `MIMO_API_KEY`，勿写入本文件。**

| 字段 | 记录 |
|------|------|
| 平台 | [Xiaomi MiMo API](https://platform.xiaomimimo.com/) |
| 文档 | [mimo.mi.com/docs](https://mimo.mi.com/docs) |
| Key 申请日 | 2026-06-29 |
| Key 格式 | `sk-...`（已配置至本地 `.env.local`） |
| 默认视觉模型 | `mimo-v2.5` |
| 默认 TTS 模型 | `mimo-v2.5-tts` |
| API Base | `https://api.xiaomimimo.com/v1` |

## 速率限制（账号级，2026-06-11 更新）

来源：[速率限制文档](https://mimo.mi.com/docs/zh-CN/api/guidance/rate-limit)

| 模型 | RPM | TPM | 本项目用途 |
|------|-----|-----|------------|
| `mimo-v2.5` | 100 | 10M | 视觉解说（默认） |
| `mimo-v2.5-pro` | 100 | 10M | 高质量备选 |
| `mimo-v2.5-tts` | 100 | 10M | 语音合成（默认） |
| `mimo-v2-flash` | 100 | 10M | 不用于视觉 |

## 官方迁移提醒

- V2 系列（`mimo-v2-pro` / `mimo-v2-omni` / `mimo-v2-tts`）→ **2026-06-30 00:00 下线**
- 统一使用 **V2.5** 系列 ID

## 安全事件

| 日期 | 事件 | 处置 |
|------|------|------|
| 2026-06-29 | API Key 曾在聊天中暴露 | 建议在 [控制台](https://platform.xiaomimimo.com/) 轮换 Key 并更新 `.env.local` |
