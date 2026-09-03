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
  /** 封面图 URL（选填）：首页卡片右侧展示；为空时卡片显示「阅读全文」按钮 */
  cover?: string
  /** 草稿：true 时公开侧（列表/RSS/sitemap）不展示，仅后台可编辑，取消即发布 */
  draft?: boolean
  /** 置顶：true 时公开列表中排在未置顶之前（同组内再按 date 倒序） */
  pinned?: boolean
  /** 所属合集 slug（collections/ 下某合集文件名，必填） */
  collection?: string
  /** 合集内序号（从 1 起，服务端保存时自动分配，追加到合集末尾） */
  order?: number
}

/** 合集文件的 frontmatter（docs/collections/<slug>.md）。 */
export interface CollectionFrontmatter {
  title: string
  /** 简介：合集卡片与详情页头部展示 */
  description?: string
  cover?: string
  /** 草稿合集不进入首页与动态路由 */
  draft?: boolean
  /** YYYY-MM-DD，创建日期（决定合集展示顺序） */
  createdAt?: string
}

export const DATE_PATTERN = /^\d{4}-\d{2}-\d{2}$/

export function isValidDate(date: unknown): boolean {
  return typeof date === 'string' && DATE_PATTERN.test(date)
}

export interface FrontmatterParseResult<T = PostFrontmatter> {
  frontmatter: Partial<T> | null
  /** 正文（不含 frontmatter 区块，去掉与区块之间的前导空行） */
  body: string
}

const FM_SEPARATOR = '---'

/** 从全文提取 frontmatter 与正文；无有效区块则 frontmatter 为 null、body 为原文。 */
export function extractFrontmatter<T = PostFrontmatter>(raw: string): FrontmatterParseResult<T> {
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

  let frontmatter: Partial<T> | null = null
  try {
    const parsed = yamlLoad(yamlLines.join('\n'))
    frontmatter = parsed && typeof parsed === 'object' ? (parsed as Partial<T>) : null
  } catch {
    frontmatter = null
  }

  return { frontmatter, body }
}

/** 序列化一个 frontmatter 对象为 YAML 区块（含 `---` 包裹，字段顺序稳定）。 */
export function serializeFrontmatter<T extends object>(fm: T): string {
  const dumped = yamlDump(fm, { lineWidth: -1 }).trimEnd()
  return `${FM_SEPARATOR}\n${dumped}\n${FM_SEPARATOR}`
}

/** 拼接完整的 Markdown 文档内容（frontmatter 区块 + 空行 + 正文）。 */
export function buildMarkdown<T extends object>(fm: T, body: string): string {
  return `${serializeFrontmatter(fm)}\n\n${body}`.trimEnd() + '\n'
}