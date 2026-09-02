<script setup lang="ts">
import { computed } from 'vue'

/**
 * 轻量分页器：纯前端页码切换，样式与主题一致。
 * 用法：<Pagination v-model:page="page" :page-size="10" :total="posts.length" />
 */
const props = defineProps<{
  page: number // 当前页，从 1 开始
  pageSize: number
  total: number
}>()
const emit = defineEmits<{ 'update:page': [page: number] }>()

const totalPages = computed(() => Math.max(1, Math.ceil(props.total / props.pageSize)))

// 页码序列：首末页恒显，当前页前后各留 1 页，间隔折叠为省略号
const pages = computed<(number | '…')[]>(() => {
  const t = totalPages.value
  const cur = props.page
  if (t <= 7) return Array.from({ length: t }, (_, i) => i + 1)
  const keep = new Set<number>([1, t, cur - 1, cur, cur + 1])
  const list: (number | '…')[] = []
  let prev = 0
  for (let i = 1; i <= t; i++) {
    if (!keep.has(i)) continue
    if (prev && i - prev > 1) list.push('…')
    list.push(i)
    prev = i
  }
  return list
})

function go(p: number) {
  if (p < 1 || p > totalPages.value || p === props.page) return
  emit('update:page', p)
}
</script>

<template>
  <nav v-if="totalPages > 1" class="pager" aria-label="分页">
    <button class="pager-btn" :disabled="page <= 1" aria-label="上一页" @click="go(page - 1)">
      ‹
    </button>
    <template v-for="(p, i) in pages" :key="`${p}-${i}`">
      <span v-if="p === '…'" class="pager-ellipsis">…</span>
      <button
        v-else
        class="pager-btn"
        :class="{ active: p === page }"
        :aria-current="p === page ? 'page' : undefined"
        @click="go(p)"
      >
        {{ p }}
      </button>
    </template>
    <button class="pager-btn" :disabled="page >= totalPages" aria-label="下一页" @click="go(page + 1)">
      ›
    </button>
  </nav>
</template>

<style scoped>
.pager {
  display: flex;
  justify-content: center;
  align-items: center;
  gap: 0.35rem;
  margin: 2rem 0 0;
}
.pager-btn {
  min-width: 2rem;
  height: 2rem;
  padding: 0 0.5rem;
  border: 1px solid transparent;
  border-radius: 8px;
  background: transparent;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  font-variant-numeric: tabular-nums;
  cursor: pointer;
  transition: background 0.2s, color 0.2s, border-color 0.2s;
}
.pager-btn:hover:not(:disabled) {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-1);
}
.pager-btn.active {
  background: var(--vp-c-brand-soft);
  border-color: transparent;
  color: var(--vp-c-brand-1);
  font-weight: 600;
}
.pager-btn:disabled {
  opacity: 0.4;
  cursor: default;
}
.pager-ellipsis {
  min-width: 1.5rem;
  text-align: center;
  color: var(--vp-c-text-3);
}
</style>
