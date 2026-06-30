# 本地 Docker 运行

## 前置条件

1. 已安装 Docker Desktop
2. 已配置环境变量文件：
   - 根目录 `.env.local`（Agora 前端 + `ACCESS_PASSWORD` + `BACKEND_API_SECRET`）
   - `server/.env.local`（Agora 后端 + **MiMo** + `BACKEND_API_SECRET`）

MiMo 默认栈说明见 [mimo-integration/](./mimo-integration/README.md)。

## 一键启动

```bash
cd worldcupvoice
./scripts/docker-up.sh
```

等价于：

```bash
set -a && source .env.local && set +a
docker compose up --build
```

## 访问

| 服务 | 地址 |
|------|------|
| 前端 | http://localhost:3000 |
| 后端健康检查 | http://localhost:8000/health |
| 进门密码 | `.env.local` 中的 `ACCESS_PASSWORD`（默认 `dev123`） |

## 架构

```text
浏览器 → web:3000 (Next.js)
           ↓ AGENT_BACKEND_URL=http://agent:8000
         agent:8000 (FastAPI)
           ├── MiMo API（视觉 + TTS）
           └── Agora RTC
```

## 构建说明

- **web** 镜像在 build 阶段需要 `NEXT_PUBLIC_AGORA_APP_ID`（通过 `docker compose` 从 `.env.local` 注入）
- **agent** 镜像使用 `server/Dockerfile`，Python 3.11
- 修改 `.env.local` 后：
  - 后端 env： `docker compose up agent` 即可热重载需 rebuild 仅当改代码
  - 前端 `NEXT_PUBLIC_*`：需 `docker compose up --build web`

## 完整 AI 解说（可选）

Docker 只解决「网页 + 后端」；要有直播画面还需：

1. Agora Media Gateway + RTMP 推流密钥
2. `ffmpeg` 或 OBS 推自备 mp4

见根目录 `README.zh-CN.md` 的「推送本地视频」章节。

## 前端自动化测试（Playwright）

确保 Docker 已启动后：

```bash
./scripts/e2e-run.sh
```

或手动：

```bash
ACCESS_PASSWORD=dev123 pnpm test:e2e
```

可视化调试（有界面、可点击观察）：

```bash
pnpm test:e2e:headed
pnpm test:e2e:ui
```

覆盖用例：首页加载、Enter Live Booth 点击、访问码对错、进入直播间（Agora/Start AI）。

---

## 排障

| 现象 | 处理 |
|------|------|
| web 打不开 | `docker compose logs web` |
| Start AI 报 MiMo Key | 检查 `server/.env.local` 的 `MIMO_API_KEY` |
| CORS 错误 | 确认 `BACKEND_CORS_ALLOW_ORIGINS=http://localhost:3000` |
| Agora 白屏 | 确认 build 时注入了 `NEXT_PUBLIC_AGORA_APP_ID`，必要时 `--build` 重建 web |
