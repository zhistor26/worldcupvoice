# PRD：WorldCupVoice 懒猫微服二次开发（LPK + 免密 + 网盘 MP4 解说）

| 字段 | 值 |
|------|-----|
| 版本 | v0.1 |
| 日期 | 2026-06-29 |
| 状态 | **二次开发规格**（一阶段 MiMo 已完成，见 `docs/mimo-integration/`） |
| 依赖 | Docker 双容器、MiMo 默认栈、Agora RTC 解说管线 |

---

## 1. 背景

一阶段已在本地 Docker 跑通：

- 视觉 + TTS 默认 **小米 MiMo**
- `docker-compose`：`web:3000` + `agent:8000`
- 本机 MP4 经 `pnpm run feed:local` 推入 RTC 后可 AI 解说
- Playwright 冒烟 **5/5**

**尚未满足懒猫微服产品形态：**

| 缺口 | 影响 |
|------|------|
| 无 LPK 三件套 | 无法在微服安装、无法提审 |
| `ACCESS_PASSWORD` 硬门禁 | 不符合上架免密/弱感知登录要求 |
| 无网盘 inject | 用户不能从懒猫网盘选比赛录像 |
| 无 deploy-params | 用户无法在安装时配置 MiMo / Agora |

本 PRD 定义 **二阶段二次开发** 的完整范围与验收。

---

## 2. 产品目标

### 2.1 核心目标

> 作为懒猫微服用户，我从应用商店安装 WorldCupVoice 后，**免输进门密码**，可从**网盘选择 MP4 比赛录像**，一键获得**中文 AI 解说与字幕**；并可在部署参数中配置 **MiMo 或其他 AI Provider**。

### 2.2 成功指标

| 指标 | 验收标准 |
|------|----------|
| 可安装 | `lzc-cli project build` 成功；`lzc-cli lpk install` 后启动器可打开 |
| 免密进门 | 微服内打开应用无需手输 `ACCESS_PASSWORD`；或密码由 inject 自动填充 |
| 网盘选片 | 从 `/_lzc/files/home` 选择 `.mp4`，画面进入直播间并开始解说 |
| AI 可配置 | deploy-params 可填 `MIMO_API_KEY`；高级用户可改 `VISION_PROVIDER` / `TTS_PROVIDER` |
| 提审就绪 | 满足 `publish-checklist`：中文名、图标、权限声明、无硬编码密钥 |
| 回归 | 一阶段 MiMo 管线不退化；`verify-ai-pipeline.sh` 仍通过 |

### 2.3 非目标（本期不做）

- 替换 Agora RTC 为其他实时方案
- 服务端 ffmpeg 转码集群（优先浏览器发布网盘 MP4）
- 完整 OIDC 账号体系（除非审核明确要求；默认 inject 免密）
- 网盘批量导出解说稿、剪辑时间轴编辑
- 离线批处理整场比赛（非实时抽帧解说）

---

## 3. 用户故事

### US-LPK-1 微服安装

> 作为用户，我在懒猫应用商店安装后，点击图标即可进入中文解说直播间。

**验收**：`lpk install` 成功；路由 `/` 打开 web；`/api` 或内部路由可达 agent。

### US-AUTH-1 免密进门

> 作为用户，我不记得也不该看到开发者调试密码 `dev123`。

**验收**：

- 微服环境下去除独立进门密码弹窗，**或**
- `builtin://simple-inject-password` + deploy-params 自动填充且对用户不可见

### US-NET-1 网盘选 MP4

> 作为用户，我点击「从网盘选择录像」，选中网盘里的 `世界杯决赛.mp4`，直播间出现画面并开始 AI 解说。

**验收**：无需 SSH、无需本机 `feed:local`；MP4 来自 `/_lzc/files/home`。

### US-AI-1 部署时配置 MiMo

> 作为安装者，我在部署参数页填写 MiMo API Key，保存后应用即可 Start AI。

**验收**：`lzc-deploy-params.yml` 渲染进 agent 环境变量；缺 Key 时有明确中文错误提示。

### US-AI-2 切换其他 AI（高级）

> 作为高级用户，我可在部署参数或环境变量中将 TTS 改为 Fish Audio / OpenAI。

**验收**：与一阶段 `VISION_PROVIDER` / `TTS_PROVIDER` 行为一致；文档列出组合矩阵。

### US-OPS-1 提审

> 作为开发者，我执行 `lzc-cli appstore publish` 前 checklist 全绿。

**验收**：见 [TEST_CASES.md](./TEST_CASES.md) §10。

---

## 4. 功能需求

