/**
 * 合集聚合（纯函数）：合集元数据 + 文章数据 → 合集视图，供首页/详情页与构建期数据使用。
 * 仿 tags.ts：只做纯计算，I/O 与加载由 content loader / store 负责。
 */
import type { PostMeta } from './tags'

export interface CollectionMeta {
  slug: string
  title: string
  description?: string
  cover?: string
  draft?: boolean
  /** YYYY-MM-DD，创建日期（新在前） */
  createdAt?: string
}

export interface CollectionWithCount extends CollectionMeta {
  /** 该合集下公开文章数 */
  count: number
}

/**
 * 合集内文章排序：order 升序 → date 倒序兜底 → slug 升序（同日稳定）。
 * 注意：合集是章节序，与全站 comparePosts（置顶/日期）规则不同。
 */
export function compareCollectionPosts(a: PostMeta, b: PostMeta): number {
  const oa = a.order ?? Number.MAX_SAFE_INTEGER
  const ob = b.order ?? Number.MAX_SAFE_INTEGER
  if (oa !== ob) return oa - ob
  if (a.date !== b.date) return a.date > b.date ? -1 : 1
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
}

/** 合集 slug → 该合集下的文章（order 升序）。 */
export function postsByCollection(posts: PostMeta[], slug: string): PostMeta[] {
  return posts.filter((p) => p.collection === slug).sort(compareCollectionPosts)
}

/**
 * 合集列表 → 附带公开文章数、剔除草稿合集、按 createdAt 倒序（新在前，无日期按标题稳定排序）。
 */
export function aggregateCollections(
  collections: CollectionMeta[],
  posts: PostMeta[],
): CollectionWithCount[] {
  return collections
    .filter((c) => !c.draft)
    .map((c) => ({
      ...c,
      count: posts.filter((p) => p.collection === c.slug).length,
    }))
    .sort((a, b) => {
      const da = a.createdAt ?? ''
      const db = b.createdAt ?? ''
      if (da !== db) return da > db ? -1 : 1
      return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
    })
}
