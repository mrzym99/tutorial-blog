<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import { postsByTag } from '../../lib/tags'
import PostCard from './PostCard.vue'
import Pagination from './Pagination.vue'
import { usePagedList } from '../composables/usePagedList'

const { params } = useData()

// 动态路由注入的 params（string 或 string[]，取首个）
const tag = computed(() => {
  const raw = params.value?.tag
  const name = Array.isArray(raw) ? raw[0] : raw
  return String(name ?? '')
})

const listed = computed(() => postsByTag(postsData.posts, tag.value))

// 前端分页：数据源（标签结果）变化时 usePagedList 自动回到第一页
const PAGE_SIZE = 10
const { page, total, paged } = usePagedList(listed, PAGE_SIZE)

function postHref(slug: string): string {
  return withBase(`/posts/${slug}.html`)
}
</script>

<template>
  <h1>标签：{{ tag }}</h1>
  <div class="card-list">
    <PostCard
      v-for="p in paged"
      :key="p.slug"
      :title="p.title"
      :href="postHref(p.slug)"
      :date="p.date"
      :cover="p.cover"
      size="compact"
    />
  </div>
  <p v-if="!total">该标签下暂无文章。</p>
  <Pagination v-model:page="page" :page-size="PAGE_SIZE" :total="total" />
</template>

<style scoped>
.card-list {
  display: grid;
  gap: 1rem;
  margin: 1rem 0;
}
</style>
