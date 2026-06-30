# 速查 vs 完整库 — 缺口说明

`porting-handbook.md` 在本仓库中仅为**章节索引**，不是正文副本。

## 权威正文

```text
docs/lazycat/开发者手册.md
```

## 本仓库 Skill 独占

| 主题 | 来源 |
| --- | --- |
| 三阶段流水线、瘦 LPK | `lazycat-porting/SKILL.md` |
| 提审清单 | `publish-checklist.md` |
| 免密 / OIDC | `lazycat-auth-integration/` |
| 网盘 inject | `lazycat-lpk-netdisk/` |
| deploy-params 全字段 | `lazycat-dynamic-deploy/references/` |
| WorldCupVoice 目标态 | `docs/lazycat-second-dev/` |

## 仍可能不完整的主题

| 主题 | 补全方式 |
| --- | --- |
| Redis 完整配置 | 开发者手册 §10 或官网「数据库服务」 |
| inject 最新语法 | `lazycat-auth-integration` + 官网专题 |
| 59 篇专栏全文 | 克隆 lazycat-developer-manual 或 `LAZYCAT_MANUAL_ROOT` |
