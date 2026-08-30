<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import PostList, { type ListItem } from './PostList.vue'
import TrashList, { type TrashItem } from './TrashList.vue'
import FrontmatterForm, { type DraftFrontmatter } from './FrontmatterForm.vue'
import PostEditor from './PostEditor.vue'
import { titleToSlug } from '../lib/slug'

type View = 'posts' | 'trash' | 'editor'

interface Draft {
  slug: string
  slugTouched: boolean
  frontmatter: DraftFrontmatter
  body: string
}

const list = ref<ListItem[]>([])
const trash = ref<TrashItem[]>([])
const view = ref<View>('posts')
const selected = ref('')
const draft = ref<Draft | null>(null)
const dirty = ref(false)
const saving = ref(false)
const notice = ref('')

// 全站已有标签（去重、排序），供 FrontmatterForm 快捷点选追加
const allTags = computed<string[]>(() => {
  const set = new Set<string>()
  for (const it of list.value) for (const t of it.tags ?? []) set.add(t)
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
})

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
  window.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

/** 离开编辑器：有未保存修改时先确认。 */
function leaveEditor(): boolean {
  if (!dirty.value || confirm('有未保存的修改，确定离开吗？')) {
    draft.value = null
    selected.value = ''
    dirty.value = false
    return true
  }
  return false
}

function goTo(next: View) {
  if (view.value === 'editor' && !leaveEditor()) return
  view.value = next
}

async function selectPost(slug: string) {
  if (dirty.value && !confirm('有未保存的修改，先放弃再打开这篇吗？')) return
  const rec = await api<{ frontmatter?: Partial<DraftFrontmatter>; body?: string }>(
    `/api/admin/posts/${encodeURIComponent(slug)}`,
  )
  draft.value = {
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
  selected.value = slug
  dirty.value = false
  view.value = 'editor'
}

function newPost() {
  if (dirty.value && !confirm('有未保存的修改，先放弃再新建吗？')) return
  draft.value = {
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
  selected.value = ''
  dirty.value = false
  view.value = 'editor'
}

function updateDraft(field: string, value: unknown) {
  if (!draft.value) return
  const d = draft.value
  if (field === 'slug') {
    d.slug = String(value)
    d.slugTouched = d.slug !== titleToSlug(d.frontmatter.title)
  } else if (field === 'title') {
    d.frontmatter.title = String(value)
    if (!d.slugTouched) d.slug = titleToSlug(d.frontmatter.title)
  } else if (field === 'date') {
    d.frontmatter.date = String(value)
  } else if (field === 'tags') {
    d.frontmatter.tags = Array.isArray(value) ? (value as string[]) : []
  } else if (field === 'excerpt') {
    d.frontmatter.excerpt = String(value)
  } else if (field === 'draft') {
    d.frontmatter.draft = Boolean(value)
  } else if (field === 'pinned') {
    d.frontmatter.pinned = Boolean(value)
  }
  dirty.value = true
}

function onBodyChange(md: string) {
  if (!draft.value) return
  draft.value.body = md
  dirty.value = true
}

async function save() {
  if (!draft.value || saving.value) return
  const d = draft.value
  if (!d.slug) {
    notice.value = '请填写 slug'
    return
  }
  if (!d.frontmatter.title) {
    notice.value = '请填写标题'
    return
  }
  // slug 冲突确认：目标 slug 已属于另一篇文章时，PUT 会覆盖它
  const clash = list.value.find((it) => it.slug === d.slug && it.slug !== selected.value)
  if (clash && !confirm(`slug「${d.slug}」已存在（${clash.title}），保存将覆盖该文章，继续吗？`)) {
    return
  }
  saving.value = true
  try {
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(d.slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        frontmatter: d.frontmatter,
        body: d.body,
      }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      notice.value = (data as { error?: string }).error || '保存失败'
      return
    }
    const saved = (await res.json()) as { slug: string }
    selected.value = saved.slug
    if (!d.slugTouched && d.slug !== saved.slug) {
      d.slug = saved.slug
    }
    await loadList()
    dirty.value = false
    notice.value = '已保存'
  } finally {
    saving.value = false
  }
}

async function removePost(slug: string) {
  if (!confirm(`删除“${slug}”？会移入回收站。`)) return
  const res = await fetch(`/api/admin/posts/${encodeURIComponent(slug)}`, { method: 'DELETE' })
  if (res.ok) {
    if (selected.value === slug) {
      draft.value = null
      selected.value = ''
    }
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
          @click="goTo('posts')"
        >
          文章
        </button>
        <button
          type="button"
          :class="{ on: view === 'trash' }"
          :aria-current="view === 'trash' ? 'page' : undefined"
          @click="goTo('trash')"
        >
          回收站
          <span v-if="trash.length" class="tab-cnt">{{ trash.length }}</span>
        </button>
      </nav>

      <span class="spacer" />

      <template v-if="view === 'editor'">
        <span v-if="dirty" class="dirty">● 未保存</span>
        <button type="button" class="ghost" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
          <kbd>⌘S</kbd>
        </button>
        <button type="button" class="ghost" @click="goTo('posts')">返回列表</button>
      </template>
      <template v-else>
        <button type="button" class="primary" @click="newPost">＋ 新建文章</button>
      </template>
    </header>

    <main class="content">
      <PostList
        v-if="view === 'posts'"
        :items="list"
        @edit="selectPost"
        @remove="removePost"
      />
      <TrashList
        v-else-if="view === 'trash'"
        :trash="trash"
        @restore="restorePost"
        @purge="purgePost"
      />
      <section v-if="draft" class="editor-view">
        <FrontmatterForm
          :slug="draft.slug"
          :fm="draft.frontmatter"
          :all-tags="allTags"
          @input="updateDraft"
        />
        <div class="editor-cell">
          <PostEditor
            :key="draft.slug || '_new_'"
            :model-value="draft.body"
            @update:model-value="onBodyChange"
            @notice="(m) => (notice = m)"
          />
        </div>
      </section>
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
.dirty {
  font-size: 0.78rem;
  color: var(--vp-c-warning-1);
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
.topbar button.ghost {
  border: 1px solid var(--vp-c-divider);
  background: none;
  color: var(--vp-c-text-1);
}
.topbar button.ghost:disabled {
  opacity: 0.5;
}
.topbar kbd {
  font-family: inherit;
  font-size: 0.72rem;
  opacity: 0.75;
  margin-left: 0.15rem;
}

/* ---- 正文区 ---- */
.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
  background: var(--vp-c-bg-soft);
}
.editor-view {
  height: 100%;
  display: flex;
  flex-direction: column;
  background: var(--vp-c-bg);
}
.editor-cell {
  flex: 1;
  min-height: 0;
  border-top: 1px solid var(--vp-c-divider);
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