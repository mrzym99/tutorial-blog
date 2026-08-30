<script setup lang="ts">
import { computed } from 'vue'

export interface DraftFrontmatter {
  title: string
  date: string
  tags?: string[]
  excerpt?: string
}

const props = defineProps<{ slug: string; fm: DraftFrontmatter }>()
const emit = defineEmits<{ input: [field: string, value: unknown] }>()

// 标签：数组 <-> 逗号分隔字符串
const tagsText = computed({
  get: () => (props.fm.tags ?? []).join(', '),
  set: (v: string) =>
    emit(
      'input',
      'tags',
      v
        .split(',')
        .map((s) => s.trim())
        .filter(Boolean),
    ),
})
</script>

<template>
  <form class="fm" @submit.prevent>
    <div class="row">
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
        标签
        <input :value="tagsText" @input="tagsText = ($event.target as HTMLInputElement).value" />
      </label>
      <label>
        摘要
        <input
          :value="fm.excerpt ?? ''"
          @input="emit('input', 'excerpt', ($event.target as HTMLInputElement).value)"
        />
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
  grid-template-columns: 1.4fr 1fr 0.8fr 0.8fr 1.2fr;
  gap: 0.6rem;
  align-items: end;
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
</style>