import { describe, it, expect } from 'vitest'
import { aggregateTags, postsByTag, type PostMeta } from './tags'

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
})