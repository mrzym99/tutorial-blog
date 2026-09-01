/**
 * 文章文件存储（Node 侧，仅 dev 加载）。
 * 负责：扫描/读/原子写/删除（移入 .trash）posts/ 目录下的 Markdown 文件。
 * 所有落盘路径先经 slug 校验，防止路径穿越。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { validateSlug } from '../lib/slug'
import {
  extractFrontmatter,
  buildMarkdown,
  type PostFrontmatter,
} from '../lib/frontmatter'

export interface PostMeta {
  slug: string
  title: string
  date: string
  tags?: string[]
  excerpt?: string
  cover?: string
  draft?: boolean
  pinned?: boolean
}

export interface PostRecord extends PostMeta {
  body: string
  raw: string
}

export interface TrashItem {
  slug: string
  title: string
  date: string
  /** 软删除日期（来自回收站文件名后缀），用于排序与恢复 */
  deletedAt: string
  srcName: string
}

const TMP_SUFFIX = '.md.tmp'
const TRASH_DIR = '.trash'
// 回收站文件名规范：<slug>-<YYYY-MM-DD>.md
const TRASH_FILE_PATTERN = /^([^/]+)-(\d{4}-\d{2}-\d{2})\.md$/

export class PostsStore {
  constructor(private readonly postsDir: string) {}

  private postPath(slug: string): string {
    return path.join(this.postsDir, `${slug}.md`)
  }

  private trashDir(): string {
    return path.join(this.postsDir, TRASH_DIR)
  }

  private async ensureBase(): Promise<void> {
    await fs.mkdir(this.postsDir, { recursive: true })
  }

  /** 列出所有文章，按 date 倒序，同日按 slug 升序。 */
  async list(): Promise<PostMeta[]> {
    await this.ensureBase()
    const entries = await fs.readdir(this.postsDir, { withFileTypes: true })
    const metas: PostMeta[] = []
    for (const entry of entries) {
      if (!entry.isFile()) continue
      if (
        !entry.name.endsWith('.md') ||
        entry.name.endsWith(TMP_SUFFIX) ||
        entry.name.startsWith('.')
      )
        continue
      const raw = await fs.readFile(path.join(this.postsDir, entry.name), 'utf8')
      const { frontmatter } = extractFrontmatter(raw)
      if (!frontmatter || !frontmatter.title || !frontmatter.date) continue
      metas.push({
        slug: entry.name.slice(0, -'.md'.length),
        title: frontmatter.title,
        date: frontmatter.date,
        tags: frontmatter.tags,
        excerpt: frontmatter.excerpt,
        cover: frontmatter.cover,
        draft: frontmatter.draft,
        pinned: frontmatter.pinned,
      })
    }
    return metas.sort(
      (a, b) => (a.date > b.date ? -1 : a.date < b.date ? 1 : a.slug < b.slug ? -1 : 1),
    )
  }

  /** 读取单篇文章；不存在返回 null。 */
  async get(slug: string): Promise<PostRecord | null> {
    const checked = assertValidSlug(slug)
    try {
      const raw = await fs.readFile(this.postPath(checked), 'utf8')
      const { frontmatter, body } = extractFrontmatter(raw)
      return {
        slug: checked,
        title: frontmatter?.title ?? '',
        date: frontmatter?.date ?? '',
        tags: frontmatter?.tags,
        excerpt: frontmatter?.excerpt,
        cover: frontmatter?.cover,
        draft: frontmatter?.draft,
        pinned: frontmatter?.pinned,
        body,
        raw,
      }
    } catch (err) {
      if (isENOENT(err)) return null
      throw err
    }
  }

  /** 新建或更新：原子写（先临时文件再 rename），避免 dev 监听读到半截文件。 */
  async save(
    slug: string,
    frontmatter: PostFrontmatter,
    body: string,
  ): Promise<{ slug: string; path: string }> {
    const checked = assertValidSlug(slug)
    await this.ensureBase()
    const content = buildMarkdown(frontmatter, body)
    const target = this.postPath(checked)
    const tmp = path.join(this.postsDir, `.${checked}${TMP_SUFFIX}`)
    await fs.writeFile(tmp, content, 'utf8')
    await fs.rename(tmp, target)
    return { slug: checked, path: target }
  }

