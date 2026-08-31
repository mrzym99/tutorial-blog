<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PostList, { type ListItem } from './PostList.vue'
import TrashList, { type TrashItem } from './TrashList.vue'

type View = 'posts' | 'trash'

interface Draft {
  slug: string
  slugTouched: boolean
  frontmatter: {
    title: string
    date: string
    tags: string[]
    excerpt: string
    draft: boolean
    pinned: boolean
  }
  body: string
}

const list = ref<ListItem[]>([])
const trash = ref<TrashItem[]>([])
const view = ref<View>('posts')
const notice = ref('')

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
  const rec = await api<{ frontmatter?: Partial<Draft['frontmatter']>; body?: string }>(
    `/api/admin/posts/${encodeURIComponent(slug)}`,
  )
  const draft: Draft = {
    slug,
    slugTouched: true,
    frontmatter: {
      title: rec.frontmatter?.title ?? '',
      date: rec.frontmatter?.date ?? todayStr(),
      tags: rec.frontmatter?.tags ?? [],
      excerpt: rec.frontmatter?.excerpt ?? '',
      draft: rec.frontmatter?.draft ?? false,
      pinned: rec.frontmatter?.pinned ?? false,
    },
    body: rec.body ?? '',
  }
  openEditor(draft)
}

function newPost() {
  const draft: Draft = {
    slug: '',
    slugTouched: false,
    frontmatter: {
      title: '',
      date: todayStr(),
      tags: [],
      excerpt: '',
      draft: false,
      pinned: false,
    },
    body: '',
  }
  openEditor(draft)
}

async function removePost(slug: string) {
  if (!confirm(`删除“${slug}”？会移入回收站。`)) return
  const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  if (res.ok) {
    await loadList()
    await loadTrash()
    notice.value = '已删除'
  } else {
    const data = await res.json().catch(() => ({}))
    notice.value = (data as { error?: string }).error || '删除失败'
  }
}

async function restorePost(slug: string) {
  const res = await fetch(`/api/admin/trash/${encodeURIComponent(slug)}/restore`, {
    method: 'POST',
  })
  await loadList()
  await loadTrash()
  if (res.ok) {
    notice.value = `已恢复「${slug}」`
  } else {
    const data = await res.json().catch(() => ({}))
    notice.value = (data as { error?: string }).error || '恢复失败'
  }
}

async function purgePost(slug: string) {
  if (!confirm(`彻底删除「${slug}」？该操作不可恢复。`)) return
  const res = await fetch(`/api/admin/trash/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  await loadList()
  await loadTrash()
  if (res.ok) {
    notice.value = `「${slug}」已彻底删除`
  } else {
    const data = await res.json().catch(() => ({}))
    notice.value = (data as { error?: string }).error || '删除失败'
  }
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
      <span class="brand">写作后台</span>

      <nav class="tabs" aria-label="后台页面">
        <button
          type="button"
          :class="{ on: view === 'posts' }"
          :aria-current="view === 'posts' ? 'page' : undefined"
          @click="view = 'posts'"
        >
          文章
        </button>
        <button
          type="button"
          :class="{ on: view === 'trash' }"
          :aria-current="view === 'trash' ? 'page' : undefined"
          @click="view = 'trash'"
        >
          回收站
          <span v-if="trash.length" class="tab-cnt">{{ trash.length }}</span>
        </button>
      </nav>

      <span class="spacer" />

      <button type="button" class="primary" @click="newPost">＋ 新建文章</button>
    </header>

    <main class="content">
      <PostList v-if="view === 'posts'" :items="list" @edit="selectPost" @remove="removePost" />
      <TrashList
        v-else
        :trash="trash"
        @restore="restorePost"
        @purge="purgePost"
      />
    </main>

    <transition name="toast">
      <div v-if="notice" class="toast" role="status">{{ notice }}</div>
    </transition>
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

/* ---- 顶部栏 ---- */
.topbar {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
}
.brand {
  font-weight: 700;
  font-size: 0.98rem;
  letter-spacing: 0.02em;
}
.tabs {
  display: inline-flex;
  gap: 0.25rem;
  margin-left: 0.75rem;
  padding: 0.18rem;
  background: var(--vp-c-bg-soft);
  border-radius: 9px;
}
.tabs button {
  border: none;
  background: none;
  padding: 0.34rem 0.9rem;
  border-radius: 7px;
  font-size: 0.86rem;
  color: var(--vp-c-text-2);
  cursor: pointer;
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
}
.tabs button.on {
  background: var(--vp-c-bg);
  color: var(--vp-c-text-1);
  font-weight: 600;
  box-shadow: 0 1px 3px rgba(0, 0, 0, 0.08);
}
.tabs .tab-cnt {
  font-size: 0.68rem;
  background: var(--vp-c-brand-1);
  color: #fff;
  border-radius: 999px;
  padding: 0 0.42rem;
  line-height: 1.4;
}
.spacer {
  flex: 1;
}
.topbar button {
  padding: 0.34rem 0.9rem;
  border-radius: 7px;
  font-size: 0.86rem;
  cursor: pointer;
}
.topbar button.primary {
  border: none;
  background: var(--vp-c-brand-1);
  color: #fff;
}
.topbar button.primary:hover {
  background: var(--vp-c-brand-2);
}

/* ---- 正文区 ---- */
.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--vp-c-bg-soft);
}

/* ---- 轻提示 toast ---- */
.toast {
  position: absolute;
  left: 50%;
  bottom: 1.5rem;
  transform: translateX(-50%);
  background: var(--vp-c-text-1);
  color: var(--vp-c-bg);
  padding: 0.45rem 1rem;
  border-radius: 999px;
  font-size: 0.85rem;
  box-shadow: 0 4px 16px rgba(0, 0, 0, 0.2);
}
.toast-enter-active,
.toast-leave-active {
  transition: opacity 0.2s, transform 0.2s;
}
.toast-enter-from,
.toast-leave-to {
  opacity: 0;
  transform: translate(-50%, 8px);
}
</style>