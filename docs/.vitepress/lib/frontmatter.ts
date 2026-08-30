/**
 * Markdown frontmatter 解析 / 序列化（纯函数，无 I/O，便于单测）。
 *
 * 约定 frontmatter 区块位于文档最开头的 `---\n ... \n---` 之间，
 * 用 js-yaml 解析，保持字段顺序稳定输出，便于 diff 与往返一致。
 */
import { load as yamlLoad, dump as yamlDump } from 'js-yaml'

export interface PostFrontmatter {
  title: string
  /** YYYY-MM-DD */
  date: string
  tags?: string[]
  excerpt?: string
  /** 草稿：true 时公开侧（列表/RSS/sitemap）不展示，仅后台可编辑，取消即发布 */
  draft?: boolean
  /** 置顶：true 时公开列表中排在未置顶之前（同组内再按 date 倒序） */
  pinned?: boolean
}

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(date: unknown): boolean {
  return typeof date === 'string' && DATE_PATTERN.test(date)
}

export interface FrontmatterParseResult {
  frontmatter: Partial<PostFrontmatter> | null
  /** 正文（不含 frontmatter 区块，去掉与区块之间的前导空行） */
  body: string
}

const FM_SEPARATOR = '---'

/** 从全文提取 frontmatter 与正文；无有效区块则 frontmatter 为 null、body 为原文。 */
export function extractFrontmatter(raw: string): FrontmatterParseResult {
  const lines = raw.split(/\r?\n/)
  if (lines[0]?.trim() !== FM_SEPARATOR) {
    return { frontmatter: null, body: raw }
  }

  let i = 1
  const yamlLines: string[] = []
  let closed = false
  for (; i < lines.length; i++) {
    if (lines[i].trim() === FM_SEPARATOR) {
      closed = true
      break
    }
    yamlLines.push(lines[i])
  }

  // 未闭合的 frontmatter 区块视作无 frontmatter
  if (!closed) {
    return { frontmatter: null, body: raw }
  }

  const body = lines
    .slice(i + 1)
    .join('\n')
    .replace(/^\n+/, '')
    .replace(/\n+$/, '')

  let frontmatter: Partial<PostFrontmatter> | null = null
  try {
    const parsed = yamlLoad(yamlLines.join('\n'))
    frontmatter =
      parsed && typeof parsed === 'object'
        ? (parsed as Partial<PostFrontmatter>)
        : null
  } catch {
    frontmatter = null
  }

  return { frontmatter, body }
}

/** 序列化一个 frontmatter 对象为 YAML 区块（含 `---` 包裹，字段顺序稳定）。 */
export function serializeFrontmatter(fm: PostFrontmatter): string {
  const dumped = yamlDump(fm, { lineWidth: -1 }).trimEnd()
  return `${FM_SEPARATOR}\n${dumped}\n${FM_SEPARATOR}`
}

/** 拼接完整的 Markdown 文档内容（frontmatter 区块 + 空行 + 正文）。 */
export function buildMarkdown(fm: PostFrontmatter, body: string): string {
  return `${serializeFrontmatter(fm)}\n\n${body}`.trimEnd() + '\n'
}