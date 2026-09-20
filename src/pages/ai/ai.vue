<template>
  <view class="container">
    <CommonHeader title="AI 助手" />

    <scroll-view class="chat-list" scroll-y :scroll-top="scrollTop" :scroll-with-animation="true">
      <view class="welcome" v-if="chatMessages.length === 0 && !loading">
        <text class="welcome-title">你好，我是 AI 助手</text>
        <text class="welcome-desc">可以问我课程安排、任务和积分，也可以上传课表图片让我帮你录入。</text>
        <view class="welcome-tips">
          <text class="welcome-tip">试试说："我周三下午3点到4点有游泳课"</text>
          <text class="welcome-tip">或问："我有哪些课？"</text>
        </view>
      </view>

      <view v-for="(m, i) in chatMessages" :key="i" class="msg-row" :class="m.role">
        <view class="bubble" :class="m.role">
          <image v-if="m.image" class="bubble-image" :src="m.image" mode="widthFix" />
          <text class="msg-text" :user-select="true">{{ m.text }}</text>
          <view
            class="options"
            v-if="m.role === 'assistant' && m.options && m.options.length > 0 && i === chatMessages.length - 1 && !loading"
          >
            <view
              v-for="opt in m.options"
              :key="opt"
              class="option-btn"
              :class="opt === '确认执行' ? 'confirm' : opt === '取消' ? 'cancel' : ''"
              @click="clickOption(opt)"
            >
              <text
                class="option-text"
                :class="opt === '确认执行' ? 'confirm' : opt === '取消' ? 'cancel' : ''"
              >{{ opt }}</text>
            </view>
          </view>
        </view>
      </view>

      <view class="msg-row assistant" v-if="loading">
        <view class="bubble assistant">
          <text class="msg-text typing">思考中...</text>
        </view>
      </view>
      <view class="bottom-pad"></view>
    </scroll-view>

    <view class="image-preview" v-if="pendingImage">
      <image class="preview-img" :src="pendingImage.preview" mode="aspectFill" />
      <view class="preview-remove" @click="removeImage">
        <text class="preview-remove-text">×</text>
      </view>
    </view>

    <view class="input-bar">
      <view class="img-btn" @click="chooseImage">
        <text class="img-btn-text">图片</text>
      </view>
      <input
        class="input"
        v-model="inputText"
        placeholder="问我课程、任务或积分..."
        :disabled="loading"
        confirm-type="send"
        @confirm="send"
      />
      <view class="send-btn" :class="{ disabled: loading }" @click="send">
        <text class="send-text">发送</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, nextTick } from 'vue'
import CommonHeader from '@/components/CommonHeader.vue'
import { aiChat, aiConfirm, type AIChatMessage } from '@/api/ai'

interface ChatDisplayMessage {
  role: 'user' | 'assistant'
  text: string
  options?: string[]
  confirmId?: string
  image?: string
}

const chatMessages = ref<ChatDisplayMessage[]>([])
const inputText = ref('')
const loading = ref(false)
const scrollTop = ref(0)
const pendingImage = ref<{ base64: string; preview: string } | null>(null)

function scrollToEnd() {
  nextTick(() => {
    scrollTop.value = scrollTop.value >= 999998 ? 999900 : 999999
  })
}

/** 新消息发出后清掉旧消息的按钮/确认状态，只保留最新一条的交互 */
function clearStaleInteractions() {
  for (const m of chatMessages.value) {
    m.options = []
    m.confirmId = undefined
  }
}

async function send() {
  if (loading.value) return
  const text = inputText.value.trim()
  const image = pendingImage.value
  if (!text && !image) return

  clearStaleInteractions()
  chatMessages.value.push({
    role: 'user',
    text: text || '请识别这张课表图片',
    image: image?.preview
  })
  inputText.value = ''
  pendingImage.value = null
  loading.value = true
  scrollToEnd()

  try {
    const history: AIChatMessage[] = chatMessages.value
      .slice(-20)
      .map((m) => ({ role: m.role, content: m.text }))
    const res = await aiChat(history, image?.base64)
    if (res.code === 0 && res.data) {
      chatMessages.value.push({
        role: 'assistant',
        text: res.data.text,
        options: res.data.options || [],
        confirmId: res.data.confirmId
      })
    } else {
      chatMessages.value.push({
        role: 'assistant',
        text: res.message || 'AI 服务暂时不可用，请稍后再试。'
      })
    }
  } catch (e: any) {
    chatMessages.value.push({
      role: 'assistant',
      text: e?.message || '网络错误，请稍后再试。'
    })
  } finally {
    loading.value = false
    scrollToEnd()
  }
}

async function doConfirm(confirmId: string) {
  if (loading.value) return
  clearStaleInteractions()
  loading.value = true
  scrollToEnd()
  try {
    const res = await aiConfirm(confirmId)
    chatMessages.value.push({
      role: 'assistant',
      text: res.code === 0 && res.data ? res.data.text : res.message || '执行失败，请重试。'
    })
  } catch (e: any) {
    chatMessages.value.push({
      role: 'assistant',
      text: e?.message || '网络错误，请稍后再试。'
    })
  } finally {
    loading.value = false
    scrollToEnd()
  }
}

async function clickOption(opt: string) {
  const last = chatMessages.value[chatMessages.value.length - 1]
  if (opt === '确认执行' && last?.confirmId) {
    await doConfirm(last.confirmId)
    return
  }
  inputText.value = opt
  await send()
}

function removeImage() {
  pendingImage.value = null
}

