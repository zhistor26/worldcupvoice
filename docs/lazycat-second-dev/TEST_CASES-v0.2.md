# 测试用例：懒猫微服专题修复（v0.2）

| 字段 | 值 |
|------|-----|
| 版本 | v0.2 |
| 日期 | 2026-06-30 |
| 关联 | [PRD-v0.2](./PRD-v0.2.md) · [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) · [PYRAMID_TESTING.md](./PYRAMID_TESTING.md) |

---

## 1. 测试分层与自动化标记

| 标记 | 含义 |
|------|------|
| **AUTO** | CI / `pnpm test:lazycat` / pytest / Playwright |
| **MANUAL** | 微服真机必做 |
| **SEMI** | 脚本 + 人工确认 |

**推荐真机验收顺序：** TC-AUTH-01 → TC-LPK-06 → TC-NET-03～06 → TC-E2E 字幕音频。

---

## 2. P0 修复（新增）

### AC-P0-01 无 Access Code 弹窗

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 前置 | M1 build；`build_args` 含 LAZYCAT 免密标志 |
| 步骤 | 安装 LPK → 启动器打开 → 点击「进入直播间」 |
| 期望 | **不出现** Access Code modal；直达 loading / Live Booth |

### AC-P0-02 Agora viewer token

| 项 | 内容 |
|----|------|
| 标记 | SEMI |
| 步骤 | DevTools → `GET /api/generate-agora-token` |
| 期望 | HTTP 200；body 含 `token`、`uid`、`channel` |

### AC-P0-03 Agora feed token

| 项 | 内容 |
|----|------|
| 标记 | SEMI |
| 步骤 | Live Booth 内 `GET /api/generate-feed-token?channel=worldcup-live` |
| 期望 | HTTP 200；`appId` 非空；`uid=234567` |

### AC-P0-04 本地 Docker 不退化

| 项 | 内容 |
|----|------|
| 标记 | AUTO |
| 命令 | `ACCESS_PASSWORD=dev123 pnpm test:e2e` |
| 期望 | 5 passed |

### TC-FIX-01 build_args 契约（新增）

| 项 | 内容 |
|----|------|
| 标记 | AUTO |
| 步骤 | pytest / 扩展 `test_lazycat_second_dev.py` 校验根目录 `lzc-build.yml` web.build_args |
| 期望 | 含 `NEXT_PUBLIC_LAZYCAT_DEPLOYED`、`NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD`、`NEXT_PUBLIC_AGORA_APP_ID` |

### TC-FIX-02 bundle 与 runtime 一致（新增）

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 步骤 | 对比 web 容器 env 与客户端是否免密 |
| 期望 | 均免密；无「客户端要密码、服务端已 bypass」分裂 |

---

## 3. LPK 打包（TC-LPK-*）

继承 v0.1，v0.2 增量：

### TC-LPK-07 瘦包提审（新增）

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 步骤 | `lzc-cli project release` → `lpk info` |
| 期望 | 包体积 ~1MB 量级；`images: none` 或等价；manifest 引用 registry |

### TC-LPK-08 fat 与 thin 分离（新增）

| 项 | 内容 |
|----|------|
| 标记 | AUTO |
| 步骤 | 文档/契约：`lzc-build.yml` 提审版无 `images:`；本地 `lzc-build.images.yml` 可选 |
| 期望 | 提审路径不使用 `embed:*` |

| ID | 标记 | 摘要 |
|----|------|------|
| TC-LPK-01 | AUTO | fixtures 契约 |
| TC-LPK-02 | MANUAL | project build |
| TC-LPK-03 | MANUAL | lpk info |
| TC-LPK-04 | MANUAL | lpk install |
| TC-LPK-05 | MANUAL | 路由 200 |
| TC-LPK-06 | SEMI | agent 健康 / token 无 Missing Agora |

---

## 4. 免密登录（TC-AUTH-*）

### TC-AUTH-01 微服无密码弹窗

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 前置 | build_args + runtime 双保险 |
| 期望 | 无 Access Code 对话框 |

### TC-AUTH-02 本地 Docker 保留密码

| 项 | 内容 |
|----|------|
| 标记 | AUTO |
| 期望 | E2E 密码流 5/5 |

### TC-AUTH-03 inject 声明

| 项 | 内容 |
|----|------|
| 标记 | AUTO |
| 期望 | `passwordless-entry` + `netdisk-file-picker` 均在 manifest |

### TC-AUTH-04 日志无 secret

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 步骤 | `lzc-cli project log` 搜索 password / sk- / certificate |
| 期望 | 无 deploy secret 明文 |

### TC-AUTH-05 verify-access bypass（新增）

