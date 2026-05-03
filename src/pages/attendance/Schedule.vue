<template>
  <view class="min-h-screen bg-gray-50">
    <view class="flex items-center justify-between border-b bg-white px-4 py-3">
      <view class="text-lg text-gray-800 font-bold">
        我的排班
      </view>
      <view class="flex items-center gap-3">
        <view class="text-sm text-blue-500" @click="goToSwapRecords">
          代班记录
        </view>
        <view class="text-sm text-orange-500" @click="goToPeriodicRules">
          周期规则
        </view>
      </view>
    </view>

    <view v-if="todaySchedules.length > 0" class="mx-3 mt-3 border border-orange-100 rounded-xl from-orange-50 to-red-50 bg-gradient-to-r p-4">
      <view class="mb-3 flex items-center">
        <view class="mr-2 h-2 w-2 animate-pulse rounded-full bg-red-500" />
        <text class="text-red-600 font-bold">今日排班</text>
        <text class="ml-2 text-xs text-gray-500">{{ todayDate }}</text>
      </view>
      <view class="space-y-2">
        <view
          v-for="item in todaySchedules"
          :key="item.id"
          class="flex items-center justify-between rounded-lg bg-white p-3"
          :class="item.isCancelled ? 'opacity-50' : ''"
          @click="showSwapOptions(item)"
        >
          <view class="flex items-center">
            <view class="mr-3 h-10 w-1 rounded-full" :class="[item.isCancelled ? 'bg-gray-300' : item.isMakeupClass ? 'bg-green-500' : 'bg-red-500']" />
            <view>
              <view class="text-gray-800 font-medium">
                {{ item.className || item.timeSlotName }}
                <text v-if="item.isMakeupClass" class="ml-1 text-xs text-green-600">(补{{ item.makeupInfo?.originalDate }}课)</text>
              </view>
              <view class="text-xs text-gray-500">
                <text v-if="item.isReplaced && item.replaceInfo?.isAllDay">调至 {{ item.replaceInfo?.targetDate }}</text>
                <text v-else>{{ item.scheduleTime }}</text>
              </view>
            </view>
          </view>
          <view class="text-right">
            <view class="rounded-full px-2 py-1 text-xs" :class="[getTimeSlotColor(item.timeSlotName, item.isCancelled, item.isMakeupClass)]">
              {{ item.timeSlotName }}
            </view>
            <view class="mt-1 flex items-center justify-end gap-1">
              <text v-if="item.isCancelled" class="text-xs text-red-400">停课</text>
              <text v-if="item.isCancelled && item.isReplaced" class="text-xs text-gray-300">|</text>
              <text v-if="item.isReplaced && !item.replaceInfo?.isAllDay" class="text-xs text-blue-500">→ {{ item.replaceInfo?.targetDate }}</text>
              <text v-if="item.isMakeupClass" class="text-xs text-green-600">补课</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="mx-3 mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
      <view class="flex items-center justify-between border-b px-4 py-3">
        <view class="flex items-center" @click="prevMonth">
          <uni-icons type="left" size="16" color="#666" />
        </view>
        <text class="font-medium">{{ currentMonthText }}</text>
        <view class="flex items-center" @click="nextMonth">
          <uni-icons type="right" size="16" color="#666" />
        </view>
      </view>

      <view class="grid grid-cols-7 bg-gray-50 py-2 text-center text-xs text-gray-500">
        <view v-for="d in ['日', '一', '二', '三', '四', '五', '六']" :key="d">
          {{ d }}
        </view>
      </view>

      <view class="grid grid-cols-7 gap-1 p-2">
        <view
          v-for="(day, idx) in calendarDays"
          :key="idx"
          class="relative aspect-square flex flex-col items-center justify-center rounded-lg text-sm" :class="[
            day.isOtherMonth ? 'text-gray-300' : '',
            day.isToday ? 'bg-red-500 text-white font-bold' : '',
            day.isSelected && !day.isToday ? 'bg-orange-500 text-white' : '',
            day.hasCancelled && !day.isToday && !day.isSelected ? 'bg-red-100' : '',
            day.hasMakeupClass && !day.hasCancelled && !day.isToday && !day.isSelected ? 'bg-green-100' : '',
            day.hasSchedule && !day.hasMakeupClass && !day.hasCancelled && !day.isToday && !day.isSelected ? 'bg-purple-100' : '',
            day.isPast && !day.isOtherMonth ? 'text-gray-400' : '',
          ]"
          @click="day.isOtherMonth || day.isPast ? null : selectDate(day)"
        >
          <text>{{ day.day }}</text>
          <view v-if="day.hasSchedule || day.hasCancelled" class="absolute bottom-1 h-1.5 w-1.5 rounded-full" :class="[day.hasCancelled ? 'bg-red-500' : day.hasMakeupClass ? 'bg-green-500' : 'bg-purple-500']" />
        </view>
      </view>

      <view v-if="selectedDateInfo" class="border-t bg-gray-50 p-3">
        <view class="mb-2 flex items-center justify-between">
          <text class="text-sm font-medium">{{ selectedDateInfo.dateText }}</text>
          <text v-if="selectedDateInfo.schedules.length === 0" class="text-xs text-gray-400">无排班</text>
        </view>
        <view v-if="selectedDateInfo.schedules.length > 0" class="space-y-2">
          <view
            v-for="s in selectedDateInfo.schedules"
            :key="s.id"
            class="flex items-center justify-between rounded-lg bg-white p-2 text-sm"
            :class="s.isCancelled && !s.className ? 'opacity-50' : ''"
          >
            <view class="flex items-center">
              <view class="mr-2 h-6 w-1 rounded-full" :class="[s.isCancelled ? 'bg-red-400' : s.isMakeupClass ? 'bg-green-400' : s.isReplaced ? 'bg-blue-400' : 'bg-purple-400']" />
              <view>
                <text class="text-gray-800">{{ s.className || s.timeSlotName }}</text>
                <text v-if="s.isMakeupClass" class="ml-1 text-xs text-green-600">(补{{ s.makeupInfo?.originalDate }}课)</text>
                <text class="ml-2 text-xs text-gray-400">
                  <text v-if="s.isReplaced && s.replaceInfo?.isAllDay">调至 {{ s.replaceInfo?.targetDate }}</text>
                  <text v-else>{{ s.scheduleTime }}</text>
                </text>
              </view>
            </view>
            <view class="flex items-center gap-1">
              <text v-if="s.isCancelled" class="text-xs text-red-400">停课</text>
              <text v-if="s.isCancelled && s.isReplaced" class="text-xs text-gray-300">|</text>
              <text v-if="s.isReplaced && !s.replaceInfo?.isAllDay" class="text-xs text-blue-500">→ {{ s.replaceInfo?.targetDate }}</text>
              <text v-if="s.isMakeupClass" class="text-xs text-green-500">补课</text>
              <text v-if="!s.isCancelled && !s.isReplaced && !s.isMakeupClass && s.className" class="text-xs" :class="[getTimeSlotTextColor(s.timeSlotName)]">{{ s.timeSlotName }}</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view class="mx-3 mb-6 mt-3 overflow-hidden rounded-xl bg-white shadow-sm">
      <view class="flex items-center justify-between border-b px-4 py-3">
        <text class="font-medium">即将到来的排班</text>
        <text class="text-xs text-gray-400">共 {{ upcomingSchedules.length }} 个</text>
      </view>

      <view v-if="isLoadingSchedules" class="flex justify-center py-8">
        <wd-loading />
      </view>

      <view v-else-if="upcomingSchedules.length === 0" class="py-8 text-center">
        <view class="text-sm text-gray-400">
          暂无排班安排
        </view>
      </view>

      <view v-else class="divide-y">
        <view
          v-for="item in upcomingSchedules"
          :key="item.id"
          class="flex items-center justify-between px-4 py-3"
          :class="item.isCancelled ? 'opacity-50 bg-gray-50' : ''"
          @click="showSwapOptions(item)"
        >
          <view class="flex items-center">
            <view class="mr-3 min-w-12 text-center">
              <view class="text-lg text-gray-800 font-bold">
                {{ getDayOfMonth(item.serviceDate) }}
              </view>
              <view class="text-xs text-gray-400">
                {{ getWeekdayText(item.serviceDate) }}
              </view>
            </view>
            <view class="h-10 w-1 rounded-full" :class="[item.isCancelled ? 'bg-gray-300' : item.isMakeupClass ? 'bg-green-400' : item.isReplaced ? 'bg-blue-400' : 'bg-purple-400']" />
            <view class="ml-3">
              <view class="text-gray-800 font-medium">
                {{ item.className || item.timeSlotName }}
                <text v-if="item.isMakeupClass" class="ml-1 text-xs text-green-600">(补{{ item.makeupInfo?.originalDate }}课)</text>
              </view>
              <view class="text-xs text-gray-500">
                <text v-if="item.isReplaced && item.replaceInfo?.isAllDay">调至 {{ item.replaceInfo?.targetDate }}</text>
                <text v-else>{{ item.scheduleTime }}</text>
              </view>
            </view>
          </view>
          <view class="text-right">
            <view class="rounded-full px-2 py-1 text-xs" :class="[getTimeSlotColor(item.timeSlotName, item.isCancelled, item.isMakeupClass)]">
              {{ item.timeSlotName }}
            </view>
            <view class="mt-1 flex items-center justify-end gap-1">
              <text v-if="item.isCancelled" class="text-xs text-red-400">停课</text>
              <text v-if="item.isCancelled && item.isReplaced" class="text-xs text-gray-300">|</text>
              <text v-if="item.isReplaced && !item.replaceInfo?.isAllDay" class="text-xs text-blue-500">→ {{ item.replaceInfo?.targetDate }}</text>
              <text v-if="item.isMakeupClass" class="text-xs text-green-600">补课</text>
            </view>
          </view>
        </view>
      </view>
    </view>

    <view
      v-if="showTeacherPicker"
      class="fixed inset-0 z-50 flex items-end bg-black/50 pb-[75px]"
      @click="closeTeacherPicker"
    >
      <view
        class="max-h-[70vh] w-full overflow-hidden rounded-t-2xl bg-white"
        @click.stop
      >
        <view class="flex items-center justify-between border-b p-4">
          <text class="text-lg font-bold">选择代班教师</text>
          <view class="text-gray-400" @click="closeTeacherPicker">
            <wd-icon name="close" size="24" />
          </view>
        </view>

        <view class="border-b p-3">
          <input
            v-model="teacherSearchKeyword"
            type="text"
            placeholder="搜索姓名"
            class="w-full rounded-lg bg-gray-100 px-4 py-2 text-sm"
          >
        </view>

        <view class="max-h-[50vh] overflow-y-auto">
          <view
            v-for="teacher in filteredTeachers"
            :key="teacher.teacherId"
            class="flex items-center justify-between border-b px-4 py-3 active:bg-gray-50"
            @click="selectTeacher(teacher)"
          >
            <view class="flex items-center">
              <view class="mr-3 h-10 w-10 flex items-center justify-center rounded-full bg-blue-100">
                <wd-icon name="user" size="20" color="#3b82f6" />
              </view>
              <text class="text-gray-800">{{ teacher.teacherName }}</text>
            </view>
            <wd-icon name="arrow-right" size="16" color="#9ca3af" />
          </view>

          <view v-if="filteredTeachers.length === 0" class="p-8 text-center text-gray-400">
            暂无匹配的教师
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup lang="ts">
import type { PeriodicRule, ScheduleItem } from '@/service/types'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import { appAttendancePeriodicRulesUsingGet, appAttendanceSchedulesUsingGet, appAttendanceShiftSwapAvailableUsingGet, appAttendanceShiftSwapUsingPost } from '@/service/attendance'

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '排班',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const isLoadingSchedules = ref(false)
const periodicRules = ref<PeriodicRule[]>([])
const mySchedules = ref<ScheduleItem[]>([])

