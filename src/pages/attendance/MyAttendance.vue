<template>
  <view class="min-h-screen bg-[#F5F7FA]">
    <view class="px-5 py-3" :style="{ 'padding-top': topNotice.show ? '4rem' : '0.75rem' }">
      <view class="mb-2 text-lg text-gray-800 font-semibold">
        考勤总览
      </view>

      <view v-if="stats.pending > 10" class="mb-3 flex items-center border-l-4 border-purple-500 rounded-r-lg bg-purple-50 px-3 py-2">
        <view class="mr-2 text-purple-500">
          📢
        </view>
        <text class="text-sm text-purple-700">今日待完成班级数较多（{{ stats.pending }}个），建议优先处理{{ priorityType === 'noon' ? '午托' : '晚托' }}班级</text>
      </view>

      <view v-if="stats.progress === 100 && stats.total > 0" class="mb-3 flex items-center border-l-4 border-green-500 rounded-r-lg bg-green-50 px-3 py-2">
        <view class="mr-2 text-green-500">
          ✅
        </view>
        <text class="text-sm text-green-700">今日考勤已全部完成（共{{ stats.completed }}个班级），辛苦了！</text>
      </view>

      <view
        v-if="missingInfoCount > 0"
        class="mb-3 flex cursor-pointer items-center border-l-4 border-yellow-500 rounded-r-lg bg-yellow-50 px-3 py-2"
        @click="scrollToFirstProblemClass"
      >
        <view class="mr-2 text-yellow-500">
          ⚠️
        </view>
        <text class="text-sm text-yellow-700">有{{ missingInfoCount }}个班级信息不完整，影响考勤自动填充，请在对应班级终端设备修改</text>
        <view class="ml-2 text-yellow-500">
          →
        </view>
      </view>

      <view class="mb-3 rounded-xl bg-white p-3 shadow-sm">
        <view class="mb-3">
          <view class="mb-1 flex justify-between text-xs">
            <text class="text-gray-600">今日整体考勤进度</text>
            <text class="font-medium">{{ stats.progress }}%</text>
          </view>
          <view class="h-1.5 overflow-hidden rounded-full bg-gray-100">
            <view
              class="h-full from-orange-400 to-orange-500 bg-gradient-to-r transition-all duration-500"
              :style="{ width: `${stats.progress}%` }"
            />
          </view>
        </view>

        <view class="grid grid-cols-3 gap-2">
          <view
            :class="stats.pending === 0
              ? 'bg-green-50 rounded-lg p-2 flex flex-col items-center justify-center col-span-1'
              : 'bg-orange-50 rounded-lg p-2 flex flex-col col-span-1'"
          >
            <text class="text-xs" :class="stats.pending === 0 ? 'text-green-600' : 'text-gray-600'">
              {{ stats.pending === 0 ? '已全部完成' : '今日待完成' }}
            </text>
            <view v-if="stats.pending > 0" class="mt-0.5 flex items-baseline">
              <text class="text-2xl text-orange-500 font-bold">{{ stats.pending }}</text>
              <text class="ml-1 text-xs text-gray-500">个班级</text>
            </view>
            <view v-else class="mt-0.5 flex items-center">
              <text class="text-2xl text-green-500 font-bold">✓</text>
            </view>
          </view>

          <view class="col-span-2 flex flex-col gap-2">
            <view class="flex items-center justify-between rounded-lg bg-blue-50 p-2">
              <text class="text-xs text-gray-700">本月总考勤班级</text>
              <view class="flex items-center">
                <text class="text-lg text-blue-500 font-bold">{{ monthlyStats.totalSchedules }}</text>
                <text class="ml-1 text-xs text-gray-500">个</text>
                <text class="ml-2 text-xs text-gray-500">(已完成 {{ monthlyStats.completedSchedules }})</text>
              </view>
            </view>
            <view class="flex items-center justify-between rounded-lg bg-purple-50 p-2">
              <text class="text-xs text-gray-700">本月待完成</text>
              <view class="flex items-center">
                <text class="text-lg text-purple-500 font-bold">{{ monthlyStats.pendingSchedules }}</text>
                <text class="ml-1 text-xs text-gray-500">个</text>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view
        v-if="myClassSummary"
        class="mb-4 border border-green-100 rounded-xl from-green-50 to-teal-50 bg-gradient-to-br p-4 shadow-md"
        :class="[
          myClassHasException ? 'border-yellow-300 bg-yellow-50' : '',
        ]"
      >
        <view class="mb-3 flex items-center justify-between">
          <view class="flex items-center">
            <view class="mr-2 h-8 w-8 flex items-center justify-center rounded-full bg-green-500 text-sm text-white font-bold">
              本班
            </view>
            <view>
              <view class="text-lg text-gray-800 font-bold">
                {{ myClassSummary.className }}
              </view>
              <view class="text-xs text-gray-500">
                珠海市红旗中学 | {{ myClassSummary.timeSlotName }}
              </view>
            </view>
          </view>
          <view
            class="flex items-center rounded-full px-2 py-1 text-xs font-medium"
            :class="[
              myClassSummary.attendanceStatus === '已完成' ? 'bg-green-100 text-green-700' : '',
              myClassSummary.attendanceStatus === '待确认' ? 'bg-blue-100 text-blue-700' : '',
              myClassSummary.attendanceStatus === '有缺勤待处理' ? 'bg-orange-100 text-orange-700' : '',
              myClassSummary.attendanceStatus === '异常' ? 'bg-red-100 text-red-700' : '',
            ]"
          >
            <view v-if="['有缺勤待处理', '异常'].includes(myClassSummary.attendanceStatus)" class="mr-1">
              ⚠️
            </view>
            {{ myClassSummary.attendanceStatus }}
          </view>
        </view>

        <view v-if="myClassSummary.specialStatus" class="mb-3 rounded-lg p-3" :class="getSpecialStatusClass(myClassSummary.specialStatus)">
          <view class="mb-1 flex items-center">
            <text class="text-sm font-medium">{{ getSpecialStatusTitle(myClassSummary.specialStatus) }}</text>
          </view>
          <view class="text-xs" :class="getSpecialStatusTextClass(myClassSummary.specialStatus)">
            {{ getSpecialStatusDesc(myClassSummary) }}
          </view>
        </view>

        <view
          v-if="myClassHasException"
          class="mb-3 flex items-center justify-between rounded-lg bg-red-100 px-3 py-2 text-xs text-red-700"
        >
          <view class="flex items-center">
            <text>班级信息存在异常/缺失，可能影响考勤填充，请在班级终端完善</text>
          </view>
          <button
            class="w-16 rounded-full bg-red-500 px-2 py-0.5 text-xs text-white transition-colors hover:bg-red-600"
            @click="goToMyClass"
          >
            去查看
          </button>
        </view>

        <view class="grid grid-cols-4 mb-3 gap-3">
          <view v-if="isNonAttendanceTime()" class="col-span-4 border border-gray-200 rounded-lg bg-gray-50 p-3 text-center">
            <text class="text-lg text-gray-600 font-bold">非考勤时段</text>
            <text class="mt-1 block text-xs text-gray-500">{{ myClassSummary.timeSlotName }}</text>
          </view>

          <template v-else>
            <view class="rounded-lg bg-white p-2 text-center">
              <text class="mb-1 block text-xs text-gray-500">应到人数</text>
              <text class="text-xl text-gray-800 font-bold">{{ myClassSummary.shouldAttend }}</text>
            </view>
            <view class="rounded-lg bg-white p-2 text-center">
              <text class="mb-1 block text-xs text-gray-500">实到人数</text>
              <text class="text-xl text-green-600 font-bold">{{ myClassSummary.present }}</text>
            </view>
            <view class="rounded-lg bg-white p-2 text-center">
              <text class="mb-1 block text-xs text-gray-500">缺勤人数</text>
              <text class="text-xl text-red-600 font-bold">{{ myClassSummary.absentWithoutLeave }}</text>
            </view>
            <view class="rounded-lg bg-white p-2 text-center">
              <text class="mb-1 block text-xs text-gray-500">请假人数</text>
              <text class="text-xl text-blue-600 font-bold">{{ myClassSummary.absent }}</text>
            </view>
          </template>
        </view>

        <view class="flex justify-center space-x-3">
          <template v-if="!isNonAttendanceTime()">
            <button
              class="flex-1 rounded-lg bg-orange-500 py-2 text-sm text-white transition-colors hover:bg-orange-600"
              @click="goToMyClassDetail"
            >
              去考勤
            </button>
            <button
              class="flex-1 rounded-lg bg-green-500 py-2 text-sm text-white transition-colors hover:bg-green-600"
              @click="goToMyClass"
            >
              查看本班详情
            </button>
          </template>
          <template v-else>
            <button
              class="w-full rounded-lg bg-green-500 py-2 text-sm text-white transition-colors hover:bg-green-600"
              @click="goToMyClass"
            >
              查看本班详情
            </button>
          </template>
        </view>
      </view>
    </view>

    <view class="px-5 pb-8">
      <view class="mb-3 text-base text-gray-800 font-semibold">
        其他排班班级（{{ classList.length }}个）
        <span v-if="dataErrorCount > 0" class="ml-2 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
          数据异常：{{ dataErrorCount }}个
        </span>
      </view>

      <view v-if="yesterdayUncompletedCount > 0" class="mb-3 flex items-center border-l-4 border-red-500 rounded-r-lg bg-red-50 px-3 py-2">
        <view class="mr-2 text-red-500">
          🔴
        </view>
        <text class="text-sm text-red-700">有{{ yesterdayUncompletedCount }}个班级昨日未完成考勤，点击</text>
        <button class="ml-1 text-sm text-red-600 font-medium" @click="goToYesterdayUncompleted">
          去处理
        </button>
        <text class="ml-1 text-sm text-red-700">补录</text>
      </view>

      <view v-if="batchUncompletedCount > 5" class="mb-3 flex items-center border-l-4 border-blue-500 rounded-r-lg bg-blue-50 px-3 py-2">
        <view class="mr-2 text-blue-500">
          📢
        </view>
        <text class="text-sm text-blue-700">当前时段还有{{ batchUncompletedCount }}个班级未考勤，点击</text>
        <button class="ml-1 text-sm text-blue-600 font-medium" @click="goToBatchUncompleted">
          批量查看
        </button>
        <text class="ml-1 text-sm text-blue-700">处理</text>
      </view>

      <view v-if="dataErrorCount > 0" class="mb-3 flex items-center border-l-4 border-yellow-500 rounded-r-lg bg-yellow-50 px-3 py-2">
        <view class="mr-2 text-yellow-500">
          ⚠️
        </view>
        <text class="text-sm text-yellow-700">有{{ dataErrorCount }}个班级数据异常（实到＞应到/负数等），请核对后再考勤</text>
      </view>

      <view v-if="isLoading" class="flex flex-col items-center justify-center py-10">
        <view class="loading-spinner" />
        <text class="ml-2 mt-3 text-gray-500">加载中...</text>
      </view>

      <view v-else>
        <view v-if="classList.length === 0" class="py-10 text-center text-gray-500">
          暂无其他排班班级数据
          <view v-if="dataParseError" class="mt-2 text-xs text-red-500">
            数据解析异常：{{ dataParseError }}
          </view>
        </view>

        <template v-for="group in normalClassGroups" v-else :key="group.type">
          <view :class="`${getGroupTitleClass(group.type)} px-4 py-2 mb-3 rounded-r-lg flex justify-between items-center`">
            <view class="text-sm font-medium">
              {{ group.name }}
              <span class="ml-2 text-xs text-gray-500 font-normal">
                ({{ group.classes.filter(c => !c.completed).length }}个待完成)
              </span>
              <span v-if="group.dataErrorCount > 0" class="ml-2 rounded-full bg-yellow-100 px-1.5 py-0.5 text-xs text-yellow-700">
                异常：{{ group.dataErrorCount }}个
              </span>
            </view>
            <view v-if="group.type === priorityType" class="rounded bg-orange-100 px-2 py-0.5 text-xs text-orange-700">
              当前重点
            </view>
          </view>

          <view v-if="group.classes.length > 0" class="mb-4">
            <view
              v-for="classItem in group.classes"
              :id="`class_${classItem.id}`"
              :key="classItem.id"
              :class="[
                getClassCardClass(classItem.completed),
                (classItem.missingInfo && !(classItem.shouldAttend <= 0)) ? 'opacity-70 border-red-300 bg-red-50' : '',
                classItem.dataError ? 'border-yellow-300 bg-yellow-50' : '',
                classItem.untilDeadline <= 30 && !classItem.completed ? 'animate-pulse' : '',
              ]"
              @click="handleNormalClassClick(classItem)"
            >
              <view v-if="classItem.untilDeadline <= 30 && !classItem.completed" class="absolute right-2 top-2 z-10 h-5 w-5 flex items-center justify-center rounded-full bg-red-500 text-xs text-white">
                {{ classItem.untilDeadline }}
              </view>

              <view v-if="classItem.leaveRequestIncreased" class="absolute left-2 top-2 z-10 rounded-full bg-blue-500 px-2 py-0.5 text-xs text-white">
                新增请假+{{ classItem.leaveRequestIncreased }}
              </view>

              <view v-if="classItem.specialStatus" class="mx-3 mt-2 rounded-lg p-2" :class="getSpecialStatusClass(classItem.specialStatus)">
                <view class="flex items-center">
                  <text class="text-xs font-medium">{{ getSpecialStatusTitle(classItem.specialStatus) }}</text>
                </view>
                <view class="mt-0.5 text-xs" :class="getSpecialStatusTextClass(classItem.specialStatus)">
                  {{ getSpecialStatusDesc(classItem) }}
                </view>
              </view>

              <view v-if="classItem.dataError" class="flex items-center bg-yellow-100 px-3 py-1 text-xs text-yellow-700">
                <view class="mr-1">
                  ⚠️
                </view>
                <text>{{ classItem.dataError }}</text>
              </view>

              <view class="relative flex items-start justify-between border-b px-4 py-3" :style="{ 'padding-top': classItem.dataError ? '1rem' : '0' }">
                <view>
                  <view class="text-lg text-gray-800 font-bold">
                    {{ classItem.name }}
                  </view>
                  <view class="mt-1 text-xs text-gray-500">
                    年级: {{ classItem.grade }} | 应到学生: {{ classItem.shouldAttend }} 人
                  </view>
                </view>
                <view class="flex flex-col items-end">
                  <view class="rounded-full bg-blue-100 px-2 py-0.5 text-xs text-blue-700">
                    {{ classItem.timeSlotName }}
                  </view>
                  <view class="mt-1 text-xs text-gray-600">
                    {{ classItem.scheduleTime }}
                  </view>
                </view>
              </view>

              <view class="flex items-center justify-between px-4 py-3 pr-8">
                <view v-if="classItem.todayAttendance" class="text-xs">
                  <text class="text-green-600">已到: {{ classItem.todayAttendance.present }} 人</text>
                  <text class="mx-1 text-gray-300">|</text>
                  <text class="text-red-600">请假: {{ classItem.todayAttendance.absent }} 人</text>
                  <span v-if="classItem.todayAttendance.present < 0" class="ml-1 text-yellow-500">⚠️ 实到为负</span>
                  <span v-if="classItem.todayAttendance.present > classItem.shouldAttend && classItem.shouldAttend > 0" class="ml-1 text-yellow-500">⚠️ 数据异常</span>
                </view>
                <view v-else class="text-xs text-gray-500">
                  尚未考勤
                </view>

                <view class="flex items-center">
                  <button
                    v-if="!isNonAttendanceTime() && !classItem.completed && !classItem.missingInfo"
                    class="mr-2 rounded-full bg-orange-500 px-2.5 py-0.5 text-xs text-white transition-colors hover:bg-orange-600"
                    @click.stop="markNormalClassAsFullAttendance(classItem)"
                  >
                    全勤
                  </button>
                  <button
                    v-if="!isNonAttendanceTime() && !classItem.completed && classItem.missingInfo && !(classItem.shouldAttend <= 0)"
                    class="mr-2 rounded-full bg-gray-400 px-2.5 py-0.5 text-xs text-white"
                    disabled
                  >
                    无法操作
                  </button>
                  <text v-if="isNonAttendanceTime()" class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                    非考勤时段
                  </text>
                  <text v-else-if="classItem.completed" class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                    已完成
                  </text>
                  <text v-else-if="!classItem.missingInfo" class="rounded-full bg-gray-100 px-2.5 py-0.5 text-xs text-gray-700">
                    待完成
                  </text>
                  <text v-else class="rounded-full bg-red-100 px-2.5 py-0.5 text-xs text-red-700">
                    信息缺失
                  </text>
                </view>
              </view>
            </view>
          </view>

          <view v-else class="mb-4 rounded-xl bg-white py-4 text-center text-sm text-gray-500">
            暂无{{ group.name }}
          </view>
        </template>
      </view>
    </view>
  </view>
