/**
 * RSS 生成（纯函数，buildEnd 钩子里调用）。
 * 输出轻量 XML：site 级 title/link/description + 每篇文章一条 <item>。
 */
import type { PostMeta } from '../lib/tags'

export interface RssSite {
  title: string
  description: string
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

/** date（YYYY-MM-DD）转 RFC 2822（RSS pubDate）。 */
function toPubDate(date: string): string {
  // 按本地时区理解当天 00:00，转换为距今最近的格式；直接用 Date 以 UTC 也可。
  const d = new Date(`${date}T00:00:00Z`)
  return d.toUTCString()
}

export function buildRssXml(posts: PostMeta[], site: RssSite): string {
  let now = ''
  try {
    now = new Date().toUTCString()
  } catch {
    now = ''
  }

  const items = posts
    .map((p) => {
      const link = `${site.url}/posts/${p.slug}.html`
      const desc = p.excerpt ? esc(p.excerpt) : esc(p.title)
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${link}</link>
      <pubDate>${toPubDate(p.date)}</pubDate>
      <guid isPermaLink="true">${link}</guid>
      <description>${desc}</description>
    </item>`
    })
    .join('\n')

  return `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0">
  <channel>
    <title>${esc(site.title)}</title>
    <link>${site.url}</link>
    <description>${esc(site.description)}</description>
    <lastBuildDate>${now}</lastBuildDate>
    <generator>tutorial-blog (VitePress)</generator>
${items}
  </channel>
</rss>
`
}