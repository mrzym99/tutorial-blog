<script setup lang="ts">
import HomePostList from './HomePostList.vue'
import SiteInfo from './SiteInfo.vue'
</script>

<template>
  <div class="home-layout">
    <div class="home-main">
      <HomePostList />
    </div>
    <SiteInfo class="home-aside" />
  </div>
</template>

<style scoped>
.home-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 260px;
  gap: 2rem;
  align-items: start;
}

/* 右栏跟随滚动：顶部偏移为导航栏高度 + 一点呼吸空间 */
.home-aside {
  position: sticky;
  top: calc(var(--vp-nav-height, 64px) + 1.5rem);
}

/* 窄屏折成单栏，信息栏落到文章流下方 */
@media (max-width: 960px) {
  .home-layout {
    grid-template-columns: minmax(0, 1fr);
  }
  .home-aside {
    position: static;
  }
}
</style>
