<template>
  <view class="page">
    <scroll-view scroll-y class="body">
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
        <view class="preset-avatar custom-add" :class="{ active: isCustomAvatar }" @click="chooseCustomAvatar">
          <text class="custom-add-text">{{ isCustomAvatar ? '✓' : '+' }}</text>
        </view>
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
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { onLoad, onShow } from '@dcloudio/uni-app'
import { getV2Children, createV2Child, updateV2Child, deleteV2Child } from '@/api/family'

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

onShow(() => load())

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

const isCustomAvatar = ref(false)
// 判断当前 form.avatar 是否自定义（非预设库）
const syncCustomFlag = () => {
  isCustomAvatar.value = !!form.value.avatar && !presetAvatars.includes(form.value.avatar)
}
import { watch } from 'vue'
watch(() => form.value.avatar, syncCustomFlag, { immediate: true })

const chooseCustomAvatar = () => {
  uni.showActionSheet({
    itemList: ['拍照', '从相册选择'],
    success: (res) => {
      uni.chooseImage({
        sourceType: res.tapIndex === 0 ? ['camera'] : ['album'],
        count: 1,
        success: async (r) => {
          const tmp = r.tempFilePaths[0]
          try {
            let src = tmp
            // @ts-ignore
            if (uni.compressImage) {
              try {
                const c = await new Promise<any>((resolve, reject) => {
                  // @ts-ignore
                  uni.compressImage({ src: tmp, quality: 50, success: resolve, fail: reject })
                })
                if (c.tempFilePath) src = c.tempFilePath
              } catch (e) { /* 用原图 */ }
            }
            const fs = uni.getFileSystemManager()
            const b64 = await new Promise<string>((resolve, reject) => {
              fs.readFile({ filePath: src, encoding: 'base64', success: (res: any) => resolve(`data:image/jpeg;base64,${res.data}`), fail: reject })
            })
            form.value.avatar = b64
          } catch (e) {
            uni.showToast({ title: '读取图片失败', icon: 'none' })
          }
        }
      })
    }
  })
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
</script>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f6fa;
  display: flex;
  flex-direction: column;
}
.body {
  flex: 1;
  padding: 24rpx 32rpx;
  box-sizing: border-box;
}
.empty-box {
  padding: 80rpx 0;
  text-align: center;
}
.empty-text {
  color: #999;
  font-size: 28rpx;
}
.child-card {
  display: flex;
  align-items: center;
  background: #fff;
  border-radius: 20rpx;
  padding: 24rpx;
  margin-bottom: 20rpx;
}
.child-avatar {
  width: 88rpx;
  height: 88rpx;
  border-radius: 50%;
  background: #eee;
}
.child-info {
  flex: 1;
  margin-left: 24rpx;
  display: flex;
  flex-direction: column;
  gap: 6rpx;
}
.child-name {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
}
.child-meta {
  font-size: 24rpx;
  color: #999;
}
.child-actions {
  display: flex;
  gap: 24rpx;
}
.action-edit {
  color: #4a7cf7;
  font-size: 26rpx;
}
.action-delete {
  color: #e64340;
  font-size: 26rpx;
}
.form-box {
  background: #fff;
  border-radius: 24rpx 24rpx 0 0;
  padding: 32rpx;
  padding-bottom: calc(32rpx + env(safe-area-inset-bottom));
  display: flex;
  flex-direction: column;
}
.form-title {
  font-size: 30rpx;
  font-weight: 600;
  color: #333;
  margin-bottom: 20rpx;
}
.avatar-picker {
  display: flex;
  gap: 20rpx;
  margin-bottom: 20rpx;
}
.preset-avatar {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  border: 4rpx solid transparent;
  background: #eee;
}
.preset-avatar.active {
  border-color: #4a7cf7;
}
.custom-add {
  display: flex;
  align-items: center;
  justify-content: center;
  background: #f0f2f8;
}
.custom-add-text {
  font-size: 44rpx;
  color: #4a7cf7;
}
.form-input {
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
  font-size: 28rpx;
  margin-bottom: 20rpx;
}
.form-row {
  display: flex;
  gap: 20rpx;
}
.form-picker {
  background: #f5f6fa;
  border-radius: 12rpx;
  padding: 20rpx 24rpx;
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
  margin-top: 28rpx;
  background: #4a7cf7;
  color: #fff;
  font-size: 30rpx;
  border-radius: 44rpx;
}
.cancel-edit {
  text-align: center;
  color: #999;
  font-size: 26rpx;
  padding: 16rpx 0 0;
}
</style>
