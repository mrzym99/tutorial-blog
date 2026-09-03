<script setup lang="ts">
import { computed } from 'vue'
import { withBase, useData } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
import { data as collectionsData } from '../../data/collections.data'
import { postsByCollection } from '../../lib/collections'

/**
 * 文章页合集导航盒：显示所属合集、当前章节序号与上/下一篇。
 * 仅在文章归属合集时渲染（Layout 控制）。
 */
const { page } = useData()

const currentSlug = computed(() => {
  const rel = page.value.relativePath ?? ''
  return rel.replace(/^posts\//, '').replace(/\.md$/, '')
})

const current = computed(() => postsData.posts.find((p) => p.slug === currentSlug.value))

const collection = computed(() =>
  current.value?.collection
    ? collectionsData.collections.find((c) => c.slug === current.value?.collection)
    : undefined,
)

const siblings = computed(() =>
  current.value?.collection ? postsByCollection(postsData.posts, current.value.collection) : [],
)

const index = computed(() => siblings.value.findIndex((p) => p.slug === currentSlug.value))

const prev = computed(() => (index.value > 0 ? siblings.value[index.value - 1] : undefined))
const next = computed(() =>
  index.value >= 0 && index.value < siblings.value.length - 1
    ? siblings.value[index.value + 1]
    : undefined,
)

function postHref(slug: string): string {
  return withBase(`/posts/${slug}.html`)
}
function collectionHref(slug: string): string {
  return withBase(`/collections/${encodeURIComponent(slug)}.html`)
}
</script>

<template>
  <div v-if="current && collection" class="collection-nav">
    <div class="head">
      <span class="label">合集</span>
      <a class="name" :href="collectionHref(collection.slug)">{{ collection.title }}</a>
      <span class="position">{{ index + 1 }} / {{ siblings.length }}</span>
    </div>
    <div class="links">
      <a v-if="prev" class="link prev" :href="postHref(prev.slug)">
        <span class="dir">← 上一篇</span>
        <span class="link-title">{{ prev.title }}</span>
      </a>
      <span v-else class="link placeholder" />
      <a v-if="next" class="link next" :href="postHref(next.slug)">
        <span class="dir">下一篇 →</span>
        <span class="link-title">{{ next.title }}</span>
      </a>
      <span v-else class="link placeholder" />
    </div>
  </div>
</template>

<style scoped>
.collection-nav {
  margin: 1rem 0 1.5rem;
  padding: 0.9rem 1.1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  background: var(--vp-c-bg-soft);
}
.head {
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 0.7rem;
}
.label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
  border: 1px solid var(--vp-c-divider);
  border-radius: 4px;
  padding: 0.05rem 0.4rem;
}
.name {
  font-weight: 700;
  font-size: 0.95rem;
  color: var(--vp-c-text-1);
  text-decoration: none;
}
.name:hover {
  color: var(--vp-c-brand-1);
}
.position {
  margin-left: auto;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

.links {
  display: flex;
  gap: 0.75rem;
}
.link {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
  gap: 0.15rem;
  padding: 0.55rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  text-decoration: none;
  background: var(--vp-c-bg);
  transition: border-color 0.2s;
}
.link:hover {
  border-color: var(--vp-c-brand-1);
}
.link.next {
  text-align: right;
}
.link.placeholder {
  visibility: hidden;
}
.dir {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
.link-title {
  font-size: 0.88rem;
  color: var(--vp-c-text-1);
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
</style>
