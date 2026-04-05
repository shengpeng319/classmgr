<template>
  <view class="container">
    <CommonHeader title="今日任务" :show-add-btn="true" @add="showAddModal" />
    <view class="date-bar">
      <text class="date-text">{{ currentDate }}</text>
    </view>

    <view class="content">
      <view class="section">
        <view class="section-header">
          <text class="section-title">待完成任务</text>
          <text class="section-count">{{ pendingTasks.length }}</text>
        </view>
        <view class="task-list" v-if="pendingTasks.length > 0">
          <view 
            class="task-item" 
            v-for="task in pendingTasks" 
            :key="task.id"
            @click="toggleTask(task)"
          >
            <view class="checkbox" :class="{ checked: task.isCompleted }">
              <text class="checkbox-icon" v-if="task.isCompleted">✓</text>
            </view>
            <image 
              v-if="task.user && isAdmin" 
              class="task-user-avatar" 
              :src="task.user.avatar || defaultAvatar" 
              mode="aspectFill" 
            />
            <text class="task-title">{{ task.title }}</text>
            <view class="task-user-name" v-if="task.user && isAdmin">
              <text class="task-user-name-text">{{ task.user.name || task.user.username }}</text>
            </view>
            <view class="task-tag" :class="task.type">
              <text class="tag-text">{{ task.type === 'homework' ? '作业' : '课外班' }}</text>
            </view>
            <view class="task-points">
              <text class="points-text">{{ task.points || 5 }}</text>
            </view>
          </view>
        </view>
        <view class="empty-state" v-else>
          <text class="empty-text">暂无待完成任务</text>
        </view>
      </view>

      <view class="section">
        <view class="section-header">
          <text class="section-title completed">已完成任务</text>
          <text class="section-count">{{ completedTasks.length }}</text>
        </view>
        <view class="task-list" v-if="completedTasks.length > 0">
          <view 
            class="task-item" 
            v-for="task in completedTasks" 
            :key="task.id"
            @click="toggleTask(task)"
          >
            <view class="checkbox checked">
              <text class="checkbox-icon">✓</text>
            </view>
            <image 
              v-if="task.user && isAdmin" 
              class="task-user-avatar" 
              :src="task.user.avatar || defaultAvatar" 
              mode="aspectFill" 
            />
            <text class="task-title completed">{{ task.title }}</text>
            <view class="task-user-name" v-if="task.user && isAdmin">
              <text class="task-user-name-text">{{ task.user.name || task.user.username }}</text>
            </view>
            <view class="task-tag" :class="task.type">
              <text class="tag-text">{{ task.type === 'homework' ? '作业' : '课外班' }}</text>
            </view>
            <view class="task-points">
              <text class="points-text">{{ task.points || 5 }}</text>
            </view>
          </view>
        </view>
        <view class="empty-state" v-else>
          <text class="empty-text">暂无已完成任务</text>
        </view>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 添加任务弹窗 -->
    <view class="modal" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">添加任务</text>
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
            <text class="btn-text">添加</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { getTasks, updateTask, initTasks, createTask, getUsers, type Task } from '@/api/task'
import CommonHeader from '@/components/CommonHeader.vue'

const loading = ref(false)
const currentDate = ref('')
const tasks = ref<Task[]>([])
const showModal = ref(false)
const userId = ref('')
const isAdmin = ref(false)
const allUsers = ref<Array<{ id: string; username: string; name?: string; role: string }>>([])
const formUserIndex = ref(0)

const formData = ref({
  userId: '',
  title: '',
  type: 'homework' as 'homework' | 'extracurricular',
  points: 5,
  startDate: '',
  endDate: ''
})

const loadUserInfo = () => {
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    isAdmin.value = user.role === 'admin'
    userId.value = user.id || ''
  }
}

