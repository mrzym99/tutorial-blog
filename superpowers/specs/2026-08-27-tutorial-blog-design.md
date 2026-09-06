# 教程静态博客 — 设计文档（Spec）

日期：2026-08-27（初版）
更新：2026-09-06（随实现同步：合集体系、回收站、COS 图床、合集/文章排序与 FLIP 动画）
状态：已确认（待用户最终审阅）

## 1. 目标

搭建一个以教程文章为主的静态博客系统，满足：

1. **部署简单**：构建产物为纯静态文件，推送到远端（Cloudflare Pages）即完成部署，无需服务器。
2. **本地写作**：本地 dev 运行时有独立的写作后台（`/admin`），支持 Markdown 编辑、实时预览、文章/合集管理、图片上传，写好的内容以归一化 Markdown 文件形式保存在项目文件夹内。
3. **图床上传**：编辑器内粘贴/上传图片自动上传到腾讯云 COS 并插入链接，密钥只存在本地。
4. **速度快**：dev 启动快、热更新快；线上预渲染 HTML + 客户端路由，切页不刷新。
5. **读者侧功能**：合集（教程系列）、标签分类、归档、RSS、sitemap、评论区（Giscus）。

## 2. 架构总览

一个 VitePress 应用，两种运行形态：

- **本地 dev**（`vitepress dev`）：静态博客 + `/admin` 写作后台。写作后台通过一个自定义 Vite 插件在 dev server 上注册中间件（`configureServer` 钩子），提供文章/合集文件读写和图片上传代理的本地 API。COS 密钥只在 Node 侧从 `.env.local` 读取，**不进浏览器包、不进静态产物**。
- **线上 build**（`vitepress build`）：纯静态文件输出到 `docs/.vitepress/dist`。`/admin` 页面仍打包，但只渲染一句"写作后台仅在本地开发模式可用"；`/api/admin/*` 在静态托管上自然 404。

关键边界：

- 所有可测逻辑（slug 校验、frontmatter 解析、文件存储、上传、标签/合集聚合）都是**纯函数/独立模块**，与 Vue 组件和 HTTP 层分离，用 vitest 单测。
- 浏览器侧代码（admin 页面）从不接触密钥；上传请求发给本地 dev API，由 Node 侧转发 COS。
- 线上最终产物一律由 VitePress 自己的 Markdown 渲染器渲染，不引入第二套**发布级**渲染器。

## 3. 技术栈

| 项 | 选型 |
|---|---|
| 站点框架 | VitePress 1.x |
| 框架 | Vue 3 + TypeScript |
| UI 组件 | naive-ui（后台表格/表单/弹窗/轻提示） |
| 编辑器 | md-editor-v3（Markdown 编辑 + 预览，后台编辑态用） |
| 测试 | vitest |
| 包管理 | pnpm |
| 图床 | 腾讯云 COS（`cos-nodejs-sdk-v5`；SM.MS 已失效，被取代） |
| 部署 | Cloudflare Pages（Git 连接自动构建；也支持 wrangler 手动推产物） |
| 评论 | Giscus（GitHub Discussions 驱动，纯静态，无密钥） |
| 基线 | Node ≥ 20 |

## 4. 目录结构

