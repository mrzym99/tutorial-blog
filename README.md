# 教程博客（tutorial-blog）

一个基于 **VitePress + Vue 3 + TypeScript** 的静态教程博客。既服务读者（搜索、标签、合集、RSS、Giscus 评论），也服务作者（本地 `/admin` 写作后台 + Markdown 编辑器 + 图床上传），整体部署为纯静态站点到 Cloudflare Pages。

## 特性

- 📝 **本地写作后台**（`/admin`，仅 dev）：文章 / 合集 / 回收站三个标签页管理；`/admin-edit` 打开独立编辑页，md-editor-v3 Markdown 编辑（工具栏 + 图片粘贴上传）、标签 chip 管理、草稿 / 置顶开关。
- 📚 **合集系统**：文章可归属合集，读者侧有合集列表页与合集详情页（按自定义顺序展示）。
- 🖼 **图床上传**：编辑器内粘贴 / 拖拽 / 按钮选择图片自动上传到腾讯云 COS 并插入链接；密钥只存在本地 Node 侧，不进浏览器。
- 🔍 **全文搜索**：VitePress localSearch（provider: local），构建期本地索引，零后端。
- 🏷 **标签系统** + 归档页 + RSS + sitemap。
- 💬 **Giscus 评论**：GitHub Discussions 驱动，纯静态无密钥。
- 📊 **访问统计（可选）**：Cloudflare Web Analytics beacon，配置 token 即注入。
- 🚀 **一键部署**：构建产物为纯静态文件，推送 Cloudflare Pages 即上线。

## 技术栈

| 项 | 选型 |
|---|---|
| 站点框架 | VitePress 1.x |
| UI | Vue 3 + TypeScript，后台组件库 naive-ui |
| Markdown 编辑器 | md-editor-v3 |
| 测试 | vitest |
| 包管理 | pnpm（Node ≥ 20） |
| 图床 | 腾讯云 COS（自配 CDN 域名） |
| 评论 | Giscus |
| 统计 | Cloudflare Web Analytics（可选） |
| 部署 | Cloudflare Pages |

## 快速上手

```bash
# 安装依赖（Node ≥ 20，需安装 pnpm）
pnpm install

# 1. 复制环境变量模板并填写（见下文「配置」）
cp .env.example .env.local

# 2. 本地开发（启动后访问 http://localhost:5173）
pnpm dev

# 写作后台：浏览器打开 http://localhost:5173/admin
# 生产构建（输出到 docs/.vitepress/dist）
pnpm build

# 本地预览构建产物
pnpm preview

# 运行单测 / 类型检查
pnpm test
pnpm typecheck
```

## 配置

所有配置均走环境变量：

- **本地开发**：项目根目录下的 **`.env.local`**（从 `.env.example` 复制而来，已被 `.gitignore` 忽略，绝不提交）。
- **CI / Cloudflare Pages**：在 Pages 项目 Settings → Environment variables 面板注入同名变量。
- **优先级**：进程环境变量 > `.env.local`（`config.mts` 中 `pickEnv` 的读取顺序），因此线上面板配置不会被本地文件干扰。

变量含义详见 `.env.example` 内注释。**站点信息（`SITE_URL`）为必配**，其余均为可选：可选能力（图床上传、评论、统计、备案号）在对应变量缺失时自动跳过/禁用，不影响构建。

### 1. 站点信息（环境变量 `SITE_*`）

```
SITE_TITLE=教程博客
SITE_DESCRIPTION=记录前端与工程实践的教程文章
SITE_URL=https://tutorial-blog.pages.dev
SITE_ICP=京ICP备XXXXXXXX号-1        # 可选，页脚备案号；海外部署留空
```

`SITE_URL` 为部署后的线上域名，RSS 与 sitemap 会据此生成每篇文章的规范地址；仍是占位值时构建会告警。`SITE_TITLE` / `SITE_DESCRIPTION` 未配置时使用默认文案。

### 2. 腾讯云 COS（图床，可选）

在项目根 `.env.local` 填入五项（`.env.example` 有说明）：

```
COS_SECRET_ID=你的SecretId
COS_SECRET_KEY=你的SecretKey
COS_BUCKET=博客名-appid
COS_REGION=ap-guangzhou
COS_DOMAIN=https://img.example.com
```

- **密钥**：腾讯云控制台 → 访问管理（CAM）→ 访问密钥；建议建一个**仅授予该 Bucket `PutObject` 权限的子账号**，别用主账号密钥。
- **Bucket**：需开启公有读（或用 CDN 私有回源），图片才能被公开访问。
- **域名**：把已备案的自定义域名（或 CDN 域名）填到 `COS_DOMAIN`，上传后返回该域名下的图片 URL，与你站点同域、国内稳定访问。
- 未配置时上传接口返回 503 并提示配置方法，编辑器其余功能不受影响。

### 3. Giscus 评论（环境变量 `GISCUS_*`，可选）

1. 确认你的 GitHub 仓库已开启 **Discussions**（Settings → Features → Discussions ✓）。
2. 打开 https://giscus.app，填入仓库并生成脚本。
3. 在 `.env.local`（或 Cloudflare Pages 环境变量面板）填入：