</template>

<script setup>
import { onLoad, onPullDownRefresh, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { appAttendanceUsingGet } from '@/service/attendance'

definePage({
  type: 'page',
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '考勤总览',
    enablePullDownRefresh: true,
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const isLoading = ref(false)
const classList = ref([])
const myClassSummary = ref(null)
const currentHour = ref(new Date().getHours())
const monthlyStats = ref({
  totalSchedules: 0,
  completedSchedules: 0,
  pendingSchedules: 0,
})
const hasLoaded = ref(false)
const dataParseError = ref('')

const remindStatus = ref({
  hasUnprocessedAbsent: false,
  timeOutRemindCount: 0,
  batchUncompletedCount: 0,
  dataErrorCount: 0,
  missingInfoCount: 0,
  yesterdayUncompletedCount: 0,
  cachedRemind: uni.getStorageSync('attendanceRemind') || {},
})

const topNotice = ref({ show: false })

const lastNormalClassLeaveRequests = ref({})
const missingInfoCount = ref(0)
const dataErrorCount = ref(0)
const yesterdayUncompletedCount = ref(0)
const batchUncompletedCount = ref(0)
const firstProblemClassId = ref('')

const myClassHasException = computed(() => {
  if (!myClassSummary.value)
    return false
  const { shouldAttend, present, absent, absentWithoutLeave, attendanceStatus } = myClassSummary.value

  return (
    shouldAttend == null || shouldAttend === '' || shouldAttend <= 0
    || present < 0 || present > shouldAttend
    || absent < 0 || absentWithoutLeave < 0
    || ['有缺勤待处理', '异常'].includes(attendanceStatus)
  )
})

const priorityType = computed(() => currentHour.value < 15 ? 'noon' : 'evening')

function getClassTimeType(startTime) {
  if (!startTime)
    return 'other'
  const hourMatch = startTime.match(/^(\d{2}):/)
  if (!hourMatch)
    return 'other'
  return Number.parseInt(hourMatch[1], 10) < 15 ? 'noon' : 'evening'
}

function getMissingInfoDesc(classItem) {
  if (classItem.shouldAttend <= 0)
    return '应到人数异常（≤0）'
  if (classItem.grade === '未知')
    return '年级未配置'
  if (classItem.timeSlotName === '未知时段')
    return '考勤时段未配置'
  if (!classItem.endTime)
    return '无考勤截止时间'
  return '关键信息缺失'
}

function checkClassDataError(classItem) {
  const errors = []
  if (classItem.todayAttendance?.present < 0)
    errors.push('实到人数为负数')
  if (classItem.todayAttendance?.present > classItem.shouldAttend && classItem.shouldAttend > 0)
    errors.push('实到人数超过应到人数')
  if (classItem.todayAttendance?.absent < 0)
    errors.push('请假人数为负数')
  if (classItem.todayAttendance?.leaveRequest < 0)
    errors.push('请假申请数为负数')
  return errors.length > 0 ? errors.join(' | ') : ''
}

function checkClassMissingInfo(classItem) {
  return classItem.shouldAttend <= 0
    || classItem.grade === '未知'
    || classItem.timeSlotName === '未知时段'
    || !classItem.endTime
}

const normalClassGroups = computed(() => {
  const groups = []
  const classes = Array.isArray(classList.value) ? classList.value : []

  const noonClasses = classes.filter(item => getClassTimeType(item.startTime) === 'noon')
  const eveningClasses = classes.filter(item => getClassTimeType(item.startTime) === 'evening')
  const otherClasses = classes.filter(item => getClassTimeType(item.startTime) === 'other')

  const processGroup = (type, name, classItems) => {
    if (classItems.length === 0)
      return
    const sorted = classItems
      .sort((a, b) => a.completed === b.completed ? a.scheduleTime.localeCompare(b.scheduleTime) : a.completed ? 1 : -1)
      .map(item => addClassExtraInfo(item))

    groups.push({
      type,
      name,
      classes: sorted,
      dataErrorCount: sorted.filter(item => item.dataError !== '').length,
    })
  }

  if (priorityType.value === 'noon') {
    processGroup('noon', `午托班级（共${noonClasses.length}个）`, noonClasses)
    processGroup('evening', `晚托班级（共${eveningClasses.length}个）`, eveningClasses)
  }
  else {
    processGroup('evening', `晚托班级（共${eveningClasses.length}个）`, eveningClasses)
    processGroup('noon', `午托班级（共${noonClasses.length}个）`, noonClasses)
  }
  processGroup('other', `其他时段班级（共${otherClasses.length}个）`, otherClasses)

  return groups
})

function updateClassStats() {
  const classes = Array.isArray(classList.value) ? classList.value : []

  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString()
  yesterdayUncompletedCount.value = classes.filter(item =>
    !item.completed && item.attendanceDate === yesterdayStr,
  ).length

  const currentGroupType = priorityType.value
  batchUncompletedCount.value = classes.filter(item =>
    getClassTimeType(item.startTime) === currentGroupType && !item.completed,
  ).length

  dataErrorCount.value = classes.filter(item => checkClassDataError(item) !== '').length

  const firstProblemClass = classes.find(item => checkClassMissingInfo(item) || checkClassDataError(item) !== '')
  firstProblemClassId.value = firstProblemClass ? firstProblemClass.id : ''

  missingInfoCount.value = classes.filter(item => checkClassMissingInfo(item)).length
}

watch(classList, () => {
  updateClassStats()
}, { immediate: true, deep: true })

const stats = computed(() => {
  const hasMyClass = !!myClassSummary.value
  const myClassCompleted = hasMyClass && myClassSummary.value.attendanceStatus === '已完成'
  const totalNormal = Array.isArray(classList.value) ? classList.value.length : 0
  const completedNormal = Array.isArray(classList.value)
    ? classList.value.filter(c => c.completed).length
    : 0

  const total = totalNormal + (hasMyClass ? 1 : 0)
  const completed = completedNormal + (myClassCompleted ? 1 : 0)

  return {
    total,
    completed,
    pending: total - completed,
    progress: total > 0 ? Math.round((completed / total) * 100) : 0,
  }
})

const remindTool = {
  alert: (title, content, confirmText = '去处理', cancelText = '稍后') => new Promise((resolve) => {
    uni.showModal({ title, content, confirmText, cancelText, success: res => resolve(res.confirm) })
  }),
  confirm: (title, content) => new Promise((resolve) => {
    uni.showModal({ title, content, confirmText: '确认', cancelText: '取消', success: res => resolve(res.confirm) })
  }),
  urgentAlert: (title, content) => {
    uni.vibrateLong()
    return remindTool.alert(title, content)
  },
  toast: (title, icon = 'none') => {
    uni.showToast({ title, icon, duration: 1500, mask: true })
  },
  success: (title) => {
    uni.showToast({ title, icon: 'success', duration: 1500, mask: true })
  },
  error: (title) => {
    uni.showToast({ title, icon: 'none', duration: 2000, mask: true })
  },
  recordRemind: (key, value = true) => {
    remindStatus.value.cachedRemind[key] = { value, date: new Date().toLocaleDateString(), time: new Date().getTime() }
    uni.setStorageSync('attendanceRemind', remindStatus.value.cachedRemind)
  },
  shouldRemind: (key) => {
    const cached = remindStatus.value.cachedRemind[key]
    if (!cached)
      return true
    if (key.includes('today'))
      return cached.date !== new Date().toLocaleDateString()
    if (key.includes('once'))
      return (new Date().getTime() - cached.time) > 24 * 60 * 60 * 1000
    return false
  },
  logError: (msg, data = {}) => {
    console.error('[AttendanceRemindError]', msg, data)
  },
}

function addClassExtraInfo(classItem) {
  let untilDeadline = 999
  if (classItem.endTime) {
    const now = new Date()
    const [endHour, endMinute] = classItem.endTime.split(':').map(Number)
    const deadline = new Date(now.getFullYear(), now.getMonth(), now.getDate(), endHour, endMinute)
    const diff = (deadline - now) / (1000 * 60)
    untilDeadline = diff > 0 ? Math.ceil(diff) : 0
  }

  const missingInfo = checkClassMissingInfo(classItem)
  const missingInfoDesc = missingInfo ? getMissingInfoDesc(classItem) : ''
  const dataError = checkClassDataError(classItem)

  const lastLeaveCount = lastNormalClassLeaveRequests.value[classItem.id] || 0
  const currentLeaveCount = classItem.todayAttendance?.leaveRequest || 0
  const leaveRequestIncreased = currentLeaveCount > lastLeaveCount ? currentLeaveCount - lastLeaveCount : 0

  return { ...classItem, untilDeadline, missingInfo, missingInfoDesc, dataError, leaveRequestIncreased }
}

function isNonAttendanceTime() {
  if (!myClassSummary.value)
    return false
  return ['未知时段', '非考勤时段', '休息时段'].includes(myClassSummary.value.timeSlotName)
}

function getSpecialStatusClass(status) {
  switch (status) {
    case 'cancelled': return 'bg-red-50 border border-red-200'
    case 'replaced': return 'bg-blue-50 border border-blue-200'
    case 'makeup': return 'bg-green-50 border border-green-200'
    default: return 'bg-gray-50 border border-gray-200'
  }
}

function getSpecialStatusTextClass(status) {
  switch (status) {
    case 'cancelled': return 'text-red-600'
    case 'replaced': return 'text-blue-600'
    case 'makeup': return 'text-green-600'
    default: return 'text-gray-600'
  }
}

function getSpecialStatusTitle(status) {
  switch (status) {
    case 'cancelled': return '🚫 停课通知'
    case 'replaced': return '📅 调课通知'
    case 'makeup': return '📚 补课通知'
    default: return '📋 特殊安排'
  }
}

function getSpecialStatusDesc(classInfo) {
  const status = classInfo.specialStatus
  switch (status) {
    case 'cancelled':
      return classInfo.cancelReason || '今日课程已停课，无需考勤'
    case 'replaced': {
      const replaceDate = classInfo.replaceTargetDate
      return replaceDate
        ? `今日课程调至 ${replaceDate} 进行，请届时完成考勤`
        : '今日课程已调课，请关注后续安排'
    }
    case 'makeup': {
      const makeupInfo = classInfo.makeupInfo
      if (makeupInfo) {
        const originalDate = makeupInfo.originalDate
        const isAllDay = makeupInfo.isAllDay
        return isAllDay
          ? `今日为全天补课日，补 ${originalDate} 的课程`
          : `今日补 ${originalDate} 的课程，请完成考勤`
      }
      return '今日为补课日，请完成考勤'
    }
    default:
      return ''
  }
}

function scrollToFirstProblemClass() {
  if (!firstProblemClassId.value) {
    remindTool.toast('暂无问题班级')
    return
  }
  uni.createSelectorQuery().select(`#class_${firstProblemClassId.value}`).boundingClientRect((rect) => {
    if (rect) {
      uni.pageScrollTo({ scrollTop: rect.top - 100, duration: 300 })
      remindTool.toast('已定位到第一个问题班级')
    }
  }).exec()
}

function checkMyClassAbnormalRemind() {
  if (!myClassSummary.value)
    return

  if (myClassHasException.value && remindTool.shouldRemind('myclass_unified_exception')) {
    remindTool.urgentAlert('班级信息异常', `您的班级（${myClassSummary.value.className}）存在信息异常/缺失，可能影响考勤统计，请尽快查看完善！`).then((confirm) => {
      if (confirm)
        goToMyClass()
    })
    remindTool.recordRemind('myclass_unified_exception')
    remindStatus.value.hasUnprocessedAbsent = true
  }
}

function checkNormalClassReminds() {
  classList.value.forEach((classItem) => {
    const leaveIncreased = classItem.leaveRequestIncreased
    const remindKey = `leave_increased_${classItem.id}_today`

    if (leaveIncreased > 0 && remindTool.shouldRemind(remindKey)) {
      remindTool.alert(
        '新增请假提醒',
        `【${classItem.name}】新增${leaveIncreased}条请假申请，请及时核对考勤！`,
        '去查看',
        '知道了',
      ).then((confirm) => {
        if (confirm)
          goToClassDetail(classItem)
      })
      remindTool.recordRemind(remindKey)
    }
    lastNormalClassLeaveRequests.value[classItem.id] = classItem.todayAttendance?.leaveRequest || 0
  })

  classList.value.forEach((classItem) => {
    const remindKey = `deadline_urgent_${classItem.id}_today`
    if (classItem.untilDeadline <= 10 && !classItem.completed && remindTool.shouldRemind(remindKey)) {
      remindTool.urgentAlert(
        '考勤即将截止',
        `【${classItem.name}】考勤将在${classItem.untilDeadline}分钟后截止，请尽快完成考勤！`,
        '马上去做',
        '稍后',
      ).then((confirm) => {
        if (confirm)
          goToClassDetail(classItem)
      })
      remindTool.recordRemind(remindKey)
    }
  })

  const errorGroups = normalClassGroups.value.filter(g => g.dataErrorCount > 0)
  errorGroups.forEach((group) => {
    const remindKey = `data_error_group_${group.type}_today`
    if (remindTool.shouldRemind(remindKey)) {
      remindTool.alert(
        '数据异常提醒',
        `【${group.name}】中有${group.dataErrorCount}个班级数据异常（实到＞应到/负数等），请核对后再考勤！`,
        '去核对',
        '知道了',
      ).then((confirm) => {
        if (confirm)
          scrollToFirstProblemClass()
      })
      remindTool.recordRemind(remindKey)
    }
  })

  if (yesterdayUncompletedCount.value > 0 && currentHour.value >= 9 && remindTool.shouldRemind('yesterday_uncompleted_today')) {
    remindTool.alert(
      '昨日考勤未完成',
      `有${yesterdayUncompletedCount.value}个班级昨日未完成考勤，请尽快补录！`,
      '去补录',
      '稍后',
    ).then((confirm) => {
      if (confirm)
        goToYesterdayUncompleted()
    })
    remindTool.recordRemind('yesterday_uncompleted_today')
  }

  const batchRemindKey = `batch_uncompleted_${priorityType.value}_today`
  const batchThreshold = currentHour.value < 12 ? 8 : 5
  if (batchUncompletedCount.value > batchThreshold && remindTool.shouldRemind(batchRemindKey)) {
    remindTool.alert(
      '批量考勤待处理',
      `当前${priorityType.value === 'noon' ? '午托' : '晚托'}时段有${batchUncompletedCount.value}个班级未考勤，建议批量处理！`,
      '批量处理',
      '稍后',
    ).then((confirm) => {
      if (confirm)
        goToBatchUncompleted()
    })
    remindTool.recordRemind(batchRemindKey)
  }
}

onLoad(() => {
  lastNormalClassLeaveRequests.value = uni.getStorageSync('lastNormalClassLeaveRequests') || {}
  loadData()
  uni.$on('refreshAttendance', loadData)
})

onShow(() => {
  currentHour.value = new Date().getHours()
  if (hasLoaded.value) {
    checkMyClassAbnormalRemind()
    checkNormalClassReminds()
  }
  if (!hasLoaded.value || (classList.value.length === 0 && !myClassSummary.value)) {
    loadData()
  }
})

onUnload(() => {
  uni.$off('refreshAttendance')
  uni.setStorageSync('lastNormalClassLeaveRequests', lastNormalClassLeaveRequests.value)
})

onPullDownRefresh(() => {
  if (isLoading.value) {
    uni.stopPullDownRefresh()
    return
  }
  loadData().finally(() => {
    uni.stopPullDownRefresh()
    checkNormalClassReminds()
  })
})

async function loadData() {
  isLoading.value = true
  dataParseError.value = ''

  try {
    const data = await appAttendanceUsingGet({ options: { timeout: 10000 } })

    if (!data)
      throw new Error('接口返回数据为空')

    const { classList: remoteNormalClasses, myClassInfo: remoteMyClass, monthlyStats: remoteMonthly } = data

    if (remoteMyClass) {
      const shouldAttend = remoteMyClass.shouldAttend || 0
      const present = remoteMyClass.todayAttendance?.present || 0
      const absent = remoteMyClass.todayAttendance?.absent || 0
      const absentWithoutLeave = shouldAttend - present - absent
      const attendanceStatus = remoteMyClass.attendanceStatus || '待确认'

      myClassSummary.value = {
        className: remoteMyClass.name || '我的班级',
        grade: remoteMyClass.grade || '未知',
        classNum: remoteMyClass.classNum || '未知',
        shouldAttend,
        present,
        absent,
        absentWithoutLeave: Math.max(0, absentWithoutLeave),
        attendanceStatus,
        timeSlotName: remoteMyClass.timeSlotName || '未知时段',
        classId: remoteMyClass.id || `myclass_${Date.now()}`,
        attendanceDate: remoteMyClass.attendanceDate || new Date().toLocaleDateString(),
        startTime: remoteMyClass.startTime || '',
        endTime: remoteMyClass.endTime || '',
        specialStatus: remoteMyClass.specialStatus || null,
        cancelReason: remoteMyClass.cancelReason || '',
        replaceTargetDate: remoteMyClass.replaceTargetDate || '',
        makeupInfo: remoteMyClass.makeupInfo || null,
      }
    }
    else {
      myClassSummary.value = null
    }

    if (remoteNormalClasses == null) {
      classList.value = []
    }
    else if (!Array.isArray(remoteNormalClasses)) {
      classList.value = []
      dataParseError.value = '普通班级列表格式错误'
      remindTool.logError('普通班级列表格式错误', { remoteNormalClasses })
    }
    else {
      classList.value = remoteNormalClasses.map(item => ({
        id: item.id || `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        scheduleId: item.scheduleId || `temp_schedule_${Date.now()}_${Math.random().toString(36)}`,
        name: item.name || '未知班级',
        grade: item.grade || '未知',
        shouldAttend: item.shouldAttend || 0,
        startTime: item.startTime || '',
        endTime: item.endTime || '',
        scheduleTime: item.scheduleTime || '',
        timeSlotName: item.timeSlotName || '未知时段',
        completed: item.completed || false,
        todayAttendance: item.todayAttendance || null,
        attendanceDate: item.attendanceDate || new Date().toLocaleDateString(),
        ...item,
      }))
    }

    if (remoteMonthly && typeof remoteMonthly === 'object') {
      monthlyStats.value = {
        totalSchedules: remoteMonthly.totalSchedules || 0,
        completedSchedules: remoteMonthly.completedSchedules || 0,
        pendingSchedules: remoteMonthly.pendingSchedules || 0,
      }
    }
    else {
      monthlyStats.value = { totalSchedules: 0, completedSchedules: 0, pendingSchedules: 0 }
    }

    hasLoaded.value = true
    setTimeout(() => {
      checkMyClassAbnormalRemind()
      checkNormalClassReminds()
    }, 500)
  }
  catch (error) {
    console.error('[loadData] 数据加载异常:', error)
    remindTool.error('数据加载失败，请重试')
    dataParseError.value = `加载失败: ${error.message}`
    remindTool.logError('数据加载异常', { error: error.message, stack: error.stack })
  }
  finally {
    isLoading.value = false
  }
}

function getScheduleTypeByTimeSlot(timeSlotName) {
  if (!timeSlotName)
    return 'noon'
  if (timeSlotName.includes('午') || timeSlotName.includes('中午'))
    return 'noon'
  if (timeSlotName.includes('晚') || timeSlotName.includes('晚上'))
    return 'evening'
  return 'noon'
}

function goToMyClass() {
  if (!myClassSummary.value)
    return

  const scheduleType = getScheduleTypeByTimeSlot(myClassSummary.value.timeSlotName)

  uni.navigateTo({
    url: `/pages-attendance-detail/MyClass/index`,
  })
}

function goToClassDetail(classInfo) {
  let scheduleType = 'noon'
  const hourMatch = classInfo.startTime?.match(/^(\d{2}):/)
  if (hourMatch) {
    const hour = Number.parseInt(hourMatch[1], 10)
    scheduleType = hour < 15 ? 'noon' : 'evening'
  }
  else {
    scheduleType = getScheduleTypeByTimeSlot(classInfo.timeSlotName)
  }

  uni.navigateTo({
    url: `/pages-attendance-detail/index?`
      + `classId=${classInfo.id}&`
      + `scheduleId=${classInfo.scheduleId}&`
      + `className=${encodeURIComponent(classInfo.name)}&`
      + `grade=${encodeURIComponent(classInfo.grade)}&`
      + `shouldAttend=${classInfo.shouldAttend}&`
      + `scheduleType=${scheduleType}&`
      + `timeSlotName=${encodeURIComponent(classInfo.timeSlotName)}&`
      + `startTime=${classInfo.startTime || ''}&`
      + `endTime=${classInfo.endTime || ''}&`
      + `isNormalClass=true&`
      + `dataError=${encodeURIComponent(classInfo.dataError || '')}`,
  })
}

function goToMyClassDetail() {
  if (!myClassSummary.value)
    return

  let scheduleType = 'noon'
  const hourMatch = myClassSummary.value.startTime?.match(/^(\d{2}):/)
  if (hourMatch) {
    const hour = Number.parseInt(hourMatch[1], 10)
    scheduleType = hour < 15 ? 'noon' : 'evening'
  }
  else {
    scheduleType = getScheduleTypeByTimeSlot(myClassSummary.value.timeSlotName)
  }

  uni.navigateTo({
    url: `/pages-attendance-detail/index?`
      + `classId=${myClassSummary.value.classId}&`
      + `scheduleId=${myClassSummary.value.scheduleId || ''}&`
      + `className=${encodeURIComponent(myClassSummary.value.className)}&`
      + `grade=${encodeURIComponent(myClassSummary.value.grade)}&`
      + `shouldAttend=${myClassSummary.value.shouldAttend}&`
      + `scheduleType=${scheduleType}&`
      + `timeSlotName=${encodeURIComponent(myClassSummary.value.timeSlotName)}&`
      + `startTime=${myClassSummary.value.startTime || ''}&`
      + `endTime=${myClassSummary.value.endTime || ''}&`
      + `dataError=${encodeURIComponent(myClassSummary.value.dataError || '')}`,
  })
}

function handleNormalClassClick(classItem) {
  if (classItem.dataError) {
    remindTool.confirm('班级数据异常', `⚠️ 该班级存在数据异常：${classItem.dataError}\n是否继续查看详情并修正？`).then((confirm) => {
      if (confirm)
        goToClassDetail(classItem)
    })
    return
  }
  goToClassDetail(classItem)
}

async function checkTimeConflict(classTimeType) {
  const validType = ['noon', 'evening'].includes(classTimeType) ? classTimeType : 'noon'

  if (currentHour.value < 15 && validType === 'evening') {
    return await remindTool.confirm('时段提醒', `当前时间(${currentHour.value}:00)属于午托时段（0:00-15:00），您正在处理晚托班级考勤。\n确认继续提交吗？`)
  }
  if (currentHour.value >= 15 && validType === 'noon') {
    return await remindTool.confirm('时段提醒', `当前时间(${currentHour.value}:00)属于晚托时段（15:00-24:00），您正在处理午托班级考勤。\n确认继续提交吗？`)
  }
  return true
}

async function markNormalClassAsFullAttendance(classInfo) {
  const classTimeType = getScheduleTypeByTimeSlot(classInfo.timeSlotName) || (getClassTimeType(classInfo.startTime) === 'noon' ? 'noon' : 'evening')
  const canProceed = await checkTimeConflict(classTimeType)
  if (!canProceed)
    return

  const confirm = await remindTool.confirm(
    '确认全勤',
    `确认${classInfo.name}（${classInfo.timeSlotName}）全勤？\n应到${classInfo.shouldAttend}人，实到${classInfo.shouldAttend}人，请假0人`,
  )

  if (confirm) {
    uni.showLoading({ title: '提交中...' })
    try {
      const index = classList.value.findIndex(item => item.id === classInfo.id)
      if (index !== -1) {
        lastNormalClassLeaveRequests.value[classInfo.id] = 0
        classList.value[index] = {
          ...classList.value[index],
          completed: true,
          todayAttendance: { present: classList.value[index].shouldAttend, absent: 0, leaveRequest: 0 },
          leaveRequestIncreased: 0,
        }
        monthlyStats.value.completedSchedules++
        monthlyStats.value.pendingSchedules = Math.max(0, monthlyStats.value.pendingSchedules - 1)
      }
      remindTool.success('已标记全勤')
      uni.$emit('attendanceUpdated')
      uni.$emit('refreshClassList')
    }
    catch (error) {
      console.error('[markNormalClassAsFullAttendance] 标记失败:', error)
      remindTool.error('标记失败，请重试')
      remindTool.logError('普通班级标记全勤失败', { classId: classInfo.id, error: error.message })
    }
    finally {
      uni.hideLoading()
    }
  }
}

function goToYesterdayUncompleted() {
  const yesterday = new Date()
  yesterday.setDate(yesterday.getDate() - 1)
  const yesterdayStr = yesterday.toLocaleDateString()

  const targetGroup = normalClassGroups.value.find(g => g.classes.some(c => c.attendanceDate === yesterdayStr))
  if (targetGroup) {
    const targetClass = targetGroup.classes.find(c => c.attendanceDate === yesterdayStr && !c.completed)
    if (targetClass) {
      uni.createSelectorQuery().select(`#class_${targetClass.id}`).boundingClientRect((rect) => {
        if (rect) {
          uni.pageScrollTo({ scrollTop: rect.top - 100, duration: 300 })
          remindTool.toast('已定位到昨日未完成班级')
        }
      }).exec()
    }
    else {
      remindTool.toast('未找到昨日未完成班级')
    }
  }
  else {
    remindTool.toast('暂无昨日未完成班级分组')
  }
}

function goToBatchUncompleted() {
  const currentGroup = normalClassGroups.value.find(g => g.type === priorityType.value)
  if (currentGroup) {
    const targetClass = currentGroup.classes.find(c => !c.completed && !c.missingInfo)
    if (targetClass) {
      uni.createSelectorQuery().select(`#class_${targetClass.id}`).boundingClientRect((rect) => {
        if (rect) {
          uni.pageScrollTo({ scrollTop: rect.top - 100, duration: 300 })
          remindTool.toast('已定位到当前时段未完成班级')
        }
      }).exec()
    }
    else {
      remindTool.toast('当前时段暂无可处理的未完成班级')
    }
  }
  else {
    remindTool.toast('暂无当前时段班级分组')
  }
}

function getClassCardClass(completed) {
  return 'bg-white rounded-xl shadow-sm mb-3 overflow-hidden transition-all duration-200 hover:shadow-md cursor-pointer relative'
}

function getGroupTitleClass(type) {
  switch (type) {
    case 'noon': return 'bg-blue-50 border-l-4 border-blue-500'
    case 'evening': return 'bg-purple-50 border-l-4 border-purple-500'
    default: return 'bg-gray-50 border-l-4 border-gray-500'
  }
}
</script>
