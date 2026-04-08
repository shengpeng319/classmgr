<template>
  <view class="container">
    <CommonHeader title="祈愿" />
    
    <view class="content">
      <!-- 抽卡按钮区域 -->
      <view class="wish-section">
        <view class="banner-card" @click="doWish">
          <view class="banner-bg">
            <view class="banner-glow"></view>
            <view class="banner-particles">
              <view v-for="i in 20" :key="i" class="particle" :class="`particle-${i}`"></view>
            </view>
          </view>
          <view class="banner-content">
            <text class="banner-title">纠缠之缘 ×10</text>
            <text class="banner-subtitle">点击进行十连抽卡</text>
          </view>
          <view class="banner-btn">
            <text class="banner-btn-text">祈愿</text>
          </view>
        </view>
        
        <view class="wish-info">
          <text class="info-text">免费抽卡 · 每日刷新</text>
        </view>
      </view>
      
      <!-- 卡池展示 -->
      <view class="pool-section">
        <view class="section-header">
          <text class="section-title">角色卡池</text>
        </view>
        <view class="character-grid">
          <view v-for="card in availableCards" :key="card.id" class="character-card" :class="card.rarity">
            <view class="character-glow"></view>
            <text class="character-emoji">{{ getCardEmoji(card.rarity) }}</text>
            <text class="character-name">{{ card.name }}</text>
            <view class="character-stars">
              <text v-for="n in getStarCount(card.rarity)" :key="n" class="star">★</text>
            </view>
          </view>
        </view>
      </view>
      
      <!-- 我的收藏 -->
      <view class="my-collection-section">
        <view class="section-header">
          <text class="section-title">我的收藏</text>
          <text class="collection-count">{{ myCards.length }} 张</text>
        </view>
        <view class="collection-list" v-if="myCards.length > 0">
          <scroll-view scroll-x>
            <view class="collection-scroll">
              <view v-for="item in myCards" :key="item.id" class="collection-item" :class="item.card.rarity">
                <text class="collection-emoji">{{ getCardEmoji(item.card.rarity) }}</text>
                <text class="collection-name">{{ item.card.name }}</text>
              </view>
            </view>
          </scroll-view>
        </view>
        <view class="empty-collection" v-else>
          <text class="empty-text">暂无收藏，快去抽卡吧！</text>
        </view>
      </view>
    </view>
    
    <!-- 抽卡动画覆盖层 -->
    <view class="wish-modal" v-if="showWishAnimation" @click="handleWishModalClick">
      <view class="wish-container">
        <!-- 星星轨道 -->
        <view class="star-orbit">
          <view v-for="i in 30" :key="i" class="orbit-star" :class="`orbit-${i}`"></view>
        </view>
        
        <!-- 中心展示区 -->
        <view class="reveal-area">
          <!-- 角色展示 -->
          <view class="character-reveal" :class="{ active: revealActive }">
            <view class="reveal-bg"></view>
            <view class="reveal-rays">
              <view v-for="i in 12" :key="i" class="ray" :class="`ray-${i}`"></view>
            </view>
            <view class="reveal-frame">
              <view class="frame-glow" :class="drawnCard?.rarity"></view>
              <text class="reveal-emoji">{{ getCardEmoji(drawnCard?.rarity || 'common') }}</text>
            </view>
            <text class="reveal-name">{{ drawnCard?.name }}</text>
            <view class="reveal-rarity" :class="drawnCard?.rarity">
              <text class="rarity-text">{{ getRarityText(drawnCard?.rarity || 'common') }}</text>
              <view class="rarity-stars">
                <text v-for="n in getStarCount(drawnCard?.rarity || 'common')" :key="n" class="rarity-star">★</text>
              </view>
            </view>
          </view>
        </view>
        
        <!-- 进度条 -->
        <view class="wish-progress">
          <view class="progress-track">
            <view class="progress-fill" :style="{ width: progressWidth }"></view>
            <view class="progress-marker" :style="{ left: markerPosition }">
              <view class="marker-icon" :class="{ locked: !revealActive }">✦</view>
            </view>
          </view>
          <view class="progress-labels">
            <text class="progress-label">1</text>
            <text class="progress-label">5</text>
            <text class="progress-label">10</text>
          </view>
        </view>
        
        <!-- 结果列表 -->
        <view class="results-list" v-if="showResultsList">
          <view v-for="(result, index) in wishResults" :key="index" class="result-item" :class="result.card.rarity" :style="{ animationDelay: `${index * 0.1}s` }">
            <text class="result-emoji">{{ getCardEmoji(result.card.rarity) }}</text>
            <text class="result-name">{{ result.card.name }}</text>
          </view>
        </view>
        
        <!-- 关闭按钮 -->
        <view class="close-btn" v-if="canClose" @click.stop="closeWish">
          <text class="close-text">关闭</text>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import CommonHeader from '@/components/CommonHeader.vue'
