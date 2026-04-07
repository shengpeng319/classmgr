<template>
  <view class="container">
    <CommonHeader title="抽卡" />
    <view class="content">
      <view class="pool-section">
        <view class="section-header">
          <text class="section-title">卡池</text>
          <text class="card-count">{{ availableCards.length }} 张卡牌</text>
        </view>
        <view class="card-grid" v-if="!loadingCards && availableCards.length > 0">
          <view class="card-item" v-for="card in availableCards" :key="card.id" :class="card.rarity">
            <view class="card-inner">
              <view class="card-rarity-badge" :class="card.rarity">{{ getRarityText(card.rarity) }}</view>
              <view class="card-image-placeholder"><text class="card-emoji">{{ getCardEmoji(card.rarity) }}</text></view>
              <text class="card-name">{{ card.name }}</text>
            </view>
          </view>
        </view>
        <view class="empty-pool" v-else-if="!loadingCards"><text class="empty-text">暂无可抽取的卡牌</text></view>
        <view class="loading-pool" v-else><text class="loading-text">加载中...</text></view>
      </view>
      <view class="draw-section">
        <button class="draw-btn" :class="{ disabled: isDrawing }" @click="handleDraw" :disabled="isDrawing">
          <view class="draw-btn-inner" v-if="!isDrawing"><text class="draw-icon">✨</text><text class="draw-text">免费抽卡</text></view>
          <view class="draw-btn-inner" v-else><text class="draw-text">抽卡中...</text></view>
        </button>
      </view>
      <view class="my-cards-section">
        <view class="section-header">
          <text class="section-title">我的收藏</text>
          <text class="card-count">{{ myCards.length }} 张</text>
        </view>
        <view class="my-card-list" v-if="!loadingMyCards && myCards.length > 0">
          <view class="my-card-item" v-for="item in myCards" :key="item.id" :class="item.card.rarity">
            <view class="my-card-inner">
              <view class="card-rarity-badge small" :class="item.card.rarity">{{ getRarityText(item.card.rarity) }}</view>
              <text class="my-card-emoji">{{ getCardEmoji(item.card.rarity) }}</text>
              <text class="my-card-name">{{ item.card.name }}</text>
              <text class="my-card-date">{{ formatDate(item.drawnAt) }}</text>
            </view>
          </view>
        </view>
        <view class="empty-my-cards" v-else-if="!loadingMyCards"><text class="empty-text">暂无收藏，快去抽卡吧！</text></view>
        <view class="loading-my-cards" v-else><text class="loading-text">加载中...</text></view>
      </view>
    </view>
    <view class="result-modal" v-if="showResult" @click="closeResult">
      <view class="result-content" @click.stop>
        <view class="result-card" :class="drawnCard?.rarity">
          <view class="result-glow"></view>
          <view class="result-rarity" :class="drawnCard?.rarity">{{ getRarityText(drawnCard?.rarity || 'common') }}</view>
          <view class="result-image"><text class="result-emoji">{{ getCardEmoji(drawnCard?.rarity || 'common') }}</text></view>
          <text class="result-name">{{ drawnCard?.name }}</text>
          <text class="result-desc" v-if="drawnCard?.description">{{ drawnCard.description }}</text>
        </view>
        <view class="result-actions">
          <button class="result-btn continue" @click="closeResult"><text class="btn-text">再来一次</text></button>
          <button class="result-btn close" @click="closeResult"><text class="btn-text">关闭</text></button>
        </view>
      </view>
    </view>
  </view>
</template>
<script setup lang="ts">
import { ref, onMounted } from "vue"
import CommonHeader from "@/components/CommonHeader.vue"
import { getLotteryCards, drawCard, getMyCards } from "@/api/lottery"
import type { Card, DrawResult, StudentCard } from "@/api/lottery"

const availableCards = ref<Card[]>([])
const myCards = ref<StudentCard[]>([])
const loadingCards = ref(false)
const loadingMyCards = ref(false)
const isDrawing = ref(false)
const showResult = ref(false)
const drawnCard = ref<Card | null>(null)

const getRarityText = (rarity: string): string => {
  const map: Record<string, string> = { common: "普通", rare: "稀有", epic: "史诗", legendary: "传说" }
  return map[rarity] || rarity
}

