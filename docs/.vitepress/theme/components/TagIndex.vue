<script setup lang="ts">
import { withBase } from 'vitepress'
import { data as postsData } from '../../data/posts.data'
</script>

<template>
  <ul class="tag-list">
    <li v-for="t in postsData.tags" :key="t.tag">
      <a :href="withBase(`/tags/${encodeURIComponent(t.tag)}.html`)">{{ t.tag }}</a>
      <span class="count">{{ t.count }}</span>
    </li>
  </ul>
  <p v-if="!postsData.tags.length">还没有标签。</p>
</template>