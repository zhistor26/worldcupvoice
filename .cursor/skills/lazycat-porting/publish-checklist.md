# 提审前检查清单

移植完成后、执行 `appstore publish` 前逐项确认。

## A. 配置文件

- [ ] `package.yml`：`package`、`version`、`name`、`description` 已填写
- [ ] `package.yml`：`locales` 含 `zh-CN` 与 `en-US`（或目标语言）
- [ ] `lzc-manifest.yml`：routes / services / binds 与 Docker 来源一致
- [ ] `lzc-build.yml`：`pkgout`、`icon: ./icon.png` 已配置
- [ ] `icon.png` 存在且尺寸合适（商店 logo）
- [ ] 持久化路径均在 `/lzcapp/var` 或 `/lzcapp/cache` 下

## B. 本地发布包验证（必做）

```bash
lzc-cli project release
lzc-cli lpk info ./<package>-<version>.lpk
lzc-cli lpk install ./<package>-<version>.lpk
lzc-cli project info --release
```

- [ ] `lpk install` 无报错
- [ ] 启动器可打开应用，页面非白屏
- [ ] 重启应用后数据仍在（`/lzcapp/var`）
- [ ] 启动与首屏加载 < 5 分钟

## C. 镜像（优先瘦 LPK）

- [ ] **提审包为瘦 LPK**（`lpk info` 显示 `images: none`，约 1MB 量级）
- [ ] 镜像已 `lzc-cli appstore copy-image`，`lzc-manifest.yml` 引用 `registry.lazycat.cloud/...`（**非** `embed:*`）
- [ ] `lzc-build.yml` **无** `images:` 段（镜像构建用单独的 `lzc-build.images.yml` 或一次性 fat build）
- [ ] 仅本地调试时可临时使用 fat 包；**不要**把数百 MB fat 包提交商店

Fat 包备选（仅自用验证）：

- [ ] 或通过 `lzc-build.yml` 的 `images` 内嵌到 LPK，且审核环境可拉取/已 copy-image

## D. 审核硬性要求

- [ ] **免密登录**已配置（inject 或 OIDC → `lazycat-auth-integration`）
- [ ] WorldCupVoice：网盘选片 inject 已配置（`lazycat-lpk-netdisk` + `content/lazycat-injects/`）
- [ ] 应用名称、描述、使用说明支持多语言（`locales`）
- [ ] 商店截图等资源在 publish / 开发者中心流程中准备就绪

## E. 账号与提交

- [ ] 已在 https://developer.lazycat.cloud/manage 完成开发者申请
- [ ] 已阅读审核指南（手册 §8 或官网）
- [ ] `lzc-cli --version` ≥ 1.2.54

```bash
lzc-cli appstore publish ./<package>-<version>.lpk
```

## F. WorldCupVoice 专项

- [ ] 对照 `docs/lazycat-second-dev/TEST_CASES.md`
- [ ] `./scripts/test-lazycat-contract.sh` 通过
- [ ] MiMo / Agora 等 Key 经 `lzc-deploy-params.yml` 注入，未写入 git
