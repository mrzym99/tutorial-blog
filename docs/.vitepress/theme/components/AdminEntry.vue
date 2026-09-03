<script setup lang="ts">
// 仅 dev 显示的「写作后台」入口按钮，挂在 header 导航栏右侧（见 Layout.vue）。
// 生产构建时 import.meta.env.DEV 被替换为 false，按钮连同样式整体被摇掉。
const isDev = import.meta.env.DEV
</script>

<template>
  <a
    v-if="isDev"
    class="admin-entry"
    href="/admin"
    target="_blank"
    rel="noopener noreferrer"
  >
    写作后台 ↗
  </a>
</template>

<style scoped>
.admin-entry {
  display: inline-flex;
  align-items: center;
  margin-left: 1rem;
  margin-right: 0.75rem;
  padding: 0.25rem 0.85rem;
  border: 1px solid var(--vp-c-divider);
  border-radius: 999px;
  font-size: 0.85rem;
  font-weight: 500;
  color: var(--vp-c-text-2);
  text-decoration: none;
  transition: border-color 0.2s, color 0.2s;
}
.admin-entry:hover {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
</style>
