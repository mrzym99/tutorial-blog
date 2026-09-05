/**
 * 站点页脚元信息（ICP 备案号）的客户端访问入口。
 * 实际值由 config.mts 在构建期从环境变量（SITE_ICP）读取，
 * 经 vite define 以全局常量 __SITE_ICP__ 注入，未配置时为空串。
 */
declare const __SITE_ICP__: string;

export const SITE_ICP: string = typeof __SITE_ICP__ !== "undefined" ? __SITE_ICP__ : "";
