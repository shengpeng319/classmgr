<template>
  <view class="container">
    <view class="header">
      <view class="sun"></view>
      <view class="cloud cloud-1"></view>
      <view class="cloud cloud-2"></view>
    </view>

    <view class="login-card">
      <text class="title">小孩课程管理</text>
      <text class="subtitle">请登录您的账户</text>

      <!-- 记住的用户列表 -->
      <view class="remembered-users" v-if="rememberedUsers.length > 0">
        <view class="section-title">最近登录</view>
        <view class="user-list">
          <view 
            class="user-item" 
            :class="{ current: user.id === currentUserId }"
            v-for="user in rememberedUsers" 
            :key="user.id"
            @click="quickLogin(user)"
          >
            <image class="user-avatar" :src="user.avatar || defaultAvatar" mode="aspectFill" />
            <view class="user-info">
              <text class="user-name">{{ user.name || user.username }}</text>
              <text class="user-role">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</text>
            </view>
            <view class="current-badge" v-if="user.id === currentUserId">
              <text class="current-text">当前</text>
            </view>
            <view class="remove-btn" @click.stop="removeRememberedUser(user.id)">
              <text class="remove-text">×</text>
            </view>
          </view>
        </view>
      </view>

      <view class="divider" v-if="rememberedUsers.length > 0">
        <view class="divider-line"></view>
        <text class="divider-text">或使用账号密码登录</text>
        <view class="divider-line"></view>
      </view>

      <view class="form">
        <view class="input-group">
          <text class="label">用户名</text>
          <input 
            class="input" 
            v-model="formData.username" 
            placeholder="请输入用户名"
            placeholder-class="placeholder"
          />
        </view>

        <view class="input-group">
          <text class="label">密码</text>
          <input 
            class="input" 
            v-model="formData.password" 
            type="password"
            placeholder="请输入密码"
            placeholder-class="placeholder"
            @confirm="handleLogin"
          />
        </view>

        <view class="remember-row">
          <view class="checkbox" :class="{ active: rememberMe }" @click="rememberMe = !rememberMe">
            <text class="checkbox-text" v-if="rememberMe">✓</text>
          </view>
          <text class="remember-label" @click="rememberMe = !rememberMe">记住我</text>
        </view>

        <view class="error" v-if="errorMsg">
          <text class="error-text">{{ errorMsg }}</text>
        </view>

        <button class="login-btn" @click="handleLogin" :loading="loading">
          <text class="btn-text">{{ loading ? '登录中...' : '登 录' }}</text>
        </button>
      </view>
    </view>

    <view class="footer">
      <view class="grass"></view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { getDeviceId } from '@/utils/device'

const formData = ref({
  username: '',
  password: ''
})

const loading = ref(false)
const errorMsg = ref('')
const rememberMe = ref(true)
const rememberedUsers = ref<any[]>([])
const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
const currentUserId = ref('')

const loadRememberedUsers = async () => {
  try {
    const deviceId = getDeviceId()
    const res = await uni.request({
      url: `http://192.168.101.50:3000/api/auth/remembered-users/${deviceId}`
    }) as any

    if (res.data.code === 0) {
      rememberedUsers.value = res.data.data || []
    }
  } catch (e) {
    console.error('Failed to load remembered users', e)
  }
}

const quickLogin = async (user: any) => {
  loading.value = true
  errorMsg.value = ''

  try {
    const deviceId = getDeviceId()
    const res = await uni.request({
      url: 'http://192.168.101.50:3000/api/auth/quick-login',
      method: 'POST',
      data: {
        rememberToken: uni.getStorageSync(`rememberToken_${user.id}`) || '',
        deviceId
      }
    }) as any

    if (res.data.code === 0) {
      uni.setStorageSync('token', res.data.data.token)
      uni.setStorageSync('user', JSON.stringify(res.data.data.user))
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/today/today' })
      }, 1000)
    } else {
      errorMsg.value = res.data.message || '快速登录失败，请使用密码登录'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}

const removeRememberedUser = async (userId: string) => {
  try {
    const deviceId = getDeviceId()
    await uni.request({
      url: `http://192.168.101.50:3000/api/auth/remembered-user/${userId}?deviceId=${deviceId}`,
      method: 'DELETE'
    }) as any
    
    rememberedUsers.value = rememberedUsers.value.filter(u => u.id !== userId)
    uni.removeStorageSync(`rememberToken_${userId}`)
  } catch (e) {
    console.error('Failed to remove remembered user', e)
  }
}

