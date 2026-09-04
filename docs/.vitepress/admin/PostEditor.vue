<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { MdEditor } from 'md-editor-v3'
// @ts-ignore CSS 文件无类型声明（side-effect import）
import 'md-editor-v3/lib/style.css'
import { useNaiveTheme } from './theme'

/**
 * 纯 Markdown 编辑器（md-editor-v3）：源码即所存，不破坏
 * VitePress 专属语法（::: 容器、代码块高亮标记等）。
 * 图片上传（工具栏/粘贴/拖拽）统一走 onUploadImg 钩子 → /api/admin/upload。
 */
const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [md: string]
  notice: [msg: string]
}>()

const { isDark } = useNaiveTheme()

// 构建期 SSR 不渲染编辑器（md-editor-v3 依赖 DOM），挂载后再显示
const mounted = ref(false)
onMounted(() => (mounted.value = true))

const uploading = ref(false)

/** 批量上传图片，把成功的 URL 回调给编辑器插入正文。 */
async function onUploadImg(files: File[], callback: (urls: string[]) => void) {
  if (uploading.value) return
  uploading.value = true
  try {
    const urls: string[] = []
    for (const file of files) {
      const fd = new FormData()
      fd.append('file', file, file.name)
      const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        emit('notice', (data as { error?: string }).error || `上传失败：${file.name}`)
        continue
      }
      const data = (await res.json()) as { url: string }
      urls.push(data.url)
    }
    callback(urls)
  } finally {
    uploading.value = false
  }
}
</script>

<template>
  <div class="editor-wrap">
    <MdEditor
      v-if="mounted"
      editor-id="post-editor"
      class="editor"
      :model-value="modelValue"
      language="zh-CN"
      :theme="isDark ? 'dark' : 'light'"
      :footers="[]"
      @update:model-value="(md: string) => emit('update:modelValue', md)"
      @on-upload-img="onUploadImg"
    />
    <div v-else class="loading">编辑器加载中…</div>
  </div>
</template>

<style scoped>
.editor-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.editor {
  flex: 1;
  min-height: 0;
}
.loading {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}

:deep(.md-editor-code-head) {
  z-index: 2000 !important;
}
</style>
