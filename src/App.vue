<script setup lang="ts">
import { onLaunch, onShow, onHide } from '@dcloudio/uni-app'
import { subscribeNotify } from '@/api/schedule'

onLaunch(() => {
  // #ifdef MP-WEIXIN
  wx.cloud.init({ env: 'prod-d9gek74f6512f04e7' })
  // #endif
  console.log('App Launch')
})

onShow(() => {
  console.log('App Show')
  // 上课提醒开启时，每次回到小程序静默续订阅额度（勾过「总是保持」则无感+1）
  // #ifdef MP-WEIXIN
  if (uni.getStorageSync('notifyEnabled') === '1') {
    uni.login({
      success: (lr: any) => {
        uni.requestSubscribeMessage({
          tmplIds: ['Jm4S-Wo3KGMjUy6kW1pF21_f79UcCt1P5QjRe-cZEGM'],
          success: (res: any) => {
            if (res['Jm4S-Wo3KGMjUy6kW1pF21_f79UcCt1P5QjRe-cZEGM'] === 'accept') {
              subscribeNotify(lr.code, 1).catch(() => {})
            }
          },
          fail: () => {}
        })
      }
    })
  }
  // #endif
})

onHide(() => {
  console.log('App Hide')
})
</script>

<style>
page {
  background-color: #F0F8FF;
  font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
}
</style>
