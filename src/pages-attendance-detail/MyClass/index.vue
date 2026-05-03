<template>
  <view class="bg-page min-h-screen">
    <!-- 加载中提示 -->
    <view v-if="loading" class="loading-mask">
      <view class="loading-content">
        <uni-load-more type="loading" color="#ff9500" />
        <text class="loading-text">加载中...</text>
      </view>
    </view>

    <!-- 核心内容 -->
    <view v-if="!loading" class="p-30">
      <!-- 合并后的整体卡片 -->
      <view v-if="timeSlots.length > 0" class="card main-card">
        <!-- 班级信息区域 -->
        <view class="align-center mb-20 flex justify-between">
          <view class="align-center flex">
            <view class="class-tag">
              本班
            </view>
            <view>
              <view class="class-name">
                {{ className }}
              </view>
              <view class="class-desc">
                {{ currentTimeSlot?.timeSlotName || '加载中' }}
              </view>
            </view>
          </view>
          <view
            v-if="currentTimeSlot?.status === 'normal'"
            class="status-tag"
            :class="currentTimeSlot?.attendanceStatus === '已完成' ? 'status-success' : 'status-wait'"
          >
            {{ currentTimeSlot?.attendanceStatus || '待完成' }}
          </view>
          <view
            v-else
            class="status-tag status-cancel"
          >
            {{ currentTimeSlot?.status === 'cancelled' ? '已停课' : '已调课' }}
          </view>
        </view>

        <!-- 动态时段选择 -->
        <view v-if="timeSlots.length > 1" class="tab-wrap">
          <view
            v-for="slot in timeSlots"
            :key="slot.timeSlotId"
            class="tab-item"
            :class="[
              activeTimeSlot === slot.timeSlotId ? 'tab-active' : '',
              slot.status !== 'normal' ? 'tab-disabled' : (slot.attendanceStatus === '待完成' ? 'tab-pending' : ''),
            ]"
            @click="switchTimeSlot(slot.timeSlotId)"
          >
            {{ slot.timeSlotName }}
            <view v-if="slot.status === 'normal' && slot.attendanceStatus === '待完成'" class="pending-dot" />
          </view>
        </view>

        <!-- 考勤统计 (正常时段或调课/补课时段显示) -->
        <view v-if="(currentTimeSlot?.status === 'normal' || currentTimeSlot?.status === 'replaced' || currentTimeSlot?.status === 'makeup') && (currentTimeSlot.scheduleId || currentTimeSlot.isFixed)" class="stat-grid">
          <view class="stat-item">
            <text class="stat-label">应到人数</text>
            <text class="stat-num num-gray">{{ stats.shouldAttend }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">实到人数</text>
            <text class="stat-num num-green">{{ stats.present }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">请假人数</text>
            <text class="stat-num num-blue">{{ stats.absent }}</text>
          </view>
          <view class="stat-item">
            <text class="stat-label">缺勤人数</text>
            <text class="stat-num num-red">{{ stats.absentWithoutLeave }}</text>
          </view>
        </view>

        <!-- 调课提示 -->
        <view v-if="currentTimeSlot?.status === 'replaced'" class="replace-tip">
          <view v-if="!currentTimeSlot?.scheduleId">
            📅 本时段已调至 <text class="highlight-date">{{ currentTimeSlot?.replaceTargetDate }}</text> 进行
            <text v-if="currentTimeSlot?.replaceReason">（{{ currentTimeSlot.replaceReason }}）</text>
            <view class="no-schedule-tip" style="background: transparent; margin-top: 20rpx;">
              ⚠️ 目标日期暂无排班记录，请联系管理员确认调课安排
            </view>
          </view>
          <view v-else>
            📅 本时段补 <text class="highlight-date">{{ currentTimeSlot?.replaceTargetDate }}</text> 的课，            <text v-if="currentTimeSlot?.replaceReason">（{{ currentTimeSlot.replaceReason }}）</text>
            <view class="replace-tip-sub">
              请完成考勤
            </view>
          </view>
        </view>

        <!-- 补课提示 -->
        <view v-if="currentTimeSlot?.status === 'makeup' && currentTimeSlot?.makeupInfo" class="replace-tip makeup-tip">
          📚 今日补 <text class="highlight-date">{{ currentTimeSlot?.makeupInfo?.originalDate }}</text> 的课，请完成考勤
          <text v-if="currentTimeSlot?.makeupInfo?.description">（{{ currentTimeSlot.makeupInfo.description }}）</text>
        </view>

        <!-- 无排班提示 (仅is_fixed为false且无scheduleId且状态正常时显示) -->
        <view v-if="currentTimeSlot?.status === 'normal' && !currentTimeSlot.scheduleId && !currentTimeSlot.isFixed" class="no-schedule-tip">
          无排班！请联系管理员或在该班级终端考勤
        </view>

        <!-- 停课提示 -->
        <view v-if="currentTimeSlot?.status === 'cancelled'" class="empty-tip">
          🚫 {{ currentTimeSlot?.cancelReason || '临时停课' }}
        </view>

        <!-- 分割线 (正常时段或调课/补课时段显示) -->
        <view v-if="(currentTimeSlot?.status === 'normal' || currentTimeSlot?.status === 'replaced' || currentTimeSlot?.status === 'makeup') && (currentTimeSlot.scheduleId || currentTimeSlot.isFixed)" class="divider" />

        <!-- 请假学生（可展开，正常时段或调课/补课时段显示） -->
        <view v-if="(currentTimeSlot?.status === 'normal' || currentTimeSlot?.status === 'replaced' || currentTimeSlot?.status === 'makeup') && (currentTimeSlot.scheduleId || currentTimeSlot.isFixed)" class="expand-section">
          <view class="expand-header" @click="toggleExpand('leave')">
            <view class="align-center flex">
              <view class="icon-blue">
                📝
              </view>
              <text class="expand-title">请假学生 ({{ leaveStudents.length }}人)</text>
            </view>
            <text class="expand-tip">{{ expandStatus.leave ? '收起' : '展开' }}</text>
          </view>
          <view v-show="expandStatus.leave" class="expand-body">
            <view v-if="leaveStudents.length === 0" class="empty-tip">
              暂无请假学生
            </view>
            <view v-for="(student, index) in leaveStudents" :key="`leave-${index}`" class="student-item">
              <view class="align-center flex">
                <view class="avatar">
                  {{ student.name.slice(0, 1) }}
                </view>
                <view>
                  <view class="student-name">
                    {{ student.name }}
                  </view>
                  <view class="student-desc">
                    请假｜{{ student.reason || '未填写' }}
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 缺勤学生（可展开，正常时段或调课/补课时段显示） -->
        <view v-if="(currentTimeSlot?.status === 'normal' || currentTimeSlot?.status === 'replaced' || currentTimeSlot?.status === 'makeup') && (currentTimeSlot.scheduleId || currentTimeSlot.isFixed)" class="expand-section">
          <view class="expand-header" @click="toggleExpand('absent')">
            <view class="align-center flex">
              <view class="icon-red">
                ⚠️
              </view>
              <text class="expand-title">缺勤学生 ({{ absentStudents.length }}人)</text>
            </view>
            <text class="expand-tip">{{ expandStatus.absent ? '收起' : '展开' }}</text>
          </view>
          <view v-show="expandStatus.absent" class="expand-body">
            <view v-if="absentStudents.length === 0" class="empty-tip">
              暂无缺勤学生
            </view>
            <view v-for="(student, index) in absentStudents" :key="`absent-${index}`" class="student-item">
              <view class="align-center flex">
                <view class="avatar">
                  {{ student.name.slice(0, 1) }}
                </view>
                <view>
                  <view class="student-name">
                    {{ student.name }}
                  </view>
                  <view class="student-desc">
                    缺勤｜{{ student.reason || '未填写原因' }}
                  </view>
                </view>
              </view>
            </view>
          </view>
        </view>

        <!-- 去考勤/修改考勤按钮 (正常时段或调课/补课时段显示) -->
        <view v-if="(currentTimeSlot?.status === 'normal' || currentTimeSlot?.status === 'replaced' || currentTimeSlot?.status === 'makeup') && (currentTimeSlot.scheduleId || currentTimeSlot.isFixed)" class="attendance-btn-wrap">
          <button
            class="attendance-btn"
            :class="[
              currentTimeSlot?.attendanceStatus === '已完成' ? 'btn-modify' : 'btn-go',
              (!currentTimeSlot.scheduleId && !currentTimeSlot.isFixed) ? 'btn-disabled' : '',
            ]"
            :disabled="loading || (!currentTimeSlot.scheduleId && !currentTimeSlot.isFixed)"
            @click="handleAttendanceBtn"
          >
            <template v-if="!currentTimeSlot.scheduleId && !currentTimeSlot.isFixed">
              暂无排班
            </template>
            <template v-else>
              {{ currentTimeSlot?.attendanceStatus === '已完成' ? '修改考勤' : '去考勤' }}
            </template>
          </button>
        </view>
      </view>

      <!-- 空状态 -->
      <view v-else class="card empty-card">
        <view class="empty-tip">
          暂无考勤时段数据
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type {
  AppAttendanceDailyUsingGetParams,
  DailyAttendanceItem,
  StudentException,
} from '@/service/types'
import { computed, ref } from 'vue'
import { appAttendanceDailyUsingGet } from '@/service/attendance'

definePage({
  style: {
    navigationStyle: 'default',
    navigationBarTitleText: '考勤详情',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const options = ref<PageOptions>({})
interface TimeSlotInfoWithStatus extends DailyAttendanceItem {
  attendanceStatus: '已完成' | '待完成'
  absentWithoutLeave?: number
}

interface PageOptions {
  date?: string
}

const loading = ref<boolean>(false)

// 基础信息
const className = ref<string>('')
const classId = ref<number>(0)
const attendanceDate = ref<string>('')

// 动态时段列表 (前端扩展后的类型)
const timeSlots = ref<TimeSlotInfoWithStatus[]>([])
// 当前选中的时段ID
const activeTimeSlot = ref<number | null>(null)

// 展开状态
const expandStatus = ref<{
  leave: boolean
  absent: boolean
}>({
  leave: false,
  absent: false,
})

// 当前选中时段的计算属性
const currentTimeSlot = computed((): TimeSlotInfoWithStatus => {
  return timeSlots.value.find(item => item.timeSlotId === activeTimeSlot.value)
    || timeSlots.value[0]
    || ({} as TimeSlotInfoWithStatus)
})

// 考勤数据 (根据当前时段动态计算，适配后端返回null的情况)
const stats = computed(() => {
  const att = currentTimeSlot.value?.attendance as AttendanceDetail | undefined
  if (!att || !att.isRecorded) {
    return { shouldAttend: 0, present: 0, absent: 0, absentWithoutLeave: 0 }
  }
  // 适配后端返回null的字段，转为0
  return {
    shouldAttend: att.shouldAttend ?? 0,
    present: att.actualAttend ?? 0,
    absent: att.leaveCount ?? 0,
    absentWithoutLeave: att.absentCount ?? 0,
  }
})

// 请假学生列表
const leaveStudents = computed(() => {
  // 适配后端返回null的情况，转为空数组
  const list = (currentTimeSlot.value?.attendance?.leaveList as StudentException[] | null | undefined) ?? []

  // 遍历前过滤无效项，遍历中对属性做空值兜底
  return list
    .filter(item => item)
    .map(item => ({
      name: item.studentName || '未知学生',
      reason: item.reason || '无',
    }))
})

// 缺勤学生列表
const absentStudents = computed(() => {
  // 适配后端返回null的情况，转为空数组
  const list = (currentTimeSlot.value?.attendance?.absentList as StudentException[] | null | undefined) ?? []

  // 遍历前过滤无效项，遍历中对属性做空值兜底
  return list
    .filter(item => item)
    .map(item => ({
      name: item.studentName || '未知学生',
      reason: item.reason || '无',
    }))
})

/**
 * 格式化日期
 * @param date 日期对象
 * @returns 格式化后的日期字符串（YYYY-MM-DD）
 */
function formatDate(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

/**
 * 加载考勤数据（适配直接返回时段数组的格式）
 */
async function loadAllAttendanceData() {
  loading.value = true
  try {
    // 1. 构造请求参数
    const params: AppAttendanceDailyUsingGetParams = {
      attendanceDate: attendanceDate.value,
    }

    // 2. 调用接口（直接返回时段数组）
    console.log('【考勤请求】参数：', params)
    const rawSlots = await appAttendanceDailyUsingGet({
      params,
      options: { timeout: 10000 },
    })
    console.log('【考勤响应】时段数组：', rawSlots)

    // 3. 基础校验：必须是数组
    if (!Array.isArray(rawSlots)) {
      throw new TypeError('接口返回非数组格式')
    }

    // 4. 提取班级信息（从第一个时段获取）
    const firstSlot = rawSlots?.[0]
    className.value = firstSlot?.className || '未知班级'
    classId.value = firstSlot?.classId || 0

    // 5. 处理时段列表：补充前端扩展字段，做空值兜底
    const slots: TimeSlotInfoWithStatus[] = rawSlots
      .filter(item => item && typeof item === 'object') // 过滤无效项
      .map((slot: TimeSlotInfo) => {
        // 适配attendance为null/undefined的情况
        const safeAttendance = slot.attendance || ({ isRecorded: false } as AttendanceDetail)

        return {
          ...slot,
          // 前端扩展：考勤状态文字
          attendanceStatus: safeAttendance.isRecorded ? '已完成' : '待完成',
          // 计算缺勤人数
          absentWithoutLeave: safeAttendance.absentCount ?? 0,
          // 兜底字段（防止后端返回null/undefined）
          timeSlotId: slot.timeSlotId || -1,
          timeSlotName: slot.timeSlotName || '未知时段',
          startTime: slot.startTime || '',
          endTime: slot.endTime || '',
          isFixed: slot.isFixed || false, // 确保isFixed有默认值
          status: slot.status || 'normal',
          cancelReason: slot.cancelReason || '',
          scheduleId: slot.scheduleId || undefined,
          // 处理attendance的null字段
          attendance: {
            ...safeAttendance,
            isRecorded: safeAttendance.isRecorded || false,
            shouldAttend: safeAttendance.shouldAttend ?? 0,
            actualAttend: safeAttendance.actualAttend ?? 0,
            leaveCount: safeAttendance.leaveCount ?? 0,
            absentCount: safeAttendance.absentCount ?? 0,
            leaveList: safeAttendance.leaveList ?? [],
            absentList: safeAttendance.absentList ?? [],
            notes: safeAttendance.notes ?? '',
          },
          className: slot.className || '',
          classId: slot.classId || 0,
        }
      })

    // 6. 更新状态
    timeSlots.value = slots

    // 默认选中第一个时段
    if (slots.length > 0 && activeTimeSlot.value === null) {
      activeTimeSlot.value = slots[0].timeSlotId
    }
  }
  catch (error) {
    console.error('获取考勤数据失败：', error)
    uni.showToast({
      title: error instanceof Error ? error.message : '数据加载失败，请重试',
      icon: 'none',
      duration: 3000,
    })
    // 兜底：清空时段列表
    timeSlots.value = []
  }
  finally {
    loading.value = false
  }
}

/**
 * 初始化页面数据
 */
function initPageData() {
  // 初始化日期
  attendanceDate.value = formatDate(new Date())
  // 从路由参数覆盖日期
  if (options.value.date) {
    attendanceDate.value = options.value.date
  }
  // 加载数据
  loadAllAttendanceData()
}

/**
 * 切换时段
 * @param timeSlotId 时段ID
 */
function switchTimeSlot(timeSlotId: number) {
  if (activeTimeSlot.value === timeSlotId)
    return
  activeTimeSlot.value = timeSlotId
  // 重置展开状态
  expandStatus.value = { leave: false, absent: false }
}

/**
 * 切换展开/收起
 * @param type 类型：leave-请假，absent-缺勤
 */
function toggleExpand(type: 'leave' | 'absent') {
  expandStatus.value[type] = !expandStatus.value[type]
}

/**
 * 处理考勤按钮点击
 */
function handleAttendanceBtn() {
  const slot = currentTimeSlot.value

  // 非固定时段且无排班 → 提示专属文案
  if (!slot.scheduleId && !slot.isFixed) {
    uni.showToast({
      title: '无排班！请联系管理员或在该班级终端考勤',
      icon: 'none',
      duration: 3000,
    })
    return
  }

  // 固定时段但无排班 → 提示通用文案
  if (!slot.scheduleId) {
    uni.showToast({ title: '该时段暂无排班，无法考勤', icon: 'none' })
    return
  }

  const url = `/pages-attendance-detail/index?scheduleId=${slot.scheduleId}`

  uni.navigateTo({ url })
}

// 页面加载生命周期
onLoad((opts) => {
  options.value = opts as PageOptions
  initPageData()
})
</script>

<style scoped>
/* 基础样式 */
page {
  background: #f5f7fa;
}
.min-h-screen {
  min-height: 100vh;
  background: #f5f7fa;
}

/* 加载样式 */
.loading-mask {
  position: fixed;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  background: rgba(255, 255, 255, 0.8);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 999;
}
.loading-content {
  text-align: center;
}
.loading-text {
  font-size: 24rpx;
  color: #999;
  margin-top: 20rpx;
}

/* 布局样式 */
.p-30 {
  padding: 30rpx;
}
.card {
  background: #fff;
  border-radius: 20rpx;
  padding: 30rpx;
  margin-bottom: 30rpx;
}
.main-card {
  overflow: hidden;
}
.empty-card {
  text-align: center;
  padding: 60rpx 0;
}

/* 弹性布局 */
.flex {
  display: flex;
}
.align-center {
  align-items: center;
}
.justify-between {
  justify-content: space-between;
}
.mb-20 {
  margin-bottom: 20rpx;
}

/* 班级信息 */
.class-tag {
  width: 60rpx;
  height: 60rpx;
  background: #00c48c;
  color: #fff;
  border-radius: 50%;
  font-size: 24rpx;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 20rpx;
}
.class-name {
  font-size: 28rpx;
  font-weight: bold;
  color: #333;
}
.class-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

/* 状态标签 */
.status-tag {
  font-size: 22rpx;
  padding: 8rpx 16rpx;
  border-radius: 30rpx;
}
.status-success {
  background: #e6f7f0;
  color: #00c48c;
}
.status-wait {
  background: #fff4e6;
  color: #ff9500;
}
.status-cancel {
  background: #f0f0f0;
  color: #999;
}

/* 时段标签 */
.tab-wrap {
  display: flex;
  border-bottom: 1rpx solid #f1f1f1;
  margin-bottom: 30rpx;
  position: relative;
}
.tab-item {
  flex: 1;
  text-align: center;
  padding: 20rpx 0;
  font-size: 26rpx;
  color: #999;
  position: relative;
}
.tab-active {
  color: #ff9500;
  border-bottom: 3rpx solid #ff9500;
  font-weight: 500;
}
.tab-pending {
  color: #ff4d4f;
}
.tab-disabled {
  color: #ccc;
  pointer-events: none;
}
.pending-dot {
  width: 16rpx;
  height: 16rpx;
  background: #ff4d4f;
  border-radius: 50%;
  position: absolute;
  top: 12rpx;
  right: 20rpx;
}

/* 统计网格 */
.stat-grid {
  display: grid;
  grid-template-columns: repeat(4, 1fr);
  gap: 20rpx;
  margin-bottom: 30rpx;
}
.stat-item {
  background: #f7f8fa;
  border-radius: 12rpx;
  padding: 20rpx;
  text-align: center;
}
.stat-label {
  font-size: 22rpx;
  color: #999;
  display: block;
  margin-bottom: 8rpx;
}
.stat-num {
  font-size: 32rpx;
  font-weight: bold;
}
.num-gray {
  color: #333;
}
.num-green {
  color: #00c48c;
}
.num-blue {
  color: #3b82f6;
}
.num-red {
  color: #ff4d4f;
}

/* 分割线 */
.divider {
  height: 1rpx;
  background-color: #f1f1f1;
  margin: 10rpx 0 20rpx 0;
}

/* 无排班提示 */
.no-schedule-tip {
  text-align: center;
  padding: 40rpx 0;
  font-size: 26rpx;
  color: #ff4d4f;
  line-height: 1.6;
}

/* 展开面板 */
.expand-section {
  margin-bottom: 10rpx;
}
.expand-header {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f1f1f1;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.expand-header:last-child {
  border-bottom: none;
}
.expand-title {
  font-size: 26rpx;
  color: #333;
  margin-left: 16rpx;
}
.expand-tip {
  font-size: 22rpx;
  color: #999;
}
.expand-body {
  padding: 20rpx 0;
}

/* 学生列表 */
.student-item {
  padding: 24rpx 0;
  border-bottom: 1rpx solid #f7f7f7;
  display: flex;
  align-items: center;
  justify-content: space-between;
}
.student-item:last-child {
  border-bottom: none;
}
.avatar {
  width: 50rpx;
  height: 50rpx;
  background: #f7f8fa;
  border-radius: 50%;
  display: flex;
  align-items: center;
  justify-content: center;
  font-size: 22rpx;
  color: #999;
  margin-right: 20rpx;
}
.student-name {
  font-size: 26rpx;
  color: #333;
}
.student-desc {
  font-size: 22rpx;
  color: #999;
  margin-top: 6rpx;
}

/* 空提示 */
.empty-tip {
  text-align: center;
  padding: 40rpx 0;
  font-size: 14px;
  color: #999;
}

/* 高亮日期 */
.highlight-date {
  color: #ff9500;
  font-weight: 600;
}

/* 调课/补课提示 */
.replace-tip {
  text-align: center;
  padding: 30rpx 0;
  font-size: 26rpx;
  color: #3b82f6;
  background: #eff6ff;
  border-radius: 12rpx;
  margin-bottom: 20rpx;
  line-height: 1.6;
}

.makeup-tip {
  color: #059669;
  background: #ecfdf5;
}

/* 按钮样式 */
.attendance-btn-wrap {
  margin-top: 30rpx;
}
.attendance-btn {
  width: 100%;
  height: 88rpx;
  border-radius: 12rpx;
  font-size: 28rpx;
  border: none;
  color: #fff;
}
.btn-go {
  background: #ff9500;
}
.btn-modify {
  background: #00c48c;
}
.btn-disabled {
  background: #f0f0f0 !important;
  color: #999 !important;
}

/* 图标 */
.icon-blue {
  font-size: 28rpx;
}
.icon-red {
  font-size: 28rpx;
}
</style>
