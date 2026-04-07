import { defineStore } from 'pinia'
import { ref, computed } from 'vue'

export const useUserFilterStore = defineStore('userFilter', () => {
  const selectedUserIds = ref<string[]>([])
  const allUsers = ref<Array<{ id: string; username: string; name?: string; avatar?: string; role: string }>>([])

  const regularUsers = computed(() => allUsers.value.filter(u => u.role !== 'admin'))
  
  const selectedRegularUsers = computed(() => 
    regularUsers.value.filter(u => selectedUserIds.value.includes(u.id))
  )

  const isAllSelected = computed(() => 
    regularUsers.value.every(u => selectedUserIds.value.includes(u.id))
  )

  function initUsers(users: Array<{ id: string; username: string; name?: string; avatar?: string; role: string }>) {
    allUsers.value = users
    selectedUserIds.value = users.filter(u => u.role !== 'admin').map(u => u.id)
  }

  function toggleUser(userId: string) {
    const idx = selectedUserIds.value.indexOf(userId)
    if (idx >= 0) {
      selectedUserIds.value.splice(idx, 1)
    } else {
      selectedUserIds.value.push(userId)
    }
  }

  function isSelected(userId: string): boolean {
    return selectedUserIds.value.includes(userId)
  }

  function selectAll() {
    selectedUserIds.value = regularUsers.value.map(u => u.id)
  }

  function clearAll() {
    selectedUserIds.value = []
  }

  return {
    selectedUserIds,
    allUsers,
    regularUsers,
    selectedRegularUsers,
    isAllSelected,
    initUsers,
    toggleUser,
    isSelected,
    selectAll,
    clearAll
  }
})