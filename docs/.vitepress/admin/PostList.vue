<script setup lang="ts">
export interface ListItem {
  slug: string
  title: string
  date: string
  tags?: string[]
  excerpt?: string
  draft?: boolean
  pinned?: boolean
}

defineProps<{ items: ListItem[] }>()
defineEmits<{ edit: [slug: string]; remove: [slug: string] }>()
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1>文章</h1>
      <span class="count">{{ items.length }} 篇</span>
    </div>

    <p v-if="!items.length" class="empty">
      还没有文章，点右上角「＋ 新建」开始写作。
    </p>

    <ul v-else class="rows">
      <li
        v-for="it in items"
        :key="it.slug"
        class="row"
        tabindex="0"
        @click="$emit('edit', it.slug)"
        @keydown.enter="$emit('edit', it.slug)"
      >
        <div class="main">
          <div class="title-line">
            <h2>{{ it.title }}</h2>
            <span v-if="it.pinned" class="badge pin" title="置顶">▲ 置顶</span>
            <span v-if="it.draft" class="badge draft">草稿</span>
          </div>
          <p v-if="it.excerpt" class="excerpt">{{ it.excerpt }}</p>
        </div>

        <div class="tags">
          <span v-for="t in it.tags ?? []" :key="t" class="chip">{{ t }}</span>
        </div>

        <time class="date">{{ it.date }}</time>

        <div class="acts">
          <button type="button" class="edit" @click.stop="$emit('edit', it.slug)">编辑</button>
          <button
            type="button"
            class="remove"
            title="移入回收站"
            @click.stop="$emit('remove', it.slug)"
          >
            删除
          </button>
        </div>
      </li>
    </ul>
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
.empty {
  color: var(--vp-c-text-3);
  border: 1px dashed var(--vp-c-divider);
  border-radius: 10px;
  padding: 2.5rem;
  text-align: center;
}
.rows {
  list-style: none;
  margin: 0;
  padding: 0;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
}
.row {
  display: flex;
  align-items: center;
  gap: 1.25rem;
  padding: 0.9rem 1.1rem;
  background: var(--vp-c-bg);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  cursor: pointer;
  transition: border-color 0.15s, box-shadow 0.15s, transform 0.15s;
}
.row:hover {
  border-color: var(--vn-acc, var(--vp-c-brand-1));
  box-shadow: 0 3px 14px rgba(0, 0, 0, 0.06);
  transform: translateY(-1px);
}
.row:focus-visible {
  outline: 2px solid var(--vp-c-brand-1);
  outline-offset: 2px;
}
.row .main {
  flex: 1;
  min-width: 0;
}
.title-line {
  display: flex;
  align-items: center;
  gap: 0.5rem;
  flex-wrap: wrap;
}
.title-line h2 {
  margin: 0;
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
}
.badge {
  font-size: 0.68rem;
  border-radius: 5px;
  padding: 0.08rem 0.4rem;
  font-style: normal;
}
.badge.pin {
  color: var(--vp-c-warning-1);
  border: 1px solid var(--vp-c-warning-1);
}
.badge.draft {
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
}
.excerpt {
  margin: 0.3rem 0 0;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.tags {
  display: flex;
  gap: 0.3rem;
  flex-wrap: wrap;
  max-width: 30%;
}
.chip {
  font-size: 0.72rem;
  padding: 0.12rem 0.55rem;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}
.date {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  flex: none;
}
.acts {
  display: inline-flex;
  gap: 0.35rem;
  flex: none;
}
.acts button {
  border-radius: 6px;
  padding: 0.28rem 0.7rem;
  font-size: 0.78rem;
  cursor: pointer;
}
.acts .edit {
  border: 1px solid var(--vp-c-divider);
  background: none;
  color: var(--vp-c-text-1);
}
.acts .edit:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.acts .remove {
  border: 1px solid transparent;
  background: none;
  color: var(--vp-c-text-3);
}
.acts .remove:hover {
  color: var(--vp-c-danger-1);
  border-color: var(--vp-c-danger-soft, transparent);
}
</style>