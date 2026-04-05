<template>
  <view class="container">
    <!-- 顶部装饰区域 -->
    <view class="header">
      <view class="cloud cloud-1"></view>
      <view class="cloud cloud-2"></view>
      <view class="sun"></view>
      <view class="title-area">
        <text class="title">小孩课程管理</text>
        <text class="subtitle">快乐学习，健康成长</text>
      </view>
      
      <!-- 用户头像区域 -->
      <view class="user-area" @click="showUserMenu">
        <image class="user-avatar" :src="avatarUrl" mode="aspectFill" />
        <view class="user-badge" v-if="isAdmin">
          <text class="badge-text">管</text>
        </view>
      </view>
    </view>

    <!-- 主内容区域 -->
    <view class="content">
      <!-- 功能入口卡片 -->
      <view class="card-grid">
        <view class="entry-card" @click="navigateTo('/pages/today/today')">
          <view class="card-icon today-icon">
            <view class="icon-sun"></view>
            <view class="icon-rays"></view>
          </view>
          <text class="card-title">今日一览</text>
          <text class="card-desc">查看今天的课程安排</text>
          <view class="card-bg today-bg"></view>
        </view>

        <view class="entry-card" @click="navigateTo('/pages/history/history')">
          <view class="card-icon history-icon">
            <view class="icon-book"></view>
          </view>
          <text class="card-title">历史数据</text>
          <text class="card-desc">回顾过往学习记录</text>
          <view class="card-bg history-bg"></view>
        </view>

        <view class="entry-card" @click="navigateTo('/pages/lottery/lottery')">
          <view class="card-icon lottery-icon">
            <view class="icon-star"></view>
            <view class="icon-sparkle"></view>
          </view>
          <text class="card-title">积分抽卡</text>
          <text class="card-desc">用积分兑换惊喜卡片</text>
          <view class="card-bg lottery-bg"></view>
        </view>

        <view class="entry-card" @click="navigateTo('/pages/user/user')" v-if="isAdmin">
          <view class="card-icon user-icon">
            <view class="icon-person"></view>
          </view>
          <text class="card-title">用户管理</text>
          <text class="card-desc">管理家庭成员信息</text>
          <view class="card-bg user-bg"></view>
        </view>
      </view>
    </view>

    <!-- 用户菜单弹窗 -->
    <view class="menu-modal" v-if="showMenu" @click="closeMenu">
      <view class="menu-content" @click.stop>
        <view class="menu-header">
          <image class="menu-avatar" :src="avatarUrl" mode="aspectFill" />
          <view class="menu-info">
            <text class="menu-username">{{ username }}</text>
            <text class="menu-role">{{ isAdmin ? '管理员' : '普通用户' }}</text>
          </view>
        </view>
        <view class="menu-divider"></view>
        <view class="menu-item" @click="goToProfile">
          <text class="menu-item-text">个人资料</text>
        </view>
        <view class="menu-item" @click="switchUser">
          <text class="menu-item-text">切换用户</text>
        </view>
        <view class="menu-item logout" @click="handleLogout">
          <text class="menu-item-text">退出登录</text>
        </view>
      </view>
    </view>

    <!-- 底部装饰 -->
    <view class="footer">
      <view class="grass"></view>
      <view class="flower flower-1"></view>
      <view class="flower flower-2"></view>
      <view class="flower flower-3"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

const navigateTo = (url: string) => {
  uni.navigateTo({ url })
}

const showMenu = ref(false)
const avatarUrl = ref('')
const username = ref('')
const isAdmin = ref(false)

const defaultAvatars = [
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
  'https://cdn-icons-png.flaticon.com/512/699/699730.png'
]

const loadUserInfo = () => {
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    username.value = user.username || '用户'
    avatarUrl.value = user.avatar || defaultAvatars[0]
    isAdmin.value = user.role === 'admin'
  } else {
    username.value = '未登录'
    avatarUrl.value = defaultAvatars[0]
  }
}

const showUserMenu = () => {
  showMenu.value = true
}

const closeMenu = () => {
  showMenu.value = false
}

const goToProfile = () => {
  closeMenu()
  uni.navigateTo({ url: '/pages/profile/profile' })
}

