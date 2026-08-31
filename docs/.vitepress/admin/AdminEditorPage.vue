<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import FrontmatterForm, { type DraftFrontmatter } from './FrontmatterForm.vue'
import PostEditor from './PostEditor.vue'
import { titleToSlug } from '../lib/slug'

/**
 * 独立全屏编辑器页（/admin-edit，layout: false，无 VitePress 壳）。
 * 由 AdminApp 先把当前草稿写入 sessionStorage 后跳转到本页；
 * 这里读取草稿、编辑、保存，并把最新状态回写 sessionStorage。
 */
const DRAFT_KEY = 'admin-draft'

interface Draft {
  slug: string
  slugTouched: boolean
  frontmatter: DraftFrontmatter
  body: string
}

interface ListItem {
  slug: string
  title?: string
  tags?: string[]
}

const draft = ref<Draft | null>(null)
const list = ref<ListItem[]>([])
const selectedSlug = ref('')
const dirty = ref(false)
const saving = ref(false)
const notice = ref('')

// 全站已有标签，供 FrontmatterForm 快捷点选追加
const allTags = computed<string[]>(() => {
  const set = new Set<string>()
  for (const it of list.value) for (const t of it.tags ?? []) set.add(t)
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
})

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

onMounted(async () => {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (!raw) {
    location.replace('/admin') // 非从后台打开的直达页，回到后台列表
    return
  }
  try {
    draft.value = JSON.parse(raw) as Draft
  } catch {
    location.replace('/admin')
    return
  }
  selectedSlug.value = draft.value.slug // 打开时所属原文 slug，用于冲突检查排除自身
  list.value = await fetchList()
  window.addEventListener('keydown', onGlobalKeydown)
})
onBeforeUnmount(() => window.removeEventListener('keydown', onGlobalKeydown))

function onGlobalKeydown(e: KeyboardEvent) {
  if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 's') {
    e.preventDefault()
    save()
  }
}

async function fetchList() {
  try {
    const res = await fetch('/api/admin/posts')
    if (!res.ok) return []
    return (await res.json()) as ListItem[]
  } catch {
    return []
  }
}

/** 把最新草稿写回 sessionStorage，保证编辑器页刷新/误关可恢复。 */
function persist() {
  if (draft.value) sessionStorage.setItem(DRAFT_KEY, JSON.stringify(draft.value))
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
  persist()
}

function onBodyChange(md: string) {
  if (!draft.value) return
  draft.value.body = md
  dirty.value = true
  persist()
}

function setNotice(m: string) {
  notice.value = m
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
  list.value = await fetchList()
  // slug 冲突确认：目标 slug 已属于另一篇文章时，PUT 会覆盖它
  const clash = list.value.find((it) => it.slug === d.slug && it.slug !== selectedSlug.value)
  if (clash && !confirm(`slug「${d.slug}」已存在（${clash.title}），保存将覆盖该文章，继续吗？`)) {
    return
  }
  saving.value = true
  try {
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(d.slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter: d.frontmatter, body: d.body }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      notice.value = (data as { error?: string }).error || '保存失败'
      return
    }
    const saved = (await res.json()) as { slug: string }
    if (!d.slugTouched && d.slug !== saved.slug) d.slug = saved.slug
    selectedSlug.value = saved.slug
    dirty.value = false
    list.value = await fetchList()
    persist()
    notice.value = '已保存'
  } finally {
    saving.value = false
  }
}

function back() {
  if (dirty.value && !confirm('有未保存的修改，确定离开吗？')) return
  // 若目标是 /admin 之外的页面，先清掉临时草稿避免下次误带
  sessionStorage.removeItem(DRAFT_KEY)
  if (selectedSlug.value) {
    sessionStorage.setItem('admin-selected', selectedSlug.value)
  }
  // 当前标签直接回到后台列表
  location.href = '/admin'
}
</script>

<template>
  <div class="editor-page">
    <header class="topbar">
      <span class="brand">写作后台 · 编辑</span>
      <span v-if="dirty" class="dirty">● 未保存</span>
      <span class="spacer" />
      <button type="button" class="ghost" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存' }}
        <kbd>⌘S</kbd>
      </button>
      <button type="button" class="ghost" @click="back">返回后台</button>
    </header>

    <main class="content">
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
            @notice="setNotice"
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
.editor-page {
  position: relative;
  display: flex;
  flex-direction: column;
  height: 100vh; /* layout:false 直接占满视口，不再受博客布局宽度限制 */
}

.topbar {
  flex: none;
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.55rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.brand {
  font-weight: 700;
  font-size: 0.98rem;
  letter-spacing: 0.02em;
}
.dirty {
  font-size: 0.78rem;
  color: var(--vp-c-warning-1);
}
.spacer {
  flex: 1;
}
.topbar button {
  padding: 0.34rem 0.9rem;
  border-radius: 7px;
  font-size: 0.86rem;
  cursor: pointer;
  border: 1px solid var(--vp-c-divider);
  background: none;
  color: var(--vp-c-text-1);
}
.topbar button:disabled {
  opacity: 0.5;
}
.topbar kbd {
  font-family: inherit;
  font-size: 0.72rem;
  opacity: 0.75;
  margin-left: 0.15rem;
}

.content {
  flex: 1;
  min-height: 0;
  overflow: auto;
}
.editor-view {
  height: 100%;
  display: flex;
  flex-direction: column;
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
  z-index: 10;
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