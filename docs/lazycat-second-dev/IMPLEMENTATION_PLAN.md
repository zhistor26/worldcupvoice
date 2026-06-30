# 实施计划：WorldCupVoice 懒猫微服专题修复（v0.2）

| 字段 | 值 |
|------|-----|
| 版本 | v0.2 |
| 日期 | 2026-06-30 |
| 状态 | **可执行计划**（基于 v0.1 实装 + 真机失败复盘） |
| 关联 | [PRD-v0.2](./PRD-v0.2.md) · [ARCHITECTURE-v0.2](./ARCHITECTURE-v0.2.md) · [TEST_CASES-v0.2](./TEST_CASES-v0.2.md) |

---

## 1. 执行摘要

v0.1 已完成 LPK 三件套、inject 脚本、网盘 UI 与契约测试，但**微服真机安装后用户仍见 Access Code 弹窗，输入 DEV123 失败**。本计划将三条主线收敛为可演示里程碑：

1. **P0 修复 LPK 进门失败**（build-time 与 runtime 门禁不一致 + Agora 凭证未进 bundle）
2. **懒猫免密登录**（方案 A 主路径 + 方案 B inject 提审说明，双保险）
3. **MP4 网盘导入全链路审计**（export 本期明确不做，见 PRD-v0.2 §2.3）

**验收顺序（真机，不可打乱）：** 免密进门 → Agora token 200 → 网盘选片推流 → Start AI → 字幕/音频。

---

## 2. 文档大纲（本文件结构）

```text
IMPLEMENTATION_PLAN.md
├── §1  执行摘要
├── §2  文档大纲
├── §3  里程碑总表（M0～M4）
├── §4  P0 根因分析：DEV123 / Agora / 进门弹窗
├── §5  专题一：免密登录任务分解
├── §6  专题二：MP4 导入链路任务分解（export 边界）
├── §7  专题三：LPK 构建与部署任务分解
├── §8  文件变更清单（实现时改哪些文件）
├── §9  风险与依赖
└── §10 估时与角色
```

---

## 3. 里程碑总表

| 里程碑 | 目标 | 关键交付 | 真机验收步骤 | 估时 |
|--------|------|----------|--------------|------|
| **M0** | 规格冻结 + 根因文档化 | 本目录 v0.2 六件套；P0 根因写入 ARCH §2 | 团队评审通过；`pnpm test:lazycat` 绿 | 1d |
| **M1** | **P0 修复进门 + Agora token** | `lzc-build.yml` build_args 对齐；runtime env 双保险；可选 runtime 兜底检测 | ① 安装 LPK → 首页**无** Access Code 弹窗 ② DevTools：`/api/generate-agora-token` → 200 + token ③ 进入 Live Booth | 2～3d |
| **M2** | **免密登录达标（上架硬性）** | manifest inject 保留；`STORE_REVIEW_NOTES` 定稿；TC-AUTH-* 真机通过 | ① 从启动器打开应用，弱感知无二次密码 ② `lzc-cli project log` 无 secret 明文 ③ 本地 Docker `ACCESS_PASSWORD=dev123` 仍进门（TC-AUTH-02） | 1～2d |
| **M3** | **MP4 导入全链路** | inject 真机验证；路径/权限/错误文案；TC-NET-* 真机 | ① 点「从网盘选择录像」→ 懒猫 picker 弹出 ② 选 H.264 MP4 → 预览/推流成功 ③ Start AI → 30s 内字幕+音频 ④ 非 mp4 → 中文错误 | 3～4d |
| **M4** | **瘦 LPK 提审** | registry 镜像；`project release` ~1MB；publish checklist 全绿 | ① `lpk info` → images:none ② `lpk install` + 重启 ③ M1～M3 回归 ④ 提审材料提交 | 2～3d |

**合计：** 约 9～13 人日（含真机联调缓冲）。

---

## 4. P0 根因分析：DEV123 / Agora / 进门弹窗

### 4.1 现象矩阵

