---
layout: doc
---

# 标签：{{ tag }}

<ul>
  <li v-for="p in listed" :key="p.slug">
    <a :href="withBase(`/posts/${p.slug}.html`)">{{ p.title }}</a>
    <time>({{ p.date }})</time>
  </li>
</ul>
<p v-if="!listed.length">该标签下暂无文章。</p>

<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'
import { data as postsData } from '../.vitepress/data/posts.data'
import { postsByTag } from '../.vitepress/lib/tags'

const { params } = useData()

// 动态路由注入的 params（string 或 string[]，取首个）
const tag = computed(() => {
  const raw = params.value?.tag
  const name = Array.isArray(raw) ? raw[0] : raw
  return String(name ?? '')
})

const listed = computed(() => postsByTag(postsData.posts, tag.value))
</script>