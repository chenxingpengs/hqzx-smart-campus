<script setup lang="ts">
import type { ClassItem } from '@/api/chat'
import { onMounted, ref } from 'vue'
import { createClassGroup, getMyClasses } from '@/api/chat'

definePage({
  style: {
    navigationBarTitleText: '创建班级群聊',
    backgroundColor: '#f5f5f5',
  },
})

const classes = ref<ClassItem[]>([])
const selectedClassId = ref<number | null>(null)
const groupName = ref('')
const loading = ref(false)
const submitting = ref(false)

onMounted(() => {
  loadClasses()
})

async function loadClasses() {
  loading.value = true
  try {
    const res = await getMyClasses()
    if (res) {
      classes.value = (res as ClassItem[]).filter((cls: ClassItem) => !cls.has_group)
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

function selectClass(classId: number, className: string) {
  selectedClassId.value = classId
  groupName.value = `${className}群`
}

function isClassSelected(classId: number) {
  return selectedClassId.value === classId
}

async function handleCreate() {
  if (!selectedClassId.value) {
    uni.showToast({ title: '请选择班级', icon: 'none' })
    return
  }

  if (!groupName.value.trim()) {
    uni.showToast({ title: '请输入群聊名称', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res = await createClassGroup({
      class_id: selectedClassId.value,
      name: groupName.value.trim(),
    })

    if (res && res.id) {
      uni.showToast({
        title: res.msg || '创建成功',
        icon: 'success',
      })
      setTimeout(() => {
        uni.navigateBack()
      }, 1500)
    }
    else {
      uni.showToast({ title: '创建失败', icon: 'none' })
    }
  }
  catch (error: any) {
    console.error('创建班级群聊失败:', error)
    uni.showToast({
      title: error?.msg || '创建失败',
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
  <view class="create-group-page">
    <view class="form-section">
      <view class="section-title">
        选择班级
      </view>
      <view class="class-list">
        <view
          v-if="loading"
          class="loading"
        >
          <text>加载中...</text>
        </view>

        <view
          v-else-if="classes.length === 0"
          class="empty"
        >
          <text v-if="!loading">暂无可用的班级（可能已全部创建群聊）</text>
        </view>

        <view
          v-for="cls in classes"
          :key="cls.id"
          class="class-item"
          :class="{ selected: isClassSelected(cls.id) }"
          @click="selectClass(cls.id, cls.name)"
        >
          <view class="radio">
            <view v-if="isClassSelected(cls.id)" class="radio-inner" />
          </view>
          <view class="class-info">
            <text class="class-name">{{ cls.name }}</text>
            <text class="class-desc">{{ cls.grade }} · {{ cls.student_count }} 名学生</text>
          </view>
        </view>
      </view>
    </view>

    <view class="form-section">
      <view class="section-title">
        群聊名称
      </view>
      <input
        v-model="groupName"
        class="input"
        placeholder="请输入群聊名称"
        maxlength="20"
      >
    </view>

    <view class="tip-section">
      <view class="tip-icon">
        ℹ️
      </view>
      <view class="tip-text">
        <text class="tip-title">提示</text>
        <text class="tip-content">创建后，该班级的所有学生将自动加入群聊</text>
      </view>
    </view>

    <view class="button-group">
      <button
        class="btn cancel-btn"
        :disabled="submitting"
        @click="handleCancel"
      >
        取消
      </button>
      <button
        class="btn confirm-btn"
        :disabled="submitting || !selectedClassId"
        @click="handleCreate"
      >
        {{ submitting ? '创建中...' : '创建群聊' }}
      </button>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.create-group-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  box-sizing: border-box;
}

.form-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;

  .section-title {
    font-size: 28rpx;
    font-weight: 500;
    color: #333;
    margin-bottom: 20rpx;
  }
}

.class-list {
  .loading,
  .empty {
    padding: 40rpx;
    text-align: center;
    color: #999;
    font-size: 26rpx;
  }
}

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
    background: #e3f2fd;
  }

  &:active {
    opacity: 0.8;
  }

  .radio {
    width: 40rpx;
    height: 40rpx;
    border: 3rpx solid #ddd;
    border-radius: 50%;
    margin-right: 24rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    flex-shrink: 0;

    .radio-inner {
      width: 24rpx;
      height: 24rpx;
      background: #1976d2;
      border-radius: 50%;
    }
  }

  &.selected .radio {
    border-color: #1976d2;
  }

  .class-info {
    flex: 1;

    .class-name {
      font-size: 30rpx;
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

.input {
  width: 100%;
  height: 88rpx;
  padding: 0 24rpx;
  background: #f9f9f9;
  border-radius: 12rpx;
  font-size: 28rpx;
  box-sizing: border-box;
}

.tip-section {
  display: flex;
  align-items: flex-start;
  padding: 24rpx;
  background: #fff8e1;
  border-radius: 12rpx;
  margin-bottom: 40rpx;

  .tip-icon {
    font-size: 32rpx;
    margin-right: 16rpx;
    flex-shrink: 0;
  }

  .tip-text {
    flex: 1;

    .tip-title {
      font-size: 26rpx;
      font-weight: 500;
      color: #f57c00;
      display: block;
      margin-bottom: 6rpx;
    }

    .tip-content {
      font-size: 24rpx;
      color: #ff9800;
      line-height: 1.5;
    }
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
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: #fff;
  }
}
</style>