const handleLogin = async () => {
  if (!formData.value.username || !formData.value.password) {
    errorMsg.value = '请输入用户名和密码'
    return
  }

  loading.value = true
  errorMsg.value = ''

  try {
    const deviceId = getDeviceId()
    const res = await uni.request({
      url: 'http://192.168.101.50:3000/api/auth/login',
      method: 'POST',
      data: {
        ...formData.value,
        deviceId,
        remember: rememberMe.value
      }
    }) as any

    if (res.data.code === 0) {
      uni.setStorageSync('token', res.data.data.token)
      uni.setStorageSync('user', JSON.stringify(res.data.data.user))
      
      if (rememberMe.value && res.data.data.rememberToken) {
        uni.setStorageSync(`rememberToken_${res.data.data.user.id}`, res.data.data.rememberToken)
      }
      
      uni.showToast({ title: '登录成功', icon: 'success' })
      setTimeout(() => {
        uni.reLaunch({ url: '/pages/today/today' })
      }, 1000)
    } else {
      errorMsg.value = res.data.message || '登录失败'
    }
  } catch (e: any) {
    errorMsg.value = e.message || '网络错误'
  } finally {
    loading.value = false
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  if (pages.length > 0) {
    const currentPage = pages[pages.length - 1]
    const options = (currentPage as any).options || {}
    if (options.currentUserId) {
      currentUserId.value = options.currentUserId
    }
  }
  loadRememberedUsers()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #87CEEB 0%, #B0E0E6 40%, #E0F7FA 70%, #FFF8E7 100%);
  position: relative;
  overflow: hidden;
}

.header {
  position: relative;
  height: 300rpx;
}

.sun {
  position: absolute;
  width: 100rpx;
  height: 100rpx;
  background: radial-gradient(circle, #FFD93D 0%, #FFA500 100%);
  border-radius: 50%;
  top: 60rpx;
  right: 80rpx;
  box-shadow: 0 0 60rpx #FFD93D, 0 0 100rpx rgba(255, 217, 61, 0.5);
}

.cloud {
  position: absolute;
  background: #FFFFFF;
  border-radius: 100rpx;
  opacity: 0.9;
}

.cloud-1 {
  width: 160rpx;
  height: 50rpx;
  top: 120rpx;
  left: 40rpx;
}

.cloud-1::before {
  content: '';
  position: absolute;
  width: 80rpx;
  height: 80rpx;
  background: #FFFFFF;
  border-radius: 50%;
  top: -40rpx;
  left: 20rpx;
}

.cloud-2 {
  width: 120rpx;
  height: 40rpx;
  top: 180rpx;
  left: 200rpx;
}

.cloud-2::before {
  content: '';
  position: absolute;
  width: 60rpx;
  height: 60rpx;
  background: #FFFFFF;
  border-radius: 50%;
  top: -30rpx;
  left: 15rpx;
}

.login-card {
  position: relative;
  margin: 0 40rpx;
  padding: 50rpx 40rpx;
  background: #FFFFFF;
  border-radius: 40rpx;
  box-shadow: 
    0 20rpx 40rpx rgba(0, 0, 0, 0.1),
    0 8rpx 16rpx rgba(0, 0, 0, 0.05),
    inset 0 2rpx 4rpx rgba(255, 255, 255, 0.8);
}

.title {
  font-size: 44rpx;
  font-weight: bold;
  color: #2C5F2D;
  text-align: center;
  display: block;
  margin-bottom: 12rpx;
}

.subtitle {
  font-size: 28rpx;
  color: #888;
  text-align: center;
  display: block;
  margin-bottom: 30rpx;
}

.remembered-users {
  margin-bottom: 30rpx;
}

.section-title {
  font-size: 24rpx;
  color: #999;
  margin-bottom: 20rpx;
  text-align: center;
}

.user-list {
  display: flex;
  flex-direction: column;
  gap: 16rpx;
}

.user-item {
  display: flex;
  align-items: center;
  padding: 20rpx;
  background: #F8F9FA;
  border-radius: 16rpx;
  transition: all 0.2s;
}

.user-item.current {
  background: #E3F2FD;
  border: 2rpx solid #87CEEB;
}

.user-item:active {
  background: #F0F0F0;
  transform: scale(0.98);
}

.user-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  margin-right: 20rpx;
}

.user-info {
  flex: 1;
}

.user-name {
  font-size: 28rpx;
  color: #333;
  font-weight: 500;
  display: block;
}

.user-role {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-top: 4rpx;
}

.current-badge {
  background: linear-gradient(135deg, #87CEEB, #5BA4C4);
  padding: 6rpx 16rpx;
  border-radius: 20rpx;
  margin-right: 16rpx;
}

.current-text {
  font-size: 22rpx;
  color: #FFFFFF;
  font-weight: 500;
}

.remove-btn {
  width: 48rpx;
  height: 48rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border-radius: 50%;
  background: #E0E0E0;
}

.remove-text {
  font-size: 32rpx;
  color: #666;
  line-height: 1;
}

.divider {
  display: flex;
  align-items: center;
  margin: 30rpx 0;
}

.divider-line {
  flex: 1;
  height: 1rpx;
  background: #E0E0E0;
}

.divider-text {
  padding: 0 20rpx;
  font-size: 24rpx;
  color: #999;
}

.form {
  margin-top: 10rpx;
}

.input-group {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #4A7C59;
  display: block;
  margin-bottom: 16rpx;
  font-weight: 500;
}

.input {
  height: 88rpx;
  background: #F8F9FA;
  border-radius: 20rpx;
  padding: 0 30rpx;
  font-size: 30rpx;
  border: 2rpx solid transparent;
  transition: all 0.3s ease;
}

.input:focus {
  border-color: #87CEEB;
  background: #FFFFFF;
}

.placeholder {
  color: #BDBDBD;
}

.remember-row {
  display: flex;
  align-items: center;
  margin-bottom: 30rpx;
}

.checkbox {
  width: 40rpx;
  height: 40rpx;
  border-radius: 8rpx;
  border: 2rpx solid #DDD;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12rpx;
}

.checkbox.active {
  background: #87CEEB;
  border-color: #87CEEB;
}

.checkbox-text {
  color: #FFF;
  font-size: 24rpx;
  font-weight: bold;
}

.remember-label {
  font-size: 26rpx;
  color: #666;
}

.error {
  background: #FFF3F3;
  border-radius: 16rpx;
  padding: 20rpx;
  margin-bottom: 30rpx;
}

.error-text {
  color: #E05555;
  font-size: 26rpx;
}

.login-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #87CEEB 0%, #5BA4C4 100%);
  border-radius: 48rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(135, 206, 235, 0.4);
}

.login-btn:active {
  transform: scale(0.98);
  box-shadow: 0 4rpx 10rpx rgba(135, 206, 235, 0.4);
}

.btn-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
}

.footer {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  height: 80rpx;
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
</style>
