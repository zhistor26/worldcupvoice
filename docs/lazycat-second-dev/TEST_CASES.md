# 测试用例：懒猫微服二次开发（LPK + 免密 + 网盘 MP4）

| 字段 | 值 |
|------|-----|
| 版本 | v0.1 |
| 日期 | 2026-06-29 |
| 关联 | [PRD.md](./PRD.md) · [ARCHITECTURE.md](./ARCHITECTURE.md) |

---

## 1. 测试分层

| 层级 | 工具 | 路径 / 命令 |
|------|------|-------------|
| 契约 / 单元（Node） | `node --test` | `tests/unit/lazycat-*.test.mjs` |
| 契约 / 单元（Python） | pytest | `server/tests/test_lazycat_second_dev.py` |
| 一阶段回归 | Playwright | `pnpm test:e2e` |
| AI 管线回归 | bash | `scripts/verify-ai-pipeline.sh` |
| 打包集成 | lzc-cli | `lzc-cli project build` / `lpk install` |
| 网盘 E2E | 手动 + Playwright（M2+） | 真机 / 微服 |

```bash
# M0 自动化（无需微服）
pnpm test:lazycat

# 全量本地回归
pnpm test:e2e && bash scripts/verify-ai-pipeline.sh
```

---

## 2. 前置条件

### ENV-LPK-A（契约测试）

- 仓库含 `docs/lazycat-second-dev/fixtures/*.reference.yml`
- Node ≥ 22，Python 3.11+（或容器）

### ENV-LPK-B（微服集成）

- `lzc-cli` 已登录默认微服
- deploy-params 已填 MiMo + Agora
- 网盘有可访问测试 MP4（建议 &lt; 100MB H.264）

---

## 3. LPK 打包

### TC-LPK-01 fixtures 契约校验

| 项 | 内容 |
|----|------|
| 步骤 | `pnpm test:lazycat` |
| 期望 | Python + Node 测试全绿；reference YAML 含必需字段 |

### TC-LPK-02 project build

| 项 | 内容 |
|----|------|
| 前置 | M1 实装根目录 lzc 文件 |
| 步骤 | `lzc-cli project build` |
| 期望 | 生成 `.lpk`；无敏感信息打入包内明文 |

### TC-LPK-03 lpk info

| 项 | 内容 |
|----|------|
| 步骤 | `lzc-cli lpk info ./worldcupvoice-*.lpk` |
| 期望 | 包名、版本、权限与 `package.yml` 一致 |

### TC-LPK-04 lpk install

| 项 | 内容 |
|----|------|
| 步骤 | `lzc-cli lpk install ./worldcupvoice-*.lpk` |
| 期望 | 安装成功；启动器可见中文应用名 |

### TC-LPK-05 路由可达

| 项 | 内容 |
|----|------|
| 步骤 | 浏览器打开 `https://<app>.<box>.heiyu.space/` |
| 期望 | 首页加载；无 502；静态资源 200 |

### TC-LPK-06 agent 健康（集群内）

| 项 | 内容 |
|----|------|
| 步骤 | 从 web 触发 Start AI 或 `lzc-cli project log` |
| 期望 | agent `/health` 200；无 `Missing Agora credentials` |

---

## 4. 免密登录

### TC-AUTH-01 微服无密码弹窗

| 项 | 内容 |
|----|------|
| 前置 | `NEXT_PUBLIC_LAZYCAT_DEPLOYED=true` |
| 步骤 | 打开应用首页 |
| 期望 | 不出现 `ACCESS_PASSWORD` 对话框；可进 Live Booth |

### TC-AUTH-02 本地 Docker 保留密码

| 项 | 内容 |
|----|------|
| 前置 | 本地 compose，未设 LAZYCAT 标志 |
| 步骤 | `pnpm test:e2e` |
| 期望 | 仍测试密码进门流程（5/5） |

### TC-AUTH-03 inject 声明存在

| 项 | 内容 |
|----|------|
| 步骤 | 解析 `fixtures/lzc-manifest.reference.yml` |
| 期望 | `application.injects` 含免密或 file-picker 条目 |

### TC-AUTH-04 日志无密码泄露

| 项 | 内容 |
|----|------|
| 步骤 | `lzc-cli project log` 搜索 password |
| 期望 | 无 deploy secret 明文 |

---

## 5. 网盘 MP4 解说

### TC-NET-01 权限声明

| 项 | 内容 |
|----|------|
| 步骤 | 读 `fixtures/package.reference.yml` |
| 期望 | `document.read`、`media.read`、`net.internet` 在 required |

### TC-NET-02 路径规范化（自动化）

| 项 | 内容 |
|----|------|
| 步骤 | `tests/unit/lazycat-netdisk-path.test.mjs` |
| 期望 | `normalizeLazyCatPath` / `buildLazyCatFileUrl` 用例全过 |

### TC-NET-03 picker 返回 path

| 项 | 内容 |
|----|------|
| 前置 | M2 网盘有 `test-match.mp4` |
| 步骤 | 点击「从网盘选择」→ 选文件 |
| 期望 | 主站收到以 `/` 开头的相对 path |

### TC-NET-04 拉取 MP4

| 项 | 内容 |
|----|------|
| 步骤 | `fetch(buildLazyCatFileUrl(path))` |
| 期望 | 200；`Content-Type` 含 `video`；Blob size &gt; 0 |

### TC-NET-05 发布 RTC 视频轨

