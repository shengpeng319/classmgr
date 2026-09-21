<template>
  <view class="container">
    <view class="header">
      <view class="sun"></view>
      <view class="cloud cloud-1"></view>
      <view class="cloud cloud-2"></view>
    </view>

    <view class="content">
      <view class="avatar-section">
        <view class="avatar-wrapper" @click="changeAvatar">
          <image class="avatar" :src="avatarUrl" mode="aspectFill" />
          <view class="avatar-mask">
            <text class="mask-text">更换</text>
          </view>
        </view>
        <text class="avatar-hint">点击更换头像</text>
      </view>

      <view class="form">
        <view class="form-item">
          <text class="label">姓名</text>
          <input class="input" v-model="formData.name" placeholder="请输入姓名" />
        </view>

        <view class="form-item">
          <text class="label">性别</text>
          <view class="radio-group">
            <view class="radio-option" :class="{ active: formData.gender === 'male' }" @click="formData.gender = 'male'">
              <text class="radio-text">男</text>
            </view>
            <view class="radio-option" :class="{ active: formData.gender === 'female' }" @click="formData.gender = 'female'">
              <text class="radio-text">女</text>
            </view>
          </view>
        </view>

        <view class="form-item">
          <text class="label">年龄</text>
          <input class="input" v-model="formData.age" type="number" placeholder="请输入年龄" />
        </view>

        <view class="form-item">
          <text class="label">手机号</text>
          <input class="input" v-model="formData.phone" type="number" placeholder="请输入手机号" />
        </view>

        <button class="save-btn" @click="handleSave" :loading="saving">
          <text class="btn-text">保存修改</text>
        </button>

        <view class="children-section">
          <view class="children-header">
            <text class="section-title">我的孩子</text>
            <text class="add-child" @click="handleAddChild">＋ 添加</text>
          </view>
          <view v-if="children.length === 0" class="children-empty">
            <text class="empty-text">还没有添加孩子</text>
          </view>
          <view v-for="child in children" :key="child.id" class="child-row">
            <text class="child-name">{{ child.name }}</text>
            <text class="child-points">{{ child.points }} 积分</text>
          </view>
        </view>

        <button class="logout-btn" @click="handleLogout">
          <text class="btn-text">退出登录</text>
        </button>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { request } from '@/utils/request'
import { getV2Children, createV2Child } from '@/api/family'

const children = ref<{ id: string; name: string; points: number }[]>([])

const loadChildren = async () => {
  try {
    const res: any = await getV2Children()
    children.value = res.data || []
  } catch (e) {
    console.error('load children failed', e)
  }
}

const handleAddChild = () => {
  uni.showModal({
    title: '添加孩子',
    editable: true,
    placeholderText: '请输入孩子姓名',
    success: async (res) => {
      if (!res.confirm) return
      const name = (res.content || '').trim()
      if (!name) {
        uni.showToast({ title: '名字不能为空', icon: 'none' })
        return
      }
      try {
        await createV2Child({ name })
        uni.showToast({ title: '已添加', icon: 'success' })
        loadChildren()
      } catch (e: any) {
        uni.showToast({ title: e.message || '添加失败', icon: 'none' })
      }
    }
  })
}

const formData = ref({
  name: '',
  gender: 'male',
  age: '',
  phone: ''
})

const avatarUrl = ref('')
const saving = ref(false)

const defaultAvatars = [
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
  'https://cdn-icons-png.flaticon.com/512/699/699730.png'
]

const loadProfile = () => {
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    formData.value = {
      name: user.name || '',
      gender: user.gender || 'male',
      age: user.age || '',
      phone: user.phone || ''
    }
    if (user.avatar) {
      if (user.avatar.startsWith('data:image') || user.avatar.startsWith('http')) {
        avatarUrl.value = user.avatar
      } else {
        avatarUrl.value = user.avatar
      }
    } else {
      avatarUrl.value = defaultAvatars[0]
    }
  } else {
    avatarUrl.value = defaultAvatars[0]
  }
}

const loadProfileFromServer = async () => {
  try {
    const res: any = await request({ url: '/profile' })

    if (res.code === 0) {
      const serverUser = res.data
      formData.value = {
        name: serverUser.name || '',
        gender: serverUser.gender || 'male',
        age: serverUser.age || '',
        phone: serverUser.phone || ''
      }
      
      if (serverUser.avatar) {
        if (serverUser.avatar.startsWith('data:image') || serverUser.avatar.startsWith('http')) {
          avatarUrl.value = serverUser.avatar
        } else {
          avatarUrl.value = serverUser.avatar
        }
      }
      
      const userStr = uni.getStorageSync('user')
      if (userStr) {
        const localUser = JSON.parse(userStr)
        const mergedUser = { ...localUser, ...serverUser }
        uni.setStorageSync('user', JSON.stringify(mergedUser))
      }
    }
  } catch (e) {
    console.error('Failed to load profile from server', e)
  }
}