import { getLotteryCards, drawCard, getMyCards } from '@/api/lottery'
import type { Card, StudentCard } from '@/api/lottery'

const availableCards = ref<Card[]>([])
const myCards = ref<StudentCard[]>([])
const loadingCards = ref(false)
const isDrawing = ref(false)
const showWishAnimation = ref(false)
const revealActive = ref(false)
const showResultsList = ref(false)
const canClose = ref(false)
const drawnCard = ref<Card | null>(null)
const wishResults = ref<{ card: Card }[]>([])
const progressWidth = ref('0%')
const markerPosition = ref('0%')

const getRarityText = (rarity: string): string => {
  const map: Record<string, string> = { common: '普通', rare: '稀有', epic: '史诗', legendary: '传说' }
  return map[rarity] || rarity
}

const getCardEmoji = (rarity: string): string => {
  const map: Record<string, string> = { common: '🌟', rare: '💎', epic: '👑', legendary: '🔮' }
  return map[rarity] || '🌟'
}

const getStarCount = (rarity: string): number => {
  const map: Record<string, number> = { common: 1, rare: 3, epic: 4, legendary: 5 }
  return map[rarity] || 1
}

const loadAvailableCards = async () => {
  loadingCards.value = true
  try {
    const res: any = await getLotteryCards()
    if (res.code === 0) availableCards.value = res.data || []
  } catch (e) {
    console.error('Failed to load cards', e)
  } finally {
    loadingCards.value = false
  }
}

const loadMyCards = async () => {
  try {
    const res: any = await getMyCards()
    if (res.code === 0) myCards.value = res.data || []
  } catch (e) {
    console.error('Failed to load my cards', e)
  }
}

const doWish = async () => {
  if (isDrawing.value) return
  isDrawing.value = true
  
  // 显示动画
  showWishAnimation.value = true
  revealActive.value = false
  showResultsList.value = false
  canClose.value = false
  progressWidth.value = '0%'
  markerPosition.value = '0%'
  wishResults.value = []
  
  try {
    // 进行十连抽卡
    const results: any[] = []
    for (let i = 0; i < 10; i++) {
      const res: any = await drawCard()
      if (res.code === 0) {
        results.push(res.data)
      }
    }
    
    // 随机决定保底（简化处理，前9个给普通，最后1个根据概率决定）
    const sortedResults = results.sort((a, b) => {
      const order = { legendary: 4, epic: 3, rare: 2, common: 1 }
      return (order[b.card.rarity as keyof typeof order] || 0) - (order[a.card.rarity as keyof typeof order] || 0)
    })
    
    wishResults.value = results
    drawnCard.value = sortedResults[0].card
    
    // 动画序列
    await animateProgress()
    await delay(500)
    revealActive.value = true
    await delay(2000)
    showResultsList.value = true
    await delay(1000)
    canClose.value = true
    
    loadMyCards()
  } catch (e) {
    console.error('Wish failed', e)
    uni.showToast({ title: '抽卡失败', icon: 'none' })
    showWishAnimation.value = false
  } finally {
    isDrawing.value = false
  }
}

const animateProgress = async () => {
  // 进度条动画
  for (let i = 1; i <= 10; i++) {
    await delay(150)
    progressWidth.value = `${i * 10}%`
    markerPosition.value = `${i * 10}%`
  }
}

const handleWishModalClick = () => {
  if (canClose.value) {
    closeWish()
  }
}

const closeWish = () => {
  showWishAnimation.value = false
  revealActive.value = false
  showResultsList.value = false
  canClose.value = false
  progressWidth.value = '0%'
  markerPosition.value = '0%'
  wishResults.value = []
  drawnCard.value = null
}

const delay = (ms: number) => new Promise(resolve => setTimeout(resolve, ms))

onMounted(() => {
  loadAvailableCards()
  loadMyCards()
})
</script>

<style scoped>
.container {
  min-height: 100vh;
  background: linear-gradient(180deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%);
  padding: 20rpx 30rpx;
}

.content {
  padding-top: 20rpx;
}

/* Banner Card */
.wish-section {
  margin-bottom: 40rpx;
}

