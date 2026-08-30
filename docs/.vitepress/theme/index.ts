import type { Theme } from 'vitepress'
import DefaultTheme from 'vitepress/theme'
import Layout from './Layout.vue'
import AdminPage from '../admin/AdminPage.vue'
import HomePostList from './components/HomePostList.vue'
import GiscusComment from './components/GiscusComment.vue'
import './style.css'

export default {
  extends: DefaultTheme,
  Layout,
  enhanceApp({ app }) {
    app.component('AdminPage', AdminPage)
    app.component('HomePostList', HomePostList)
    app.component('GiscusComment', GiscusComment)
  },
} satisfies Theme