import { defineConfig } from 'vitepress'
import path from 'node:path'
import { promises as fs, readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { SITE } from './const'
import { adminPlugin } from './server/plugin'
import { extractFrontmatter } from './lib/frontmatter'
import type { PostMeta } from './lib/tags'
import { buildRssXml } from './data/rss'

const docsDir = fileURLToPath(new URL('..', import.meta.url))
const postsDir = path.join(docsDir, 'posts')

// 读取项目根 .env.local 中的 SMMS_TOKEN（避免引入额外依赖解析 .env）。
// 仅 dev 中间件使用，不进入浏览器包。
function loadSmmsToken(): string {
  try {
    const text = readFileSync(path.join(process.cwd(), '.env.local'), 'utf8')
    const m = /^SMMS_TOKEN\s*=\s*"?([^\s"\n]+)"?/m.exec(text)
    return m?.[1] ?? ''
  } catch {
    return ''
  }
}

export default defineConfig({
  srcDir: docsDir,
  title: SITE.title,
  description: SITE.description,
  lang: 'zh-CN',
  base: '/',
  cleanUrls: true,
  ignoreDeadLinks: true,

  vite: {
    plugins: [
      adminPlugin({
        postsDir,
        token: loadSmmsToken(),
      }),
    ],
    // 写作时不要因 posts/ 文件变化触发页面整体热更新
    server: {
      watch: { ignored: ['**/posts/**'] },
    },
  },

  themeConfig: {
    search: { provider: 'local' },
    nav: [
      { text: '首页', link: '/' },
      { text: '标签', link: '/tags' },
      { text: '关于', link: '/about' },
    ],
    outline: { label: '本页目录', level: [2, 3] },
    docFooter: { prev: '上一篇', next: '下一篇' },
    returnToTopLabel: '回到顶部',
    sidebarMenuLabel: '菜单',
    darkModeSwitchLabel: '外观',
  },

  async buildEnd(siteConfig) {
    await generateRss(siteConfig)
  },
})

/** 构建结束后生成 rss.xml 到输出目录。 */
async function generateRss(siteConfig: {
  srcDir: string
  outDir: string
}): Promise<void> {
  let entries: string[]
  try {
    entries = await fs.readdir(path.join(siteConfig.srcDir, 'posts'))
  } catch {
    return
  }
  const posts: PostMeta[] = []
  for (const name of entries) {
    if (!name.endsWith('.md') || name.startsWith('.')) continue
    const raw = await fs.readFile(path.join(siteConfig.srcDir, 'posts', name), 'utf8')
    const { frontmatter } = extractFrontmatter(raw)
    if (!frontmatter?.title || !frontmatter?.date) continue
    posts.push({
      slug: name.slice(0, -'.md'.length),
      title: frontmatter.title,
      date: frontmatter.date,
      tags: frontmatter.tags,
      excerpt: frontmatter.excerpt,
    })
  }
  posts.sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
  const xml = buildRssXml(posts, { ...SITE })
  await fs.mkdir(siteConfig.outDir, { recursive: true })
  await fs.writeFile(path.join(siteConfig.outDir, 'rss.xml'), xml)
}