| 用户可见错误 | 最可能根因 | 验证方法 |
|--------------|------------|----------|
| 仍出现 Access Code 弹窗 | **Next.js bundle 构建时**未写入 `NEXT_PUBLIC_LAZYCAT_DEPLOYED=true` / `NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD=false`；manifest **runtime env 不能改已编译前端** | 浏览器 Console：`process.env` 不可读时查 Network 首屏 JS 或加临时 debug 路由；对比 Docker build log 的 ARG |
| `Incorrect access code` | **客户端**仍走门禁 UI，且 **服务端** `isAccessGateEnabled()` 为 true（`LAZYCAT_DEPLOYED` 未进 web 容器）+ `ACCESS_PASSWORD` 与 dev123 不一致或未配置 | `POST /api/verify-access` 状态码；web 容器 `env \| grep LAZYCAT` |
| `Agora credentials are not set` | `NEXT_PUBLIC_AGORA_APP_ID` / `NEXT_AGORA_APP_CERTIFICATE` 未在 **build_args** 注入，或 deploy-params 安装时未填 | web 容器 env + `/api/generate-agora-token` 500 body |
| `Failed to generate Agora token` | 证书/AppId 不匹配、UID 冲突、或 token builder 异常 | 服务端 log；对比 deploy-params 与 Agora 控制台 |
| `Failed to start conversation` | 上述 token 失败的上层包装；或 RTM login 失败 | LandingPage catch 链；Network 面板 |

### 4.2 技术根因（结论）

```text
┌─────────────────────────────────────────────────────────────────┐
│ Next.js 静态 env（NEXT_PUBLIC_*）→ Docker build ARG 写入 bundle   │
│ 服务端 runtime env（LAZYCAT_DEPLOYED）→ manifest 渲染进容器       │
│                                                                  │
│ 若仅 manifest 设 NEXT_PUBLIC_* 而 build 未设 → 客户端仍要密码      │
│ 若 build 设免密但 Agora build_args 空 → token API 500            │
│ inject simple-inject-password → 不能替代应用内 LandingPage 弹窗   │
└─────────────────────────────────────────────────────────────────┘
```

### 4.3 P0 修复验收标准

| ID | 标准 |
|----|------|
| AC-P0-01 | 微服安装后点击「进入直播间」**不出现** Access Code modal |
| AC-P0-02 | `/api/generate-agora-token` 返回 200，`token`/`uid`/`channel` 非空 |
| AC-P0-03 | `/api/generate-feed-token` 返回 200（网盘推流前置） |
| AC-P0-04 | 本地 Docker `ACCESS_PASSWORD=dev123` + 未设 LAZYCAT 标志时，E2E 5/5 不退化 |

---

## 5. 专题一：免密登录 — 任务分解

### 5.1 方案选型（组合，非单选）

| 方案 | 角色 | 实现要点 |
|------|------|----------|
| **A. 微服模式跳过门禁** | **主路径** | `lzc-build.yml` → `build_args`；`Dockerfile` ARG 已有；manifest runtime 双写 `LAZYCAT_DEPLOYED` + `NEXT_PUBLIC_*` |
| **B. inject 弱感知** | **提审说明 + 辅助** | 保留 `passwordless-entry` inject；**不能**作为唯一手段 |
| **C. Header 身份** | **V1.5 可选** | `X-HC-User-ID` 等；本期不阻塞提审 |

### 5.2 M1/M2 任务列表

| 任务 ID | 描述 | 文件 | 优先级 |
|---------|------|------|--------|
| AUTH-01 | 确认 `lzc-build.yml` web.build_args 含四项：`NEXT_PUBLIC_LAZYCAT_DEPLOYED`、`NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD`、`NEXT_PUBLIC_AGORA_APP_ID`、`NEXT_AGORA_APP_CERTIFICATE` | `lzc-build.yml` | P0 |
| AUTH-02 | manifest web.environment 与 build_args **同名变量值一致** | `lzc-manifest.yml` | P0 |
| AUTH-03 | 服务端 `isAccessGateEnabled()` 已读 runtime `LAZYCAT_DEPLOYED`（无需改逻辑，验证 env 到达） | `lib/accessPassword.ts` | P0 |
| AUTH-04 | 客户端 `requiresAccessPassword()` 依赖 build-time `NEXT_PUBLIC_*`（验证 bundle） | `lib/lazycat/netdisk-path.ts` | P0 |
| AUTH-05 | **可选增强**：runtime 检测 `window.location.hostname` 含 `.heiyu.space` 时跳过弹窗（防 build 遗漏兜底，需文档标注为 backup） | `lib/lazycat/runtime.ts`（新建）+ `LandingPage.tsx` | P1 |
| AUTH-06 | manifest inject 条目与 `STORE_REVIEW_NOTES.md` 文案对齐 | `lzc-manifest.yml` | P0 |
| AUTH-07 | 本地 Docker 兼容：`docker-compose.yml` 不设 LAZYCAT 标志；`.env` 可设 `ACCESS_PASSWORD` | `docker-compose.yml` | P0 |
| AUTH-08 | 契约测试：fixtures `lzc-build.reference.yml` 增加 build_args 段 | `fixtures/lzc-build.reference.yml` | P1 |

