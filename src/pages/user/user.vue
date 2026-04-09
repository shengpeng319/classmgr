<template>
  <view class="container">
    <view class="header">
      <text class="title">用户管理</text>
      <text class="subtitle">管理系统用户</text>
    </view>

    <view class="content">
      <view class="user-list" v-if="users.length > 0">
        <view class="user-item" v-for="user in users" :key="user.id">
          <view class="user-info">
            <view class="avatar" :class="user.role">
              <text class="avatar-text">{{ user.username.charAt(0).toUpperCase() }}</text>
            </view>
            <view class="info">
              <text class="username">{{ user.username }}</text>
              <text class="role-badge" :class="user.role">{{ user.role === 'admin' ? '管理员' : '普通用户' }}</text>
            </view>
          </view>
          <view class="actions">
            <button class="action-btn edit" @click="editUser(user)">
              <text class="btn-text">编辑</text>
            </button>
            <button class="action-btn delete" @click="deleteUser(user)" v-if="currentUserId !== user.id">
              <text class="btn-text">删除</text>
            </button>
          </view>
        </view>
      </view>

      <view class="empty-state" v-else>
        <text class="empty-text">暂无用户</text>
      </view>

      <button class="add-btn" @click="showAddModal = true">
        <text class="add-text">+ 添加用户</text>
      </button>
    </view>

    <view class="modal" v-if="showAddModal || showEditModal">
      <view class="modal-mask" @click="closeModal"></view>
      <view class="modal-content">
        <text class="modal-title">{{ showEditModal ? '编辑用户' : '添加用户' }}</text>
        
        <view class="form-item">
          <text class="label">用户名</text>
          <input class="input" v-model="formData.username" placeholder="请输入用户名" :disabled="showEditModal" />
        </view>

        <view class="form-item" v-if="!showEditModal">
          <text class="label">密码</text>
          <input class="input" v-model="formData.password" type="password" placeholder="请输入密码" />
        </view>

        <view class="form-item" v-if="showEditModal">
          <text class="label">新密码（留空不修改）</text>
          <input class="input" v-model="formData.password" type="password" placeholder="请输入新密码" />
        </view>

        <view class="form-item">
          <text class="label">角色</text>
          <view class="role-select">
            <view class="role-option" :class="{ active: formData.role === 'user' }" @click="formData.role = 'user'">
              <text class="option-text">普通用户</text>
            </view>
            <view class="role-option" :class="{ active: formData.role === 'admin' }" @click="formData.role = 'admin'">
              <text class="option-text">管理员</text>
            </view>
          </view>
        </view>

        <view class="modal-actions">
          <button class="cancel-btn" @click="closeModal">
            <text class="btn-text">取消</text>
          </button>
          <button class="confirm-btn" @click="handleSubmit">
            <text class="btn-text">确定</text>
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'

interface User {
  id: string
  username: string
  role: string
  createdAt: string
}

const users = ref<User[]>([])
const currentUserId = ref('')
const showAddModal = ref(false)
const showEditModal = ref(false)
const formData = ref({
  id: '',
  username: '',
  password: '',
  role: 'user'
})

const loadUsers = async () => {
  try {
    const token = uni.getStorageSync('token')
    const res = await uni.request({
      url: 'http://192.168.101.50:3000/api/classmgr/users',
      method: 'GET',
      header: { Authorization: `Bearer ${token}` }
    }) as any

    if (res.data.code === 0) {
      users.value = res.data.data
    }
  } catch (e) {
    console.error('Failed to load users', e)
  }
}

const editUser = (user: User) => {
  formData.value = {
    id: user.id,
    username: user.username,
    password: '',
    role: user.role
  }
  showEditModal.value = true
}

const deleteUser = async (user: User) => {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除用户 "${user.username}" 吗？`,
    success: async (res) => {
      if (res.confirm) {
        try {
          const token = uni.getStorageSync('token')
          const result = await uni.request({
            url: `http://192.168.101.50:3000/api/classmgr/users/${user.id}`,
            method: 'DELETE',
            header: { Authorization: `Bearer ${token}` }
          }) as any

          if (result.data.code === 0) {
            uni.showToast({ title: '删除成功', icon: 'success' })
            loadUsers()
          } else {
            uni.showToast({ title: result.data.message, icon: 'none' })
          }
        } catch (e) {
          uni.showToast({ title: '删除失败', icon: 'none' })
        }
      }
    }
  })
}

const closeModal = () => {
  showAddModal.value = false
  showEditModal.value = false
  formData.value = { id: '', username: '', password: '', role: 'user' }
}

