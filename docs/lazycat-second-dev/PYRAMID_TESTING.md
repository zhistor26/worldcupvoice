# 金字塔自动化测试专题（AI 驱动）

| 字段 | 值 |
|------|-----|
| 版本 | v0.1 |
| 日期 | 2026-06-30 |
| 读者 | **AI 助手优先**；人类开发者 / QA 次之 |
| 关联 | [TEST_CASES-v0.2.md](./TEST_CASES-v0.2.md) · [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) · [ARCHITECTURE-v0.2.md](./ARCHITECTURE-v0.2.md) |

---

## 0. AI 助手必读（执行顺序）

> 本文件是 **测试实现的单一入口**。改懒猫/LPK/网盘/免密相关代码前读 §1～§3；改 AI 管线读 §4 + `docs/mimo-integration/TEST_CASES.md`。

### 0.1 默认验证流水线（每次改代码后）

按顺序执行，**上一层失败则停止向下**，先修再继续：

```bash
# L1 单元 + 契约（无 Docker、无微服、无 Key）
pnpm test:lazycat

# L2 静态检查（改 TS/前端时）
pnpm run lint && pnpm run typecheck

# L3 E2E 前端冒烟（需 web:3000；脚本可自动 docker-up）
pnpm test:e2e:run

# L4 AI 管线集成（需 docker 双容器 + feed:local + server/.env.local Key）
./scripts/verify-ai-pipeline.sh
```

**不要**在 L1 未绿时跑 L4。 **不要**为了绿而 `skip`、注释断言、删校验。

### 0.2 真机 / 微服（L5，非 CI）

仅当 IMPLEMENTATION_PLAN 里程碑要求（M1～M4）：

```bash
lzc-cli project build    # 或 release
lzc-cli lpk install ./org.worldcupvoice.app-v*.lpk
# 人工：TC-E2E-LPK-05 金线
```

### 0.3 AI 写测试的硬规则

| 规则 | 说明 |
|------|------|
| **一需求一 TC-ID** | 新行为必须映射 [TEST_CASES-v0.2.md](./TEST_CASES-v0.2.md) 中 ID，或先追加 ID 再写测试 |
| **业务逻辑测单元** | 路径规范化、门禁、token 边界 → L1；不要塞进 Playwright |
| **UI 流程测 E2E** | 弹窗、按钮、中文文案 → L3 Playwright |
| **YAML/打包测契约** | manifest、build_args、permissions → L1 Python `test_lazycat_second_dev.py` |
| **HTTP API 测 pytest** | FastAPI route、secret、session → L2 `server/tests/test_*.py` + httpx |
| **禁止** | 真实 Key 进 git；E2E 调真实 MiMo/Agora（除非 `@pytest.mark.live` 且用户明确要求） |
| **mock 优先** | 外部 API、网盘 `/_lzc/files/home/**`、Agora token 用 route intercept 或 monkeypatch |

---

## 1. 金字塔总览

```text
                    ┌─────────────────────┐
                    │ L5 真机 / 微服 MANUAL │  lzc-cli install、网盘 picker
                    │ TC-E2E-LPK-05 金线   │  不进入默认 CI
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ L4 管线脚本 SEMI     │  verify-ai-pipeline.sh
                    │ 前后端 + Agora + MiMo│  需 feed:local + .env.local
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ L3 E2E Playwright    │  e2e/*.spec.ts
                    │ 浏览器全流程          │  需 web:3000
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ L2 API / 集成 pytest │  server/tests/test_main.py 等
                    │ Route Handler 可选   │  app/api/* 经 Next 或直测 lib
                    └──────────┬──────────┘
                               │
                    ┌──────────▼──────────┐
                    │ L1 单元 + 契约 AUTO  │  node:test + pytest lazycat
                    │ 最快、无网络依赖      │  CI 必跑
                    └─────────────────────┘
```

