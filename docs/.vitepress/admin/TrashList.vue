<script setup lang="ts">
import { h } from 'vue'
import { NDataTable, NTag, NButton, type DataTableColumns } from 'naive-ui'

export interface TrashItem {
  slug: string
  title: string
  date: string
  deletedAt: string
  srcName: string
}

const props = defineProps<{ trash: TrashItem[] }>()
const emit = defineEmits<{ restore: [slug: string]; purge: [slug: string] }>()

const columns = [
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render(row: TrashItem) {
      return h(
        'div',
        { style: 'display:flex;align-items:center;gap:8px;' },
        [
          h(NTag, { size: 'small', type: 'error', bordered: false }, { default: () => '已删除' }),
          row.title,
        ],
      )
    },
  },
  { title: '原文日期', key: 'date', width: 130, render: (row: TrashItem) => row.date || '—' },
  { title: '删除于', key: 'deletedAt', width: 150 },
  {
    title: '操作',
    key: 'actions',
    width: 150,
    render(row: TrashItem) {
      return h('div', { style: 'display:inline-flex;gap:8px;' }, [
        h(NButton, { size: 'small', onClick: () => emit('restore', row.slug) }, { default: () => '恢复' }),
        h(NButton, { size: 'small', type: 'error', tertiary: true, title: '彻底删除，不可恢复', onClick: () => emit('purge', row.slug) }, { default: () => '彻底删除' }),
      ])
    },
  },
] as DataTableColumns<TrashItem>
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1>回收站</h1>
      <span class="count">{{ trash.length }} 篇</span>
    </div>
    <p class="hint">
      被删除的文章会先进入回收站。可「恢复」回文章列表，或「彻底删除」不可恢复地移除。
    </p>

    <n-data-table
      :columns="columns"
      :data="trash"
      :row-key="(row: TrashItem) => row.srcName"
      :bordered="false"
      :striped="true"
      size="small"
    >
      <template #empty>回收站是空的。</template>
    </n-data-table>
  </div>
</template>

<style scoped>
.page {
  padding: 1.5rem 2rem 4rem;
}
.page-head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  flex-wrap: wrap;
  margin-bottom: 0.75rem;
}
.page-head h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.count {
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}
.hint {
  width: 100%;
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
}
</style>