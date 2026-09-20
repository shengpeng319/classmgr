// #ifdef MP-WEIXIN
const info = uni.getMenuButtonBoundingClientRect()
const sys = uni.getSystemInfoSync()
// capsule top + capsule height + 8px breathing room = header content top
export const HEADER_TOP = info.top + info.height + 8
export const STATUS_BAR = sys.statusBarHeight || 0
// distance from right edge to capsule left, so dropdowns don't sit under the capsule
export const CAPSULE_RIGHT = sys.windowWidth - info.left + 8
// #endif
// #ifndef MP-WEIXIN
export const HEADER_TOP = 12
export const STATUS_BAR = 0
export const CAPSULE_RIGHT = 15
// #endif
