import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { PostsStore, NotFoundError } from './posts-store'

let dir: string
let store: PostsStore

function fm(frontmatter: Record<string, unknown>) {
  return frontmatter as any
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'posts-store-'))
  store = new PostsStore(dir)
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('list', () => {
  it('列出文章并按日期倒序（同日按 slug 升序）', async () => {
    await store.save('b-old', fm({ title: '旧', date: '2026-01-01' }), 'b')
    await store.save('a-mid', fm({ title: '中', date: '2026-06-01' }), 'a')
    await store.save('c-new', fm({ title: '新', date: '2026-08-27' }), 'c')
    const list = await store.list()
    expect(list.map((l) => l.slug)).toEqual(['c-new', 'a-mid', 'b-old'])
  })

  it('跳过 .trash 目录、临时文件与非 .md 文件', async () => {
    await store.save('post', fm({ title: 'T', date: '2026-01-01' }), 'x')
    await fs.mkdir(path.join(dir, '.trash'), { recursive: true })
    await fs.writeFile(path.join(dir, '.trash', 'stale-2026-01-01.md'), '---\ntitle: x\n---', 'utf8')
    await fs.writeFile(path.join(dir, '.draft.md.tmp'), '--', 'utf8')
    await fs.writeFile(path.join(dir, 'notes.txt'), 'n', 'utf8')
    expect((await store.list()).map((l) => l.slug)).toEqual(['post'])
  })
})

describe('get', () => {
  it('读取单篇，返回 frontmatter 与正文', async () => {
    await store.save('hello', fm({ title: '你好', date: '2026-08-27' }), '正文内容')
    const rec = await store.get('hello')
    expect(rec).not.toBeNull()
    expect(rec?.title).toBe('你好')
    expect(rec?.date).toBe('2026-08-27')
    expect(rec?.body).toBe('正文内容')
  })

  it('不存在的 slug 返回 null', async () => {
    expect(await store.get('none')).toBeNull()
  })

  it('非法 slug 直接抛错（防路径穿越）', async () => {
    await expect(store.get('../escape')).rejects.toThrow()
    await expect(store.get('a/b')).rejects.toThrow()
  })
})

describe('save', () => {
  it('新建：文件落盘且内容正确', async () => {
    await store.save('guide', fm({ title: '指南', date: '2026-08-01', tags: ['前端'] }), '## 段落')
    const raw = await fs.readFile(path.join(dir, 'guide.md'), 'utf8')
    expect(raw).toContain('title: 指南')
    expect(raw).toContain('2026-08-01')
    expect(raw).toContain('## 段落')
  })

  it('更新：覆盖既存文件', async () => {
    await store.save('g', fm({ title: 'V1', date: '2026-01-01' }), '旧')
    await store.save('g', fm({ title: 'V2', date: '2026-01-02', excerpt: '新摘要' }), '新')
    const rec = await store.get('g')
    expect(rec?.title).toBe('V2')
    expect(rec?.excerpt).toBe('新摘要')
    expect(rec?.body).toBe('新')
  })

  it('原子写：无 .tmp 残留', async () => {
    await store.save('atomic', fm({ title: 'A', date: '2026-01-01' }), 'x')
    const leftovers = (await fs.readdir(dir)).filter((f) => f.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })
})

describe('remove', () => {
  it('删除进入 .trash 且原路径消失', async () => {
    await store.save('bye', fm({ title: 'B', date: '2026-01-01' }), 'x')
    await store.remove('bye')
    await expect(fs.access(path.join(dir, 'bye.md'))).rejects.toThrow()
    const trash = await fs.readdir(path.join(dir, '.trash'))
    expect(trash.some((f) => f.startsWith('bye-'))).toBe(true)
  })

  it('删除不存在的文章抛 NotFoundError', async () => {
    await expect(store.remove('missing')).rejects.toBeInstanceOf(NotFoundError)
  })

  it('非法 slug 删除被拒绝', async () => {
    await expect(store.remove('../../etc')).rejects.toThrow()
  })
})