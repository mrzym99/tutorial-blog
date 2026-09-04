<script setup lang="ts">
import { onMounted, onBeforeUnmount, watch } from 'vue'
import { useData } from 'vitepress'
import { GISCUS } from '../giscus'

const { page } = useData()

const CONTAINER_ID = 'giscus-comments'

// 按当前页面 SPA 路由重建 Giscus；卸载时清理，避免重复加载
function mount() {
  const container = document.getElementById(CONTAINER_ID)
  // GISCUS 为 null 表示环境变量（GISCUS_*）未配置齐备，不渲染评论区
  if (!container || !GISCUS) return
  container.innerHTML = ''

  const theme = getPreferredTheme()
  const iframeScript = document.createElement('script')
  iframeScript.src = 'https://giscus.app/client.js'
  iframeScript.async = true
  iframeScript.crossOrigin = 'anonymous'
  iframeScript.setAttribute('data-repo', GISCUS.repo)
  iframeScript.setAttribute('data-repo-id', GISCUS.repoId)
  iframeScript.setAttribute('data-category', GISCUS.category)
  iframeScript.setAttribute('data-category-id', GISCUS.categoryId)
  iframeScript.setAttribute('data-mapping', GISCUS.mapping)
  iframeScript.setAttribute('data-strict', '0')
  iframeScript.setAttribute('data-reactions-enabled', '1')
  iframeScript.setAttribute('data-emit-metadata', '0')
  iframeScript.setAttribute('data-input-position', 'bottom')
  iframeScript.setAttribute('data-theme', theme)
  iframeScript.setAttribute('data-lang', 'zh-CN')

  // 观察主题切换并透传给 giscus iframe
  const observer = new MutationObserver(() => {
    const frame = container.querySelector('iframe.giscus-frame') as HTMLIFrameElement | null
    frame?.contentWindow?.postMessage(
      { giscus: { setConfig: { theme: getPreferredTheme() } } },
      'https://giscus.app',
    )
  })
  observer.observe(document.documentElement, { attributes: true, attributeFilter: ['class'] })

  container.appendChild(iframeScript)
  cleanup = () => {
    observer.disconnect()
    container.innerHTML = ''
  }
}

function getPreferredTheme(): string {
  const dark = document.documentElement.classList.contains('dark')
  return dark ? 'dark' : 'light'
}

let cleanup: (() => void) | null = null
onMounted(mount)
// Layout 实例在 SPA 切换文章时被复用，onMounted 不会重触发；
// 监听页面路径变化，重新挂载以加载对应文章的评论
watch(
  () => page.value.relativePath,
  (path, oldPath) => {
    if (path && path !== oldPath) mount()
  },
)
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div :id="CONTAINER_ID" class="giscus-comments" />
</template>

<style scoped>
/* 与文章正文拉开间距 */
.giscus-comments {
  margin-top: 4rem;
}
</style>