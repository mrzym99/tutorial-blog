<script setup lang="ts">
import { data as postsData } from '../../data/posts.data'
import { withBase } from 'vitepress'

const posts = postsData.posts
</script>

<template>
  <div class="home-posts" aria-label="文章列表">
    <article v-for="p in posts" :key="p.slug" class="post-card">
      <div class="card-top">
        <time class="date-rail">{{ p.date }}</time>
        <a class="title" :href="withBase(`/posts/${p.slug}.html`)">{{ p.title }}</a>
      </div>
      <p v-if="p.excerpt" class="excerpt">{{ p.excerpt }}</p>
      <div v-if="p.tags && p.tags.length" class="chips">
        <span v-for="t in p.tags" :key="t" class="chip">{{ t }}</span>
      </div>
    </article>
    <p v-if="!posts.length" class="empty">还没有文章。</p>
  </div>
</template>