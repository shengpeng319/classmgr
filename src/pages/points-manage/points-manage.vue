<template>
  <view class="container">
    <view class="page-header">
      <view class="back-btn" @click="goBack">
        <text class="back-text">‹ 返回</text>
      </view>
      <text class="page-title">{{ pageTitle }}</text>
      <view class="spacer"></view>
    </view>

    <view class="content">
      <view class="points-input-card">
        <view class="points-display">
          <view class="points-btn minus" @click="adjustPoints(-1)">
            <text class="points-btn-text">-</text>
          </view>
          <text class="points-value" :class="{ negative: actualPoints < 0 }">{{ actualPoints }}</text>
          <view class="points-btn add" @click="adjustPoints(1)">
            <text class="points-btn-text">+</text>
          </view>
        </view>
      </view>

      <view class="section-title">选择加分项</view>
      
      <view class="items-grid">
        <view 
          v-for="(item, index) in presetItems" 
          :key="index"
          class="grid-item"
          :class="{ selected: selectedItemIndex === index }"
          @click="selectItem(index)"
          @longpress="showItemMenu(item, index)"
        >
          <view class="item-circle" :style="{ backgroundColor: item.color || '#4A9B8E' }">
            <text class="item-letter">{{ item.label.charAt(0) }}</text>
          </view>
          <text class="item-label">{{ item.label }}</text>
        </view>
        
        <view class="grid-item add-item" @click="showAddItemModal">
          <view class="item-circle add-circle">
            <text class="add-icon">+</text>
          </view>
          <text class="item-label">添加</text>
        </view>
      </view>

      <view class="reason-card">
        <input class="reason-input" v-model="reason" placeholder="输入加分/减分原因（选填）" />
      </view>

      <view class="submit-btn" @click="submit">
        <text class="submit-text">{{ mode === 'add' ? '确认加分' : '确认减分' }}</text>
      </view>
    </view>

    <!-- 添加/编辑加分项弹窗 -->
    <view class="modal" v-if="showItemModal" @click="closeItemModal">
      <view class="modal-content" @click.stop>
        <view class="modal-header">
          <text class="modal-title">{{ editingItemIndex >= 0 ? '编辑' : '新增' }}加分项</text>
        </view>
        
        <view class="form-item">
          <text class="form-label">名称</text>
          <input class="form-input" v-model="itemForm.label" placeholder="如：表现优秀" />
        </view>
        
        <view class="form-item">
          <text class="form-label">颜色</text>
          <view class="color-picker">
            <view 
              v-for="c in colorOptions" 
              :key="c"
              class="color-option"
              :class="{ selected: itemForm.color === c }"
              :style="{ backgroundColor: c }"
              @click="itemForm.color = c"
            ></view>
          </view>
        </view>
        
        <view class="form-item">
          <text class="form-label">分值</text>
          <input class="form-input" type="number" v-model="itemForm.points" placeholder="默认1分" />
        </view>

        <view class="modal-actions">
          <view class="btn cancel" @click="closeItemModal">
            <text class="btn-text">取消</text>
          </view>
          <view class="btn delete" v-if="editingItemIndex >= 0" @click="deleteItem">
            <text class="btn-text">删除</text>
          </view>
          <view class="btn confirm" @click="saveItem">
            <text class="btn-text">保存</text>
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'

const mode = ref<'add' | 'subtract'>('add')
const userId = ref('')
const userName = ref('')
const points = ref(1)
const reason = ref('')
const selectedItemIndex = ref(-1)

interface PresetItem {
  label: string
  color: string
  points: number
}

const presetItems = ref<PresetItem[]>([
  { label: '表现优秀', color: '#4A9B8E', points: 5 },
  { label: '主动帮忙', color: '#FF9800', points: 3 },
  { label: '学习进步', color: '#2196F3', points: 2 },
  { label: '按时完成作业', color: '#9C27B0', points: 2 },
])

const colorOptions = ['#4A9B8E', '#FF9800', '#2196F3', '#9C27B0', '#E91E63', '#00BCD4', '#8BC34A', '#FF5722']

