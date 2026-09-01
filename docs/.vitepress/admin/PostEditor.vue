<script setup lang="ts">
import { ref, watch } from "vue";
import { useEditor, EditorContent } from "@tiptap/vue-3";
import StarterKit from "@tiptap/starter-kit";
import Image from "@tiptap/extension-image";
import { Markdown } from "@tiptap/markdown";

const props = defineProps<{ modelValue: string }>();
const emit = defineEmits<{
  "update:modelValue": [md: string];
  notice: [msg: string];
}>();

const uploading = ref(false);
const fileInput = ref<HTMLInputElement | null>(null);
// 防止 onUpdate 触发的 prop 变化又回写编辑器造成抖动
const isUpdating = ref(false);

function pickImage() {
  fileInput.value?.click();
}

function onFilePicked(e: Event) {
  const input = e.target as HTMLInputElement;
  const file = input.files?.[0];
  input.value = ""; // 允许连续选择同一文件
  if (file) uploadAndInsert(file);
}

const editor = useEditor({
  contentType: "markdown", // 初始 content 按 markdown 解析
  content: props.modelValue,
  extensions: [
    StarterKit,
    Image,
    Markdown.configure({
      indentation: { style: "space", size: 2 },
    }),
  ],
  editorProps: {
    handlePaste: (view, event) => {
      const file = firstImageFile(event.clipboardData);
      if (file) {
        uploadAndInsert(file);
        return true; // 阻止把粘贴的图片当作 HTML 插入
      }
      return false;
    },
    handleDrop: (view, event) => {
      const file = firstImageFile(event.dataTransfer);
      if (file) {
        uploadAndInsert(file);
        return true;
      }
      return false;
    },
  },
  onUpdate: ({ editor }) => {
    isUpdating.value = true;
    emit("update:modelValue", editor.getMarkdown());
    // 下一帧重置标志，避免 watch 立即回写
    Promise.resolve().then(() => {
      isUpdating.value = false;
    });
  },
});

// 外部 modelValue 变化时回填编辑器（如切换文章、从 sessionStorage 恢复等）
watch(
  () => props.modelValue,
  (val) => {
    if (!editor.value || isUpdating.value) return;
    const currentMd = editor.value.getMarkdown();
    if (currentMd !== val) {
      editor.value.commands.setContent(val, { emitUpdate: false, contentType: "markdown" });
    }
  },
);


function firstImageFile(data: { files: FileList | null } | null | undefined): File | null {
  if (!data?.files) return null;
  for (const f of Array.from(data.files)) {
    if (f.type.startsWith("image/")) return f;
  }
  return null;
}

async function uploadAndInsert(file: File) {
  if (uploading.value) return;
  uploading.value = true;
  try {
    const fd = new FormData();
    fd.append("file", file, file.name);
    const res = await fetch("/api/admin/upload", { method: "POST", body: fd });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      emit("notice", (data as { error?: string }).error || "上传失败");
      return;
    }
    const data = (await res.json()) as { url: string };
    editor.value?.chain().focus().setImage({ src: data.url }).run();
  } finally {
    uploading.value = false;
  }
}

type EditorChain = {
  toggleBold(): EditorChain;
  toggleItalic(): EditorChain;
  toggleHeading(o: { level: number }): EditorChain;
  toggleBlockquote(): EditorChain;
  toggleBulletList(): EditorChain;
  toggleOrderedList(): EditorChain;
  toggleCodeBlock(): EditorChain;
  undo(): EditorChain;
  redo(): EditorChain;
  run(): void;
};

function cmd(builder: (c: any) => EditorChain) {
  return () => {
    if (!editor.value) return;
    builder(editor.value.chain().focus()).run();
  };
}

const isActive = (name: string | object) => () =>
  typeof name === "string" ? editor.value?.isActive(name) : editor.value?.isActive(name as object);

const toolbarButtons = [
  { label: "加粗", action: cmd((c) => c.toggleBold()), isActive: isActive("bold") },
  { label: "斜体", action: cmd((c) => c.toggleItalic()), isActive: isActive("italic") },
  { label: "H2", action: cmd((c) => c.toggleHeading({ level: 2 })), isActive: isActive({ type: "heading", level: 2 }) },
  { label: "H3", action: cmd((c) => c.toggleHeading({ level: 3 })), isActive: isActive({ type: "heading", level: 3 }) },
  { label: "引用", action: cmd((c) => c.toggleBlockquote()), isActive: isActive("blockquote") },
  { label: "列表", action: cmd((c) => c.toggleBulletList()), isActive: isActive("bulletList") },
  { label: "有序列表", action: cmd((c) => c.toggleOrderedList()), isActive: isActive("orderedList") },
  { label: "代码块", action: cmd((c) => c.toggleCodeBlock()), isActive: isActive("codeBlock") },
  { label: "撤销", action: cmd((c) => c.undo()), isActive: () => false },
  { label: "重做", action: cmd((c) => c.redo()), isActive: () => false },
  { label: "图片", action: pickImage, isActive: () => false },
];
</script>

<template>
  <div class="editor-wrap">
    <div class="toolbar">
      <button
        v-for="b in toolbarButtons"
        :key="b.label"
        type="button"
        :class="{ active: b.isActive() }"
        @click="b.action"
      >
        {{ b.label }}
      </button>
      <span v-if="uploading" class="uploading">上传中…</span>
      <input ref="fileInput" type="file" accept="image/*" class="file-input" @change="onFilePicked" />
    </div>
    <EditorContent :editor="editor" class="tiptap-body" />
  </div>
</template>

<style scoped>
.editor-wrap {
  display: flex;
  flex-direction: column;
  height: 100%;
  min-height: 0;
}
.toolbar {
  flex: none;
  display: flex;
  flex-wrap: wrap;
  gap: 0.2rem;
  padding: 0.4rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.toolbar button {
  padding: 0.2rem 0.55rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 5px;
  background: none;
  cursor: pointer;
  color: var(--vp-c-text-1);
}
.toolbar button.active {
  background: var(--vp-c-brand-soft);
  border-color: var(--vp-c-brand-1);
}
.toolbar .uploading {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  align-self: center;
}
.file-input {
  display: none;
}
.tiptap-body {
  flex: 1;
  overflow: auto;
  padding: 0.6rem 0.8rem;
}
.tiptap-body :deep(.tiptap) {
  outline: none;
  height: 100%;
}
.tiptap-body :deep(.tiptap p) {
  margin: 0.4em 0;
}
.tiptap-body :deep(.tiptap img) {
  max-width: 100%;
}
.tiptap-body :deep(.tiptap blockquote) {
  border-left: 3px solid var(--vp-c-divider);
  padding-left: 0.8rem;
  margin: 0.6rem 0;
  color: var(--vp-c-text-2);
}
</style>