| 层 | 工具 | 目录 | 运行命令 | 标记 |
|----|------|------|----------|------|
| **L1** | Node `node:test` + tsx | `tests/unit/*.test.ts` | `pnpm test:unit` | AUTO |
| **L1** | pytest | `server/tests/test_lazycat_second_dev.py` | 见下 | AUTO |
| **L2** | pytest + httpx/async | `server/tests/test_*.py` | `cd server && pytest` | AUTO |
| **L2** | Next Route（规划） | `tests/integration/`（待建） | TBD | AUTO |
| **L3** | Playwright | `e2e/*.spec.ts` | `pnpm test:e2e:run` | AUTO |
| **L4** | bash + curl | `scripts/verify-ai-pipeline.sh` | 见脚本 | SEMI |
| **L4** | bash | `scripts/test-lazycat-contract.sh` | `pnpm test:lazycat` | AUTO |
| **L5** | 人工 + lzc-cli | 微服真机 | 见 TEST_CASES-v0.2 §10 | MANUAL |

**一键 L1 契约：**

```bash
pnpm test:lazycat
# = node --test tests/unit/lazycat-*.test.ts
# + pytest server/tests/test_lazycat_second_dev.py
```

---

## 2. L1 单元层（前端 Node + 后端 Python）

### 2.1 前端（Node `node:test`）

| 项 | 约定 |
|----|------|
| 路径 | `tests/unit/<模块>.test.ts` |
| 导入 | `node:assert/strict` + `node:test`；经 `tsx` 加载 TS |
| 测什么 | 纯函数、无 DOM、无 `fetch`：`lib/lazycat/*`、`lib/accessPassword`（仅 server 则放 L2） |
| 现有 | `tests/unit/lazycat-netdisk-path.test.ts` |

**AI 新增用例模板：**

```typescript
// tests/unit/lazycat-runtime.test.ts
import assert from 'node:assert/strict';
import { describe, it, beforeEach, afterEach } from 'node:test';

describe('requiresAccessPassword', () => {
  const env = { ...process.env };
  afterEach(() => { process.env = { ...env }; });

  it('TC-AUTH-01: LAZYCAT deployed skips gate', () => {
    process.env.NEXT_PUBLIC_LAZYCAT_DEPLOYED = 'true';
    // import and assert
  });
});
```

**注册到 package.json：**  glob 已含 `tests/unit/lazycat-netdisk-path.test.ts`；扩展时改为 `tests/unit/**/*.test.ts` 或追加文件到 `test:unit` 脚本。

### 2.2 后端（pytest 单元）

| 项 | 约定 |
|----|------|
| 路径 | `server/tests/test_<模块>.py` |
| 隔离 | `conftest.py` 的 `isolate_local_env` 自动剥离 Key |
| 现有 | `test_config.py`、`test_models.py`、`test_session_manager.py`、`test_mimo_provider.py`、`test_backend_commentator.py` |

**运行：**

```bash
cd server
pip install -r requirements.txt -r requirements-dev.txt
PYTHONPATH=. pytest tests/ -q
# 仅懒猫契约：
PYTHONPATH=. pytest tests/test_lazycat_second_dev.py -q
```

### 2.3 L1 契约（懒猫 LPK 专用）

| 模块 | 文件 | 测什么 |
|------|------|--------|
| 打包校验 | `server/app/lazycat_packaging.py` | 解析根目录与 `fixtures/*.reference.yml` |
| 契约测试 | `server/tests/test_lazycat_second_dev.py` | deploy-params、permissions、injects、无真实 secret |

**AI 实现 M1 build_args 时必加：**

```python
def test_root_build_has_lazycat_build_args():
    """TC-FIX-01: web build_args 含 NEXT_PUBLIC_LAZYCAT_DEPLOYED 等."""
    # 读 lzc-build.yml，断言 build_args 四字段
```

同步更新 `docs/lazycat-second-dev/fixtures/lzc-build.reference.yml`。

### 2.4 L1 ↔ TC-ID 映射（已实现）

| TC-ID | 测试位置 |
|-------|----------|
| TC-NET-02 | `tests/unit/lazycat-netdisk-path.test.ts` |
| TC-AUTH-01/02（逻辑） | 同上 `requiresAccessPassword` |
| TC-LPK-01 | `test_lazycat_second_dev.py` 全文件 |
| TC-DEP-01 | `test_deploy_params_reference_has_required_secrets` |
| TC-SEC-02 | `test_fixtures_contain_no_real_secrets` |

---

## 3. L2 API / 集成层

