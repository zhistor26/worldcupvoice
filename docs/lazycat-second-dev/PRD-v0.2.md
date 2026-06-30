# PRD：WorldCupVoice 懒猫微服专题修复（v0.2）

| 字段 | 值 |
|------|-----|
| 版本 | v0.2 |
| 日期 | 2026-06-30 |
| 状态 | **修复 + 提审就绪规格** |
| 前置 | [PRD.md v0.1](./PRD.md) · [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) |
| 基线问题 | 微服安装 LPK 后仍见 Access Code 弹窗，DEV123 失败 |

---

## 1. 背景与问题陈述

v0.1 已完成 LPK 三件套、inject、网盘 UI 与契约测试（见 [README.md](./README.md) 实现状态表）。**真机验证未通过**：用户从启动器进入应用后仍被要求输入 Access Code，常见失败包括：

- `Incorrect access code`
- `Failed to generate Agora token` / `Agora credentials are not set`
- `Failed to start conversation`

根因已定位：**Next.js `NEXT_PUBLIC_*` 必须在 Docker build 阶段写入**，manifest 运行时 env 无法改变已编译 bundle；inject 不能替代应用内 `LandingPage` 门禁 UI。详见 [ARCHITECTURE-v0.2.md §2](./ARCHITECTURE-v0.2.md)。

v0.2 目标：在**不退化**本地 Docker 开发体验的前提下，完成 P0 修复、免密上架、网盘 MP4 导入全链路真机验收，并产出瘦 LPK 提审包。

---

## 2. 产品目标

### 2.1 核心目标

> 作为懒猫微服用户，我从应用商店安装 WorldCupVoice 后，**无需输入进门密码**，可从**网盘选择 MP4 比赛录像**，一键获得**中文 AI 解说与字幕**；部署参数中配置的 MiMo / Agora 凭证在首次打开即可用。

### 2.2 成功指标

| 指标 | v0.2 验收标准 |
|------|---------------|
| P0 进门 | 微服内打开应用无 Access Code 弹窗；`/api/generate-agora-token` 200 |
| 免密上架 | 满足 `publish-checklist` 免密条目；inject + build 双保险 |
| 网盘选片 | 真机 picker → 推流 UID 234567 → Start AI 有字幕/音频 |
| 本地不退化 | `ACCESS_PASSWORD=dev123` Docker E2E 5/5 |
| 提审包 | 瘦 LPK ~1MB；`registry.lazycat.cloud` 镜像 |
| 契约 | `pnpm test:lazycat` + `test-lazycat-contract.sh` 绿 |

### 2.3 非目标（本期明确不做）

| 非目标 | 说明 |
|--------|------|
| **网盘导出解说稿 / 字幕** | UI 无 export 入口；inject save hook 未接线 → **V1.5** 单独立项 |
| 批量导出、剪辑时间轴 | 同 v0.1 |
| 完整 OIDC 账号体系 | 除非审核明确要求；默认 A+B 免密 |
| 服务端 ffmpeg 读网盘 | 继续浏览器 publish 方案 |
| 替换 Agora RTC | 不变 |
| 离线批处理整场比赛 | 不变 |

### 2.4 Export 边界声明（审核用）

**本期范围：仅 import。**

- 用户主动从网盘**读取**所选 MP4，经浏览器内存推流至 Agora，**不写入**第三方持久化存储。
- `document.write` 权限在 `package.yml` 中为 **optional**，用途说明：「未来版本支持将解说字幕保存回网盘，当前版本未启用」。
- 若审核追问 export：指向 [STORE_REVIEW_NOTES.md](./STORE_REVIEW_NOTES.md) §3。

---

## 3. 用户故事（v0.2 增量）

### US-FIX-1 微服免密进门（P0）

> 作为微服用户，我打开应用后直接进入预呼叫大厅，看不到 Access Code 对话框。

**验收：** AC-P0-01；TC-AUTH-01 真机。

### US-FIX-2 Agora 凭证就绪（P0）

> 作为微服用户，我点击「进入直播间」后 RTC/RTM 连接成功，不出现 Agora credentials 错误。

**验收：** AC-P0-02；TC-LPK-06。

### US-AUTH-1 免密进门（上架）

> 作为用户，我不记得也不该看到开发者调试密码；微服入口已鉴权，应用内不二次索要密码。

