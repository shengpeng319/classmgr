<template>
  <view v-if="visible" class="modal-mask" @click="close">
    <view class="modal-box" @click.stop>
      <view class="modal-header">
        <text class="modal-title">孩子信息</text>
        <text class="modal-close" @click="close">✕</text>
      </view>

      <scroll-view scroll-y class="modal-body">
        <view v-if="children.length === 0" class="empty-box">
          <text class="empty-text">还没有添加孩子</text>
        </view>

        <view v-for="child in children" :key="child.id" class="child-card">
          <image class="child-avatar" :src="child.avatar || defaultAvatar" mode="aspectFill" />
          <view class="child-info">
            <text class="child-name">{{ child.name }}</text>
            <text class="child-meta">{{ child.gender === 'female' ? '女' : '男' }} · {{ child.age ?? '—' }}岁</text>
          </view>
          <view class="child-actions">
            <text class="action-edit" @click="startEdit(child)">编辑</text>
            <text class="action-delete" @click="removeChild(child)">删除</text>
          </view>
        </view>
      </scroll-view>

      <!-- 表单：添加或编辑 -->
      <view class="form-box">
        <text class="form-title">{{ editingId ? '编辑孩子' : '添加孩子' }}</text>
        <view class="avatar-picker">
          <image
            v-for="(av, i) in presetAvatars" :key="i"
            class="preset-avatar" :class="{ active: form.avatar === av }"
            :src="av" mode="aspectFill" @click="form.avatar = av"
          />
        </view>
        <input v-model="form.name" class="form-input" placeholder="姓名" />
        <view class="form-row">
          <picker class="form-picker" :range="['男', '女']" @change="form.gender = $event.detail.value === '1' ? 'female' : 'male'">
            <text class="picker-text">性别：{{ form.gender === 'female' ? '女' : '男' }}</text>
          </picker>
          <input v-model="form.age" class="form-input age-input" type="number" placeholder="年龄" />
        </view>
        <button class="submit-btn" :loading="saving" @click="submit">
          {{ editingId ? '保存修改' : '添加' }}
        </button>
        <text v-if="editingId" class="cancel-edit" @click="resetForm">取消编辑</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { getV2Children, createV2Child, updateV2Child, deleteV2Child } from '@/api/family'

const props = defineProps<{ visible: boolean }>()
const emit = defineEmits<{ (e: 'close'): void }>()

interface ChildItem { id: string; name: string; gender: string; age: number | null; avatar: string | null }
const children = ref<ChildItem[]>([])
const editingId = ref('')
const saving = ref(false)
const form = ref({ name: '', gender: 'male', age: '', avatar: '' })

const presetAvatars = [
  'https://cdn-icons-png.flaticon.com/512/3135/3135715.png',
  'https://cdn-icons-png.flaticon.com/512/4140/4140048.png',
  'https://cdn-icons-png.flaticon.com/512/4139/4139981.png',
  'https://cdn-icons-png.flaticon.com/512/1998/1998592.png',
  'https://cdn-icons-png.flaticon.com/512/1998/1998721.png',
  'https://cdn-icons-png.flaticon.com/512/192/192395.png'
]
const defaultAvatar = presetAvatars[0]

const load = async () => {
  try {
    const res: any = await getV2Children()
    children.value = res.data || []
  } catch (e) {
    console.error('load children failed', e)
  }
}

watch(() => props.visible, (v) => { if (v) load() })

const resetForm = () => {
  editingId.value = ''
  form.value = { name: '', gender: 'male', age: '', avatar: '' }
}

const startEdit = (c: ChildItem) => {
  editingId.value = c.id
  form.value = { name: c.name, gender: c.gender, age: c.age != null ? String(c.age) : '', avatar: c.avatar || '' }
}

