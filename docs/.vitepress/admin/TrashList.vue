<script setup lang="ts">
import { h, ref, watch } from "vue";
import { NDataTable, NTag, NButton, type DataTableColumns, type DataTableRowKey } from "naive-ui";

export interface TrashItem {
  slug: string;
  title: string;
  date: string;
  deletedAt: string;
  srcName: string;
}

const props = defineProps<{ trash: TrashItem[] }>();
const emit = defineEmits<{
  restore: [slug: string];
  purge: [slug: string];
  restoreMany: [slugs: string[]];
  purgeAll: [];
}>();

/** 勾选的行（slug），批量恢复用。恢复/彻底删除接口都以 slug 为参数，row-key 也用 slug */
const checkedKeys = ref<DataTableRowKey[]>([]);
// 列表刷新后清掉已不存在的勾选，避免按钮计数停留在旧数据上
watch(
  () => props.trash,
  (items) => {
    const keys = new Set(items.map((p) => p.slug));
    checkedKeys.value = checkedKeys.value.filter((k) => keys.has(k as string));
  },
);

const columns = [
  { type: "selection" },
  {
    title: "标题",
    key: "title",
    ellipsis: { tooltip: true },
    render(row: TrashItem) {
      return h("div", { style: "display:flex;align-items:center;gap:8px;" }, [
        h(NTag, { size: "small", type: "error", bordered: false }, { default: () => "已删除" }),
        row.title,
      ]);
    },
  },
  { title: "原文日期", key: "date", width: 130, render: (row: TrashItem) => row.date || "—" },
  { title: "删除于", key: "deletedAt", width: 150 },
  {
    title: "操作",
    key: "actions",
    width: 150,
    render(row: TrashItem) {
      return h("div", { style: "display:inline-flex;gap:8px;" }, [
        h(NButton, { size: "small", onClick: () => emit("restore", row.slug) }, { default: () => "恢复" }),
        h(
          NButton,
          {
            size: "small",
            type: "error",
            tertiary: true,
            title: "彻底删除，不可恢复",
            onClick: () => emit("purge", row.slug),
          },
          { default: () => "彻底删除" },
        ),
      ]);
    },
  },
] as DataTableColumns<TrashItem>;
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1>回收站</h1>
      <span class="count">{{ trash.length }} 篇</span>
      <div class="head-actions">
        <n-button
          v-if="checkedKeys.length"
          size="small"
          type="primary"
          secondary
          @click="emit('restoreMany', checkedKeys.map(String))"
        >
          批量恢复（{{ checkedKeys.length }}）
        </n-button>
        <n-button
          v-if="trash.length"
          size="small"
          type="error"
          tertiary
          @click="emit('purgeAll')"
        >
          清空回收站
        </n-button>
      </div>
    </div>
    <p class="hint">被删除的文章会先进入回收站。可「恢复」回文章列表，或「彻底删除」不可恢复地移除。</p>

    <n-data-table
      class="table"
      flex-height
      :columns="columns"
      :data="trash"
      :row-key="(row: TrashItem) => row.slug"
      :checked-row-keys="checkedKeys"
      @update:checked-row-keys="(keys: DataTableRowKey[]) => (checkedKeys = keys)"
      :bordered="false"
      :striped="true"
      size="small"
      :pagination="{ pageSize: 10 }"
    >
      <template #empty>回收站是空的。</template>
    </n-data-table>
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
.head-actions {
  margin-left: auto;
  display: flex;
  gap: 8px;
}
.hint {
  flex-shrink: 0;
  width: 100%;
  margin: 0 0 1rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
}
/* 表格撑满剩余高度，行数超出时表格体内部滚动（表头固定） */
.table {
  flex: 1;
  min-height: 0;
}
</style>
