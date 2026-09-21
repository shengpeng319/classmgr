<template>
  <view class="container">
    <CommonHeader title="积分" :show-manage-btn="true" @manage-add-points="goToAddPoints" @manage-subtract-points="goToSubtractPoints" />
    <UserSelector v-if="isAdmin && children.length > 0" :users="children" v-model="selectedChildId" />
    
    <view class="content">
      <view class="points-card">
        <view class="points-icon"><text class="points-star">★</text></view>
        <view class="points-info">
          <text class="points-label">{{ selectedChildName }}</text>
          <text class="points-value">{{ points ?? 0 }}</text>
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
import { getV2ChildPoints, type PointRecordV2 } from '@/api/family'
import { useFamilyStore } from '@/stores/family'
import { storeToRefs } from 'pinia'
import { usePagination } from '@/composables/usePagination'

const familyStore = useFamilyStore()
const { children } = storeToRefs(familyStore)

const isAdmin = ref(false)

const selectedChildId = ref('')
const points = ref(0)

const { displayedItems: records, hasMore, remainingCount, loadMore, setItems } = usePagination<PointRecordV2>()

const selectedChildName = computed(() => {
  const child = children.value.find(c => c.id === selectedChildId.value)
  return child?.name || '我的积分'
})

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()} ${date.getHours()}:${String(date.getMinutes()).padStart(2, '0')}`
}

const loadUsers = async () => {
  try {
    await familyStore.refresh()
    if (children.value.length > 0 && !selectedChildId.value) {
      selectedChildId.value = children.value[0].id
    }
  } catch (e) {
    console.error('Failed to load family', e)
  }
}

const loadChildData = async () => {
  if (!selectedChildId.value) return
  try {
    const res: any = await getV2ChildPoints(selectedChildId.value)
    if (res.code === 0 && res.data) {
      points.value = res.data.points ?? 0
      setItems(res.data.records || [])
    }
  } catch (e) {
    console.error('Failed to load child points', e)
  }
}

watch(selectedChildId, () => {
  loadChildData()
})

onShow(() => {
  loadUsers().then(() => {
    loadChildData()
  })
})

onMounted(() => {
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    // v2: 登录账号只有 parent/admin，均为管理者（孩子是档案不是账号）
    isAdmin.value = user.role === 'admin' || user.role === 'parent'
  }
  loadUsers().then(() => {
    loadChildData()
  })

  uni.$on('taskUpdated', (data: { childId: string }) => {
    if (selectedChildId.value === data.childId) {
      loadChildData()
    }
  })
})

const goToAddPoints = () => {
  const child = children.value.find(c => c.id === selectedChildId.value)
  if (child) {
    uni.navigateTo({
      url: `/pages/points-manage/points-manage?mode=add&childId=${child.id}&childName=${encodeURIComponent(child.name)}`
    })
  }
}

const goToSubtractPoints = () => {
  const child = children.value.find(c => c.id === selectedChildId.value)
  if (child) {
    uni.navigateTo({
      url: `/pages/points-manage/points-manage?mode=subtract&childId=${child.id}&childName=${encodeURIComponent(child.name)}`
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