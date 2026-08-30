# 教程静态博客 — 设计文档（Spec）

日期：2026-08-27
状态：已确认（待用户最终审阅）

## 1. 目标

搭建一个以教程文章为主的静态博客系统，满足：

1. **部署简单**：构建产物为纯静态文件，推送到远端（Cloudflare Pages）即完成部署，无需服务器。
2. **本地写作**：本地 dev 运行时有独立的写作后台（`/admin`），支持富文本（所见即所得）编辑、实时预览、文章管理、图片上传，写好的文章以归一化 Markdown 文件形式保存在项目文件夹内。
3. **图床上传**：编辑器内粘贴/拖拽图片自动上传到 SM.MS 图床并插入链接，Token 只存在本地。
4. **速度快**：dev 启动快、热更新快；线上预渲染 HTML + 客户端路由，切页不刷新。
5. **读者侧功能**：全文搜索、标签分类、RSS 订阅、评论区（Giscus）。

## 2. 架构总览

一个 VitePress 应用，两种运行形态：

- **本地 dev**（`vitepress dev`）：静态博客 + `/admin` 写作后台。写作后台通过一个自定义 Vite 插件在 dev server 上注册中间件（`configureServer` 钩子），提供文章文件读写和图片上传代理的本地 API。SM.MS Token 只在 Node 侧从 `.env.local` 读取，**不进浏览器包、不进静态产物**。
- **线上 build**（`vitepress build`）：纯静态文件输出到 `docs/.vitepress/dist`。`/admin` 页面仍打包，但只渲染一句"写作后台仅在本地开发模式可用"；`/api/admin/*` 在静态托管上自然 404。

关键边界：

- 所有可测逻辑（slug 校验、frontmatter 解析、文件存储、上传代理、标签聚合）都是**纯函数/独立模块**，与 Vue 组件和 HTTP 层分离，用 vitest 单测。
- 浏览器侧代码（admin 页面）从不接触 Token；上传请求发给本地 dev API，由 Node 侧转发 SM.MS。
- 线上最终产物一律由 VitePress 自己的 Markdown 渲染器渲染，不引入第二套**发布级**渲染器。（`createMarkdownRenderer` 是 Node-only API，无法在浏览器 admin 内使用；写作后台的实时预览由 tiptap 所见即所得承担，存储的内容是 Markdown，线上渲染不受其影响。）

## 3. 技术栈

| 项 | 选型 |
|---|---|
| 站点框架 | VitePress 1.x（最新稳定版） |
| 框架 | Vue 3 + TypeScript |
| 测试 | vitest（最新稳定版） |
| 富文本编辑器 | tiptap（ProseMirror 内核；官方 `@tiptap/vue-3` Vue3 绑定 + `@tiptap/markdown` 序列化，MIT 开源；可替换为其它开源方案） |
| 包管理 | pnpm |
| 图床 | SM.MS（`https://sm.ms/api/v2/upload`） |
| 部署 | Cloudflare Pages（Git 连接自动构建；也支持 wrangler 手动推产物） |
| 评论 | Giscus（GitHub Discussions 驱动，纯静态，无密钥） |
| 基线 | Node ≥ 20 |

## 4. 目录结构

