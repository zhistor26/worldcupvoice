# WorldCupVoice × 懒猫微服二次开发专题

本目录定义 **MiMo 本地栈完成之后** 的第二阶段：将 WorldCupVoice 打包为 LPK、接入免密登录、懒猫网盘选片解说，并满足应用商店提审要求。

| 文档 | 说明 |
|------|------|
| [PRD.md](./PRD.md) | 产品需求：用户故事、功能范围、验收标准、里程碑 |
| [ARCHITECTURE.md](./ARCHITECTURE.md) | 技术架构：LPK 拓扑、inject、网盘 MP4 → RTC → AI 管线 |
| [TEST_CASES.md](./TEST_CASES.md) | 测试用例：打包 / inject / 网盘 / E2E / 提审清单 |
| [fixtures/](./fixtures/) | **目标态** YAML 参考（供实现与自动化校验，非当前运行配置） |

## 与一阶段的关系

```text
一阶段（docs/mimo-integration/）     二阶段（本目录）
─────────────────────────────────────────────────────────
Docker 本地双容器                    lzc-build + manifest + package
MiMo 默认 AI 栈                      lzc-deploy-params 引导 Key
ACCESS_PASSWORD 进门                 inject 免密 / 去门禁
本机 mp4 + feed:local                网盘 mp4 → 浏览器发布 RTC
Playwright 冒烟 5/5                  LPK build + install + 网盘 E2E
```

## 实现状态（2026-06-29）

| 模块 | 状态 |
|------|------|
| 专题 PRD / 架构 / 测试用例 | ✅ |
| 根目录 LPK 三件套 + deploy-params + icon | ✅ |
| inject 免密 + 网盘 file-picker | ✅ manifest + content |
| 网盘/本机 MP4 → RTC 推流 UI | ✅ `NetdiskVideoPicker` |
| 本地 Docker 免密开关 | ✅ `NEXT_PUBLIC_LAZYCAT_DEPLOYED` |
| `lzc-cli project build` + 微服 install | 🔲 需在微服上验证 |
| 应用商店提审 | 🔲 M4 |

## 凭证与权限

| 项 | 存放 | Git |
|----|------|-----|
| MiMo / Agora Key | `lzc-deploy-params` 部署时填写 → 渲染进 manifest env | ❌ 不进仓库 |
| 用户网盘文件 | `/_lzc/files/home/...` | ❌ |
| fixtures | 仅占位符 `your-mimo-key` | ✅ |

## 官方 / 技能参考

- **通用手册正文**：[`docs/lazycat/开发者手册.md`](../lazycat/开发者手册.md)（AI 经 `porting-handbook.md` 索引按需 §）
- 懒猫移植流水线：`.cursor/skills/lazycat-porting/SKILL.md`
- 提审清单：`.cursor/skills/lazycat-porting/publish-checklist.md`
- 网盘 + inject：`.cursor/skills/lazycat-lpk-netdisk/SKILL.md`
- 免密登录：`.cursor/skills/lazycat-auth-integration/SKILL.md`（或官网 `06-专题/01-免密登录.md`）

## 本地跑自动化

```bash
# Node 单元（网盘路径规范化等）
pnpm test:unit

# Python 单元（deploy-params / fixtures 契约）
pip install -r server/requirements-dev.txt
python -m pytest server/tests/test_lazycat_second_dev.py -q

# 一键二阶段契约测试
pnpm test:lazycat
```
