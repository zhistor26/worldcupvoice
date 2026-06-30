# WorldCupVoice × 懒猫微服二次开发专题

本目录定义 **MiMo 本地栈完成之后** 的第二阶段：将 WorldCupVoice 打包为 LPK、接入免密登录、懒猫网盘选片解说，并满足应用商店提审要求。

---

## 文档索引（v0.2 专题修复）

| 文档 | 读者 | 说明 |
|------|------|------|
| **[PYRAMID_TESTING.md](./PYRAMID_TESTING.md)** | **AI / QA** | **金字塔自动化**：L1～L5 分层、命令、TC 映射、AI DoD |
| **[IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md)** | 全员 | **可执行计划**：M0～M4、P0 根因、任务分解、估时 |
| [PRD-v0.2.md](./PRD-v0.2.md) | PM / 开发 | 范围、用户故事、export 边界、成功指标 |
| [ARCHITECTURE-v0.2.md](./ARCHITECTURE-v0.2.md) | 开发 | build vs runtime、免密状态机、MP4 序列图、env 矩阵 |
| [TEST_CASES-v0.2.md](./TEST_CASES-v0.2.md) | QA | TC-AUTH / TC-NET / TC-LPK / TC-STORE；AUTO/MANUAL 标记 |
| [STORE_REVIEW_NOTES.md](./STORE_REVIEW_NOTES.md) | 提审 | 免密、网盘、AI 免责、export 说明草案 |

### v0.1 基线（历史）

| 文档 | 说明 |
|------|------|
| [PRD.md](./PRD.md) | v0.1 产品需求 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | v0.1 架构 |
| [TEST_CASES.md](./TEST_CASES.md) | v0.1 测试用例 |
| [fixtures/](./fixtures/) | 目标态 YAML 参考 |

---

## 里程碑（v0.2）

| 里程碑 | 状态 | 交付 |
|--------|------|------|
| **M0** | 🟢 进行中 | v0.2 文档六件套 + P0 根因文档化 |
| **M1** | 🔲 | P0 进门修复 + Agora token 真机 |
| **M2** | 🔲 | 免密上架标准 + TC-AUTH 真机 |
| **M3** | 🔲 | MP4 导入全链路真机 |
| **M4** | 🔲 | 瘦 LPK + appstore publish |

真机验收顺序：**免密进门 → Agora token 200 → 网盘选片推流 → Start AI → 字幕/音频**。

---

## 谁读什么

| 角色 | 优先阅读 |
|------|----------|
| **AI 助手** | **PYRAMID_TESTING.md §0** → TEST_CASES-v0.2 → IMPLEMENTATION_PLAN |
| 技术负责人 | IMPLEMENTATION_PLAN → ARCHITECTURE-v0.2 §2 P0 根因 |
| 前端 | PYRAMID_TESTING §4 · ARCHITECTURE-v0.2 §3～§5 |
| 打包运维 | IMPLEMENTATION_PLAN §7 · lzc-build/manifest · publish-checklist |
| QA | PYRAMID_TESTING · TEST_CASES-v0.2 · 发版清单 §10 |
| 提审 | STORE_REVIEW_NOTES |

---

## 与一阶段的关系

```text
一阶段（docs/mimo-integration/）     二阶段（本目录）
─────────────────────────────────────────────────────────
Docker 本地双容器                    lzc-build + manifest + package
MiMo 默认 AI 栈                      lzc-deploy-params 引导 Key
ACCESS_PASSWORD 进门                 build_args 免密 + inject 提审
本机 mp4 + feed:local                网盘 mp4 → 浏览器发布 RTC
Playwright 冒烟 5/5                  LPK release + 真机 E2E
```

---

## 实现状态（2026-06-30）

| 模块 | 状态 |
|------|------|
| v0.2 专题文档 | ✅ M0 |
| 根目录 LPK 三件套 + deploy-params | ✅ v0.1 |
| inject 免密 + 网盘 file-picker | ✅ manifest + content |
| NetdiskVideoPicker + publish-mp4-feed | ✅ |
| **P0：build_args 免密 + Agora 进 bundle** | 🔲 M1（真机仍失败） |
| **真机 lpk install 金线** | 🔲 M1～M3 |
| 瘦 LPK + registry 镜像 | 🔲 M4 |
| 应用商店提审 | 🔲 M4 |

---

## 已知 P0 问题（M1 必修复）

微服安装后用户仍见 Access Code 对话框，DEV123 失败。根因：**`NEXT_PUBLIC_*` 须在 Docker build（`lzc-build.yml` build_args）写入**；manifest runtime env 不足。详见 [ARCHITECTURE-v0.2.md §2](./ARCHITECTURE-v0.2.md)。

---

## 凭证与权限

| 项 | 存放 | Git |
|----|------|-----|
| MiMo / Agora Key | `lzc-deploy-params` 部署时填写 | ❌ |
| 用户网盘文件 | `/_lzc/files/home/...` | ❌ |
| fixtures | 占位符 | ✅ |

---

## 本地自动化

详见 **[PYRAMID_TESTING.md](./PYRAMID_TESTING.md)**（AI 默认流水线 §0.1）。

```bash
pnpm test:lazycat          # L1 契约
pnpm test:e2e:run          # L3 冒烟
./scripts/verify-ai-pipeline.sh   # L4 AI 管线
```

微服：

```bash
lzc-cli project build          # M1 调试（fat）
lzc-cli project release        # M4 提审（thin）
lzc-cli lpk install ./org.worldcupvoice.app-v*.lpk
lzc-cli project info --release
lzc-cli project log
```

---

## 技能与手册

- 移植流水线：`.cursor/skills/lazycat-porting/SKILL.md`
- 提审清单：`.cursor/skills/lazycat-porting/publish-checklist.md`
- 网盘：`.cursor/skills/lazycat-lpk-netdisk/SKILL.md`
- 免密：`.cursor/skills/lazycat-auth-integration/SKILL.md`
- 通用手册：[`docs/lazycat/开发者手册.md`](../lazycat/开发者手册.md)（按需 §，勿全文加载）
