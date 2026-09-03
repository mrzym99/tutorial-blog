import { defineConfig } from "vitepress";
import path from "node:path";
import { promises as fs, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { adminPlugin } from "./server/plugin";
import { extractFrontmatter } from "./lib/frontmatter";
import { comparePosts } from "./lib/tags";
import type { PostMeta } from "./lib/tags";
import { buildRssXml } from "./data/rss";
import { buildSitemapXml } from "./data/sitemap";
import { createCosUploader, assertCosConfig } from "./server/upload-cos";
import type { CosConfig } from "./server/upload-cos";
import type { Uploader } from "./server/routes";
import type { GiscusConfig } from "./theme/giscus";

const docsDir = fileURLToPath(new URL("..", import.meta.url));
const postsDir = path.join(docsDir, "posts");

// 读取项目根 .env.local（避免引入额外依赖解析 .env）。进程环境变量优先，
// 便于 CI / Cloudflare Pages 构建时直接在面板中注入。
const envLocal: Record<string, string> = (() => {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const map: Record<string, string> = {};
    // 注意 [ \t] 而非 \s：值为空时 \s 会吞掉换行，把下一行误当成当前 key 的值
    for (const m of text.matchAll(/^\s*([A-Za-z_][\w]*)[ \t]*=[ \t]*"?([^\s"\n]*)"?[ \t]*$/gm)) {
      map[m[1]] = m[2];
    }
    return map;
  } catch {
    return {};
  }
})();

const pickEnv = (key: string): string => process.env[key] || envLocal[key] || "";

// 站点信息来自环境变量（SITE_*，见 .env.example），用于页面标题、描述与 RSS/sitemap
// 中的规范地址。url 以 https:// 开头、结尾不带斜杠，缺失时回退占位值并在构建时告警。
const SITE = {
  title: pickEnv("SITE_TITLE") || "教程博客",
  description: pickEnv("SITE_DESCRIPTION") || "记录前端与工程实践的教程文章",
  url: (pickEnv("SITE_URL") || "https://example.com").replace(/\/+$/, ""),
};

// Giscus 评论参数来自环境变量（GISCUS_*，见 .env.example）。
// 三项必需值齐备才注入，否则组件不挂载评论区。
const giscusConfig: GiscusConfig | null = (() => {
  const config: GiscusConfig = {
    repo: pickEnv("GISCUS_REPO"),
    repoId: pickEnv("GISCUS_REPO_ID"),
    category: pickEnv("GISCUS_CATEGORY") || "Announcements",
    categoryId: pickEnv("GISCUS_CATEGORY_ID"),
    mapping: pickEnv("GISCUS_MAPPING") || "pathname",
  };
  return config.repo && config.repoId && config.categoryId ? config : null;
})();

// COS 上传配置：仅 dev 中间件使用，不进入浏览器包；缺失时上传接口 503。
function loadCosConfig(): Partial<CosConfig> | null {
  const secretId = pickEnv("COS_SECRET_ID");
  const secretKey = pickEnv("COS_SECRET_KEY");
  const bucket = pickEnv("COS_BUCKET");
  const region = pickEnv("COS_REGION");
  const domain = pickEnv("COS_DOMAIN");
  if (!secretId && !secretKey && !bucket && !region && !domain) return null;
  return { secretId, secretKey, bucket, region, domain };
}

/** 构建 COS 上传器；任一必需项缺失则返回 null（此时 /api/admin/upload 返回 503）。 */
function buildUploader(): Uploader | null {
  const raw = loadCosConfig();
  if (!raw) return null;
  try {
    return createCosUploader(assertCosConfig(raw));
  } catch {
    return null;
  }
}

