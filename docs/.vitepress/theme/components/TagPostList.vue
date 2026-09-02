<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import { postsByTag } from '../../lib/tags'
import Card from './Card.vue'

const { params } = useData()

// 动态路由注入的 params（string 或 string[]，取首个）
const tag = computed(() => {
  const raw = params.value?.tag
  const name = Array.isArray(raw) ? raw[0] : raw
  return String(name ?? '')
})

const listed = computed(() => postsByTag(postsData.posts, tag.value))

function postHref(slug: string): string {
  return withBase(`/posts/${slug}.html`)
}
</script>

<template>
  <h1>标签：{{ tag }}</h1>
  <div class="card-list">
    <Card
      v-for="p in listed"
      :key="p.slug"
      :title="p.title"
      :href="postHref(p.slug)"
      :date="p.date"
      :cover="p.cover"
      size="compact"
    />
  </div>
  <p v-if="!listed.length">该标签下暂无文章。</p>
</template>

<style scoped>
.card-list {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}
</style>
