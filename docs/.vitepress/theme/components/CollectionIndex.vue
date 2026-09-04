<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import { data as collectionsData } from '../../data/collections.data'
import { aggregateCollections } from '../../lib/collections'
import Card from './Card.vue'

// 合集网格：草稿合集剔除、按创建日期新在前，文章数就地聚合
const collections = aggregateCollections(collectionsData.collections, postsData.posts)

function collectionHref(slug: string): string {
  return withBase(`/collections/${encodeURIComponent(slug)}.html`)
}
</script>

<template>
  <div class="collection-grid">
    <Card v-for="c in collections" :key="c.slug">
      <a class="collection-card" :href="collectionHref(c.slug)">
        <div class="cover">
          <img v-if="c.cover" :src="c.cover" :alt="c.title" loading="lazy" />
          <div v-else class="cover-placeholder">{{ c.title.slice(0, 1) }}</div>
        </div>
        <div class="body">
          <h2 class="title">{{ c.title }}</h2>
          <p class="desc">{{ c.description || '暂无简介' }}</p>
          <span class="count">{{ c.count }} 篇文章</span>
        </div>
      </a>
    </Card>
  </div>
  <p v-if="!collections.length">还没有合集，先在写作后台创建一个吧。</p>
</template>

<style scoped>
.collection-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(200px, 1fr));
  gap: 1.25rem;
  margin: 1rem 0;
}

.collection-card {
  display: flex;
  flex-direction: column;
  text-decoration: none;
}

/* 封面：16:9，无图时用品牌色块 + 首字占位 */
.cover {
  aspect-ratio: 16 / 9;
  overflow: hidden;
  border-radius: calc(var(--vp-c-border-radius, 12px) - 6px);
  background: var(--vp-c-bg-soft);
  border: 1px solid var(--vp-c-divider);
}
.cover img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  display: block;
  transition: transform 0.3s ease;
}
.cover-placeholder {
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 2.2rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.body {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
  padding: 0.9rem 1.1rem 1.1rem;
}
.title {
  margin: 0;
  padding: 0;
  font-size: 1.08rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
  transition: color 0.2s;
  border: none; 
}
.collection-card:hover .title {
  color: var(--vp-c-brand-1);
}
.desc {
  margin: 0;
  font-size: 0.86rem;
  line-height: 1.55;
  color: var(--vp-c-text-2);
  /* 两行截断，保持卡片高度整齐 */
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.count {
  margin-top: auto;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
}
</style>
