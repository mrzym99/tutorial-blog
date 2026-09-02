import { computed, ref, watch, type MaybeRefOrGetter, toValue } from 'vue'

/**
 * 前端分页组合式函数：数据已在客户端，直接切片即可。
 * 供首页 / 归档 / 标签等列表页复用，避免每页各写一遍 page/totalPages/watch。
 *
 * - 数据源变化（引用变更）时回到第一页（如切换标签）
 * - 总数变少时页码收敛到合法范围（如文章被删除）
 *
 * 用法：
 *   const { page, total, paged } = usePagedList(postsData.posts, PAGE_SIZE)
 */
export function usePagedList<T>(source: MaybeRefOrGetter<T[]>, pageSize: number) {
  const items = computed(() => toValue(source))
  const total = computed(() => items.value.length)
  const totalPages = computed(() => Math.max(1, Math.ceil(total.value / pageSize)))
  const page = ref(1)
  const paged = computed(() => items.value.slice((page.value - 1) * pageSize, page.value * pageSize))

  // 数据源变化（引用变更）时回到第一页
  watch(items, () => {
    page.value = 1
  })
  // 页码超出时收敛到最后一页
  watch(totalPages, (t) => {
    if (page.value > t) page.value = t
  })

  return { page, total, totalPages, paged }
}
