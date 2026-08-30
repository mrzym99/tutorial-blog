---
layout: doc
---

# 标签

<script setup lang="ts">
import { data as postsData } from '../.vitepress/data/posts.data'
import { withBase } from 'vitepress'
</script>

<ul class="tag-list">
  <li v-for="t in postsData.tags" :key="t.tag">
    <a :href="withBase(`/tags/${encodeURIComponent(t.tag)}.html`)">{{ t.tag }}</a>
    <span class="count">({{ t.count }})</span>
  </li>
</ul>
<p v-if="!postsData.tags.length">还没有标签。</p>