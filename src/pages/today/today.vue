<template>
  <view class="container">
    <view class="header">
      <text class="title">今日课程</text>
      <text class="date">{{ currentDate }}</text>
    </view>
    <view class="content">
      <view class="empty-state">
        <text class="empty-text">暂无今日课程安排</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const currentDate = ref('')

onMounted(() => {
  const now = new Date()
  currentDate.value = `${now.getFullYear()}年${now.getMonth() + 1}月${now.getDate()}日`
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8E7 0%, #F0F8FF 100%);
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #E88D00;
  display: block;
}

.date {
  font-size: 28rpx;
  color: #888;
  margin-top: 10rpx;
  display: block;
}

.content {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 60rpx 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06);
}

.empty-state {
  text-align: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 30rpx;
  color: #AAA;
}
</style>
