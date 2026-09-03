<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import { data as collectionsData } from '../../data/collections.data'
import { postsByCollection } from '../../lib/collections'
import PostCard from './PostCard.vue'
import Pagination from './Pagination.vue'
import { usePagedList } from '../composables/usePagedList'

const { params } = useData()

// 动态路由注入的 params（string 或 string[]，取首个）
const slug = computed(() => {
  const raw = params.value?.collection
  const name = Array.isArray(raw) ? raw[0] : raw
  return String(name ?? '')
})

const collection = computed(() =>
  collectionsData.collections.find((c) => c.slug === slug.value),
)

// 合集内文章：order 升序（章节序）
const listed = computed(() => postsByCollection(postsData.posts, slug.value))

const PAGE_SIZE = 10
const { page, total, paged } = usePagedList(listed, PAGE_SIZE)

function postHref(postSlug: string): string {
  return withBase(`/posts/${postSlug}.html`)
}

/** 章节序号：分页偏移 + 组内序号，两位补零 */
function ordinal(index: number): string {
  return String((page.value - 1) * PAGE_SIZE + index + 1).padStart(2, '0')
}
</script>

<template>
  <header class="collection-head">
    <h1>{{ collection?.title || '合集' }}</h1>
    <p v-if="collection?.description" class="desc">{{ collection.description }}</p>
  </header>

  <div class="card-list">
    <div v-for="(p, i) in paged" :key="p.slug" class="row">
      <span class="ordinal">{{ ordinal(i) }}</span>
      <div class="row-card">
        <PostCard
          :title="p.title"
          :href="postHref(p.slug)"
          :date="p.date"
          :cover="p.cover"
          size="compact"
        />
      </div>
    </div>
  </div>
  <p v-if="!total">该合集下暂无公开文章。</p>
  <Pagination v-model:page="page" :page-size="PAGE_SIZE" :total="total" />
</template>

<style scoped>
.collection-head {
  margin: 1rem 0 0;
}
.collection-head h1 {
  margin: 0;
  font-size: 1.7rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.desc {
  margin: 0.4rem 0 0;
  font-size: 0.92rem;
  color: var(--vp-c-text-2);
}

.card-list {
  display: grid;
  gap: 1rem;
  margin: 1.25rem 0;
}

/* 序号 + 卡片：横向布局，序号作为章节徽章 */
.row {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.ordinal {
  flex-shrink: 0;
  width: 2.4rem;
  text-align: center;
  font-size: 1.05rem;
  font-weight: 700;
  font-variant-numeric: tabular-nums;
  color: var(--vp-c-brand-1);
  background: var(--vp-c-brand-soft);
  border-radius: 8px;
  padding: 0.45rem 0;
}
.row-card {
  flex: 1;
  min-width: 0;
}

@media (max-width: 560px) {
  .row {
    gap: 0.6rem;
  }
  .ordinal {
    width: 2rem;
    font-size: 0.9rem;
  }
}
</style>
