/** 站点共享常量：config 与主题组件共同引用（改域名/评论参数只动这里）。 */

export const SITE = {
  title: '教程博客',
  description: '记录前端与工程实践的教程文章',
  // TODO: 替换为你的线上域名（RSS 与部署后规范化地址会用到）
  url: 'https://example.com',
} as const

/** Giscus 评论参数：在 https://giscus.app 按仓库信息生成后回填。 */
export const GISCUS = {
  repo: 'owner/repo',
  repoId: '',
  category: 'Announcements',
  categoryId: '',
  mapping: 'pathname',
} as const