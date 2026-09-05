<script setup lang="ts">
import DefaultTheme from "vitepress/theme";
import { useData } from "vitepress";
import { computed } from "vue";
import GiscusComment from "./components/GiscusComment.vue";
import AdminEntry from "./components/AdminEntry.vue";
import SiteFooter from "./components/SiteFooter.vue";

const { page } = useData();
// 仅文章页（posts/）挂评论区
const isPost = computed(() => Boolean(page.value.relativePath?.startsWith("posts/")));
</script>

<template>
  <DefaultTheme.Layout>
    <template #nav-bar-content-after>
      <!-- 仅 dev 渲染（组件内部有 DEV 判断），生产构建整体被摇掉 -->
      <AdminEntry />
    </template>
    <template #doc-after>
      <GiscusComment v-if="isPost" />
    </template>
    <!-- 全站页脚（版权 + 备案号）：默认 footer 不在有侧栏的页面渲染，故用 layout-bottom 插槽自绘 -->
    <template #layout-bottom>
      <SiteFooter />
    </template>
  </DefaultTheme.Layout>
</template>
