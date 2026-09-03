<script setup lang="ts">
import AdminApp from './AdminApp.vue'
import NaiveProvider from './NaiveProvider.vue'

// 仅在 dev 注册（见 theme/index.ts）：生产构建不打包整个后台依赖树
</script>

<template>
  <NaiveProvider>
    <AdminApp />
  </NaiveProvider>
</template>
