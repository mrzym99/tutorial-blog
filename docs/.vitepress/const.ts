/**
 * 站点共享常量：config 与主题组件共同引用（改域名/评论参数只动这里）。
 * 以下三项均为"占位符"，上线前需替换为真实值（来源见各段注释）。
 */

/**
 * 站点信息（SITE）：
 * - title / description：站点标题与描述（同步影响 RSS <channel> 与 sitemap）。
 * - url：**部署后的线上域名**，请替换为你的 Cloudflare Pages 域名
 *   （如 `https://tutorial-blog.pages.dev`）。RSS <link>、sitemap <loc> 基于它拼出
 *   每篇文章的规范地址，务必以 `https://` 开头、结尾不要带斜杠。
 */
export const SITE = {
  title: '教程博客',
  description: '记录前端与工程实践的教程文章',
  // TODO: 替换为你的线上域名（RSS 与部署后规范化地址会用到）
  url: 'https://example.com',
} as const

/**
 * Giscus 评论参数（GISCUS）：
 * 在 https://giscus.app 选择你的 GitHub 仓库，填写条件后会自动生成一段 <script>，
 * 把其中的 data-repo / data-repo-id / data-category / data-category-id 抄到这里。
 *
 * 前提：该仓库需已开启 "Discussions"（Settings → Features → Discussions ✓）。
 * - repo：仓库名，格式 `owner/repo`（与 GitHub 地址一致）。
 * - repoId：仓库的 graphql id（giscus.app 会给）。
 * - category：讨论分类名，默认 `Announcements`；categoryId 是其对应 id。
 * 填好后评论区即可在文章页底部生效。
 */
export const GISCUS = {
  repo: 'owner/repo',
  repoId: '',
  category: 'Announcements',
  categoryId: '',
  mapping: 'pathname',
} as const

/**
 * 图床上传（腾讯云 COS）：
 * 密钥等配置读自项目根 `.env.local`（.gitignore 忽略，不进 Git/构建产物）。
 * 通过在 .env.local 设置以下变量启用（详见 .env.example）：
 *   COS_SECRET_ID / COS_SECRET_KEY / COS_BUCKET / COS_REGION / COS_DOMAIN
 * 上传复用你自己的备案域名出图（COS_DOMAIN），未配置时后台上传返回 503。
 */