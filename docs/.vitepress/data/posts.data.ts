/**
 * 构建期文章数据加载器：扫描 docs/posts/*.md（非递归，.trash 不会被扫描），
 * 提取 frontmatter 并聚合成便于首页/标签页使用的结构。
 */
import { createContentLoader } from 'vitepress'
import { aggregateTags, type PostMeta, type TagAgg } from '../lib/tags'

export interface PostsData {
  posts: PostMeta[]
  tags: TagAgg[]
}

export default createContentLoader('posts/*.md', {
  transform(raw): PostsData {
    const posts: PostMeta[] = raw
      .filter((d) => d.frontmatter?.title && d.frontmatter?.date)
      .map((d) => ({
        slug: slugFromUrl(d.url),
        title: d.frontmatter.title,
        date: d.frontmatter.date,
        tags: d.frontmatter.tags,
        excerpt: d.frontmatter.excerpt,
      }))
      .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))

    return { posts, tags: aggregateTags(posts) }
  },
})

/** 从 VitePress 生成的 URL（/posts/<slug>）提取 slug。 */
function slugFromUrl(url: string): string {
  const m = /\/([^/]+?)(?:\.html)?\/?$/.exec(url)
  return m?.[1] ?? ''
}