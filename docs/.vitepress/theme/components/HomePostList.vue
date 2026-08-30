<script setup lang="ts">
import { data as postsData } from '../../data/posts.data'
import { withBase } from 'vitepress'

const posts = postsData.posts
</script>

<template>
  <div class="home-posts">
    <a
      v-for="p in posts"
      :key="p.slug"
      class="post-card"
      :href="withBase(`/posts/${p.slug}.html`)"
    >
      <h3>{{ p.title }}</h3>
      <time>{{ p.date }}</time>
      <div v-if="p.excerpt" class="excerpt">{{ p.excerpt }}</div>
      <div v-if="p.tags && p.tags.length" class="tags">
        <span v-for="t in p.tags" :key="t" class="tag">{{ t }}</span>
      </div>
    </a>
    <p v-if="!posts.length">还没有文章。</p>
  </div>
</template>