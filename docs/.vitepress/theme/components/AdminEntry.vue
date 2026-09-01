<script setup>
const isDev = import.meta.env.DEV
</script>

<template>
  <p v-if="isDev" class="admin-entry">
    写作后台：<a href="/admin" target="_blank" rel="noopener noreferrer">/admin</a>
  </p>
</template>

<style scoped>
.admin-entry {
  margin-top: 0.75rem;
  color: var(--vp-c-text-2);
  font-size: 0.92rem;
}
</style>
