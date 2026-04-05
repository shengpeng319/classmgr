<template>
  <view class="container">
    <CommonHeader title="历史数据" :show-add-btn="true" @add="showAddModal" />

    <view class="filter-toggle-bar" @click="showFilter = !showFilter">
      <text class="filter-toggle-text">{{ showFilter ? '收起筛选' : '展开筛选' }}</text>
    </view>

    <!-- 筛选区域 -->
    <view class="filter-section" v-if="showFilter">
      <view class="filter-row">
        <view class="filter-item">
          <text class="filter-label">开始日期</text>
          <picker mode="date" :value="filterStartDate" @change="onStartDateChange">
            <view class="picker-value">
              <text>{{ filterStartDate || '请选择' }}</text>
            </view>
          </picker>
        </view>
        <view class="filter-item">
          <text class="filter-label">结束日期</text>
          <picker mode="date" :value="filterEndDate" @change="onEndDateChange">
            <view class="picker-value">
              <text>{{ filterEndDate || '请选择' }}</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="filter-row" v-if="isAdmin">
        <view class="filter-item full">
          <text class="filter-label">用户筛选</text>
          <picker mode="selector" :value="userIndex" :range="userOptions" range-key="name" @change="onUserChange">
            <view class="picker-value">
              <text>{{ userOptions[userIndex]?.name || '全部用户' }}</text>
            </view>
          </picker>
        </view>
      </view>

      <view class="filter-actions">
        <view class="btn reset" @click="resetFilter">
          <text class="btn-text">重置</text>
        </view>
        <view class="btn search" @click="searchTasks">
          <text class="btn-text">查询</text>
        </view>
      </view>
    </view>

    <!-- 任务列表 -->
    <view class="task-list">
      <view class="task-item" v-for="task in displayedTasks" :key="task.id" @click="toggleTask(task)">
        <view class="task-checkbox" @click="toggleTask(task)">
          <view class="checkbox" :class="{ checked: task.isCompleted }">
            <text class="checkbox-icon" v-if="task.isCompleted">✓</text>
          </view>
        </view>
        <view class="task-info">
          <view class="task-header">
            <text class="task-title" :class="{ completed: task.isCompleted }">{{ task.title }}</text>
            <view class="task-tag" :class="task.type">
              <text class="tag-text">{{ task.type === 'homework' ? '作业' : '课外班' }}</text>
            </view>
            <view class="task-points">
              <text class="points-text">{{ task.points || 5 }}</text>
            </view>
          </view>
          <view class="task-meta">
            <image class="task-user-avatar" :src="task.user?.avatar || defaultAvatar" mode="aspectFill" />
            <text class="task-user-name">{{ task.user?.name || task.user?.username }}</text>
            <text class="task-date">{{ formatDateRange(task.startDate, task.endDate) }}</text>
          </view>
        </view>
        <view class="task-actions" v-if="isAdmin" @click.stop>
          <view class="action-btn edit" @click.stop="editTask(task)">
            <text class="action-text">编辑</text>
          </view>
          <view class="action-btn delete" @click.stop="confirmDelete(task)">
            <text class="action-text">删除</text>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="tasks.length === 0 && !loading">
        <text class="empty-text">暂无任务记录</text>
      </view>

      <view class="load-more" v-if="hasMore" @click="loadMore">
        <text class="load-more-text">展开更多 ({{ tasks.length - displayCount }} 条)</text>
      </view>
    </view>

    <!-- 添加/编辑弹窗 -->
    <view class="modal" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingTask ? '编辑任务' : '添加任务' }}</text>
          <view class="modal-close" @click="closeModal">
            <text class="close-text">×</text>
          </view>
        </view>

        <view class="form-item" v-if="isAdmin">
          <text class="form-label">用户</text>
          <picker mode="selector" :value="formUserIndex" :range="allUsers" range-key="name" @change="onFormUserChange">
            <view class="picker-value">
              <text>{{ allUsers[formUserIndex]?.name || '请选择' }}</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">任务名称</text>
          <input class="form-input" v-model="formData.title" placeholder="请输入任务名称" />
        </view>

        <view class="form-item">
          <text class="form-label">类型</text>
          <view class="type-selector">
            <view 
              class="type-btn" 
              :class="{ active: formData.type === 'homework' }"
              @click="formData.type = 'homework'"
            >
              <text class="type-btn-text">作业</text>
            </view>
            <view 
              class="type-btn" 
              :class="{ active: formData.type === 'extracurricular' }"
              @click="formData.type = 'extracurricular'"
            >
              <text class="type-btn-text">课外班</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">积分</text>
          <input class="form-input" v-model="formData.points" placeholder="默认5" />
        </view>

        <view class="form-item">
          <text class="form-label">开始日期</text>
          <picker mode="date" :value="formData.startDate" @change="onFormStartDateChange">
            <view class="picker-value">
              <text>{{ formData.startDate || '请选择' }}</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">结束日期</text>
          <picker mode="date" :value="formData.endDate" @change="onFormEndDateChange">
            <view class="picker-value">
              <text>{{ formData.endDate || '请选择' }}</text>
            </view>
          </picker>
        </view>

        <view class="modal-actions">
          <view class="btn cancel" @click="closeModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="btn confirm" @click="saveTask">
            <text class="btn-text">{{ editingTask ? '保存' : '添加' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getTasks, updateTask, createTask, updateAdminTask, deleteTask, getUsers, type Task } from '@/api/task'
import CommonHeader from '@/components/CommonHeader.vue'

const loading = ref(false)
const showModal = ref(false)
const editingTask = ref<Task | null>(null)
const tasks = ref<Task[]>([])
const allUsers = ref<Array<{ id: string; username: string; name?: string; role: string }>>([])
const userIndex = ref(0)
const formUserIndex = ref(0)
const isAdmin = ref(false)
const userId = ref('')
const displayCount = ref(25)

const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'

const filterStartDate = ref('')
const filterEndDate = ref('')
const showFilter = ref(true)

const userOptions = computed(() => {
  return [{ id: '', name: '全部用户' }, ...allUsers.value]
})

const displayedTasks = computed(() => {
  return tasks.value.slice(0, displayCount.value)
})

const hasMore = computed(() => {
  return tasks.value.length > displayCount.value
})

const formData = ref({
  userId: '',
  title: '',
  type: 'homework' as 'homework' | 'extracurricular',
  points: 5,
  startDate: '',
  endDate: ''
})

const getTodayString = () => {
  const today = new Date()
  return `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`
}

const getDateMinusDays = (days: number) => {
  const date = new Date()
  date.setDate(date.getDate() - days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const addDaysToDate = (dateStr: string, days: number) => {
  const date = new Date(dateStr)
  date.setDate(date.getDate() + days)
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`
}

const formatDateRange = (startDate: string, endDate: string) => {
  if (!startDate) return ''
  const toLocalDate = (dateStr: string) => {
    const d = new Date(dateStr)
    return `${d.getMonth() + 1}/${d.getDate()}`
  }
  const startStr = toLocalDate(startDate)
  const endStr = toLocalDate(endDate)
  if (startStr === endStr) return startStr
  return `${startStr} - ${endStr}`
}

const toLocalDateString = (dateStr: string) => {
  if (!dateStr) return ''
  const d = new Date(dateStr)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`
}

const formatDisplayDate = (dateStr: string) => {
  if (!dateStr) return ''
  const date = new Date(dateStr)
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const loadUsers = async () => {
  try {
    const res: any = await getUsers()
    console.log('loadUsers response:', res)
    if (res && res.data) {
      allUsers.value = res.data || []
    } else if (res && Array.isArray(res)) {
      allUsers.value = res
    }
  } catch (e) {
    console.error('Failed to load users', e)
  }
}

const loadTasks = async () => {
  loading.value = true
  try {
    const res: any = isAdmin.value && userOptions.value[userIndex.value]?.id
      ? await getTasks({ startDate: filterStartDate.value, endDate: filterEndDate.value })
      : await getTasks({ startDate: filterStartDate.value, endDate: filterEndDate.value })
    
    if (res && res.data) {
      let data = res.data || []
      
      // Extract unique users from tasks for the filter
      if (isAdmin.value && allUsers.value.length === 0) {
        const userMap = new Map<string, { id: string; username: string; name?: string; role: string }>()
        data.forEach((t: Task) => {
          if (t.user && !userMap.has(t.user.id)) {
            userMap.set(t.user.id, t.user)
          }
        })
        allUsers.value = Array.from(userMap.values())
      }
      
      // Admin filter by user
      if (isAdmin.value && userOptions.value[userIndex.value]?.id) {
        data = data.filter((t: Task) => t.userId === userOptions.value[userIndex.value].id)
      }
      
      tasks.value = data
    }
  } catch (e) {
    console.error('Failed to load tasks', e)
  } finally {
    loading.value = false
  }
}

const searchTasks = () => {
  displayCount.value = 25
  loadTasks()
}

const loadMore = () => {
  displayCount.value += 25
}

const resetFilter = () => {
  filterStartDate.value = getDateMinusDays(7)
  filterEndDate.value = getTodayString()
  userIndex.value = 0
  displayCount.value = 25
  loadTasks()
}

const onStartDateChange = (e: any) => {
  filterStartDate.value = e.detail.value
  if (filterStartDate.value && !filterEndDate.value) {
    filterEndDate.value = addDaysToDate(filterStartDate.value, 7)
  }
}

const onEndDateChange = (e: any) => {
  filterEndDate.value = e.detail.value
}

const onUserChange = (e: any) => {
  userIndex.value = e.detail.value
}

const onFormUserChange = (e: any) => {
  formUserIndex.value = e.detail.value
  formData.value.userId = allUsers.value[e.detail.value]?.id || ''
}

const onFormStartDateChange = (e: any) => {
  formData.value.startDate = e.detail.value
}

const onFormEndDateChange = (e: any) => {
  formData.value.endDate = e.detail.value
}

const showAddModal = () => {
  editingTask.value = null
  formData.value = {
    userId: allUsers.value[0]?.id || '',
    title: '',
    type: 'homework',
    points: 5,
    startDate: getTodayString(),
    endDate: getTodayString()
  }
  formUserIndex.value = 0
  showModal.value = true
}

const editTask = (task: Task) => {
  editingTask.value = task
  const userIdx = allUsers.value.findIndex(u => u.id === task.userId)
  formUserIndex.value = userIdx >= 0 ? userIdx : 0
  Object.assign(formData.value, {
    userId: task.userId,
    title: task.title,
    type: task.type as 'homework' | 'extracurricular',
    points: task.points || 5,
    startDate: toLocalDateString(task.startDate),
    endDate: toLocalDateString(task.endDate)
  })
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
  editingTask.value = null
}

const saveTask = async () => {
  if (!formData.value.title || !formData.value.startDate || !formData.value.endDate) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }
  if (isAdmin.value && !formData.value.userId) {
    uni.showToast({ title: '请选择用户', icon: 'none' })
    return
  }

  try {
    const points = Number(formData.value.points) || 5
    if (editingTask.value) {
      const res: any = await updateAdminTask(editingTask.value.id, {
        title: formData.value.title,
        type: formData.value.type,
        points: points,
        startDate: formData.value.startDate,
        endDate: formData.value.endDate
      })
      if (res.code === 0) {
        uni.showToast({ title: '保存成功', icon: 'success' })
        closeModal()
        loadTasks()
      }
    } else {
      const res: any = await createTask({
        userId: formData.value.userId,
        title: formData.value.title,
        type: formData.value.type,
        points: points,
        startDate: formData.value.startDate,
        endDate: formData.value.endDate
      })
      if (res.code === 0) {
        uni.showToast({ title: '添加成功', icon: 'success' })
        closeModal()
        loadTasks()
      }
    }
  } catch (e) {
    console.error('Failed to save task', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

const confirmDelete = (task: Task) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除任务"${task.title}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result: any = await deleteTask(task.id)
          if (result.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            loadTasks()
          }
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const toggleTask = async (task: Task) => {
  const newStatus = !task.isCompleted
  const optimisticTask = tasks.value.find(t => t.id === task.id)
  if (optimisticTask) {
    optimisticTask.isCompleted = newStatus
  }
  
  try {
    const res: any = await updateTask(task.id, { isCompleted: newStatus })
    if (res.code !== 0) {
      await loadTasks()
    }
  } catch (e) {
    console.error('Failed to update task', e)
    await loadTasks()
  }
}

onMounted(() => {
  // Check admin permission
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    isAdmin.value = user.role === 'admin'
    userId.value = user.id || ''
  }
  
  // Initialize dates
  filterStartDate.value = getDateMinusDays(7)
  filterEndDate.value = getTodayString()
  
  loadUsers()
  loadTasks()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8F5E9 0%, #F0F8FF 100%);
  padding: 20rpx;
}

.page-header {
  padding: 20rpx 0;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #4A9B8E;
  display: block;
}

.subtitle {
  font-size: 26rpx;
  color: #888;
  margin-top: 8rpx;
  display: block;
}

.filter-toggle-bar {
  display: flex;
  justify-content: center;
  margin-bottom: 20rpx;
}

.filter-toggle-text {
  font-size: 24rpx;
  color: #4A9B8E;
  background: #E8F5E9;
  padding: 12rpx 32rpx;
  border-radius: 30rpx;
}

.filter-section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.filter-row {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}

.filter-row:last-child {
  margin-bottom: 0;
}

.filter-item {
  flex: 1;
}

.filter-item.full {
  flex: 1;
}

.filter-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.picker-value {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #F8F9FA;
  padding: 16rpx 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.filter-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 20rpx;
}

.btn {
  flex: 1;
  padding: 20rpx;
  border-radius: 16rpx;
  text-align: center;
}

.btn.reset {
  background: #F0F0F0;
}

.btn.search {
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
}

.btn-text {
  font-size: 28rpx;
  font-weight: 500;
}

.btn.reset .btn-text {
  color: #666;
}

.btn.search .btn-text {
  color: #FFFFFF;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-item {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
  display: flex;
  align-items: flex-start;
}

.task-checkbox {
  padding-right: 20rpx;
  padding-top: 8rpx;
}

.checkbox {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  border: 3rpx solid #DDD;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #FFFFFF;
}

.checkbox.checked {
  background: #4CAF50;
  border-color: #4CAF50;
}

.checkbox-icon {
  color: #FFFFFF;
  font-size: 28rpx;
  font-weight: bold;
}

.task-info {
  flex: 1;
}

.task-header {
  display: flex;
  align-items: center;
  margin-bottom: 12rpx;
}

.task-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #333;
  flex: 1;
}

.task-title.completed {
  text-decoration: line-through;
  color: #999;
}

.task-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 22rpx;
}

.task-tag.homework {
  background: #E3F2FD;
  color: #1976D2;
}

.task-tag.extracurricular {
  background: #F3E5F5;
  color: #7B1FA2;
}

.tag-text {
  font-size: 22rpx;
}

.task-points {
  margin-left: 12rpx;
  display: inline-block;
}

.points-text {
  font-size: 24rpx;
  color: #B8860B;
  font-weight: 500;
}

.task-meta {
  display: flex;
  align-items: center;
  gap: 12rpx;
}

.task-user-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
}

.task-user-name {
  font-size: 24rpx;
  color: #666;
}

.task-date {
  font-size: 24rpx;
  color: #999;
  margin-left: auto;
}

.task-actions {
  display: flex;
  gap: 12rpx;
  margin-left: 16rpx;
}

.action-btn {
  padding: 12rpx 16rpx;
  border-radius: 8rpx;
}

.action-btn.edit {
  background: #E3F2FD;
}

.action-btn.delete {
  background: #FFE5E5;
}

.action-text {
  font-size: 24rpx;
  font-weight: 500;
}

.action-btn.edit .action-text {
  color: #1976D2;
}

.action-btn.delete .action-text {
  color: #E05555;
}

.empty-state {
  text-align: center;
  padding: 60rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #AAA;
}

.load-more {
  text-align: center;
  padding: 30rpx 0;
  margin-top: 20rpx;
}

.load-more-text {
  font-size: 28rpx;
  color: #4A9B8E;
  background: #E8F5E9;
  padding: 16rpx 40rpx;
  border-radius: 30rpx;
  display: inline-block;
}

.load-more:active .load-more-text {
  background: #D4EDDA;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 600rpx;
  max-height: 80vh;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 30rpx;
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.modal-close {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.close-text {
  font-size: 48rpx;
  color: #FFFFFF;
  line-height: 1;
}

.form-item {
  padding: 20rpx 30rpx;
}

.form-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  background: #F8F9FA;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
}

.type-selector {
  display: flex;
  gap: 16rpx;
}

.type-btn {
  flex: 1;
  padding: 16rpx;
  background: #F8F9FA;
  border-radius: 12rpx;
  text-align: center;
  border: 2rpx solid transparent;
}

.type-btn.active {
  background: #E3F2FD;
  border-color: #1976D2;
}

.type-btn-text {
  font-size: 28rpx;
  color: #333;
}

.type-btn.active .type-btn-text {
  color: #1976D2;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
}

.btn.cancel {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  background: #F0F0F0;
  text-align: center;
}

.btn.confirm {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
  text-align: center;
}

.btn.cancel .btn-text {
  color: #666;
}

.btn.confirm .btn-text {
  color: #FFFFFF;
}

.loading {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.3);
  display: flex;
  align-items: center;
  justify-content: center;
}

.loading-text {
  background: #FFFFFF;
  padding: 30rpx 60rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
}
</style>