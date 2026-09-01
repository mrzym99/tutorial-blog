<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { NButton, NModal, NSpace, NForm, NFormItem, NInput, NDatePicker, NSwitch, NTag, NDivider } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import PostEditor from './PostEditor.vue'
import { titleToSlug } from '../lib/slug'

/**
 * 沉浸式编辑器：编辑区占满，元数据通过弹窗修改。
 * 由 AdminApp 先把当前草稿写入 sessionStorage 后跳转到本页；
 * 这里读取草稿、编辑、保存，并把最新状态回写 sessionStorage。
 */
const DRAFT_KEY = 'admin-draft'

const message = useMessage()
const dialog = useDialog()

interface DraftFrontmatter {
  title: string
  date: string
  tags: string[]
  excerpt: string
  cover: string
  draft: boolean
  pinned: boolean
}

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

// ---- 文章设置弹窗 ----
const settingsOpen = ref(false)
const settingsDraft = ref<Draft | null>(null)
const newTag = ref('')

// ---- 封面上传（复用正文图片的 /api/admin/upload） ----
const coverUploading = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)

function pickCover() {
  coverInput.value?.click()
}

function onCoverPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = '' // 允许连续选择同一文件
  if (file) uploadCover(file)
}

async function uploadCover(file: File) {
  if (coverUploading.value || !settingsDraft.value) return
  coverUploading.value = true
  try {
    const fd = new FormData()
    fd.append('file', file, file.name)
    const res = await fetch('/api/admin/upload', { method: 'POST', body: fd })
    if (!res.ok) {
      const data = await res.json().catch(() => ({}))
      message.error((data as { error?: string }).error || '封面上传失败')
      return
    }
    const data = (await res.json()) as { url: string }
    settingsDraft.value.frontmatter.cover = data.url
    message.success('封面已上传，记得保存设置')
  } finally {
    coverUploading.value = false
  }
}

function removeCover() {
  if (settingsDraft.value) settingsDraft.value.frontmatter.cover = ''
}

function openSettings() {
  if (!draft.value) return
  // 深拷贝一份，点取消可以回滚
  settingsDraft.value = JSON.parse(JSON.stringify(draft.value))
  newTag.value = ''
  settingsOpen.value = true
}

function applySettings() {
  if (!settingsDraft.value || !draft.value) return
  // 只更新元数据，不替换 body，避免编辑器状态（光标、undo 历史）被重置
  draft.value.slug = settingsDraft.value.slug
  draft.value.slugTouched = settingsDraft.value.slugTouched
  draft.value.frontmatter = { ...settingsDraft.value.frontmatter }
  dirty.value = true
  persist()
  settingsOpen.value = false
  message.success('已更新文章设置')
}

// 标签管理（设置弹窗内）
function addTag(t: string) {
  if (!settingsDraft.value) return
  const name = t.trim()
  if (!name) return
  const cur = settingsDraft.value.frontmatter.tags
  if (cur.includes(name)) return
  settingsDraft.value.frontmatter.tags = [...cur, name]
  newTag.value = ''
}
function removeTag(t: string) {
  if (!settingsDraft.value) return
  settingsDraft.value.frontmatter.tags = settingsDraft.value.frontmatter.tags.filter(
    (x) => x !== t,
  )
}

// 全站已有标签，用于快捷点选追加
const allTags = computed<string[]>(() => {
  const set = new Set<string>()
  for (const it of list.value) for (const t of it.tags ?? []) set.add(t)
  return [...set].sort((a, b) => (a < b ? -1 : a > b ? 1 : 0))
})

// 推荐标签（设置弹窗里的"已有"列表 = 全站标签 - 已选）
const suggestedTags = computed(() =>
  allTags.value.filter((t) => !(settingsDraft.value?.frontmatter.tags ?? []).includes(t)),
)

// 日期转换
function dateToTs(dateStr: string): number | null {
  if (!dateStr) return null
  const t = new Date(`${dateStr}T00:00:00`).getTime()
  return Number.isNaN(t) ? null : t
}
function tsToDate(ts: number | null): string {
  if (ts == null) return settingsDraft.value?.frontmatter.date ?? ''
  const d = new Date(ts)
  const y = d.getFullYear()
  const m = String(d.getMonth() + 1).padStart(2, '0')
  const day = String(d.getDate()).padStart(2, '0')
  return `${y}-${m}-${day}`
}

// 标题改动时自动同步 slug（如果用户没手动改过 slug）
function onTitleChange(v: string) {
  if (!settingsDraft.value) return
  settingsDraft.value.frontmatter.title = v
  if (!settingsDraft.value.slugTouched) {
    settingsDraft.value.slug = titleToSlug(v)
  }
}
function onSlugChange(v: string) {
  if (!settingsDraft.value) return
  settingsDraft.value.slug = v
  settingsDraft.value.slugTouched = v !== titleToSlug(settingsDraft.value.frontmatter.title)
}