const currentYear = ref(new Date().getFullYear())
const currentMonth = ref(new Date().getMonth())
const selectedDate = ref('')

const showTeacherPicker = ref(false)
const availableTeachers = ref<{ teacherId: number, teacherName: string }[]>([])
const teacherSearchKeyword = ref('')
const selectedSchedule = ref<ScheduleItem | null>(null)

const filteredTeachers = computed(() => {
  if (!teacherSearchKeyword.value)
    return availableTeachers.value
  const keyword = teacherSearchKeyword.value.toLowerCase().trim()
  return availableTeachers.value.filter(t =>
    (t.teacherName || '').toLowerCase().includes(keyword),
  )
})

const todayDate = computed(() => {
  const d = new Date()
  return `${d.getMonth() + 1}月${d.getDate()}日`
})

const currentMonthText = computed(() => `${currentYear.value}年${currentMonth.value + 1}月`)

const todaySchedules = computed(() => {
  const today = new Date().toISOString().split('T')[0]
  return mySchedules.value.filter(s => s.serviceDate === today)
})

const upcomingSchedules = computed(() => {
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]
  return mySchedules.value
    .filter(s => s.serviceDate > todayStr)
    .slice(0, 10)
})

const calendarDays = computed(() => {
  const days: any[] = []
  const year = currentYear.value
  const month = currentMonth.value
  const firstDay = new Date(year, month, 1)
  const lastDay = new Date(year, month + 1, 0)
  const startDay = firstDay.getDay()
  const today = new Date()
  const todayStr = today.toISOString().split('T')[0]

  const prevLastDay = new Date(year, month, 0).getDate()
  for (let i = startDay - 1; i >= 0; i--) {
    days.push({ day: prevLastDay - i, isOtherMonth: true })
  }

  for (let i = 1; i <= lastDay.getDate(); i++) {
    const dateStr = `${year}-${String(month + 1).padStart(2, '0')}-${String(i).padStart(2, '0')}`
    const daySchedules = mySchedules.value.filter(s => s.serviceDate === dateStr)
    const hasSchedule = daySchedules.some(s => !s.isCancelled)
    const hasMakeupClass = daySchedules.some(s => s.isMakeupClass)
    const hasCancelled = daySchedules.some(s => s.isCancelled)
    days.push({
      day: i,
      dateStr,
      isOtherMonth: false,
      isToday: dateStr === todayStr,
      isPast: dateStr < todayStr,
      isSelected: dateStr === selectedDate.value,
      hasSchedule,
      hasMakeupClass,
      hasCancelled,
    })
  }

  const remaining = 42 - days.length
  for (let i = 1; i <= remaining; i++) {
    days.push({ day: i, isOtherMonth: true })
  }

  return days
})

