<script setup lang="ts">
import { computed, ref } from 'vue'

export interface DraftFrontmatter {
  title: string
  date: string
  tags?: string[]
  excerpt?: string
  draft?: boolean
  pinned?: boolean
}

const props = defineProps<{
  slug: string
  fm: DraftFrontmatter
  /** 全站已有标签，用于快捷点选追加 */
  allTags?: string[]
}>()
const emit = defineEmits<{ input: [field: string, value: unknown] }>()

// ---------- 标签 chip 管理 ----------
const newTag = ref('')

function addTag(t: string): void {
  const name = t.trim()
  if (!name) return
  const cur = props.fm.tags ?? []
  if (cur.includes(name)) return // 去重，避免同文重复标签
  emit('input', 'tags', [...cur, name])
  newTag.value = ''
}

function removeTag(t: string): void {
  emit(
    'input',
    'tags',
    (props.fm.tags ?? []).filter((x) => x !== t),
  )
}

// 快捷点选：全站标签里尚未选中的
const suggestions = computed(() =>
  (props.allTags ?? []).filter((t) => !(props.fm.tags ?? []).includes(t)),
)
</script>

<template>
  <form class="fm" @submit.prevent>
    <div class="row top">
      <label>
        标题
        <input
          :value="fm.title"
          @input="emit('input', 'title', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label>
        slug
        <input
          :value="slug"
          @input="emit('input', 'slug', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label>
        日期
        <input
          type="date"
          :value="fm.date"
          @input="emit('input', 'date', ($event.target as HTMLInputElement).value)"
        />
      </label>
      <label>
        摘要
        <input
          :value="fm.excerpt ?? ''"
          @input="emit('input', 'excerpt', ($event.target as HTMLInputElement).value)"
        />
      </label>
    </div>

    <div class="tags-field">
      <span class="lbl">标签</span>
      <div class="chips">
        <span v-for="t in fm.tags ?? []" :key="t" class="chip">
          {{ t }}
          <button type="button" title="移除" @click="removeTag(t)">×</button>
        </span>
        <input
          v-model="newTag"
          class="tag-input"
          placeholder="回车添加"
          @keydown.enter.prevent="addTag(newTag)"
        />
      </div>
      <div v-if="suggestions.length" class="quick">
        <span class="label">已有：</span>
        <button
          v-for="t in suggestions"
          :key="t"
          type="button"
          class="suggest"
          @click="addTag(t)"
        >
          + {{ t }}
        </button>
      </div>
    </div>

    <div class="checks">
      <label class="check">
        <input
          type="checkbox"
          :checked="fm.draft"
          @change="($event) => emit('input', 'draft', ($event.target as HTMLInputElement).checked)"
        />
        草稿（存后不公开，取消即发布）
      </label>
      <label class="check">
        <input
          type="checkbox"
          :checked="fm.pinned"
          @change="($event) => emit('input', 'pinned', ($event.target as HTMLInputElement).checked)"
        />
        置顶（列表排最前）
      </label>
    </div>
  </form>
</template>

<style scoped>
.fm {
  padding: 0.6rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.row {
  display: grid;
  gap: 0.6rem;
  align-items: end;
}
.top {
  grid-template-columns: 1.6fr 1.2fr 0.9fr 1.4fr;
}
label {
  display: flex;
  flex-direction: column;
  gap: 0.2rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}
input {
  width: 100%;
  padding: 0.3rem 0.5rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 6px;
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-size: 0.9rem;
}

/* 标签 chip */
.tags-field {
  margin-top: 0.6rem;
}
.tags-field .lbl {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
}
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
  margin-top: 0.2rem;
}
.chip {
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  background: var(--blog-accent-soft, #e6f0ec);
  color: var(--blog-accent-deep, #1f5c4e);
  border-radius: 6px;
  padding: 0.15rem 0.4rem 0.15rem 0.55rem;
  font-size: 0.82rem;
}
.chip button {
  border: none;
  background: transparent;
  color: inherit;
  cursor: pointer;
  font-size: 0.9rem;
  line-height: 1;
  padding: 0;
}
.chip button:hover {
  color: #c03;
}
.tag-input {
  flex: 1;
  min-width: 8rem;
}
.quick {
  margin-top: 0.3rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}
.quick .label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
.suggest {
  border: 1px dashed var(--vp-c-divider);
  background: transparent;
  color: var(--vp-c-text-2);
  border-radius: 999px;
  padding: 0.05rem 0.55rem;
  font-size: 0.78rem;
  cursor: pointer;
}
.suggest:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}

.checks {
  margin-top: 0.6rem;
  display: flex;
  gap: 1.2rem;
}
.check {
  flex-direction: row;
  align-items: center;
  gap: 0.35rem;
  font-size: 0.84rem;
  color: var(--vp-c-text-2);
}
.check input {
  width: auto;
}
</style>