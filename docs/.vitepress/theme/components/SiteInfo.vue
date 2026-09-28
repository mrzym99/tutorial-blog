<script setup lang="ts">
import { withBase } from 'vitepress'
import Card from './Card.vue'
import { data as postsData } from '../../data/posts.data'
import { SITE_AUTHOR } from '../site'

// 站点统计取自公开文章数据：草稿不计入（posts.data 已在加载期过滤）
const postCount = postsData.posts.length
const tagCount = postsData.tags.length
</script>

<template>
  <!-- 外观复用 Card 壳，与文章卡片完全一致（背景 / 圆角 / 阴影 / 暗色描边） -->
  <Card class="site-info" role="complementary" aria-label="站点信息" :hoverable="false">
    <div class="author">
      <img
        v-if="SITE_AUTHOR.avatar"
        class="avatar"
        :src="SITE_AUTHOR.avatar"
        :alt="SITE_AUTHOR.name"
        loading="lazy"
      />
      <div v-else class="avatar placeholder">{{ SITE_AUTHOR.name.slice(0, 1) }}</div>
      <h2 class="name">{{ SITE_AUTHOR.name }}</h2>
      <p class="bio">{{ SITE_AUTHOR.bio }}</p>
    </div>

    <nav class="stats" aria-label="站点统计">
      <a class="stat" :href="withBase('/archives')">
        <span class="stat-label">文章</span>
        <span class="stat-value">{{ postCount }}</span>
      </a>
      <a class="stat" :href="withBase('/tags')">
        <span class="stat-label">标签</span>
        <span class="stat-value">{{ tagCount }}</span>
      </a>
    </nav>

    <nav class="links">
      <a
        v-for="l in SITE_AUTHOR.links"
        :key="l.href"
        :href="l.href"
        target="_blank"
        rel="noreferrer"
        >{{ l.label }}</a
      >
      <a :href="withBase('/rss.xml')" target="_blank" rel="noreferrer">RSS</a>
    </nav>
  </Card>
</template>

<style scoped>
/* 只负责内部排布；卡片外观（背景 / 圆角 / 阴影）由 Card 提供 */
.site-info {
  display: flex;
  flex-direction: column;
  gap: 1.1rem;
  padding: 1.25rem 1.15rem;
}

.author {
  display: flex;
  flex-direction: column;
  align-items: center;
  text-align: center;
}

.avatar {
  width: 72px;
  height: 72px;
  border-radius: 50%;
  object-fit: cover;
  border: 1px solid var(--vp-c-divider);
}
.avatar.placeholder {
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
}

.name {
  margin: 0.7rem 0 0;
  padding: 0;
  border: none;
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}

.bio {
  margin: 0.35rem 0 0;
  font-size: 0.85rem;
  line-height: 1.6;
  color: var(--vp-c-text-2);
}

.stats {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 0.5rem;
  margin: 0;
  padding: 0.85rem 0;
  border-top: 1px solid var(--vp-c-divider);
  border-bottom: 1px solid var(--vp-c-divider);
}
.stat {
  display: block;
  text-align: center;
  text-decoration: none;
  border-radius: 8px;
  transition: background 0.2s;
}
.stat:hover {
  background: var(--vp-c-default-soft);
}
.stat-label {
  display: block;
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  transition: color 0.2s;
}
.stat-value {
  display: block;
  margin-top: 0.15rem;
  font-size: 1.15rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-text-1);
  transition: color 0.2s;
}
.stat:hover .stat-label {
  color: var(--vp-c-text-2);
}
.stat:hover .stat-value {
  color: var(--vp-c-brand-1);
}

.links {
  display: flex;
  flex-wrap: wrap;
  justify-content: center;
  gap: 0.4rem;
}
.links a {
  padding: 0.25rem 0.6rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  text-decoration: none;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  background: var(--vp-c-bg);
  transition:
    color 0.2s,
    border-color 0.2s;
}
.links a:hover {
  color: var(--vp-c-brand-1);
  border-color: var(--vp-c-brand-1);
}
</style>