```
tutorial-blog/
├─ .env.local                  # COS_* 密钥（.gitignore，不提交）
├─ package.json                # scripts: dev / build / preview / test / typecheck
├─ superpowers/                # 设计文档（不进站点源目录，不会被当成页面）
│  └─ specs/2026-08-27-tutorial-blog-design.md
└─ docs/
   ├─ .vitepress/
   │  ├─ config.mts           # VitePress 配置 + dev 插件挂载 + 侧栏生成 + RSS/sitemap buildEnd 钩子
   │  ├─ admin/               # 写作后台（仅 dev 有完整功能）
   │  │  ├─ AdminPage.vue         # DEV 检测；生产显示提示语
   │  │  ├─ AdminApp.vue          # 主界面：合集/文章/回收站三个 tab + 全部 API 调用
   │  │  ├─ AdminEditorPage.vue   # 全屏编辑器页（新标签页打开）
   │  │  ├─ AdminEditorView.vue   # 编辑器 + frontmatter 表单（标题/标签/摘要/封面/合集/草稿/置顶）
   │  │  ├─ PostList.vue          # 文章列表（批量删除/恢复）
   │  │  ├─ CollectionList.vue    # 合集列表（新建/编辑/删除 + 序号排序动画）
   │  │  ├─ CollectionDetail.vue  # 合集内文章列表（章节序排序动画）
   │  │  ├─ TrashList.vue         # 回收站（恢复/彻底删除/清空）
   │  │  ├─ PostEditor.vue        # md-editor-v3 封装（粘贴/选择上传图片）
   │  │  ├─ flip.ts               # FLIP 行交换动画（纯 DOM，无依赖）
   │  │  └─ draft.ts              # sessionStorage 草稿传递（列表→编辑器新标签页）
   │  ├─ server/              # dev 中间件逻辑（Node 侧，仅 dev 加载）
   │  │  ├─ plugin.ts             # Vite 插件：configureServer 注册路由
   │  │  ├─ routes.ts             # HTTP 路由分发（URL 解析 → handler，含校验与错误码）
   │  │  ├─ posts-store.ts        # posts/ 文件读写（含 trash、原子写、order 分配）
   │  │  ├─ collections-store.ts  # collections/ 文件读写（同构 posts-store）
   │  │  └─ upload-cos.ts         # 腾讯云 COS 上传（key：uploads/YYYY/MM/<uuid>.<ext>）
   │  ├─ lib/                 # 纯函数（全部有单测）
   │  │  ├─ slug.ts               # slug 校验（防路径穿越）+ UUID 生成
   │  │  ├─ frontmatter.ts        # YAML frontmatter 解析 / 序列化
   │  │  ├─ tags.ts               # 文章数据 → 标签聚合；全站统一排序 comparePosts
   │  │  └─ collections.ts        # 合集聚合：合集内文章序 compareCollectionPosts、合集展示序 compareCollections
   │  ├─ data/                # 构建期数据加载器
   │  │  ├─ posts.data.ts         # createContentLoader：文章列表
   │  │  ├─ collections.data.ts   # createContentLoader：合集元数据
   │  │  ├─ rss.ts                # RSS XML 生成（纯函数）
   │  │  └─ sitemap.ts            # sitemap XML 生成（纯函数）
   │  └─ theme/components/    # 读者侧组件（CollectionIndex / CollectionPostList / TagIndex / ArchiveList / HomePostList / GiscusComment / Pagination …）
   ├─ collections/            # 合集：<uuid>.md + [collection].md 动态路由
   ├─ posts/                  # 文章：<uuid>.md，删除进 .trash/
   ├─ tags/ archives/ index.md about.md admin.md admin-edit.md 404.md
```

## 5. 内容模型

### 文章：`docs/posts/<slug>.md`

slug 由系统生成 **UUID v4**（用户不参与定义），仅含小写十六进制与 `-`，天然满足 slug 校验、防路径穿越。

```yaml
---
title: 文章标题           # 必填
date: 2026-09-05         # 必填，YYYY-MM-DD
tags: [Claude Code]      # 可选，字符串数组
excerpt: 摘要一句话       # 可选，列表/RSS 用
cover: https://…/x.png   # 可选，封面图（首页卡片展示）
draft: false             # 草稿：true 时公开侧（列表/RSS/sitemap）不展示
pinned: false            # 置顶：公开列表排在未置顶之前
collection: <uuid>       # 必填，所属合集（「先有合集才有文章」）
order: 1                 # 合集内章节序，服务端保存时自动分配（追加到末尾）
---
正文 Markdown……
```

- 文章统一排序 `comparePosts`：置顶优先 → date 倒序 → slug 稳定序（读者侧全站一致）。
- 合集内排序 `compareCollectionPosts`：order 升序 → date 倒序兜底 → slug 稳定序。
- 删除进回收站 `docs/posts/.trash/<slug>-<日期>.md`，可恢复、可彻底删除。

### 合集：`docs/collections/<slug>.md`

```yaml
---
title: 合集标题           # 必填
description: 简介         # 可选，卡片与详情页头部
cover: https://…/x.png   # 可选，合集封面
draft: false             # 草稿合集不进首页与动态路由
createdAt: 2026-09-04    # 创建日期（无 order 时展示顺序兜底）
order: 2                 # 合集展示序号（排序接口整体重写；未设置按 createdAt 兜底）
---
```

