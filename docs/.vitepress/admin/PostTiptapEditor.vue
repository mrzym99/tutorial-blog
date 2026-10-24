<script setup lang="ts">
import { ref, onMounted } from "vue";
import { TipTapEditor, StarterKit, Ai } from "@yumine9/vue3-tiptap";
import "@yumine9/vue3-tiptap/style.css";
import { useNaiveTheme } from "./theme";
import { AI } from "../theme/ai";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  "update:modelValue": [md: string];
  notice: [msg: string];
}>();

const { isDark } = useNaiveTheme();

// 构建期 SSR 不渲染编辑器（@yumine9/vue3-tiptap 依赖 DOM），挂载后再显示
const mounted = ref(false);
onMounted(() => (mounted.value = true));
const extensions = [
  StarterKit.configure({
    image: {
      upload: async (file: File) => {
        const url = await onUploadImg(file);
        return url;
      },
    },
    dragHandle: false,
  }),
  Ai.configure({
    baseURL: AI?.baseURL,
    apiKey: AI?.apiKey,
    model: AI?.model,
    // no confirm callback => danger tools (e.g. set_document) are refused fail-safe
    confirmDangerous: (tool) => Promise.resolve(window.confirm(`AI 要执行 ${tool.name}，允许吗？`)),
  }),
];
/** 批量上传图片，把成功的 URL 回调给编辑器插入正文。 */
async function onUploadImg(file: File) {
  try {
    const fd = new FormData();
    fd.append("file", file, file.name);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    const data = (await res.json()) as { url: string };
    return data.url;
  } catch (error) {
    emit("notice", `上传失败：${file.name}`);
    return "";
  }
}
</script>

<template>
  <div class="tiptap-editor-wrap">
    <TipTapEditor
      v-if="mounted"
      editor-id="post-editor"
      class="editor"
      :model-value="modelValue"
      locale="zh"
      :extensions="extensions"
      :theme="isDark ? 'dark' : 'light'"
      toolbar-wrap
      content-type="markdown"
      @update:model-value="emit('update:modelValue', $event)"
    />
    <div v-else class="loading">编辑器加载中…</div>
  </div>
</template>

<style scoped>
.tiptap-editor-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  height: 100%;
  min-height: 0;
}
.editor {
  flex: 1;
  min-height: 0;
  max-width: 800px;
  box-shadow: var(--vp-shadow-2);
  border-radius: 16px;
}
:deep(.tiptap-editor .tiptap) {
  padding: 16px 24px;
}
</style>

<style>
a {
  text-decoration: underline;
  color: var(--vp-c-brand);
}

h1,
h2,
h3,
h4,
h5,
h6 {
  letter-spacing: -0.02em;
  font-weight: 600;
  outline: none;
}

h1 {
  line-height: 40px;
  font-size: 32px;
}
h2 {
  line-height: 32px;
  font-size: 24px;
}
h3 {
  line-height: 28px;
  font-size: 20px;
}
h4 {
  line-height: 24px;
  font-size: 16px;
}
h5 {
  line-height: 20px;
  font-size: 14px;
}
h6 {
  line-height: 16px;
  font-size: 12px;
}
</style>
