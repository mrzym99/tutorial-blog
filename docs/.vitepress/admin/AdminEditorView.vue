<script setup lang="ts">
import { ref, computed, onMounted, onBeforeUnmount } from 'vue'
import { NButton, NModal, NForm, NFormItem, NInput, NDatePicker, NSwitch, NSelect, NDivider } from 'naive-ui'
import { useMessage, useDialog } from 'naive-ui'
import PostEditor from './PostEditor.vue'
import { DRAFT_KEY, type Draft, type DraftFrontmatter } from './draft'

/**
 * 沉浸式编辑器：编辑区占满，元数据通过弹窗修改。
 * 由 AdminApp 先把当前草稿写入 sessionStorage 后跳转到本页；
 * 这里读取草稿、编辑、保存，并把最新状态回写 sessionStorage。
 */
const message = useMessage()
const dialog = useDialog()

interface ListItem {
  slug: string
  title?: string
  tags?: string[]
}

interface CollectionOption {
  slug: string
  title: string
}

const draft = ref<Draft | null>(null)
const list = ref<ListItem[]>([])
const collectionOptions = ref<CollectionOption[]>([])
const selectedSlug = ref('')
const dirty = ref(false)
const saving = ref(false)

// ---- 文章设置弹窗 ----
const settingsOpen = ref(false)
const settingsDraft = ref<Draft | null>(null)

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
  settingsOpen.value = true
}

function applySettings() {
  if (!settingsDraft.value || !draft.value) return
  if (!settingsDraft.value.frontmatter.collection) {
    message.warning('请选择所属合集')
    return
  }
  // 只更新元数据，不替换 body，避免编辑器状态（光标、undo 历史）被重置
  draft.value.frontmatter = { ...settingsDraft.value.frontmatter }
  dirty.value = true
  persist()
  settingsOpen.value = false
  message.success('已更新文章设置')
}

// 合集选择（设置弹窗内）：文章必须归属一个合集
const collectionSelectOptions = computed(() =>
  collectionOptions.value.map((c) => ({ label: c.title, value: c.slug })),
)

/** 当前序号展示（order 由服务端保存时分配，新文章保存前未知） */
const orderLabel = computed(() => {
  const order = settingsDraft.value?.frontmatter.order
  return typeof order === 'number' ? `第 ${order} 篇` : '保存后自动编号'
})

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

// 标题改动（slug 由系统生成，与标题无关）
function onTitleChange(v: string) {
  if (!settingsDraft.value) return
  settingsDraft.value.frontmatter.title = v
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
  collectionOptions.value = await fetchCollections()
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

async function fetchCollections(): Promise<CollectionOption[]> {
  try {
    const res = await fetch('/api/admin/collections')
    if (!res.ok) return []
    const data = (await res.json()) as { slug: string; title: string }[]
    return data.map((c) => ({ slug: c.slug, title: c.title }))
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

  // 标题为空或未选合集时，先弹出设置让用户补全（slug 由系统生成，无需检查）
  if (!d.frontmatter.title) {
    openSettings()
    message.warning('请先填写标题')
    return
  }
  if (!d.frontmatter.collection) {
    openSettings()
    message.warning('请先选择所属合集')
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

          <n-form-item label="日期">
            <n-date-picker
              type="date"
              format="yyyy-MM-dd"
              :value="dateToTs(settingsDraft.frontmatter.date)"
              @update:value="(ts: number | null) => (settingsDraft!.frontmatter.date = tsToDate(ts))"
              style="width: 100%"
            />
          </n-form-item>

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

          <div class="collection-block">
            <div class="collection-label">所属合集（必选）</div>
            <div class="collection-row">
              <n-select
                :value="settingsDraft.frontmatter.collection || null"
                :options="collectionSelectOptions"
                placeholder="选择合集"
                filterable
                style="flex: 1"
                @update:value="
                  (v: string | null) => (settingsDraft!.frontmatter.collection = v ?? '')
                "
              />
              <span class="order-hint">{{ orderLabel }}</span>
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
  /* 双列（编辑+预览）需要更宽的版心，超宽屏也不至于一行太长 */
  max-width: 1500px;
  margin: 0 auto;
}

/* ---- 设置弹窗 ---- */
.settings-form {
  padding: 0.25rem 0;
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

.collection-block {
  margin-top: 0.25rem;
}
.collection-label {
  font-size: 0.82rem;
  color: var(--vp-c-text-3);
  margin-bottom: 0.35rem;
}
.collection-row {
  display: flex;
  align-items: center;
  gap: 0.75rem;
}
.order-hint {
  flex-shrink: 0;
  font-size: 0.8rem;
  color: var(--vp-c-text-3);
  white-space: nowrap;
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
