<script setup lang="ts">
import { data as postsData } from '../../data/posts.data'
import { computed } from 'vue'
import { withBase } from 'vitepress'

const posts = postsData.posts

// 标签统计
const tagStats = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts) {
    for (const t of p.tags ?? []) {
      map.set(t, (map.get(t) ?? 0) + 1)
    }
  }
  return [...map.entries()]
    .sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
    .map(([tag, count]) => ({ tag, count }))
})

// 归档（按年份）
const archiveStats = computed(() => {
  const map = new Map<string, number>()
  for (const p of posts) {
    const year = p.date?.slice(0, 4) ?? '未知'
    map.set(year, (map.get(year) ?? 0) + 1)
  }
  return [...map.entries()]
    .sort((a, b) => (a[0] < b[0] ? 1 : -1))
    .map(([year, count]) => ({ year, count }))
})

const postCount = posts.length
</script>

<template>
  <div class="site-sidebar">
    <div class="site-info">
      <div class="avatar">📝</div>
      <h3 class="site-title">教程博客</h3>
      <p class="site-desc">记录前端与工程实践的教程文章</p>
      <div class="stats">
        <div class="stat">
          <span class="num">{{ postCount }}</span>
          <span class="label">文章</span>
        </div>
        <div class="stat">
          <span class="num">{{ tagStats.length }}</span>
          <span class="label">标签</span>
        </div>
        <div class="stat">
          <span class="num">{{ archiveStats.length }}</span>
          <span class="label">归档</span>
        </div>
      </div>
    </div>

    <div class="side-group">
      <p class="side-group-title">导航</p>
      <ul class="side-links">
        <li><a :href="withBase('/')">🏠 首页</a></li>
        <li><a :href="withBase('/archives')">📅 归档</a></li>
        <li><a :href="withBase('/tags')">🏷️ 标签</a></li>
        <li><a :href="withBase('/about')">👤 关于</a></li>
      </ul>
    </div>

    <div v-if="tagStats.length" class="side-group">
      <p class="side-group-title">热门标签</p>
      <div class="tag-cloud">
        <a
          v-for="t in tagStats.slice(0, 10)"
          :key="t.tag"
          class="tag-chip"
          :href="withBase(`/tags.html#${encodeURIComponent(t.tag)}`)"
        >
          {{ t.tag }}
          <span class="count">{{ t.count }}</span>
        </a>
      </div>
      <a v-if="tagStats.length > 10" class="more" :href="withBase('/tags.html')">全部标签 →</a>
    </div>

    <div v-if="archiveStats.length" class="side-group">
      <p class="side-group-title">归档</p>
      <ul class="side-links">
        <li v-for="a in archiveStats" :key="a.year">
          <a :href="withBase(`/archives.html#${a.year}`)">
            {{ a.year }} 年
            <span class="count">{{ a.count }}</span>
          </a>
        </li>
      </ul>
    </div>
  </div>
</template>

<style scoped>
.site-sidebar {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0.5rem 0 1rem;
}

/* 站点信息卡 */
.site-info {
  text-align: center;
  padding: 1rem 0.75rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
}
.avatar {
  font-size: 2rem;
  margin-bottom: 0.25rem;
}
.site-title {
  margin: 0.15rem 0;
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.site-desc {
  margin: 0 0 0.75rem;
  font-size: 0.8rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
.stats {
  display: flex;
  justify-content: space-around;
  padding-top: 0.6rem;
  border-top: 1px solid var(--vp-c-divider);
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.1rem;
}
.stat .num {
  font-size: 1rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.stat .label {
  font-size: 0.7rem;
  color: var(--vp-c-text-3);
}

/* 侧边栏分组（与 VitePress sidebar 风格对齐） */
.side-group {
  margin-top: 0.25rem;
}
.side-group-title {
  margin: 0 0 0.5rem;
  padding: 0 0.25rem;
  font-size: 0.78rem;
  font-weight: 600;
  color: var(--vp-c-text-2);
  letter-spacing: 0.02em;
}
.side-links {
  list-style: none;
  padding: 0;
  margin: 0;
}
.side-links li {
  margin: 0;
}
.side-links a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border-radius: 6px;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
  line-height: 1.6;
}
.side-links a:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}
.side-links .count {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}

/* 标签云 */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  padding: 0 0.25rem;
}
.tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.2rem;
  padding: 0.15rem 0.5rem;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.tag-chip:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.tag-chip .count {
  font-size: 0.68rem;
  opacity: 0.6;
}
.more {
  display: block;
  margin-top: 0.5rem;
  padding: 0 0.5rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  text-decoration: none;
  text-align: right;
  transition: color 0.2s;
}
.more:hover {
  color: var(--vp-c-brand-1);
}
</style>
