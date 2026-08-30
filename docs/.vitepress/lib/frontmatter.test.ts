import { describe, it, expect } from 'vitest'
import {
  extractFrontmatter,
  serializeFrontmatter,
  buildMarkdown,
  isValidDate,
  type PostFrontmatter,
} from './frontmatter'

describe('extractFrontmatter', () => {
  it('解析含 frontmatter 的文档', () => {
    const raw = `---
title: 我的第一篇文章
date: 2026-08-27
tags:
  - 前端
  - Vue
excerpt: 这是一句摘要
---

正文第一行

**加粗** 标题二
`
    const { frontmatter, body } = extractFrontmatter(raw)
    expect(frontmatter).toEqual({
      title: '我的第一篇文章',
      date: '2026-08-27',
      tags: ['前端', 'Vue'],
      excerpt: '这是一句摘要',
    })
    expect(body).toContain('正文第一行')
    expect(body).toContain('**加粗**')
  })

  it('无 frontmatter 的文档返回 null 与全文', () => {
    const raw = '只有正文，没有头部\n第二行'
    const { frontmatter, body } = extractFrontmatter(raw)
    expect(frontmatter).toBeNull()
    expect(body).toBe(raw)
  })

  it('未闭合的 frontmatter 区块视作无 frontmatter', () => {
    const raw = '---\ntitle: 没闭合'
    const { frontmatter, body } = extractFrontmatter(raw)
    expect(frontmatter).toBeNull()
    expect(body).toBe(raw)
  })

  it('frontmatter 后空两行也能正确切分正文', () => {
    const raw = '---\ntitle: 测试\n---\n\n\n\n正文'
    const { frontmatter, body } = extractFrontmatter(raw)
    expect(frontmatter?.title).toBe('测试')
    expect(body).toBe('正文')
  })
})

describe('serializeFrontmatter / roundtrip', () => {
  it('序列化后再解析往返一致', () => {
    const fm: PostFrontmatter = {
      title: '中文标题 & 特殊字符',
      date: '2026-08-27',
      tags: ['a', 'b', '前端'],
      excerpt: '摘要含 : 冒号和 # 井号',
    }
    const yaml = serializeFrontmatter(fm)
    const { frontmatter } = extractFrontmatter(yaml)
    expect(frontmatter).toEqual(fm)
  })

  it('字段顺序稳定（title → date → tags → excerpt）', () => {
    const yaml = serializeFrontmatter({
      title: 'T',
      date: '2026-01-01',
      tags: ['x'],
      excerpt: 'e',
    })
    const titles = ['title:', 'date:', 'tags:', 'excerpt:']
    let prev = -1
    for (const t of titles) {
      const idx = yaml.indexOf(t)
      expect(idx).toBeGreaterThan(prev)
      prev = idx
    }
  })

  it('缺失可选字段不报错', () => {
    const fm: PostFrontmatter = { title: '无标签', date: '2026-01-01' }
    const { frontmatter } = extractFrontmatter(serializeFrontmatter(fm))
    expect(frontmatter?.tags).toBeUndefined()
    expect(frontmatter?.excerpt).toBeUndefined()
  })
})

describe('isValidDate', () => {
  it('只接受 YYYY-MM-DD', () => {
    expect(isValidDate('2026-08-27')).toBe(true)
    expect(isValidDate('2026-8-27')).toBe(false)
    expect(isValidDate('20260827')).toBe(false)
    expect(isValidDate('')).toBe(false)
    expect(isValidDate(null)).toBe(false)
  })
})

describe('buildMarkdown', () => {
  it('拼接 frontmatter 区块与正文，末尾单个换行结尾', () => {
    const fm: PostFrontmatter = { title: 'T', date: '2026-01-01' }
    const md = buildMarkdown(fm, '正文')
    expect(md.startsWith('---\ntitle: T\n')).toBe(true)
    expect(md.endsWith('\n\n正文\n')).toBe(true)
    // 可再次解析还原
    expect(extractFrontmatter(md).frontmatter?.title).toBe('T')
    expect(extractFrontmatter(md).body).toBe('正文')
  })
})