### 5.3 与 TC-AUTH-02 兼容策略

- 微服：`build_args` 强制免密；**不**在 deploy-params 填 `access_password`。
- 本地：`NEXT_PUBLIC_LAZYCAT_DEPLOYED=false`（默认），`ACCESS_PASSWORD=dev123`，Playwright 继续测密码流。
- **禁止**：在 git 或 log 中硬编码真实密钥/密码。

---

## 6. 专题二：MP4 导入 — 任务分解

### 6.1 Export 范围（本期冻结）

**结论：本期仅 import；export 列为 V1.5。**

| 项 | 说明 |
|----|------|
| UI | 仅有 `NetdiskVideoPicker` import；无「保存到网盘」入口 |
| inject | `lzc-file-chooser-inject.js` 含 save hook 能力，**manifest 未启用 save hook** |
| 权限 | `document.write` 保持 `optional`，提审说明「预留导出解说稿，本期未启用」 |
| 原因 | 避免半接线 save 被审核追问；减少权限面 |

### 6.2 导入链路审计任务

| 任务 ID | 检查项 | 文件/用例 |
|---------|--------|-----------|
| NET-01 | `package.yml` required：`net.internet`、`document.read`、`media.read` | TC-NET-01 |
| NET-02 | inject `diskRoot: /_lzc/files/home` 与 `buildLazyCatFileUrl` 一致 | TC-NET-02 |
| NET-03 | 真机：点按钮 → inject hook `fileInput` → 懒猫 picker 弹出 | TC-NET-03 |
| NET-04 | picker 返回 path **不带**重复前缀（或 normalize 正确） | TC-NET-03、TC-NET-04 |
| NET-05 | 当前实现经 `<input type=file>` + inject 注入 File；确认非 COEP 阻塞 | TC-NET-05 |
| NET-06 | MIME/扩展名白名单 `.mp4/.webm/.mov` | TC-NET-07 |
| NET-07 | 大文件 >500MB 警告或拒绝 | TC-NET-08 |
| NET-08 | 错误文案中文、可区分：凭证失败 / 格式 / 403 | 新增 TC-NET-09 |
| NET-09 | 与 `publish-local-feed.mjs` 行为差异文档化，禁止混用 | ARCH §4.5 |
| NET-10 | COEP 出现时切 M2 桥接页 `/lazycat-picker.html` | P1，见 `lazycat-lpk-netdisk` |

### 6.3 端到端数据流（实现验证顺序）

```text
用户点击「从网盘选择录像」
  → inject (fileInput hook) 拦截 input.click
  → 懒猫 file picker 选片
  → File 对象交给 NetdiskVideoPicker.onChange
  → isVideoPath 校验
  → GET /api/generate-feed-token
  → publishMp4BlobToFeed (UID 234567)
  → 用户 Start AI
  → agent 订阅帧 → MiMo vision + TTS
```

---

## 7. 专题三：LPK 构建与部署 — 任务分解

### 7.1 deploy-params 必填清单

| param id | type | 用途 |
|----------|------|------|
| `mimo_api_key` | secret | agent 视觉+TTS |
| `agora_app_id` | string | RTC；同时进 web build_args |
| `agora_app_certificate` | secret | token 签发；web runtime + build_args |
| `backend_api_secret` | secret | 前后端 API；默认 `$random(len=32)` |
| `vision_provider` | string | 可选，默认 mimo |
| `tts_provider` | string | 可选，默认 mimo |

### 7.2 瘦 LPK 流程（M4 必做）

