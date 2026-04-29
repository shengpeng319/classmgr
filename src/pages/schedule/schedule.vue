<template>
  <view class="container">
    <CommonHeader title="课程表" :show-add-btn="true" :show-week-btn="true" @add="showAddModal" @week="goToToday" />
    <FilterBar :is-admin="isAdmin" />

    <view class="week-selector">
      <view class="week-nav" @click="prevWeek">
        <text class="nav-arrow">‹</text>
      </view>
      <view class="week-display">
        <text class="week-text">{{ weekRangeText }}</text>
      </view>
      <view class="week-nav" @click="nextWeek">
        <text class="nav-arrow">›</text>
      </view>
    </view>

    <view class="schedule-list">
      <view class="day-section" v-for="day in weekSchedule" :key="day.date" :id="day.isToday ? 'today-section' : ''">
        <view class="day-header" :class="{ today: day.isToday }">
          <text class="day-name">{{ day.dayName }}</text>
          <text class="day-date">{{ day.dateStr }}</text>
          <view class="today-badge" v-if="day.isToday">今天</view>
        </view>
        <view class="course-list" v-if="day.courses.length > 0">
          <view
            class="course-item"
            v-for="course in day.courses"
            :key="course.id"
          >
            <view class="course-color" :style="{ backgroundColor: course.color || '#87CEEB' }"></view>
            <view class="course-time">
              <text class="time-text">{{ course.startTime }}</text>
              <text class="time-divider">-</text>
              <text class="time-text">{{ course.endTime }}</text>
            </view>
            <view class="course-info">
              <view class="course-user" v-if="isAdmin && course.user">
                <image class="user-avatar" v-if="course.user.avatar" :src="course.user.avatar" mode="aspectFill"></image>
                <text class="user-avatar-placeholder" v-else>{{ course.user.name?.charAt(0) || '?' }}</text>
                <text class="user-name">{{ course.user.name || '未知用户' }}</text>
              </view>
              <text class="course-name">
                <text class="star-icon" v-if="course.isDailyTask">★</text>
                {{ course.name }}
              </text>
              <text class="course-location" v-if="course.location">{{ course.location }}</text>
              <text class="course-points" v-if="course.isDailyTask">{{ course.points }}积分</text>
            </view>
            <view class="course-tag" :class="course.type">
              <text class="tag-text">{{ getCourseTypeName(course.type) }}</text>
            </view>
            <view class="course-actions" v-if="isAdmin" @click.stop>
              <view class="action-icon edit" @click.stop="editSchedule(course)">✎</view>
              <view class="action-icon delete" @click.stop="confirmDelete(course)">✕</view>
            </view>
          </view>
        </view>
        <view class="empty-day" v-else>
          <text class="empty-text">暂无课程</text>
        </view>
      </view>
    </view>

    <view class="loading" v-if="loading">
      <text class="loading-text">加载中...</text>
    </view>

    <view class="modal" v-if="showModal" @click="closeModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingSchedule ? '编辑课程' : '添加课程' }}</text>
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
          <text class="form-label">课程名称</text>
          <input class="form-input" v-model="formData.name" placeholder="请输入课程名称" />
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
          <text class="form-label">上课日（可多选）</text>
          <view class="day-selector">
            <view
              class="day-btn"
              v-for="day in dayOptions"
              :key="day.value"
              :class="{ active: isDaySelected(day.value) }"
              @click="toggleDay(day.value)"
            >
              <text class="day-btn-text">{{ day.name }}</text>
            </view>
          </view>
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">开始时间</text>
            <picker mode="time" :value="formData.startTime" @change="onStartTimeChange">
              <view class="picker-value">
                <text>{{ formData.startTime || '请选择' }}</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">结束时间</text>
            <picker mode="time" :value="formData.endTime" @change="onEndTimeChange">
              <view class="picker-value">
                <text>{{ formData.endTime || '请选择' }}</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="form-item">
          <text class="form-label">上课地点</text>
          <input class="form-input" v-model="formData.location" placeholder="请输入上课地点（选填）" />
        </view>

        <view class="form-item">
          <view class="checkbox-row">
            <view class="checkbox-item" :class="{ active: formData.isDailyTask }" @click="toggleDailyTask">
              <text class="checkbox-icon">{{ formData.isDailyTask ? '✓' : '' }}</text>
              <text class="checkbox-text">当日任务</text>
            </view>
          </view>
        </view>

        <view class="form-item" v-if="formData.isDailyTask">
          <text class="form-label">任务积分</text>
          <input class="form-input" type="number" v-model="formData.points" placeholder="请输入积分值（默认1）" />
        </view>

        <view class="form-row">
          <view class="form-item half">
            <text class="form-label">有效期起始</text>
            <picker mode="date" :value="formData.startDate" @change="onFormStartDateChange">
              <view class="picker-value">
                <text>{{ formData.startDate || '不限制' }}</text>
              </view>
            </picker>
          </view>
          <view class="form-item half">
            <text class="form-label">有效期结束</text>
            <picker mode="date" :value="formData.endDate" @change="onFormEndDateChange">
              <view class="picker-value">
                <text>{{ formData.endDate || '不限制' }}</text>
              </view>
            </picker>
          </view>
        </view>

        <view class="modal-actions">
          <view class="btn cancel" @click="closeModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="btn confirm" @click="saveSchedule">
            <text class="btn-text">{{ editingSchedule ? '保存' : '添加' }}</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, watch, getCurrentInstance } from 'vue'
