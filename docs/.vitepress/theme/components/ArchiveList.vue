<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { withBase } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import type { PostMeta } from '../../lib/tags'
import Card from './Card.vue'
import Pagination from './Pagination.vue'

const posts = postsData.posts

// 前端分页：先按篇数切片，再对当前页切片按月分组（与首页一致，每页 10 篇）
const PAGE_SIZE = 10
const page = ref(1)
const totalPages = computed(() => Math.max(1, Math.ceil(posts.length / PAGE_SIZE)))
const paged = computed(() =>
  posts.slice((page.value - 1) * PAGE_SIZE, page.value * PAGE_SIZE),
)
// 数据变化时收敛到合法页码
watch(totalPages, (t) => {
  if (page.value > t) page.value = t
})

// 按月分组：{ YYYY-MM -> PostMeta[] }，月份倒序
const groups = computed<Array<[string, PostMeta[]]>>(() => {
  const map = new Map<string, PostMeta[]>()
  for (const p of paged.value) {
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
  <div v-if="posts.length" class="archive">
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

    <Pagination v-model:page="page" :page-size="PAGE_SIZE" :total="posts.length" />
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