function todayStr(): string {
  return new Date().toISOString().slice(0, 10)
}

onMounted(async () => {
  const raw = sessionStorage.getItem(DRAFT_KEY)
  if (!raw) {
    location.replace('/admin')
    return
  }
  try {
    draft.value = JSON.parse(raw) as Draft
  } catch {
    location.replace('/admin')
    return
  }
  selectedSlug.value = draft.value.slug
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

function onBodyChange(md: string) {
  if (!draft.value) return
  draft.value.body = md
  dirty.value = true
  persist()
}

/** 执行真正的保存请求；返回是否成功。 */
async function performSave(): Promise<boolean> {
  if (!draft.value || saving.value) return false
  const d = draft.value
  saving.value = true
  try {
    // 空封面不落盘（frontmatter 里不写 cover: ''）
    const fm = { ...d.frontmatter }
    if (!fm.cover) delete (fm as Partial<DraftFrontmatter>).cover
    const res = await fetch(`/api/admin/posts/${encodeURIComponent(d.slug)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ frontmatter: fm, body: d.body }),
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

  // 标题或 slug 为空时，先弹出设置让用户补全
  if (!d.frontmatter.title || !d.slug) {
    openSettings()
    message.warning('请先填写标题和 slug')
    return
  }

  // slug 冲突确认
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
  sessionStorage.removeItem(DRAFT_KEY)
  if (selectedSlug.value) {
    sessionStorage.setItem('admin-selected', selectedSlug.value)
  }
  location.href = '/admin'
}

// 当前文章标题（用于顶栏显示）
const displayTitle = computed(() => {
  if (!draft.value) return ''
  return draft.value.frontmatter.title || '未命名文章'
})
</script>

<template>
  <div class="editor-view">
    <header class="topbar">
      <div class="left">
        <n-button quaternary size="small" @click="back">← 返回</n-button>
        <span class="title">{{ displayTitle }}</span>
        <span v-if="dirty" class="dirty">● 未保存</span>
      </div>
      <div class="right">
        <n-button ghost size="small" @click="openSettings">⚙ 文章设置</n-button>
        <n-button type="primary" size="small" :disabled="saving" @click="save">
          {{ saving ? '保存中…' : '保存' }}
          <kbd>⌘S</kbd>
        </n-button>
      </div>
    </header>

    <main class="content">
      <PostEditor
        v-if="draft"
        :key="draft.slug || '_new_'"
        :model-value="draft.body"
        @update:model-value="onBodyChange"
        @notice="(m: string) => message.error(m)"
      />
    </main>

    <!-- 文章设置弹窗 -->
    <n-modal
      v-model:show="settingsOpen"
      :mask-closable="false"
      preset="dialog"
      title="文章设置"
      positive-text="保存设置"
      negative-text="取消"
      @positive-click="applySettings"
      :style="{ width: '560px' }"
    >
      <div v-if="settingsDraft" class="settings-form">
        <n-form :show-label="false" label-placement="top">
          <n-form-item label="标题">
            <n-input
              :value="settingsDraft.frontmatter.title"
              placeholder="文章标题"
              @update:value="onTitleChange"
            />
          </n-form-item>

          <div class="two-col">
            <n-form-item label="slug">
              <n-input
                :value="settingsDraft.slug"
                placeholder="url-slug"
                @update:value="onSlugChange"
              />
            </n-form-item>
            <n-form-item label="日期">
              <n-date-picker
                type="date"
                format="yyyy-MM-dd"
                :value="dateToTs(settingsDraft.frontmatter.date)"
                @update:value="(ts: number | null) => (settingsDraft!.frontmatter.date = tsToDate(ts))"
                style="width: 100%"
              />
            </n-form-item>
          </div>

          <n-form-item label="摘要">
            <n-input
              :value="settingsDraft.frontmatter.excerpt"
              type="textarea"
              :autosize="{ minRows: 2, maxRows: 4 }"
              placeholder="摘要（选填）"
              @update:value="(v: string) => (settingsDraft!.frontmatter.excerpt = v)"
            />
          </n-form-item>

          <n-form-item label="封面（选填）">
            <div class="cover-field">
              <input
                ref="coverInput"
                type="file"
                accept="image/*"
                class="cover-file"
                @change="onCoverPicked"
              />
              <div v-if="settingsDraft.frontmatter.cover" class="cover-preview">
                <img :src="settingsDraft.frontmatter.cover" alt="封面预览" />
                <div class="cover-actions">
                  <n-button size="tiny" :loading="coverUploading" @click="pickCover">
                    更换
                  </n-button>
                  <n-button size="tiny" type="error" ghost @click="removeCover">
                    移除
                  </n-button>
                </div>
              </div>
              <button
                v-else
                type="button"
                class="cover-pick"
                :disabled="coverUploading"
                @click="pickCover"
              >
                {{ coverUploading ? '上传中…' : '＋ 点击上传封面' }}
                <span class="cover-hint">不上传时，首页卡片将显示「阅读全文」按钮</span>
              </button>
            </div>
          </n-form-item>

          <div class="tags-block">
            <div class="tags-label">标签</div>
            <div class="chips">
              <n-tag
                v-for="t in settingsDraft.frontmatter.tags"
                :key="t"
                size="small"
                closable
                type="primary"
                :bordered="false"
                @close="removeTag(t)"
              >
                {{ t }}
              </n-tag>
              <n-input
                v-model:value="newTag"
                class="tag-input"
                size="small"
                placeholder="回车添加"
                @keydown.enter.prevent="addTag(newTag)"
              />
            </div>
            <div v-if="suggestedTags.length" class="quick">
              <span class="quick-label">已有：</span>
              <n-button
                v-for="t in suggestedTags"
                :key="t"
                size="tiny"
                quaternary
                type="primary"
                @click="addTag(t)"
              >
                + {{ t }}
              </n-button>
            </div>
          </div>

          <n-divider style="margin: 0.75rem 0" />

          <div class="switches">
            <label class="switch-item">
              <n-switch
                size="small"
                :value="settingsDraft.frontmatter.draft"
                @update:value="(v: boolean) => (settingsDraft!.frontmatter.draft = v)"
              />
              <span>草稿（保存后不公开，取消即发布）</span>
            </label>
            <label class="switch-item">
              <n-switch
                size="small"
                :value="settingsDraft.frontmatter.pinned"
                @update:value="(v: boolean) => (settingsDraft!.frontmatter.pinned = v)"
              />
              <span>置顶（列表排最前）</span>
            </label>
          </div>
        </n-form>
      </div>
    </n-modal>
  </div>
</template>

<style scoped>
.editor-view {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background: var(--vp-c-bg);
}

/* ---- 顶栏 ---- */
.topbar {
  flex: none;
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.5rem 1rem;
  border-bottom: 1px solid var(--vp-c-divider);
  background: var(--vp-c-bg);
  height: 48px;
}
.left,
.right {
  display: flex;
  align-items: center;
  gap: 0.6rem;
}
.title {
  font-size: 0.92rem;
  font-weight: 600;
  color: var(--vp-c-text-1);
  max-width: 360px;
  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;
}
.dirty {
  font-size: 0.78rem;
  color: var(--vp-c-warning-1);
}
.topbar kbd {
  font-family: inherit;
  font-size: 0.7rem;
  opacity: 0.7;
  margin-left: 0.2rem;
}

/* ---- 编辑区 ---- */
.content {
  flex: 1;
  min-height: 0;
  overflow: hidden;
  padding: 1.5rem 2rem;
  background: var(--vp-c-bg);
}
.content > :deep(.editor-wrap) {
  height: 100%;
  max-width: 820px;
  margin: 0 auto;
}

/* ---- 设置弹窗 ---- */
.settings-form {
  padding: 0.25rem 0;
}
.two-col {
  display: grid;
  grid-template-columns: 1.4fr 1fr;
  gap: 0.75rem;
}
/* 封面上传 */
.cover-field {
  width: 100%;
}
.cover-file {
  display: none;
}
.cover-pick {
  width: 100%;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 0.25rem;
  padding: 0.9rem 1rem;
  border: 1px dashed var(--vp-c-divider);
  border-radius: 8px;
  background: var(--vp-c-bg-soft);
  color: var(--vp-c-text-2);
  font-size: 0.88rem;
  cursor: pointer;
  transition: border-color 0.2s, color 0.2s;
}
.cover-pick:hover:not(:disabled) {
  border-color: var(--vp-c-brand-1);
  color: var(--vp-c-brand-1);
}
.cover-pick:disabled {
  cursor: wait;
  opacity: 0.7;
}
.cover-hint {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
.cover-preview {
  display: flex;
  align-items: center;
  gap: 0.9rem;
}
.cover-preview img {
  height: 96px;
  max-width: 220px;
  object-fit: cover;
  border-radius: 8px;
  border: 1px solid var(--vp-c-divider);
}
.cover-actions {
  display: flex;
  flex-direction: column;
  gap: 0.4rem;
}

.tags-block {
  margin-top: 0.25rem;
}
.tags-label {
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.35rem;
}
.chips {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.4rem;
}
.tag-input {
  flex: 1;
  min-width: 8rem;
}
.quick {
  margin-top: 0.5rem;
  display: flex;
  flex-wrap: wrap;
  gap: 0.3rem;
  align-items: center;
}
.quick-label {
  font-size: 0.75rem;
  color: var(--vp-c-text-3);
}
.switches {
  display: flex;
  gap: 1.5rem;
  flex-wrap: wrap;
}
.switch-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
</style>
