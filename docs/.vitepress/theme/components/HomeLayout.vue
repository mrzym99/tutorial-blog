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

// 归档统计（按年份）
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
  <div class="home-layout">
    <!-- 左侧边栏 -->
    <aside class="sidebar">
      <section class="side-card site-info">
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
      </section>

      <section class="side-card">
        <h4 class="card-title">标签云</h4>
        <div class="tag-cloud">
          <a
            v-for="t in tagStats"
            :key="t.tag"
            class="tag-item"
            :href="withBase(`/tags.html#${encodeURIComponent(t.tag)}`)"
          >
            {{ t.tag }}
            <span class="tag-count">{{ t.count }}</span>
          </a>
        </div>
        <a v-if="tagStats.length" class="more-link" :href="withBase('/tags.html')">全部标签 →</a>
      </section>

      <section class="side-card">
        <h4 class="card-title">归档</h4>
        <ul class="archive-list">
          <li v-for="a in archiveStats" :key="a.year">
            <a :href="withBase(`/archive.html#${a.year}`)">
              <span>{{ a.year }} 年</span>
              <span class="count">{{ a.count }} 篇</span>
            </a>
          </li>
        </ul>
        <a v-if="archiveStats.length" class="more-link" :href="withBase('/archive.html')">全部归档 →</a>
      </section>
    </aside>

    <!-- 右侧文章列表 -->
    <main class="main">
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
    </main>
  </div>
</template>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: 1fr 260px;
  gap: 2rem;
  align-items: start;
}

/* ---- 右侧 aside ---- */
.sidebar {
  position: sticky;
  top: calc(var(--vp-nav-height) + 1rem);
  display: flex;
  flex-direction: column;
  gap: 1rem;
  order: 2;
}

/* ---- 主内容 ---- */
.main {
  min-width: 0;
  order: 1;
}

.side-card {
  padding: 1rem 1.1rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
}

.card-title {
  margin: 0 0 0.7rem;
  font-size: 0.88rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  letter-spacing: 0.02em;
}

/* 站点信息 */
.site-info {
  text-align: center;
}
.avatar {
  font-size: 2.2rem;
  margin-bottom: 0.3rem;
}
.site-title {
  margin: 0.2rem 0;
  font-size: 1.05rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.site-desc {
  margin: 0 0 0.8rem;
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
  line-height: 1.5;
}
.stats {
  display: flex;
  justify-content: space-around;
  padding-top: 0.7rem;
  border-top: 1px solid var(--vp-c-divider);
}
.stat {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.15rem;
}
.stat .num {
  font-size: 1.1rem;
  font-weight: 700;
  color: var(--vp-c-brand-1);
}
.stat .label {
  font-size: 0.72rem;
  color: var(--vp-c-text-3);
}

/* 标签云 */
.tag-cloud {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.tag-item {
  display: inline-flex;
  align-items: center;
  gap: 0.25rem;
  padding: 0.2rem 0.55rem;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.75rem;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.tag-item:hover {
  background: var(--vp-c-brand-soft);
  color: var(--vp-c-brand-1);
}
.tag-count {
  font-size: 0.7rem;
  opacity: 0.6;
}

/* 归档列表 */
.archive-list {
  list-style: none;
  padding: 0;
  margin: 0;
}
.archive-list li {
  margin: 0.3rem 0;
}
.archive-list a {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 0.3rem 0.5rem;
  border-radius: 4px;
  color: var(--vp-c-text-2);
  font-size: 0.85rem;
  text-decoration: none;
  transition: background 0.2s, color 0.2s;
}
.archive-list a:hover {
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
}
.archive-list .count {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}

.more-link {
  display: block;
  margin-top: 0.6rem;
  font-size: 0.78rem;
  color: var(--vp-c-text-3);
  text-decoration: none;
  text-align: right;
  transition: color 0.2s;
}
.more-link:hover {
  color: var(--vp-c-brand-1);
}

.home-posts {
  display: grid;
  gap: 1rem;
}
.post-card {
  display: block;
  padding: 1rem 1.25rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg);
  transition: border-color 0.2s, box-shadow 0.2s;
  text-decoration: none;
  color: inherit;
}
.post-card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 2px 12px rgba(0, 0, 0, 0.06);
}
.card-top {
  display: flex;
  align-items: baseline;
  gap: 0.75rem;
  margin-bottom: 0.4rem;
}
.date-rail {
  flex: none;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  font-variant-numeric: tabular-nums;
}
.post-card .title {
  font-size: 1.05rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  text-decoration: none;
  transition: color 0.2s;
}
.post-card .title:hover {
  color: var(--vp-c-brand-1);
}
.post-card .excerpt {
  margin: 0.4rem 0 0.6rem;
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
  line-height: 1.6;
  display: -webkit-box;
  -webkit-line-clamp: 2;
  -webkit-box-orient: vertical;
  overflow: hidden;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}
.chip {
  display: inline-block;
  padding: 0.1rem 0.5rem;
  border-radius: 999px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-brand-1);
  font-size: 0.72rem;
}
.empty {
  color: var(--vp-c-text-3);
  text-align: center;
  padding: 2rem;
}

/* 响应式：窄屏侧边栏收起来 */
@media (max-width: 960px) {
  .home-layout {
    grid-template-columns: 1fr;
  }
  .sidebar {
    position: static;
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 0.75rem;
  }
}
</style>
