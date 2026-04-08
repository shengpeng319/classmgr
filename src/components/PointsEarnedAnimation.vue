<template>
  <view class="animation-overlay" v-if="visible" @click="hide">
    <view class="stars">
      <view v-for="i in 12" :key="i" class="star" :class="`star-${i}`">
        <text class="star-icon">⭐</text>
      </view>
    </view>
    
    <view class="confetti">
      <view v-for="i in 20" :key="i" class="confetti-piece" :class="`confetti-${i}`"></view>
    </view>
    
    <view class="coin-container">
      <view class="coin" :class="{ bounce: visible }">
        <text class="coin-text">+{{ points }}</text>
      </view>
    </view>
    
    <view class="message-container">
      <text class="encourage-text" :class="{ fadeIn: visible }">{{ encourageText }}</text>
    </view>
    
    <view class="sparkles">
      <view v-for="i in 8" :key="i" class="sparkle" :class="`sparkle-${i}`">
        <text class="sparkle-icon">✨</text>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import { ref, watch, computed } from 'vue'

const props = defineProps<{
  show: boolean
  points: number
  taskTitle?: string
}>()

const emit = defineEmits<{
  (e: 'close'): void
}>()

const visible = ref(false)

const encourageMessages = [
  '太棒了！',
  '做得好！',
  '真厉害！',
  '继续加油！',
  '好样的！',
  '了不起！',
  '你真棒！',
  '继续保持！'
]

const encourageText = ref('')

watch(() => props.show, (newVal) => {
  if (newVal) {
    visible.value = true
    encourageText.value = encourageMessages[Math.floor(Math.random() * encourageMessages.length)]
    
    setTimeout(() => {
      hide()
    }, 2500)
  }
})

const hide = () => {
  visible.value = false
  setTimeout(() => {
    emit('close')
  }, 400)
}
</script>

<style scoped>
.animation-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  z-index: 9999;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  background: rgba(0, 0, 0, 0.4);
  animation: fadeIn 0.3s ease;
}

@keyframes fadeIn {
  from { opacity: 0; }
  to { opacity: 1; }
}