```
tutorial-blog/
├─ .env.local                  # SMMS_TOKEN=xxx（.gitignore，不提交）
├─ .env.example                # SMMS_TOKEN= 模板（提交，供参考）
├─ .gitignore
├─ package.json                # scripts: dev / build / preview / test
├─ tsconfig.json
├─ vitest.config.ts
├─ superpowers/                # 设计文档与实施计划（不进入 docs/ 源目录，不会被当成站点页面）
│  ├─ specs/
│  │  └─ 2026-08-27-tutorial-blog-design.md
│  └─ plans/
└─ docs/
   ├─ .vitepress/
   │  ├─ config.mts            # VitePress 配置 + dev 插件挂载 + RSS buildEnd 钩子
   │  ├─ theme/
   │  │  ├─ index.ts           # 主题入口，注册布局插槽（doc-after 挂评论组件）
   │  │  └─ components/
   │  │     ├─ HomePostList.vue    # 首页文章列表
   │  │     └─ GiscusComment.vue   # 文章底部评论（Giscus）
   │  ├─ admin/                # 写作后台（仅 dev 有完整功能）
   │  │  ├─ AdminPage.vue          # DEV 检测；生产显示提示语
   │  │  ├─ AdminApp.vue           # 三栏布局主界面
   │  │  ├─ PostListPanel.vue      # 左栏：文章列表 + 新建按钮
   │  │  ├─ FrontmatterForm.vue    # 顶部：标题/slug/日期/标签/摘要表单
   │  │  └─ PostEditor.vue         # 中：所见即所得编辑器（tiptap）；右：与线上一致的预览；粘贴/拖拽上传
   │  ├─ server/               # dev 中间件逻辑（Node 侧，仅 dev 加载）
   │  │  ├─ plugin.ts              # Vite 插件：configureServer 注册路由
   │  │  ├─ routes.ts              # HTTP 路由分发（URL 解析 → handler）
   │  │  ├─ posts-store.ts         # 扫描/读写/删除 posts/ 文件（含 trash、原子写）
   │  │  └─ upload-smms.ts         # SM.MS 上传代理（fetch 转发 + 错误归一化）
   │  ├─ lib/                  # 纯函数（全部有单测）
   │  │  ├─ slug.ts                # slug 生成 + 合法性校验（防路径穿越）
   │  │  ├─ frontmatter.ts         # YAML frontmatter 解析 / 序列化
   │  │  └─ tags.ts                # 文章数据 → 标签聚合（供标签页和测试）
   │  └─ data/
   │     └─ posts.data.ts          # createContentLoader：构建期文章列表/标签数据
   ├─ posts/
   │  ├─ hello-world.md            # 示例文章（随项目创建）
   │  └─ .trash/                   # 删除文章的回收目录（posts-store 自动创建）
   ├─ tags/
   │  ├─ index.md                   # 标签总览页
   │  └─ [tag].md                   # 动态路由：单个标签的文章列表
   ├─ index.md                      # 首页（layout: home + 文章列表组件）
   ├─ about.md                      # 关于页
   └─ admin.md                      # 站点页面，仅一行：<AdminPage />
```

## 5. 内容模型

每篇文章是一个 Markdown 文件：`docs/posts/<slug>.md`。

Frontmatter 约定：

```yaml
---
title: 文章标题           # 必填，字符串
date: 2026-08-27         # 必填，YYYY-MM-DD；新建文章表单默认填当天日期
tags: [前端, VitePress]  # 可选，字符串数组
excerpt: 摘要一句话       # 可选，用于文章列表和 RSS
---
正文 Markdown……
```

约束与规则：

- **slug 规则**：`^[a-z0-9一-龥_-]+$`（小写字母、数字、中文、连字符 `-`、下划线 `_`）。禁止出现 `/ \ . : * ? " < > |` 和空格、`..` 段。所有写盘路径必须先过校验，防止路径穿越（如 `../../x`）。此函数为安全关键，有重点单测。
- 标题转 slug：英文转小写、空白转 `-`、非法字符剔除；中文字符保留；连续 `-` 合并。表单自动生成，用户可手改。
- 文章列表按 `date` 倒序（同日按 slug 排序，保证顺序稳定）。
- 删除文章不直接删文件：移动到 `docs/posts/.trash/<slug>-<删除日期>.md`。
- 构建期数据加载（`posts.data.ts` 的 `createContentLoader`）扫描 glob 为 `posts/*.md`（**非递归**），确保 `.trash/` 中的文件不会被当成文章。
- 保存采用**原子写**：先写 `posts/.<slug>.md.tmp` 临时文件，再 `rename` 覆盖目标文件，避免写一半被 dev server 文件监听读到残文件。

## 6. 本地写作 API（仅 dev）

Vite 插件在 `configureServer(server)` 中注册，前缀 `/api/admin/`。仅 dev server 有；build 产物不含。

| 方法 | 路径 | 作用 | 响应 |
|---|---|---|---|
| GET | `/api/admin/posts` | 文章列表 | `200` → `[{slug, title, date, tags, excerpt}]`，按 date 倒序 |
| GET | `/api/admin/posts/:slug` | 读单篇 | `200` → `{slug, frontmatter: {title,date,tags,excerpt}, body, raw}`；不存在 `404` |
| PUT | `/api/admin/posts/:slug` | 新建/保存 | body：`{frontmatter, body}`；成功 `200` → `{slug, path}`；slug 非法 `400`；frontmatter 缺 title/date `400` |
| DELETE | `/api/admin/posts/:slug` | 删除（移入 trash） | 成功 `204`；不存在 `404` |
| POST | `/api/admin/upload` | 图片上传 | multipart/form-data，字段 `file`；成功 `200` → `{url}`；Token 未配置 `503` + `{error: "SMMS_TOKEN 未配置，请在项目根 .env.local 中设置"}`；SM.MS 失败 `502` + `{error: "<sm.ms 返回的错误信息>"}` |

