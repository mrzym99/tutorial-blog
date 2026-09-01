<script setup lang="ts">
import { data as postsData } from "../../data/posts.data";
import { withBase } from "vitepress";
import Card from "./Card.vue";

const posts = postsData.posts;

function postHref(slug: string): string {
  return withBase(`/posts/${slug}.html`);
}
</script>

<template>
  <div class="home-feed">
    <header class="feed-header">
      <h1>教程博客</h1>
      <p>记录前端与工程实践的教程文章</p>
    </header>

    <div class="post-list">
      <Card
        v-for="p in posts"
        :key="p.slug"
        :title="p.title"
        :href="postHref(p.slug)"
        :date="p.date"
        :tags="p.tags"
        :excerpt="p.excerpt"
        :cover="p.cover"
      />
      <p v-if="!posts.length" class="empty">还没有文章。</p>
    </div>
  </div>
</template>

<style scoped>
.home-feed {
  min-height: 70vh;
}

/* ---- 页头 ---- */
.feed-header h1 {
  margin: 0 0 0.4rem;
  font-size: 1.6rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.feed-header p {
  margin: 0 0 1.8rem;
  color: var(--vp-c-text-2);
  font-size: 0.95rem;
}

/* ---- 列表间距（卡片样式在 Card 内） ---- */
.post-list {
  display: grid;
  gap: 1rem;
}

.empty {
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 3rem 0;
}

@media (max-width: 720px) {
  .feed-header h1 {
    font-size: 1.5rem;
  }
}
</style>
