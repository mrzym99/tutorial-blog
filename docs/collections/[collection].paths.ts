/**
 * [collection].md 的动态路由 paths：为每个公开合集生成一个页面。
 * 仿 tags/[tag].paths.ts：直接读 collections 目录取合集 slug，草稿合集不生成。
 */
import { promises as fs } from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { extractFrontmatter } from '../.vitepress/lib/frontmatter'

const collectionsDir = path.join(fileURLToPath(new URL('..', import.meta.url)), 'collections')

export default {
  async paths() {
    let entries: string[]
    try {
      entries = await fs.readdir(collectionsDir)
    } catch {
      return []
    }
    const slugs: string[] = []
    for (const name of entries) {
      if (!name.endsWith('.md') || name.startsWith('.')) continue
      const raw = await fs.readFile(path.join(collectionsDir, name), 'utf8')
      const { frontmatter } = extractFrontmatter(raw)
      if (!frontmatter?.title || frontmatter?.draft) continue // 无标题/草稿合集不生成页面
      slugs.push(name.slice(0, -'.md'.length))
    }
    return slugs.map((collection) => ({ params: { collection } }))
  },
}