- 合集展示排序 `compareCollections`：**order 升序（未设置排最后）→ createdAt 升序兜底 → slug 稳定序**。旧合集无需迁移数据，拖一次排序即写入 order。
- 合集编辑表单不含 createdAt/order，保存时服务端保留原值，编辑元数据不丢排序。
- 非空合集拒绝删除（先移出或删除文章）。
- 侧栏按合集分组：组头链接合集页，组内按章节序编号（01. 02. …），页脚「上一篇/下一篇」在合集内翻页。

## 6. 本地写作 API（仅 dev）

Vite 插件在 `configureServer(server)` 中注册，前缀 `/api/admin/`。

| 方法 | 路径 | 作用 |
|---|---|---|
| GET | `/api/admin/posts` | 文章列表（含 draft/pinned/collection/order） |
| GET/PUT/DELETE | `/api/admin/posts/:slug` | 读单篇 / 新建保存（自动分配 order） / 移入回收站 |
| GET | `/api/admin/trash` | 回收站列表 |
| POST | `/api/admin/trash/:slug/restore` | 从回收站恢复 |
| DELETE | `/api/admin/trash/:slug` | 彻底删除 |
| GET/POST | `/api/admin/collections` | 合集列表 / 新建（slug 系统生成，createdAt 缺省今天） |
| GET/PUT/DELETE | `/api/admin/collections/:slug` | 读 / 保存元数据（createdAt/order 未携带时保留原值） / 删除（非空 409） |
| PUT | `/api/admin/collections/:slug/order` | 合集内文章排序：body `{slugs}`，按列表重写 order 为 1、2、3… |
| PUT | `/api/admin/collections/order` | **合集列表排序**：body `{slugs}`（全部合集完整顺序），按列表重写每个合集 order 为 1、2、3…；先整体校验后落盘，slug 重复 400 |
| POST | `/api/admin/upload` | 图片上传（multipart `file`）→ `{url}`；COS 未配置 503，上传失败 502 |

错误码约定：slug 非法/frontmatter 校验失败/归属不存在 `400`，资源不存在 `404`，非空合集删除 `409`，方法不匹配 `405`。写 frontmatter 相关接口成功后触发 `onSidebarChange`（touch 配置文件 → VitePress 重启重建侧栏）。

密钥管理：COS SecretId/SecretKey/Bucket/Region/Domain 只从 `.env.local` 读取（Node 侧）；`.env.local` 进 `.gitignore`；任何响应不回传密钥。

## 7. 写作后台（/admin）

`docs/admin.md` 挂载 `<AdminPage />`；`admin-edit.md` 挂载全屏编辑器页。

- **AdminPage.vue**：检测 `import.meta.env.DEV`，生产构建渲染提示卡片。
- **AdminApp.vue**：顶栏 + 三个 tab（「先有合集才有文章」，默认落在合集 tab）：
  - **合集 tab**：`CollectionList` 表格（序号/封面/标题/简介/文章数/创建日期/操作）。新建/编辑走弹窗表单（标题/简介/封面上传/草稿开关）。↑↓ 上移下移排序 → 乐观更新 + FLIP 动画 + `PUT /api/admin/collections/order`。
  - **合集详情**：`CollectionDetail` 合集内文章列表，↑↓ 调整章节序（同样乐观更新 + FLIP 动画）→ `PUT /api/admin/collections/:slug/order`。
  - **文章 tab**：`PostList` 全部文章（跨合集），支持批量删除。
  - **回收站 tab**：`TrashList` 恢复/彻底删除/批量/清空。
- **编辑器**（`AdminEditorPage` + `AdminEditorView` + `PostEditor`）：列表点「编辑」把草稿写 sessionStorage 后 `window.open('/admin-edit')` 新标签页打开；md-editor-v3 编辑 + 预览；frontmatter 表单含标题/标签/摘要/封面/合集/草稿/置顶，展示「第 N 篇」序号提示；图片粘贴/选择后经 `/api/admin/upload` 上传插入。
- **排序动画**：`flip.ts` 在本地交换数据前后测量行位置施加反向位移过渡回 0（220ms ease）；行经 `row-props` 注入 `data-slug` 定位；尊重系统 prefers-reduced-motion。保存失败由父组件重拉列表回滚。

