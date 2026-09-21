<template>
  <view class="page">
    <!-- 无家庭：加入表单 -->
    <view v-if="noFamily" class="card">
      <text class="card-title">加入家庭</text>
      <text class="invite-hint">你还没有加入任何家庭。输入家人给你的邀请码加入：</text>
      <view class="join-row">
        <input class="join-input" v-model="joinCode" placeholder="输入6位邀请码" placeholder-class="placeholder" />
        <button class="join-btn" :loading="joining" @click="doJoin">加入</button>
      </view>
    </view>

    <block v-else>
    <!-- 家庭名 -->
    <view class="card">
      <text class="card-title">家庭名</text>
      <view class="name-row">
        <text class="family-name">{{ family?.name || '我的家庭' }}</text>
        <text class="edit-name" @click="renameFamily">改名</text>
      </view>
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
        <text v-if="m.id !== myUserId" class="kick-btn" @click="doKick(m)">移出</text>
      </view>
    </view>

    <view class="leave-wrap">
      <text class="leave-btn" @click="doLeave">退出家庭</text>
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
    </block>
  </view>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onShow } from '@dcloudio/uni-app'
import { getV2Family, renameV2Family, regenInviteCode, joinFamily, leaveFamily, kickMember } from '@/api/family'

interface Member { id: string; username: string; name: string | null; avatar: string | null; role: string }
interface ChildItem { id: string; name: string; gender: string; age: number | null; avatar: string | null }

const family = ref<{ id: string; name: string; inviteCode: string } | null>(null)
const members = ref<Member[]>([])
const children = ref<ChildItem[]>([])
const defaultAvatar = 'https://cdn-icons-png.flaticon.com/512/3135/3135715.png'
const noFamily = ref(false)
const joinCode = ref('')
const joining = ref(false)
const myUserId = ref('')

try {
  myUserId.value = JSON.parse(uni.getStorageSync('user') || '{}').id || ''
} catch (e) { myUserId.value = '' }

const load = async () => {
  try {
    const res: any = await getV2Family()
    family.value = res.data?.family || null
    members.value = res.data?.members || []
    children.value = res.data?.children || []
    noFamily.value = false
  } catch (e: any) {
    // 403 = 未绑定家庭 → 显示加入表单
    if (String(e?.message || e).includes('家庭') || (e?.code ?? '') === 403) {
      noFamily.value = true
    } else {
      console.error('load family failed', e)
    }
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

const doJoin = async () => {
  if (!joinCode.value.trim()) return
  joining.value = true
  try {
    await joinFamily(joinCode.value.trim())
    uni.showToast({ title: '已加入', icon: 'success' })
    joinCode.value = ''
    load()
  } catch (e: any) {
    uni.showToast({ title: e.message || '加入失败', icon: 'none' })
  } finally {
    joining.value = false
  }
}

const doLeave = () => {
  uni.showModal({
    title: '退出家庭',
    content: '退出后将无法查看本家庭的孩子与任务，确定退出吗？',
    success: async (res) => {
      if (!res.confirm) return
      try {
        await leaveFamily()
        uni.showToast({ title: '已退出', icon: 'success' })
        family.value = null; members.value = []; children.value = []
        noFamily.value = true
      } catch (e: any) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    }
  })
}

const doKick = (m: Member) => {
  uni.showModal({
    title: '移出成员',
    content: `确定把「${m.name || m.username}」移出家庭吗？`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await kickMember(m.id)
        uni.showToast({ title: '已移出', icon: 'success' })
        load()
      } catch (e: any) {
        uni.showToast({ title: e.message || '操作失败', icon: 'none' })
      }
    }
  })
}
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
.name-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.family-name {
  font-size: 34rpx;
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
.join-row {
  display: flex;
  gap: 16rpx;
  margin-top: 20rpx;
}
.join-input {
  flex: 1;
  height: 76rpx;
  background: #f0f2f8;
  border-radius: 14rpx;
  padding: 0 24rpx;
  font-size: 30rpx;
}
.join-btn {
  width: 140rpx;
  height: 76rpx;
  line-height: 76rpx;
  background: #4a7cf7;
  color: #fff;
  font-size: 28rpx;
  border-radius: 14rpx;
  padding: 0;
}
.kick-btn {
  margin-left: auto;
  font-size: 26rpx;
  color: #e05050;
  padding: 8rpx 0 8rpx 20rpx;
}
.leave-wrap {
  display: flex;
  justify-content: center;
  padding: 16rpx 0 40rpx;
}
.leave-btn {
  font-size: 28rpx;
  color: #e05050;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
  padding: 10rpx 0;
}
</style>
