let deviceId = ''

export function getDeviceId(): string {
  if (deviceId) return deviceId
  
  deviceId = uni.getStorageSync('deviceId')
  if (!deviceId) {
    deviceId = 'device_' + Date.now() + '_' + Math.random().toString(36).substr(2, 9)
    uni.setStorageSync('deviceId', deviceId)
  }
  return deviceId
}