const getCardEmoji = (rarity: string): string => {
  const map: Record<string, string> = { common: "🌟", rare: "💎", epic: "👑", legendary: "🔮" }
  return map[rarity] || "🌟"
}

const formatDate = (dateStr: string): string => {
  const date = new Date(dateStr)
  return `${date.getFullYear()}/${date.getMonth() + 1}/${date.getDate()}`
}

const loadAvailableCards = async () => {
  loadingCards.value = true
  try {
    const res = await getLotteryCards()
    if (res.code === 0) availableCards.value = res.data
  } catch (e) { console.error("Failed to load cards", e) }
  finally { loadingCards.value = false }
}

const loadMyCards = async () => {
  loadingMyCards.value = true
  try {
    const res = await getMyCards()
    if (res.code === 0) myCards.value = res.data
  } catch (e) { console.error("Failed to load my cards", e) }
  finally { loadingMyCards.value = false }
}

const handleDraw = async () => {
  if (isDrawing.value) return
  isDrawing.value = true
  try {
    const res = await drawCard()
    if (res.code === 0) {
      drawnCard.value = res.data.card
      showResult.value = true
      loadMyCards()
    } else {
      uni.showToast({ title: res.message || "抽卡失败", icon: "none" })
    }
  } catch (e: any) { uni.showToast({ title: e.message || "网络错误", icon: "none" }) }
  finally { isDrawing.value = false }
}

const closeResult = () => { showResult.value = false; drawnCard.value = null }