const selectedDateInfo = computed(() => {
  if (!selectedDate.value)
    return null
  const d = new Date(selectedDate.value)
  const weekdays = ['周日', '周一', '周二', '周三', '周四', '周五', '周六']
  const schedules = mySchedules.value.filter(s => s.serviceDate === selectedDate.value)
  return {
    dateText: `${d.getMonth() + 1}月${d.getDate()}日 ${weekdays[d.getDay()]}`,
    schedules,
  }
})

function prevMonth() {
  if (currentMonth.value === 0) {
    currentMonth.value = 11
    currentYear.value--
  }
  else {
    currentMonth.value--
  }
}

function nextMonth() {
  if (currentMonth.value === 11) {
    currentMonth.value = 0
    currentYear.value++
  }
  else {
    currentMonth.value++
  }
}

function selectDate(day: any) {
  selectedDate.value = selectedDate.value === day.dateStr ? '' : day.dateStr
}

function getDayOfMonth(dateStr: string) {
  return new Date(dateStr).getDate()
}

function getWeekdayText(dateStr: string) {
  const weekdays = ['日', '一', '二', '三', '四', '五', '六']
  return `周${weekdays[new Date(dateStr).getDay()]}`
}

function getTimeSlotColor(name: string, cancelled: boolean = false, isMakeupClass: boolean = false) {
  if (cancelled)
    return 'bg-gray-100 text-gray-400'
  if (isMakeupClass)
    return 'bg-green-100 text-green-600'
  if (name?.includes('午'))
    return 'bg-blue-100 text-blue-600'
  if (name?.includes('晚') || name?.includes('九') || name?.includes('十'))
    return 'bg-purple-100 text-purple-600'
  return 'bg-gray-100 text-gray-600'
}

