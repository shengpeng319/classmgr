import { ref, computed } from 'vue'

export function usePagination(pageSize: number = 25) {
  const displayCount = ref(pageSize)
  const allItems = ref<any[]>([])

  const displayedItems = computed(() => {
    return allItems.value.slice(0, displayCount.value)
  })

  const hasMore = computed(() => {
    return allItems.value.length > displayCount.value
  })

  const remainingCount = computed(() => {
    return Math.max(0, allItems.value.length - displayCount.value)
  })

  const loadMore = () => {
    displayCount.value += pageSize
  }

  const reset = () => {
    displayCount.value = pageSize
  }

  const setItems = (items: any[]) => {
    allItems.value = items
  }

  const appendItems = (items: any[]) => {
    allItems.value = [...allItems.value, ...items]
  }

  return {
    displayCount,
    allItems,
    displayedItems,
    hasMore,
    remainingCount,
    loadMore,
    reset,
    setItems,
    appendItems
  }
}