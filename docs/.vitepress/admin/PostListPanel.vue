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

export interface TrashItem {
  slug: string
  title: string
  date: string
  deletedAt: string
  srcName: string
}

defineProps<{
  items: ListItem[]
  trash: TrashItem[]
  selected: string
}>()
defineEmits<{
  select: [slug: string]
  create: []
  remove: [slug: string]
  restore: [slug: string]
  purge: [slug: string]
}>()
</script>

<template>
  <div class="panel">
    <button class="new-btn" type="button" @click="$emit('create')">＋ 新建文章</button>

    <div class="list-groups">
      <ul class="live">
        <li
          v-for="it in items"
          :key="it.slug"
          :class="{ active: it.slug === selected }"
          @click="$emit('select', it.slug)"
        >
          <span class="t">
            <em v-if="it.pinned" class="badge pin" title="置顶">▲</em>
            <span>{{ it.title }}</span>
            <em v-if="it.draft" class="badge draft">草稿</em>
          </span>
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

      <template v-if="trash.length">
        <div class="group-head">
          <span>回收站</span>
          <em class="count">{{ trash.length }}</em>
        </div>
        <ul class="trashed">
          <li v-for="it in trash" :key="it.srcName" class="trashed-row" :title="it.slug">
            <span class="t">
              <em class="badge deleted">已删除</em>
              <span>{{ it.title }}</span>
            </span>
            <time>{{ it.deletedAt }}</time>
            <span class="acts">
              <button type="button" title="恢复" @click="$emit('restore', it.slug)">恢复</button>
              <button type="button" class="purge" title="彻底删除" @click="$emit('purge', it.slug)">
                彻底删除
              </button>
            </span>
          </li>
        </ul>
      </template>
    </div>
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
  flex: none;
}
.list-groups {
  flex: 1;
  min-height: 0;
  display: flex;
  flex-direction: column;
}
.live {
  flex: none;
  max-height: 55%;
  overflow: auto;
}
.trashed {
  overflow: auto;
}
ul {
  list-style: none;
  margin: 0;
  padding: 0;
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
  display: inline-flex;
  align-items: center;
  gap: 0.3rem;
  min-width: 0;
  overflow: hidden;
}
li .t > span {
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.badge {
  font-style: normal;
  font-size: 0.66rem;
  border-radius: 4px;
  padding: 0.05rem 0.3rem;
  flex: none;
}
.badge.pin {
  color: var(--vp-c-warning-1);
  border: 1px solid var(--vp-c-warning-1);
}
.badge.draft {
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
}
li time {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  flex: none;
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

.group-head {
  display: flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.6rem 0.5rem 0.2rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  border-top: 1px solid var(--vp-c-divider);
  margin-top: 0.3rem;
  flex: none;
}
.group-head .count {
  font-style: normal;
  font-size: 0.7rem;
  border-radius: 999px;
  padding: 0 0.4rem;
  background: var(--vp-c-bg-soft);
}
.trashed-row {
  cursor: default;
  color: var(--vp-c-text-2);
}
.trashed-row .badge.deleted {
  color: var(--vp-c-danger-1);
  border: 1px solid var(--vp-c-danger-1);
  opacity: 0.7;
}
.trashed-row time {
  font-size: 0.7rem;
}
.trashed-row .acts {
  display: inline-flex;
  gap: 0.25rem;
  flex: none;
}
.trashed-row .acts button {
  border: 1px solid var(--vp-c-divider);
  background: none;
  border-radius: 5px;
  padding: 0.1rem 0.45rem;
  font-size: 0.72rem;
  cursor: pointer;
  color: var(--vp-c-brand-1);
}
.trashed-row .acts button.purge {
  color: var(--vp-c-danger-1);
}
</style>