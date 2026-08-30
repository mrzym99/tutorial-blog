import { describe, it, expect } from 'vitest'
import { aggregateTags, postsByTag, comparePosts, type PostMeta } from './tags'

function post(p: Partial<PostMeta>): PostMeta {
  return {
    slug: 'x',
    title: 'X',
    date: '2026-01-01',
    tags: [],
    ...p,
  }
}

const posts: PostMeta[] = [
  post({ slug: 'a', tags: ['前端', 'Vue'], date: '2026-01-02' }),
  post({ slug: 'b', tags: ['前端'] }),
  post({ slug: 'c', tags: ['Vue', 'React'] }),
  post({ slug: 'd', tags: [] }),
  post({ slug: 'e', tags: ['前端', 'Vue', '前端'] }), // 重复标签同篇文章内
]

describe('aggregateTags', () => {
  it('统计标签出现次数', () => {
    const result = aggregateTags(posts)
    const by = Object.fromEntries(result.map((r) => [r.tag, r.count]))
    expect(by['前端']).toBe(3)
    expect(by['Vue']).toBe(3)
    expect(by['React']).toBe(1)
  })

  it('无标签文章不产生统计条目', () => {
    const result = aggregateTags([post({ tags: [] })])
    expect(result).toEqual([])
  })

  it('空数组返回空', () => {
    expect(aggregateTags([])).toEqual([])
  })

  it('按标签名以 code-unit 排序（确定、跨环境稳定）', () => {
    const result = aggregateTags(posts)
    expect(result.map((r) => r.tag)).toEqual(['React', 'Vue', '前端'])
  })
})

describe('postsByTag', () => {
  it('只含命中标签的文章并按日期倒序', () => {
    const result = postsByTag(posts, 'Vue')
    expect(result.map((p) => p.slug)).toEqual(['a', 'c', 'e'])
  })

  it('无命中的标签返回空数组', () => {
    expect(postsByTag(posts, '不存在的')).toEqual([])
  })

  it('同标签内置顶优先于日期倒序', () => {
    const result = postsByTag(
      [
        post({ slug: 'newer', date: '2026-03-01', tags: ['t'] }),
        post({ slug: 'pinned', date: '2026-01-01', tags: ['t'], pinned: true }),
      ],
      't',
    )
    expect(result.map((p) => p.slug)).toEqual(['pinned', 'newer'])
  })
})

describe('comparePosts', () => {
  it('置顶优先，再按 date 倒序，同日按 slug 升序', () => {
    const list = [
      post({ slug: 'c', date: '2026-01-01' }),
      post({ slug: 'a', date: '2026-02-01', pinned: true }),
      post({ slug: 'b', date: '2026-03-01' }),
      post({ slug: 'd', date: '2026-03-01' }), // 与 b 同日 → slug 升序
    ].sort(comparePosts)
    expect(list.map((p) => p.slug)).toEqual(['a', 'b', 'd', 'c'])
  })

  it('两个置顶内部仍按日期倒序', () => {
    const list = [
      post({ slug: 'old', date: '2026-01-01', pinned: true }),
      post({ slug: 'new', date: '2026-04-01', pinned: true }),
    ].sort(comparePosts)
    expect(list.map((p) => p.slug)).toEqual(['new', 'old'])
  })
})