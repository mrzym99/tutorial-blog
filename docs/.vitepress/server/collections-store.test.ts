import { describe, it, expect, beforeEach, afterEach } from 'vitest'
import { promises as fs } from 'node:fs'
import os from 'node:os'
import path from 'node:path'
import { CollectionsStore } from './collections-store'
import { NotFoundError } from './posts-store'

let dir: string
let store: CollectionsStore

function fm(frontmatter: Record<string, unknown>) {
  return frontmatter as any
}

beforeEach(async () => {
  dir = await fs.mkdtemp(path.join(os.tmpdir(), 'collections-store-'))
  store = new CollectionsStore(dir)
})
afterEach(async () => {
  await fs.rm(dir, { recursive: true, force: true })
})

describe('create / list', () => {
  it('新建合集：生成 slug、补默认 createdAt、文件落盘', async () => {
    const { slug, path: p } = await store.create(fm({ title: '建站实录' }))
    expect(slug).toBeTruthy()
    expect(p).toBe(path.join(dir, `${slug}.md`))
    const raw = await fs.readFile(p, 'utf8')
    expect(raw).toContain('title: 建站实录')
    expect(raw).toMatch(/createdAt: '?\d{4}-\d{2}-\d{2}'?/)
  })

  it('list 列出全部合集并按 createdAt 倒序', async () => {
    await store.create(fm({ title: '旧', createdAt: '2026-01-01' }))
    await store.create(fm({ title: '新', createdAt: '2026-06-01' }))
    await store.create(fm({ title: '今天' })) // 缺省 createdAt = 今天，应排最前
    const list = await store.list()
    expect(list).toHaveLength(3)
    expect(list.map((l) => l.title)).toEqual(['今天', '新', '旧'])
  })

  it('list 跳过临时文件与非 .md 文件', async () => {
    await store.create(fm({ title: '有效' }))
    await fs.writeFile(path.join(dir, '.abc.md.tmp'), '半截', 'utf8')
    await fs.writeFile(path.join(dir, 'notes.txt'), 'n', 'utf8')
    const list = await store.list()
    expect(list).toHaveLength(1)
    expect(list[0].title).toBe('有效')
  })
})

describe('get / save', () => {
  it('get 读取合集元数据，字段往返一致', async () => {
    const { slug } = await store.create(
      fm({ title: '合集', description: '简介', cover: 'https://c/1.png', draft: true }),
    )
    const rec = await store.get(slug)
    expect(rec?.title).toBe('合集')
    expect(rec?.description).toBe('简介')
    expect(rec?.cover).toBe('https://c/1.png')
    expect(rec?.draft).toBe(true)
  })

  it('get 不存在的 slug 返回 null', async () => {
    expect(await store.get('none')).toBeNull()
  })

  it('save 更新已有合集元数据', async () => {
    const { slug } = await store.create(fm({ title: 'V1' }))
    await store.save(slug, fm({ title: 'V2', description: '新简介' }))
    const rec = await store.get(slug)
    expect(rec?.title).toBe('V2')
    expect(rec?.description).toBe('新简介')
  })

  it('原子写：无 .tmp 残留', async () => {
    const { slug } = await store.create(fm({ title: '原子' }))
    await store.save(slug, fm({ title: '原子2' }))
    const leftovers = (await fs.readdir(dir)).filter((f) => f.endsWith('.tmp'))
    expect(leftovers).toEqual([])
  })

  it('非法 slug 抛错（防路径穿越）', async () => {
    await expect(store.get('../escape')).rejects.toThrow()
    await expect(store.save('a/b', fm({ title: 'X' }))).rejects.toThrow()
    await expect(store.remove('../../etc')).rejects.toThrow()
  })
})

describe('remove', () => {
  it('删除存在的合集后 get 返回 null', async () => {
    const { slug } = await store.create(fm({ title: '待删' }))
    await store.remove(slug)
    expect(await store.get(slug)).toBeNull()
  })

  it('删除不存在的合集抛 NotFoundError', async () => {
    await expect(store.remove('missing')).rejects.toBeInstanceOf(NotFoundError)
  })
})