### 3.1 FastAPI（agent）

| 关注点 | 现有测试 | AI 应补充 |
|--------|----------|-----------|
| `BACKEND_API_SECRET` | `test_main.py` | — |
| `/health` | `test_main.py` | — |
| `/sessions/*` | `test_session_manager.py`、`test_backend_commentator.py` | mock Agora/MiMo |
| Settings / Provider | `test_config.py`、`test_mimo_provider.py` | TC-DEP-02 缺 Key |

**模式：** `monkeypatch.setenv` + `get_settings.cache_clear()`；httpx `AsyncClient` 测路由（参考现有 async tests）。

### 3.2 Next.js Route Handlers（web）

| 路由 | 应用逻辑 | 推荐 L2 方式 |
|------|----------|--------------|
| `app/api/verify-access/route.ts` | `lib/accessPassword.ts` | **优先** Python/Node 单测 `isAccessGateEnabled`；或新建 `tests/integration/api-verify-access.test.ts` 用 Next 测试 harness |
| `app/api/generate-agora-token/route.ts` | agora-token + 门禁 cookie | mock env + mock cookie；断言 401/500/200 |
| `app/api/generate-feed-token/route.ts` | 同上 | TC-NET-05 前置 |

**AI 规划目录（M1 建议创建）：**

```text
tests/integration/
├── access-gate.test.ts      # TC-AUTH-05 bypass
├── agora-token-route.test.ts # AC-P0-02 mock env
└── helpers/
    └── mock-env.ts
```

**实现约束：** Route 测试不启动完整 Next 服务器时，可 **提取** `lib/accessPassword.ts` / token 构建纯函数到 L1，Route 仅薄封装。

### 3.3 L2 ↔ TC-ID 映射（待实现）

| TC-ID | 目标测试文件 | 优先级 |
|-------|--------------|--------|
| TC-AUTH-05 | `tests/integration/access-gate.test.ts` | P0 |
| AC-P0-02 | `tests/integration/agora-token-route.test.ts` | P0 |
| AC-P0-03 | `tests/integration/feed-token-route.test.ts` | P0 |
| TC-DEP-02 | `server/tests/test_config.py` 扩展 | P1 |
| TC-FIX-01 | `test_lazycat_second_dev.py` 扩展 | P0 |

---

## 4. L3 E2E 层（Playwright · 前端）

### 4.1 配置

| 项 | 值 |
|----|-----|
| 配置 | `playwright.config.ts` |
| 目录 | `e2e/` |
| baseURL | `PLAYWRIGHT_BASE_URL` 默认 `http://localhost:3000` |
| 启动 | `pnpm test:e2e:run` → 不可达时 `scripts/docker-up.sh` |

### 4.2 现有 spec

| 文件 | 场景 | TC 映射 |
|------|------|---------|
| `e2e/smoke.spec.ts` | 本地密码模式 5 条 | TC-E2E-LPK-01、TC-AUTH-02 |
| `e2e/lazycat-second-dev.spec.ts` | LAZYCAT 免密（**skip** 除非构建标志） | TC-E2E-LPK-02 |

### 4.3 AI 扩展 E2E 规则

1. **选择器：** 优先 `getByRole` / `getByLabel`；与 a11y 一致。
2. **环境分支：** 用 `test.skip(condition, reason)` 而非删用例。
3. **网盘 mock：** `page.route('**/_lzc/files/home/**', ...)` 返回 fixture mp4 → TC-E2E-LPK-04。
4. **不要** 在 CI 依赖真实 Agora；允许「进入直播间或明确 Agora 错误」模式（见 smoke 第 4 条）。

**M2+ 待增文件：**

```text
e2e/lazycat-netdisk.spec.ts   # TC-E2E-LPK-03、04 mock 网盘
e2e/lazycat-golden-path.spec.ts # 免密 + mock mp4 + Start AI 按钮可见
```

### 4.4 LAZYCAT 模式 E2E 构建

```bash
# 构建/运行带 LAZYCAT 标志的 web（与 lzc-build build_args 一致）
NEXT_PUBLIC_LAZYCAT_DEPLOYED=true \
NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD=false \
pnpm test:e2e:run e2e/lazycat-second-dev.spec.ts
```