  /** 删除：移入 .trash；不存在则抛 NotFoundError。 */
  async remove(slug: string): Promise<void> {
    const checked = assertValidSlug(slug)
    const src = this.postPath(checked)
    try {
      await fs.access(src)
    } catch (err) {
      if (isENOENT(err)) throw new NotFoundError(`文章不存在：${checked}`)
      throw err
    }
    const trash = this.trashDir()
    await fs.mkdir(trash, { recursive: true })
    const today = new Date().toISOString().slice(0, 10)
    const dest = path.join(trash, `${checked}-${today}.md`)
    await fs.rename(src, dest)
  }

  /** 列出回收站中的软删除文章，每 slug 一行（保留最新一条），按删除时间倒序。 */
  async listTrash(): Promise<TrashItem[]> {
    let entries: string[]
    try {
      entries = await fs.readdir(this.trashDir())
    } catch (err) {
      if (isENOENT(err)) return []
      throw err
    }
    const bySlug = new Map<string, TrashItem>()
    for (const name of entries) {
      const m = TRASH_FILE_PATTERN.exec(name)
      if (!m) continue
      const slug = m[1]
      const deletedAt = m[2]
      const prev = bySlug.get(slug)
      if (prev && prev.deletedAt >= deletedAt) continue // 保留最新一次软删除
      const raw = await fs.readFile(path.join(this.trashDir(), name), 'utf8')
      const { frontmatter } = extractFrontmatter(raw)
      bySlug.set(slug, {
        slug,
        title: frontmatter?.title ?? slug,
        date: frontmatter?.date ?? '',
        deletedAt,
        srcName: name,
      })
    }
    return [...bySlug.values()].sort((a, b) => {
      if (a.deletedAt !== b.deletedAt) return a.deletedAt < b.deletedAt ? 1 : -1
      return a.slug < b.slug ? -1 : 1 // 同日按 slug 升序，保证稳定
    })
  }

  /** 恢复软删除文章（最新一次）：移回 posts/<slug>.md；已存在同名则抛 ConflictError。 */
  async restore(slug: string): Promise<{ slug: string; path: string }> {
    const checked = assertValidSlug(slug)
    const target = this.postPath(checked)
    try {
      await fs.access(target)
      throw new ConflictError(`已存在同名文章「${checked}」，请先重命名或删除当前文章`)
    } catch (err) {
      if (err instanceof ConflictError) throw err
      if (!isENOENT(err)) throw err
    }
    const src = await this.newestTrashFile(checked)
    if (!src) throw new NotFoundError(`回收站中没有「${checked}」`)
    await this.ensureBase()
    await fs.rename(path.join(this.trashDir(), src), target)
    return { slug: checked, path: target }
  }

  /** 彻底删除该 slug 的全部回收站文件（不再可恢复）。 */
  async permanentRemove(slug: string): Promise<void> {
    const checked = assertValidSlug(slug)
    const files = await this.trashFilesFor(checked)
    if (files.length === 0) throw new NotFoundError(`回收站中没有「${checked}」`)
    for (const f of files) {
      await fs.rm(path.join(this.trashDir(), f), { force: true })
    }
  }

  /** 该 slug 在回收站中删除时间最新的一条文件名；无则 null。 */
  private async newestTrashFile(slug: string): Promise<string | null> {
    const files = await this.trashFilesFor(slug)
    if (files.length === 0) return null
    return files.sort((a, b) => (a > b ? -1 : a < b ? 1 : 0))[0]
  }

  /** 该 slug 在回收站中的全部文件名（按下划线名倒序）。 */
  private async trashFilesFor(slug: string): Promise<string[]> {
    let entries: string[]
    try {
      entries = await fs.readdir(this.trashDir())
    } catch (err) {
      if (isENOENT(err)) return []
      throw err
    }
    return entries.filter((name) => TRASH_FILE_PATTERN.test(name) && slugFromTrashName(name) === slug)
  }
}

/** 从回收站文件名解析 slug（去掉 `-YYYY-MM-DD.md` 后缀）。 */
function slugFromTrashName(name: string): string {
  const m = TRASH_FILE_PATTERN.exec(name)
  return m ? m[1] : name
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
  }
}

export class ConflictError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'ConflictError'
  }
}

function assertValidSlug(slug: string): string {
  const result = validateSlug(slug)
  if (!result.ok) throw new Error(result.error)
  return result.slug
}

function isENOENT(err: unknown): boolean {
  return (
    typeof err === 'object' &&
    err !== null &&
    (err as NodeJS.ErrnoException).code === 'ENOENT'
  )
}