function getTimeSlotTextColor(name: string) {
  if (name?.includes('午'))
    return 'text-blue-500'
  if (name?.includes('晚') || name?.includes('九') || name?.includes('十'))
    return 'text-purple-500'
  return 'text-gray-500'
}

function goToPeriodicRules() {
  uni.navigateTo({ url: '/pages/index/PeriodicRules' })
}

function goToSwapRecords() {
  uni.navigateTo({ url: '/pages-me-sub/swap/index' })
}

function showSwapOptions(schedule: ScheduleItem) {
  if (schedule.isCancelled) {
    uni.showToast({ title: '该排班已停课，无法申请代班', icon: 'none' })
    return
  }

  uni.showActionSheet({
    itemList: ['申请代班', '查看详情'],
    success: (res) => {
      if (res.tapIndex === 0) {
        requestSwap(schedule)
      }
      else if (res.tapIndex === 1) {
        showScheduleDetail(schedule)
      }
    },
  })
}

async function requestSwap(schedule: ScheduleItem) {
  uni.showLoading({ title: '加载中...' })

  try {
    const res = await appAttendanceShiftSwapAvailableUsingGet({
      params: { scheduleId: schedule.id },
    })

    uni.hideLoading()

    console.log('代班教师列表响应:', JSON.stringify(res, null, 2))

    if (res) {
      const available = res.availableTeachers || []
      console.log('可用教师数量:', available.length, '教师列表:', available)
      if (available.length === 0) {
        uni.showToast({ title: '暂无空闲教师可代班', icon: 'none' })
        return
      }

      availableTeachers.value = available
      selectedSchedule.value = schedule
      teacherSearchKeyword.value = ''
      showTeacherPicker.value = true
    }
    else {
      uni.showToast({ title: '获取失败', icon: 'none' })
    }
  }
  catch (error) {
    uni.hideLoading()
    console.error('获取可代班教师失败:', error)
    uni.showToast({ title: '获取可代班教师失败', icon: 'none' })
  }
}

