<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import Card from './Card.vue'
</script>

<template>
  <div class="card-list">
    <Card
      v-for="t in postsData.tags"
      :key="t.tag"
      :title="t.tag"
      :href="withBase(`/tags/${encodeURIComponent(t.tag)}.html`)"
      :excerpt="`${t.count} 篇文章`"
      :media="false"
    />
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
</style>
