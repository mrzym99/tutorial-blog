<template>
  <article class="card">
    <slot />
  </article>
</template>

<style scoped>
/*
 * 卡片壳：纯 UI 组件，只负责外观（背景、圆角、阴影、hover、深色模式描边）。
 * 里面的内容与交互由使用方通过插槽自行填充（首页富卡片、归档行、标签块等）。
 */
.card {
  background: var(--vp-c-bg);
  border-radius: 12px;
  box-shadow: var(--vp-shadow-2);
  transition: box-shadow 0.25s ease, border-color 0.25s ease;
}
.card:hover {
  box-shadow: var(--vp-shadow-3);
}
/* 暗色模式：黑色阴影在深色背景上不可见，改用描边 + 深投影区分层次 */
.dark .card {
  border: 1px solid var(--vp-c-divider);
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.4);
}
.dark .card:hover {
  border-color: var(--vp-c-brand-1);
  box-shadow: 0 6px 24px rgba(0, 0, 0, 0.55);
}
</style>
