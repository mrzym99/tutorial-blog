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
  /** YYYY-MM-DD，创建日期（无 order 时作为展示顺序兜底） */
  createdAt?: string
  /** 合集展示序号（从 1 起，后台排序接口整体重写；未设置时按 createdAt 兜底） */
  order?: number
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
 * 合集展示排序：order 升序（未设置排最后）→ createdAt 升序兜底 → slug 稳定序。
 * 与合集内文章的 compareCollectionPosts 同思路：手动章节序优先，日期只兜底。
 */
export function compareCollections(a: CollectionMeta, b: CollectionMeta): number {
  const oa = a.order ?? Number.MAX_SAFE_INTEGER
  const ob = b.order ?? Number.MAX_SAFE_INTEGER
  if (oa !== ob) return oa - ob
  const da = a.createdAt ?? ''
  const db = b.createdAt ?? ''
  if (da !== db) return da < db ? -1 : 1
  return a.slug < b.slug ? -1 : a.slug > b.slug ? 1 : 0
}

/**
 * 合集列表 → 附带公开文章数、剔除草稿合集、按 compareCollections 排序
 * （order 升序，未排序的合集按 createdAt 兜底）。
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
    .sort(compareCollections)
}
