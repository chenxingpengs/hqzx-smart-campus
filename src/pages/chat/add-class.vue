<script setup lang="ts">
import type { ClassItem } from '@/api/chat'
import { onMounted, ref } from 'vue'
import { getClasses, sendContactRequest } from '@/api/chat'

definePage({
  style: {
    navigationBarTitleText: '添加班级',
    backgroundColor: '#f5f5f5',
  },
})

const classes = ref<ClassItem[]>([])
const selectedClassId = ref<number | null>(null)
const message = ref('')
const loading = ref(false)
const submitting = ref(false)

onMounted(() => {
  loadClasses()
})

async function loadClasses() {
  loading.value = true
  try {
    const res = await getClasses()
    if (res) {
      classes.value = res as ClassItem[]
    }
  }
  catch (error) {
    console.error('加载班级列表失败:', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function selectClass(classId: number) {
  selectedClassId.value = classId
}

function isClassSelected(classId: number) {
  return selectedClassId.value === classId
}

async function handleSendRequest() {
  if (!selectedClassId.value) {
    uni.showToast({ title: '请选择班级', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res = await sendContactRequest({
      target_class_id: selectedClassId.value,
      message: message.value.trim(),
    })

    if (res && res.id) {
      uni.showToast({
        title: '请求已发送，等待班主任同意',
        icon: 'success',
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
    else {
      uni.showToast({ title: '发送失败', icon: 'none' })
    }
  }
  catch (error: any) {
    console.error('发送请求失败:', error)
    uni.showToast({
      title: error?.msg || '发送失败',
      icon: 'none',
    })
  }
  finally {
    submitting.value = false
  }
}

function handleCancel() {
  uni.navigateBack()
}
</script>

<template>
  <view class="add-class-page">
    <view class="class-list-section">
      <view class="section-title">
        选择班级
      </view>

      <view v-if="loading" class="loading">
        <text>加载中...</text>
      </view>

      <view v-else class="class-list">
        <view
          v-for="cls in classes"
          :key="cls.id"
          class="class-item"
          :class="{ selected: isClassSelected(cls.id) }"
          @click="selectClass(cls.id)"
        >
          <view class="radio">
            <view v-if="isClassSelected(cls.id)" class="radio-inner" />
          </view>
          <view class="class-icon">
            🏫
          </view>
          <view class="class-info">
            <text class="class-name">{{ cls.name }}</text>
            <text class="class-desc">{{ cls.grade }} · {{ cls.student_count }} 名学生</text>
          </view>
        </view>
      </view>

      <view v-if="!loading && classes.length === 0" class="empty">
        <text>暂无可用班级</text>
      </view>
    </view>

    <view v-if="selectedClassId" class="message-section">
      <view class="section-title">
        申请留言（可选）
      </view>
      <textarea
        v-model="message"
        class="textarea"
        placeholder="请输入申请理由（选填）"
        maxlength="100"
      />
    </view>

    <view v-if="selectedClassId" class="tip-section">
      <view class="tip-icon">
        ℹ️
      </view>
      <text class="tip-text">发送后需等待该班级班主任同意才能加入群聊</text>
    </view>

    <view v-if="selectedClassId" class="button-group">
      <button
        class="btn cancel-btn"
        :disabled="submitting"
        @click="handleCancel"
      >
        取消
      </button>
      <button
        class="btn confirm-btn"
        :disabled="submitting"
        @click="handleSendRequest"
      >
        {{ submitting ? '发送中...' : '发送请求' }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.add-class-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  box-sizing: border-box;
}

.section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 20rpx;
}

.class-list-section,
.message-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;

  .loading,
  .empty {
    padding: 40rpx;
    text-align: center;
    color: #999;
    font-size: 26rpx;
  }
}

.class-list {
  .class-item {
    display: flex;
    align-items: center;
    padding: 24rpx;
    background: #f9f9f9;
    border-radius: 12rpx;
    margin-bottom: 16rpx;

    &:last-child {
      margin-bottom: 0;
    }

    &.selected {
      background: #fff3e0;
    }

    &:active {
      opacity: 0.8;
    }

    .radio {
      width: 40rpx;
      height: 40rpx;
      border: 3rpx solid #ddd;
      border-radius: 50%;
      margin-right: 20rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;

      .radio-inner {
        width: 24rpx;
        height: 24rpx;
        background: #ff9800;
        border-radius: 50%;
      }
    }

    &.selected .radio {
      border-color: #ff9800;
    }

    .class-icon {
      width: 72rpx;
      height: 72rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      font-size: 36rpx;
      margin-right: 20rpx;
      flex-shrink: 0;
    }

    .class-info {
      flex: 1;

      .class-name {
        font-size: 28rpx;
        font-weight: 500;
        color: #333;
        display: block;
      }

      .class-desc {
        font-size: 24rpx;
        color: #999;
        margin-top: 6rpx;
        display: block;
      }
    }
  }
}

.textarea {
  width: 100%;
  height: 160rpx;
  padding: 20rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.tip-section {
  display: flex;
  align-items: center;
  padding: 20rpx 24rpx;
  background: #fff8e1;
  border-radius: 12rpx;
  margin-bottom: 24rpx;

  .tip-icon {
    font-size: 28rpx;
    margin-right: 12rpx;
  }

  .tip-text {
    font-size: 24rpx;
    color: #f57c00;
    line-height: 1.4;
  }
}

.button-group {
  display: flex;
  gap: 20rpx;

  .btn {
    flex: 1;
    height: 88rpx;
    line-height: 88rpx;
    text-align: center;
    font-size: 30rpx;
    border-radius: 12rpx;
    border: none;

    &[disabled] {
      opacity: 0.6;
    }
  }

  .cancel-btn {
    background: #f5f5f5;
    color: #666;
  }

  .confirm-btn {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
    color: #fff;
  }
}
</style>
