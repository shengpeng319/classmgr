<template>
  <view class="container">
    <CommonHeader :title="pageTitle" :show-add-btn="true" :show-import-btn="true" @add="showAddModal" @import="handleImport" />
    <FilterBar :is-admin="isAdmin" />

    <view class="task-list">
      <view class="task-section" v-if="incompleteTasks.length > 0">
        <view class="section-header">
          <text class="section-title">待完成 ({{ incompleteTasks.length }})</text>
          <text class="history-entry-text" @click="goHistory">历史 ›</text>
        </view>
        <view class="task-item" v-for="task in incompleteTasks" :key="task.id" @click="toggleTask(task)">
          <view class="task-checkbox" @click.stop="toggleTask(task)">
            <view class="checkbox">
              <text class="checkbox-icon"></text>
            </view>
          </view>
          <view class="task-info">
            <view class="task-header">
              <text class="task-title">{{ task.title }}</text>
              <view class="task-tag" :class="task.type">
                <text class="tag-text">{{ getTaskTypeName(task.type) }}</text>
              </view>
              <view class="task-points">
                <text class="points-text">{{ task.points || 5 }}</text>
              </view>
            </view>
            <view class="task-meta">
              <image class="task-user-avatar" :src="task.child?.avatar || defaultAvatar" mode="aspectFill" />
              <text class="task-user-name">{{ task.child?.name }}</text>
              <text class="task-date">{{ formatDateRange(task.startDate, task.endDate) }}</text>
            </view>
          </view>
          <view class="task-actions" v-if="isAdmin" @click.stop>
            <view class="action-icon edit" @click.stop="editTask(task)">✎</view>
            <view class="action-icon delete" @click.stop="confirmDelete(task)">✕</view>
          </view>
        </view>
      </view>

      <view class="task-section" v-if="completedTasks.length > 0">
        <view class="section-header completed">
          <text class="section-title">已完成 ({{ completedTasks.length }})</text>
        </view>
        <view class="task-item completed" v-for="task in completedTasks" :key="task.id" @click="toggleTask(task)">
          <view class="task-checkbox" @click.stop="toggleTask(task)">
            <view class="checkbox checked">
              <text class="checkbox-icon">✓</text>
            </view>
          </view>
          <view class="task-info">
            <view class="task-header">
              <text class="task-title completed">{{ task.title }}</text>
              <view class="task-tag" :class="task.type">
                <text class="tag-text">{{ getTaskTypeName(task.type) }}</text>
              </view>
              <view class="task-points">
                <text class="points-text">{{ task.points || 5 }}</text>
              </view>
            </view>
            <view class="task-meta">
              <image class="task-user-avatar" :src="task.child?.avatar || defaultAvatar" mode="aspectFill" />
              <text class="task-user-name">{{ task.child?.name }}</text>
              <text class="task-date">{{ formatDateRange(task.startDate, task.endDate) }}</text>
            </view>
          </view>
          <view class="task-actions" v-if="isAdmin" @click.stop>
            <view class="action-icon edit" @click.stop="editTask(task)">✎</view>
            <view class="action-icon delete" @click.stop="confirmDelete(task)">✕</view>
          </view>
        </view>
      </view>

      <view class="empty-state" v-if="tasks.length === 0 && !loading">
        <text class="empty-text">暂无任务记录</text>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>

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
          <picker mode="selector" :value="formUserIndex" :range="children" range-key="name" @change="onFormUserChange">
            <view class="picker-value">
              <text>{{ children[formUserIndex]?.name || '请选择' }}</text>
            </view>
          </picker>
        </view>

        <view class="form-item">
          <text class="form-label">任务名称</text>
          <input class="form-input" v-model="formData.title" placeholder="请输入任务名称" />
        </view>

        <view class="form-item">
          <text class="form-label">类型</text>
          <view class="type-grid">
            <view
              class="type-btn"
              :class="{ active: formData.type === 'school' }"
              @click="formData.type = 'school'"
            >
              <text class="type-btn-text">学校</text>
            </view>
            <view
              class="type-btn"
              :class="{ active: formData.type === 'tutoring' }"
              @click="formData.type = 'tutoring'"
            >
              <text class="type-btn-text">补习班</text>
            </view>
            <view
              class="type-btn"
              :class="{ active: formData.type === 'homework' }"
              @click="formData.type = 'homework'"
            >
              <text class="type-btn-text">作业</text>
            </view>
            <view
              class="type-btn"
              :class="{ active: formData.type === 'sports' }"
              @click="formData.type = 'sports'"
            >
              <text class="type-btn-text">体育</text>
            </view>
            <view
              class="type-btn"
              :class="{ active: formData.type === 'art' }"
              @click="formData.type = 'art'"
            >
              <text class="type-btn-text">艺术</text>
            </view>
            <view
              class="type-btn"
              :class="{ active: formData.type === 'other' }"
              @click="formData.type = 'other'"
            >
              <text class="type-btn-text">其他</text>
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
    
    <PointsEarnedAnimation 
      :show="showPointsAnimation" 
      :points="earnedPoints"
      @close="onAnimationClose"
    />
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getV2Tasks, createV2Task, updateV2Task, deleteV2Task, type TaskV2 } from '@/api/family'
import { generateDailyTasks } from '@/api/task'
import CommonHeader from '@/components/CommonHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import PointsEarnedAnimation from '@/components/PointsEarnedAnimation.vue'
import { useFamilyStore } from '@/stores/family'
import { storeToRefs } from 'pinia'

