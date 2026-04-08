<template>
  <view class="container">
    <CommonHeader title="积分" :show-manage-btn="true" @manage-add-points="goToAddPoints" @manage-subtract-points="goToSubtractPoints" />
    <UserSelector v-if="isAdmin" :users="regularUsers" v-model="selectedUserId" />
    
    <view class="content">
      <view class="points-card">
        <view class="points-icon"><text class="points-star">★</text></view>
        <view class="points-info">
          <text class="points-label">{{ selectedUserName }}</text>
          <text class="points-value">{{ userInfo?.points ?? 0 }}</text>
        </view>
      </view>

      <view class="history-section">
        <view class="section-header">
          <text class="section-title">积分记录</text>
        </view>
        <view class="history-list" v-if="records.length > 0">
          <view class="history-item" v-for="record in records" :key="record.id">
            <view class="history-left">
              <text class="history-title">{{ record.taskTitle }}</text>
              <text class="history-reason">{{ record.reason }}</text>
              <text class="history-date">{{ formatDate(record.createdAt) }}</text>
            </view>
            <view class="history-right">
              <text class="history-points" :class="{ positive: record.points > 0, negative: record.points < 0 }">
                {{ record.points > 0 ? '+' : '' }}{{ record.points }}
              </text>
            </view>
          </view>
        </view>
        <view class="empty-history" v-else>
          <text class="empty-text">暂无积分记录</text>
        </view>
        
        <view class="load-more" v-if="hasMore" @click="loadMore">
          <text class="load-more-text">展开更多 ({{ remainingCount }} 条)</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import CommonHeader from '@/components/CommonHeader.vue'
import UserSelector from '@/components/UserSelector.vue'
import { getLotteryInfo } from '@/api/lottery'
import { getPointRecords, getAdminPointRecords, getAdminUserPoints, getUsers, type PointRecord } from '@/api/task'
import { usePagination } from '@/composables/usePagination'

const isAdmin = ref(false)
const userId = ref('')
const allUsers = ref<Array<{ id: string; username: string; name?: string; avatar?: string; role: string }>>([])
const regularUsers = computed(() => allUsers.value.filter(u => u.role !== 'admin'))

const selectedUserId = ref('')
const userInfo = ref<{ id: string; name?: string; avatar?: string; points: number } | null>(null)

const { displayedItems: records, hasMore, remainingCount, loadMore, setItems } = usePagination<PointRecord>()

const selectedUserName = computed(() => {
  const user = regularUsers.value.find(u => u.id === selectedUserId.value)
  return user?.name || user?.username || '我的积分'
})

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadUsers = async () => {
  try {
    const res: any = await getUsers()
    if (res.code === 0) {
      allUsers.value = res.data || []
      if (allUsers.value.length > 0 && !selectedUserId.value) {
        selectedUserId.value = regularUsers.value[0]?.id || ''
      }
    }
  } catch (e) {
    console.error('Failed to load users', e)
  }
}

const loadUserPoints = async () => {
  try {
    if (isAdmin.value && selectedUserId.value) {
      const res: any = await getAdminUserPoints(selectedUserId.value)
      if (res.code === 0) {
        userInfo.value = res.data
      }
    } else {
      const res: any = await getLotteryInfo()
      if (res.code === 0) {
        userInfo.value = res.data
      }
    }
  } catch (e) {
    console.error('Failed to load user points', e)
  }
}

const loadRecords = async () => {
  try {
    if (isAdmin.value && selectedUserId.value) {
      const res: any = await getAdminPointRecords(selectedUserId.value)
      if (res.code === 0) {
        setItems(res.data || [])
      }
    } else {
      const res: any = await getPointRecords()
      if (res.code === 0) {
        setItems(res.data || [])
      }
    }
  } catch (e) {
    console.error('Failed to load records', e)
  }
}

watch(selectedUserId, () => {
  if (isAdmin.value && selectedUserId.value) {
    loadUserPoints()
    loadRecords()
  }
})

onShow(() => {
  if (isAdmin.value) {
    loadUsers().then(() => {
      if (selectedUserId.value) {
        loadUserPoints()
        loadRecords()
      }
    })
  } else {
    loadUserPoints()
    loadRecords()
  }
})

onMounted(() => {
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    isAdmin.value = user.role === 'admin'
    userId.value = user.id || ''
  }
  loadUsers().then(() => {
    if (!isAdmin.value && userId.value) {
      selectedUserId.value = userId.value
    }
    loadUserPoints()
    loadRecords()
  })

  uni.$on('taskUpdated', (data: { userId: string }) => {
    if (isAdmin.value && selectedUserId.value === data.userId) {
      loadUserPoints()
      loadRecords()
    }
  })
})

const goToAddPoints = () => {
  const user = regularUsers.value.find(u => u.id === selectedUserId.value)
  if (user) {
    uni.navigateTo({ 
      url: `/pages/points-manage/points-manage?mode=add&userId=${user.id}&userName=${encodeURIComponent(user.name || user.username)}` 
    })
  }
}

const goToSubtractPoints = () => {
  const user = regularUsers.value.find(u => u.id === selectedUserId.value)
  if (user) {
    uni.navigateTo({ 
      url: `/pages/points-manage/points-manage?mode=subtract&userId=${user.id}&userName=${encodeURIComponent(user.name || user.username)}` 
    })
  }
}

onUnmounted(() => {
  uni.$off('taskUpdated')
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8E1 0%, #FFFDE7 100%);
  padding: 20rpx 30rpx;
}

.content {
  padding-top: 20rpx;
  display: flex;
  flex-direction: column;
  gap: 24rpx;
}

.points-card {
  display: flex;
  align-items: center;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(255, 165, 0, 0.3);
}

.points-icon {
  width: 120rpx;
  height: 120rpx;
  background: rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 30rpx;
}

.points-star {
  font-size: 60rpx;
  color: #FFFFFF;
}

.points-info {
  flex: 1;
}

.points-label {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.9);
  display: block;
  margin-bottom: 8rpx;
}

.points-value {
  font-size: 56rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.history-section {
  background: #FFFFFF;
  border-radius: 20rpx;
  padding: 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.section-header {
  margin-bottom: 20rpx;
}

.section-title {
  font-size: 28rpx;
  font-weight: 600;
  color: #333;
}

.history-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.history-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 20rpx;
  background: #F8F9FA;
  border-radius: 12rpx;
}

.history-left {
  flex: 1;
}

.history-title {
  font-size: 26rpx;
  color: #333;
  display: block;
  margin-bottom: 4rpx;
}

.history-reason {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 4rpx;
}

.history-date {
  font-size: 22rpx;
  color: #AAA;
}

.history-points {
  font-size: 32rpx;
  font-weight: bold;
}

.history-points.positive {
  color: #4A9B8E;
}

.history-points.negative {
  color: #E05555;
}

.empty-history {
  text-align: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 26rpx;
  color: #AAA;
}

.load-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 24rpx 0;
  margin-top: 16rpx;
}

.load-more-text {
  font-size: 26rpx;
  color: #4A9B8E;
  padding: 16rpx 32rpx;
  background: #F0F7F6;
  border-radius: 32rpx;
}
</style>