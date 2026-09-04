<script setup lang="ts">
import { h, ref, computed } from 'vue'
import {
  NButton,
  NDataTable,
  NTag,
  NModal,
  NForm,
  NFormItem,
  NInput,
  NSwitch,
  type DataTableColumns,
} from 'naive-ui'
import { useMessage } from 'naive-ui'

/** 合集列表行：元数据 + 文章数（AdminApp 聚合） */
export interface CollectionItem {
  slug: string
  title: string
  description?: string
  cover?: string
  draft?: boolean
  createdAt?: string
  count: number
}

export interface CollectionFormValue {
  title: string
  description: string
  cover: string
  draft: boolean
}

const props = defineProps<{ items: CollectionItem[] }>()
const emit = defineEmits<{
  open: [slug: string]
  write: [slug: string]
  remove: [slug: string]
  create: [value: CollectionFormValue]
  save: [slug: string, value: CollectionFormValue]
}>()

const message = useMessage()

// ---- 新建 / 编辑弹窗 ----
const modalOpen = ref(false)
const editingSlug = ref('') // 空 = 新建
const saving = ref(false)
const form = ref<CollectionFormValue>({ title: '', description: '', cover: '', draft: false })
const isEdit = computed(() => Boolean(editingSlug.value))

function openCreate() {
  editingSlug.value = ''
  form.value = { title: '', description: '', cover: '', draft: false }
  modalOpen.value = true
}

function openEdit(row: CollectionItem) {
  editingSlug.value = row.slug
  form.value = {
    title: row.title,
    description: row.description ?? '',
    cover: row.cover ?? '',
    draft: row.draft ?? false,
  }
  modalOpen.value = true
}

async function submit() {
  if (saving.value) return
  if (!form.value.title.trim()) {
    message.warning('请填写合集标题')
    return
  }
  saving.value = true
  try {
    if (isEdit.value) emit('save', editingSlug.value, { ...form.value })
    else emit('create', { ...form.value })
    modalOpen.value = false
  } finally {
    saving.value = false
  }
}

// ---- 封面上传（复用 /api/admin/upload） ----
const coverUploading = ref(false)
const coverInput = ref<HTMLInputElement | null>(null)

function pickCover() {
  coverInput.value?.click()
}

async function onCoverPicked(e: Event) {
  const input = e.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (!file || coverUploading.value) return
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
    form.value.cover = data.url
    message.success('封面已上传')
  } finally {
    coverUploading.value = false
  }
}

function removeCover() {
  form.value.cover = ''
}

const columns = [
  {
    title: '封面',
    key: 'cover',
    width: 88,
    render(row: CollectionItem) {
      if (row.cover) {
        return h('img', {
          src: row.cover,
          alt: row.title,
          style:
            'width:72px;height:44px;object-fit:cover;border-radius:6px;border:1px solid var(--vp-c-divider);display:block;',
        })
      }
      return h('div', {
        style:
          'width:72px;height:44px;border-radius:6px;background:var(--vp-c-bg-soft);border:1px dashed var(--vp-c-divider);display:flex;align-items:center;justify-content:center;color:var(--vp-c-text-3);font-size:0.72rem;',
      }, '无封面')
    },
  },
  {
    title: '标题',
    key: 'title',
    ellipsis: { tooltip: true },
    render(row: CollectionItem) {
      const badges: ReturnType<typeof h>[] = []
      if (row.draft)
        badges.push(h(NTag, { size: 'small', bordered: false }, { default: () => '草稿' }))
      // 标题可点击 → 进入合集文章列表（排序）
      return h('div', { style: 'display:flex;align-items:center;gap:8px;' }, [
        h(
          'a',
          {
            style: 'cursor:pointer;color:inherit;',
            onClick: () => emit('open', row.slug),
          },
          row.title,
        ),
        ...badges,
      ])
    },
  },
  {
    title: '简介',
    key: 'description',
    ellipsis: { tooltip: true },
    render(row: CollectionItem) {
      return row.description || null
    },
  },
  { title: '文章数', key: 'count', width: 80 },
  { title: '创建日期', key: 'createdAt', width: 110 },
  {
    title: '操作',
    key: 'actions',
    width: 300,
    render(row: CollectionItem) {
      return h('div', { style: 'display:inline-flex;gap:8px;' }, [
        h(
          NButton,
          { size: 'small', onClick: () => emit('open', row.slug) },
          { default: () => '文章列表' },
        ),
        h(
          NButton,
          { size: 'small', type: 'primary', onClick: () => emit('write', row.slug) },
          { default: () => '＋ 写文章' },
        ),
        h(NButton, { size: 'small', onClick: () => openEdit(row) }, { default: () => '编辑' }),
        h(
          NButton,
          { size: 'small', type: 'error', tertiary: true, onClick: () => emit('remove', row.slug) },
          { default: () => '删除' },
        ),
      ])
    },
  },
] as DataTableColumns<CollectionItem>
</script>