const handleSubmit = async () => {
  if (!formData.value.username || (!formData.value.password && !showEditModal.value)) {
    uni.showToast({ title: '请填写完整信息', icon: 'none' })
    return
  }

  try {
    const token = uni.getStorageSync('token')
    const url = showEditModal.value 
      ? `http://192.168.101.50:3000/api/classmgr/users/${formData.value.id}`
      : 'http://192.168.101.50:3000/api/classmgr/users'
    const method = showEditModal.value ? 'PUT' : 'POST'
    
    const data: any = { role: formData.value.role }
    if (formData.value.password) {
      data.password = formData.value.password
    }
    if (!showEditModal.value) {
      data.username = formData.value.username
      data.password = formData.value.password
    }

    const res = await uni.request({
      url,
      method,
      data,
      header: { 
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json'
      }
    }) as any

    if (res.data.code === 0) {
      uni.showToast({ title: showEditModal.value ? '修改成功' : '添加成功', icon: 'success' })
      closeModal()
      loadUsers()
    } else {
      uni.showToast({ title: res.data.message, icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

onMounted(() => {
  const userStr = uni.getStorageSync('user')
  if (userStr) {
    const user = JSON.parse(userStr)
    currentUserId.value = user.id
  }
  loadUsers()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #E3F2FD 0%, #F0F8FF 100%);
  padding: 40rpx;
}

.header {
  text-align: center;
  margin-bottom: 40rpx;
}

.title {
  font-size: 40rpx;
  font-weight: bold;
  color: #5BA4C4;
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
  padding: 30rpx;
  box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06);
}

.user-list {
  margin-bottom: 30rpx;
}

.user-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 24rpx 0;
  border-bottom: 1rpx solid #F0F0F0;
}

.user-item:last-child {
  border-bottom: none;
}

.user-info {
  display: flex;
  align-items: center;
  gap: 20rpx;
}

.avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.avatar.admin {
  background: linear-gradient(135deg, #FFD93D, #FFA500);
}

.avatar.user {
  background: linear-gradient(135deg, #A8D8EA, #7EC8E3);
}

.avatar-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.info {
  display: flex;
  flex-direction: column;
  gap: 8rpx;
}

.username {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}

.role-badge {
  font-size: 22rpx;
  padding: 4rpx 16rpx;
  border-radius: 20rpx;
  width: fit-content;
}

.role-badge.admin {
  background: #FFF3E0;
  color: #E88D00;
}

.role-badge.user {
  background: #E3F2FD;
  color: #5BA4C4;
}

.actions {
  display: flex;
  gap: 16rpx;
}

.action-btn {
  padding: 12rpx 24rpx;
  border-radius: 16rpx;
  font-size: 24rpx;
  border: none;
}

.action-btn.edit {
  background: #E3F2FD;
  color: #5BA4C4;
}

.action-btn.delete {
  background: #FFE5E5;
  color: #E05555;
}

.empty-state {
  text-align: center;
  padding: 60rpx 0;
}

.empty-text {
  font-size: 30rpx;
  color: #AAA;
}

.add-btn {
  width: 100%;
  height: 96rpx;
  background: linear-gradient(135deg, #87CEEB 0%, #5BA4C4 100%);
  border-radius: 48rpx;
  border: none;
  box-shadow: 0 8rpx 20rpx rgba(135, 206, 235, 0.4);
}

.add-text {
  color: #FFFFFF;
  font-size: 32rpx;
  font-weight: 600;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.modal-mask {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
}

.modal-content {
  position: relative;
  width: 600rpx;
  background: #FFFFFF;
  border-radius: 32rpx;
  padding: 50rpx;
  box-shadow: 0 20rpx 60rpx rgba(0, 0, 0, 0.2);
}

.modal-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333;
  display: block;
  text-align: center;
  margin-bottom: 40rpx;
}

.form-item {
  margin-bottom: 30rpx;
}

.label {
  font-size: 28rpx;
  color: #666;
  display: block;
  margin-bottom: 16rpx;
}

.input {
  height: 80rpx;
  background: #F8F9FA;
  border-radius: 20rpx;
  padding: 0 30rpx;
  font-size: 28rpx;
}

.role-select {
  display: flex;
  gap: 20rpx;
}

.role-option {
  flex: 1;
  height: 80rpx;
  background: #F8F9FA;
  border-radius: 20rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  border: 2rpx solid transparent;
}

.role-option.active {
  background: #E3F2FD;
  border-color: #5BA4C4;
}

.option-text {
  font-size: 28rpx;
  color: #666;
}

.role-option.active .option-text {
  color: #5BA4C4;
  font-weight: 500;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
  margin-top: 40rpx;
}

.cancel-btn,
.confirm-btn {
  flex: 1;
  height: 88rpx;
  border-radius: 44rpx;
  border: none;
  font-size: 30rpx;
}

.cancel-btn {
  background: #F0F0F0;
  color: #666;
}

.confirm-btn {
  background: linear-gradient(135deg, #87CEEB 0%, #5BA4C4 100%);
  color: #FFFFFF;
}
</style>
