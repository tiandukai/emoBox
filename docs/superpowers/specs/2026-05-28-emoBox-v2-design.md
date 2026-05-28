# 肥纯专属情绪盒子 v2 — 设计文档

**日期**: 2026-05-28
**状态**: 已确认

---

## 一、产品概述

一个私密的情侣情绪树洞 Web 应用。两人各自用手机浏览器打开同一网址，通过密码切换肥纯/小胖身份。记录心情时刻、分享悄悄话、小胖给肥纯写纸团话语。

**设备**: iPhone Safari 移动端优先
**技术**: 纯前端 HTML+CSS+JS，Supabase 后端，CDN 引入 SDK

---

## 二、身份系统

### 规则

- 默认身份 = 肥纯
- 小胖通过密码切换身份（密码: `PARTNER_PASSWORD`，存在 config.js）
- 切回肥纯不需要密码
- 身份存在 sessionStorage，刷新页面重置为肥纯

### 头部 UI

```
[肥纯专属情绪盒子]    [当前是肥纯 🥰] [🔄 切换]
```

- 点 `🔄 切换`：
  - 肥纯 → 弹出密码框 → 输入正确切为小胖（头部变为 `[当前是小胖 💝]`）
  - 小胖 → 直接切回肥纯
- 「我们」Tab 输密码 → 同时解锁内容 + 切换身份

### 实现

- `getIdentity()` 从 sessionStorage 读取
- `setIdentity(id)` 写入并更新 UI
- 所有数据库操作传 `author` / `sender` 字段，值为当前 identity

---

## 三、5 个 Tab

### 📝 记录

**访问**: 双方各自

分段控件: `日记 | 备忘录`

| 功能 | 说明 |
|---|---|
| 日记 | 列表 + 编辑器，按日期，自动保存 |
| 备忘录 | 待办清单，支持勾选完成、删除、添加 |

**数据隔离**: 每人只看自己的 (author = 当前 identity)

---

### 🎁 纸团

**访问**: 双方各自
**核心**: 肥纯抽小胖写的治愈话语（单向礼物）

| 元素 | 说明 |
|---|---|
| 情绪 Tabs | 6 种情绪横滑切换 |
| 纸团球体 | 点击展开动画 |
| 结果展示 | 随机话语内容 + "再拆一个"按钮 |
| 空状态 | 某情绪话语用完显示"补货中" |

**逻辑**: 
- `getAvailableQuote(mood, drawnBy)` — drawnBy='feichun' 查 author='xiaopang' 的未使用话语
- 抽取后标记 used=true

---

### 📅 时间轴

**访问**: 双方共享

| 区域 | 说明 |
|---|---|
| 记录卡片 | 情绪选择器 + 文字输入 + 照片上传 + 记录按钮 |
| 时间轴列表 | 按月分组，展示双方心情记录 |
| 卡片内容 | 作者标签、情绪 emoji、文字、照片缩略图 |
| 加载更多 | 分页加载 |

**照片**: 点"📷"选照片，最多 4 张，记录时上传到 Supabase Storage，URL 存入 moods.images

**数据**: `getTimeline()` 查 type='mood'，不限 author，按月分组渲染

---

### 💌 悄悄话

**访问**: 双方共享

| 区域 | 说明 |
|---|---|
| 消息列表 | 气泡对话样式，左对齐=肥纯，右对齐=小胖，按日期分组 |
| 发送栏 | 情绪选择 + 文字输入 + 发送按钮 |

**技术**:
- `sendWhisper(sender, emotion, content)` INSERT
- `getWhispers(limit)` 取最近 50 条，倒序排列
- `subscribeToWhispers()` Supabase Realtime 订阅，新消息自动刷新

---

### 💞 我们

**访问**: 小胖专属（需密码）

| 区域 | 说明 |
|---|---|
| 密码门 | 输入密码解锁 |
| 纸团库存 | 按情绪 + 作者显示: 总条数 / 剩余条数，进度条 |
| 补充话语 | 选情绪 + 写内容 + 放入纸团 |

**逻辑**:
- 解锁后同时切换到小胖身份
- `addQuote(mood, content, 'xiaopang')` — 新话语给肥纯抽

---

## 四、数据库（Supabase）

### moods 表

| 列 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| created_at | timestamptz | |
| date | DATE NOT NULL | |
| mood | TEXT NULL | 情绪名 |
| note | TEXT | 文字内容 |
| type | TEXT | mood / diary / memo |
| author | TEXT | feichun / xiaopang |
| done | BOOLEAN | 备忘录完成标记 |
| images | JSONB | ["url1", "url2"] |

唯一索引: (date, type, author) WHERE type IN ('mood', 'diary')

### quotes 表

| 列 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| created_at | timestamptz | |
| mood | TEXT | 情绪名 |
| content | TEXT | 话语内容 |
| author | TEXT | 写的人 |
| used | BOOLEAN | 是否被抽走 |
| used_at | timestamptz | |

### whispers 表

| 列 | 类型 | 说明 |
|---|---|---|
| id | UUID PK | |
| created_at | timestamptz | |
| sender | TEXT | feichun / xiaopang |
| emotion | TEXT | 情绪名 |
| content | TEXT | 消息内容 |
| is_read | BOOLEAN | |

### Storage

- 桶: `photos`（公开访问）
- 路径: `{timestamp}_{random}.{ext}`

### Realtime

- moods: INSERT 事件订阅
- whispers: INSERT 事件订阅

---

## 五、文件结构

```
emoBox/
├── index.html          # 5 Tab 结构
├── css/style.css       # 完整样式
├── js/
│   ├── config.js       # Supabase 凭证 + 密码
│   ├── supabase.js     # 数据层 (SDK 封装)
│   └── app.js          # 主逻辑
└── supabase-schema.sql # 建表 SQL（参考）
```

---

## 六、UI 设计要点

- 暖杏到淡紫渐变背景
- 毛玻璃卡片 (backdrop-filter: blur)
- 大圆角 (16-28px)
- 5 按钮底部导航（悬浮毛玻璃底栏）
- 触摸反馈: active 缩放，无 hover
- 纸飞机动画：保存成功后飞过
- Toast 提示
- 照片灯箱
- iPhone 全面屏 safe-area 适配
