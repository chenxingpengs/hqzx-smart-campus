<script lang="ts" setup>
import { HOME_PAGE } from '@/utils'

definePage({
  style: {
    navigationStyle: 'custom',
  },
})

function goBack() {
  uni.switchTab({ url: HOME_PAGE })
}
</script>

<template>
  <view class="container">
    <!-- 404 大标题（单独显示，上下浮动） -->
    <view class="error-header">
      <view class="title-404">
        404
      </view>
    </view>

    <!-- 页面标题（渐入动画） -->
    <view class="page-title animate-fade-in">
      页面不存在或无法访问
    </view>

    <!-- 详细提示信息（依次渐入） -->
    <view class="tip-container">
      <view class="common-tip animate-fade-in" style="animation-delay: 0.2s">
        您所访问的页面可能因以下原因无法正常显示：
      </view>

      <view class="reason-list">
        <view class="reason-item animate-slide-up" style="animation-delay: 0.4s">
          <view class="dot" />
          <view class="reason-text">
            页面路径已修改或已被移除
          </view>
        </view>
        <view class="reason-item animate-slide-up" style="animation-delay: 0.8s">
          <view class="dot" />
          <view class="reason-text">
            系统功能升级或维护中
          </view>
        </view>
        <view class="reason-item animate-slide-up" style="animation-delay: 1s">
          <view class="dot" />
          <view class="reason-text">
            链接地址输入错误或已失效
          </view>
        </view>
      </view>

      <!-- 重要提示（闪烁+渐入） -->
      <view class="important-tip animate-fade-in animate-pulse" style="animation-delay: 1.2s">
        <view class="tip-title">
          重要提示：
        </view>
        <view class="tip-content">
          如您需要使用本页面提供的功能，请联系技术支持，并将跳转到本页面的完整过程录屏提供，以便快速定位问题。
        </view>
      </view>
    </view>

    <!-- 返回首页按钮（悬浮动画+点击效果） -->
    <button class="back-btn animate-fade-in" style="animation-delay: 1.5s" @click="goBack">
      返回首页
    </button>
  </view>
</template>

<style scoped>
/* 页面容器 */
.container {
  height: 100vh;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 0 30rpx;
  background-color: #f9fafb;
  overflow: hidden;
}

/* 错误头部（仅404标题） */
.error-header {
  display: flex;
  align-items: center;
  justify-content: center;
  margin-bottom: 30rpx;
  position: relative;
}

/* 404标题（上下浮动+呼吸动画，去掉旋转） */
.title-404 {
  font-size: 180rpx;
  font-weight: 900;
  color: #1f2937;
  animation:
    float 3s ease-in-out infinite,
    breathe 3s ease-in-out infinite;
  position: relative;
  z-index: 2;
  text-shadow: 0 10rpx 30rpx rgba(0, 0, 0, 0.1);
}

/* 装饰背景（动态圆圈，优化大小适配404） */
.error-header::before {
  content: '';
  position: absolute;
  width: 280rpx;
  height: 280rpx;
  border-radius: 50%;
  background-color: rgba(59, 130, 246, 0.15);
  animation: scale 6s ease-in-out infinite;
  z-index: 1;
}

/* 页面标题 */
.page-title {
  font-size: 42rpx;
  font-weight: 700;
  color: #374151;
  margin-bottom: 40rpx;
  letter-spacing: 2rpx;
}

/* 提示容器 */
.tip-container {
  width: 100%;
  max-width: 650rpx;
  color: #6b7280;
  line-height: 1.8;
  margin-bottom: 50rpx;
}

/* 普通提示 */
.common-tip {
  margin-bottom: 30rpx;
  font-size: 30rpx;
  font-weight: 500;
}

/* 原因列表 */
.reason-list {
  margin-bottom: 50rpx;
}

/* 原因项 */
.reason-item {
  display: flex;
  align-items: flex-start;
  margin-bottom: 24rpx;
  font-size: 28rpx;
  opacity: 0;
}

