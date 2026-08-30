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
}

export interface PostRecord extends PostMeta {
  body: string
  raw: string
}

const TMP_SUFFIX = '.md.tmp'
const TRASH_DIR = '.trash'

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
}

export class NotFoundError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'NotFoundError'
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