.banner-card {
  position: relative;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  border-radius: 30rpx;
  padding: 50rpx 40rpx;
  overflow: hidden;
  box-shadow: 0 20rpx 60rpx rgba(102, 126, 234, 0.4);
}

.banner-bg {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.banner-glow {
  position: absolute;
  top: -50%;
  left: -50%;
  width: 200%;
  height: 200%;
  background: radial-gradient(circle, rgba(255, 255, 255, 0.2) 0%, transparent 50%);
  animation: rotate-glow 10s linear infinite;
}

@keyframes rotate-glow {
  from { transform: rotate(0deg); }
  to { transform: rotate(360deg); }
}

.banner-particles {
  position: absolute;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
}

.particle {
  position: absolute;
  width: 8rpx;
  height: 8rpx;
  background: #FFD700;
  border-radius: 50%;
  animation: float-particle 3s ease-in-out infinite;
}

.particle-1 { top: 20%; left: 10%; animation-delay: 0s; }
.particle-2 { top: 60%; left: 20%; animation-delay: 0.3s; }
.particle-3 { top: 30%; left: 80%; animation-delay: 0.6s; }
.particle-4 { top: 70%; left: 70%; animation-delay: 0.9s; }
.particle-5 { top: 15%; left: 50%; animation-delay: 1.2s; }
.particle-6 { top: 80%; left: 40%; animation-delay: 1.5s; }
.particle-7 { top: 40%; left: 5%; animation-delay: 1.8s; }
.particle-8 { top: 50%; left: 90%; animation-delay: 2.1s; }
.particle-9 { top: 25%; left: 35%; animation-delay: 2.4s; }
.particle-10 { top: 75%; left: 55%; animation-delay: 2.7s; }
.particle-11 { top: 10%; left: 65%; animation-delay: 0.2s; }
.particle-12 { top: 85%; left: 15%; animation-delay: 0.5s; }
.particle-13 { top: 45%; left: 25%; animation-delay: 0.8s; }
.particle-14 { top: 35%; left: 75%; animation-delay: 1.1s; }
.particle-15 { top: 65%; left: 85%; animation-delay: 1.4s; }
.particle-16 { top: 5%; left: 45%; animation-delay: 1.7s; }
.particle-17 { top: 90%; left: 30%; animation-delay: 2s; }
.particle-18 { top: 55%; left: 60%; animation-delay: 2.3s; }
.particle-19 { top: 20%; left: 95%; animation-delay: 2.6s; }
.particle-20 { top: 95%; left: 50%; animation-delay: 0.1s; }

@keyframes float-particle {
  0%, 100% { transform: translateY(0) scale(1); opacity: 0.8; }
  50% { transform: translateY(-20rpx) scale(1.5); opacity: 1; }
}

.banner-content {
  position: relative;
  z-index: 1;
  text-align: center;
  margin-bottom: 30rpx;
}

.banner-title {
  font-size: 48rpx;
  font-weight: bold;
  color: #FFFFFF;
  text-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.3);
  display: block;
  margin-bottom: 12rpx;
}

.banner-subtitle {
  font-size: 26rpx;
  color: rgba(255, 255, 255, 0.8);
}

.banner-btn {
  position: relative;
  z-index: 1;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 100%);
  border-radius: 50rpx;
  padding: 24rpx 80rpx;
  display: inline-block;
  box-shadow: 0 10rpx 30rpx rgba(255, 165, 0, 0.4);
}

.banner-btn-text {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
  text-shadow: 0 2rpx 10rpx rgba(0, 0, 0, 0.2);
}

.wish-info {
  text-align: center;
  margin-top: 20rpx;
}

.info-text {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* Pool Section */
.pool-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 24rpx;
}

.section-title {
  font-size: 32rpx;
  font-weight: 600;
  color: #FFFFFF;
}

.collection-count {
  font-size: 24rpx;
  color: rgba(255, 255, 255, 0.5);
}

.character-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
}

.character-card {
  position: relative;
  background: rgba(255, 255, 255, 0.1);
  border-radius: 16rpx;
  padding: 24rpx 16rpx;
  text-align: center;
  transition: transform 0.3s;
}

.character-card:active {
  transform: scale(0.95);
}

