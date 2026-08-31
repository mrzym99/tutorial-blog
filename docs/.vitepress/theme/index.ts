import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import AdminPage from '../admin/AdminPage.vue'
import AdminEditorPage from '../admin/AdminEditorPage.vue'
import HomePostList from './components/HomePostList.vue'
import ArchiveList from './components/ArchiveList.vue'
import TagIndex from './components/TagIndex.vue'
import TagPostList from './components/TagPostList.vue'
import GiscusComment from './components/GiscusComment.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('AdminPage', AdminPage)
    app.component('AdminEditorPage', AdminEditorPage)
    app.component('HomePostList', HomePostList)
    app.component('ArchiveList', ArchiveList)
    app.component('TagIndex', TagIndex)
    app.component('TagPostList', TagPostList)
    app.component('GiscusComment', GiscusComment)
  },
} satisfies Theme