**验收：** 方案 A build + runtime；方案 B inject 写入提审说明；TC-AUTH-01～04。

### US-NET-1 网盘选 MP4（P0 全链路）

> 作为用户，我点击「从网盘选择录像」，选中网盘 MP4 后直播间出现画面并开始 AI 解说。

**验收：** TC-NET-03～06 真机；path 规范化；中文错误可区分。

### US-OPS-1 瘦包提审

> 作为开发者，我 `project release` 得到 ~1MB LPK，install 后 M1～M3 回归通过。

**验收：** TC-LPK-02～04、TC-STORE-*；[STORE_REVIEW_NOTES.md](./STORE_REVIEW_NOTES.md)。

### US-DEV-1 本地 Docker 兼容

> 作为开发者，我本地 `docker-compose up` 仍用 `ACCESS_PASSWORD=dev123` 进门调试。

**验收：** TC-AUTH-02；E2E 5/5。

---

## 4. 功能需求（v0.2 增量）

### FR-FIX 进门修复（P0）

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-FIX-1 | `lzc-build.yml` web `build_args` 写入 `NEXT_PUBLIC_LAZYCAT_DEPLOYED=true`、`NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD=false` | P0 |
| FR-FIX-2 | `build_args` 写入 `NEXT_PUBLIC_AGORA_APP_ID`、`NEXT_AGORA_APP_CERTIFICATE`（来自 deploy-params 渲染） | P0 |
| FR-FIX-3 | manifest runtime env 与 build_args **同名变量一致**（双保险） | P0 |
| FR-FIX-4 | 文档明确：inject **不能**替代应用内弹窗移除 | P0 |

### FR-AUTH 免密（继承 + 强化 v0.1）

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-AUTH-1 | 方案 A：build + runtime 跳过门禁 | P0 |
| FR-AUTH-2 | 方案 B：manifest `passwordless-entry` inject 保留 | P0 |
| FR-AUTH-3 | 本地 Docker 保留 `ACCESS_PASSWORD` 流程 | P0 |
| FR-AUTH-4 | 日志/UI 不展示明文密码与 secret | P0 |
| FR-AUTH-5 | 方案 C Header 身份 | P2（V1.5） |

### FR-NET 网盘导入（全链路审计）

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-NET-1 | 权限：`document.read`、`media.read`、`net.internet` required | P0 |
| FR-NET-2 | inject `diskRoot` 与 `normalizeLazyCatPath` 一致 | P0 |
| FR-NET-3 | 真机验证 fileInput hook 弹出 picker | P0 |
| FR-NET-4 | 格式白名单 mp4/webm/mov + 中文错误 | P0 |
| FR-NET-5 | 大文件边界提示（TC-NET-08） | P1 |
| FR-NET-6 | export / save hook | **不做（V1.5）** |

### FR-LPK 构建

| ID | 需求 | 优先级 |
|----|------|--------|
| FR-LPK-1 | M1 可用 fat build 调试；M4 瘦 LPK 提审 | P0 |
| FR-LPK-2 | deploy-params 必填项完整 | P0 |
| FR-LPK-3 | `embed:*` 仅本地；提审用 registry | P0 |

---

## 5. 里程碑（v0.2）

见 [IMPLEMENTATION_PLAN.md §3](./IMPLEMENTATION_PLAN.md#3-里程碑总表)。

| 里程碑 | 一句话 |
|--------|--------|
| M0 | 文档 v0.2 + 根因冻结 |
| M1 | P0 进门 + Agora token 真机通过 |
| M2 | 免密上架标准 + TC-AUTH 真机 |
| M3 | MP4 导入全链路真机 |
| M4 | 瘦 LPK + 提审 |

---

## 6. 验收总表

| 类别 | 必达用例 |
|------|----------|
| P0 修复 | AC-P0-01～04 |
| 打包 | TC-LPK-01～06 |
| 免密 | TC-AUTH-01～05 |
| 网盘 import | TC-NET-01～09 |
| 部署 | TC-DEP-01～05 |
| E2E | TC-E2E-LPK-01～04 |
| 安全 | TC-SEC-01～03 |
| 提审 | TC-STORE-01～06 |

详见 [TEST_CASES-v0.2.md](./TEST_CASES-v0.2.md)。
