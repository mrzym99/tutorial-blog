<script setup lang="ts">
import { ref, onMounted, onBeforeUnmount } from 'vue'
import PostListPanel, { type ListItem } from './PostListPanel.vue'
import FrontmatterForm, { type DraftFrontmatter } from './FrontmatterForm.vue'
import PostEditor from './PostEditor.vue'
import { titleToSlug } from '../lib/slug'

interface Draft {
  slug: string
  slugTouched: boolean
  frontmatter: DraftFrontmatter
  body: string
}

const list = ref<ListItem[]>([])
const selected = ref('')
const draft = ref<Draft | null>(null)
const dirty = ref(false)
const saving = ref(false)
const notice = ref('')

async function loadList() {
  list.value = await api<ListItem[]>('/api/admin/posts')
}

onMounted(() => {
  loadList()
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

async function selectPost(slug: string) {
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
    },
    body: rec.body ?? '',
  }
  selected.value = slug
  dirty.value = false
}

function newPost() {
  draft.value = {
    slug: '',
    slugTouched: false,
    frontmatter: { title: '', date: todayStr(), tags: [], excerpt: '' },
    body: '',
  }
  selected.value = ''
  dirty.value = false
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
    notice.value = '已删除'
  } else {
    const data = await res.json().catch(() => ({}))
    notice.value = (data as { error?: string }).error || '删除失败'
  }
}

function dismissDraft() {
  if (!dirty.value || confirm('有未保存的修改，确定离开吗？')) {
    draft.value = null
    selected.value = ''
    loadList()
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
      <span v-if="dirty" class="dirty">● 未保存</span>
      <span class="spacer" />
      <button v-if="draft" type="button" :disabled="saving" @click="save">
        {{ saving ? '保存中…' : '保存 (Ctrl+S)' }}
      </button>
      <button v-if="draft" type="button" class="ghost" @click="dismissDraft">关闭</button>
      <span v-if="notice" :key="notice" class="notice">{{ notice }}</span>
    </header>

    <div class="body">
      <aside class="col list-col">
        <PostListPanel
          :items="list"
          :selected="selected"
          @select="selectPost"
          @create="newPost"
          @remove="removePost"
        />
      </aside>

      <section v-if="draft" class="col main-col">
        <FrontmatterForm :slug="draft.slug" :fm="draft.frontmatter" @input="updateDraft" />
        <div class="editor-cell">
          <PostEditor
            :key="draft.slug || '_new_'"
            :model-value="draft.body"
            @update:model-value="onBodyChange"
            @notice="(m) => (notice = m)"
          />
        </div>
      </section>

      <section v-else class="empty">选择左侧文章，或点“新建文章”开始。</section>
    </div>
  </div>
</template>

<style scoped>
.admin {
  display: flex;
  flex-direction: column;
  height: calc(100vh - 60px);
  border: 1px solid var(--vp-c-divider);
  border-radius: 8px;
  overflow: hidden;
}
.topbar {
  display: flex;
  align-items: center;
  gap: 0.6rem;
  padding: 0.5rem 0.8rem;
  border-bottom: 1px solid var(--vp-c-divider);
}
.brand {
  font-weight: 600;
}
.dirty {
  font-size: 0.78rem;
  color: var(--vp-c-warning-1);
}
.spacer {
  flex: 1;
}
.topbar button {
  padding: 0.3rem 0.9rem;
  border: none;
  border-radius: 6px;
  background: var(--vp-c-brand-1);
  color: #fff;
  cursor: pointer;
}
.topbar button.ghost {
  background: none;
  border: 1px solid var(--vp-c-divider);
  color: var(--vp-c-text-1);
}
.topbar button:disabled {
  opacity: 0.5;
}
.notice {
  font-size: 0.82rem;
  color: var(--vp-c-text-2);
}
.body {
  display: flex;
  flex: 1;
  min-height: 0;
}
.col {
  min-width: 0;
}
.list-col {
  width: 260px;
  flex: none;
  padding: 0.6rem;
  border-right: 1px solid var(--vp-c-divider);
  overflow: hidden;
}
.main-col {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.editor-cell {
  flex: 1;
  min-height: 0;
  overflow: hidden;
}
.empty {
  flex: 1;
  display: grid;
  place-items: center;
  color: var(--vp-c-text-3);
}
</style>