| 项 | 内容 |
|----|------|
| 步骤 | 选片后自动或手动「开始推流」 |
| 期望 | 本地预览可见画面；UID 234567 有视频（日志确认） |

### TC-NET-06 Start AI + 解说

| 项 | 内容 |
|----|------|
| 步骤 | Start AI，等待 10～30s |
| 期望 | 字幕出现；`AI_AUDIO_PIPELINE` 日志；`audio_sent_ms` &gt; 0 |

### TC-NET-07 不支持格式

| 项 | 内容 |
|----|------|
| 步骤 | 选择非 `.mp4` 文件 |
| 期望 | 中文错误提示；不崩溃 |

### TC-NET-08 大文件提示

| 项 | 内容 |
|----|------|
| 步骤 | 选择 &gt; 500MB 文件（可选） |
| 期望 | 警告或拒绝；不 OOM 杀进程 |

---

## 6. 部署参数与多 AI

### TC-DEP-01 deploy-params 字段完整

| 项 | 内容 |
|----|------|
| 步骤 | pytest `test_deploy_params_reference_has_required_secrets` |
| 期望 | 含 `mimo_api_key`、`agora_app_id`、`agora_app_certificate` |

### TC-DEP-02 缺 MiMo Key

| 项 | 内容 |
|----|------|
| 前置 | 清空 MIMO_API_KEY |
| 步骤 | Start AI |
| 期望 | 中文/英文明确错误；不要求 OPENAI |

### TC-DEP-03 Provider 切换 OpenAI

| 项 | 内容 |
|----|------|
| 前置 | deploy `VISION_PROVIDER=openai` + OPENAI_API_KEY |
| 期望 | 视觉请求打 OpenAI；MiMo 非必须 |

### TC-DEP-04 TTS Fish 回退

| 项 | 内容 |
|----|------|
| 前置 | `TTS_PROVIDER=fish_audio` + Fish Key |
| 期望 | 解说语音来自 Fish；与一阶段行为一致 |

### TC-DEP-05 BACKEND_API_SECRET 随机

| 项 | 内容 |
|----|------|
| 步骤 | 检查 deploy-params `default_value: $random` |
| 期望 | 安装后前后端 secret 一致 |

---

## 7. E2E（Playwright）

### TC-E2E-LPK-01 本地密码回归

| 项 | 内容 |
|----|------|
| 命令 | `ACCESS_PASSWORD=dev123 pnpm test:e2e` |
| 期望 | 5 passed |

### TC-E2E-LPK-02 懒猫模式进门（M1+）

| 项 | 内容 |
|----|------|
| 前置 | `NEXT_PUBLIC_LAZYCAT_DEPLOYED=true` 构建 web |
| 步骤 | Playwright 打开首页 |
| 期望 | 无密码框；直达 booth 元素可见 |

### TC-E2E-LPK-03 网盘按钮存在（M2+）

| 项 | 内容 |
|----|------|
| 步骤 | 进入 Live Booth |
| 期望 | 「从网盘选择录像」可点击 |

### TC-E2E-LPK-04 mock 网盘 URL（M2+）

| 项 | 内容 |
|----|------|
| 步骤 | route 拦截 `/_lzc/files/home/**` 返回 fixture mp4 |
| 期望 | 视频元素 `readyState >= 2` |

---

## 8. 安全

### TC-SEC-01 Git 无 env.local

| 项 | 内容 |
|----|------|
| 步骤 | `git status` / `git ls-files` |
| 期望 | 无 `.env.local`、`server/.env.local` |

### TC-SEC-02 fixtures 无真实 Key

| 项 | 内容 |
|----|------|
| 步骤 | pytest `test_fixtures_contain_no_real_secrets` |
| 期望 | 无 `sk-` 长串、无真实 heiyu 设备名 |

### TC-SEC-03 网盘仅用户所选路径

| 项 | 内容 |
|----|------|
| 步骤 | 代码审查 fetch URL 构造 |
| 期望 | 仅 `buildLazyCatFileUrl(normalize(path))`；无目录遍历 |

---

## 9. 提审（TC-STORE）

### TC-STORE-01 中文元数据

- `package.yml` locales.zh 名称、描述完整

### TC-STORE-02 图标

- `icon.png` 存在且 build 引用

### TC-STORE-03 免密说明

- 审核备注：微服入口鉴权 + inject / 无二次密码

### TC-STORE-04 权限说明

- 说明为何需要 `document.read` / `media.read`

### TC-STORE-05 publish 干跑

- `lzc-cli appstore publish --dry-run`（若支持）或 checklist 人工勾选

---

## 10. 发版前回归清单

- [ ] `pnpm test:lazycat`
- [ ] `pnpm test:e2e`
- [ ] `bash scripts/verify-ai-pipeline.sh`（本地 feed 或网盘片源）
- [ ] TC-LPK-02～04（微服）
- [ ] TC-NET-03～06（真机网盘）
- [ ] TC-SEC-01～02
- [ ] TC-STORE-01～05

---

## 11. pytest / node:test 标记

```python
# server/tests/test_lazycat_second_dev.py
# 默认 CI 跑契约测试，不依赖 lzc-cli

# 未来：
# @pytest.mark.lpk_live  # 需要微服
# @pytest.mark.netdisk_live
```

```json
// package.json
"test:lazycat": "node --test tests/unit/lazycat-*.test.mjs && python -m pytest server/tests/test_lazycat_second_dev.py -q"
```
