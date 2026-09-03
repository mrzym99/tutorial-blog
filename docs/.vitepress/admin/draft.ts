/**
 * 后台草稿类型与工具：AdminApp（列表页）与 AdminEditorView（编辑页）共享，
 * 避免接口在两处各写一份、改字段时漏更新。
 */

export interface DraftFrontmatter {
  title: string
  date: string
  tags: string[]
  excerpt: string
  cover: string
  draft: boolean
  pinned: boolean
  /** 所属合集 slug（必填，「先有合集才有文章」） */
  collection: string
  /** 合集内序号（服务端保存时自动分配，编辑器只读展示） */
  order?: number
}

export interface Draft {
  slug: string
  frontmatter: DraftFrontmatter
  body: string
}

/** sessionStorage 中转 key：列表页写入草稿，编辑页读取并回写 */
export const DRAFT_KEY = 'admin-draft'

export function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}