/* 圆点（缩放动画） */
.dot {
  width: 10rpx;
  height: 10rpx;
  background-color: #3b82f6;
  border-radius: 50%;
  margin-top: 16rpx;
  margin-right: 20rpx;
  flex-shrink: 0;
  animation: dotScale 2s ease-in-out infinite;
}

/* 原因文本 */
.reason-text {
  flex: 1;
  transition: color 0.3s ease;
}

/* 原因项 hover 效果 */
.reason-item:hover .reason-text {
  color: #3b82f6;
}

/* 重要提示 */
.important-tip {
  padding: 30rpx;
  background-color: rgba(249, 115, 22, 0.08);
  border-radius: 16rpx;
  border-left: 8rpx solid #f97316;
  color: #f97316;
}

/* 提示标题 */
.tip-title {
  font-weight: 700;
  margin-bottom: 16rpx;
  font-size: 32rpx;
}

/* 提示内容 */
.tip-content {
  font-size: 26rpx;
  line-height: 1.8;
}

/* 返回按钮 */
.back-btn {
  width: 360rpx;
  height: 96rpx;
  background: linear-gradient(135deg, #3b82f6 0%, #2563eb 100%);
  color: #ffffff;
  font-size: 32rpx;
  font-weight: 600;
  border-radius: 48rpx;
  margin-bottom: 40rpx;
  box-shadow: 0 10rpx 25rpx rgba(59, 130, 246, 0.3);
  transition: all 0.3s ease;
  opacity: 0;
}

/* 按钮 hover 效果 */
.back-btn:hover {
  transform: translateY(-4rpx);
  box-shadow: 0 15rpx 30rpx rgba(59, 130, 246, 0.4);
}

/* 按钮点击效果 */
.back-btn:active {
  transform: scale(0.96) translateY(-2rpx);
  box-shadow: 0 5rpx 15rpx rgba(59, 130, 246, 0.3);
  background: linear-gradient(135deg, #2563eb 0%, #1d4ed8 100%);
}

/* 呼吸动画 */
@keyframes breathe {
  0% {
    opacity: 0.8;
    transform: scale(1);
  }
  50% {
    opacity: 1;
    transform: scale(1.08);
  }
  100% {
    opacity: 0.8;
    transform: scale(1);
  }
}

/* 上下浮动动画（增强浮动幅度，更明显） */
@keyframes float {
  0% {
    transform: translateY(0rpx);
  }
  50% {
    transform: translateY(-30rpx);
  }
  100% {
    transform: translateY(0rpx);
  }
}

/* 缩放动画 */
@keyframes scale {
  0% {
    transform: scale(1);
    opacity: 0.3;
  }
  50% {
    transform: scale(1.6);
    opacity: 0.1;
  }
  100% {
    transform: scale(1);
    opacity: 0.3;
  }
}

/* 圆点缩放动画 */
@keyframes dotScale {
  0% {
    transform: scale(1);
  }
  50% {
    transform: scale(1.5);
  }
  100% {
    transform: scale(1);
  }
}

/* 渐入动画 */
@keyframes fadeIn {
  from {
    opacity: 0;
    transform: translateY(20rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 上滑动画 */
@keyframes slideUp {
  from {
    opacity: 0;
    transform: translateY(30rpx);
  }
  to {
    opacity: 1;
    transform: translateY(0);
  }
}

/* 轻微闪烁动画 */
@keyframes pulse {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.9;
  }
  100% {
    opacity: 1;
  }
}

/* 动画类 */
.animate-fade-in {
  animation: fadeIn 0.8s ease-out forwards;
}

.animate-slide-up {
  animation: slideUp 0.8s ease-out forwards;
}

.animate-pulse {
  animation: pulse 2s ease-in-out infinite;
}

/* 移动端适配 */
@media (max-width: 320px) {
  .title-404 {
    font-size: 150rpx;
  }
  .page-title {
    font-size: 38rpx;
  }
  .common-tip {
    font-size: 28rpx;
  }
  .reason-text {
    font-size: 26rpx;
  }
  .back-btn {
    width: 320rpx;
    height: 88rpx;
    font-size: 30rpx;
  }
}
</style>
