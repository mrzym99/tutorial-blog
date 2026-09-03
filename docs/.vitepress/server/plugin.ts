/**
 * VitePress dev 插件：在 dev server 上注册 /api/admin/* 中间件。
 * 仅 dev 形态加载；build 产物不包含（无此插件 → 静态托管下自然 404）。
 */
import type { Plugin } from 'vite'
import path from 'node:path'
import { PostsStore } from './posts-store'
import { CollectionsStore } from './collections-store'
import { handleAdminRequest, ADMIN_PREFIX, type Uploader } from './routes'

export interface AdminPluginOptions {
  postsDir: string
  /** 合集目录（docs/collections）；未传时按 postsDir 同级的 collections 目录处理 */
  collectionsDir?: string
  /** COS 上传器；未配置时为 null（上传接口 503） */
  uploader?: Uploader | null
}

export function adminPlugin(opts: AdminPluginOptions): Plugin {
  return {
    name: 'tutorial-blog-admin-dev',
    configureServer(server) {
      const store = new PostsStore(opts.postsDir)
      const collectionsDir = opts.collectionsDir ?? path.join(opts.postsDir, '..', 'collections')
      const collections = new CollectionsStore(collectionsDir)
      server.middlewares.use((req, res, next) => {
        if (!(req.url ?? '').startsWith(ADMIN_PREFIX)) return next()
        // 已由 handler 写响应；出错则交给 connect 兜底
        handleAdminRequest(req, res, { store, collections, uploader: opts.uploader }).catch(next)
      })
    },
  }
}