function selectTeacher(teacher: { teacherId: number, teacherName: string }) {
  showTeacherPicker.value = false
  if (selectedSchedule.value) {
    confirmSwapRequest(selectedSchedule.value, teacher)
  }
}

function closeTeacherPicker() {
  showTeacherPicker.value = false
  selectedSchedule.value = null
  teacherSearchKeyword.value = ''
}

async function confirmSwapRequest(mySchedule: ScheduleItem, teacher: { teacherId: number, teacherName: string }) {
  uni.showModal({
    title: '确认代班申请',
    content: `确定要请 ${teacher.teacherName} 代班吗？\n您的排班：${mySchedule.serviceDate} ${mySchedule.timeSlotName}`,
    success: async (res) => {
      if (res.confirm) {
        uni.showLoading({ title: '提交中...' })

        try {
          await appAttendanceShiftSwapUsingPost({
            body: {
              myScheduleId: Number(mySchedule.id),
              targetTeacherId: teacher.teacherId,
              message: '',
            },
          })

          uni.hideLoading()
          uni.showToast({ title: '代班申请已发送', icon: 'success' })
        }
        catch (error) {
          uni.hideLoading()
          uni.showToast({ title: '申请失败', icon: 'none' })
        }
      }
    },
  })
}

function showScheduleDetail(schedule: ScheduleItem) {
  let content = `日期：${schedule.serviceDate}\n`
  content += `时段：${schedule.timeSlotName}\n`
  content += `班级：${schedule.className || '无'}\n`
  content += `状态：${schedule.isCancelled ? '已停课' : schedule.isMakeupClass ? '补课' : '正常'}`

  uni.showModal({
    title: '排班详情',
    content,
    showCancel: false,
  })
}

async function loadData() {
  isLoadingSchedules.value = true
  try {
    const today = new Date()
    const startDate = today.toISOString().split('T')[0]
    const endDate = new Date(today.getTime() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0]

    const [rulesRes, schedulesRes] = await Promise.all([
      appAttendancePeriodicRulesUsingGet({}),
      appAttendanceSchedulesUsingGet({ params: { startDate, endDate } }),
    ])

    if (rulesRes?.rules)
      periodicRules.value = rulesRes.rules
    if (schedulesRes?.schedules)
      mySchedules.value = schedulesRes.schedules
  }
  catch (e) {
    console.error('加载数据失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    isLoadingSchedules.value = false
  }
}

onMounted(loadData)
onShow(() => {
  if (mySchedules.value.length === 0)
    loadData()
})
onPullDownRefresh(() => {
  loadData().then(() => uni.stopPullDownRefresh())
})
</script>

<style scoped>
.animate-pulse {
  animation: pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite;
}
@keyframes pulse {
  0%,
  100% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
}
</style>
