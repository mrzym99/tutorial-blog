<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import { NButton, NTabs, NTabPane } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import PostList, { type ListItem } from './PostList.vue'
import TrashList, { type TrashItem } from './TrashList.vue'
import { newSlug } from '../lib/slug'

type View = 'posts' | 'trash'

const message = useMessage()
const dialog = useDialog()

interface Draft {
  slug: string
  frontmatter: {
    title: string
    date: string
    tags: string[]
    excerpt: string
    cover: string
    draft: boolean
    pinned: boolean
  }
  body: string
}

const list = ref<ListItem[]>([])
const trash = ref<TrashItem[]>([])
const view = ref<View>('posts')

// 编辑器页的草稿中转 key
const DRAFT_KEY = 'admin-draft'

async function loadList() {
  list.value = await api<ListItem[]>('/api/admin/posts')
}

async function loadTrash() {
  await api<TrashItem[]>('/api/admin/trash')
    .then((d) => (trash.value = d))
    .catch(() => (trash.value = []))
}

onMounted(() => {
  loadList()
  loadTrash()
  // 从编辑器标签返回时刷新列表，保证标题/置顶等改动即时可见
  window.addEventListener('focus', loadList)
})
onBeforeUnmount(() => window.removeEventListener('focus', loadList))

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 把草稿写入 sessionStorage 并在当前标签跳转到全屏编辑器页。 */
function openEditor(draft: Draft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  location.href = '/admin-edit'
}

async function selectPost(slug: string) {
  const rec = await api<{
    title?: string
    date?: string
    tags?: string[]
    excerpt?: string
    cover?: string
    draft?: boolean
    pinned?: boolean
    body?: string
  }>(`/api/admin/posts/${encodeURIComponent(slug)}`)
  const draft: Draft = {
    slug, // 已有文章保持原 slug，URL 不变
    frontmatter: {
      title: rec.title ?? '',
      date: rec.date ?? todayStr(),
      tags: rec.tags ?? [],
      excerpt: rec.excerpt ?? '',
      cover: rec.cover ?? '',
      draft: rec.draft ?? false,
      pinned: rec.pinned ?? false,
    },
    body: rec.body ?? '',
  }
  openEditor(draft)
}

function newPost() {
  const draft: Draft = {
    slug: newSlug(), // 系统生成 UUID，用户不参与定义
    frontmatter: {
      title: '',
      date: todayStr(),
      tags: [],
      excerpt: '',
      cover: '',
      draft: false,
      pinned: false,
    },
    body: '',
  }
  openEditor(draft)
}

async function removePost(slug: string) {
  dialog.warning({
    title: '移入回收站',
    content: `删除「${slug}」？删除后会移入回收站，可随时恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    async onPositiveClick() {
      const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })
      if (res.ok) {
        await loadList()
        await loadTrash()
        message.success('已删除')
      } else {
        const data = await res.json().catch(() => ({}))
        message.error((data as { error?: string }).error || '删除失败')
      }
      return true
    },
  })
}

async function restorePost(slug: string) {
  const res = await fetch(`/api/admin/trash/${encodeURIComponent(slug)}/restore`, {
    method: 'POST',
  })
  await loadList()
  await loadTrash()
  if (res.ok) {
    message.success(`已恢复「${slug}」`)
  } else {
    const data = await res.json().catch(() => ({}))
    message.error((data as { error?: string }).error || '恢复失败')
  }
}

function purgePost(slug: string) {
  dialog.warning({
    title: '彻底删除',
    content: `彻底删除「${slug}」？该操作不可恢复。`,
    positiveText: '彻底删除',
    negativeText: '取消',
    async onPositiveClick() {
      const res = await fetch(`/api/admin/trash/${encodeURIComponent(slug)}`, { method: 'DELETE' })
      await loadList()
      await loadTrash()
      if (res.ok) {
        message.success(`「${slug}」已彻底删除`)
      } else {
        const data = await res.json().catch(() => ({}))
        message.error((data as { error?: string }).error || '删除失败')
      }
      return true
    },
  })
}

async function api<T>(path: string): Promise<T> {
  const res = await fetch(path)
  if (!res.ok) {
    const data = await res.json().catch(() => ({}))
    throw new Error((data as { error?: string }).error || `请求失败 ${res.status}`)
  }
  return res.json() as Promise<T>
}
</script>

<template>
  <div class="admin">
    <header class="topbar">
      <div class="brand">写作后台</div>
      <div class="actions">
        <n-button type="primary" @click="newPost">＋ 新建文章</n-button>
      </div>
    </header>

    <nav class="tabbar">
      <n-tabs
        class="tabs"
        type="line"
        size="medium"
        :value="view"
        @update:value="(v) => (view = v as View)"
      >
        <n-tab-pane name="posts">
          <template #tab>文章（{{ list.length }}）</template>
        </n-tab-pane>
        <n-tab-pane name="trash">
          <template #tab>回收站{{ trash.length ? '（' + trash.length + '）' : '' }}</template>
        </n-tab-pane>
      </n-tabs>
    </nav>

    <main class="content">
      <PostList v-if="view === 'posts'" :items="list" @edit="selectPost" @remove="removePost" />
      <TrashList
        v-else
        :trash="trash"
        @restore="restorePost"
        @purge="purgePost"
      />
    </main>
  </div>
</template>

<style scoped>
.admin {
  position: relative;
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 10px;
  overflow: hidden;
  background: var(--vp-c-bg);
}

/* ---- 顶部标题栏 ---- */
.topbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.85rem 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.brand {
  font-weight: 700;
  font-size: 1.05rem;
  letter-spacing: 0.02em;
  color: var(--vp-c-text-1);
}
.actions {
  display: flex;
  align-items: center;
  gap: 0.5rem;
}

/* ---- Tab 导航栏 ---- */
.tabbar {
  padding: 0 1.25rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.tabs {
  width: 100%;
}
.tabs :deep(.n-tabs-nav) {
  border-bottom: none;
}

/* ---- 正文区 ---- */
.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--vp-c-bg);
}
</style>