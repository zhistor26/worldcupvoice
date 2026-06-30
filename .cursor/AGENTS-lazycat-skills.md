# AGENTS.md — lazycat-skills 技能包维护约束（副本）

> 来源：lazycat-skills 仓库。WorldCupVoice 内嵌技能只读使用；若需改 skill 内容，应回源仓库同步。

## 技能结构

```
.cursor/skills/
├── <技能名>/
│   ├── SKILL.md          # 必须含 YAML 表头 name + description
│   └── references/       # 按需懒加载
```

## 敏感信息红线

- 禁止真实微服设备名、密码、API Key、Token
- 占位符：`your-box-name.heiyu.space`、`dev.<微服名>.heiyu.space`

## 移植时注意

- 不要在 `buildscript` 里调用 `lzc-cli project build`（死循环）
- `lazycat-lpk-builder/SKILL.md` 与 `lazycat-developer-expert/references/lpk-builder.md` 修改时需同步
- 提审前：镜像 push registry + 瘦 LPK，见 `lazycat-porting/publish-checklist.md`
