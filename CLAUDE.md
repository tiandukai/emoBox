# 给对方的情绪盒子 ❤️

## 项目概述

一个情侣私密空间 Web 应用，供女朋友在 iPhone Safari 上使用。支持情绪纸团、日记、备忘录、时间轴、悄悄话等功能，两人通过邀请码配对后数据互通。

**技术栈：** 原生 HTML/CSS/JS（无框架）+ Supabase 后端（Auth + PostgreSQL + Storage + Realtime）

**部署方式：** 前端通过 Supabase Storage 托管静态文件；后端即 Supabase 云服务

---

## 已实现功能（按底部导航 6 个 Tab）

### 1. 首页（🏠 Home）
- 未配对：显示"去配对"引导按钮
- 已配对：显示"我们在一起 X 天"天数卡片（动画计数），纪念日从 `couple_spaces.anniversary_date` 读取

### 2. 记录（📝 Record）
- **日记子面板：** 按日期列表 → 点击进入编辑器 → 文字 + 多照片上传，2 秒防抖自动保存到 `moods` 表（type=diary）
- **备忘录子面板：** 清单式待办，支持添加/勾选完成/删除，数据存 `moods` 表（type=memo）
- 两个子面板通过顶部 segment 切换

### 3. 纸团（🎁 Paper Balls）
- 6 种情绪分类（🥰幸福 😊开心 😴疲惫 😢伤心 😡生气 😰焦虑）
- 点击纸团 → 拆开动画 → 随机展示该情绪的未使用话语
- 抽过的纸团标记 `quotes.used=true`，不再出现
- 库存耗尽时显示"绝版啦"提示
- 纸团数据来自 `quotes` 表，种子数据 30+ 条（作者 xiaopang 写给 feichun）

### 4. 时间轴（📅 Timeline）
- 共同回忆记录：日期 + 城市 + 地点 + 文字 + 单张照片
- 按月分组展示，支持排序切换（最早在前 / 最新在前）
- 乐观更新：提交后立即插入 DOM 占位卡片，后台异步上传图片+保存数据库
- 图片上传前客户端压缩（max 1200px，JPEG 0.75 质量）
- 30 秒轮询 + Supabase Realtime 订阅检测新事件
- 数据存 `timeline_events` 表，分页加载（每页 20 条）
- 支持删除回忆

### 5. 悄悄话（💌 Whispers）
- 情侣实时聊天：选择情绪 + 输入文字 → 发送
- 聊天气泡样式（发送方/接收方左右分布，带情绪 emoji 和时间）
- 按日期分组显示
- Supabase Realtime 订阅实时推送新消息
- 数据存 `whispers` 表

### 6. 我们（💞 Partner）
- **未配对状态：** 显示我的邀请码 → 搜索对方邀请码 → 发送恋爱请求 → 查看已发送/待处理请求
- 实时接收恋爱请求通知（Realtime 订阅）
- 同意请求后自动创建 `couple_spaces` 记录，双方 `profiles.space_id` 关联
- **已配对状态：** 设置纪念日 + 补充纸团话语（选择情绪 + 填写内容 → 放入纸团）

---

## 用户系统

- Supabase Auth 邮箱注册/登录
- 全屏登录/注册页面（auth-page），切换模式无需跳转
- 自动创建 `profiles` 记录 + 生成 8 位邀请码
- 头部显示当前用户昵称，点击可查看邀请码
- 支持退出登录

---

## 数据库核心表（Supabase PostgreSQL）

| 表名 | 用途 | 关键字段 |
|------|------|---------|
| `profiles` | 用户资料 | id(UUID,PK), nickname, space_id, invite_code |
| `couple_spaces` | 情侣空间 | id, owner_id, partner_id, invite_code, anniversary_date |
| `relationship_requests` | 恋爱请求 | from_user, to_user, status(pending/accepted/rejected) |
| `moods` | 心情/日记/备忘录 | date, type(mood/diary/memo), author, note, images, mood, done |
| `quotes` | 纸团话语 | mood, content, author, used, used_at |
| `whispers` | 悄悄话 | sender, emotion, content, is_read |
| `timeline_events` | 时间轴回忆 | date, city, place, note, image, author |

**注意：** 早期设计用 `moods` 表统一存心情+日记+备忘录，type 字段区分。RLS 策略当前全开放（`USING (true)`），依赖 anon key 作为软保护。

---

## 文件结构

```
emoBox/
├── index.html          # 单页应用主文件（所有页面都在这里）
├── css/style.css       # 全局样式（手帐拼贴纸品质感）
├── js/
│   ├── config.js       # Supabase URL/Key 配置
│   ├── supabase.js     # 数据层（db 对象封装所有 Supabase 操作）
│   └── app.js          # UI 层（Tab 切换、事件绑定、渲染逻辑）
├── supabase/
│   ├── config.toml     # Supabase CLI 配置
│   └── migrations/     # 数据库迁移文件（按时间顺序）
├── supabase-schema.sql # 手动建表 SQL（早期版本，migrations 是最终版本）
└── package.json        # 仅含 Supabase CLI 依赖
```

---

## 关键设计约束

- 适配 iPhone Safari，触摸事件为主，避免 `:hover`
- CSS 变量管理主题色（`--color-*`），方便换色
- 最大宽度 480px，居中显示
- 纸飞机动画：保存成功时播放（✈️ + "已送达"文字）
- 网络状态：顶部柔和提示条，在线自动隐藏
- 照片灯箱：点击图片全屏查看

---

## 待优化/未完成

1. **照片上传性能：** 时间轴保存时图片上传慢，计划加 `compressImage` + 乐观更新（已部分实现压缩，乐观更新已做）
2. **身份切换：** 头部按钮"登录"可切换双方视角，但当前是单账号登录
3. **消息通知：** 新悄悄话/新恋爱请求只有应用内 Toast，无推送通知
4. **错误处理：** 部分 catch 块只是 `console.error`，缺少用户友好提示
5. **日志清理：** `app.js` 和 `supabase.js` 有大量 `console.log` 调试日志

---

## 开发命令

```bash
# 启动 Supabase 本地开发（如需要）
npx supabase start

# 部署前端到 Supabase Storage
# 手动上传 index.html, css/, js/ 到 storage bucket
```

## 环境变量/配置

`js/config.js` 中包含：
- `SUPABASE_URL` = `https://qogpfoplmrkfcsqlflus.supabase.co`
- `SUPABASE_KEY` = publishable key（公开可读）
- `PARTNER_PASSWORD` = 旧版密码（已废弃，现在用 Supabase Auth）
