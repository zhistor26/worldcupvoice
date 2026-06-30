# 懒猫微服通用文档

本目录存放**人类通读**的懒猫微服开发资料。与 AI 技能包分工见根目录 `AGENTS.md` § 文档分层。

| 文件 | 读者 | 说明 |
|------|------|------|
| [开发者手册.md](./开发者手册.md) | 人 + AI（按需查章节） | **权威正文**：环境、路由、LPK、移植、发布、命令速查 |
| [../lazycat-second-dev/](../lazycat-second-dev/) | 人 + AI | **WorldCupVoice 专题目录**：LPK 目标态、网盘、MiMo、E2E |

## AI 助手怎么用本文

1. **先做任务**：读 `.cursor/skills/lazycat-porting/SKILL.md`
2. **再查细节**：按 `porting-handbook.md` 里的章节索引，只打开本文对应 `§`（禁止通读全文）
3. **本项目实现**：读 `docs/lazycat-second-dev/`

## 维护约定

- 通用懒猫知识**只改** `开发者手册.md`，不要同步改 `.cursor/skills/` 里的大段正文
- Skills 目录只保留流水线、提审清单、专题 references