const showItemModal = ref(false)
const editingItemIndex = ref(-1)
const itemForm = ref({ label: '', color: '#4A9B8E', points: 1 })

const pageTitle = computed(() => {
  return `${userName.value} ${mode.value === 'add' ? '加分' : '减分'}`
})

const actualPoints = computed(() => {
  if (selectedItemIndex.value >= 0 && selectedItemIndex.value < presetItems.value.length) {
    return mode.value === 'add' ? presetItems.value[selectedItemIndex.value].points : -presetItems.value[selectedItemIndex.value].points
  }
  return mode.value === 'add' ? points.value : -points.value
})

const adjustPoints = (delta: number) => {
  const newVal = points.value + delta
  if (newVal >= 1) {
    points.value = newVal
    selectedItemIndex.value = -1
  }
}

const selectItem = (index: number) => {
  if (selectedItemIndex.value === index) {
    selectedItemIndex.value = -1
  } else {
    selectedItemIndex.value = index
    points.value = presetItems.value[index].points
  }
}

const showItemMenu = (item: PresetItem, index: number) => {
  editingItemIndex.value = index
  itemForm.value = { label: item.label, color: item.color, points: item.points }
  showItemModal.value = true
}

const showAddItemModal = () => {
  editingItemIndex.value = -1
  itemForm.value = { label: '', color: '#4A9B8E', points: 1 }
  showItemModal.value = true
}

const closeItemModal = () => {
  showItemModal.value = false
  editingItemIndex.value = -1
}

const saveItem = () => {
  if (!itemForm.value.label.trim()) {
    uni.showToast({ title: '请输入名称', icon: 'none' })
    return
  }
  
  if (editingItemIndex.value >= 0) {
    presetItems.value[editingItemIndex.value] = { ...itemForm.value, points: Number(itemForm.value.points) || 1 }
  } else {
    presetItems.value.push({ ...itemForm.value, points: Number(itemForm.value.points) || 1 })
  }
  
  saveItemsToStorage()
  closeItemModal()
}

const deleteItem = () => {
  if (editingItemIndex.value >= 0) {
    presetItems.value.splice(editingItemIndex.value, 1)
    saveItemsToStorage()
    closeItemModal()
  }
}

const saveItemsToStorage = () => {
  uni.setStorageSync('presetPointItems', JSON.stringify(presetItems.value))
}

const loadItemsFromStorage = () => {
  const stored = uni.getStorageSync('presetPointItems')
  if (stored) {
    try {
      presetItems.value = JSON.parse(stored)
    } catch (e) {}
  }
}

const goBack = () => {
  uni.navigateBack()
}