/* Floating stars */
.stars {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.star {
  position: absolute;
  opacity: 0;
  animation: starFloat 2s ease-out forwards;
}

.star-1 { top: 15%; left: 10%; animation-delay: 0.1s; }
.star-2 { top: 20%; left: 85%; animation-delay: 0.2s; }
.star-3 { top: 70%; left: 5%; animation-delay: 0.3s; }
.star-4 { top: 75%; left: 90%; animation-delay: 0.15s; }
.star-5 { top: 40%; left: 3%; animation-delay: 0.25s; }
.star-6 { top: 45%; left: 95%; animation-delay: 0.35s; }
.star-7 { top: 10%; left: 50%; animation-delay: 0.4s; }
.star-8 { top: 85%; left: 45%; animation-delay: 0.45s; }
.star-9 { top: 25%; left: 25%; animation-delay: 0.5s; }
.star-10 { top: 30%; left: 70%; animation-delay: 0.55s; }
.star-11 { top: 60%; left: 15%; animation-delay: 0.6s; }
.star-12 { top: 65%; left: 80%; animation-delay: 0.65s; }

.star-icon {
  font-size: 40rpx;
}

@keyframes starFloat {
  0% {
    opacity: 0;
    transform: translateY(0) scale(0.5) rotate(0deg);
  }
  20% {
    opacity: 1;
    transform: translateY(-20rpx) scale(1.2) rotate(45deg);
  }
  100% {
    opacity: 0;
    transform: translateY(-150rpx) scale(0.8) rotate(180deg);
  }
}

/* Confetti */
.confetti {
  position: absolute;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.confetti-piece {
  position: absolute;
  width: 20rpx;
  height: 20rpx;
  border-radius: 4rpx;
  animation: confettiFall 2.5s ease-out forwards;
}

.confetti-1 { background: #FFD700; left: 10%; animation-delay: 0.1s; }
.confetti-2 { background: #FF6B6B; left: 20%; animation-delay: 0.2s; }
.confetti-3 { background: #4ECDC4; left: 30%; animation-delay: 0.15s; }
.confetti-4 { background: #FFE66D; left: 40%; animation-delay: 0.25s; }
.confetti-5 { background: #95E1D3; left: 50%; animation-delay: 0.3s; }
.confetti-6 { background: #F38181; left: 60%; animation-delay: 0.18s; }
.confetti-7 { background: #AA96DA; left: 70%; animation-delay: 0.35s; }
.confetti-8 { background: #FCBAD3; left: 80%; animation-delay: 0.22s; }
.confetti-9 { background: #A8D8EA; left: 15%; animation-delay: 0.4s; }
.confetti-10 { background: #FFD93D; left: 25%; animation-delay: 0.28s; }
.confetti-11 { background: #6BCB77; left: 35%; animation-delay: 0.33s; }
.confetti-12 { background: #4D96FF; left: 45%; animation-delay: 0.38s; }
.confetti-13 { background: #FF6B6B; left: 55%; animation-delay: 0.42s; }
.confetti-14 { background: #FFD700; left: 65%; animation-delay: 0.2s; }
.confetti-15 { background: #FF8CC8; left: 75%; animation-delay: 0.48s; }
.confetti-16 { background: #00D2FF; left: 85%; animation-delay: 0.32s; }
.confetti-17 { background: #FFE66D; left: 8%; animation-delay: 0.45s; }
.confetti-18 { background: #95E1D3; left: 92%; animation-delay: 0.36s; }
.confetti-19 { background: #F38181; left: 3%; animation-delay: 0.5s; }
.confetti-20 { background: #AA96DA; left: 97%; animation-delay: 0.28s; }

@keyframes confettiFall {
  0% {
    opacity: 1;
    transform: translateY(-100rpx) rotate(0deg);
  }
  100% {
    opacity: 0;
    transform: translateY(110vh) rotate(720deg);
  }
}

/* Coin */
.coin-container {
  position: relative;
  z-index: 10;
}

.coin {
  width: 200rpx;
  height: 200rpx;
  background: linear-gradient(135deg, #FFD700 0%, #FFA500 50%, #FFD700 100%);
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  box-shadow: 
    0 0 60rpx rgba(255, 215, 0, 0.8),
    0 20rpx 40rpx rgba(0, 0, 0, 0.3),
    inset 0 -10rpx 30rpx rgba(0, 0, 0, 0.2),
    inset 0 10rpx 30rpx rgba(255, 255, 255, 0.5);
  opacity: 0;
  transform: scale(0.5);
}

.coin.bounce {
  animation: coinBounce 0.8s cubic-bezier(0.34, 1.56, 0.64, 1) forwards;
}

@keyframes coinBounce {
  0% {
    opacity: 0;
    transform: scale(0.5);
  }
  50% {
    opacity: 1;
    transform: scale(1.3);
  }
  70% {
    transform: scale(0.9);
  }
  100% {
    opacity: 1;
    transform: scale(1);
  }
}

.coin-text {
  font-size: 64rpx;
  font-weight: bold;
  color: #FFFFFF;
  text-shadow: 
    2rpx 2rpx 4rpx rgba(0, 0, 0, 0.3),
    0 0 20rpx rgba(255, 255, 255, 0.5);
}

/* Encouraging message */
.message-container {
  position: relative;
  z-index: 10;
  margin-top: 40rpx;
}

.encourage-text {
  font-size: 56rpx;
  font-weight: bold;
  color: #FFFFFF;
  text-shadow: 
    4rpx 4rpx 8rpx rgba(0, 0, 0, 0.3),
    0 0 30rpx rgba(255, 215, 0, 0.5);
  opacity: 0;
  transform: translateY(30rpx);
}

.encourage-text.fadeIn {
  animation: messageFadeIn 0.6s ease forwards;
  animation-delay: 0.4s;
}

@keyframes messageFadeIn {
  0% {
    opacity: 0;
    transform: translateY(30rpx) scale(0.8);
  }
  100% {
    opacity: 1;
    transform: translateY(0) scale(1);
  }
}

/* Sparkles around coin */
.sparkles {
  position: absolute;
  width: 400rpx;
  height: 400rpx;
  top: 50%;
  left: 50%;
  margin-top: -200rpx;
  margin-left: -200rpx;
  pointer-events: none;
}

.sparkle {
  position: absolute;
  opacity: 0;
}

.sparkle-1 { top: 5%; left: 45%; animation: sparkleAnim 0.6s ease forwards 0.2s; }
.sparkle-2 { top: 15%; left: 85%; animation: sparkleAnim 0.6s ease forwards 0.3s; }
.sparkle-3 { top: 45%; left: 95%; animation: sparkleAnim 0.6s ease forwards 0.4s; }
.sparkle-4 { top: 80%; left: 85%; animation: sparkleAnim 0.6s ease forwards 0.5s; }
.sparkle-5 { top: 90%; left: 45%; animation: sparkleAnim 0.6s ease forwards 0.6s; }
.sparkle-6 { top: 80%; left: 10%; animation: sparkleAnim 0.6s ease forwards 0.7s; }
.sparkle-7 { top: 45%; left: 0%; animation: sparkleAnim 0.6s ease forwards 0.8s; }
.sparkle-8 { top: 15%; left: 10%; animation: sparkleAnim 0.6s ease forwards 0.9s; }

.sparkle-icon {
  font-size: 32rpx;
}

@keyframes sparkleAnim {
  0% {
    opacity: 0;
    transform: scale(0) rotate(0deg);
  }
  50% {
    opacity: 1;
    transform: scale(1.5) rotate(180deg);
  }
  100% {
    opacity: 0;
    transform: scale(0) rotate(360deg);
  }
}
</style>