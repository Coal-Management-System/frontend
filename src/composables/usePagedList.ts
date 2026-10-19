import { ref, type Ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'
import type { Page, PageQuery } from '@/api/types'
import { errMsg } from '@/lib/format'

export interface PagedListOptions {
  /** Route-query key prefix, so two lists on one page cannot overwrite each other's page. */
  prefix?: string
  size?: number
}

export function usePagedList<T>(
  fetcher: (query: PageQuery) => Promise<Page<T>>,
  options: PagedListOptions = {}
) {
  const route = useRoute()
  const router = useRouter()
  const pageKey = `${options.prefix ?? ''}page`
  const sizeKey = `${options.prefix ?? ''}size`

  const rows = ref<T[]>([]) as Ref<T[]>
  const loading = ref(false)
  const error = ref('')
  const page = ref(Number(route.query[pageKey]) || 0)
  const size = ref(Number(route.query[sizeKey]) || options.size || 10)
  const totalElements = ref(0)
  const totalPages = ref(0)

  async function load(): Promise<void> {
    loading.value = true
    error.value = ''
    try {
      const data = await fetcher({ page: page.value, size: size.value })
      rows.value = data.content
      totalElements.value = data.totalElements
      totalPages.value = data.totalPages
      // Deleting the last row of the last page would leave an empty table behind.
      // Strictly decreasing, so the retry terminates.
      const lastPage = Math.max(0, data.totalPages - 1)
      if (data.content.length === 0 && data.totalElements > 0 && page.value > lastPage) {
        page.value = lastPage
        await load()
      }
    } catch (e) {
      error.value = errMsg(e)
    } finally {
      loading.value = false
    }
  }

  function syncQuery() {
    void router.replace({ query: { ...route.query, [pageKey]: page.value, [sizeKey]: size.value } })
  }

  function first(): Promise<void> {
    page.value = 0
    syncQuery()
    return load()
  }

  function prev(): Promise<void> {
    if (page.value <= 0) return Promise.resolve()
    page.value -= 1
    syncQuery()
    return load()
  }

  function next(): Promise<void> {
    if (page.value >= totalPages.value - 1) return Promise.resolve()
    page.value += 1
    syncQuery()
    return load()
  }

  function setSize(value: number): Promise<void> {
    size.value = value
    page.value = 0
    syncQuery()
    return load()
  }

  return { rows, loading, error, page, size, totalElements, totalPages, load, first, prev, next, setSize }
}
