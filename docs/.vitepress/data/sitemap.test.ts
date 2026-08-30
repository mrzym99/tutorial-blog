import { describe, expect, it } from 'vitest'
import { buildSitemapXml } from './sitemap'
import type { PostMeta } from '../lib/tags'

const posts: PostMeta[] = [
  { slug: 'hello', title: '你好', date: '2026-01-01', tags: ['前端'], excerpt: '摘要' },
  { slug: 'second', title: '第二篇', date: '2026-02-02', tags: ['前端', 'VitePress'], excerpt: '' },
  { slug: 'notag', title: '无标签', date: '2026-03-03', tags: undefined, excerpt: undefined },
]

describe('buildSitemapXml', () => {
  it('包含静态页：根、关于、标签、归档', () => {
    const xml = buildSitemapXml(posts, { url: 'https://example.com' })
    expect(xml).toContain('https://example.com/')
    expect(xml).toContain('https://example.com/about')
    expect(xml).toContain('https://example.com/tags')
    expect(xml).toContain('https://example.com/archives')
  })

  it('包含每篇文章与对应标签页 URL，标签聚合去重', () => {
    const xml = buildSitemapXml(posts, { url: 'https://blog.dev' })
    expect(xml).toContain('https://blog.dev/posts/hello.html')
    expect(xml).toContain('https://blog.dev/posts/second.html')
    expect(xml).toContain('https://blog.dev/posts/notag.html')
    // 前端 出现两次 → 聚合后只在 sitemap 出现一次
    expect(xml.match(/tags\/%E5%89%8D%E7%AB%AF/g)).toHaveLength(1)
    expect(xml).toContain('https://blog.dev/tags/VitePress')
  })

  it('base 自带斜杠也能归一化，URL 不出现双斜杠', () => {
    const xml = buildSitemapXml([{ slug: 'x', title: 'x', date: '2026-01-01' }], {
      url: 'https://example.com/',
    })
    expect(xml).not.toContain('https://example.com//')
    expect(xml).toContain('https://example.com/posts/x.html')
  })

  it('URL 与摘要无关、与标题无关', () => {
    const a = buildSitemapXml(posts, { url: 'https://e.com' })
    // 改 excerpt 不影响 URL 集合
    const b = buildSitemapXml(
      posts.map((p) => ({ ...p, excerpt: '改变摘要', title: '改变标题' })),
      { url: 'https://e.com' },
    )
    expect(a).toBe(b)
  })
})