const switchUser = () => {
  closeMenu()
  uni.showModal({
    title: '切换用户',
    content: '确定要切换用户吗？',
    success: (res) => {
      if (res.confirm) {
        uni.reLaunch({ url: '/pages/login/login' })
      }
    }
  })
}

const handleLogout = () => {
  closeMenu()
  uni.showModal({
    title: '确认退出',
    content: '确定要退出登录吗？',
    success: (res) => {
      if (res.confirm) {
        uni.clearStorageSync()
        uni.reLaunch({ url: '/pages/login/login' })
      }
    }
  })
}

onMounted(() => {
  loadUserInfo()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #87CEEB 0%, #B0E0E6 30%, #E0F7FA 60%, #FFF8E7 100%);
  position: relative;
  overflow: hidden;
}

/* 顶部装饰 */
.header {
  position: relative;
  padding: 80rpx 40rpx 60rpx;
  text-align: center;
}

/* 用户头像区域 */
.user-area {
  position: absolute;
  top: 80rpx;
  right: 40rpx;
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  overflow: visible;
  z-index: 10;
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.15);
}

.user-badge {
  position: absolute;
  top: -8rpx;
  right: -8rpx;
  width: 36rpx;
  height: 36rpx;
  background: linear-gradient(135deg, #FFD93D, #FFA500);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #FFFFFF;
}

.badge-text {
  font-size: 20rpx;
  font-weight: bold;
  color: #FFFFFF;
}

/* 用户菜单弹窗 */
.menu-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  z-index: 999;
  display: flex;
  justify-content: flex-end;
  align-items: flex-start;
  padding-top: 120rpx;
  padding-right: 30rpx;
}

.menu-content {
  width: 400rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.2);
}

.menu-header {
  display: flex;
  align-items: center;
  padding: 30rpx;
  background: linear-gradient(135deg, #87CEEB 0%, #5BA4C4 100%);
}

.menu-avatar {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  border: 4rpx solid #FFFFFF;
}

.menu-info {
  margin-left: 24rpx;
}

.menu-username {
  font-size: 32rpx;
  font-weight: bold;
  color: #FFFFFF;
  display: block;
}

.menu-role {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-top: 8rpx;
}

.menu-divider {
  height: 1rpx;
  background: #F0F0F0;
}

.menu-item {
  padding: 30rpx;
  border-bottom: 1rpx solid #F5F5F5;
}

.menu-item:last-child {
  border-bottom: none;
}

.menu-item:active {
  background: #F8F9FA;
}

.menu-item.logout {
  background: #FFF5F5;
}

.menu-item.logout:active {
  background: #FFE5E5;
}

.menu-item-text {
  font-size: 28rpx;
  color: #333;
}

.menu-item.logout .menu-item-text {
  color: #E05555;
}

.cloud {
  position: absolute;
  background: #FFFFFF;
  border-radius: 100rpx;
  opacity: 0.9;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.05);
}

.cloud::before,
.cloud::after {
  content: '';
  position: absolute;
  background: #FFFFFF;
  border-radius: 50%;
}

.cloud-1 {
  width: 160rpx;
  height: 50rpx;
  top: 40rpx;
  left: 20rpx;
  animation: float 6s ease-in-out infinite;
}

.cloud-1::before {
  width: 80rpx;
  height: 80rpx;
  top: -40rpx;
  left: 20rpx;
}

.cloud-1::after {
  width: 60rpx;
  height: 60rpx;
  top: -25rpx;
  right: 20rpx;
}

.cloud-2 {
  width: 120rpx;
  height: 40rpx;
  top: 80rpx;
  right: 40rpx;
  animation: float 8s ease-in-out infinite 1s;
}

.cloud-2::before {
  width: 60rpx;
  height: 60rpx;
  top: -30rpx;
  left: 15rpx;
}

.cloud-2::after {
  width: 45rpx;
  height: 45rpx;
  top: -20rpx;
  right: 15rpx;
}

