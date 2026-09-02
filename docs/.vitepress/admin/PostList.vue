<script setup lang="ts">
import { h, ref, watch } from "vue";
import { NDataTable, NTag, NButton, type DataTableColumns, type DataTableRowKey } from "naive-ui";

export interface ListItem {
  slug: string;
  title: string;
  date: string;
  tags?: string[];
  excerpt?: string;
  draft?: boolean;
  pinned?: boolean;
}

const props = defineProps<{ items: ListItem[] }>();
const emit = defineEmits<{ edit: [slug: string]; remove: [slug: string]; removeMany: [slugs: string[]] }>();

/** 勾选的行（slug），批量删除用 */
const checkedKeys = ref<DataTableRowKey[]>([]);
// 列表刷新后清掉已不存在的勾选，避免按钮计数停留在旧数据上
watch(
  () => props.items,
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
    render(row: ListItem) {
      const badges: ReturnType<typeof h>[] = [];
      if (row.pinned)
        badges.push(h(NTag, { size: "small", type: "warning", bordered: false }, { default: () => "置顶" }));
      if (row.draft) badges.push(h(NTag, { size: "small", bordered: false }, { default: () => "草稿" }));
      return h("div", { style: "display:flex;align-items:center;gap:8px;" }, [row.title, ...badges]);
    },
  },
  {
    title: "标签",
    key: "tags",
    render(row: ListItem) {
      const tags = row.tags ?? [];
      if (!tags.length) return null;
      return h(
        "div",
        { style: "display:flex;flex-wrap:wrap;gap:4px;" },
        tags.map((t) => h(NTag, { size: "small", type: "primary", bordered: false }, { default: () => t })),
      );
    },
  },
  { title: "日期", key: "date", width: 120 },
  {
    title: "操作",
    key: "actions",
    width: 140,
    render(row: ListItem) {
      return h("div", { style: "display:inline-flex;gap:8px;" }, [
        h(NButton, { size: "small", onClick: () => emit("edit", row.slug) }, { default: () => "编辑" }),
        h(
          NButton,
          { size: "small", type: "error", tertiary: true, onClick: () => emit("remove", row.slug) },
          { default: () => "删除" },
        ),
      ]);
    },
  },
] as DataTableColumns<ListItem>;
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1>文章</h1>
      <span class="count">{{ items.length }} 篇</span>
      <n-button
        v-if="checkedKeys.length"
        class="batch"
        size="small"
        type="error"
        tertiary
        @click="emit('removeMany', checkedKeys.map(String))"
      >
        批量删除（{{ checkedKeys.length }}）
      </n-button>
    </div>

    <n-data-table
      class="table"
      flex-height
      :columns="columns"
      :data="items"
      :row-key="(row: ListItem) => row.slug"
      :checked-row-keys="checkedKeys"
      @update:checked-row-keys="(keys: DataTableRowKey[]) => (checkedKeys = keys)"
      :bordered="false"
      :striped="true"
      size="small"
      :single-line="false"
      :pagination="{ pageSize: 10 }"
      @update:row-props="
        (e: { row: ListItem }) => ({ style: 'cursor:pointer;', onClick: () => emit('edit', e.row.slug) })
      "
    >
      <template #empty>还没有文章，点右上角「新建文章」开始写作。</template>
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
  margin-bottom: 1.25rem;
}
/* 表格撑满剩余高度，行数超出时表格体内部滚动（表头固定） */
.table {
  flex: 1;
  min-height: 0;
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
.batch {
  margin-left: auto;
}
</style>