Docker 场景：在 `docker-compose.yml` web build args 设标志后 `pnpm test:e2e:run`。

---

## 5. L4 管线脚本层（前后端联调）

### 5.1 `scripts/test-lazycat-contract.sh`

- **层：** L1 聚合入口
- **内容：** Node unit + pytest lazycat
- **CI：** 必跑

### 5.2 `scripts/verify-ai-pipeline.sh`

- **层：** L4
- **前置：**
  - `docker compose` web + agent 运行
  - `server/.env.local` 含 `BACKEND_API_SECRET`、MiMo、Agora
  - **`pnpm run feed:local`** 推 UID 234567（与微服网盘路径互斥，见 ARCH §4.5）
- **断言：** 30 轮询内 `tts_requests > 0` 且 `audio_sent_ms > 0`
- **映射：** TC-NET-06 本地等价、一阶段 MiMo 回归

### 5.3 AI 何时跑 L4

| 改动范围 | 跑 L4？ |
|----------|---------|
| 仅 L1/L2 文档/契约 | 否 |
| `server/app/` 会话、MiMo、TTS | **是** |
| 仅前端 UI 文案 | 否（L3 足够） |
| 懒猫 netdisk / publish-mp4 | L3 mock + L5 真机；L4 不替代 |

---

## 6. L5 真机 / 微服（Manual）

不自动化进默认 CI。用例见 [TEST_CASES-v0.2.md §10](./TEST_CASES-v0.2.md)。

**金线（TC-E2E-LPK-05）：**

```text
免密进门 → /api/generate-agora-token 200 → 网盘选片推流 → Start AI → 字幕/音频
```

**pytest 标记（规划，M1 实现）：**

```python
# server/tests/conftest.py 或 pytest.ini
# [markers]
# lpk_live: 需要 lzc-cli 与微服
# netdisk_live: 需要网盘 MP4
```

---

## 7. 命令速查（AI 复制用）

```bash
# ── L1 必跑 ──
pnpm test:lazycat
pnpm test:unit

# ── L2 后端全量 ──
cd server && PYTHONPATH=. pytest tests/ -q

# ── L3 前端 E2E ──
pnpm test:e2e:run
pnpm test:e2e:run e2e/smoke.spec.ts
pnpm test:e2e:run e2e/lazycat-second-dev.spec.ts

# ── 静态 ──
pnpm run lint && pnpm run typecheck

# ── L4 管线（重）──
./scripts/docker-up.sh -d
pnpm run feed:local &   # 另开终端
./scripts/verify-ai-pipeline.sh

# ── L5 微服 ──
lzc-cli project build
lzc-cli lpk install ./org.worldcupvoice.app-v*.lpk
lzc-cli project log
```

---

## 8. 按专题的测试矩阵（AI 任务路由）

### 8.1 P0 进门 / Agora（IMPLEMENTATION_PLAN M1）

| 步骤 | 层 | 动作 |
|------|-----|------|
| 1 | L1 | 扩展 `test_lazycat_second_dev.py`：`build_args` 四字段 |
| 2 | L1 | 扩展 `requiresAccessPassword` / `isAccessGateEnabled` 单元 |
| 3 | L2 | 新增 integration：`verify-access` bypass、`generate-agora-token` 200/500 |
| 4 | L3 | 启用 `lazycat-second-dev.spec.ts`（LAZYCAT 构建下不 skip） |
| 5 | L5 | AC-P0-01～03 真机 |

### 8.2 免密登录（M2）

| 步骤 | 层 | 动作 |
|------|-----|------|
| 1 | L1 | manifest inject id 契约（已有） |
| 2 | L3 | 断言无 `Access code` dialog |
| 3 | L3 | `smoke.spec.ts` 保持本地密码 5/5 不退化 |
| 4 | L5 | TC-AUTH-04 log 无 secret |

### 8.3 网盘 MP4 导入（M3）

| 步骤 | 层 | 动作 |
|------|-----|------|
| 1 | L1 | path/MIME 单元（已有 + 扩展 TC-NET-07） |
| 2 | L3 | mock `/_lzc/files/home/**` + 选片按钮 |
| 3 | L3 | 错误文案断言 TC-NET-09 |
| 4 | L5 | inject picker 真机 TC-NET-03 |

