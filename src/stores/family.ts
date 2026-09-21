import { defineStore } from 'pinia'
import { ref, computed } from 'vue'
import { getV2Family, type FamilyInfo, type Child } from '@/api/family'

// v2 多家庭 store：孩子=档案（Child），替代旧 userFilter 的「选用户」逻辑
export const useFamilyStore = defineStore('family', () => {
  const family = ref<FamilyInfo | null>(null)
  const children = ref<Child[]>([])
  // admin 默认 selectedChildIds=全部孩子（parent 同样默认全选）
  const selectedChildIds = ref<string[]>([])
  const currentChildId = ref('')

  const currentChild = computed(() =>
    children.value.find(c => c.id === currentChildId.value) || null
  )

  const selectedChildren = computed(() =>
    children.value.filter(c => selectedChildIds.value.includes(c.id))
  )

  const isAllSelected = computed(() =>
    children.value.every(c => selectedChildIds.value.includes(c.id)) && children.value.length > 0
  )

  // 用 /v2/family 响应初始化（登录预热 / 页面刷新共用）
  function initFromFamily(data: { family: FamilyInfo; children: Child[] }) {
    family.value = data.family
    children.value = data.children
    selectedChildIds.value = children.value.map(c => c.id)
    if (!currentChildId.value || !children.value.some(c => c.id === currentChildId.value)) {
      currentChildId.value = children.value[0]?.id || ''
    }
  }

  async function refresh() {
    const res = await getV2Family()
    if (res.code === 0 && res.data) {
      initFromFamily(res.data)
    }
    return res
  }

  function toggleChild(childId: string) {
    const idx = selectedChildIds.value.indexOf(childId)
    if (idx >= 0) {
      selectedChildIds.value.splice(idx, 1)
    } else {
      selectedChildIds.value.push(childId)
    }
  }

  function isSelected(childId: string): boolean {
    return selectedChildIds.value.includes(childId)
  }

  function selectAll() {
    selectedChildIds.value = children.value.map(c => c.id)
  }

  function clearAll() {
    selectedChildIds.value = []
  }

  function setCurrentChild(childId: string) {
    currentChildId.value = childId
  }

  return {
    family,
    children,
    selectedChildIds,
    currentChildId,
    currentChild,
    selectedChildren,
    isAllSelected,
    initFromFamily,
    refresh,
    toggleChild,
    isSelected,
    selectAll,
    clearAll,
    setCurrentChild
  }
})
