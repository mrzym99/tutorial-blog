import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { parseAdminRoute, handleAdminRequest } from './routes'
import { PostsStore } from './posts-store'
import { CollectionsStore } from './collections-store'

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

  it('解析合集路由：列表/新建/单篇/保存/删除', () => {
    expect(parseAdminRoute('/api/admin/collections')).toEqual({ type: 'collection-list' })
    expect(parseAdminRoute('/api/admin/collections', 'POST')).toEqual({ type: 'collection-create' })
    expect(parseAdminRoute('/api/admin/collections/c1')).toEqual({
      type: 'collection-get',
      slug: 'c1',
    })
    expect(parseAdminRoute('/api/admin/collections/c1', 'PUT')).toEqual({
      type: 'collection-save',
      slug: 'c1',
    })
    expect(parseAdminRoute('/api/admin/collections/c1', 'DELETE')).toEqual({
      type: 'collection-remove',
      slug: 'c1',
    })
  })
})
// ---------- handleAdminRequest 集成（真实 store + mock req/res） ----------

let postsDir: string
let collectionsDir: string
let store: PostsStore
let collections: CollectionsStore

beforeEach(async () => {
  postsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'routes-posts-'))
  collectionsDir = await fs.mkdtemp(path.join(os.tmpdir(), 'routes-collections-'))
  store = new PostsStore(postsDir)
  collections = new CollectionsStore(collectionsDir)
})
afterEach(async () => {
  await fs.rm(postsDir, { recursive: true, force: true })
  await fs.rm(collectionsDir, { recursive: true, force: true })
})

function mockReq(url: string, method = 'GET', body?: unknown) {
  const data = body === undefined ? [] : [Buffer.from(JSON.stringify(body))]
  return {
    url,
    method,
    headers: {},
    [Symbol.asyncIterator]: async function* () {
      yield* data
    },
  } as any
}

function mockRes() {
  const res: any = {
    statusCode: 0,
    body: '',
    setHeader() {},
    end(chunk?: unknown) {
      if (chunk) this.body += String(chunk)
    },
  }
  return res
}

async function request(url: string, method = 'GET', body?: unknown) {
  const res = mockRes()
  await handleAdminRequest(mockReq(url, method, body), res, { store, collections })
  return { status: res.status, statusCode: res.statusCode, json: res.body ? JSON.parse(res.body) : null }
}

describe('handleAdminRequest：文章保存的 order 分配', () => {
  it('新建文章自动追加 order（1、2），换合集后重新从 1 计数', async () => {
    await collections.create({ title: '合集A' } as any)
    await collections.create({ title: '合集B' } as any)
    const [a, b] = (await collections.list()).map((c) => c.slug)

    const save = (slug: string, collection: string) =>
      request(`/api/admin/posts/${slug}`, 'PUT', {
        frontmatter: { title: slug, date: '2026-08-27', collection },
        body: '正文',
      })

    expect((await save('p1', a)).statusCode).toBe(200)
    expect((await save('p2', a)).statusCode).toBe(200)
    const p1 = await store.get('p1')
    const p2 = await store.get('p2')
    expect(p1?.order).toBe(1)
    expect(p2?.order).toBe(2)

    // p1 换到合集B：order 重新分配为 1，合集A 中 p2 不受影响
    expect((await save('p1', b)).statusCode).toBe(200)
    expect((await store.get('p1'))?.order).toBe(1)
    expect((await store.get('p1'))?.collection).toBe(b)
    expect((await store.get('p2'))?.order).toBe(2)
  })

  it('合集不存在时保存返回 400', async () => {
    const res = await request('/api/admin/posts/p', 'PUT', {
      frontmatter: { title: 'T', date: '2026-08-27', collection: 'ghost' },
      body: '正文',
    })
    expect(res.statusCode).toBe(400)
  })

  it('缺少 collection 时保存返回 400', async () => {
    const res = await request('/api/admin/posts/p', 'PUT', {
      frontmatter: { title: 'T', date: '2026-08-27' },
      body: '正文',
    })
    expect(res.statusCode).toBe(400)
  })
})

describe('handleAdminRequest：合集删除约束', () => {
  it('非空合集删除返回 409；清空文章后可删除', async () => {
    await collections.create({ title: 'C' } as any)
    const slug = (await collections.list())[0].slug
    await store.save(slug + '-post', { title: 'P', date: '2026-01-01', collection: slug } as any, 'x')

    const conflict = await request(`/api/admin/collections/${slug}`, 'DELETE')
    expect(conflict.statusCode).toBe(409)

    await store.remove(slug + '-post')
    const ok = await request(`/api/admin/collections/${slug}`, 'DELETE')
    expect(ok.statusCode).toBe(204)
    expect(await collections.get(slug)).toBeNull()
  })

  it('合集新建缺少 title 返回 400', async () => {
    const res = await request('/api/admin/collections', 'POST', {
      frontmatter: { description: '无标题' },
    })
    expect(res.statusCode).toBe(400)
  })

  it('合集新建成功返回生成的 slug', async () => {
    const res = await request('/api/admin/collections', 'POST', {
      frontmatter: { title: '新合集' },
    })
    expect(res.statusCode).toBe(200)
    expect(typeof res.json.slug).toBe('string')
    expect(res.json.slug.length).toBeGreaterThan(0)
  })
})
