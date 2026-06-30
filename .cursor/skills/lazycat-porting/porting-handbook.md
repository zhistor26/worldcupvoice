# 懒猫微服手册索引（Agent 用）

> **不要通读本文件当作手册。** 正文已统一到仓库权威源；本文件只做章节路由 + 本仓库补充。

## 权威正文

```text
docs/lazycat/开发者手册.md
```

人类通读、AI 查细节时**只打开需要的章节**（例如 `§5 路由规则`），不要与 `SKILL.md` 同时全文加载。

## 章节速查（对应开发者手册 §）

| § | 主题 | 何时读 |
|---|------|--------|
| 1 | 总体认知、核心概念 | 初次接触 LPK |
| 2 | 开发环境、`lzc-cli`、box | 环境/SSH 问题 |
| 3 | Hello World、`deploy` vs `release` | 开发态验证 |
| 4 | HTTP 路由、`public_path` | 后端/API 对接 |
| 5 | `routes` / `upstreams` / exec·http·file | 路由排障 |
| 6 | LPK v2 结构、`package.yml` | 打包格式 |
| 7 | 内嵌镜像、`/lzcapp/var` 持久化 | 数据不丢 |
| 8 | 发布、`copy-image`、registry | 上架前镜像 |
| 9 | Docker → manifest 映射 | 移植配置 |
| 10 | MySQL / PostgreSQL | 多 service 数据库 |
| 11 | `unsupported_platforms` | 平台限制 |
| 12 | `lzc-deploy-params.yml` | 安装时填参 → 亦读 `lazycat-dynamic-deploy` |
| 13 | 开发/发布检查清单 | 与 [publish-checklist.md](./publish-checklist.md) 对照 |
| 14 | 常用命令速查 | 复制命令 |

## 本仓库 Skill 独占（不在手册正文）

以下内容由 **skills 维护**，查手册找不到时读这里：

| 主题 | 文件 |
|------|------|
| 移植三阶段流水线 | [SKILL.md](./SKILL.md) |
| 提审逐项清单 | [publish-checklist.md](./publish-checklist.md) |
| **瘦 LPK**（推 registry，~1MB 包） | [SKILL.md § 瘦 LPK](./SKILL.md)、[publish-checklist.md § C](./publish-checklist.md) |
| 免密 / OIDC / inject | `lazycat-auth-integration/SKILL.md` |
| 网盘选文件 / MP4 | `lazycat-lpk-netdisk/SKILL.md` |
| YAML 字段护栏 | `lazycat-lpk-builder/references/` |
| WorldCupVoice 目标态 | `docs/lazycat-second-dev/` |

## inject / 免密 / 完整 59 篇

本仓库未内置 `meta/index.json`。需要 inject 语法、OIDC、KVM 等专题时：

1. 先读对应 vertical skill（见上表）
2. 仍不足 → https://developer.lazycat.cloud/ 或克隆 lazycat-developer-manual 并设 `LAZYCAT_MANUAL_ROOT`

## 已知缺口（手册内已标注）

- Redis 配置：手册 §10 可能不完整 → 查官方「数据库服务」专栏
- deploy-params 全字段 → `lazycat-dynamic-deploy/references/deploy-params.md`