```bash
# 1. 构建并推送镜像（一次性或 CI）
docker build ... # web / agent
docker push ttl.sh/worldcupvoice-web-xxx
lzc-cli appstore copy-image --from ttl.sh/... --to registry.lazycat.cloud/...

# 2. lzc-manifest.yml image 改为 registry.lazycat.cloud/...（非 embed:*）

# 3. lzc-build.yml 提审版：无 images 段（或分离 lzc-build.images.yml 仅本地 fat build）

# 4. 发布
lzc-cli project release
lzc-cli lpk info ./org.worldcupvoice.app-v*.lpk   # 期望 ~1MB, images: none
lzc-cli lpk install ./org.worldcupvoice.app-v*.lpk
lzc-cli project info --release
lzc-cli project log
```

**当前差距：** 根目录 `lzc-build.yml` 含 `images:` + `embed:*`，适用于**本地 fat 调试**，**不可直接提审**。

### 7.3 验证命令清单

| 阶段 | 命令 | 期望 |
|------|------|------|
| 契约 | `pnpm test:lazycat` | 全绿 |
| 契约 | `./scripts/test-lazycat-contract.sh` | 全绿 |
| 回归 | `pnpm test:e2e` | 5 passed（本地密码模式） |
| AI | `./scripts/verify-ai-pipeline.sh` | 管线 OK |
| 打包 | `lzc-cli project build`（M1 调试） | 生成 lpk |
| 发布 | `lzc-cli project release`（M4） | 瘦包 |
| 真机 | TC-LPK-04～06、TC-NET-03～06 | 人工/半自动 |

---

## 8. 文件变更清单（实现阶段）

| 文件 | M1 | M2 | M3 | M4 | 说明 |
|------|:--:|:--:|:--:|:--:|------|
| `lzc-build.yml` | ✓ | | | ✓ | build_args；M4 拆 fat/thin |
| `lzc-manifest.yml` | ✓ | ✓ | | ✓ | env 对齐；registry image |
| `lzc-build.images.yml`（新建） | | | | ✓ | 仅本地 fat build |
| `Dockerfile` | ✓ | | | | 确认 ARG 列表完整 |
| `lib/lazycat/runtime.ts` | | ✓ | | | 可选 hostname 兜底 |
| `components/LandingPage.tsx` | ✓ | ✓ | | | 使用统一 runtime 检测 |
| `components/NetdiskVideoPicker.tsx` | | | ✓ | | 错误文案、大小限制 |
| `fixtures/lzc-build.reference.yml` | ✓ | | | ✓ | build_args + 瘦包结构 |
| `fixtures/lzc-manifest.reference.yml` | ✓ | | | ✓ | registry 示例 |
| `server/tests/test_lazycat_second_dev.py` | ✓ | | | | build_args 契约 |
| `docs/lazycat-second-dev/*` | ✓ | ✓ | ✓ | ✓ | 本专题文档 |

**不在本期改：** export UI、OIDC、agent 侧 ffmpeg 读网盘。

---

## 9. 风险与依赖

| 风险 | 影响 | 缓解 |
|------|------|------|
| build 时 deploy-params 未渲染进 build_args | P0 复发 | `project release` 前 checklist；CI 校验 bundle |
| fat 包误提交商店 | 审核拒绝 | M4 强制 `lpk info` |
| inject 与 Next 路由冲突 | picker 无响应 | M3 真机；必要时 M2 桥接页 |
| 大 MP4 OOM | 浏览器崩溃 | TC-NET-08；UI 限制提示 |
| Agora 项目未开 Media Gateway | 仅影响 RTMP | 浏览器 publish 不依赖 |
| MiMo Key 无效 | Start AI 失败 | TC-DEP-02 中文错误 |

---

## 10. 估时与角色

| 角色 | 职责 |
|------|------|
| 前端 | build_args、LandingPage、NetdiskVideoPicker、错误文案 |
| 打包/运维 | lzc-cli、registry、deploy-params、真机 install |
| 后端 | agent 健康、MiMo 联调 |
|  QA | TEST_CASES-v0.2 执行、提审材料 |

---

## 11. M0 完成定义（当前交付）

- [x] IMPLEMENTATION_PLAN.md（本文件）
- [x] PRD-v0.2.md / ARCHITECTURE-v0.2.md / TEST_CASES-v0.2.md
- [x] README.md 索引更新
- [x] STORE_REVIEW_NOTES.md 草案
- [ ] M1 代码与真机验收（后续迭代）
