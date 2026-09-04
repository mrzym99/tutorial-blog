<script setup lang="ts">
import { h, computed } from 'vue'
import { NButton, NDataTable, NTag, NEmpty, type DataTableColumns } from 'naive-ui'
import { compareCollectionPosts } from '../lib/collections'

/** 文章行：列表元数据 + 合集内序号（AdminApp 传入） */
export interface CollectionPostItem {
  slug: string
  title: string
  date: string
  draft?: boolean
  order?: number
}

const props = defineProps<{
  /** 合集标题（顶部展示） */
  title: string
  /** 合集简介（选填） */
  description?: string
  /** 合集下全部文章（含草稿），内部按章节序排序 */
  posts: CollectionPostItem[]
  /** 排序保存中：禁用上移/下移按钮，防止连点产生交错写入 */
  saving: boolean
}>()

const emit = defineEmits<{
  back: []
  /** 点击标题 → 进入编辑器 */
  edit: [slug: string]
  /** 移入回收站（确认弹窗由 AdminApp 处理） */
  remove: [slug: string]
  /** 上移/下移后发出新的完整有序 slug 列表，由 AdminApp 调接口保存 */
  reorder: [slugs: string[]]
}>()

// 章节序：order 升序（无 order 兜底排最后，规则与前台合集详情页一致）
const sorted = computed(() => [...props.posts].sort(compareCollectionPosts))

function move(index: number, delta: -1 | 1) {
  const target = index + delta
  if (target < 0 || target >= sorted.value.length) return
  const slugs = sorted.value.map((p) => p.slug)
  ;[slugs[index], slugs[target]] = [slugs[target], slugs[index]]
  emit('reorder', slugs)
}

const columns = [
  {
    title: '序号',
    key: 'order',
    width: 70,
    render(_row: CollectionPostItem, index: number) {
      return h(
        'span',
        { style: 'font-weight:700;font-variant-numeric:tabular-nums;color:var(--vp-c-brand-1);' },
        String(index + 1).padStart(2, '0'),
      )
    },
  },
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render(row: CollectionPostItem) {
      const badges: ReturnType<typeof h>[] = []
      if (row.draft)
        badges.push(h(NTag, { size: 'small', bordered: false }, { default: () => '草稿' }))
      return h('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
        h(
          'a',
          {
            style: 'cursor:pointer;color:inherit;',
            onClick: () => emit('edit', row.slug),
          },
          row.title,
        ),
        ...badges,
      ])
    },
  },
  { title: '日期', key: 'date', width: 120 },
  {
    title: '操作',
    key: 'actions',
    width: 260,
    render(row: CollectionPostItem, index: number) {
      return h('div', { style: 'display:inline-flex;gap:6px;' }, [
        h(
          NButton,
          {
            size: 'small',
            disabled: props.saving || index === 0,
            onClick: () => move(index, -1),
          },
          { default: () => '↑ 上移' },
        ),
        h(
          NButton,
          {
            size: 'small',
            disabled: props.saving || index === sorted.value.length - 1,
            onClick: () => move(index, 1),
          },
          { default: () => '↓ 下移' },
        ),
        h(NButton, { size: 'small', onClick: () => emit('edit', row.slug) }, { default: () => '编辑' }),
        h(
          NButton,
          {
            size: 'small',
            type: 'error',
            tertiary: true,
            disabled: props.saving,
            onClick: () => emit('remove', row.slug),
          },
          { default: () => '删除' },
        ),
      ])
    },
  },
] as DataTableColumns<CollectionPostItem>
</script>

<template>
  <div class="page">
    <div class="page-head">
      <n-button size="small" @click="emit('back')">← 返回合集</n-button>
      <h1>{{ title }}</h1>
      <span class="count">{{ posts.length }} 篇</span>
    </div>
    <p v-if="description" class="desc">{{ description }}</p>

    <n-data-table
      v-if="posts.length"
      class="table"
      :columns="columns"
      :data="sorted"
      :row-key="(row: CollectionPostItem) => row.slug"
      :bordered="false"
      :striped="true"
      size="small"
      :single-line="false"
      :pagination="false"
    />
    <NEmpty v-else class="empty" description="该合集下还没有文章，去合集页点「＋ 写文章」创建吧。" />
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 1.5rem 2rem;
}
.page-head {
  flex-shrink: 0;
  display: flex;
  align-items: center;
  gap: 0.75rem;
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
.desc {
  flex-shrink: 0;
  margin: 0 0 1rem;
  font-size: 0.9rem;
  color: var(--vp-c-text-2);
}
.table {
  flex: 1;
  min-height: 0;
}
.empty {
  margin-top: 4rem;
}
</style>