```
GISCUS_REPO=owner/repo
GISCUS_REPO_ID=仓库的graphql_id
GISCUS_CATEGORY=Announcements
GISCUS_CATEGORY_ID=分类对应的id
GISCUS_MAPPING=pathname
```

配置由构建期读取并注入客户端；`GISCUS_REPO` / `GISCUS_REPO_ID` / `GISCUS_CATEGORY_ID` 任一缺失时文章页不显示评论区。

### 4. Cloudflare Web Analytics 访问统计（可选）

```
CF_BEACON_TOKEN=Cloudflare生成的beacon token
```

获取：Cloudflare 面板 → Analytics & Logs → Web Analytics → 添加站点（无需 Cloudflare 代理），复制生成的 token 填入。配置后构建期向所有页面注入 `beacon.min.js` 统计脚本，SPA 切页由 beacon 自动跟进；留空则不注入。

## 写作后台（/admin）

本地开发模式访问 `/admin` 打开写作后台，三个标签页：

- **文章**：左侧文章列表（标题 / 草稿 / 置顶标识），点"编辑"在新标签页打开 `/admin-edit` 独立编辑页 —— 顶部为标题、slug、日期、标签、摘要、合集归属等表单，中间是 md-editor-v3 所见即所得 Markdown 编辑器。
- **合集**：创建 / 编辑合集（标题、简介、排序），把文章按顺序加入合集；读者侧生成合集列表页与详情页。
- **回收站**：删除的文章移入 `docs/posts/.trash/`，可恢复或彻底删除。

常用操作：

- **新建**：文章标签页点"＋ 新建文章" → 填标题（slug 自动生成，可手改）→ 编辑正文 → `Ctrl/Cmd+S` 首次保存即创建文件。
- **标签**：表单中以 chip 形式增删；也可从全部已有标签快捷点选。
- **草稿**：勾选"草稿"保存的文章不出现在读者侧（列表 / 合集 / RSS / sitemap），后台仍可编辑，取消勾选即发布。
- **置顶**：勾选"置顶"的文章在读者侧列表中排最前。
- **图片**：编辑器内粘贴、拖拽，或用工具栏"图片"按钮上传，自动传到腾讯云 COS 并插入 `![alt](url)`。
- **删除**：不直接删文件，先移入 `.trash/` 回收站。

> 生产构建的 `/admin` / `/admin-edit` 只显示占位提示，后台代码与 naive-ui / md-editor-v3 依赖不会打进线上产物。

## 目录结构

```
tutorial-blog/
├─ .env.local                # 本地环境变量配置文件（SITE_* / COS_* / GISCUS_* 等；.gitignore 忽略，不提交）
├─ .env.example              # 环境变量模板（提交），复制为 .env.local 后填写
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.mts          # VitePress 配置：.env.local 读取、beacon/Giscus 注入、RSS/sitemap buildEnd 钩子
│  │  ├─ theme/              # 主题：布局、首页卡片、Giscus 评论、样式
│  │  ├─ admin/              # 写作后台 Vue 组件（仅 dev 完整功能）
│  │  ├─ server/             # dev 中间件：/api/admin/* 路由、文章/合集文件存储、COS 上传代理
│  │  ├─ lib/                # 纯函数：slug/frontmatter/标签/合集聚合（均有单测）
│  │  └─ data/               # 构建期数据：post 加载器、RSS、sitemap
│  ├─ posts/                 # 文章源文件 <slug>.md（删除进 .trash/）
│  ├─ collections/           # 合集源文件 <slug>.md + [collection].md 动态路由
│  ├─ tags/                  # 标签总览 + 动态路由
│  ├─ archives.md            # 归档页
│  ├─ 404.md                 # 404 页
│  ├─ index.md               # 首页
│  ├─ about.md               # 关于
│  ├─ admin.md               # 挂载写作后台（文章/合集/回收站管理）
│  └─ admin-edit.md          # 挂载编辑页
└─ superpowers/              # 设计文档 / specs（不进入站点）
```

## 部署（Cloudflare Pages）

- **构建命令**：`pnpm build`
- **输出目录**：`docs/.vitepress/dist`
- **Node 版本**：20（Pages 环境变量 `NODE_VERSION=20`）
- **base 路径**：`/`
- **分支**：`master`

方式一（推荐）：Cloudflare Pages 连接本 Git 仓库，推送到 `master` 自动构建部署。
方式二（手动）：`npx wrangler pages deploy docs/.vitepress/dist`。

部署前在 Pages 项目的环境变量面板配置好 `SITE_URL` 等变量（见「配置」一节）。部署后验证：首页/文章/合集/标签/搜索可访问；`/admin` 显示占位提示；`/api/admin/posts` 返回 404；`rss.xml` 与 `sitemap.xml` 可访问。

## 测试

```bash
pnpm test        # 全部单测
pnpm test:watch  # 监听模式
pnpm typecheck   # vue-tsc 类型检查
```

测试覆盖：slug 校验（防路径穿越）、frontmatter 解析/序列化、标签与合集聚合排序、文章/合集文件存储、COS 上传、RSS/sitemap 生成、admin 路由分发。

## License

[MIT](./LICENSE)
