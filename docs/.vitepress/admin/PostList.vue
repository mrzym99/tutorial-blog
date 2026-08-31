<script setup lang="ts">
import { h } from 'vue'
import { NDataTable, NTag, NButton, type DataTableColumns } from 'naive-ui'

export interface ListItem {
  slug: string
  title: string
  date: string
  tags?: string[]
  excerpt?: string
  draft?: boolean
  pinned?: boolean
}

const props = defineProps<{ items: ListItem[] }>()
const emit = defineEmits<{ edit: [slug: string]; remove: [slug: string] }>()

const columns = [
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render(row: ListItem) {
      const badges: ReturnType<typeof h>[] = []
      if (row.pinned) badges.push(h(NTag, { size: 'small', type: 'warning', bordered: false }, { default: () => '置顶' }))
      if (row.draft) badges.push(h(NTag, { size: 'small', bordered: false }, { default: () => '草稿' }))
      return h('div', { style: 'display:flex;align-items:center;gap:8px;' }, [row.title, ...badges])
    },
  },
  {
    title: '标签',
    key: 'tags',
    render(row: ListItem) {
      const tags = row.tags ?? []
      if (!tags.length) return null
      return h(
        'div',
        { style: 'display:flex;flex-wrap:wrap;gap:4px;' },
        tags.map((t) => h(NTag, { size: 'small', type: 'primary', bordered: false }, { default: () => t })),
      )
    },
  },
  { title: '日期', key: 'date', width: 120 },
  {
    title: '操作',
    key: 'actions',
    width: 140,
    render(row: ListItem) {
      return h('div', { style: 'display:inline-flex;gap:8px;' }, [
        h(NButton, { size: 'small', onClick: () => emit('edit', row.slug) }, { default: () => '编辑' }),
        h(NButton, { size: 'small', type: 'error', tertiary: true, onClick: () => emit('remove', row.slug) }, { default: () => '删除' }),
      ])
    },
  },
] as DataTableColumns<ListItem>
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1>文章</h1>
      <span class="count">{{ items.length }} 篇</span>
    </div>

    <n-data-table
      :columns="columns"
      :data="items"
      :row-key="(row: ListItem) => row.slug"
      :bordered="false"
      :striped="true"
      size="small"
      :single-line="false"
      @update:row-props="(e: { row: ListItem }) => ({ style: 'cursor:pointer;', onClick: () => emit('edit', e.row.slug) })"
    >
      <template #empty>还没有文章，点右上角「新建文章」开始写作。</template>
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
  margin-bottom: 1.25rem;
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
</style>