<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { computed } from "vue";
import GiscusComment from "./components/GiscusComment.vue";
import CollectionNav from "./components/CollectionNav.vue";
import AdminEntry from "./components/AdminEntry.vue";

const { page } = useData();
// 仅文章页（posts/）挂合集导航与评论区
const isPost = computed(() => Boolean(page.value.relativePath?.startsWith("posts/")));
</script>

<template>
  <DefaultTheme.Layout>
    <template #nav-bar-content-after>
      <!-- 仅 dev 渲染（组件内部有 DEV 判断），生产构建整体被摇掉 -->
      <AdminEntry />
    </template>
    <template #doc-before>
      <CollectionNav v-if="isPost" />
    </template>
    <template #doc-after>
      <GiscusComment v-if="isPost" />
    </template>
  </DefaultTheme.Layout>
</template>
