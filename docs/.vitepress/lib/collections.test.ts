import { describe, it, expect } from 'vitest'
import { aggregateCollections, compareCollections, type CollectionMeta } from './collections'
import type { PostMeta } from './tags'

function meta(partial: Partial<CollectionMeta> & { slug: string }): CollectionMeta {
  return { title: partial.slug, ...partial }
}

function post(partial: Partial<PostMeta> & { slug: string }): PostMeta {
  return { title: partial.slug, date: '2026-01-01', ...partial } as PostMeta
}

describe('compareCollections', () => {
  it('order 升序，未设置 order 的排最后', () => {
    const a = meta({ slug: 'a', order: 2 })
    const b = meta({ slug: 'b', order: 1 })
    const c = meta({ slug: 'c' }) // 无 order
    const d = meta({ slug: 'd' })
    expect([a, c, b, d].sort(compareCollections).map((x) => x.slug)).toEqual(['b', 'a', 'c', 'd'])
  })

  it('order 相同（都未设置）时按 createdAt 升序兜底', () => {
    const late = meta({ slug: 'late', createdAt: '2026-06-01' })
    const early = meta({ slug: 'early', createdAt: '2026-01-01' })
    expect([late, early].sort(compareCollections).map((x) => x.slug)).toEqual(['early', 'late'])
  })

  it('order 与 createdAt 都缺失时按 slug 稳定排序', () => {
    const b = meta({ slug: 'b' })
    const a = meta({ slug: 'a' })
    expect([b, a].sort(compareCollections).map((x) => x.slug)).toEqual(['a', 'b'])
  })
})

describe('aggregateCollections', () => {
  const posts = [
    post({ slug: 'p1', collection: 'a' }),
    post({ slug: 'p2', collection: 'a' }),
    post({ slug: 'p3', collection: 'b' }),
  ]

  it('附文章数、剔除草稿、按 order 升序', () => {
    const result = aggregateCollections(
      [meta({ slug: 'b', order: 2 }), meta({ slug: 'a', order: 1 }), meta({ slug: 'd', draft: true })],
      posts,
    )
    expect(result.map((c) => c.slug)).toEqual(['a', 'b'])
    expect(result[0].count).toBe(2)
    expect(result[1].count).toBe(1)
  })

  it('未排序的合集按 createdAt 兜底排在已排序之后', () => {
    const result = aggregateCollections(
      [
        meta({ slug: 'old', createdAt: '2025-01-01' }),
        meta({ slug: 'new', createdAt: '2026-01-01' }),
        meta({ slug: 'fixed', order: 1 }),
      ],
      posts,
    )
    expect(result.map((c) => c.slug)).toEqual(['fixed', 'old', 'new'])
  })
})
