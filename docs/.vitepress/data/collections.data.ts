/**
 * 构建期合集数据加载器：扫描 docs/collections/*.md，
 * 提取合集元数据（slug/title/description/cover/draft/createdAt）。
 * 文章数与排序聚合在 lib/collections.ts，页面层组合本数据与 posts.data 使用。
 */
import { createContentLoader } from 'vitepress'
import type { CollectionMeta } from '../lib/collections'
import type { CollectionFrontmatter } from '../lib/frontmatter'

export interface CollectionsData {
  collections: CollectionMeta[]
}

declare const data: CollectionsData
export { data }

export default createContentLoader('collections/*.md', {
  transform(raw): CollectionsData {
    const collections: CollectionMeta[] = raw
      .filter((d) => Boolean(d.frontmatter?.title))
      .map((d) => {
        const fm = d.frontmatter as Partial<CollectionFrontmatter>
        return {
          slug: slugFromUrl(d.url),
          title: fm.title ?? '',
          description: fm.description,
          cover: fm.cover,
          draft: fm.draft,
          createdAt: formatDate(fm.createdAt),
        }
      })
    return { collections }
  },
})

/** 从 VitePress 生成的 URL（/collections/<slug>）提取 slug。 */
function slugFromUrl(url: string): string {
  const m = /\/([^/]+?)(?:\.html)?\/?$/.exec(url)
  return m?.[1] ?? ''
}

/** VitePress 解析 frontmatter 的 date 可能是 Date 对象，统一格式化为 YYYY-MM-DD。 */
function formatDate(d: unknown): string | undefined {
  if (d instanceof Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  if (typeof d === 'string') {
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(d)
    if (m) return m[1]
  }
  return undefined
}
