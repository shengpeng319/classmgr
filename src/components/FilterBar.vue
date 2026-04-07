<template>
  <view class="filter-bar" v-if="isAdmin && regularUsers.length > 0">
    <scroll-view scroll-x class="user-scroll">
      <view class="user-list">
        <view 
          class="user-avatar-item" 
          v-for="user in regularUsers" 
          :key="user.id"
          @click="handleToggle(user.id)"
        >
          <view class="avatar-wrapper" :class="{ selected: isSelected(user.id) }">
            <image class="avatar-img" :src="user.avatar || defaultAvatar" mode="aspectFill" />
            <view class="check-badge" v-if="isSelected(user.id)">
              <text class="check-icon">✓</text>
            </view>
          </view>
          <text class="user-name">{{ user.name || user.username }}</text>
        </view>
      </view>
    </scroll-view>
  </view>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useUserFilterStore } from '@/stores/userFilter'
import { storeToRefs } from 'pinia'

const props = defineProps<{
  isAdmin: boolean
}>()

const filterStore = useUserFilterStore()
const { regularUsers } = storeToRefs(filterStore)

const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'

const isSelected = (userId: string) => filterStore.isSelected(userId)

const handleToggle = (userId: string) => {
  filterStore.toggleUser(userId)
}
</script>

<style scoped>
.filter-bar {
  background: #FFFFFF;
  padding: 16rpx 0;
  margin-bottom: 16rpx;
  border-radius: 16rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.user-scroll {
  white-space: nowrap;
}

.user-list {
  display: inline-flex;
  padding: 0 16rpx;
  gap: 24rpx;
}

.user-avatar-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 8rpx;
}

.avatar-wrapper {
  position: relative;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  transition: all 0.2s;
}

.avatar-wrapper.selected {
  border-color: #4A9B8E;
}

.avatar-img {
  width: 100%;
  height: 100%;
  border-radius: 50%;
}

.check-badge {
  position: absolute;
  bottom: -4rpx;
  right: -4rpx;
  width: 32rpx;
  height: 32rpx;
  background: #4A9B8E;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #FFFFFF;
}

.check-icon {
  font-size: 18rpx;
  color: #FFFFFF;
  font-weight: bold;
}

.user-name {
  font-size: 20rpx;
  color: #666;
  max-width: 80rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}
</style>