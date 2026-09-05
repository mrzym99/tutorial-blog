<script setup lang="ts">
import { useData } from "vitepress";
import { SITE_ICP } from "../site";

const { site } = useData();
const year = new Date().getFullYear();
</script>

<template>
  <footer class="site-footer">
    <p class="copyright">© {{ year }} {{ site.title }}</p>
    <!-- ICP 备案要求：展示备案号并链接到工信部网站；未配置（如海外部署）不显示 -->
    <a v-if="SITE_ICP" href="https://beian.miit.gov.cn/" target="_blank" rel="noreferrer">{{ SITE_ICP }}</a>
  </footer>
</template>

<style scoped>
.site-footer {
  padding: 2rem 1.5rem 3rem;
  text-align: center;
  font-size: 0.875rem;
  line-height: 1.75;
  color: var(--vp-c-text-2);
}

.site-footer p {
  margin: 0;
}

.site-footer a {
  color: inherit;
  text-decoration: none;
  transition: color 0.25s;
}

.site-footer a:hover {
  color: var(--vp-c-brand-1);
}
</style>
