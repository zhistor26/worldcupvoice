## WorldCupVoice 工作区规则

> 约束先行。AI 助手或人类协作者在本仓库工作前，先读本文件。
> **文档分层**见 § 四；WorldCupVoice 专题目录见 `docs/lazycat-second-dev/`。

---

### 一、项目定位

- **WorldCupVoice**：体育直播 AI 实时解说（世界杯为 showcase，链路通用）。
- **双栈**：
  - 本地 / Docker：`Next.js` 前端 + `FastAPI` 后端（Agora RTC + MiMo/OpenAI 视觉/TTS）
  - 懒猫微服：LPK 打包部署，免密登录 + 网盘选片推流
- 协议：**MIT**。

---

### 二、技术栈

| 层 | 选型 |
|---|---|
| 前端 | Next.js App Router + TypeScript + Tailwind |
| 后端 | Python FastAPI（`server/`） |
| 实时媒体 | Agora RTC / Media Gateway |
| AI 默认栈 | 小米 MiMo（视觉）+ 可配置 TTS |
| 懒猫打包 | `package.yml` + `lzc-manifest.yml` + `lzc-build.yml` + `lzc-deploy-params.yml` |

---

### 三、目录约定

```
worldcupvoice/
├── app/                    # Next.js 路由与 API
├── components/             # 前端 UI（含 NetdiskVideoPicker）
├── content/lazycat-injects/  # 免密、网盘 inject 脚本
├── docs/
│   ├── lazycat/            # 懒猫通用手册（权威正文）
│   ├── mimo-integration/   # 一阶段 MiMo 本地栈
│   └── lazycat-second-dev/ # 二阶段 LPK / 网盘 / 提审（本项目）
├── server/                 # FastAPI AI 解说后端
├── .cursor/skills/         # 懒猫移植技能包（本仓库内嵌，优先读取）
├── lzc-*.yml, package.yml  # LPK 配置
└── scripts/                # 推流、验证、打包脚本
```

---

### 四、文档分层（人 vs AI）

| 读者 | 读什么 | 路径 |
|------|--------|------|
| **人**（通读、查命令） | 懒猫开发者手册 | `docs/lazycat/开发者手册.md` |
| **AI**（执行任务） | 移植流水线 | `.cursor/skills/lazycat-porting/SKILL.md` |
| **AI**（查章节） | 手册索引 → 按需 § | `porting-handbook.md` → `docs/lazycat/开发者手册.md` |
| **AI + 人**（本项目） | WorldCupVoice 专题 | `docs/lazycat-second-dev/` |

**禁止** AI 同时全文加载 SKILL、索引与整本手册。

### 五、懒猫微服移植（Agent 必读）

**技能索引**（路径均在 `.cursor/skills/`）：

| 技能 | 何时读 |
|---|---|
| `lazycat-porting` | 移植流水线：release → install → 提审 |
| `lazycat-lpk-builder` | manifest / build / package 字段规范 |
| `lazycat-developer-expert` | 总控：按任务路由到子 skill |
| `lazycat-lpk-netdisk` | 网盘 inject、MP4 选片 |
| `lazycat-auth-integration` | 免密登录 / OIDC / Header 身份 |
| `lazycat-dynamic-deploy` | deploy-params、manifest 模板渲染 |
| `lazycat-library` | 有 59 篇 index 时按需检索；否则回落 `docs/lazycat/开发者手册.md` |
| `lazycat-advanced-routing` | 多域名、ingress、复杂代理 |

**瘦 LPK**（提审必做，详见 `lazycat-porting/SKILL.md`）：

1. 微服构建镜像 → push `ttl.sh` → `lzc-cli appstore copy-image`
2. `lzc-manifest.yml` 引用 `registry.lazycat.cloud/...`（勿 `embed:*`）
3. `lzc-build.yml` 无 `images:` → `project release` 产出 ~1MB 瘦包

**提审清单**：`.cursor/skills/lazycat-porting/publish-checklist.md`

---

### 六、开发纪律

1. 改文档优先于改代码（`docs/` 与专题目录）。
2. 密钥、Agora/MiMo Key **不进** git；用 `lzc-deploy-params.yml` 或本地 `.env.local`。
3. 业务规则集中在 `server/app/` 与 `lib/`，不散落在组件里。
4. 不为了跑通而注释校验、绕过权限、`@ts-ignore` 整段。
5. **删除文件、改 CI、生产迁移、`git push --force`** 须先征得维护者确认。

---

### 七、验证命令

```bash
# 前端
pnpm install && pnpm dev

# 后端
cd server && pip install -r requirements.txt -r requirements-dev.txt
python -m uvicorn app.main:app --reload --host 127.0.0.1 --port 8000

# 单元 / E2E
pnpm test
./scripts/verify-ai-pipeline.sh
./scripts/test-lazycat-contract.sh

# 懒猫发布包（提审前必走）
lzc-cli project release
lzc-cli lpk info ./org.worldcupvoice.app-v*.lpk
lzc-cli lpk install ./org.worldcupvoice.app-v*.lpk
lzc-cli project info --release
```

---

### 八、给 AI 助手的说明

- 默认中文回应，代码/路由/字段用英文。
- 懒猫任务：**先** `lazycat-porting/SKILL.md`，**再** `porting-handbook.md` 索引打开手册 §，**勿**通读 `docs/lazycat/开发者手册.md` 全文。
- 需要 `<微服名>` 时执行 `lzc-cli box default`，勿反复询问用户。
- 结论先行；方案有问题直接指出。
