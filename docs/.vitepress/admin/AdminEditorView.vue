<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { NButton } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import FrontmatterForm, { type DraftFrontmatter } from './FrontmatterForm.vue'
import PostEditor from './PostEditor.vue'
import { titleToSlug } from '../lib/slug'

/**
 * 完整编辑器页内容（由 AdminEditorPage 提供的 NaiveProvider 包裹，
 * 因此 setup 内可调用 useMessage() / useDialog()）。
 * 由 AdminApp 先把当前草稿写入 sessionStorage 后跳转到本页；
 * 这里读取草稿、编辑、保存，并把最新状态回写 sessionStorage。
 */
const DRAFT_KEY = 'admin-draft'

const message = useMessage()
const dialog = useDialog()

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
  message.error(m)
}

/** 执行真正的保存请求；返回是否成功（供确认对话框决定是否关闭）。 */
async function performSave(): Promise<boolean> {
  if (!draft.value || saving.value) return false
  const d = draft.value
  saving.value = true
  try {
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(d.slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter: d.frontmatter, body: d.body }),
    })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      message.error((data as { error?: string }).error || '保存失败')
      return false
    }
    const saved = (await res.json()) as { slug: string }
    if (!d.slugTouched && d.slug !== saved.slug) d.slug = saved.slug
    selectedSlug.value = saved.slug
    dirty.value = false
    list.value = await fetchList()
    persist()
    message.success('已保存')
    return true
  } finally {
    saving.value = false
  }
}

async function save() {
  if (!draft.value || saving.value) return
  const d = draft.value
  if (!d.slug) {
    message.warning('请填写 slug')
    return
  }
  if (!d.frontmatter.title) {
    message.warning('请填写标题')
    return
  }
  // slug 冲突确认：目标 slug 已属于另一篇文章时，PUT 会覆盖它
  list.value = await fetchList()
  const clash = list.value.find((it) => it.slug === d.slug && it.slug !== selectedSlug.value)
  if (clash) {
    dialog.warning({
      title: 'slug 已存在',
      content: `slug「${d.slug}」已存在（${clash.title}），保存将覆盖该文章。确定继续吗？`,
      positiveText: '覆盖保存',
      negativeText: '取消',
      onPositiveClick: performSave,
    })
    return
  }
  await performSave()
}

function back() {
  if (dirty.value) {
    dialog.warning({
      title: '未保存的修改',
      content: '有未保存的修改，确定离开吗？',
      positiveText: '离开',
      negativeText: '留在本页',
      onPositiveClick: async () => {
        doLeave()
        return true
      },
    })
    return
  }
  doLeave()
}

function doLeave() {
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
  <div class="editor-view">
    <header class="topbar">
      <span class="brand">写作后台 · 编辑</span>
      <span v-if="dirty" class="dirty">● 未保存</span>
      <span class="spacer" />
      <n-button ghost :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存' }}
        <kbd>⌘S</kbd>
      </n-button>
      <n-button ghost @click="back">返回后台</n-button>
    </header>

    <main class="content">
      <section v-if="draft" class="form-cell">
        <FrontmatterForm
          :slug="draft.slug"
          :fm="draft.frontmatter"
          :all-tags="allTags"
          @input="updateDraft"
        />
      </section>
      <section v-if="draft" class="editor-cell">
        <PostEditor
          :key="draft.slug || '_new_'"
          :model-value="draft.body"
          @update:model-value="onBodyChange"
          @notice="setNotice"
        />
      </section>
    </main>
  </div>
</template>

<style scoped>
.editor-view {
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
.form-cell {
  flex: none;
}
.editor-cell {
  flex: 1;
  min-height: 0;
  border-top: 1px solid var(--vp-c-divider);
}
</style>