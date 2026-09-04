<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { NButton, NTabs, NTabPane } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import PostList, { type ListItem } from './PostList.vue'
import TrashList, { type TrashItem } from './TrashList.vue'
import CollectionList, { type CollectionItem, type CollectionFormValue } from './CollectionList.vue'
import CollectionDetail, { type CollectionPostItem } from './CollectionDetail.vue'
import { newSlug } from '../lib/slug'
import { DRAFT_KEY, todayStr, type Draft } from './draft'

type View = 'collections' | 'collection-detail' | 'posts' | 'trash'

/** 列表行带合集内序号（排序视图用） */
type PostItem = ListItem & { order?: number }

const message = useMessage()
const dialog = useDialog()

const list = ref<PostItem[]>([])
const trash = ref<TrashItem[]>([])
const collections = ref<CollectionItem[]>([])
const view = ref<View>('collections') // 「先有合集才有文章」：默认落在合集 tab
// 当前查看的合集 slug（collection-detail 视图）
const currentCollection = ref('')
const reorderSaving = ref(false)

async function loadList() {
  list.value = await api<PostItem[]>('/api/admin/posts')
}

async function loadTrash() {
  await api<TrashItem[]>('/api/admin/trash')
    .then((d) => (trash.value = d))
    .catch(() => (trash.value = []))
}

async function loadCollections() {
  const [raw, posts] = await Promise.all([
    api<
      {
        slug: string
        title: string
        description?: string
        cover?: string
        draft?: boolean
        createdAt?: string
      }[]
    >('/api/admin/collections'),
    api<ListItem[]>('/api/admin/posts'),
  ])
  const countBy = new Map<string, number>()
  for (const p of posts) {
    if (!p.collection) continue
    countBy.set(p.collection, (countBy.get(p.collection) ?? 0) + 1)
  }
  collections.value = raw.map((c) => ({ ...c, count: countBy.get(c.slug) ?? 0 }))
}

function reloadAll() {
  loadList()
  loadTrash()
  loadCollections()
}

/** 合集 slug → 标题，供文章表格展示合集名 */
const collectionTitles = computed<Record<string, string>>(() => {
  const map: Record<string, string> = {}
  for (const c of collections.value) map[c.slug] = c.title
  return map
})

onMounted(() => {
  reloadAll()
  // 从编辑器标签返回时刷新列表，保证标题/置顶等改动即时可见
  window.addEventListener('focus', reloadAll)
})
onBeforeUnmount(() => window.removeEventListener('focus', reloadAll))

/** 把草稿写入 sessionStorage 并在新标签页打开全屏编辑器（sessionStorage 会随 window.open 带过去）。 */
function openEditor(draft: Draft) {
  sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft))
  window.open('/admin-edit', '_blank')
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
    collection?: string
    order?: number
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
      collection: rec.collection ?? '',
      order: rec.order,
    },
    body: rec.body ?? '',
  }
  openEditor(draft)
}

/** 新建文章：合集必选（合集 tab 的「写文章」直接带 slug 进入）。 */
function newPost(collection: string) {
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
      collection,
    },
    body: '',
  }
  openEditor(draft)
}

/** 文章 tab 的新建按钮：默认选第一个合集（无合集则引导去合集 tab）。 */
function newPostDefaultCollection() {
  if (!collections.value.length) {
    message.warning('请先创建合集，再写文章')
    view.value = 'collections'
    return
  }
  newPost(collections.value[0].slug)
}

// ---- 合集文章列表 / 排序 ----

function openCollection(slug: string) {
  currentCollection.value = slug
  view.value = 'collection-detail'
}

const currentCollectionMeta = computed(() =>
  collections.value.find((c) => c.slug === currentCollection.value),
)

const collectionPosts = computed<CollectionPostItem[]>(() =>
  list.value
    .filter((p) => p.collection === currentCollection.value)
    .map((p) => ({ slug: p.slug, title: p.title, date: p.date, draft: p.draft, order: p.order })),
)

/** 上移/下移后保存新的顺序；失败时重新拉取列表回滚展示 */
async function reorderPosts(slugs: string[]) {
  if (reorderSaving.value) return
  reorderSaving.value = true
  try {
    const res = await fetch(
      `/api/admin/collections/${encodeURIComponent(currentCollection.value)}/order`,
      {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ slugs }),
      },
    )
    if (res.ok) {
      await loadList()
      message.success('排序已保存')
    } else {
      const data = await res.json().catch(() => ({}))
      message.error((data as { error?: string }).error || '排序保存失败')
      await loadList()
    }
  } finally {
    reorderSaving.value = false
  }
}

// ---- 合集 CRUD ----

async function createCollection(value: CollectionFormValue) {
  const res = await fetch('/api/admin/collections', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontmatter: value }),
  })
  if (res.ok) {
    await loadCollections()
    message.success('合集已创建')
  } else {
    const data = await res.json().catch(() => ({}))
    message.error((data as { error?: string }).error || '创建失败')
  }
}