const loadUsers = async () => {
  try {
    const res: any = await getUsers()
    if (res && res.data) {
      allUsers.value = res.data || []
    }
  } catch (e) {
    console.error('Failed to load users', e)
  }
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

const pendingTasks = computed(() => 
  tasks.value.filter(t => !t.isCompleted)
)

const completedTasks = computed(() => 
  tasks.value.filter(t => t.isCompleted)
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

const getDefaultTasks = () => {
  const today = new Date()
  const dateStr = getDateString(today)
  return [
    { title: '数学作业', type: 'homework', startDate: dateStr, endDate: dateStr },
    { title: '语文作文', type: 'homework', startDate: dateStr, endDate: dateStr },
    { title: '英语单词', type: 'homework', startDate: dateStr, endDate: dateStr },
    { title: '钢琴课', type: 'extracurricular', startDate: dateStr, endDate: dateStr },
    { title: '绘画课', type: 'extracurricular', startDate: dateStr, endDate: dateStr },
    { title: '舞蹈课', type: 'extracurricular', startDate: dateStr, endDate: dateStr },
    { title: '游泳课', type: 'extracurricular', startDate: dateStr, endDate: dateStr },
    { title: '象棋课', type: 'extracurricular', startDate: dateStr, endDate: dateStr }
  ]
}

const loadTasks = async () => {
  if (!userId.value && !isAdmin.value) {
    console.error('No userId, skipping task load')
    return
  }
  
  loading.value = true
  try {
    const dateStr = getDateString(new Date())
    const res: any = await getTasks({ startDate: dateStr, endDate: dateStr })
    
    if (res.code === 0) {
      tasks.value = res.data || []
      
      if (tasks.value.length === 0 && !isAdmin.value) {
        await initTasks(userId.value, getDefaultTasks())
        const retryRes: any = await getTasks({ startDate: dateStr, endDate: dateStr })
        if (retryRes.code === 0) {
          tasks.value = retryRes.data || []
        }
      }
    } else {
      uni.showToast({ title: res.message || '加载失败', icon: 'none' })
    }
  } catch (e: any) {
    console.error('Failed to load tasks', e)
    uni.showToast({ title: '网络错误', icon: 'none' })
  } finally {
    loading.value = false
  }
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

const showAddModal = () => {
  formData.value = {
    userId: allUsers.value[0]?.id || userId.value,
    title: '',
    type: 'homework',
    points: 5,
    startDate: getDateString(new Date()),
    endDate: getDateString(new Date())
  }
  formUserIndex.value = allUsers.value.findIndex(u => u.id === userId.value) || 0
  showModal.value = true
}

const closeModal = () => {
  showModal.value = false
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
    const res: any = await createTask({
      userId: formData.value.userId || userId.value,
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
  } catch (e) {
    console.error('Failed to save task', e)
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}

onMounted(() => {
  currentDate.value = formatDate(new Date())
  loadUserInfo()
  loadUsers()
  loadTasks()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8E7 0%, #F0F8FF 100%);
  padding: 20rpx 40rpx;
}

.date-bar {
  text-align: center;
  margin-bottom: 20rpx;
}

.date-text {
  font-size: 26rpx;
  color: #888;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 40rpx;
}

.section {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 30rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06);
}

.section-header {
  display: flex;
  align-items: center;
  margin-bottom: 24rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #F0F0F0;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #FF9500;
}

.section-title.completed {
  color: #4CAF50;
}

.section-count {
  margin-left: 16rpx;
  background: #FFF3E0;
  color: #FF9500;
  font-size: 24rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.task-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.task-item {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: #F8F9FA;
  border-radius: 16rpx;
  transition: all 0.2s;
}

.task-item:active {
  background: #F0F0F0;
  transform: scale(0.98);
}

.checkbox {
  width: 48rpx;
  height: 48rpx;
  border-radius: 12rpx;
  border: 3rpx solid #DDD;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
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

.task-title {
  flex: 1;
  font-size: 30rpx;
  color: #333;
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
}

.points-text {
  font-size: 24rpx;
  color: #B8860B;
}

.task-user-avatar {
  width: 48rpx;
  height: 48rpx;
  border-radius: 50%;
  margin-right: 12rpx;
  border: 2rpx solid #E0E0E0;
}

.task-user-name {
  margin-right: 12rpx;
}

.task-user-name-text {
  font-size: 22rpx;
  color: #888;
  background: #F0F0F0;
  padding: 4rpx 12rpx;
  border-radius: 12rpx;
}

.empty-state {
  text-align: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: #AAA;
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
  color: #333;
}

.add-btn {
  padding: 12rpx 24rpx;
  background: linear-gradient(135deg, #FF9500, #FF6B00);
  border-radius: 12rpx;
}

.add-btn-text {
  font-size: 26rpx;
  color: #FFFFFF;
  font-weight: 500;
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
  background: #E8F5E9;
  border-color: #4A9B8E;
}

.type-btn-text {
  font-size: 28rpx;
  color: #333;
}

.type-btn.active .type-btn-text {
  color: #4A9B8E;
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
</style>