| 项 | 内容 |
|----|------|
| 标记 | SEMI |
| 前置 | 微服 web 容器 `LAZYCAT_DEPLOYED=true` |
| 步骤 | `POST /api/verify-access` body 任意密码 |
| 期望 | 200 `{ ok: true, bypassed: true }` 或等效 |

### TC-AUTH-06 inject 非唯一手段说明（新增）

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 步骤 | 审核材料对照 [STORE_REVIEW_NOTES.md](./STORE_REVIEW_NOTES.md) |
| 期望 | 写明 build 免密为主、inject 为辅 |

---

## 5. 网盘 MP4 导入（TC-NET-*）

### TC-NET-01 权限声明

| 标记 | AUTO |

### TC-NET-02 路径规范化

| 标记 | AUTO |

### TC-NET-03 picker 真机弹出（强化）

| 项 | 内容 |
|----|------|
| 标记 | **MANUAL** |
| 步骤 | Live Booth →「从网盘选择录像」 |
| 期望 | **懒猫网盘 picker 弹出**（非仅本机文件框）；选中后 File 有 name |

### TC-NET-03b path 前缀（新增）

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 步骤 | picker 返回 path 检查 DevTools / 日志 |
| 期望 | normalize 后不含重复 `/_lzc/files/home` 前缀 |

### TC-NET-04 拉取 MP4

| 标记 | SEMI / MANUAL |

### TC-NET-05 发布 RTC

| 标记 | MANUAL |

### TC-NET-06 Start AI + 解说

| 标记 | MANUAL |
| 期望 | 10～30s 字幕；音频可闻 |

### TC-NET-07 不支持格式

| 标记 | MANUAL |
| 期望 | 中文：「请选择 MP4 / WebM / MOV…」 |

### TC-NET-08 大文件

| 标记 | MANUAL（可选） |
| 期望 | 警告或拒绝；不 OOM 杀 tab |

### TC-NET-09 错误文案可区分（新增）

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 场景 | ① Agora 凭证缺失 ② 网盘 403 ③ 格式错误 |
| 期望 | 三种中文提示**互不相同** |

### TC-NET-10 export 未启用（新增）

| 项 | 内容 |
|----|------|
| 标记 | AUTO + MANUAL |
| 步骤 | UI 审查 + package optional write |
| 期望 | 无「保存到网盘」；`document.write` 未 required |

---

## 6. 部署参数（TC-DEP-*）

继承 v0.1 TC-DEP-01～05，无变更。

---

## 7. E2E（TC-E2E-LPK-*）

| ID | 标记 | v0.2 备注 |
|----|------|-----------|
| TC-E2E-LPK-01 | AUTO | 本地密码 |
| TC-E2E-LPK-02 | AUTO | `NEXT_PUBLIC_LAZYCAT_DEPLOYED=true` 构建 |
| TC-E2E-LPK-03 | AUTO | 网盘按钮存在 |
| TC-E2E-LPK-04 | AUTO | mock `/_lzc/files/home/**` |

### TC-E2E-LPK-05 真机金线（新增）

| 项 | 内容 |
|----|------|
| 标记 | MANUAL |
| 步骤 | 免密进门 → 网盘选片 → Start AI → 字幕/音频 |
| 期望 | 全程无 Access Code；无 Agora 500 |

---

## 8. 安全（TC-SEC-*）

继承 v0.1 TC-SEC-01～03。

---

## 9. 提审（TC-STORE-*）

### TC-STORE-01～02

继承 v0.1。

### TC-STORE-03 免密说明

| 期望 | [STORE_REVIEW_NOTES.md](./STORE_REVIEW_NOTES.md) §1 |

### TC-STORE-04 权限说明

| 期望 | import 只读；write optional 未启用 |

### TC-STORE-05 publish 干跑

继承 v0.1。

### TC-STORE-06 AI 免责声明（新增）

| 期望 | STORE_REVIEW_NOTES §4 |

---

## 10. 发版前回归清单（v0.2）

- [ ] `pnpm test:lazycat`
- [ ] `./scripts/test-lazycat-contract.sh`
- [ ] `pnpm test:e2e`（TC-AUTH-02）
- [ ] `./scripts/verify-ai-pipeline.sh`
- [ ] AC-P0-01～03（**真机**）
- [ ] TC-NET-03～06（**真机**）
- [ ] TC-LPK-07（release 瘦包）
- [ ] TC-STORE-01～06
- [ ] TC-NET-10（export 未启用）

---

## 11. pytest / CI 标记规划

```python
# @pytest.mark.lpk_live      # 需微服 + lzc-cli
# @pytest.mark.netdisk_live  # 需网盘 MP4 fixture
# @pytest.mark.p0_entry      # AC-P0 进门修复
```

M1 实现时添加 `test_build_args_contract` 至 `server/tests/test_lazycat_second_dev.py`。