Token 管理：

- dev server 启动时用 Vite 的 `loadEnv` 读取项目根 `.env.local` 中的 `SMMS_TOKEN`。
- `.env.local` 写入 `.gitignore`；仓库只提交 `.env.example`（内容为 `SMMS_TOKEN=`）。
- Token 只在 Node 中间件内使用，作为 `Authorization: <token>` 头转发给 `https://sm.ms/api/v2/upload`；任何响应都不回传 Token。

## 7. 写作后台（/admin）

`docs/admin.md` 内容仅为挂载 `<AdminPage />`。

- **AdminPage.vue**：检测 `import.meta.env.DEV`。生产构建下渲染提示卡片："写作后台仅在本地开发模式可用。运行 `pnpm dev` 后访问 /admin。"dev 下挂载 AdminApp。
- **AdminApp.vue**：三栏布局。
  - 左栏 PostListPanel：调用 `GET /api/admin/posts` 展示文章列表（标题 + 日期），顶部"新建文章"按钮；点击打开文章；当前选中高亮。
  - 顶部 FrontmatterForm：标题、slug（标题输入时自动生成，可编辑）、日期（默认今天）、标签（逗号分隔输入）、摘要。
  - 中栏 PostEditor：集成 tiptap 富文本编辑器（所见即所得）。编辑内容实时经 `editor.getMarkdown()`（`@tiptap/markdown`）导出为 Markdown；Ctrl+S 触发保存（PUT）；保存成功/失败有轻提示。tiptap 本身即所见即所得，**充当实时预览**：不设独立的右侧预览盘，避免在浏览器 admin 引入第二套 Markdown 渲染器。
- **图片上传**：PostEditor 监听编辑器 `paste` 事件（`clipboardData.items` 取图片）和拖拽 `drop` 事件（`dataTransfer.files`）。拿到图片文件 → `POST /api/admin/upload`（FormData）→ 成功后在光标处插入图片节点（经 tiptap 的 image 节点命令 `setImage({ src })` 插入，落盘表现为 `![alt](url)`）；上传中显示"上传中"状态条并禁用保存；失败弹错误提示。（具体命令/节点写法随 tiptap 版本在实施时定，不影响存储与渲染端。）
- **编辑器接入（可替换）**：tiptap 经官方 `@tiptap/vue-3`（`useEditor` + `<EditorContent>`）挂载；Markdown 支持由官方 `@tiptap/markdown` 提供——`contentType: 'markdown'` 使初始 content 按 Markdown 解析，`editor.getMarkdown()` 导出归一化 Markdown 提交 PUT。基础能力由 `@tiptap/starter-kit`（标题/列表/引用/代码块/图片等）提供。**编辑器只用做一个可替换的适配层**：改其它开源富文本 Markdown 编辑器时，只需重写 `PostEditor.vue` 的"编辑↔Markdown"封装，存储格式、`/api/admin`、渲染端均不受影响。（`@tiptap/markdown` 序列化对常规博客结构保真完整；仅极复杂嵌套结构可能丢少数字面细节，本项目内容模型无此需求。）
- 新建文章流程：点"新建"→ 表单填标题（slug 自动生成）→ 编辑正文 → Ctrl+S 首次保存即创建文件。

## 8. 读者侧功能

- **首页** `docs/index.md`：`layout: home` + HomePostList 组件，展示文章卡片列表（标题、日期、标签、摘要），数据来自 `posts.data.ts`。
- **文章页**：VitePress 默认文档布局；`doc-after` 插槽挂 GiscusComment。
- **搜索**：config 中启用 `themeConfig.search.provider: 'local'`（localSearch，构建期本地索引，零后端）。
- **标签**：
  - `docs/tags/index.md`：标签总览（标签 + 文章数），数据来自 `posts.data.ts` + `lib/tags.ts` 聚合。
  - `docs/tags/[tag].md`：VitePress dynamic routes，`paths` 由标签聚合生成，每页列出该标签下的文章。
- **RSS**：config.mts 的 VitePress `buildEnd` 钩子中（构建结束后触发），用 `posts.data.ts` 的数据生成 `rss.xml` 写入构建输出目录 outDir（约 30 行，手写 XML，含 title/link/description/item(title/link/pubDate/description=excerpt)）。站点信息（标题、URL）在 config 顶部常量定义。
- **评论**：GiscusComment.vue 封装 Giscus 官方嵌入方式（`<script src="https://giscus.app/client.js">` 配置）。仓库名、repo-id、category 等配置项在 config 顶部常量集中定义，注释说明如何在 giscus.app 获取。

