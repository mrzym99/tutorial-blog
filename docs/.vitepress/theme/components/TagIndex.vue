<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import Card from './Card.vue'

function tagHref(tag: string): string {
  return withBase(`/tags/${encodeURIComponent(tag)}.html`)
}
</script>

<template>
  <div class="card-list">
    <Card v-for="t in postsData.tags" :key="t.tag">
      <a class="tag-row" :href="tagHref(t.tag)">
        <span class="tag-name"># {{ t.tag }}</span>
        <span class="tag-count">{{ t.count }} 篇文章</span>
      </a>
    </Card>
  </div>
  <p v-if="!postsData.tags.length">还没有标签。</p>
</template>

<style scoped>
.card-list {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
  gap: 1rem;
  margin: 1rem 0;
}

.tag-row {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
  padding: 1.1rem 1.25rem;
  text-decoration: none;
}
.tag-name {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  transition: color 0.2s;
}
.tag-row:hover .tag-name {
  color: var(--vp-c-brand-1);
}
.tag-count {
  font-size: 0.85rem;
  color: var(--vp-c-text-3);
}
</style>
