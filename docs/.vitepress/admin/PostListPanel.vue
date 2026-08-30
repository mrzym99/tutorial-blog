<script setup lang="ts">
export interface ListItem {
  slug: string
  title: string
  date: string
  tags?: string[]
  excerpt?: string
}

defineProps<{ items: ListItem[]; selected: string }>()
defineEmits<{ select: [slug: string]; create: []; remove: [slug: string] }>()
</script>

<template>
  <div class="panel">
    <button class="new-btn" type="button" @click="$emit('create')">＋ 新建文章</button>
    <ul>
      <li
        v-for="it in items"
        :key="it.slug"
        :class="{ active: it.slug === selected }"
        @click="$emit('select', it.slug)"
      >
        <span class="t">{{ it.title }}</span>
        <time>{{ it.date }}</time>
        <button
          class="del"
          type="button"
          title="删除"
          @click.stop="$emit('remove', it.slug)"
        >
          ✕
        </button>
      </li>
    </ul>
  </div>
</template>

<style scoped>
.panel {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
  height: 100%;
}
.new-btn {
  width: 100%;
  padding: 0.5rem;
  border: 1px solid currentColor;
  border-radius: 6px;
  cursor: pointer;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
  overflow: auto;
  flex: 1;
}
li {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.45rem 0.5rem;
  border-radius: 6px;
  cursor: pointer;
}
li:hover {
  background: var(--vp-c-bg-soft);
}
li.active {
  background: var(--vp-c-brand-soft);
}
li .t {
  flex: 1;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
li time {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
li .del {
  border: none;
  background: none;
  cursor: pointer;
  color: var(--vp-c-text-3);
}
li .del:hover {
  color: var(--vp-c-danger-1);
}
</style>