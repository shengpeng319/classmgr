<template>
  <view class="container">
    <view class="header">
      <text class="title">积分抽卡</text>
      <text class="points">当前积分: {{ points }}</text>
    </view>
    <view class="content">
      <view class="empty-state">
        <text class="empty-text">暂无可抽取的卡片</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const points = ref(0)
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFE5E5 0%, #F0F8FF 100%);
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #E05555;
  display: block;
}

.points {
  font-size: 28rpx;
  color: #E88D00;
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
