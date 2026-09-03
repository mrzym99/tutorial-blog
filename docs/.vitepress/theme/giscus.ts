/**
 * Giscus 评论配置类型与客户端访问入口。
 * 实际值由 config.mts 在构建期从环境变量（GISCUS_*）读取，
 * 经 vite define 以全局常量 __GISCUS__ 注入，源码中不落任何仓库信息。
 */
export interface GiscusConfig {
  repo: string
  repoId: string
  category: string
  categoryId: string
  mapping: string
}

declare const __GISCUS__: GiscusConfig | null

export const GISCUS: GiscusConfig | null =
  typeof __GISCUS__ !== 'undefined' ? __GISCUS__ : null
