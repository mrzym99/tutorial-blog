/**
 * 站点页脚元信息（ICP 备案号）的客户端访问入口。
 * 实际值由 config.mts 在构建期从环境变量（SITE_ICP）读取，
 * 经 vite define 以全局常量 __SITE_ICP__ 注入，未配置时为空串。
 */
declare const __SITE_ICP__: string;

export const SITE_ICP: string = typeof __SITE_ICP__ !== "undefined" ? __SITE_ICP__ : "";

/**
 * 作者信息（首页右侧信息栏）。公开信息、单作者，故直接写在这里而非环境变量：
 * 改名字/简介/头像/链接只动这一处。avatar 留空时用姓名首字色块占位。
 * 内容与 docs/about.md 保持一致。
 */
export interface SiteAuthor {
  name: string;
  bio: string;
  avatar: string;
  links: { label: string; href: string }[];
}

export const SITE_AUTHOR: SiteAuthor = {
  name: "小张",
  bio: "前端开发攻城狮",
  // 默认用 GitHub 头像；想换成本地图床地址直接替换即可
  avatar: "https://github.com/mrzym99.png",
  links: [
    { label: "GitHub", href: "https://github.com/mrzym99" },
    { label: "邮箱", href: "mailto:2715158815@qq.com" },
  ],
};