const changeAvatar = () => {
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择', '使用默认头像'],
    success: (res) => {
      if (res.tapIndex === 2) {
        avatarUrl.value = defaultAvatars[Math.floor(Math.random() * defaultAvatars.length)]
      } else {
        uni.chooseImage({
          sourceType: res.tapIndex === 0 ? ['camera'] : ['album'],
          count: 1,
          success: async (res) => {
            const tempFilePath = res.tempFilePaths[0]
            
            try {
              // Try to compress image first on native platforms
              let compressedPath = tempFilePath
              
              // @ts-ignore - compressImage may not exist on all platforms
              if (uni.compressImage) {
                try {
                  const compressRes = await new Promise((resolve, reject) => {
                    // @ts-ignore
                    uni.compressImage({
                      src: tempFilePath,
                      quality: 50,
                      success: resolve,
                      fail: reject
                    })
                  })
                  if (compressRes.tempFilePath) {
                    compressedPath = compressRes.tempFilePath
                  }
                } catch (e) {
                  console.log('Compress failed, using original')
                }
              }
              
              const base64 = await fileToBase64(compressedPath)
              avatarUrl.value = base64
              uni.showToast({ title: '头像已选择', icon: 'success' })
            } catch (e) {
              console.error('Failed to convert to base64', e)
              // Fallback to original path if compression/conversion fails
              avatarUrl.value = tempFilePath
            }
          },
          fail: (e) => {
            console.error('Choose image failed', e)
            uni.showToast({ title: '选择失败', icon: 'none' })
          }
        })
      }
    }
  })
}

const fileToBase64 = (filePath: string): Promise<string> => {
  return new Promise((resolve, reject) => {
    // #ifdef H5
    // For H5 with blob URLs or data URLs
    if (filePath.startsWith('blob:') || filePath.startsWith('data:')) {
      fetch(filePath)
        .then(resp => resp.blob())
        .then(blob => {
          compressImage(blob).then(resolve).catch(reject)
        })
        .catch(reject)
      return
    }
    // #endif

    // For native platforms / mp-weixin, use uni API and compress
    const fs = uni.getFileSystemManager()
    fs.readFile({
      filePath,
      encoding: 'base64',
      success: (res: any) => {
        const ext = filePath.split('.').pop() || 'jpg'
        resolve(`data:image/${ext};base64,${res.data}`)
      },
      fail: reject
    })
  })
}

// #ifdef H5
// H5 端使用 canvas/FileReader 压缩；小程序端走上方 uni.compressImage 路径
const compressImage = (blob: Blob): Promise<string> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onloadend = () => {
      const img = new Image()
      img.onload = () => {
        const canvas = document.createElement('canvas')
        const ctx = canvas.getContext('2d')!
        
        // Resize to max 200x200
        const maxSize = 200
        let width = img.width
        let height = img.height
        if (width > height) {
          if (width > maxSize) {
            height *= maxSize / width
            width = maxSize
          }
        } else {
          if (height > maxSize) {
            width *= maxSize / height
            height = maxSize
          }
        }
        
        canvas.width = width
        canvas.height = height
        ctx.drawImage(img, 0, 0, width, height)
        
        resolve(canvas.toDataURL('image/jpeg', 0.7))
      }
      img.onerror = reject
      img.src = reader.result as string
    }
    reader.onerror = reject
    reader.readAsDataURL(blob)
  })
}
// #endif

