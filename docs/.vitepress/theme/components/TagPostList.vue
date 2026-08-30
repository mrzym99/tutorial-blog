<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import { postsByTag } from '../../lib/tags'

const { params } = useData()

// 动态路由注入的 params（string 或 string[]，取首个）
const tag = computed(() => {
  const raw = params.value?.tag
  const name = Array.isArray(raw) ? raw[0] : raw
  return String(name ?? '')
})

const listed = computed(() => postsByTag(postsData.posts, tag.value))
</script>

<template>
  <h1>标签：{{ tag }}</h1>
  <ul class="tag-post-list">
    <li v-for="p in listed" :key="p.slug">
      <time>{{ p.date }}</time>
      <a :href="withBase(`/posts/${p.slug}.html`)">{{ p.title }}</a>
    </li>
  </ul>
  <p v-if="!listed.length">该标签下暂无文章。</p>
</template>