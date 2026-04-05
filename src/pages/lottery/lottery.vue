<template>
  <view class="container">
    <CommonHeader title="积分抽卡" />
    <view class="content">
      <view class="points-bar">
        <text class="points-text">当前积分: {{ points }}</text>
      </view>
      <view class="empty-state">
        <text class="empty-text">暂无可抽取的卡片</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import CommonHeader from '@/components/CommonHeader.vue'

const points = ref(0)
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFE5E5 0%, #F0F8FF 100%);
  padding: 20rpx 40rpx;
}

.content {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06);
}

.points-bar {
  text-align: center;
  margin-bottom: 30rpx;
}

.points-text {
  font-size: 28rpx;
  color: #E88D00;
  font-weight: 500;
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