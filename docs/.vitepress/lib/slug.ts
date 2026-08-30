/**
 * slug 生成与校验（安全关键模块，均有重点单测）。
 *
 * 规则：`^[a-z0-9一-龥_-]+$` —— 仅允许小写字母、数字、中文、连字符 `-`、下划线 `_`。
 * 该字符集不包含 `/ \ . : * ? " < > |`、空格以及 `..`，
 * 因此 `posts/${slug}.md` 这类拼接天然不会被路径穿越逃逸出 `posts/` 目录。
 */

export type SlugResult =
  | { ok: true; slug: string }
  | { ok: false; error: string }

const SLUG_PATTERN = /^[a-z0-9一-龥_-]+$/

/** 是否为合法 slug（不抛错、幂等纯判断）。 */
export function isValidSlug(slug: unknown): boolean {
  return typeof slug === 'string' && SLUG_PATTERN.test(slug)
}

/** 校验并返回带错误信息的 result，供 API 层直接使用。 */
export function validateSlug(slug: unknown): SlugResult {
  if (typeof slug !== 'string' || slug.length === 0) {
    return { ok: false, error: 'slug 不能为空' }
  }
  if (!SLUG_PATTERN.test(slug)) {
    return {
      ok: false,
      error: `slug 含非法字符：${slug}（仅允许小写字母、数字、中文、- 和 _）`,
    }
  }
  return { ok: true, slug }
}

/**
 * 标题 → slug（表单自动生成用，用户可手改）：
 * 英文转小写、任意空白转 `-`、非法字符剔除（中文保留）、连续 `-` 合并、去除首尾 `-`。
 */
export function titleToSlug(title: string): string {
  const slug = title
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '-')
    .replace(/[^a-z0-9一-龥_-]/g, '')
    .replace(/-{2,}/g, '-')
    .replace(/^-+|-+$/g, '')
  return slug || 'untitled'
}