import CommonHeader from '@/components/CommonHeader.vue'
import FilterBar from '@/components/FilterBar.vue'
import { getSchedules, getAdminSchedules, createSchedule, updateSchedule, deleteSchedule, getUsers, type Schedule } from '@/api/schedule'
import { useUserFilterStore } from '@/stores/userFilter'
import { storeToRefs } from 'pinia'

const filterStore = useUserFilterStore()
const { selectedUserIds } = storeToRefs(filterStore)

const loading = ref(false)
const schedules = ref<Schedule[]>([])
const showModal = ref(false)
const editingSchedule = ref<Schedule | null>(null)
const isAdmin = ref(false)
const userId = ref('')
const allUsers = ref<Array<{ id: string; username: string; name?: string; role: string }>>([])
const formUserIndex = ref(0)
const currentWeekStart = ref<Date>(new Date())

const dayOptions = [
  { value: 0, name: '周日', short: '日' },
  { value: 1, name: '周一', short: '一' },
  { value: 2, name: '周二', short: '二' },
  { value: 3, name: '周三', short: '三' },
  { value: 4, name: '周四', short: '四' },
  { value: 5, name: '周五', short: '五' },
  { value: 6, name: '周六', short: '六' },
]

const formData = ref({
  userId: '',
  name: '',
  type: 'school' as 'school' | 'tutoring' | 'homework' | 'sports' | 'art' | 'other',
  dayOfWeek: [] as number[],
  startTime: '09:00',
  endTime: '10:00',
  location: '',
  isDailyTask: false,
  points: 1,
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

const getCourseTypeName = (type: string): string => {
  return typeOptions.find(t => t.value === type)?.label || type
}

const getMonday = (date: Date): Date => {
  const d = new Date(date)
  const day = d.getDay()
  const diff = d.getDate() - day + (day === 0 ? -6 : 1)
  d.setDate(diff)
  d.setHours(0, 0, 0, 0)
  return d
}

const formatDateStr = (date: Date): string => {
  return `${date.getMonth() + 1}/${date.getDate()}`
}

const weekRangeText = computed(() => {
  const monday = currentWeekStart.value
  const sunday = new Date(monday)
  sunday.setDate(monday.getDate() + 6)
  return `${formatDateStr(monday)} - ${formatDateStr(sunday)}`
})

const isCurrentWeek = computed(() => {
  const today = new Date()
  const currentMonday = getMonday(today)
  return currentWeekStart.value.toDateString() === currentMonday.toDateString()
})

const getDayName = (date: Date): string => {
  const names = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  return names[date.getDay()]
}

const isToday = (date: Date): boolean => {
  const today = new Date()
  return date.toDateString() === today.toDateString()
}

const isDaySelected = (day: number): boolean => {
  return formData.value.dayOfWeek.includes(day)
}

const toggleDay = (day: number) => {
  const days = formData.value.dayOfWeek
  const idx = days.indexOf(day)
  if (idx >= 0) {
    days.splice(idx, 1)
  } else {
    days.push(day)
    days.sort((a, b) => a - b)
  }
}

const toggleDailyTask = () => {
  formData.value.isDailyTask = !formData.value.isDailyTask
  if (formData.value.isDailyTask && !formData.value.points) {
    formData.value.points = 1
  }
}

const weekSchedule = computed(() => {
  const monday = currentWeekStart.value
  const days = []

  for (let i = 0; i < 7; i++) {
    const date = new Date(monday)
    date.setDate(monday.getDate() + i)
    const dayOfWeek = date.getDay()

    const dayCourses = schedules.value
      .filter(s => {
        const days = s.dayOfWeek.split(',').map(d => Number(d.trim()))
        return days.includes(dayOfWeek)
      })
      .sort((a, b) => a.startTime.localeCompare(b.startTime))

    days.push({
      date,
      dateStr: formatDateStr(date),
      dayName: getDayName(date),
      isToday: isToday(date),
      courses: dayCourses
    })
  }

  return days
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
      filterStore.initUsers(res.data || [])
    }
  } catch (e) {
    console.error('Failed to load users', e)
  }
}

const loadSchedules = async () => {
  loading.value = true
  try {
    const weekStart = currentWeekStart.value
    const weekEnd = new Date(weekStart)
    weekEnd.setDate(weekStart.getDate() + 6)
    const startStr = weekStart.toISOString().split('T')[0]
    const endStr = weekEnd.toISOString().split('T')[0]
    
    let allSchedules: Schedule[] = []
    
    if (isAdmin.value) {
      const res: any = await getAdminSchedules(undefined, startStr, endStr)
      if (res.code === 0) {
        allSchedules = res.data || []
      }
    } else {
      const res: any = await getSchedules(startStr, endStr)
      if (res.code === 0) {
        allSchedules = res.data || []
      }
    }
    
    if (isAdmin.value && selectedUserIds.value.length > 0) {
      schedules.value = allSchedules.filter(s => selectedUserIds.value.includes(s.userId))
    } else {
      schedules.value = allSchedules
    }
  } catch (e) {
    console.error('Failed to load schedules', e)
  } finally {
    loading.value = false
  }
}

const prevWeek = () => {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() - 7)
  currentWeekStart.value = newStart
}

