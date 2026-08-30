import { describe, it, expect } from 'vitest'
import { isValidSlug, validateSlug, titleToSlug } from './slug'

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

describe('titleToSlug', () => {
  it('英文转小写并将空白转连字符', () => {
    expect(titleToSlug('Hello World')).toBe('hello-world')
  })

  it('保留中文，剔除其它非法字符', () => {
    expect(titleToSlug('前端 教程')).toBe('前端-教程')
    expect(titleToSlug('Hello, World!?')).toBe('hello-world')
  })

  it('合并连续连字符、去除首尾连字符', () => {
    expect(titleToSlug('  A  B  C  ')).toBe('a-b-c')
    expect(titleToSlug('---leading---')).toBe('leading')
  })

  it('空结果回退为 untitled', () => {
    expect(titleToSlug('   ')).toBe('untitled')
    expect(titleToSlug('!!!')).toBe('untitled')
  })

  it('生成的 slug 总是合法', () => {
    for (const t of ['Hello World', 'Vue.js 3 教程', '   ', 'A/B/C 测试'])
      expect(isValidSlug(titleToSlug(t))).toBe(true)
  })
})