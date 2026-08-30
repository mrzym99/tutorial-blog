<script setup lang="ts">
export interface TrashItem {
  slug: string
  title: string
  date: string
  deletedAt: string
  srcName: string
}

defineProps<{ trash: TrashItem[] }>()
defineEmits<{ restore: [slug: string]; purge: [slug: string] }>()
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1>回收站</h1>
      <span class="count">{{ trash.length }} 篇</span>
      <p class="hint">
        被删除的文章会先进入回收站。可「恢复」回文章列表，或「彻底删除」不可恢复地移除。
      </p>
    </div>

    <p v-if="!trash.length" class="empty">回收站是空的。</p>

    <ul v-else class="rows">
      <li v-for="it in trash" :key="it.srcName" class="row">
        <div class="main">
          <span class="badge deleted">已删除</span>
          <span class="title">{{ it.title }}</span>
        </div>
        <time class="del-at">删除于 {{ it.deletedAt }}</time>
        <span class="orig-date">原文 {{ it.date || '—' }}</span>
        <div class="acts">
          <button type="button" class="restore" @click="$emit('restore', it.slug)">恢复</button>
          <button
            type="button"
            class="purge"
            title="彻底删除，不可恢复"
            @click="$emit('purge', it.slug)"
          >
            彻底删除
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
  flex-wrap: wrap;
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
.hint {
  width: 100%;
  margin: 0;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
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
}
.row .main {
  flex: 1;
  min-width: 0;
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.badge {
  font-style: normal;
  font-size: 0.68rem;
  border-radius: 5px;
  padding: 0.08rem 0.4rem;
  color: var(--vp-c-danger-1);
  border: 1px solid var(--vp-c-danger-1);
  opacity: 0.75;
  flex: none;
}
.title {
  font-size: 1rem;
  font-weight: 500;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.del-at {
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  flex: none;
}
.orig-date {
  font-size: 0.78rem;
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
.acts .restore {
  border: 1px solid var(--vp-c-divider);
  background: none;
  color: var(--vp-c-text-1);
}
.acts .restore:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.acts .purge {
  border: 1px solid transparent;
  background: none;
  color: var(--vp-c-text-3);
}
.acts .purge:hover {
  color: var(--vp-c-danger-1);
  border-color: var(--vp-c-danger-soft, transparent);
}
</style>