function chooseImage() {
  if (loading.value) return
  if (pendingImage.value) {
    uni.showToast({ title: '一次只能上传一张图片', icon: 'none' })
    return
  }
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sizeType: ['compressed'],
    success: (res) => {
      const f = res.tempFiles && res.tempFiles[0]
      if (f && f.tempFilePath) handleChosenFile(f.tempFilePath)
    },
    fail: () => {
      // 部分平台没有 chooseMedia 时降级
      uni.chooseImage({
        count: 1,
        sizeType: ['compressed'],
        success: (r) => {
          const p = r.tempFilePaths && r.tempFilePaths[0]
          if (p) handleChosenFile(p)
        }
      })
    }
  })
}

function handleChosenFile(filePath: string) {
  // #ifdef H5
  compressH5(filePath)
  // #endif
  // #ifndef H5
  uni.getFileSystemManager().readFile({
    filePath,
    encoding: 'base64',
    success: (r) => {
      pendingImage.value = { base64: String(r.data), preview: filePath }
    },
    fail: () => {
      uni.showToast({ title: '读取图片失败', icon: 'none' })
    }
  })
  // #endif
}

// #ifdef H5
function compressH5(filePath: string) {
  fetch(filePath)
    .then((res) => res.blob())
    .then((blob) => createImageBitmap(blob))
    .then((bitmap) => {
      const maxSide = 1024
      const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height))
      const canvas = document.createElement('canvas')
      canvas.width = Math.max(1, Math.round(bitmap.width * scale))
      canvas.height = Math.max(1, Math.round(bitmap.height * scale))
      const ctx2d = canvas.getContext('2d')
      if (!ctx2d) throw new Error('canvas 不可用')
      ctx2d.drawImage(bitmap, 0, 0, canvas.width, canvas.height)
      const dataUrl = canvas.toDataURL('image/jpeg', 0.7)
      const base64 = dataUrl.split(',')[1] || ''
      pendingImage.value = { base64, preview: dataUrl }
    })
    .catch(() => {
      uni.showToast({ title: '处理图片失败', icon: 'none' })
    })
}
// #endif
</script>

<style scoped>
.container {
  display: flex;
  flex-direction: column;
  height: 100vh;
  background-color: #f0f8ff;
}

.chat-list {
  flex: 1;
  padding: 20rpx 24rpx 0;
  box-sizing: border-box;
  overflow-y: auto;
}

.welcome {
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 80rpx 40rpx;
}

.welcome-title {
  font-size: 36rpx;
  font-weight: bold;
  color: #333333;
  margin-bottom: 20rpx;
}

.welcome-desc {
  font-size: 26rpx;
  color: #666666;
  text-align: center;
  line-height: 1.6;
}

.welcome-tips {
  margin-top: 32rpx;
  display: flex;
  flex-direction: column;
  gap: 12rpx;
}

.welcome-tip {
  font-size: 24rpx;
  color: #87ceeb;
}

.msg-row {
  display: flex;
  margin-bottom: 24rpx;
}

.msg-row.user {
  justify-content: flex-end;
}

.msg-row.assistant {
  justify-content: flex-start;
}

.bubble {
  max-width: 78%;
  padding: 20rpx 24rpx;
  border-radius: 20rpx;
  box-sizing: border-box;
}

.bubble.user {
  background-color: #87ceeb;
  border-top-right-radius: 6rpx;
}

.bubble.assistant {
  background-color: #ffffff;
  border-top-left-radius: 6rpx;
}

.bubble-image {
  width: 320rpx;
  border-radius: 12rpx;
  margin-bottom: 12rpx;
}

.msg-text {
  font-size: 28rpx;
  line-height: 1.5;
  color: #333333;
  word-break: break-all;
  white-space: pre-wrap;
}

.msg-text.typing {
  color: #999999;
}

.options {
  display: flex;
  flex-wrap: wrap;
  gap: 16rpx;
  margin-top: 20rpx;
}

.option-btn {
  padding: 12rpx 28rpx;
  border-radius: 32rpx;
  background-color: #e6f4fc;
  border: 1rpx solid #87ceeb;
}

.option-btn.confirm {
  background-color: #34c77b;
  border-color: #34c77b;
}

.option-btn.cancel {
  background-color: #f2f2f2;
  border-color: #cccccc;
}

.option-text {
  font-size: 26rpx;
  color: #2a7fb8;
}

.option-text.confirm {
  color: #ffffff;
  font-weight: bold;
}

.option-text.cancel {
  color: #888888;
}

.bottom-pad {
  height: 20rpx;
}

.image-preview {
  display: flex;
  align-items: center;
  padding: 12rpx 24rpx;
}

.preview-img {
  width: 120rpx;
  height: 120rpx;
  border-radius: 12rpx;
  background-color: #dddddd;
}

.preview-remove {
  margin-left: 16rpx;
  width: 44rpx;
  height: 44rpx;
  border-radius: 22rpx;
  background-color: #999999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.preview-remove-text {
  color: #ffffff;
  font-size: 30rpx;
  line-height: 30rpx;
}

.input-bar {
  display: flex;
  align-items: center;
  padding: 16rpx 24rpx;
  padding-bottom: calc(16rpx + env(safe-area-inset-bottom));
  background-color: #ffffff;
  border-top: 1rpx solid #eeeeee;
  gap: 16rpx;
}

.img-btn {
  padding: 12rpx 20rpx;
  border-radius: 12rpx;
  background-color: #e6f4fc;
}

.img-btn-text {
  font-size: 26rpx;
  color: #2a7fb8;
}

.input {
  flex: 1;
  height: 68rpx;
  padding: 0 24rpx;
  background-color: #f5f5f5;
  border-radius: 34rpx;
  font-size: 28rpx;
}

.send-btn {
  padding: 14rpx 32rpx;
  border-radius: 34rpx;
  background-color: #87ceeb;
}

.send-btn.disabled {
  opacity: 0.5;
}

.send-text {
  font-size: 28rpx;
  color: #ffffff;
}
</style>
