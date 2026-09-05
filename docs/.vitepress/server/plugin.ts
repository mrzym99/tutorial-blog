/**
 * VitePress dev 插件：在 dev server 上注册 /api/admin/* 中间件。
 * 仅 dev 形态加载；build 产物不包含（无此插件 → 静态托管下自然 404）。
 */
import type { Plugin } from 'vite'
import path from 'node:path'
import { utimesSync } from 'node:fs'
import { PostsStore } from './posts-store'
import { CollectionsStore } from './collections-store'
import { handleAdminRequest, ADMIN_PREFIX, type Uploader } from './routes'

export interface AdminPluginOptions {
  postsDir: string
  /** 合集目录（docs/collections）；未传时按 postsDir 同级的 collections 目录处理 */
  collectionsDir?: string
  /** COS 上传器；未配置时为 null（上传接口 503） */
  uploader?: Uploader | null
  /**
   * VitePress 配置文件路径。侧栏由 config 构建期扫描 frontmatter 生成，
   * 后台写入影响侧栏的数据后需要让侧栏重建；此文件用于兜底 touch 触发自动重启。
   */
  configFile?: string
  /**
   * 重建合集侧栏（config.mts 传入 buildCollectionSidebar 的绑定）。
   * 侧栏更新优先走 siteData HMR（不刷新页面），失败再 touch 重启兜底。
   */
  buildSidebar?: () => unknown
}

const SITE_DATA_REQUEST_PATH = '/@siteData'

export function adminPlugin(opts: AdminPluginOptions): Plugin {
  return {
    name: 'tutorial-blog-admin-dev',
    configureServer(server) {
      const store = new PostsStore(opts.postsDir)
      const collectionsDir = opts.collectionsDir ?? path.join(opts.postsDir, '..', 'collections')
      const collections = new CollectionsStore(collectionsDir)

      // 兜底：touch 配置文件让 VitePress 走自带的「config 变更 → 重启」流程（整页刷新）
      const touchConfig = () => {
        if (!opts.configFile) return false
        try {
          const now = new Date()
          utimesSync(opts.configFile, now, now)
          return true
        } catch {
          return false
        }
      }

      /**
       * 首选：siteData HMR。VitePress 的 @siteData 虚拟模块 load 时读的是
       * config.site 这个活对象，且客户端注册了 hot.accept('/@siteData')——
       * 原地替换 themeConfig.sidebar 再推一条 update，前台侧栏响应式更新，页面不刷新。
       */
      const hmrSidebar = async (): Promise<boolean> => {
        if (!opts.buildSidebar) return false
        const site = (server.config as { vitepress?: { site?: { themeConfig?: object } } })
          .vitepress?.site
        if (!site?.themeConfig) return false
        const mod =
          server.moduleGraph.getModuleById(SITE_DATA_REQUEST_PATH) ??
          (await server.moduleGraph.getModuleByUrl(SITE_DATA_REQUEST_PATH))
        if (!mod) return false
        // 客户端 fetchUpdate 按「注册 accept 的模块」（vitepress client 的 data.js）查回调表，
        // 故 payload 的 path 须为 data.js 的浏览器 URL，acceptedPath 才是被替换的 /@siteData
        const owner = [...mod.importers].find((i) => i.file?.endsWith('client/app/data.js'))
        if (!owner?.url) return false
        site.themeConfig = { ...site.themeConfig, sidebar: opts.buildSidebar() }
        server.moduleGraph.invalidateModule(mod)
        server.ws.send({
          type: 'update',
          updates: [
            {
              type: 'js-update',
              path: owner.url,
              acceptedPath: SITE_DATA_REQUEST_PATH,
              timestamp: Date.now(),
              explicitImportRequired: false,
              isWithinCircularImport: false,
            },
          ],
        })
        return true
      }

      // 响应已写完再调用，不影响本次请求
      const onSidebarChange = () => {
        hmrSidebar()
          .then((ok) => {
            if (!ok) touchConfig()
          })
          .catch(() => touchConfig())
      }

      server.middlewares.use((req, res, next) => {
        if (!(req.url ?? '').startsWith(ADMIN_PREFIX)) return next()
        // 已由 handler 写响应；出错则交给 connect 兜底
        handleAdminRequest(req, res, { store, collections, uploader: opts.uploader, onSidebarChange }).catch(next)
      })
    },
  }
}