async function saveCollection(slug: string, value: CollectionFormValue) {
  const res = await fetch(`/api/admin/collections/${encodeURIComponent(slug)}`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ frontmatter: value }),
  })
  if (res.ok) {
    await loadCollections()
    message.success('合集已保存')
  } else {
    const data = await res.json().catch(() => ({}))
    message.error((data as { error?: string }).error || '保存失败')
  }
}

function removeCollection(slug: string) {
  dialog.warning({
    title: '删除合集',
    content: `删除合集「${slug}」？仅允许删除空合集，合集内还有文章时会被拒绝。`,
    positiveText: '删除',
    negativeText: '取消',
    async onPositiveClick() {
      const res = await fetch(`/api/admin/collections/${encodeURIComponent(slug)}`, {
        method: 'DELETE',
      })
      if (res.ok) {
        await loadCollections()
        message.success('合集已删除')
      } else {
        const data = await res.json().catch(() => ({}))
        message.error((data as { error?: string }).error || '删除失败')
      }
      return true
    },
  })
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

async function removeManyPosts(slugs: string[]) {
  dialog.warning({
    title: '批量移入回收站',
    content: `删除选中的 ${slugs.length} 篇文章？删除后会移入回收站，可随时恢复。`,
    positiveText: '删除',
    negativeText: '取消',
    async onPositiveClick() {
      const results = await Promise.all(
        slugs.map((s) =>
          fetch(`/api/admin/posts/${encodeURIComponent(s)}`, { method: 'DELETE' }),
        ),
      )
      const failed = results.filter((r) => !r.ok).length
      await loadList()
      await loadTrash()
      if (failed) message.error(`${failed} 篇删除失败`)
      else message.success(`已删除 ${slugs.length} 篇`)
      return true
    },
  })
}

async function restoreManyPosts(slugs: string[]) {
  // 顺序恢复，避免并发写同一目录时产生竞争
  let failed = 0
  let firstError = ''
  for (const s of slugs) {
    const res = await fetch(`/api/admin/trash/${encodeURIComponent(s)}/restore`, {
      method: 'POST',
    })
    if (!res.ok) {
      failed++
      if (!firstError) {
        const data = await res.json().catch(() => ({}))
        firstError = (data as { error?: string }).error || `恢复「${s}」失败`
      }
    }
  }
  await loadList()
  await loadTrash()
  if (failed) message.error(`${failed} 篇恢复失败：${firstError}`)
  else message.success(`已恢复 ${slugs.length} 篇`)
}

async function purgeAllPosts() {
  const slugs = trash.value.map((t) => t.slug)
  if (!slugs.length) return
  dialog.warning({
    title: '清空回收站',
    content: `彻底清空回收站的 ${slugs.length} 篇文章？该操作不可恢复。`,
    positiveText: '彻底删除',
    negativeText: '取消',
    async onPositiveClick() {
      // 顺序删除，避免并发操作回收站目录时产生竞争
      let failed = 0
      for (const s of slugs) {
        const res = await fetch(`/api/admin/trash/${encodeURIComponent(s)}`, { method: 'DELETE' })
        if (!res.ok) failed++
      }
      await loadTrash()
      if (failed) message.error(`${failed} 篇删除失败`)
      else message.success(`回收站已清空（${slugs.length} 篇）`)
      return true
    },
  })
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
        <n-button type="primary" @click="newPostDefaultCollection">＋ 新建文章</n-button>
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
        <n-tab-pane name="collections">
          <template #tab>合集（{{ collections.length }}）</template>
        </n-tab-pane>
        <n-tab-pane name="posts">
          <template #tab>文章（{{ list.length }}）</template>
        </n-tab-pane>
        <n-tab-pane name="trash">
          <template #tab>回收站{{ trash.length ? '（' + trash.length + '）' : '' }}</template>
        </n-tab-pane>
      </n-tabs>
    </nav>

    <main class="content">
      <CollectionList
        v-if="view === 'collections'"
        :items="collections"
        @open="openCollection"
        @write="newPost"
        @remove="removeCollection"
        @create="createCollection"
        @save="saveCollection"
      />
      <CollectionDetail
        v-else-if="view === 'collection-detail' && currentCollectionMeta"
        :title="currentCollectionMeta.title"
        :description="currentCollectionMeta.description"
        :posts="collectionPosts"
        :saving="reorderSaving"
        @back="view = 'collections'"
        @edit="selectPost"
        @remove="removePost"
        @reorder="reorderPosts"
      />
      <PostList
        v-else-if="view === 'posts'"
        :items="list"
        :collection-titles="collectionTitles"
        @edit="selectPost"
        @remove="removePost"
        @remove-many="removeManyPosts"
      />
      <TrashList
        v-else
        :trash="trash"
        @restore="restorePost"
        @purge="purgePost"
        @restore-many="restoreManyPosts"
        @purge-all="purgeAllPosts"
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