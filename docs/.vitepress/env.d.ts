/// <reference types="vite/client" />

// 让 TS 识别 .vue 单文件组件的默认导出（Volar 在编辑器内做精确类型检查，
// 这里为 tsc 等纯 TS 工具链提供兜底声明）。
declare module '*.vue' {
  import type { DefineComponent } from 'vue'
  const component: DefineComponent<Record<string, never>, Record<string, never>, unknown>
  export default component
}