## 8. 读者侧功能

- **首页**：文章卡片（置顶/封面/标签/摘要）+ 合集网格（`CollectionIndex`，按合集展示序）。
- **合集页**：`collections/[collection].md` 动态路由，详情页按章节序列出文章（`CollectionPostList`）。
- **文章页**：VitePress 默认布局 + 合集侧栏导航（`CollectionNav`）+ `doc-after` 挂 Giscus 评论。
- **标签**：`tags/index.md` 总览 + `[tag].md` 动态路由。
- **归档**：`archives.md` 按年份分组（`ArchiveList`）。
- **RSS**：`buildEnd` 钩子生成 `rss.xml`（`data/rss.ts` 纯函数）。
- **sitemap**：同钩子生成 `sitemap.xml`（`data/sitemap.ts`），含静态页/合集/标签/文章；草稿与草稿合集剔除，合集顺序与前台一致。
- **搜索**：VitePress localSearch。

## 9. 部署（Cloudflare Pages）

- 构建命令：`pnpm build`（= `vitepress build docs`）；输出目录 `docs/.vitepress/dist`；Node 20；base `/`。
- 方式一（推荐）：Cloudflare Pages 连接 Git 仓库自动构建；方式二：`npx wrangler pages deploy docs/.vitepress/dist`。
- 部署后验证：首页/合集/文章/标签/归档可访问；`/admin` 显示"仅本地可用"；`/api/admin/*` 返回 404；`rss.xml`、`sitemap.xml` 可访问。

## 10. 测试策略（vitest）

| 模块 | 测试要点 |
|---|---|
| `lib/slug.ts` | 合法 slug 通过；`../x`、`a/b`、绝对路径等全部拒绝；UUID 生成合法 |
| `lib/frontmatter.ts` | 解析/序列化往返一致；无 frontmatter；中文字段 |
| `lib/tags.ts` | 标签聚合；comparePosts 排序（置顶/日期/稳定性） |
| `lib/collections.ts` | compareCollectionPosts 章节序；compareCollections（order 优先、createdAt 兜底、slug 稳定）；aggregateCollections（计数/剔除草稿/排序） |
| `server/posts-store.ts` | 临时目录下的 CRUD、order 分配、trash、原子写、防路径穿越 |
| `server/collections-store.ts` | CRUD、list 按 order 升序（createdAt 兜底）、save 保留 createdAt/order、原子写、防路径穿越 |
| `server/routes.ts` | 路由解析（含 `collections/order` 与 `collections/:slug` 不混淆）+ 集成测试：order 分配、合集/文章排序接口（重写 order、非法输入 400、重复 slug 400、元数据不被排序破坏） |
| `data/sitemap.ts` | URL 集合与草稿过滤 |
| `server/upload-cos.ts` | mock COS 客户端：成功/未配置/失败错误归一化 |

Vue 组件不做重型组件测试（交互手动验证）；VitePress config 不做集成测试。

## 11. 全局约束

- Node ≥ 20；pnpm；VitePress 1.x；Vue 3；TypeScript；vitest。
- 任何密钥（COS_*）不得出现在浏览器代码、构建产物、Git 提交中；`.env.local` 必须在 `.gitignore`。
- 所有写盘路径必须经过 slug 校验（`lib/slug.ts`，安全关键）。
- 管理功能只能在 dev 形态可用；build 产物中 admin 页只显示提示。
- 不引入第二套**发布级** Markdown 渲染器：线上渲染一律以 VitePress 为准；md-editor-v3 仅做编辑态预览。
- 排序规则全站一致：文章 `comparePosts`、合集内文章 `compareCollectionPosts`、合集列表 `compareCollections`（lib 层纯函数，读者侧/后台/构建期共用）。
- 部署目标 Cloudflare Pages，base 为 `/`。

## 12. 明确不做（YAGNI）

- 不做用户系统/登录（写作后台只在本地 dev，无多用户）。
- 不做在线后台的线上版本（admin 不上线）。
- 不做第二种图床（只接腾讯云 COS；上传模块边界清晰，将来可加）。
- 不做评论管理后台、访问统计。
- 不自研编辑器核心：md-editor-v3 封装为可替换适配层。
- 不做拖拽排序的跨行拖动/多选排序（↑↓ 步进已覆盖当前合集规模）。
