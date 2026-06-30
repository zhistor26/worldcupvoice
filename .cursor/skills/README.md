# 懒猫微服移植技能包（项目内嵌）

Cursor Agent 从此目录发现 `*/SKILL.md`。**移植任务优先读 `lazycat-porting/SKILL.md`。**

## 与手册的分工（勿重复加载）

| 类型 | 路径 | 说明 |
|------|------|------|
| **权威正文** | `docs/lazycat/开发者手册.md` | 人类通读；AI 经索引按需 § |
| **章节索引** | `lazycat-porting/porting-handbook.md` | 仅路由，非正文 |
| **流水线** | `lazycat-porting/SKILL.md` | build/install/瘦LPK/提审 |
| **本项目** | `docs/lazycat-second-dev/` | WorldCupVoice YAML / E2E |

## 技能目录

| 目录 | 用途 |
|------|------|
| `lazycat-porting/` | 三阶段流水线 + [publish-checklist.md](./lazycat-porting/publish-checklist.md) |
| `lazycat-lpk-builder/` | YAML 字段规范 |
| `lazycat-developer-expert/` | 总控路由 |
| `lazycat-lpk-netdisk/` | 网盘 inject |
| `lazycat-auth-integration/` | 免密 / OIDC |
| `lazycat-dynamic-deploy/` | deploy-params |
| `lazycat-library/` | 59 篇 index 或回落手册 |
| `lazycat-advanced-routing/` | 路由 / ingress |

项目约束：[`../AGENTS.md`](../AGENTS.md)
