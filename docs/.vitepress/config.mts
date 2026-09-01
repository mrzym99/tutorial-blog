import { defineConfig } from "vitepress";
import path from "node:path";
import { promises as fs, readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { SITE } from "./const";
import { adminPlugin } from "./server/plugin";
import { extractFrontmatter } from "./lib/frontmatter";
import { comparePosts } from "./lib/tags";
import type { PostMeta } from "./lib/tags";
import { buildRssXml } from "./data/rss";
import { buildSitemapXml } from "./data/sitemap";
import { createCosUploader, assertCosConfig } from "./server/upload-cos";
import type { CosConfig } from "./server/upload-cos";
import type { Uploader } from "./server/routes";

const docsDir = fileURLToPath(new URL("..", import.meta.url));
const postsDir = path.join(docsDir, "posts");

// 读取项目根 .env.local 中的 COS 配置（避免引入额外依赖解析 .env）。
// 仅 dev 中间件使用，不进入浏览器包；缺失时上传接口 503。
function loadCosConfig(): Partial<CosConfig> | null {
  try {
    const text = readFileSync(path.join(process.cwd(), ".env.local"), "utf8");
    const pick = (key: string): string | undefined =>
      new RegExp(`^${key}\\s*=\\s*"?([^\\s"\\n]+)"?`, "m").exec(text)?.[1];
    const secretId = pick("COS_SECRET_ID");
    const secretKey = pick("COS_SECRET_KEY");
    const bucket = pick("COS_BUCKET");
    const region = pick("COS_REGION");
    const domain = pick("COS_DOMAIN");
    if (!secretId && !secretKey && !bucket && !region && !domain) return null;
    return { secretId, secretKey, bucket, region, domain };
  } catch {
    return null;
  }
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
    await generateFeedFiles(siteConfig);
  },
});

/** 构建结束后生成 rss.xml 与 sitemap.xml 到输出目录（复用同一份 posts 数据）。 */
async function generateFeedFiles(siteConfig: { srcDir: string; outDir: string }): Promise<void> {
  const posts = await collectPostMetas(siteConfig.srcDir);
  const xml = buildRssXml(posts, { ...SITE });
  const sitemap = buildSitemapXml(posts, { ...SITE });
  await fs.mkdir(siteConfig.outDir, { recursive: true });
  await fs.writeFile(path.join(siteConfig.outDir, "rss.xml"), xml);
  await fs.writeFile(path.join(siteConfig.outDir, "sitemap.xml"), sitemap);
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
    });
  }
  posts.sort(comparePosts);
  return posts;
}