const nextWeek = () => {
  const newStart = new Date(currentWeekStart.value)
  newStart.setDate(newStart.getDate() + 7)
  currentWeekStart.value = newStart
}

const goToToday = () => {
  currentWeekStart.value = getMonday(new Date())
  setTimeout(() => {
    const query = uni.createSelectorQuery().in(getCurrentInstance()?.proxy)
    query.select('#today-section').boundingClientRect((rect: any) => {
      if (rect) {
        uni.pageScrollTo({
          scrollTop: rect.top - 100,
          duration: 300
        })
      }
    }).exec()
  }, 100)
}

const onFormUserChange = (e: any) => {
  formUserIndex.value = e.detail.value
  formData.value.userId = allUsers.value[e.detail.value]?.id || ''
}

const onStartTimeChange = (e: any) => {
  formData.value.startTime = e.detail.value
}

const onEndTimeChange = (e: any) => {
  formData.value.endTime = e.detail.value
}

const onFormStartDateChange = (e: any) => {
  formData.value.startDate = e.detail.value
}

const onFormEndDateChange = (e: any) => {
  formData.value.endDate = e.detail.value
}

const showAddModal = () => {
  editingSchedule.value = null
  formData.value = {
    userId: allUsers.value[0]?.id || userId.value,
    name: '',
    type: 'school',
    dayOfWeek: [],
    startTime: '09:00',
    endTime: '10:00',
    location: '',
    isDailyTask: false,
    points: 1,
    startDate: '',
    endDate: ''
  }
  formUserIndex.value = allUsers.value.findIndex(u => u.id === userId.value) || 0
  showModal.value = true
}

