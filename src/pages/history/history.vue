<template>
  <view class="container">
    <view class="header">
      <text class="title">历史记录</text>
      <text class="subtitle">查看过往学习记录</text>
    </view>
    <view class="content">
      <view class="empty-state">
        <text class="empty-text">暂无历史记录</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #E8F5E9 0%, #F0F8FF 100%);
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #4A9B8E;
  display: block;
}

.subtitle {
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