const familyStore = useFamilyStore()
const { children, selectedChildIds } = storeToRefs(familyStore)

const loading = ref(false)
const currentDate = ref('')
const tasks = ref<TaskV2[]>([])
const showModal = ref(false)
const editingTask = ref<TaskV2 | null>(null)
const isAdmin = ref(false)
const formUserIndex = ref(0)
const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
const taskToggleOrder = ref<Map<string, number>>(new Map())
let toggleCounter = 0

const showPointsAnimation = ref(false)
const earnedPoints = ref(0)

const formData = ref({
  childId: '',
  title: '',
  type: 'school' as 'school' | 'tutoring' | 'homework' | 'sports' | 'art' | 'other',
  points: 5,
  startDate: '',
  endDate: ''
})

const typeOptions = [
  { value: 'school', label: '学校' },
  { value: 'tutoring', label: '补习班' },
  { value: 'homework', label: '作业' },
  { value: 'sports', label: '体育' },
  { value: 'art', label: '艺术' },
  { value: 'other', label: '其他' },
]

const getTaskTypeName = (type: string): string => {
  return typeOptions.find(t => t.value === type)?.label || type
}

const loadUserInfo = () => {
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    // v2: 登录账号只有 parent/admin，均为管理者（孩子是档案不是账号）
    isAdmin.value = user.role === 'admin' || user.role === 'parent'
  }
}