export default defineConfig({
  srcDir: docsDir,
  title: SITE.title,
  description: SITE.description,
  lang: "zh-CN",
  base: "/",
  cleanUrls: true,
  ignoreDeadLinks: true,

  vite: {
    // 注入 Giscus 评论配置（值公开无密钥）；未配置时为 null，组件跳过挂载
    define: {
      __GISCUS__: JSON.stringify(giscusConfig),
    },
    plugins: [
      adminPlugin({
        postsDir,
        uploader: buildUploader(),
      }),
    ],
  },

  themeConfig: {
    search: { provider: "local" },
    nav: [
      { text: "首页", link: "/" },
      { text: "归档", link: "/archives" },
      { text: "标签", link: "/tags" },
      { text: "关于", link: "/about" },
    ],
    outline: { label: "本页目录", level: [2, 3] },
    docFooter: { prev: "上一篇", next: "下一篇" },
    returnToTopLabel: "回到顶部",
    sidebarMenuLabel: "菜单",
    darkModeSwitchLabel: "外观",
  },

  async buildEnd(siteConfig) {
    if (SITE.url.includes("example.com")) {
      console.warn(
        "[site] SITE_URL 仍为占位值，RSS/sitemap 中的文章链接将指向 example.com，请在环境变量中配置真实域名",
      );
    }
    await generateFeedFiles(siteConfig);
  },
});

/** 构建结束后生成 rss.xml 与 sitemap.xml 到输出目录（复用同一份 posts 数据）。 */
async function generateFeedFiles(siteConfig: { srcDir: string; outDir: string }): Promise<void> {
  const posts = await collectPostMetas(siteConfig.srcDir);
  const collections = await collectCollectionMetas(siteConfig.srcDir);
  const xml = buildRssXml(posts, { ...SITE });
  const sitemap = buildSitemapXml(posts, { ...SITE }, collections);
  await fs.mkdir(siteConfig.outDir, { recursive: true });
  await fs.writeFile(path.join(siteConfig.outDir, "rss.xml"), xml);
  await fs.writeFile(path.join(siteConfig.outDir, "sitemap.xml"), sitemap);
}

/** 扫描 collections/ 每个合集，提取 CollectionMeta（供 sitemap 使用，草稿在 sitemap 内过滤）。 */
async function collectCollectionMetas(
  docsDir: string,
): Promise<{ slug: string; title: string; draft?: boolean }[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(path.join(docsDir, "collections"));
  } catch {
    return [];
  }
  const collections: { slug: string; title: string; draft?: boolean }[] = [];
  for (const name of entries) {
    if (!name.endsWith(".md") || name.startsWith(".")) continue;
    const raw = await fs.readFile(path.join(docsDir, "collections", name), "utf8");
    const { frontmatter } = extractFrontmatter(raw);
    if (!frontmatter?.title) continue;
    collections.push({
      slug: name.slice(0, -".md".length),
      title: frontmatter.title,
      draft: frontmatter.draft,
    });
  }
  return collections;
}

/** 扫描 posts/ 每篇文章，提取 PostMeta 并按 date 倒序（供 RSS 与 sitemap 共用）。 */
async function collectPostMetas(docsDir: string): Promise<PostMeta[]> {
  let entries: string[];
  try {
    entries = await fs.readdir(path.join(docsDir, "posts"));
  } catch {
    return [];
  }
  const posts: PostMeta[] = [];
  for (const name of entries) {
    if (!name.endsWith(".md") || name.startsWith(".")) continue;
    const raw = await fs.readFile(path.join(docsDir, "posts", name), "utf8");
    const { frontmatter } = extractFrontmatter(raw);
    if (!frontmatter?.title || !frontmatter?.date || frontmatter?.draft) continue;
    posts.push({
      slug: name.slice(0, -".md".length),
      title: frontmatter.title,
      date: frontmatter.date,
      tags: frontmatter.tags,
      excerpt: frontmatter.excerpt,
      cover: frontmatter.cover,
      draft: frontmatter.draft,
      pinned: frontmatter.pinned,
      collection: frontmatter.collection,
      order: frontmatter.order,
    });
  }
  posts.sort(comparePosts);
  return posts;
}
