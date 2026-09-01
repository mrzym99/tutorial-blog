<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { computed } from "vue";
import GiscusComment from "./components/GiscusComment.vue";

const { page } = useData();
// 仅文章页（posts/）挂评论区
const isPost = computed(() => Boolean(page.value.relativePath?.startsWith("posts/")));
</script>

<template>
  <DefaultTheme.Layout>
    <template #doc-after>
      <GiscusComment v-if="isPost" />
    </template>
  </DefaultTheme.Layout>
</template>
