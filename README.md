# 教程博客（tutorial-blog）

一个基于 **VitePress + Vue 3 + TypeScript** 的静态教程博客。既服务读者（搜索、标签、RSS、Giscus 评论），也服务作者（本地 `/admin` 所见即所得写作后台 + 图床上传），整体部署为纯静态站点到 Cloudflare Pages。

## 特性

- 📝 **本地写作后台**（`/admin`，仅 dev）：tiptap 所见即所得编辑、实时标成草稿/置顶、标签 chip 管理、图片粘贴/拖拽即传。
- 🖼 **图床上传**：编辑器内粘贴/拖拽/按钮选择图片自动上传到腾讯云 COS 并插入链接；密钥只存在本地 Node 侧。
- 🔍 **全文搜索**：VitePress localSearch，构建期本地索引，零后端。
- 🏷 **标签系统** + 归档页 + RSS + sitemap。
- 💬 **Giscus 评论**：GitHub Discussions 驱动，纯静态无密钥。
- 🚀 **一键部署**：构建产物为纯静态文件，推送 Cloudflare Pages 即上线。

## 技术栈

| 项 | 选型 |
|---|---|
| 站点框架 | VitePress 1.x |
| UI | Vue 3 + TypeScript |
| 富文本编辑器 | tiptap（`@tiptap/vue-3` + `@tiptap/markdown`） |
| 测试 | vitest |
| 包管理 | pnpm（Node ≥ 20） |
| 图床 | 腾讯云 COS（自配 CDN 域名） |
| 评论 | Giscus |
| 部署 | Cloudflare Pages |

## 快速上手

```bash
# 安装依赖（Node ≥ 20，需安装 pnpm）
pnpm install

# 本地开发（启动后访问 http://localhost:5173）
pnpm dev

# 写作后台：浏览器打开 http://localhost:5173/admin
# 生产构建（输出到 docs/.vitepress/dist）
pnpm build

# 本地预览构建产物
pnpm preview

# 运行单测
pnpm test
```

## 写作后台（/admin）

本地开发模式访问 `/admin` 打开写作后台。布局：左侧文章列表、顶部标题/slug/日期/标签/摘要表单、中间所见即所得编辑器。

- **新建**：点"＋ 新建文章"→ 填标题（slug 自动生成，可手改）→ 编辑正文 → `Ctrl/Cmd+S` 首次保存即创建文件。
- **标签**：在表单中以 chip 形式增删；也可从全部已有标签快捷点选。
- **草稿**：勾选"草稿"保存的文章不会出现在读者侧（列表/RSS/sitemap），但后台仍可编辑，取消勾选即发布。
- **置顶**：勾选"置顶"的文章在读者侧列表中排最前。
- **图片**：在编辑器内粘贴、拖拽，或用工具栏"图片"按钮上传，自动上传到腾讯云 COS 并插入 `![alt](url)`。
- **删除**：不删文件，移入 `docs/posts/.trash/`。

> 生产构建的 `/admin` 只显示"写作后台仅在本地开发模式可用"，管理功能不会上线。

## 配置

所有配置均走环境变量：本地写 `.env.local`，CI / Cloudflare Pages 在环境变量面板注入（进程环境变量优先）。变量含义见 `.env.example`。

### 1. 站点信息（环境变量 `SITE_*`）

```
SITE_TITLE=教程博客
SITE_DESCRIPTION=记录前端与工程实践的教程文章
SITE_URL=https://tutorial-blog.pages.dev
```

`SITE_URL` 为部署后的线上域名，RSS 与 sitemap 会据此生成每篇文章的规范地址；仍是占位值时构建会告警。`SITE_TITLE` / `SITE_DESCRIPTION` 未配置时使用默认文案。

### 2. 腾讯云 COS（图床）

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
- `.env.local` 已被 `.gitignore` 忽略。未配置时上传返回 503 并提示配置方法。

### 3. Giscus 评论（环境变量 `GISCUS_*`，可选）

1. 确认你的 GitHub 仓库已开启 **Discussions**（Settings → Features → Discussions ✓）。
2. 打开 https://giscus.app，填入仓库并生成脚本。
3. 在项目根 `.env.local`（或 CI / Cloudflare Pages 的环境变量面板）填入（`.env.example` 有说明）：

```
GISCUS_REPO=owner/repo
GISCUS_REPO_ID=仓库的graphql_id
GISCUS_CATEGORY=Announcements
GISCUS_CATEGORY_ID=分类对应的id
GISCUS_MAPPING=pathname
```

配置由构建期读取并注入客户端，源码中不落仓库信息；`GISCUS_REPO` / `GISCUS_REPO_ID` / `GISCUS_CATEGORY_ID` 任一缺失时文章页不显示评论区。

## 目录结构

```
tutorial-blog/
├─ .env.local                # SITE_* / COS_* / GISCUS_* 等环境变量（.gitignore，不提交）
├─ .env.example              # 模板（提交）
├─ docs/
│  ├─ .vitepress/
│  │  ├─ config.mts          # VitePress 配置 + 环境变量读取 + RSS/sitemap buildEnd 钩子
│  │  ├─ theme/              # 主题：首页卡片、Giscus 评论、样式
│  │  ├─ admin/              # 写作后台（仅 dev 完整功能）
│  │  ├─ server/             # dev 中间件：路由、文件存储、COS 上传代理
│  │  ├─ lib/                # 纯函数：slug/frontmatter/标签聚合（均有单测）
│  │  └─ data/               # 构建期数据：post 加载器、RSS、sitemap
│  ├─ posts/                 # 文章源文件 <slug>.md（删除进 .trash/）
│  ├─ tags/                  # 标签总览 + 动态路由
│  ├─ archives.md            # 归档页
│  ├─ 404.md                 # 404 页
│  ├─ index.md               # 首页
│  ├─ about.md               # 关于
│  └─ admin.md               # 挂载 AdminPage
└─ superpowers/              # 设计文档 / 计划（不进入站点）
```

## 部署（Cloudflare Pages）

- **构建命令**：`pnpm build`
- **输出目录**：`docs/.vitepress/dist`
- **Node 版本**：20（Pages 环境变量 `NODE_VERSION=20`）
- **base 路径**：`/`

方式一（推荐）：Cloudflare Pages 连接本 Git 仓库，推送到 `main` 自动构建部署。
方式二（手动）：`npx wrangler pages deploy docs/.vitepress/dist`。

部署后验证：首页/文章/标签/搜索可访问；`/admin` 显示"仅本地可用"提示；`/api/admin/posts` 返回 404；`rss.xml` 与 `sitemap.xml` 可访问。记得把 `SITE_URL` 配置为真实域名。

## 测试

```bash
pnpm test        # 全部单测
pnpm test:watch  # 监听模式
```

测试覆盖：slug 校验（防路径穿越）、frontmatter 解析/序列化、标签聚合与排序、文章文件存储、COS 上传、RSS/sitemap 生成。

## License

私有项目。