const loadUsers = async () => {
  try {
    await familyStore.refresh()
  } catch (e) {
    console.error('Failed to load family', e)
  }
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

const onFormUserChange = (e: any) => {
  formUserIndex.value = e.detail.value
  formData.value.childId = children.value[e.detail.value]?.id || ''
}

const onFormStartDateChange = (e: any) => {
  formData.value.startDate = e.detail.value
}

const onFormEndDateChange = (e: any) => {
  formData.value.endDate = e.detail.value
}

const pageTitle = computed(() => {
  return `今日任务 (${currentDate.value})`
})

const incompleteTasks = computed(() => 
  tasks.value
    .filter(t => !t.isCompleted)
    .sort((a, b) => {
      const orderA = taskToggleOrder.value.get(a.id) ?? 0
      const orderB = taskToggleOrder.value.get(b.id) ?? 0
      return orderA - orderB
    })
)

const completedTasks = computed(() => 
  tasks.value
    .filter(t => t.isCompleted)
    .sort((a, b) => {
      const orderA = taskToggleOrder.value.get(a.id) ?? 0
      const orderB = taskToggleOrder.value.get(b.id) ?? 0
      return orderB - orderA
    })
)

const formatDate = (date: Date) => {
  const year = date.getFullYear()
  const month = date.getMonth() + 1
  const day = date.getDate()
  return `${year}年${month}月${day}日`
}

const getDateString = (date: Date) => {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

const loadTasks = async () => {
  loading.value = true
  try {
    const dateStr = getDateString(new Date())

    const res: any = await getV2Tasks({ date: dateStr })
    let allTasks: TaskV2[] = res.code === 0 ? (res.data || []) : []

    if (isAdmin.value && selectedChildIds.value.length > 0) {
      allTasks = allTasks.filter(t => selectedChildIds.value.includes(t.childId))
    }

    tasks.value = allTasks
  } catch (e: any) {
    console.error('Failed to load tasks', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
}

const toggleTask = async (task: TaskV2) => {
  const newStatus = !task.isCompleted

  const optimisticTask = tasks.value.find(t => t.id === task.id)
  if (optimisticTask) {
    optimisticTask.isCompleted = newStatus
  }

  toggleCounter++
  if (newStatus) {
    taskToggleOrder.value.set(task.id, toggleCounter)
  } else {
    taskToggleOrder.value.set(task.id, -toggleCounter)
  }

  try {
    const res: any = await updateV2Task(task.id, { isCompleted: newStatus })
    if (res.code === 0) {
      if (newStatus) {
        earnedPoints.value = task.points || 5
        showPointsAnimation.value = true
      }
      uni.$emit('taskUpdated', { childId: task.childId })
    } else {
      await loadTasks()
    }
  } catch (e) {
    console.error('Failed to update task', e)
    await loadTasks()
  }
}

const onAnimationClose = () => {
  showPointsAnimation.value = false
}

const goHistory = () => {
  uni.navigateTo({ url: '/pages/history/history' })
}

const handleImport = async () => {
  try {
    const res: any = await generateDailyTasks()
    if (res.code === 0) {
      uni.showToast({ title: '导入成功', icon: 'success' })
      await loadTasks()
    } else {
      uni.showToast({ title: res.message || '导入失败', icon: 'none' })
    }
  } catch (e) {
    console.error('Failed to import tasks', e)
    uni.showToast({ title: '导入失败', icon: 'none' })
  }
}

const showAddModal = () => {
  editingTask.value = null
  formData.value = {
    childId: children.value[0]?.id || '',
    title: '',
    type: 'school',
    points: 5,
    startDate: getDateString(new Date()),
    endDate: getDateString(new Date())
  }
  formUserIndex.value = 0
  showModal.value = true
}

const editTask = (task: TaskV2) => {
  editingTask.value = task
  const childIdx = children.value.findIndex(c => c.id === task.childId)
  Object.assign(formData.value, {
    childId: task.childId,
    title: task.title,
    type: task.type as 'school' | 'tutoring' | 'homework' | 'sports' | 'art' | 'other',
    points: task.points || 5,
    startDate: toLocalDateString(task.startDate),
    endDate: toLocalDateString(task.endDate)
  })
  formUserIndex.value = childIdx >= 0 ? childIdx : 0
  showModal.value = true
}

const confirmDelete = (task: TaskV2) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除任务"${task.title}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const res: any = await deleteTask(task.id)
          if (res.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            loadTasks()
          }
        } catch (e) {
          console.error('Failed to delete task', e)
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
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
  if (!formData.value.childId) {
    uni.showToast({ title: '请选择孩子', icon: 'none' })
    return
  }

  try {
    const points = Number(formData.value.points) || 5
    if (editingTask.value) {
      const res: any = await updateV2Task(editingTask.value.id, {
        title: formData.value.title,
        points: points
      })
      if (res.code === 0) {
        uni.showToast({ title: '保存成功', icon: 'success' })
        closeModal()
        loadTasks()
      } else {
        uni.showToast({ title: res.message || '保存失败', icon: 'none' })
      }
    } else {
      const res: any = await createV2Task({
        childId: formData.value.childId,
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
      } else {
        uni.showToast({ title: res.message || '添加失败', icon: 'none' })
      }
    }
  } catch (e) {
    console.error('Failed to save task', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

watch(selectedChildIds, () => {
  if (isAdmin.value) {
    loadTasks()
  }
}, { deep: true })

onMounted(() => {
  currentDate.value = formatDate(new Date())
  loadUserInfo()
  loadUsers()
  loadTasks()
})

// 小程序 tabBar 页切回不重新 mount——AI 改了任务后靠 onShow 重拉
onShow(() => {
  if (currentDate.value) loadTasks()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8F5E9 0%, #F0F8FF 100%);
  padding: 20rpx;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-section {
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.section-header {
  padding: 12rpx 8rpx;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.section-title {
  font-size: 26rpx;
  color: #666;
  font-weight: 600;
}

.section-header.completed {
  margin-top: 8rpx;
}

.section-header.completed .section-title {
  color: #4A9B8E;
}

.task-item.completed {
  opacity: 0.75;
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

.task-tag.school {
  background: #E3F2FD;
  color: #1976D2;
}

.task-tag.tutoring {
  background: #FFF3E0;
  color: #E65100;
}

.task-tag.homework {
  background: #F3E5F5;
  color: #7B1FA2;
}

.task-tag.sports {
  background: #E8F5E9;
  color: #2E7D32;
}

.task-tag.art {
  background: #FCE4EC;
  color: #C2185B;
}

.task-tag.other {
  background: #ECEFF1;
  color: #546E7A;
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
  gap: 8rpx;
  margin-left: 16rpx;
}

.action-icon {
  width: 48rpx;
  height: 48rpx;
  border-radius: 8rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 24rpx;
}

.action-icon.edit {
  background: #E3F2FD;
  color: #1976D2;
}

.action-icon.delete {
  background: #FFE5E5;
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
  max-height: 90vh;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow-y: auto;
  -webkit-overflow-scrolling: touch;
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

.type-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 12rpx;
}

.type-btn {
  width: calc(33.33% - 8rpx);
  padding: 16rpx 8rpx;
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

.btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  text-align: center;
}

.btn.cancel {
  background: #F0F0F0;
}

.btn.confirm {
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
}

.btn-text {
  font-size: 28rpx;
  font-weight: 500;
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

.history-entry-text {
  font-size: 24rpx;
  color: #999999;
}
</style>