## 9. 部署（Cloudflare Pages）

- 构建命令：`pnpm build`（= `vitepress build docs`）。
- 输出目录：`docs/.vitepress/dist`。
- Node 版本：20（Pages 设置或 `NODE_VERSION=20` 环境变量）。
- base 路径：`/`（Cloudflare Pages 自有域名，无需子路径前缀）。
- 方式一（推荐）：Cloudflare Pages 连接 Git 仓库，推送到 `main` 自动构建部署。
- 方式二：`npx wrangler pages deploy docs/.vitepress/dist` 手动推送产物。
- 部署后验证：首页/文章页/标签页/搜索可访问；`/admin` 显示"仅本地可用"提示；`/api/admin/posts` 返回 404；`rss.xml` 可访问。

## 10. 测试策略（vitest）

测试文件与被测模块同目录或 `__tests__/` 下，命名 `*.test.ts`。

| 模块 | 测试要点 |
|---|---|
| `lib/slug.ts` | 合法 slug（英文/中文/数字/`-`/`_`）通过；`../x`、`a/b`、`a\\b`、`a.b`、绝对路径、空串全部拒绝；标题→slug 转换：英文小写化、空格转 `-`、非法字符剔除、中文保留 |
| `lib/frontmatter.ts` | 解析含 frontmatter 的文档；无 frontmatter 的文档；序列化后再解析往返一致；中文标题、标签数组、含特殊字符的摘要 |
| `lib/tags.ts` | 文章数组 → 标签→文章数聚合；无标签文章；排序 |
| `server/posts-store.ts` | 用 `os.tmpdir()` 下的临时目录：列表按日期倒序、读取单篇、保存新建（文件落盘且内容正确）、保存更新、原子写（tmp 文件不残留）、删除进入 `.trash/` 且原路径消失、非法 slug 拒绝、删除不存在的文章报错 |
| `server/upload-smms.ts` | mock 全局 fetch：成功返回 `{url}`；Token 缺失抛带中文提示的错误；SM.MS 返回业务错误（`success:false`）时抛出含 sm.ms 错误信息的错误；网络失败时错误归一化 |
| `data/posts.data.ts` 标签聚合 | 复用 `lib/tags.ts`，对 loader 输出形状做一例固定数据测试 |

不做的测试：Vue 组件不做重型组件测试（编辑器交互靠手动验证）；VitePress config 不做集成测试。

## 11. 全局约束

- Node ≥ 20；pnpm 作为包管理器。
- VitePress 1.x 最新稳定版；Vue 3；TypeScript；vitest 最新稳定版。
- 任何密钥（SMMS_TOKEN）不得出现在浏览器代码、构建产物、Git 提交中；`.env.local` 必须在 `.gitignore`。
- 所有写盘路径必须经过 slug 校验。
- 管理功能（API + 完整 admin UI）只能在 dev 形态可用；build 产物中 admin 页只显示提示。
- 富文本编辑器（tiptap）仅挂在写作后台；线上 admin 页只渲染"仅本地可用"提示，不挂载编辑器组件（编辑器依赖只在开发态生效）。
- 不引入第二套**发布级** Markdown 渲染器：线上最终产物与右栏预览一律以 VitePress 的 `createMarkdownRenderer` 为准；编辑器可用自身引擎仅做编辑态所见即所得渲染。
- 部署目标 Cloudflare Pages，base 为 `/`。
- 文章源文件一律存放在 `docs/posts/`，删除进入 `docs/posts/.trash/`。

## 12. 明确不做（YAGNI）

- 不做用户系统/登录（写作后台只在本地 dev，无多用户）。
- 不做草稿/发布状态、草稿箱（文件在 posts/ 里即发布；要藏稿就不保存或放 trash）。
- 不做在线后台的线上版本（admin 不上线）。
- 不做第二种图床（只接 SM.MS；上传模块边界清晰，将来可加）。
- 不做评论管理后台、访问统计、站点地图以外的 SEO 工具（sitemap 如需可后加）。
- 不自研编辑器核心：富文本编辑用开源编辑器（tiptap）封装为一个可替换适配层，不做零投入重写一套 WYSIWYG/ProseMirror 引擎。
