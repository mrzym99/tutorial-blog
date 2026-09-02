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
 * 新文章 slug：由系统生成 UUID v4，用户不参与定义。
 * UUID 仅含小写十六进制与 `-`，天然满足 SLUG_PATTERN（合法且防路径穿越）。
 */
export function newSlug(): string {
  return crypto.randomUUID()
}