### FR-LPK 打包与路由

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-LPK-1 | 根目录提供 `lzc-build.yml`、`lzc-manifest.yml`、`package.yml`、`icon.png` | P0 |
| FR-LPK-2 | manifest 声明 `web` + `agent` 两服务，路由 `/` → web，`/agent` 或内部 → agent | P0 |
| FR-LPK-3 | `lzc-build.yml` 构建现有 `docker-compose` 镜像或等价 Dockerfile | P0 |
| FR-LPK-4 | `package.yml` 含中文 `locales`、版本号、描述、权限 | P0 |
| FR-LPK-5 | 持久化目录 `/lzcapp/var` 存用户偏好（解说风格 profile） | P1 |

### FR-AUTH 免密与门禁

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-AUTH-1 | 微服模式检测： behind Lazycat ingress 时跳过 `ACCESS_PASSWORD` 门禁 | P0 |
| FR-AUTH-2 | manifest inject：`simple-inject-password` 或等价方案 | P0 |
| FR-AUTH-3 | 本地 Docker 开发仍可用 `ACCESS_PASSWORD=dev123` | P0 |
| FR-AUTH-4 | 日志与 UI 不展示明文密码 | P0 |

### FR-NET 网盘与 MP4

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-NET-1 | `package.yml` 声明 `document.read`、`media.read`、`net.internet` | P0 |
| FR-NET-2 | manifest inject：`lzc-file-chooser-inject.js`（打开文件） | P0 |
| FR-NET-3 | 前端「从网盘选择录像」入口，调用 picker 得 path | P0 |
| FR-NET-4 | 经 `/_lzc/files/home{path}` 拉取 MP4 为 Blob / URL | P0 |
| FR-NET-5 | 浏览器将 MP4 发布为 Agora 自定义视频轨（UID=match_feed_uid） | P0 |
| FR-NET-6 | Start AI 后走现有 vision → TTS → transcript 管线 | P0 |
| FR-NET-7 | 若主站需 COEP，采用 **非 COEP 桥接页** picker（M2） | P1 |

### FR-DEPLOY 部署参数

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-DEP-1 | `lzc-deploy-params.yml`：`MIMO_API_KEY`（secret） | P0 |
| FR-DEP-2 | `AGORA_APP_ID`、`AGORA_APP_CERTIFICATE`（secret） | P0 |
| FR-DEP-3 | 可选：`VISION_PROVIDER`、`TTS_PROVIDER`、`COMMENTATOR_PROFILE` | P1 |
| FR-DEP-4 | `BACKEND_API_SECRET` 默认 `$random` 渲染 | P0 |

### FR-UI 中文产品化

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-UI-1 | 应用中文名、描述（package.yml locales） | P0 |
| FR-UI-2 | 直播间主文案中文（一阶段已部分完成，提审前全量检查） | P0 |
| FR-UI-3 | 网盘选片、等待画面、AI 状态中文提示 | P0 |

---

## 5. 里程碑

| 里程碑 | 交付物 | 预计验收 |
|--------|--------|----------|
| **M0** | 本 PRD / ARCH / TEST_CASES + 自动化契约测试 | 文档 + CI 绿 |
| **M1** | LPK 三件套 + inject 免密 + `lpk install` 可开页 | TC-LPK-*、TC-AUTH-* |
| **M2** | 网盘选 MP4 + 浏览器 RTC 发布 + AI 解说 | TC-NET-*、TC-E2E-* |
| **M3** | deploy-params 全字段 + 多 AI 文档化 | TC-DEP-* |
| **M4** | 提审资料 + `appstore publish` | TC-STORE-* |

---

## 6. 风险与依赖

| 风险 | 缓解 |
|------|------|
| Agora Media Gateway 未开通 | 网盘 MP4 走浏览器发布轨，不依赖 RTMP |
| 大体积 MP4 内存 | 限制单文件大小提示；优先 H.264 1080p |
| inject 与 Next.js 路由冲突 | picker 独立桥接页 `/lazycat-picker.html` |
| COEP 需求变化 | ARCHITECTURE 预留 M2 桥接 |
| 审核免密硬性要求 | M1 即做 inject，不单靠「去掉密码框」 |

---

## 7. 验收总表

| 类别 | 必达用例编号 |
|------|----------------|
| 打包 | TC-LPK-01～06 |
| 免密 | TC-AUTH-01～04 |
| 网盘 MP4 | TC-NET-01～08 |
| AI 配置 | TC-DEP-01～05 |
| E2E | TC-E2E-LPK-01～04 |
| 安全 | TC-SEC-01～03 |
| 提审 | TC-STORE-01～05 |

详见 [TEST_CASES.md](./TEST_CASES.md)。
