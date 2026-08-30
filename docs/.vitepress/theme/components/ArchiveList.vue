<script setup lang="ts">
import { computed } from 'vue'
import { withBase } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import type { PostMeta } from '../../lib/tags'

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
</script>

<template>
  <div v-if="groups.length" class="archive">
    <section v-for="[ym, posts] in groups" :key="ym" class="archive-group">
      <h2>{{ monthLabel(ym) }}</h2>
      <ul class="tag-post-list">
        <li v-for="p in posts" :key="p.slug">
          <time>{{ p.date }}</time>
          <a :href="withBase(`/posts/${p.slug}.html`)">{{ p.title }}</a>
        </li>
      </ul>
    </section>
  </div>
  <p v-else>还没有文章。</p>
</template>