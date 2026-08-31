<script setup lang="ts">
import { computed, ref } from 'vue'
import { NForm, NFormItem, NInput, NDatePicker, NSwitch, NTag, NButton } from 'naive-ui'

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

// ---------- 日期：YYYY-MM-DD <-> 时间戳 互转 ----------
// naive-ui 的 value 用时间戳，显示格式由 format 指定；业务层存 YYYY-MM-DD。
function dateToTs(dateStr: string): number | null {
  if (!dateStr) return null
  const t = new Date(`${dateStr}T00:00:00`).getTime()
  return Number.isNaN(t) ? null : t
}

function tsToDate(ts: number | null): string {
  if (ts == null) return props.fm.date
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}
</script>

<template>
  <n-form class="fm" :show-label="false" label-placement="top" @submit.prevent>
    <div class="row top">
      <n-form-item label="标题" class="field grow">
        <n-input
          :value="fm.title"
          placeholder="标题"
          @update:value="(v) => emit('input', 'title', v)"
        />
      </n-form-item>
      <n-form-item label="slug" class="field">
        <n-input
          :value="slug"
          placeholder="slug"
          @update:value="(v) => emit('input', 'slug', v)"
        />
      </n-form-item>
      <n-form-item label="日期" class="field date">
        <n-date-picker
          type="date"
          format="yyyy-MM-dd"
          :value="dateToTs(fm.date)"
          @update:value="(ts: number | null) => emit('input', 'date', tsToDate(ts))"
        />
      </n-form-item>
      <n-form-item label="摘要" class="field grow">
        <n-input
          :value="fm.excerpt ?? ''"
          placeholder="摘要（选填）"
          @update:value="(v) => emit('input', 'excerpt', v)"
        />
      </n-form-item>
    </div>

    <div class="tags-field">
      <span class="lbl">标签</span>
      <div class="chips">
        <n-tag
          v-for="t in fm.tags ?? []"
          :key="t"
          size="small"
          closable
          type="primary"
          :bordered="false"
          @close="removeTag(t)"
        >
          {{ t }}
        </n-tag>
        <n-input
          v-model:value="newTag"
          class="tag-input"
          size="small"
          placeholder="回车添加"
          @keydown.enter.prevent="addTag(newTag)"
        />
      </div>
      <div v-if="suggestions.length" class="quick">
        <span class="label">已有：</span>
        <n-button
          v-for="t in suggestions"
          :key="t"
          size="tiny"
          quaternary
          type="primary"
          @click="addTag(t)"
        >
          + {{ t }}
        </n-button>
      </div>
    </div>

    <div class="checks">
      <label class="check">
        <n-switch
          size="small"
          :value="!!fm.draft"
          @update:value="(v) => emit('input', 'draft', v)"
        />
        <span>草稿（存后不公开，取消即发布）</span>
      </label>
      <label class="check">
        <n-switch
          size="small"
          :value="!!fm.pinned"
          @update:value="(v) => emit('input', 'pinned', v)"
        />
        <span>置顶（列表排最前）</span>
      </label>
    </div>
  </n-form>
</template>

<style scoped>
.fm {
  padding: 0.6rem 0.6rem 0.9rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.row {
  display: grid;
  gap: 0.6rem;
}
.top {
  grid-template-columns: 1.6fr 1.2fr 0.9fr 1.4fr;
  align-items: start;
}
.row :deep(.n-form-item) {
  --n-blank-height: 0px;
}
.row :deep(.n-form-item-feedback) {
  display: none;
}

/* 标签 chip */
.tags-field {
  margin-top: 0.6rem;
}
.tags-field .lbl {
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  margin-right: 0.5rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.tag-input {
  flex: 1;
  min-width: 8rem;
}
.quick {
  margin-top: 0.35rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}
.quick .label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.checks {
  margin-top: 0.9rem;
  display: flex;
  gap: 1.2rem;
}
.check {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  font-size: 0.84rem;
  color: var(--vp-c-text-2);
}
</style>