<script setup lang="ts">
import { onMounted, onBeforeUnmount } from 'vue'
import { GISCUS } from '../../const'

const CONTAINER_ID = 'giscus-comments'

// 按当前页面 SPA 路由重建 Giscus；卸载时清理，避免重复加载
function mount() {
  const container = document.getElementById(CONTAINER_ID)
  if (!container) return
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
onBeforeUnmount(() => cleanup?.())
</script>

<template>
  <div :id="CONTAINER_ID" class="giscus-comments" />
</template>