const submit = async () => {
  if (actualPoints.value === 0) {
    uni.showToast({ title: '请选择或输入积分', icon: 'none' })
    return
  }

  const recordReason = reason.value.trim() || (selectedItemIndex.value >= 0 ? presetItems.value[selectedItemIndex.value].label : '')

  try {
    const res: any = await uni.request({
      url: 'http://192.168.101.50:3000/api/admin/points/adjust',
      method: 'POST',
      data: {
        userId: userId.value,
        points: actualPoints.value,
        reason: recordReason
      }
    })
    
    if (res.data.code === 0) {
      uni.showToast({ 
        title: mode.value === 'add' ? '加分成功' : '减分成功', 
        icon: 'success' 
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    } else {
      uni.showToast({ title: res.data.message || '操作失败', icon: 'none' })
    }
  } catch (e) {
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

onMounted(() => {
  const pages = getCurrentPages()
  const currentPage = pages[pages.length - 1] as any
  if (currentPage?.options) {
    mode.value = currentPage.options.mode || 'add'
    userId.value = currentPage.options.userId || ''
    userName.value = decodeURIComponent(currentPage.options.userName || '用户')
  }

  loadItemsFromStorage()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #FFF8E1 0%, #FFFDE7 100%);
  padding: 20rpx 30rpx;
}

.page-header {
  display: flex;
  align-items: center;
  padding: 20rpx 0;
  margin-bottom: 20rpx;
}

.back-btn {
  padding: 10rpx 20rpx;
}

.back-text {
  font-size: 28rpx;
  color: #4A9B8E;
}

.page-title {
  flex: 1;
  text-align: center;
  font-size: 32rpx;
  font-weight: bold;
  color: #333;
  margin-right: 100rpx;
}

.spacer {
  width: 100rpx;
}

.content {
  display: flex;
  flex-direction: column;
  gap: 30rpx;
}

.points-input-card {
  background: #FFFFFF;
  border-radius: 24rpx;
  padding: 40rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.points-display {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 40rpx;
}

.points-btn {
  width: 80rpx;
  height: 80rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.points-btn.add {
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
}

.points-btn.minus {
  background: #F0F0F0;
}

.points-btn-text {
  font-size: 40rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.points-btn.minus .points-btn-text {
  color: #666;
}

.points-value {
  font-size: 72rpx;
  font-weight: bold;
  color: #4A9B8E;
  min-width: 150rpx;
  text-align: center;
}

.points-value.negative {
  color: #E05555;
}

.section-title {
  font-size: 28rpx;
  color: #666;
  font-weight: 500;
}

.items-grid {
  display: flex;
  flex-wrap: wrap;
  gap: 30rpx;
  padding: 10rpx 0;
}

.grid-item {
  width: 140rpx;
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 12rpx;
}

.grid-item.selected .item-circle {
  box-shadow: 0 0 0 6rpx rgba(74, 155, 142, 0.3);
}

.item-circle {
  width: 100rpx;
  height: 100rpx;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
}

.item-letter {
  font-size: 40rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.item-label {
  font-size: 24rpx;
  color: #333;
  text-align: center;
}

.add-circle {
  background: #F0F0F0;
  border: 2rpx dashed #CCC;
}

.add-icon {
  font-size: 48rpx;
  color: #999;
  font-weight: 300;
}

.reason-card {
  background: #FFFFFF;
  border-radius: 16rpx;
  padding: 20rpx 30rpx;
  box-shadow: 0 4rpx 12rpx rgba(0, 0, 0, 0.05);
}

.reason-input {
  font-size: 28rpx;
  color: #333;
  width: 100%;
}

.submit-btn {
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 48rpx;
  padding: 30rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 0 8rpx 20rpx rgba(255, 165, 0, 0.3);
}

.submit-btn:active {
  transform: scale(0.98);
}

.submit-text {
  font-size: 32rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.4);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}

.modal-content {
  width: 600rpx;
  background: #FFFFFF;
  border-radius: 24rpx;
  overflow: hidden;
}

.modal-header {
  padding: 30rpx;
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
}

.modal-title {
  font-size: 32rpx;
  font-weight: bold;
  color: #FFFFFF;
}

.form-item {
  padding: 24rpx 30rpx;
}

.form-label {
  font-size: 26rpx;
  color: #666;
  display: block;
  margin-bottom: 12rpx;
}

.form-input {
  background: #F8F9FA;
  padding: 20rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  color: #333;
}

.color-picker {
  display: flex;
  gap: 16rpx;
  flex-wrap: wrap;
}

.color-option {
  width: 56rpx;
  height: 56rpx;
  border-radius: 50%;
}

.color-option.selected {
  box-shadow: 0 0 0 4rpx #FFFFFF, 0 0 0 6rpx currentColor;
}

.modal-actions {
  display: flex;
  gap: 20rpx;
  padding: 20rpx 30rpx 30rpx;
}

.btn {
  flex: 1;
  padding: 24rpx;
  border-radius: 16rpx;
  text-align: center;
}

.btn.cancel {
  background: #F0F0F0;
}

.btn.delete {
  background: #FFE5E5;
}

.btn.confirm {
  background: linear-gradient(135deg, #4A9B8E, #3D8B80);
}

.btn-text {
  font-size: 28rpx;
  font-weight: 500;
}

.btn.cancel .btn-text {
  color: #666;
}

.btn.delete .btn-text {
  color: #E05555;
}

.btn.confirm .btn-text {
  color: #FFFFFF;
}
</style>