### 8.4 LPK 提审（M4）

| 步骤 | 层 | 动作 |
|------|-----|------|
| 1 | L1 | fixtures 与根目录 YAML 同步 |
| 2 | L5 | TC-LPK-07 瘦包 `lpk info` |
| 3 | Manual | TC-STORE + STORE_REVIEW_NOTES |

---

## 9. 目录规划（待 AI 逐步创建）

```text
worldcupvoice/
├── tests/
│   ├── unit/                    # L1 Node
│   │   ├── lazycat-netdisk-path.test.ts  ✅
│   │   ├── access-password.test.ts       🔲 P0
│   │   └── lazycat-runtime.test.ts       🔲 P1
│   └── integration/             # L2 Next/lib
│       ├── access-gate.test.ts           🔲 P0
│       └── agora-token-route.test.ts     🔲 P0
├── e2e/                         # L3
│   ├── smoke.spec.ts            ✅
│   ├── lazycat-second-dev.spec.ts ✅
│   ├── lazycat-netdisk.spec.ts  🔲 M3
│   └── fixtures/
│       └── sample.mp4           🔲 小体积 fixture
├── server/tests/                # L1/L2 Python
│   ├── test_lazycat_second_dev.py ✅
│   └── ...
└── scripts/
    ├── test-lazycat-contract.sh ✅
    └── verify-ai-pipeline.sh    ✅
```

**package.json 建议新增（AI 实现时）：**

```json
"test:integration": "node --import tsx --test tests/integration/**/*.test.ts",
"test:py": "cd server && PYTHONPATH=. pytest tests/ -q",
"test:ci": "pnpm test:lazycat && pnpm run lint && pnpm run typecheck && pnpm test:e2e:run"
```

---

## 10. CI 门禁建议（未接入时 AI 本地等价）

| 阶段 | 命令 | 阻断 |
|------|------|------|
| PR 默认 | `pnpm test:ci`（规划） | L1 + lint + typecheck + smoke E2E |
| 改 server | + `pnpm test:py` | L2 |
| 改 AI 管线 | + `verify-ai-pipeline.sh` | L4（可选 job） |
| release 前 | TEST_CASES-v0.2 §10 清单 | 含 L5 |

---

## 11. 反模式（AI 禁止）

| 反模式 | 正确做法 |
|--------|----------|
| 只改 manifest 不设 build_args，指望 E2E 绿 | L1 契约断言 build_args；ARCH §2 |
| Playwright 测 path 规范化 | L1 `normalizeLazyCatPath` |
| E2E 调真实 MiMo | L4 或 `@pytest.mark.live` |
| 微服真机依赖 `feed:local` | 浏览器 publish；L5 金线 |
| 硬编码 `dev123` 进生产 bundle | 仅 E2E env `ACCESS_PASSWORD` |
| skip 整文件不做 LAZYCAT E2E | 双构建：默认 smoke + LAZYCAT job |

---

## 12. 与其他文档分工

| 文档 | 作用 |
|------|------|
| **本文件** | AI **怎么测、测哪层、跑什么命令** |
| [TEST_CASES-v0.2.md](./TEST_CASES-v0.2.md) | **测什么**（TC-ID、期望、AUTO/MANUAL） |
| [IMPLEMENTATION_PLAN.md](./IMPLEMENTATION_PLAN.md) | **何时测**（里程碑验收） |
| `docs/mimo-integration/TEST_CASES.md` | MiMo 一阶段 AI 栈 |
| `.cursor/skills/lazycat-porting/publish-checklist.md` | 提审人工清单 |

---

## 13. AI 完成定义（DoD）

完成任一 M1～M3 代码任务时，AI 必须：

1. 在 [TEST_CASES-v0.2.md](./TEST_CASES-v0.2.md) 找到或新增 TC-ID  
2. 在对应金字塔层添加/更新测试  
3. 运行 §0.1 流水线并报告结果  
4. 若无法 L5，明确标注「需真机」及 TC-ID  

完成 M0 文档任务仅更新本文件与 TEST_CASES 映射，无需 L4/L5。
