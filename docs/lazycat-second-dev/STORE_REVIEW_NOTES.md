# 应用商店提审说明草案（WorldCupVoice）

| 字段 | 值 |
|------|-----|
| 版本 | v0.2 草案 |
| 日期 | 2026-06-30 |
| 用途 | `lzc-cli appstore publish` 审核备注 / 开发者中心说明 |
| 关联 | `.cursor/skills/lazycat-porting/publish-checklist.md` |

---

## 1. 免密登录说明（审核硬性）

### 1.1 用户感知

用户从**懒猫微服启动器**打开「世界杯 AI 解说」后，**无需再次输入账号或进门密码**，直接进入 AI 解说直播间。微服平台已在入口完成用户身份鉴权，本应用**不建立独立账号体系**，也**不要求**用户记忆开发者调试密码。

### 1.2 技术实现（供审核工程师参考）

本应用采用**双重配置**，确保不会在应用内二次索要密码：

| 手段 | 说明 |
|------|------|
| **应用构建配置（主）** | LPK 构建时将 `NEXT_PUBLIC_LAZYCAT_DEPLOYED=true`、`NEXT_PUBLIC_REQUIRE_ACCESS_PASSWORD=false` 写入前端镜像，首页不渲染 Access Code 对话框 |
| **运行时环境（辅）** | 容器环境变量 `LAZYCAT_DEPLOYED=true`，服务端 API 同步关闭私有预览门禁 |
| **浏览器 inject（辅）** | manifest 声明 `builtin://simple-inject-password`（空用户名/密码），用于弱感知进门；**不能替代**上述应用内逻辑，与构建配置组合使用 |

### 1.3 与本地开发版的区别

开发者本地 Docker 调试版可配置 `ACCESS_PASSWORD` 进门密码，**该配置不会出现在应用商店 LPK 中**，也不写入 Git 仓库。

### 1.4 审核对照 checklist

- [x] 微服内打开无独立密码框
- [x] inject 已声明（`passwordless-entry`）
- [x] 提审说明本文 §1
- [ ] 真机截图：启动器 → 首页（无 Access Code modal）

---

## 2. 网盘权限说明

### 2.1 所需权限

| 权限 | 级别 | 用途 |
|------|------|------|
| `net.internet` | required | 连接 Agora 实时音视频、小米 MiMo AI 接口 |
| `document.read` | required | 读取用户在网盘中**主动选择**的比赛录像文件 |
| `media.read` | required | 读取视频（MP4/WebM/MOV）媒体内容 |
| `document.write` | **optional，本期未启用** | 预留：未来版本或将解说字幕保存回网盘 |

### 2.2 数据访问范围

- 应用**不会**扫描或遍历用户整个网盘目录。
- 仅当用户点击「从网盘选择录像」并在懒猫文件选择器中指明文件后，才读取该文件到浏览器内存用于直播推流。
- 读取路径经规范化，限定在 `/_lzc/files/home` 命名空间内。

### 2.3 导入链路简述

用户选片 → 浏览器内存加载 → 推流至 Agora 频道（UID 234567）→ AI 解说引擎订阅画面帧 → 生成中文解说与字幕。

**本期不支持**将解说稿或字幕导出/保存回网盘（见 §3）。

---

## 3. 导出功能说明（本期无）

**当前版本不包含网盘导出功能。**

- 用户界面无「保存到网盘」「导出解说稿」等入口。
- manifest 中文件选择 inject **未启用** save 相关 hook。
- `document.write` 权限列为 optional 且未激活，仅为后续版本预留。

若审核需要：可在后续版本通过独立用户故事增加「将实时生成的字幕文本保存为 `.txt` 至用户指定网盘路径」，届时将更新权限说明并重新提审。

---

## 4. AI 与第三方服务免责声明

1. **AI 解说内容**由部署时配置的视觉/语音模型（默认小米 MiMo）**实时生成**，可能存在延迟、口误或与画面不完全一致，仅供娱乐/演示，不构成专业体育评论。
2. **实时传输**：比赛画面经 Agora 实时音视频传输；视觉帧与文本请求发送至 MiMo（或用户配置的其他 Provider）。**应用不将用户录像持久化存储到 WorldCupVoice 自有服务器**。
3. **密钥**：MiMo API Key、Agora 证书由安装者在部署参数页填写，加密存储于微服本地，不进应用源码与 Git。
4. **用户责任**：用户应确保对所上传/选择的比赛录像拥有合法使用权。

---

## 5. 应用基本信息（提审表单参考）

| 项 | 中文 | 英文 |
|----|------|------|
| 名称 | 世界杯 AI 解说 | WorldCupVoice AI Commentator |
| 简介 | 实时 AI 足球解说。支持从懒猫网盘选择比赛录像，小米 MiMo 视觉与语音默认栈。 | Real-time AI football commentary with LazyCat Drive MP4 import and MiMo AI stack. |
| 分类 | 娱乐 / 工具 | Entertainment / Utilities |
| 协议 | MIT | MIT |

---

## 6. 测试账号与复现步骤（供审核）

1. 在微服部署参数中填写有效的 **MiMo API Key**、**Agora App ID**、**Agora App Certificate**（由审核环境或开发者提供测试 Key）。
2. 安装 LPK 后从启动器打开应用。
3. 确认**无** Access Code 弹窗，点击「进入直播间」。
4. 在直播间点击「从网盘选择录像」，从网盘选择一段 H.264 MP4 测试视频（建议 &lt; 100MB）。
5. 等待「录像已推流」提示后，点击 **Start AI**。
6. 约 10～30 秒内应出现中文字幕并听到 AI 解说音频。

**预期失败时的用户提示（中文）：**

- 视频格式不支持：「请选择 MP4 / WebM / MOV 格式的比赛录像」
- Agora 未配置：「Agora 凭证未配置，请在部署参数中填写」类提示（实现时统一文案）

---

## 7. publish-checklist 映射

| checklist 条目 | 本文章节 |
|----------------|----------|
| 免密登录已配置 | §1 |
| 网盘选片 inject | §2 |
| 权限声明 | §2.1 |
| 多语言 locales | §5 |
| 无硬编码密钥 | §1.3、§4.3 |
| WorldCupVoice TEST_CASES | TC-STORE-01～06 |

---

## 8. 禁止事项（开发纪律）

- 禁止在源码、日志、截图中硬编码或打印 MiMo Key、Agora Certificate、BACKEND_API_SECRET。
- 禁止将 fat 包（数百 MB embed 镜像）提交应用商店；提审使用瘦 LPK + registry 镜像。