.character-card.common { border: 2rpx solid #888; }
.character-card.rare { border: 2rpx solid #42A5F5; background: rgba(66, 165, 245, 0.1); }
.character-card.epic { border: 2rpx solid #9C27B0; background: rgba(156, 39, 176, 0.1); }
.character-card.legendary { border: 2rpx solid #FFD700; background: rgba(255, 215, 0, 0.1); }

.character-glow {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100%;
  height: 100%;
  transform: translate(-50%, -50%);
  border-radius: 16rpx;
  opacity: 0;
  transition: opacity 0.3s;
}

.character-card.legendary .character-glow {
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
  opacity: 1;
  animation: pulse-glow 2s ease-in-out infinite;
}

@keyframes pulse-glow {
  0%, 100% { opacity: 0.5; transform: translate(-50%, -50%) scale(1); }
  50% { opacity: 1; transform: translate(-50%, -50%) scale(1.1); }
}

.character-emoji {
  font-size: 56rpx;
  display: block;
  margin-bottom: 8rpx;
  position: relative;
  z-index: 1;
}

.character-name {
  font-size: 22rpx;
  color: #FFFFFF;
  display: block;
  margin-bottom: 8rpx;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.character-stars {
  display: flex;
  justify-content: center;
  gap: 2rpx;
}

.star {
  font-size: 18rpx;
  color: #FFD700;
}

/* Collection Section */
.my-collection-section {
  background: rgba(255, 255, 255, 0.05);
  border-radius: 24rpx;
  padding: 30rpx;
  border: 1rpx solid rgba(255, 255, 255, 0.1);
}

.collection-list {
  overflow: hidden;
}

.collection-scroll {
  display: flex;
  gap: 16rpx;
  padding: 10rpx 0;
}

.collection-item {
  flex-shrink: 0;
  width: 120rpx;
  padding: 20rpx;
  border-radius: 16rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.05);
}

.collection-item.common { border: 1rpx solid #666; }
.collection-item.rare { border: 1rpx solid #42A5F5; background: rgba(66, 165, 245, 0.1); }
.collection-item.epic { border: 1rpx solid #9C27B0; background: rgba(156, 39, 176, 0.1); }
.collection-item.legendary { border: 1rpx solid #FFD700; background: rgba(255, 215, 0, 0.1); }

.collection-emoji {
  font-size: 48rpx;
  display: block;
  margin-bottom: 8rpx;
}

.collection-name {
  font-size: 20rpx;
  color: #FFFFFF;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.empty-collection {
  text-align: center;
  padding: 40rpx 0;
}

.empty-text {
  font-size: 28rpx;
  color: rgba(255, 255, 255, 0.5);
}

/* Wish Modal */
.wish-modal {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: linear-gradient(180deg, #0a0a1a 0%, #1a1a3a 100%);
  z-index: 9999;
  display: flex;
  align-items: center;
  justify-content: center;
}

.wish-container {
  width: 100%;
  height: 100%;
  position: relative;
}

/* Star Orbit */
.star-orbit {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 600rpx;
  height: 600rpx;
  transform: translate(-50%, -50%);
}

.orbit-star {
  position: absolute;
  width: 6rpx;
  height: 6rpx;
  background: #FFD700;
  border-radius: 50%;
  box-shadow: 0 0 10rpx #FFD700;
  animation: orbit-spin 3s linear infinite;
}

.orbit-1 { top: 0; left: 50%; transform: translate(-50%, -50%); animation-delay: 0s; }
.orbit-2 { top: 15%; left: 85%; animation-delay: 0.2s; }
.orbit-3 { top: 50%; left: 100%; transform: translate(-50%, -50%); animation-delay: 0.4s; }
.orbit-4 { top: 85%; left: 85%; animation-delay: 0.6s; }
.orbit-5 { top: 100%; left: 50%; transform: translate(-50%, -50%); animation-delay: 0.8s; }
.orbit-6 { top: 85%; left: 15%; animation-delay: 1s; }
.orbit-7 { top: 50%; left: 0%; transform: translate(-50%, -50%); animation-delay: 1.2s; }
.orbit-8 { top: 15%; left: 15%; animation-delay: 1.4s; }
.orbit-9 { top: 30%; left: 95%; animation-delay: 0.3s; }
.orbit-10 { top: 70%; left: 95%; animation-delay: 0.5s; }
.orbit-11 { top: 95%; left: 70%; animation-delay: 0.7s; }
.orbit-12 { top: 95%; left: 30%; animation-delay: 0.9s; }
.orbit-13 { top: 70%; left: 5%; animation-delay: 1.1s; }
.orbit-14 { top: 30%; left: 5%; animation-delay: 1.3s; }
.orbit-15 { top: 5%; left: 30%; animation-delay: 1.5s; }
.orbit-16 { top: 5%; left: 70%; animation-delay: 1.6s; }
.orbit-17 { top: 40%; left: 97%; animation-delay: 0.1s; }
.orbit-18 { top: 60%; left: 97%; animation-delay: 0.15s; }
.orbit-19 { top: 97%; left: 60%; animation-delay: 0.25s; }
.orbit-20 { top: 97%; left: 40%; animation-delay: 0.35s; }
.orbit-21 { top: 60%; left: 3%; animation-delay: 0.45s; }
.orbit-22 { top: 40%; left: 3%; animation-delay: 0.55s; }
.orbit-23 { top: 3%; left: 40%; animation-delay: 0.65s; }
.orbit-24 { top: 3%; left: 60%; animation-delay: 0.75s; }
.orbit-25 { top: 20%; left: 90%; animation-delay: 0.85s; }
.orbit-26 { top: 80%; left: 90%; animation-delay: 0.95s; }
.orbit-27 { top: 90%; left: 80%; animation-delay: 1.05s; }
.orbit-28 { top: 90%; left: 20%; animation-delay: 1.15s; }
.orbit-29 { top: 80%; left: 10%; animation-delay: 1.25s; }
.orbit-30 { top: 20%; left: 10%; animation-delay: 1.35s; }

@keyframes orbit-spin {
  from { transform: translate(-50%, -50%) rotate(0deg); }
  to { transform: translate(-50%, -50%) rotate(360deg); }
}

/* Reveal Area */
.reveal-area {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 500rpx;
  height: 500rpx;
  display: flex;
  align-items: center;
  justify-content: center;
}

.character-reveal {
  opacity: 0;
  transform: scale(0.5);
  transition: all 0.8s cubic-bezier(0.34, 1.56, 0.64, 1);
  text-align: center;
}

.character-reveal.active {
  opacity: 1;
  transform: scale(1);
}

.reveal-bg {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 400rpx;
  height: 400rpx;
  border-radius: 50%;
  background: radial-gradient(circle, rgba(255, 215, 0, 0.3) 0%, transparent 70%);
  animation: reveal-bg-pulse 2s ease-in-out infinite;
}

@keyframes reveal-bg-pulse {
  0%, 100% { transform: translate(-50%, -50%) scale(1); opacity: 0.5; }
  50% { transform: translate(-50%, -50%) scale(1.2); opacity: 1; }
}

.reveal-rays {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 600rpx;
  height: 600rpx;
}

.ray {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 4rpx;
  height: 300rpx;
  background: linear-gradient(to bottom, rgba(255, 215, 0, 0.8), transparent);
  transform-origin: center top;
  animation: ray-rotate 4s linear infinite;
}

.ray-1 { transform: translate(-50%, 0) rotate(0deg); }
.ray-2 { transform: translate(-50%, 0) rotate(30deg); }
.ray-3 { transform: translate(-50%, 0) rotate(60deg); }
.ray-4 { transform: translate(-50%, 0) rotate(90deg); }
.ray-5 { transform: translate(-50%, 0) rotate(120deg); }
.ray-6 { transform: translate(-50%, 0) rotate(150deg); }
.ray-7 { transform: translate(-50%, 0) rotate(180deg); }
.ray-8 { transform: translate(-50%, 0) rotate(210deg); }
.ray-9 { transform: translate(-50%, 0) rotate(240deg); }
.ray-10 { transform: translate(-50%, 0) rotate(270deg); }
.ray-11 { transform: translate(-50%, 0) rotate(300deg); }
.ray-12 { transform: translate(-50%, 0) rotate(330deg); }

@keyframes ray-rotate {
  from { opacity: 0.5; }
  50% { opacity: 1; }
  to { opacity: 0.5; }
}

.reveal-frame {
  position: relative;
  width: 200rpx;
  height: 200rpx;
  margin: 0 auto 20rpx;
}

.frame-glow {
  position: absolute;
  top: -20rpx;
  left: -20rpx;
  right: -20rpx;
  bottom: -20rpx;
  border-radius: 30rpx;
  animation: frame-glow-pulse 1.5s ease-in-out infinite;
}

.frame-glow.common { background: linear-gradient(135deg, #888, #666); }
.frame-glow.rare { background: linear-gradient(135deg, #42A5F5, #1976D2); }
.frame-glow.epic { background: linear-gradient(135deg, #9C27B0, #7B1FA2); }
.frame-glow.legendary { background: linear-gradient(135deg, #FFD700, #FF8F00); box-shadow: 0 0 60rpx rgba(255, 215, 0, 0.6); }

@keyframes frame-glow-pulse {
  0%, 100% { opacity: 0.6; transform: scale(1); }
  50% { opacity: 1; transform: scale(1.05); }
}

.reveal-emoji {
  font-size: 120rpx;
  position: relative;
  z-index: 1;
  animation: emoji-bounce 0.6s ease-out;
}

@keyframes emoji-bounce {
  0% { transform: scale(0) rotate(-10deg); }
  50% { transform: scale(1.3) rotate(5deg); }
  70% { transform: scale(0.9) rotate(-3deg); }
  100% { transform: scale(1) rotate(0deg); }
}

.reveal-name {
  font-size: 36rpx;
  font-weight: bold;
  color: #FFFFFF;
  display: block;
  margin-bottom: 12rpx;
  text-shadow: 0 4rpx 20rpx rgba(0, 0, 0, 0.5);
}

.reveal-rarity {
  display: inline-flex;
  align-items: center;
  gap: 8rpx;
  padding: 8rpx 24rpx;
  border-radius: 20rpx;
}

.reveal-rarity.common { background: #757575; }
.reveal-rarity.rare { background: #2196F3; }
.reveal-rarity.epic { background: #9C27B0; }
.reveal-rarity.legendary { background: linear-gradient(135deg, #FFD700, #FF8F00); }

.rarity-text {
  font-size: 24rpx;
  color: #FFFFFF;
  font-weight: 600;
}

.rarity-stars {
  display: flex;
  gap: 2rpx;
}

.rarity-star {
  font-size: 20rpx;
  color: #FFFFFF;
}

/* Progress */
.wish-progress {
  position: absolute;
  bottom: 200rpx;
  left: 50%;
  transform: translateX(-50%);
  width: 80%;
}

.progress-track {
  height: 8rpx;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 4rpx;
  position: relative;
  overflow: visible;
}

.progress-fill {
  height: 100%;
  background: linear-gradient(90deg, #FFD700, #FFA500);
  border-radius: 4rpx;
  transition: width 0.3s ease;
}

.progress-marker {
  position: absolute;
  top: 50%;
  transform: translate(-50%, -50%);
  width: 30rpx;
  height: 30rpx;
  transition: left 0.3s ease;
}

.marker-icon {
  width: 100%;
  height: 100%;
  background: #FFD700;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 20rpx;
  color: #FFFFFF;
  box-shadow: 0 0 20rpx rgba(255, 215, 0, 0.6);
}

.marker-icon.locked {
  background: #666;
  box-shadow: none;
}

.progress-labels {
  display: flex;
  justify-content: space-between;
  margin-top: 12rpx;
}

.progress-label {
  font-size: 22rpx;
  color: rgba(255, 255, 255, 0.6);
}

/* Results List */
.results-list {
  position: absolute;
  bottom: 280rpx;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  gap: 16rpx;
  animation: slide-up 0.5s ease-out;
}

@keyframes slide-up {
  from { opacity: 0; transform: translateX(-50%) translateY(50rpx); }
  to { opacity: 1; transform: translateX(-50%) translateY(0); }
}

.result-item {
  width: 100rpx;
  padding: 16rpx;
  border-radius: 16rpx;
  text-align: center;
  background: rgba(255, 255, 255, 0.1);
  animation: result-pop 0.3s ease-out backwards;
}

.result-item.common { border: 2rpx solid #666; }
.result-item.rare { border: 2rpx solid #42A5F5; background: rgba(66, 165, 245, 0.2); }
.result-item.epic { border: 2rpx solid #9C27B0; background: rgba(156, 39, 176, 0.2); }
.result-item.legendary { border: 2rpx solid #FFD700; background: rgba(255, 215, 0, 0.2); }

@keyframes result-pop {
  from { opacity: 0; transform: scale(0.5); }
  to { opacity: 1; transform: scale(1); }
}

.result-emoji {
  font-size: 40rpx;
  display: block;
  margin-bottom: 4rpx;
}

.result-name {
  font-size: 18rpx;
  color: #FFFFFF;
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* Close Button */
.close-btn {
  position: absolute;
  bottom: 80rpx;
  left: 50%;
  transform: translateX(-50%);
  background: rgba(255, 255, 255, 0.1);
  border: 1rpx solid rgba(255, 255, 255, 0.3);
  padding: 20rpx 80rpx;
  border-radius: 50rpx;
}

.close-text {
  font-size: 28rpx;
  color: #FFFFFF;
}
</style>