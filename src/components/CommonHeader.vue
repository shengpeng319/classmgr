<template>
  <view class="header">
    <view class="header-left">
      <text class="title" v-if="title">{{ title }}</text>
      <view class="add-btn" v-if="showAddBtn && isAdmin" @click="$emit('add')">
        <text class="add-btn-text">+ 添加</text>
      </view>
      <view class="week-btn" v-if="showWeekBtn" @click="$emit('week')">
        <text class="week-btn-text">回到当日</text>
      </view>
      <view class="import-btn" v-if="showImportBtn && isAdmin" @click="$emit('import')">
        <text class="import-btn-text">导入...</text>
      </view>
      <view class="manage-btn" v-if="showManageBtn && isAdmin" @click="toggleManageMenu">
        <text class="manage-btn-text">管理...</text>
      </view>
      
      <!-- 管理菜单弹窗 -->
      <view class="manage-menu-popup" v-if="showManageMenu">
        <view class="manage-menu-item" @click="onAddPoints">
          <text class="manage-menu-text">加分</text>
        </view>
        <view class="manage-menu-divider"></view>
        <view class="manage-menu-item" @click="onSubtractPoints">
          <text class="manage-menu-text">减分</text>
        </view>
      </view>
    </view>
    <view class="header-right">
      <view class="user-area" @click="toggleMenu">
        <image class="user-avatar" :src="avatarUrl" mode="aspectFill" />
        <view class="user-badge" v-if="isAdmin">
          <text class="badge-text">管</text>
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
        <view class="menu-item" @click="goToUserManagement" v-if="isAdmin">
          <text class="menu-item-text">用户管理</text>
        </view>
        <view class="menu-item logout" @click="handleLogout">
          <text class="menu-item-text">退出登录</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

defineProps<{
  title?: string
  showAddBtn?: boolean
  showWeekBtn?: boolean
  showImportBtn?: boolean
  showManageBtn?: boolean
}>()
const emit = defineEmits<{
  add: []
  week: []
  import: []
  manageAddPoints: []
  manageSubtractPoints: []
}>()

const showMenu = ref(false)
const showManageMenu = ref(false)
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

const toggleMenu = () => {
  showMenu.value = !showMenu.value
}

const closeMenu = () => {
  showMenu.value = false
}

const toggleManageMenu = () => {
  showManageMenu.value = !showManageMenu.value
}

const closeManageMenu = () => {
  showManageMenu.value = false
}

const onAddPoints = () => {
  closeManageMenu()
  emit('manageAddPoints')
}

const onSubtractPoints = () => {
  closeManageMenu()
  emit('manageSubtractPoints')
}

const goToProfile = () => {
  closeMenu()
  uni.navigateTo({ url: '/pages/profile/profile' })
}

const switchUser = () => {
  closeMenu()
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    uni.reLaunch({ url: `/pages/login/login?currentUserId=${user.id}` })
  } else {
    uni.reLaunch({ url: '/pages/login/login' })
  }
}

const goToUserManagement = () => {
  closeMenu()
  uni.navigateTo({ url: '/pages/user/user' })
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
.header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 12rpx 0;
}

.header-left {
  display: flex;
  align-items: center;
  gap: 16rpx;
  position: relative;
}

.header-right {
  display: flex;
  align-items: center;
}

.title {
  font-size: 32rpx;
  font-weight: bold;
  color: #4A9B8E;
}

.user-area {
  position: relative;
  width: 64rpx;
  height: 64rpx;
}

.user-avatar {
  width: 64rpx;
  height: 64rpx;
  border-radius: 50%;
  border: 3rpx solid #FFFFFF;
  box-shadow: 0 2rpx 8rpx rgba(0, 0, 0, 0.12);
}

.user-badge {
  position: absolute;
  top: -6rpx;
  right: -6rpx;
  width: 28rpx;
  height: 28rpx;
  background: linear-gradient(135deg, #FFD93D, #FFA500);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid #FFFFFF;
}

.badge-text {
  font-size: 16rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.add-btn {
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
  border-radius: 8rpx;
}

.add-btn-text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.week-btn {
  padding: 8rpx 20rpx;
  background: #FFF3E0;
  border-radius: 8rpx;
}

.week-btn-text {
  font-size: 24rpx;
  color: #E65100;
  font-weight: 500;
}

.import-btn {
  padding: 8rpx 20rpx;
  background: #E3F2FD;
  border-radius: 8rpx;
}

.import-btn-text {
  font-size: 24rpx;
  color: #1976D2;
  font-weight: 500;
}

.manage-btn {
  padding: 8rpx 20rpx;
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
  border-radius: 8rpx;
}

.manage-btn-text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 500;
}

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
  padding-top: 100rpx;
  padding-right: 30rpx;
}

.menu-content {
  width: 380rpx;
  background: #FFFFFF;
  border-radius: 20rpx;
  overflow: hidden;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.2);
}

.menu-header {
  display: flex;
  align-items: center;
  padding: 24rpx;
  background: linear-gradient(135deg, #87CEEB 0%, #5BA4C4 100%);
}

.menu-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 3rpx solid #FFFFFF;
}

.menu-info {
  margin-left: 20rpx;
}

.menu-username {
  font-size: 30rpx;
  font-weight: bold;
  color: #FFFFFF;
  display: block;
}

.menu-role {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.8);
  display: block;
  margin-top: 6rpx;
}

.menu-divider {
  height: 1rpx;
  background: #F0F0F0;
}

.menu-item {
  padding: 24rpx;
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
  font-size: 26rpx;
  color: #333;
}

.menu-item.logout .menu-item-text {
  color: #E05555;
}

.manage-menu-popup {
  position: absolute;
  top: 100%;
  right: 0;
  margin-top: 8rpx;
  background: #FFFFFF;
  border-radius: 12rpx;
  overflow: hidden;
  box-shadow: 0 8rpx 32rpx rgba(0, 0, 0, 0.15);
  z-index: 999;
}

.manage-menu-item {
  padding: 24rpx 40rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.manage-menu-item:active {
  background: #F8F9FA;
}

.manage-menu-text {
  font-size: 26rpx;
  color: #333;
}

.manage-menu-divider {
  height: 1rpx;
  background: #F0F0F0;
}
</style>
