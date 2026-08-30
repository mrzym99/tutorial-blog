/**
 * [tag].md 的动态路由 paths：为每个存在的标签生成一个页面。
 * VitePress 约定动态路由需同名伴随文件 `<name>.paths.ts`，`default.paths` 返回
 * `[{ params: { tag } }]`。此处复用 lib/frontmatter 直接读 posts 目录取标签，
 * 与 posts.data.ts 的聚合保持一致。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractFrontmatter } from '../.vitepress/lib/frontmatter'

const postsDir = path.join(fileURLToPath(new URL('..', import.meta.url)), 'posts')

export default {
  async paths() {
    let entries: string[]
    try {
      entries = await fs.readdir(postsDir)
    } catch {
      return []
    }
    const tags = new Set<string>()
    for (const name of entries) {
      if (!name.endsWith('.md') || name.startsWith('.')) continue
      const raw = await fs.readFile(path.join(postsDir, name), 'utf8')
      const { frontmatter } = extractFrontmatter(raw)
      if (frontmatter?.draft) continue // 草稿不生成标签页面
      for (const t of frontmatter?.tags ?? []) tags.add(t)
    }
    return [...tags].map((tag) => ({ params: { tag } }))
  },
}