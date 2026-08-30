/**
 * 标签聚合（纯函数）：文章数据 → 标签统计，供标签页与构建期数据使用。
 */
import type { PostFrontmatter } from './frontmatter'

export type PostMeta = Pick<PostFrontmatter, 'title' | 'date' | 'tags' | 'excerpt'> & {
  slug: string
}

export interface TagAgg {
  tag: string
  count: number
}

/** 统计每篇文章 tags 的出现次数，按标签名（localeCompare）排序，结果稳定。 */
export function aggregateTags(posts: PostMeta[]): TagAgg[] {
  const counts = new Map<string, number>()
  for (const post of posts) {
    // 同篇文章内重复标签只计一次
    for (const tag of new Set(post.tags ?? [])) {
      counts.set(tag, (counts.get(tag) ?? 0) + 1)
    }
  }
  return [...counts.entries()]
    .map(([tag, count]) => ({ tag, count }))
    .sort((a, b) => (a.tag < b.tag ? -1 : a.tag > b.tag ? 1 : 0))
}

/** 标签名 → 该标签下的文章（按 date 倒序）。 */
export function postsByTag(posts: PostMeta[], tag: string): PostMeta[] {
  return posts
    .filter((p) => (p.tags ?? []).includes(tag))
    .sort((a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : 0))
}