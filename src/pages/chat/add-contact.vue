<script setup lang="ts">
import type { SearchResultUser } from '@/api/chat'
import { ref } from 'vue'
import { searchUsers, sendContactRequest } from '@/api/chat'

definePage({
  style: {
    navigationBarTitleText: '添加联系人',
    backgroundColor: '#f5f5f5',
  },
})

const keyword = ref('')
const users = ref<SearchResultUser[]>([])
const loading = ref(false)
const searching = ref(false)
const selectedUserId = ref<number | null>(null)
const message = ref('')
const submitting = ref(false)

async function handleSearch() {
  if (!keyword.value.trim()) {
    uni.showToast({ title: '请输入搜索关键词', icon: 'none' })
    return
  }

  searching.value = true
  try {
    const res = await searchUsers({ keyword: keyword.value.trim() })
    if (res && res.list) {
      users.value = res.list
    }
  }
  catch (error) {
    console.error('搜索用户失败:', error)
    uni.showToast({ title: '搜索失败', icon: 'none' })
  }
  finally {
    searching.value = false
  }
}

function selectUser(user: SearchResultUser) {
  selectedUserId.value = user.id
}

function isSelected(userId: number) {
  return selectedUserId.value === userId
}

async function handleSendRequest() {
  if (!selectedUserId.value) {
    uni.showToast({ title: '请选择联系人', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res = await sendContactRequest({
      target_user_id: selectedUserId.value,
      message: message.value.trim(),
    })

    if (res && res.id) {
      uni.showToast({
        title: '请求已发送',
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
  <view class="add-contact-page">
    <view class="search-section">
      <view class="search-box">
        <input
          v-model="keyword"
          class="search-input"
          placeholder="搜索用户姓名/学号"
          confirm-type="search"
          @confirm="handleSearch"
        >
        <button class="search-btn" :disabled="searching" @click="handleSearch">
          {{ searching ? '...' : '搜索' }}
        </button>
      </view>
    </view>

    <view v-if="users.length > 0" class="user-list-section">
      <view class="section-title">
        选择联系人
      </view>
      <view class="user-list">
        <view
          v-for="user in users"
          :key="user.id"
          class="user-item"
          :class="{ selected: isSelected(user.id) }"
          @click="selectUser(user)"
        >
          <view class="radio">
            <view v-if="isSelected(user.id)" class="radio-inner" />
          </view>
          <view class="avatar">
            <text>{{ (user.username || user.wechat_nickname || '用').charAt(0) }}</text>
          </view>
          <view class="user-info">
            <text class="user-name">{{ user.username || user.wechat_nickname }}</text>
            <text class="user-desc">{{ user.user_code }} · {{ user.class_name || '未分配班级' }}</text>
          </view>
        </view>
      </view>
    </view>

    <view v-if="selectedUserId" class="message-section">
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

    <view v-if="selectedUserId" class="tip-section">
      <view class="tip-icon">
        ℹ️
      </view>
      <text class="tip-text">发送后需等待对方同意才能开始对话</text>
    </view>

    <view v-if="selectedUserId" class="button-group">
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
.add-contact-page {
  min-height: 100vh;
  background: #f5f5f5;
  padding: 30rpx;
  box-sizing: border-box;
}

.search-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 24rpx;
  margin-bottom: 24rpx;

  .search-box {
    display: flex;
    gap: 16rpx;

    .search-input {
      flex: 1;
      height: 72rpx;
      padding: 0 24rpx;
      background: #f9f9f9;
      border-radius: 12rpx;
      font-size: 28rpx;
      box-sizing: border-box;
    }

    .search-btn {
      width: 140rpx;
      height: 72rpx;
      line-height: 72rpx;
      text-align: center;
      background: #1976d2;
      color: #fff;
      font-size: 26rpx;
      border-radius: 12rpx;
      border: none;
      padding: 0;
      margin: 0;

      &[disabled] {
        opacity: 0.6;
      }
    }
  }
}

.section-title {
  font-size: 28rpx;
  font-weight: 500;
  color: #333;
  margin-bottom: 20rpx;
}

.user-list-section,
.message-section {
  background: #fff;
  border-radius: 16rpx;
  padding: 30rpx;
  margin-bottom: 24rpx;
}

.user-list {
  .user-item {
    display: flex;
    align-items: center;
    padding: 20rpx;
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
      margin-right: 20rpx;
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

    .avatar {
      width: 80rpx;
      height: 80rpx;
      border-radius: 40rpx;
      background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
      display: flex;
      align-items: center;
      justify-content: center;
      margin-right: 20rpx;
      flex-shrink: 0;

      text {
        font-size: 32rpx;
        color: #fff;
        font-weight: bold;
      }
    }

    .user-info {
      flex: 1;

      .user-name {
        font-size: 28rpx;
        font-weight: 500;
        color: #333;
        display: block;
      }

      .user-desc {
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
  background: #e8f5e9;
  border-radius: 12rpx;
  margin-bottom: 24rpx;

  .tip-icon {
    font-size: 28rpx;
    margin-right: 12rpx;
  }

  .tip-text {
    font-size: 24rpx;
    color: #388e3c;
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
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    color: #fff;
  }
}
</style>
