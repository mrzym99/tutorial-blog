/**
 * 合集文件存储（Node 侧，仅 dev 加载）。
 * 与 PostsStore 同构：docs/collections/<slug>.md，frontmatter 即元数据。
 * 写入复用 buildMarkdown（原子写 .tmp + rename），slug 全部经校验防路径穿越。
 */
import path from 'node:path'
import { promises as fs } from 'node:fs'
import { newSlug, validateSlug } from '../lib/slug'
import {
  buildMarkdown,
  extractFrontmatter,
  type CollectionFrontmatter,
} from '../lib/frontmatter'
import { NotFoundError, isENOENT } from './posts-store'

export type CollectionRecord = CollectionFrontmatter & { slug: string }

const TMP_SUFFIX = '.md.tmp'

export class CollectionsStore {
  constructor(private readonly collectionsDir: string) {}

  private collectionPath(slug: string): string {
    return path.join(this.collectionsDir, `${slug}.md`)
  }

  private async ensureBase(): Promise<void> {
    await fs.mkdir(this.collectionsDir, { recursive: true })
  }

  /** 与 PostsStore.assertValidSlug 同规则：非法 slug 抛错防路径穿越。 */
  private assertValidSlug(slug: string): string {
    const result = validateSlug(slug)
    if (!result.ok) throw new Error(result.error)
    return result.slug
  }

  /** 列出全部合集，按创建日期倒序（新在前），无日期按 slug 稳定排序。 */
  async list(): Promise<CollectionRecord[]> {
    await this.ensureBase()
    const entries = await fs.readdir(this.collectionsDir, { withFileTypes: true })
    const records: CollectionRecord[] = []
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (
        !entry.name.endsWith('.md') ||
        entry.name.endsWith(TMP_SUFFIX) ||
        entry.name.startsWith('.')
      )
        continue
      const raw = await fs.readFile(path.join(this.collectionsDir, entry.name), 'utf8')
      const { frontmatter } = extractFrontmatter<CollectionFrontmatter>(raw)
      if (!frontmatter || !frontmatter.title) continue
      records.push({
        slug: entry.name.slice(0, -'.md'.length),
        title: frontmatter.title,
        description: frontmatter.description,
        cover: frontmatter.cover,
        draft: frontmatter.draft,
        createdAt: frontmatter.createdAt,
      })
    }
    return records.sort((a, b) => {
      const da = a.createdAt ?? ''
      const db = b.createdAt ?? ''
      if (da !== db) return da > db ? -1 : 1
      return a.slug < b.slug ? -1 : 1
    })
  }

  /** 读取单个合集；不存在返回 null。 */
  async get(slug: string): Promise<CollectionRecord | null> {
    const checked = this.assertValidSlug(slug)
    try {
      const raw = await fs.readFile(this.collectionPath(checked), 'utf8')
      const { frontmatter } = extractFrontmatter<CollectionFrontmatter>(raw)
      if (!frontmatter?.title) return null
      return {
        slug: checked,
        title: frontmatter.title,
        description: frontmatter.description,
        cover: frontmatter.cover,
        draft: frontmatter.draft,
        createdAt: frontmatter.createdAt,
      }
    } catch (err) {
      if (isENOENT(err)) return null
      throw err
    }
  }

  /** 新建合集：slug 由系统生成 UUID；createdAt 缺省为今天。返回 slug。 */
  async create(
    frontmatter: CollectionFrontmatter,
  ): Promise<{ slug: string; path: string }> {
    const slug = newSlug()
    await this.ensureBase()
    const fm: CollectionFrontmatter = {
      ...frontmatter,
      createdAt: frontmatter.createdAt ?? new Date().toISOString().slice(0, 10),
    }
    // 原子写：先写临时文件再 rename，避免 dev watcher 读到半截内容
    const tmp = path.join(this.collectionsDir, `.${slug}${TMP_SUFFIX}`)
    await fs.writeFile(tmp, buildMarkdown(fm, ''), 'utf8')
    await fs.rename(tmp, this.collectionPath(slug))
    return { slug, path: this.collectionPath(slug) }
  }

  /**
   * 保存合集元数据（整体覆盖 frontmatter）。
   * createdAt 不在编辑表单里，未携带时保留原值，避免编辑保存后创建日期丢失。
   */
  async save(
    slug: string,
    frontmatter: CollectionFrontmatter,
  ): Promise<{ slug: string; path: string }> {
    const checked = this.assertValidSlug(slug)
    await this.ensureBase()
    let fm = frontmatter
    if (!fm.createdAt) {
      const existing = await this.get(checked)
      if (existing?.createdAt) fm = { ...fm, createdAt: existing.createdAt }
    }
    const tmp = path.join(this.collectionsDir, `.${checked}${TMP_SUFFIX}`)
    await fs.writeFile(tmp, buildMarkdown(fm, ''), 'utf8')
    await fs.rename(tmp, this.collectionPath(checked))
    return { slug: checked, path: this.collectionPath(checked) }
  }

  /** 删除合集（仅允许删除空合集，非空由 routes 层检查后调用）。 */
  async remove(slug: string): Promise<void> {
    const checked = this.assertValidSlug(slug)
    const target = this.collectionPath(checked)
    try {
      await fs.access(target)
    } catch (err) {
      if (isENOENT(err)) throw new NotFoundError(`合集「${checked}」不存在`)
      throw err
    }
    await fs.rm(target, { force: true })
  }
}
