<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import type { PostMeta } from '../../lib/tags'
import Card from './Card.vue'

// 按月分组：{ YYYY-MM -> PostMeta[] }，月份倒序
const groups = computed<Array<[string, PostMeta[]]>>(() => {
  const map = new Map<string, PostMeta[]>()
  for (const p of postsData.posts) {
    const key = p.date.slice(0, 7)
    if (!map.has(key)) map.set(key, [])
    map.get(key)!.push(p)
  }
  return [...map.entries()].sort((a, b) => (a[0] < b[0] ? 1 : -1))
})

function monthLabel(ym: string): string {
  const [y, m] = ym.split('-')
  return `${y} 年 ${m} 月`
}

function postHref(slug: string): string {
  return withBase(`/posts/${slug}.html`)
}
</script>

<template>
  <div v-if="groups.length" class="archive">
    <section v-for="[ym, posts] in groups" :key="ym" class="archive-group">
      <h2>{{ monthLabel(ym) }}</h2>
      <div class="card-list">
        <Card
          v-for="p in posts"
          :key="p.slug"
          :title="p.title"
          :href="postHref(p.slug)"
          :date="p.date"
          :cover="p.cover"
          size="compact"
        />
      </div>
    </section>
  </div>
  <p v-else>还没有文章。</p>
</template>

<style scoped>
.card-list {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}
</style>
