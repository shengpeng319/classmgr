<template>
  <view class="page">
    <view class="header">
      <text class="family-name">{{ family?.name || '我的家庭' }}</text>
      <text class="edit-name" @click="renameFamily">改名</text>
    </view>

    <!-- 邀请码卡片 -->
    <view class="card invite-card">
      <text class="card-title">邀请家长加入</text>
      <view class="invite-row">
        <text class="invite-code">{{ family?.inviteCode || '——————' }}</text>
        <text class="copy-btn" @click="copyCode">复制</text>
      </view>
      <text class="invite-hint">对方注册时填写此邀请码，即加入本家庭</text>
      <text class="regen-link" @click="regenCode">换一个邀请码</text>
    </view>

    <!-- 家长成员 -->
    <view class="card">
      <text class="card-title">家长（{{ members.length }}）</text>
      <view v-for="m in members" :key="m.id" class="member-row">
        <image class="member-avatar" :src="m.avatar || defaultAvatar" mode="aspectFill" />
        <view class="member-info">
          <text class="member-name">{{ m.name || m.username }}</text>
          <text class="member-meta">{{ m.role === 'admin' ? '管理员' : '家长' }} · {{ m.username }}</text>
        </view>
      </view>
    </view>

    <!-- 孩子 -->
    <view class="card">
      <view class="card-title-row">
        <text class="card-title">孩子（{{ children.length }}）</text>
        <text class="manage-link" @click="goChildren">去管理 ›</text>
      </view>
      <view v-for="c in children" :key="c.id" class="member-row">
        <image class="member-avatar" :src="c.avatar || defaultAvatar" mode="aspectFill" />
        <view class="member-info">
          <text class="member-name">{{ c.name }}</text>
          <text class="member-meta">{{ c.gender === 'female' ? '女' : '男' }} · {{ c.age ?? '—' }}岁</text>
        </view>
      </view>
      <text v-if="children.length === 0" class="empty-text">还没有添加孩子</text>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getV2Family, renameV2Family, regenInviteCode } from '@/api/family'

interface Member { id: string; username: string; name: string | null; avatar: string | null; role: string }
interface ChildItem { id: string; name: string; gender: string; age: number | null; avatar: string | null }

const family = ref<{ id: string; name: string; inviteCode: string } | null>(null)
const members = ref<Member[]>([])
const children = ref<ChildItem[]>([])
const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'

const load = async () => {
  try {
    const res: any = await getV2Family()
    family.value = res.data?.family || null
    members.value = res.data?.members || []
    children.value = res.data?.children || []
  } catch (e) {
    console.error('load family failed', e)
  }
}
onShow(() => load())

const renameFamily = () => {
  uni.showModal({
    title: '修改家庭名',
    editable: true,
    placeholderText: '输入新的家庭名',
    success: async (res) => {
      if (!res.confirm || !res.content?.trim()) return
      try {
        await renameV2Family(res.content.trim())
        uni.showToast({ title: '已保存', icon: 'success' })
        load()
      } catch (e: any) {
        uni.showToast({ title: e.message || '修改失败', icon: 'none' })
      }
    }
  })
}

const copyCode = () => {
  if (!family.value?.inviteCode) return
  uni.setClipboardData({
    data: family.value.inviteCode,
    success: () => uni.showToast({ title: '已复制', icon: 'success' })
  })
}

const regenCode = () => {
  uni.showModal({
    title: '换邀请码',
    content: '旧邀请码将立即失效，确定更换吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await regenInviteCode()
        uni.showToast({ title: '已更换', icon: 'success' })
        load()
      } catch (e: any) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    }
  })
}

const goChildren = () => uni.navigateTo({ url: '/pages/children/children' })
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  padding: 24rpx 32rpx 60rpx;
  box-sizing: border-box;
}
.nav-back {
  padding: 8rpx 0 20rpx;
}
.nav-back-text {
  font-size: 30rpx;
  color: #4a7cf7;
}
.header {
  display: flex;
  align-items: center;
  gap: 24rpx;
  margin-bottom: 28rpx;
}
.family-name {
  font-size: 40rpx;
  font-weight: 700;
  color: #222;
}
.edit-name {
  font-size: 26rpx;
  color: #4a7cf7;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 28rpx;
  margin-bottom: 24rpx;
}
.card-title-row {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 16rpx;
}
.card-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 16rpx;
  display: block;
}
.card-title-row .card-title {
  margin-bottom: 0;
}
.manage-link {
  font-size: 26rpx;
  color: #4a7cf7;
}
.invite-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  background: #f0f2f8;
  border-radius: 14rpx;
  padding: 22rpx 26rpx;
}
.invite-code {
  font-size: 44rpx;
  font-weight: 700;
  letter-spacing: 10rpx;
  color: #222;
}
.copy-btn {
  font-size: 28rpx;
  color: #4a7cf7;
}
.invite-hint {
  display: block;
  font-size: 24rpx;
  color: #999;
  margin-top: 16rpx;
}
.regen-link {
  display: block;
  font-size: 24rpx;
  color: #4a7cf7;
  margin-top: 12rpx;
}
.member-row {
  display: flex;
  align-items: center;
  padding: 14rpx 0;
}
.member-avatar {
  width: 76rpx;
  height: 76rpx;
  border-radius: 50%;
  background: #eee;
}
.member-info {
  margin-left: 22rpx;
  display: flex;
  flex-direction: column;
  gap: 4rpx;
}
.member-name {
  font-size: 29rpx;
  font-weight: 600;
  color: #333;
}
.member-meta {
  font-size: 24rpx;
  color: #999;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
  padding: 10rpx 0;
}
</style>
