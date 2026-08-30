import { describe, it, expect } from 'vitest'
import { parseAdminRoute } from './routes'

describe('parseAdminRoute', () => {
  it('解析列表/单篇/上传', () => {
    expect(parseAdminRoute('/api/admin/posts')).toEqual({ type: 'list' })
    expect(parseAdminRoute('/api/admin/posts/hello')).toEqual({ type: 'get', slug: 'hello' })
    expect(parseAdminRoute('/api/admin/upload')).toEqual({ type: 'upload' })
  })

  it('同一资源路径按方法区分 get/save/remove', () => {
    expect(parseAdminRoute('/api/admin/posts/hello', 'GET')).toEqual({ type: 'get', slug: 'hello' })
    expect(parseAdminRoute('/api/admin/posts/hello', 'PUT')).toEqual({ type: 'save', slug: 'hello' })
    expect(parseAdminRoute('/api/admin/posts/hello', 'DELETE')).toEqual({ type: 'remove', slug: 'hello' })
  })

  it('未知路径 → notfound', () => {
    expect(parseAdminRoute('/api/admin/posts/a/b')).toEqual({ type: 'notfound' })
    expect(parseAdminRoute('/api/admin/unknown', 'PUT')).toEqual({ type: 'notfound' })
    expect(parseAdminRoute('/api/other')).toEqual({ type: 'notfound' })
  })

  it('解析回收站路由：列表/恢复/彻底删除', () => {
    expect(parseAdminRoute('/api/admin/trash')).toEqual({ type: 'trash-list' })
    expect(parseAdminRoute('/api/admin/trash/bye', 'POST')).toEqual({
      type: 'trash-restore',
      slug: 'bye',
    })
    expect(parseAdminRoute('/api/admin/trash/bye/restore', 'POST')).toEqual({
      type: 'trash-restore',
      slug: 'bye',
    })
    expect(parseAdminRoute('/api/admin/trash/bye', 'DELETE')).toEqual({
      type: 'trash-remove',
      slug: 'bye',
    })
  })
})