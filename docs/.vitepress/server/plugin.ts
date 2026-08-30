/**
 * VitePress dev 插件：在 dev server 上注册 /api/admin/* 中间件。
 * 仅 dev 形态加载；build 产物不包含（无此插件 → 静态托管下自然 404）。
 */
import type { Plugin } from 'vite'
import { PostsStore } from './posts-store'
import { handleAdminRequest, ADMIN_PREFIX } from './routes'

export interface AdminPluginOptions {
  postsDir: string
  /** SMMS_TOKEN，未配置为 '' */
  token: string
}

export function adminPlugin(opts: AdminPluginOptions): Plugin {
  return {
    name: 'tutorial-blog-admin-dev',
    configureServer(server) {
      const store = new PostsStore(opts.postsDir)
      server.middlewares.use((req, res, next) => {
        if (!(req.url ?? '').startsWith(ADMIN_PREFIX)) return next()
        // 已由 handler 写响应；出错则交给 connect 兜底
        handleAdminRequest(req, res, { store, token: opts.token }).catch(next)
      })
    },
  }
}