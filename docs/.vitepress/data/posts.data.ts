/**
 * 构建期文章数据加载器：扫描 docs/posts/*.md（非递归，.trash 不会被扫描），
 * 提取 frontmatter 并聚合成便于首页/标签页使用的结构。
 */
import { createContentLoader } from 'vitepress'
import {
  aggregateTags,
  comparePosts,
  type PostMeta,
  type TagAgg,
} from '../lib/tags'

export interface PostsData {
  posts: PostMeta[]
  tags: TagAgg[]
}

export default createContentLoader('posts/*.md', {
  transform(raw): PostsData {
    const posts: PostMeta[] = raw
      .filter(
        (d) =>
          d.frontmatter?.title &&
          d.frontmatter?.date &&
          !d.frontmatter?.draft, // 草稿不进入公开数据
      )
      .map((d) => ({
        slug: slugFromUrl(d.url),
        title: d.frontmatter.title,
        date: formatDate(d.frontmatter.date),
        tags: d.frontmatter.tags,
        excerpt: d.frontmatter.excerpt,
        draft: d.frontmatter.draft,
        pinned: d.frontmatter.pinned,
      }))
      .sort(comparePosts)

    return { posts, tags: aggregateTags(posts) }
  },
})

/** 从 VitePress 生成的 URL（/posts/<slug>）提取 slug。 */
function slugFromUrl(url: string): string {
  const m = /\/([^/]+?)(?:\.html)?\/?$/.exec(url)
  return m?.[1] ?? ''
}

/** VitePress 解析 frontmatter 的 date 可能是 Date 对象，统一格式化为 YYYY-MM-DD。 */
function formatDate(d: unknown): string {
  if (d instanceof Date) {
    const y = d.getFullYear()
    const m = String(d.getMonth() + 1).padStart(2, '0')
    const day = String(d.getDate()).padStart(2, '0')
    return `${y}-${m}-${day}`
  }
  if (typeof d === 'string') {
    // 处理 "2026-08-27T00:00:00.000Z" 之类的字符串
    const m = /^(\d{4}-\d{2}-\d{2})/.exec(d)
    if (m) return m[1]
  }
  return String(d ?? '')
}