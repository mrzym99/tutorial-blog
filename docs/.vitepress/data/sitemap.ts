/**
 * Sitemap 生成（纯函数，buildEnd 钩子里与 RSS 一并调用）。
 * 输出 sitemap index XML：站点根/关于/归档/标签页 + 每篇文章一条 <url>。
 * 结构与 rss.ts 保持一致，供 unit 测试。
 */
import { aggregateTags } from '../lib/tags'
import type { PostMeta } from '../lib/tags'

export interface SitemapSite {
  url: string
}

function esc(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&apos;')
}

/** 拼出一个规范化页面地址（去掉末尾斜杠，避免 /posts/x.html/ 双斜杠）。 */
function loc(siteUrl: string, pathname: string): string {
  const base = siteUrl.replace(/\/+$/, '')
  const p = pathname.startsWith('/') ? pathname : `/${pathname}`
  return `${base}${p}`
}

/**
 * 生成 sitemap XML。
 * 静态页：/、/about、/tags、/archives；动态页：/tags/<tag>、/posts/<slug>.html。
 * 标签列表由 posts 内部聚合（与标签页/归档一致），与 excerpt 无关。
 */
export function buildSitemapXml(posts: PostMeta[], site: SitemapSite): string {
  const staticPaths = ['/', '/about', '/tags', '/archives']
  const tagPaths = aggregateTags(posts).map((t) => `/tags/${encodeURIComponent(t.tag)}`)
  const postPaths = posts.map((p) => `/posts/${p.slug}.html`)

  const urls = [...staticPaths, ...tagPaths, ...postPaths]
    .map((pathname) => {
      return `  <url>
    <loc>${esc(loc(site.url, pathname))}</loc>
  </url>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">
${urls}
</urlset>
`
}