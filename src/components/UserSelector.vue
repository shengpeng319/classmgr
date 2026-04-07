<template>
  <view class="filter-bar" v-if="users.length > 0">
    <scroll-view scroll-x class="user-scroll">
      <view class="user-list">
        <view 
          class="user-avatar-item" 
          v-for="user in users" 
          :key="user.id"
          @click="handleSelect(user.id)"
        >
          <view class="avatar-wrapper" :class="{ selected: modelValue === user.id }">
            <image class="avatar-img" :src="user.avatar || defaultAvatar" mode="aspectFill" />
            <view class="check-badge" v-if="modelValue === user.id">
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
defineProps<{
  users: Array<{ id: string; username: string; name?: string; avatar?: string; role: string }>
  modelValue: string
}>()

const emit = defineEmits<{
  'update:modelValue': [value: string]
}>()

const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'

const handleSelect = (userId: string) => {
  emit('update:modelValue', userId)
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