onMounted(() => { loadAvailableCards(); loadMyCards() })
</script>
<style scoped>
.container { min-height: 100vh; background: linear-gradient(180deg, #FFF5E6 0%, #FFE5E5 50%, #F0F8FF 100%); padding: 20rpx 30rpx; }
.content { padding-top: 20rpx; }
.section-header { display: flex; justify-content: space-between; align-items: center; margin-bottom: 24rpx; }
.section-title { font-size: 32rpx; font-weight: 600; color: #333; }
.card-count { font-size: 24rpx; color: #999; }
.pool-section { background: #FFFFFF; border-radius: 24rpx; padding: 30rpx; margin-bottom: 30rpx; box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06); }
.card-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20rpx; }
.card-item { position: relative; border-radius: 16rpx; overflow: hidden; }
.card-item.common .card-inner { background: linear-gradient(135deg, #F5F5F5 0%, #E0E0E0 100%); border: 2rpx solid #BDBDBD; }
.card-item.rare .card-inner { background: linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%); border: 2rpx solid #42A5F5; }
.card-item.epic .card-inner { background: linear-gradient(135deg, #F3E5F5 0%, #CE93D8 100%); border: 2rpx solid #9C27B0; }
.card-item.legendary .card-inner { background: linear-gradient(135deg, #FFF8E1 0%, #FFD54F 100%); border: 2rpx solid #FF8F00; box-shadow: 0 0 20rpx rgba(255, 143, 0, 0.3); }
.card-inner { padding: 20rpx 16rpx; text-align: center; }
.card-rarity-badge { position: absolute; top: 8rpx; right: 8rpx; font-size: 18rpx; padding: 4rpx 10rpx; border-radius: 12rpx; color: #FFFFFF; }
.card-rarity-badge.common { background: #757575; }
.card-rarity-badge.rare { background: #2196F3; }
.card-rarity-badge.epic { background: #9C27B0; }
.card-rarity-badge.legendary { background: #FF8F00; }
.card-rarity-badge.small { position: static; display: inline-block; font-size: 16rpx; padding: 2rpx 8rpx; margin-bottom: 8rpx; }
.card-image-placeholder { width: 80rpx; height: 80rpx; margin: 0 auto 12rpx; display: flex; align-items: center; justify-content: center; }
.card-emoji { font-size: 60rpx; }
.card-name { font-size: 24rpx; color: #333; display: block; margin-bottom: 8rpx; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.empty-pool, .empty-my-cards { text-align: center; padding: 40rpx 0; }
.empty-text, .loading-text { font-size: 28rpx; color: #AAA; }
.draw-section { margin-bottom: 30rpx; text-align: center; }
.draw-btn { width: 100%; height: 120rpx; background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); border-radius: 60rpx; border: none; box-shadow: 0 12rpx 30rpx rgba(255, 107, 107, 0.4); padding: 0; }
.draw-btn.disabled { background: linear-gradient(135deg, #BDBDBD 0%, #9E9E9E 100%); box-shadow: none; }
.draw-btn-inner { display: flex; align-items: center; justify-content: center; gap: 12rpx; }
.draw-icon { font-size: 36rpx; }
.draw-text { font-size: 34rpx; font-weight: 600; color: #FFFFFF; }
.my-cards-section { background: #FFFFFF; border-radius: 24rpx; padding: 30rpx; box-shadow: 0 8rpx 20rpx rgba(0, 0, 0, 0.06); }
.my-card-list { display: grid; grid-template-columns: repeat(3, 1fr); gap: 16rpx; }
.my-card-item { text-align: center; }
.my-card-inner { padding: 16rpx 8rpx; border-radius: 12rpx; }
.my-card-item.common .my-card-inner { background: #F5F5F5; }
.my-card-item.rare .my-card-inner { background: #E3F2FD; }
.my-card-item.epic .my-card-inner { background: #F3E5F5; }
.my-card-item.legendary .my-card-inner { background: #FFF8E1; }
.my-card-emoji { font-size: 40rpx; display: block; margin-bottom: 8rpx; }
.my-card-name { font-size: 20rpx; color: #333; display: block; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
.my-card-date { font-size: 16rpx; color: #999; display: block; margin-top: 4rpx; }
.result-modal { position: fixed; top: 0; left: 0; right: 0; bottom: 0; background: rgba(0, 0, 0, 0.7); display: flex; align-items: center; justify-content: center; z-index: 999; }
.result-content { width: 600rpx; text-align: center; }
.result-card { position: relative; padding: 60rpx 40rpx; border-radius: 32rpx; margin-bottom: 30rpx; overflow: hidden; }
.result-card.common { background: linear-gradient(135deg, #F5F5F5 0%, #E0E0E0 100%); }
.result-card.rare { background: linear-gradient(135deg, #E3F2FD 0%, #90CAF9 100%); }
.result-card.epic { background: linear-gradient(135deg, #F3E5F5 0%, #CE93D8 100%); }
.result-card.legendary { background: linear-gradient(135deg, #FFF8E1 0%, #FFD54F 100%); box-shadow: 0 0 60rpx rgba(255, 215, 0, 0.5); }
.result-glow { position: absolute; top: -50%; left: -50%; width: 200%; height: 200%; background: radial-gradient(circle, rgba(255, 255, 255, 0.3) 0%, transparent 60%); animation: glow-pulse 2s ease-in-out infinite; }
@keyframes glow-pulse { 0%, 100% { opacity: 0.5; transform: scale(1); } 50% { opacity: 1; transform: scale(1.1); } }
.result-rarity { position: relative; display: inline-block; font-size: 24rpx; padding: 8rpx 24rpx; border-radius: 20rpx; color: #FFFFFF; margin-bottom: 20rpx; }
.result-rarity.common { background: #757575; }
.result-rarity.rare { background: #2196F3; }
.result-rarity.epic { background: #9C27B0; }
.result-rarity.legendary { background: #FF8F00; }
.result-image { position: relative; margin-bottom: 20rpx; }
.result-emoji { font-size: 120rpx; display: block; animation: bounce-in 0.5s ease-out; }
@keyframes bounce-in { 0% { transform: scale(0); opacity: 0; } 50% { transform: scale(1.2); } 100% { transform: scale(1); opacity: 1; } }
.result-name { position: relative; font-size: 36rpx; font-weight: bold; color: #333; display: block; margin-bottom: 12rpx; }
.result-desc { font-size: 26rpx; color: #666; display: block; margin-bottom: 20rpx; }
.result-actions { display: flex; gap: 32rpx; }
.result-btn { flex: 1; height: 88rpx; border-radius: 44rpx; border: none; font-size: 28rpx; }
.result-btn.continue { background: linear-gradient(135deg, #FF6B6B 0%, #FF8E53 100%); }
.result-btn.close { background: #F0F0F0; }
.result-btn .btn-text { color: #FFFFFF; font-weight: 600; }
.result-btn.close .btn-text { color: #666; }
</style>