.sun {
  position: absolute;
  top: 30rpx;
  right: 80rpx;
  width: 80rpx;
  height: 80rpx;
  background: radial-gradient(circle, #FFD93D 0%, #FFA500 100%);
  border-radius: 50%;
  box-shadow: 0 0 40rpx #FFD93D, 0 0 80rpx rgba(255, 217, 61, 0.4);
  animation: glow 3s ease-in-out infinite;
}

.title-area {
  position: relative;
  z-index: 1;
}

.title {
  font-size: 48rpx;
  font-weight: bold;
  color: #2C5F2D;
  text-shadow: 2rpx 2rpx 4rpx rgba(255, 255, 255, 0.8);
  display: block;
  margin-bottom: 16rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #4A7C59;
  opacity: 0.9;
}

/* 内容区域 */
.content {
  padding: 0 30rpx 120rpx;
}

.card-grid {
  display: grid;
  grid-template-columns: repeat(2, 1fr);
  gap: 30rpx;
}

/* 入口卡片 */
.entry-card {
  position: relative;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 40rpx 30rpx 30rpx;
  text-align: center;
  overflow: hidden;
  box-shadow: 
    0 12rpx 24rpx rgba(0, 0, 0, 0.08),
    0 4rpx 8rpx rgba(0, 0, 0, 0.04),
    inset 0 2rpx 4rpx rgba(255, 255, 255, 0.8);
  transition: transform 0.3s ease, box-shadow 0.3s ease;
}

.entry-card:active {
  transform: scale(0.96);
}

.card-icon {
  width: 120rpx;
  height: 120rpx;
  margin: 0 auto 24rpx;
  position: relative;
  border-radius: 50%;
}

/* 今日一览图标 - 太阳 */
.today-icon {
  background: linear-gradient(135deg, #FFD93D 0%, #FFA500 100%);
  box-shadow: 0 8rpx 16rpx rgba(255, 165, 0, 0.3);
}

.icon-sun {
  position: absolute;
  width: 60rpx;
  height: 60rpx;
  background: #FFFFFF;
  border-radius: 50%;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-sun::before {
  content: '';
  position: absolute;
  width: 8rpx;
  height: 20rpx;
  background: #FFFFFF;
  border-radius: 4rpx;
  top: -24rpx;
  left: 50%;
  transform: translateX(-50%);
  box-shadow:
    0 104rpx 0 #FFFFFF,
    -24rpx 52rpx 0 #FFFFFF,
    24rpx 52rpx 0 #FFFFFF,
    -24rpx -52rpx 0 #FFFFFF,
    24rpx -52rpx 0 #FFFFFF;
}

/* 历史数据图标 - 书本 */
.history-icon {
  background: linear-gradient(135deg, #98D8C8 0%, #6BB8A4 100%);
  box-shadow: 0 8rpx 16rpx rgba(107, 184, 164, 0.3);
}

.icon-book {
  position: absolute;
  width: 50rpx;
  height: 60rpx;
  background: #FFFFFF;
  border-radius: 4rpx 12rpx 12rpx 4rpx;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.icon-book::before {
  content: '';
  position: absolute;
  width: 4rpx;
  height: 48rpx;
  background: #6BB8A4;
  left: 50%;
  top: 6rpx;
  transform: translateX(-50%);
}

.icon-book::after {
  content: '';
  position: absolute;
  width: 30rpx;
  height: 4rpx;
  background: #6BB8A4;
  left: 10rpx;
  top: 16rpx;
  box-shadow: 0 12rpx 0 #6BB8A4, 0 24rpx 0 #6BB8A4;
}

/* 积分抽卡图标 - 星星 */
.lottery-icon {
  background: linear-gradient(135deg, #FF8B8B 0%, #FF6B6B 100%);
  box-shadow: 0 8rpx 16rpx rgba(255, 107, 107, 0.3);
}

.icon-star {
  position: absolute;
  width: 50rpx;
  height: 50rpx;
  background: #FFFFFF;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%) rotate(45deg);
  border-radius: 4rpx;
}

.icon-star::before,
.icon-star::after {
  content: '';
  position: absolute;
  background: #FFFFFF;
  border-radius: 4rpx;
}

.icon-star::before {
  width: 50rpx;
  height: 50rpx;
  transform: rotate(45deg);
}

.icon-star::after {
  width: 50rpx;
  height: 50rpx;
  transform: rotate(-45deg);
}

.icon-sparkle {
  position: absolute;
  width: 16rpx;
  height: 16rpx;
  background: #FFFFFF;
  border-radius: 50%;
  top: 15rpx;
  right: 20rpx;
  box-shadow: -40rpx 40rpx 0 8rpx rgba(255, 255, 255, 0.6);
}

/* 用户管理图标 - 人物 */
.user-icon {
  background: linear-gradient(135deg, #A8D8EA 0%, #7EC8E3 100%);
  box-shadow: 0 8rpx 16rpx rgba(126, 200, 227, 0.3);
}

.icon-person {
  position: absolute;
  width: 36rpx;
  height: 36rpx;
  background: #FFFFFF;
  border-radius: 50%;
  top: 20rpx;
  left: 50%;
  transform: translateX(-50%);
}

.icon-person::after {
  content: '';
  position: absolute;
  width: 56rpx;
  height: 40rpx;
  background: #FFFFFF;
  border-radius: 28rpx 28rpx 8rpx 8rpx;
  top: 44rpx;
  left: 50%;
  transform: translateX(-50%);
}

.card-title {
  font-size: 32rpx;
  font-weight: 600;
  display: block;
  margin-bottom: 12rpx;
}

.card-desc {
  font-size: 24rpx;
  color: #888;
  display: block;
}

/* 卡片背景装饰 */
.card-bg {
  position: absolute;
  bottom: -30rpx;
  right: -30rpx;
  width: 120rpx;
  height: 120rpx;
  border-radius: 50%;
  opacity: 0.15;
}

.today-bg {
  background: linear-gradient(135deg, #FFD93D, #FFA500);
}

.history-bg {
  background: linear-gradient(135deg, #98D8C8, #6BB8A4);
}

.lottery-bg {
  background: linear-gradient(135deg, #FF8B8B, #FF6B6B);
}

.user-bg {
  background: linear-gradient(135deg, #A8D8EA, #7EC8E3);
}

/* 文字颜色 */
.entry-card:nth-child(1) .card-title {
  color: #E88D00;
}

.entry-card:nth-child(2) .card-title {
  color: #4A9B8E;
}

.entry-card:nth-child(3) .card-title {
  color: #E05555;
}

.entry-card:nth-child(4) .card-title {
  color: #5BA4C4;
}

/* 底部装饰 */
.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80rpx;
  overflow: hidden;
}

.grass {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 60rpx;
  background: linear-gradient(180deg, transparent 0%, #90EE90 20%, #7CCD7C 100%);
  border-radius: 100% 100% 0 0 / 40rpx 40rpx 0 0;
}

.flower {
  position: absolute;
  width: 24rpx;
  height: 24rpx;
  background: #FFB6C1;
  border-radius: 50%;
  bottom: 40rpx;
}

.flower::before,
.flower::after {
  content: '';
  position: absolute;
  width: 16rpx;
  height: 16rpx;
  background: #FFB6C1;
  border-radius: 50%;
}

.flower::before {
  top: -8rpx;
  left: 4rpx;
}

.flower::after {
  top: 4rpx;
  left: -8rpx;
}

.flower-1 {
  left: 15%;
  background: #FFB6C1;
}

.flower-2 {
  left: 50%;
  background: #FFD700;
}

.flower-2::before,
.flower-2::after {
  background: #FFD700;
}

.flower-3 {
  right: 20%;
  background: #DDA0DD;
}

.flower-3::before,
.flower-3::after {
  background: #DDA0DD;
}

/* 动画 */
@keyframes float {
  0%, 100% {
    transform: translateX(0);
  }
  50% {
    transform: translateX(20rpx);
  }
}

@keyframes glow {
  0%, 100% {
    box-shadow: 0 0 40rpx #FFD93D, 0 0 80rpx rgba(255, 217, 61, 0.4);
  }
  50% {
    box-shadow: 0 0 60rpx #FFD93D, 0 0 100rpx rgba(255, 217, 61, 0.6);
  }
}
</style>
