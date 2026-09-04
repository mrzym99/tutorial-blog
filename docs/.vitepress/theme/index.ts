import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import { defineAsyncComponent } from 'vue'
import Layout from './Layout.vue'
import HomePostList from './components/HomePostList.vue'
import ArchiveList from './components/ArchiveList.vue'
import TagIndex from './components/TagIndex.vue'
import TagPostList from './components/TagPostList.vue'
import CollectionIndex from './components/CollectionIndex.vue'
import CollectionPostList from './components/CollectionPostList.vue'
import GiscusComment from './components/GiscusComment.vue'
import AdminPlaceholder from '../admin/AdminPlaceholder.vue'
// @ts-ignore CSS 文件无类型声明（side-effect import）
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    // 后台（naive-ui / md-editor-v3 等重依赖）只在 dev 注册：
    // 生产构建时 DEV 为 false，整个 admin 依赖子树被摇树剪掉，不进产物
    if (import.meta.env.DEV) {
      app.component('AdminPage', defineAsyncComponent(() => import('../admin/AdminPage.vue')))
      app.component(
        'AdminEditorPage',
        defineAsyncComponent(() => import('../admin/AdminEditorPage.vue')),
      )
    } else {
      app.component('AdminPage', AdminPlaceholder)
      app.component('AdminEditorPage', AdminPlaceholder)
    }
    app.component('HomePostList', HomePostList)
    app.component('ArchiveList', ArchiveList)
    app.component('TagIndex', TagIndex)
    app.component('TagPostList', TagPostList)
    app.component('CollectionIndex', CollectionIndex)
    app.component('CollectionPostList', CollectionPostList)
    app.component('GiscusComment', GiscusComment)
  },
} satisfies Theme