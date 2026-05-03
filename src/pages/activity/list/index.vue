<script setup lang="ts">
import { onLoad, onPullDownRefresh } from '@dcloudio/uni-app'
import { ref } from 'vue'
import { getActivityList } from '@/api/activity'

defineOptions({ name: 'ActivityList' })

definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '校园活动',
    navigationStyle: 'custom',
    backgroundColor: '#F5F7FA',
  },
})

const activityList = ref<ActivityItem[]>([])
const loading = ref(false)
const current = ref(1)
const size = ref(10)
const total = ref(0)

onLoad(() => {
  loadActivities()
})

onPullDownRefresh(() => {
  loadActivities().finally(() => {
    uni.stopPullDownRefresh()
  })
})

async function loadActivities() {
  loading.value = true
  try {
    const res = await getActivityList({
      current: current.value,
      size: size.value,
    })
    const data = res as any
    activityList.value = data.records || []
    total.value = data.total || 0
  }
  catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function goBack() {
  uni.navigateBack({ fail: () => { uni.switchTab({ url: '/pages/index/index' }) } })
}

function navigateToDetail(id: number) {
  uni.navigateTo({ url: `/pages/activity/detail/index?id=${id}` })
}

function formatTime(timeStr?: string): string {
  if (!timeStr)
    return ''
  return timeStr.replace('T', ' ').substring(0, 16)
}

function getStatusInfo(status: string) {
  const map: Record<string, { text: string, color: string, bg: string }> = {
    upcoming: { text: '未开始', color: '#909399', bg: '#f4f4f5' },
    ongoing: { text: '进行中', color: '#ffffff', bg: '#07c160' },
    ended: { text: '已结束', color: '#909399', bg: '#f4f4f5' },
  }
  return map[status] || { text: status, color: '#909399', bg: '#f4f4f5' }
}
</script>

<template>
  <view class="page">
    <view class="header">
      <view class="header-nav">
        <view class="back-btn" @click="goBack()">
          <wd-icon name="arrow-left" size="20" color="#fff" />
        </view>
      </view>
      <view class="header-title">
        校园活动
      </view>
      <view class="header-sub">
        发现精彩校园生活
      </view>
    </view>

    <scroll-view scroll-y class="scroll-area" :style="{ marginTop: '110px' }" :enhanced="true" :show-scrollbar="false">
      <view v-if="loading && activityList.length === 0" class="loading-wrap">
        <wd-loading />
      </view>

      <view v-else-if="activityList.length === 0" class="empty-wrap">
        <wd-icon name="notice" size="48" color="#c0c4cc" />
        <text class="empty-text">暂无活动</text>
      </view>

      <view v-else class="card-list">
        <view
          v-for="item in activityList"
          :key="item.id"
          class="card"
          @click="navigateToDetail(item.id)"
        >
          <image
            v-if="item.coverImage"
            :src="item.coverImage"
            mode="aspectFill"
            class="cover"
          />
          <view v-else class="cover cover-default">
            <wd-icon name="calendar" size="36" color="#fff" opacity="0.8" />
          </view>

          <view class="body">
            <view class="title-row">
              <text class="title">{{ item.title }}</text>
              <view
                class="tag"
                :style="{
                  color: getStatusInfo(item.status).color,
                  background: getStatusInfo(item.status).bg,
                }"
              >
                {{ getStatusInfo(item.status).text }}
              </view>
            </view>

            <view class="meta-row">
              <view class="meta">
                <wd-icon name="time" size="13" color="#bbb" />
                <text>{{ formatTime(item.startTime) }}</text>
              </view>
              <view class="meta">
                <wd-icon name="location" size="13" color="#bbb" />
                <text>{{ item.location || '待定' }}</text>
              </view>
            </view>

            <view class="foot-row">
              <text class="count">{{ item.registrationCount }}/{{ item.maxParticipants ? `${item.maxParticipants}人` : '不限' }}人报名</text>
              <text class="arrow">›</text>
            </view>
          </view>
        </view>
      </view>

      <view v-if="activityList.length > 0 && activityList.length >= total.value" class="no-more">
        <text>— 没有更多了 —</text>
      </view>
    </scroll-view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f7f8fa;
}

.header {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  height: 140px;
  background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
  z-index: 10;
  padding-top: 55px;
  padding-left: 20px;
}

.header-nav {
  margin-bottom: 8px;
}

.back-btn {
  width: 32px;
  height: 32px;
  display: flex;
  align-items: center;
  justify-content: center;
  background: rgba(255, 255, 255, 0.2);
  border-radius: 50%;
}

.header-title {
  font-size: 20px;
  font-weight: bold;
  color: white;
}

.header-sub {
  font-size: 12px;
  color: rgba(255, 255, 255, 0.75);
  margin-top: 4px;
}

.scroll-area {
  position: relative;
  z-index: 2;
  height: calc(100vh - 110px);
  padding: 12px 16px;
  box-sizing: border-box;
}

.card-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.card {
  background: white;
  border-radius: 14px;
  overflow: hidden;
  box-shadow: 0 1px 8px rgba(0, 0, 0, 0.04);
}

.cover {
  width: 100%;
  height: 160px;
  display: block;
}

.cover-default {
  display: flex;
  align-items: center;
  justify-content: center;
  background: linear-gradient(135deg, #a8edea 0%, #fed6e3 100%);
}

.body {
  padding: 12px 14px 14px;
}

.title-row {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 8px;
}

.title {
  font-size: 15px;
  font-weight: 600;
  color: #1d2129;
  flex: 1;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tag {
  font-size: 11px;
  font-weight: 500;
  padding: 2px 10px;
  border-radius: 20px;
  white-space: nowrap;
  flex-shrink: 0;
}

.meta-row {
  display: flex;
  gap: 16px;
  margin-bottom: 8px;
}

.meta {
  display: flex;
  align-items: center;
  gap: 3px;
  font-size: 12px;
  color: #86909c;
}

.foot-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding-top: 6px;
  border-top: 1px solid #f2f3f5;
}

.count {
  font-size: 12px;
  color: #86909c;
}

.arrow {
  font-size: 18px;
  color: #c9cdd4;
  font-weight: 300;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 80px 0 40px;
  gap: 10px;
}

.empty-text {
  font-size: 14px;
  color: #c0c4cc;
}

.no-more {
  text-align: center;
  padding: 24px 0 12px;
  font-size: 12px;
  color: #c0c4cc;
}
</style>