const submit = async () => {
  const name = form.value.name.trim()
  if (!name) {
    uni.showToast({ title: '请输入姓名', icon: 'none' })
    return
  }
  const ageNum = form.value.age ? parseInt(form.value.age, 10) : null
  saving.value = true
  try {
    if (editingId.value) {
      await updateV2Child(editingId.value, { name, gender: form.value.gender, age: ageNum, avatar: form.value.avatar || undefined })
      uni.showToast({ title: '已保存', icon: 'success' })
    } else {
      await createV2Child({ name, gender: form.value.gender, age: ageNum ?? undefined, avatar: form.value.avatar || undefined })
      uni.showToast({ title: '已添加', icon: 'success' })
    }
    resetForm()
    load()
  } catch (e: any) {
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  } finally {
    saving.value = false
  }
}

const removeChild = (c: ChildItem) => {
  uni.showModal({
    title: '删除孩子',
    content: `确定删除「${c.name}」吗？相关任务和课程会保留但不再显示。`,
    success: async (res) => {
      if (!res.confirm) return
      try {
        await deleteV2Child(c.id)
        if (editingId.value === c.id) resetForm()
        uni.showToast({ title: '已删除', icon: 'success' })
        load()
      } catch (e: any) {
        uni.showToast({ title: e.message || '删除失败', icon: 'none' })
      }
    }
  })
}

const close = () => emit('close')
</script>

<style scoped>
.modal-mask {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
  display: flex;
  align-items: center;
  justify-content: center;
}
.modal-box {
  width: 640rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx;
  padding: 32rpx;
  display: flex;
  flex-direction: column;
}
.modal-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20rpx;
}
.modal-title {
  font-size: 34rpx;
  font-weight: 600;
  color: #333;
}
.modal-close {
  font-size: 32rpx;
  color: #999;
  padding: 8rpx;
}
.modal-body {
  max-height: 40vh;
  margin-bottom: 20rpx;
}
.empty-box {
  padding: 24rpx 0;
}
.empty-text {
  font-size: 26rpx;
  color: #999;
}
.child-card {
  display: flex;
  align-items: center;
  padding: 16rpx 0;
  border-bottom: 1rpx solid #f0f0f0;
}
.child-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  background: #eee;
  margin-right: 20rpx;
}
.child-info {
  flex: 1;
  display: flex;
  flex-direction: column;
}
.child-name {
  font-size: 30rpx;
  color: #333;
  font-weight: 500;
}
.child-meta {
  font-size: 24rpx;
  color: #999;
  margin-top: 4rpx;
}
.child-actions {
  display: flex;
  gap: 24rpx;
}
.action-edit {
  font-size: 26rpx;
  color: #4a90d9;
}
.action-delete {
  font-size: 26rpx;
  color: #e05d5d;
}
.form-box {
  border-top: 1rpx solid #f0f0f0;
  padding-top: 20rpx;
}
.form-title {
  font-size: 28rpx;
  color: #666;
  margin-bottom: 16rpx;
  display: block;
}
.avatar-picker {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.preset-avatar {
  width: 72rpx;
  height: 72rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  background: #f5f5f5;
}
.preset-avatar.active {
  border-color: #4a90d9;
}
.form-input {
  background: #f7f7f7;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  font-size: 28rpx;
  margin-bottom: 16rpx;
  width: 100%;
  box-sizing: border-box;
}
.form-row {
  display: flex;
  gap: 16rpx;
  margin-bottom: 16rpx;
}
.form-picker {
  background: #f7f7f7;
  border-radius: 12rpx;
  padding: 16rpx 20rpx;
  flex: 1;
}
.picker-text {
  font-size: 28rpx;
  color: #333;
}
.age-input {
  flex: 1;
  margin-bottom: 0;
}
.submit-btn {
  background: #4a90d9;
  color: #fff;
  font-size: 30rpx;
  border-radius: 12rpx;
  margin-top: 8rpx;
}
.cancel-edit {
  text-align: center;
  font-size: 26rpx;
  color: #999;
  padding: 16rpx 0 0;
  display: block;
}
</style>