const handleSave = async () => {
  if (!formData.value.name) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }

  saving.value = true

  try {
    // Upload avatar first if it's base64
    let finalAvatar = avatarUrl.value
    if (avatarUrl.value && avatarUrl.value.startsWith('data:image')) {
      try {
        const uploadRes: any = await request({
          url: '/profile/avatar',
          method: 'POST',
          data: { avatar: avatarUrl.value }
        })
        
        if (uploadRes.code === 0) {
          finalAvatar = uploadRes.data.avatar
        }
      } catch (e) {
        console.error('Avatar upload failed, using base64 direct', e)
      }
    }

    const res: any = await request({
      url: '/profile',
      method: 'PUT',
      data: {
        name: formData.value.name,
        gender: formData.value.gender,
        age: parseInt(formData.value.age) || 0,
        phone: formData.value.phone,
        avatar: finalAvatar
      }
    })

    if (res.code === 0) {
      const userStr = uni.getStorageSync('user')
      const user = userStr ? JSON.parse(userStr) : {}
      const updatedUser = { ...user, ...formData.value, avatar: finalAvatar }
      uni.setStorageSync('user', JSON.stringify(updatedUser))
      avatarUrl.value = finalAvatar
      uni.showToast({ title: '保存成功', icon: 'success' })
    } else {
      uni.showToast({ title: res.message || '保存失败', icon: 'none' })
    }
  } catch (e: any) {
    console.error('Save profile error:', e)
    uni.showToast({ title: e.message || '网络错误', icon: 'none' })
  } finally {
    saving.value = false
  }
}

const handleLogout = () => {
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
  loadProfile()
  loadProfileFromServer()
  loadChildren()
})
</script>

<style scoped>
.children-section {
  margin-top: 24rpx;
  padding: 24rpx;
  background: #fff;
  border-radius: 16rpx;
}
.children-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
}
.section-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.add-child {
  font-size: 28rpx;
  color: #4a90d9;
}
.children-empty {
  padding: 20rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
}
.child-row {
  display: flex;
  justify-content: space-between;
  padding: 16rpx 0;
}
.child-name {
  font-size: 28rpx;
  color: #333;
}
.child-points {
  font-size: 26rpx;
  color: #f5a623;
}
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #87CEEB 0%, #B0E0E6 40%, #E0F7FA 70%, #FFF8E7 100%);
  position: relative;
  overflow: hidden;
}

.header {
  position: relative;
  height: 250rpx;
}

.sun {
  position: absolute;
  width: 80rpx;
  height: 80rpx;
  background: radial-gradient(circle, #FFD93D 0%, #FFA500 100%);
  border-radius: 50%;
  top: 40rpx;
  right: 60rpx;
  box-shadow: 0 0 40rpx #FFD93D;
}

.cloud {
  position: absolute;
  background: #FFFFFF;
  border-radius: 100rpx;
  opacity: 0.9;
}

.cloud-1 {
  width: 120rpx;
  height: 40rpx;
  top: 80rpx;
  left: 30rpx;
}

.cloud-2 {
  width: 100rpx;
  height: 30rpx;
  top: 140rpx;
  left: 180rpx;
}

.content {
  position: relative;
  margin: -80rpx 30rpx 0;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 50rpx 40rpx;
  box-shadow: 0 12rpx 40rpx rgba(0, 0, 0, 0.1);
}

.avatar-section {
  text-align: center;
  margin-bottom: 50rpx;
}

.avatar-wrapper {
  width: 180rpx;
  height: 180rpx;
  margin: 0 auto 20rpx;
  border-radius: 50%;
  overflow: hidden;
  position: relative;
}

.avatar {
  width: 100%;
  height: 100%;
}

.avatar-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  opacity: 0;
  transition: opacity 0.3s;
}

.avatar-wrapper:active .avatar-mask {
  opacity: 1;
}

.mask-text {
  color: #FFFFFF;
  font-size: 28rpx;
}

.avatar-hint {
  font-size: 24rpx;
  color: #999;
}

.form {
  margin-top: 20rpx;
}

.form-item {
  margin-bottom: 36rpx;
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
}

.radio-group {
  display: flex;
  gap: 30rpx;
}

.radio-option {
  flex: 1;
  height: 88rpx;
  background: #F8F9FA;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
  transition: all 0.3s;
}

.radio-option.active {
  background: #E3F2FD;
  border-color: #5BA4C4;
}

.radio-text {
  font-size: 28rpx;
  color: #666;
}

.radio-option.active .radio-text {
  color: #5BA4C4;
  font-weight: 500;
}

.save-btn {
  height: 96rpx;
  background: linear-gradient(135deg, #87CEEB 0%, #5BA4C4 100%);
  border-radius: 48rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(135, 206, 235, 0.4);
  margin-top: 40rpx;
}

.save-btn:active {
  transform: scale(0.98);
}

.logout-btn {
  height: 88rpx;
  background: #F0F0F0;
  border-radius: 44rpx;
  border: none;
  margin-top: 24rpx;
}

.btn-text {
  color: #FFFFFF;
  font-size: 30rpx;
  font-weight: 600;
}

.logout-btn .btn-text {
  color: #666;
}
</style>
