/**
 * 表格行交换的 FLIP 动画（纯 DOM，无第三方依赖）。
 *
 * 用法：先在数据交换前调用（记录两行的当前位置），函数内部等 nextTick
 * DOM 更新后施加反向位移并过渡回 0，两行即平滑对调。
 * 行标识由 NDataTable 的 row-props 注入 `data-slug` 属性（见各列表组件）。
 */
import { nextTick } from 'vue'

const DURATION = 220

/** 尊重系统「减弱动态效果」设置：开启时跳过动画直接切换。 */
function reducedMotion(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

function rowBySlug(container: Element, slug: string): HTMLElement | null {
  const key = typeof CSS !== 'undefined' && CSS.escape ? CSS.escape(slug) : slug
  return container.querySelector(`tr[data-slug="${key}"]`)
}

/** 平滑滑动到目标位置：先瞬移到旧位置（反向位移），再过渡回自然位置。 */
function slide(el: HTMLElement, dy: number): void {
  if (!dy) return
  el.style.transition = 'none'
  el.style.transform = `translateY(${dy}px)`
  requestAnimationFrame(() => {
    el.style.transition = `transform ${DURATION}ms ease`
    el.style.transform = ''
    window.setTimeout(() => {
      el.style.transition = ''
      el.style.transform = ''
    }, DURATION + 50)
  })
}

/**
 * 相邻两行交换的动画。在本地数据交换（触发重渲染）之后调用亦可——
 * topA/topB 在交换前的 DOM 上测量，nextTick 后按 slug 重新定位施反向位移。
 */
export async function animateRowSwap(
  getContainer: () => Element | null | undefined,
  slugA: string,
  slugB: string,
): Promise<void> {
  if (typeof window === 'undefined' || reducedMotion()) return
  const container = getContainer()
  if (!container) return
  const rowA = rowBySlug(container, slugA)
  const rowB = rowBySlug(container, slugB)
  if (!rowA || !rowB) return
  const topA = rowA.getBoundingClientRect().top
  const topB = rowB.getBoundingClientRect().top

  await nextTick()
  // 重渲染后节点可能被 Vue 复用或重建，按 slug 重新查询再施加位移
  const moved = rowBySlug(container, slugA)
  const other = rowBySlug(container, slugB)
  if (!moved || !other) return
  slide(moved, topA - moved.getBoundingClientRect().top)
  slide(other, topB - other.getBoundingClientRect().top)
}
