import { describe, it, expect } from 'vitest'
import { isValidSlug, validateSlug, newSlug } from './slug'

describe('isValidSlug / validateSlug', () => {
  it('接受合法 slug：英文小写、中文、数字、连字符、下划线', () => {
    for (const s of [
      'hello-world',
      '前端教程',
      'guide-2024',
      'user_name',
      'a1-_b',
      'react-hooks-深入',
    ]) {
      expect(isValidSlug(s)).toBe(true)
      expect(validateSlug(s)).toEqual({ ok: true, slug: s })
    }
  })

  it('拒绝空串与非法输入', () => {
    expect(isValidSlug('')).toBe(false)
    expect(isValidSlug(null)).toBe(false)
    expect(isValidSlug(undefined)).toBe(false)
    expect(validateSlug('')).toEqual({ ok: false, error: 'slug 不能为空' })

    for (const bad of ['..', '../x', 'a/b', 'a\\b', 'a.b', '/etc/passwd', 'a b', 'UPPER'])
      expect(isValidSlug(bad), `应拒绝: ${JSON.stringify(bad)}`).toBe(false)
  })

  it('validateSlug 返回错误信息（防路径穿越关键）', () => {
    const r = validateSlug('../x')
    if (r.ok) throw new Error('不应通过')
    expect(r.error).toContain('非法字符')
  })
})

describe('newSlug', () => {
  it('生成 UUID v4 且总是合法 slug', () => {
    for (let i = 0; i < 20; i++) {
      const s = newSlug()
      expect(s).toMatch(/^[0-9a-f]{8}-[0-9a-f]{4}-4[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/)
      expect(isValidSlug(s)).toBe(true)
    }
  })

  it('不重复', () => {
    const seen = new Set(Array.from({ length: 100 }, () => newSlug()))
    expect(seen.size).toBe(100)
  })
})