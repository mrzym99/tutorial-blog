import { ref, computed, readonly, onMounted, onBeforeUnmount } from 'vue'
import { darkTheme, type GlobalThemeOverrides } from 'naive-ui'

/**
 * 后台专用的主题状态：跟随 VitePress 的外观切换（<html class="dark">）。
 * naive-ui 和 admin 组件仅在 /admin、/admin-edit 懒加载 chunk 中，
 * 前台博客页面不受影响。
 *
 * 注意：naive-ui 的 themeOverrides 只接受「具体颜色」字符串（内部会用
 * seemly/rgba 做运算），不能直接塞 CSS 变量（var(--vp-c-brand-1)）。
 * 因此这里在运行时用 getComputedStyle 读取 VitePress 变量的实际值。
 */

function readCssVar(name: string): string {
  // SSR（构建期渲染 /admin）时没有 document，直接返回空，由调用方回退
  if (typeof document === 'undefined') return ''
  return getComputedStyle(document.documentElement).getPropertyValue(name).trim()
}

/** 保证返回值是 naive-ui 可用的颜色；解析失败时退回一个固定主色。 */
function resolveColor(name: string, fallback: string): string {
  const raw = readCssVar(name)
  // rgb(...) / rgba(...) / hsl(...) / #hex 都可直接用；留空则用回退值
  if (/^(rgb|rgba|hsl|hsla)\(|^#/.test(raw)) return raw
  // VitePress 变量实际返回的应是如 "#42b883" 或 "rgb(66,184,131)"，否则回退
  return fallback
}

/**
 * 把 primary 相关的颜色合并进 overrides。
 * 供 NConfigProvider 使用。
 */
export function useNaiveTheme() {
  const isDark = ref(false)

  function sync() {
    isDark.value = document.documentElement.classList.contains('dark')
  }

  function onMutation() {
    sync()
  }

  const overrides = ref<GlobalThemeOverrides>(buildOverrides())

  function refreshOverrides() {
    overrides.value = buildOverrides()
  }

  function buildOverrides(): GlobalThemeOverrides {
    const brand = resolveColor('--vp-c-brand-1', isDark.value ? '#4080ff' : '#3b82f6')
    const brandHover = resolveColor('--vp-c-brand-2', brand)
    return {
      common: {
        primaryColor: brand,
        primaryColorHover: brandHover,
        primaryColorPressed: brandHover,
        primaryColorSuppl: brand,
      },
    }
  }

  onMounted(() => {
    sync()
    refreshOverrides()
    // VitePress 在 html 上切 dark class，MutationObserver 跟随
    const observer = new MutationObserver(() => {
      sync()
      refreshOverrides()
    })
    observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })
    onBeforeUnmount(() => observer.disconnect())
  })

  return {
    isDark: readonly(isDark),
    activeTheme: computed(() => (isDark.value ? darkTheme : null)),
    themeOverrides: overrides,
  }
}