<template>
  <div class="page">
    <div class="page-head">
      <h1>合集</h1>
      <span class="count">{{ items.length }} 个</span>
      <n-button class="batch" size="small" type="primary" @click="openCreate">＋ 新建合集</n-button>
    </div>

    <n-data-table
      class="table"
      flex-height
      :columns="columns"
      :data="items"
      :row-key="(row: CollectionItem) => row.slug"
      :bordered="false"
      :striped="true"
      size="small"
      :single-line="false"
      :pagination="{ pageSize: 10 }"
    >
      <template #empty>还没有合集。合集是文章的容器，先创建合集再写文章。</template>
    </n-data-table>

    <!-- 新建 / 编辑合集弹窗 -->
    <n-modal
      v-model:show="modalOpen"
      :mask-closable="false"
      preset="dialog"
      :title="isEdit ? '编辑合集' : '新建合集'"
      positive-text="保存"
      negative-text="取消"
      :loading="saving"
      @positive-click="submit"
      :style="{ width: '520px' }"
    >
      <n-form :show-label="false" label-placement="top">
        <n-form-item label="标题">
          <n-input v-model:value="form.title" placeholder="合集标题" @keydown.enter.prevent="submit" />
        </n-form-item>
        <n-form-item label="简介">
          <n-input
            v-model:value="form.description"
            type="textarea"
            :autosize="{ minRows: 2, maxRows: 4 }"
            placeholder="简介（选填），展示在合集卡片与详情页"
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
            <div v-if="form.cover" class="cover-preview">
              <img :src="form.cover" alt="封面预览" />
              <div class="cover-actions">
                <n-button size="tiny" :loading="coverUploading" @click="pickCover">更换</n-button>
                <n-button size="tiny" type="error" ghost @click="removeCover">移除</n-button>
              </div>
            </div>
            <button v-else type="button" class="cover-pick" :disabled="coverUploading" @click="pickCover">
              {{ coverUploading ? '上传中…' : '＋ 点击上传封面' }}
            </button>
          </div>
        </n-form-item>
        <div class="switch-item">
          <n-switch v-model:value="form.draft" size="small" />
          <span>草稿（不在首页合集网格展示）</span>
        </div>
      </n-form>
    </n-modal>
  </div>
</template>

<style scoped>
.page {
  display: flex;
  flex-direction: column;
  height: 100%;
  box-sizing: border-box;
  padding: 1.5rem 2rem;
}
.page-head {
  flex-shrink: 0;
  display: flex;
  align-items: baseline;
  gap: 0.6rem;
  margin-bottom: 1.25rem;
}
/* 表格撑满剩余高度，行数超出时表格体内部滚动（表头固定） */
.table {
  flex: 1;
  min-height: 0;
}
.page-head h1 {
  margin: 0;
  font-size: 1.4rem;
  font-weight: 700;
  color: var(--vp-c-text-1);
}
.count {
  color: var(--vp-c-text-3);
  font-size: 0.9rem;
}
.batch {
  margin-left: auto;
}

.cover-field {
  width: 100%;
}
.cover-file {
  display: none;
}
.cover-pick {
  width: 100%;
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
.switch-item {
  display: inline-flex;
  align-items: center;
  gap: 0.5rem;
  font-size: 0.85rem;
  color: var(--vp-c-text-2);
}
</style>