const editSchedule = (schedule: Schedule) => {
  editingSchedule.value = schedule
  const userIdx = allUsers.value.findIndex(u => u.id === schedule.userId)
  formUserIndex.value = userIdx >= 0 ? userIdx : 0
  const days = schedule.dayOfWeek.split(',').map(d => Number(d.trim()))
  formData.value = {
    userId: schedule.userId,
    name: schedule.name,
    type: schedule.type as 'school' | 'tutoring' | 'homework' | 'sports' | 'art' | 'other',
    dayOfWeek: days,
    startTime: schedule.startTime,
    endTime: schedule.endTime,
    location: schedule.location || '',
    isDailyTask: schedule.isDailyTask || false,
    points: schedule.points || 1,
    startDate: schedule.startDate ? schedule.startDate.split('T')[0] : '',
    endDate: schedule.endDate ? schedule.endDate.split('T')[0] : ''
  }
  showModal.value = true
}

const confirmDelete = (schedule: Schedule) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除课程"${schedule.name}"吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const result: any = await deleteSchedule(schedule.id)
          if (result.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            loadSchedules()
          }
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const closeModal = () => {
  showModal.value = false
  editingSchedule.value = null
}

const saveSchedule = async () => {
  if (!formData.value.name) {
    uni.showToast({ title: '请输入课程名称', icon: 'none' })
    return
  }
  if (formData.value.dayOfWeek.length === 0) {
    uni.showToast({ title: '请选择上课日', icon: 'none' })
    return
  }
  if (isAdmin.value && !formData.value.userId) {
    uni.showToast({ title: '请选择用户', icon: 'none' })
    return
  }

  try {
    const data = {
      userId: formData.value.userId || userId.value,
      name: formData.value.name,
      type: formData.value.type,
      dayOfWeek: formData.value.dayOfWeek.join(','),
      startTime: formData.value.startTime,
      endTime: formData.value.endTime,
      location: formData.value.location || undefined,
      startDate: formData.value.startDate || undefined,
      endDate: formData.value.endDate || undefined,
      isDailyTask: formData.value.isDailyTask,
      points: formData.value.isDailyTask ? (Number(formData.value.points) || 1) : undefined
    }

    if (editingSchedule.value) {
      const res: any = await updateSchedule(editingSchedule.value.id, data)
      if (res.code === 0) {
        uni.showToast({ title: '保存成功', icon: 'success' })
        closeModal()
        loadSchedules()
      } else {
        uni.showToast({ title: res.message || '保存失败', icon: 'none' })
      }
    } else {
      const res: any = await createSchedule(data)
      if (res.code === 0) {
        uni.showToast({ title: '添加成功', icon: 'success' })
        closeModal()
        loadSchedules()
      } else {
        uni.showToast({ title: res.message || '添加失败', icon: 'none' })
      }
    }
  } catch (e) {
    console.error('Failed to save schedule', e)
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

onMounted(() => {
  currentWeekStart.value = getMonday(new Date())
  loadUserInfo()
  loadUsers()
  loadSchedules()
})

watch(selectedUserIds, () => {
  if (isAdmin.value) {
    loadSchedules()
  }
}, { deep: true })
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8F5E9 0%, #F0F8FF 100%);
  padding: 20rpx;
}

.week-selector {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 20rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.week-nav {
  width: 64rpx;
  height: 64rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  background: #E8F5E9;
  border-radius: 50%;
}

.nav-arrow {
  font-size: 36rpx;
  color: #4A9B8E;
  font-weight: bold;
}

.week-display {
  flex: 1;
  text-align: center;
}

.week-text {
  font-size: 28rpx;
  color: #333;
  font-weight: 600;
}

.schedule-list {
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.day-section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 24rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.day-header {
  display: flex;
  align-items: center;
  margin-bottom: 20rpx;
  padding-bottom: 16rpx;
  border-bottom: 2rpx solid #F0F0F0;
}

.day-header.today {
  border-bottom-color: #4A9B8E;
}

.day-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-right: 16rpx;
}

.day-date {
  font-size: 24rpx;
  color: #999;
  flex: 1;
}

.today-badge {
  background: #4A9B8E;
  color: #FFFFFF;
  font-size: 20rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
}

.course-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.course-item {
  display: flex;
  align-items: center;
  background: #F8F9FA;
  border-radius: 12rpx;
  padding: 20rpx;
}

.course-color {
  width: 8rpx;
  height: 60rpx;
  border-radius: 4rpx;
  margin-right: 16rpx;
}

.course-time {
  display: flex;
  flex-direction: column;
  align-items: center;
  margin-right: 20rpx;
  min-width: 80rpx;
}

.time-text {
  font-size: 24rpx;
  color: #666;
  font-weight: 500;
}

.time-divider {
  font-size: 20rpx;
  color: #CCC;
}

.course-info {
  flex: 1;
}

.course-name {
  font-size: 28rpx;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.course-location {
  font-size: 22rpx;
  color: #999;
}

.course-user {
  display: flex;
  align-items: center;
  margin-bottom: 6rpx;
}

.user-avatar {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  margin-right: 8rpx;
}

.user-avatar-placeholder {
  width: 36rpx;
  height: 36rpx;
  border-radius: 50%;
  background: #E8F5E9;
  color: #4A9B8E;
  font-size: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 8rpx;
}

.user-name {
  font-size: 22rpx;
  color: #666;
}

.course-tag {
  padding: 6rpx 16rpx;
  border-radius: 8rpx;
  font-size: 20rpx;
  margin-right: 12rpx;
}

.course-tag.school {
  background: #E3F2FD;
  color: #1976D2;
}

.course-tag.tutoring {
  background: #FFF3E0;
  color: #E65100;
}

.course-tag.homework {
  background: #F3E5F5;
  color: #7B1FA2;
}

.course-tag.sports {
  background: #E8F5E9;
  color: #2E7D32;
}

.course-tag.art {
  background: #FCE4EC;
  color: #C2185B;
}

.course-tag.other {
  background: #ECEFF1;
  color: #546E7A;
}

.tag-text {
  font-size: 22rpx;
}

.course-actions {
  display: flex;
  gap: 8rpx;
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

.empty-day {
  text-align: center;
  padding: 20rpx 0;
}

.empty-text {
  font-size: 24rpx;
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
  z-index: 999;
}

.loading-text {
  background: #FFFFFF;
  padding: 30rpx 60rpx;
  border-radius: 16rpx;
  font-size: 28rpx;
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

.form-item.half {
  flex: 1;
}

.form-row {
  display: flex;
  gap: 20rpx;
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

.day-selector {
  display: flex;
  gap: 12rpx;
  flex-wrap: wrap;
}

.day-btn {
  padding: 12rpx 20rpx;
  background: #F8F9FA;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
  min-width: 80rpx;
  text-align: center;
}

.day-btn.active {
  background: #E3F2FD;
  border-color: #1976D2;
}

.day-btn-text {
  font-size: 26rpx;
  color: #333;
}

.day-btn.active .day-btn-text {
  color: #1976D2;
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

.star-icon {
  color: #FFD700;
  margin-right: 4rpx;
}

.course-points {
  font-size: 22rpx;
  color: #FF9800;
  margin-left: 8rpx;
}

.checkbox-row {
  display: flex;
  align-items: center;
}

.checkbox-item {
  display: flex;
  align-items: center;
  padding: 12rpx 20rpx;
  background: #F8F9FA;
  border-radius: 12rpx;
  border: 2rpx solid transparent;
}

.checkbox-item.active {
  background: #FFF3E0;
  border-color: #FF9800;
}

.checkbox-icon {
  width: 32rpx;
  height: 32rpx;
  border-radius: 8rpx;
  background: #FFFFFF;
  border: 2rpx solid #DDD;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #FF9800;
  margin-right: 8rpx;
}

.checkbox-item.active .checkbox-icon {
  background: #FF9800;
  border-color: #FF9800;
  color: #FFFFFF;
}

.checkbox-text {
  font-size: 26rpx;
  color: #333;
}
</style>
