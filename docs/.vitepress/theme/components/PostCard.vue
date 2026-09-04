<script setup lang="ts">
import { withBase } from 'vitepress'
import Card from './Card.vue'

/**
 * 文章富卡片：Card 壳 + 标题、元信息、摘要、标签、封面/「阅读全文」。
 * 通过 props 传入数据，在首页与标签文章列表间复用。
 */
const props = withDefaults(
  defineProps<{
    title: string
    href: string
    date?: string
    tags?: string[]
    excerpt?: string
    cover?: string
    /** 是否显示右侧媒体位（无封面时显示「阅读全文」按钮） */
    media?: boolean
    /** 尺寸档位：default 首页大卡片；compact 缩略图小卡片 */
    size?: 'default' | 'compact'
  }>(),
  { media: true, size: 'default' },
)

// 标签 pill 最多展示 3 个，超出折叠为 +N
const MAX_PILLS = 3
function visibleTags(tags?: string[]): string[] {
  return (tags ?? []).slice(0, MAX_PILLS)
}
function extraCount(tags?: string[]): number {
  return Math.max(0, (tags?.length ?? 0) - MAX_PILLS)
}
function tagHref(tag: string): string {
  return withBase(`/tags/${encodeURIComponent(tag)}.html`)
}
</script>

<template>
  <Card>
    <div class="post-card" :class="{ 'post-card--compact': props.size === 'compact' }">
    <div class="card-body">
      <a class="card-title" :href="props.href">
        <span class="title-text">{{ props.title }}</span>
      </a>

      <div v-if="props.date || (props.tags && props.tags.length)" class="card-meta">
        <span v-if="props.date" class="meta-item">
          <span class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round">
              <rect x="3.5" y="5" width="17" height="15.5" rx="2.5" />
              <path d="M3.5 9.5h17" />
              <path d="M8 3v3.5M16 3v3.5" />
            </svg>
          </span>
          <time>{{ props.date }}</time>
        </span>
        <span v-if="props.tags && props.tags.length" class="meta-item">
          <span class="meta-icon" aria-hidden="true">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8"
              stroke-linecap="round" stroke-linejoin="round">
              <path d="M5.5 4.5A1.5 1.5 0 0 1 7 3h11.5v15.5H7a1.5 1.5 0 0 0-1.5 1.5z" />
              <path d="M5.5 4.5v15A1.5 1.5 0 0 0 7 21h11.5" />
            </svg>
          </span>
          <span class="meta-text">{{ props.tags[0] }}</span>
        </span>
      </div>

      <p v-if="props.excerpt" class="card-excerpt">{{ props.excerpt }}</p>

      <div v-if="props.tags && props.tags.length" class="card-tags">
        <a
          v-for="t in visibleTags(props.tags)"
          :key="t"
          class="tag-pill"
          :href="tagHref(t)"
        >
          #{{ t }}
        </a>
        <span v-if="extraCount(props.tags)" class="tag-pill tag-more">
          +{{ extraCount(props.tags) }}
        </span>
      </div>
    </div>

    <a
      v-if="props.media"
      class="card-media"
      :class="{ 'media--no-cover': !props.cover }"
      :href="props.href"
      :aria-label="`阅读全文：${props.title}`"
    >
      <img v-if="props.cover" :src="props.cover" :alt="props.title" loading="lazy" />
      <span v-else class="read-more">
        阅读全文
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
          stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">
          <path d="M5 12h14M13 6l6 6-6 6" />
        </svg>
      </span>
    </a>
    </div>
  </Card>
</template>

<style scoped>
.post-card {
  --accent: var(--vp-c-brand-1);
  --accent-hover: var(--vp-c-brand-2);
  --soft: var(--vp-c-brand-soft);

  display: flex;
  align-items: stretch;
  gap: 1.5rem;
  padding: 1.25rem 1.5rem;
}

/* compact 档：缩略图适中，适合合集/标签列表等轻量场景 */
.post-card--compact .card-media {
  width: 200px;
  min-height: 128px;
}
.post-card--compact .title-text {
  font-size: 1.05rem;
}
@media (max-width: 720px) {
  .post-card--compact .card-media {
    width: 100%;
    aspect-ratio: 16 / 9;
  }
}

.card-body {
  flex: 1;
  min-width: 0;
  display: flex;
  flex-direction: column;
}

/* 标题 */
.card-title {
  display: flex;
  align-items: stretch;
  gap: 0.75rem;
  text-decoration: none;
  color: var(--vp-c-text-1);
}
.title-text {
  font-size: 1.25rem;
  font-weight: 700;
  line-height: 1.4;
  transition: color 0.2s;
}
.card-title:hover .title-text {
  color: var(--accent);
}

/* 元信息：图标在浅色圆角方块里 */
.card-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 1.25rem;
  margin: 0.85rem 0;
}
.meta-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
}
.meta-icon {
  flex: none;
  width: 28px;
  height: 28px;
  display: grid;
  place-items: center;
  border-radius: 8px;
  background: var(--soft);
  color: var(--accent);
}
.meta-icon svg {
  width: 15px;
  height: 15px;
}

/* 摘要：最多两行 */
.card-excerpt {
  margin: 0 0 1rem;
  color: var(--vp-c-text-2);
  font-size: 0.9rem;
  line-height: 1.65;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}

/* 标签 pills */
.card-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
  margin-top: auto;
}
.tag-pill {
  padding: 0.25rem 0.75rem;
  border-radius: 999px;
  background: var(--soft);
  color: var(--accent);
  font-size: 0.8rem;
  font-weight: 500;
  text-decoration: none;
  transition:
    background 0.2s,
    color 0.2s;
}
a.tag-pill:hover {
  background: var(--accent);
  color: #fff;
}
.tag-more {
  cursor: default;
}

/* ---- 右侧媒体位：有封面显示图片，无封面显示「阅读全文」按钮 ---- */
/* 图片绝对定位填充：卡片高度由文字内容决定，避免竖图把卡片撑开 */
.card-media {
  position: relative;
  flex: none;
  width: 232px;
  min-height: 168px;
  border-radius: 10px;
  overflow: hidden;
  display: flex;
  align-items: center;
  justify-content: center;
  text-decoration: none;
}
.card-media img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 0.35s ease;
}
.post-card:hover .card-media img {
  transform: scale(1.03);
}
.read-more {
  display: inline-flex;
  align-items: center;
  gap: 0.4rem;
  padding: 0.55rem 1.15rem;
  border-radius: 999px;
  background: var(--accent);
  color: #fff;
  font-size: 0.85rem;
  font-weight: 500;
  white-space: nowrap;
  transition:
    background 0.2s,
    gap 0.2s;
}
.read-more svg {
  width: 15px;
  height: 15px;
  transition: transform 0.2s;
}
.card-media:hover .read-more {
  background: var(--accent-hover);
  gap: 0.7rem;
}
.card-media:hover .read-more svg {
  transform: translateX(2px);
}

/* ---- 响应式 ---- */
@media (max-width: 900px) {
  .card-media {
    width: 200px;
  }
  .title-text {
    font-size: 1.1rem;
  }
}

@media (max-width: 720px) {
  .post-card {
    flex-direction: column;
    padding: 1.1rem;
    gap: 1rem;
  }
  .card-media {
    width: 100%;
    order: -1;
    min-height: 0;
    aspect-ratio: 16 / 9;
  }
  .read-more {
    margin: 0.4rem 0;
  }
  /* 移动端无封面：不渲染大空框和「阅读全文」按钮，标题仍可点击 */
  .card-media.media--no-cover {
    display: none;
  }
}
</style>
