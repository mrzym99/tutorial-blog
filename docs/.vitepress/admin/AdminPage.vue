<script setup lang="ts">
import AdminApp from './AdminApp.vue'

// 写作后台仅在本地开发模式可用；生产构建只渲染提示语。
const isDev = import.meta.env.DEV
</script>

<template>
  <div v-if="isDev">
    <AdminApp />
  </div>
  <div v-else class="prod-notice">
    <h2>写作后台仅在本地开发模式可用</h2>
    <p>运行 <code>pnpm dev</code> 后访问 /admin 开始写作。</p>
  </div>
</template>

<style scoped>
.prod-notice {
  padding: 3rem 1.5rem;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  text-align: center;
  color: var(--vp-c-text-2);
}
</style>