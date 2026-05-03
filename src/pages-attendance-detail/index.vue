/* eslint-disable */
<script lang="ts" setup>
import type {
  AttendanceStatistics,
  StudentException,
} from '@/service/types'
import { onLoad, onShow, onUnload } from '@dcloudio/uni-app'
import { computed, ref, watch } from 'vue'
import { appAttendanceAttendanceDetailUsingGet } from '@/service/attendance'
import { useAttendanceAddStore } from '@/store/attendance_add'

definePage({
  style: {
    navigationStyle: 'default',
    navigationBarTitleText: '',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

// 完整考勤数据类型
interface FullAttendanceData {
  className: string
  grade: string
  timeSlotName: string
  attendanceDate: string
  stats: AttendanceStatistics
  leaveStudentList: StudentException[]
  absentStudentList: StudentException[]
  notes: string
  specialStatus: string | null
  cancelReason: string
}

// 考勤统计类型
type AttendanceStats = AttendanceStatistics

// 完整考勤响应类型
interface FullAttendanceResponse {
  code: number
  msg: string
  data: FullAttendanceData
}

const attendanceStore = useAttendanceAddStore()

// 类型定义
type StudentStatus = 'leave' | 'absent'

// 学生项类型（整合新接口的StudentException）
interface StudentItem extends StudentException {
  id: string
  statusText: string
}

// 页面参数类型
interface PageParams {
  scheduleId: string
}

// 状态管理
const pageParams = ref<PageParams>({
  scheduleId: '',
})

// 完整考勤数据
const fullAttendanceData = ref<FullAttendanceData | null>(null)

const attendanceData = ref({
  shouldAttend: 0,
  actualAttend: 0,
  leave: 0,
  absent: 0,
  note: '',
  attendanceDate: '',
})

const attendanceType = ref<string>('')
const today = ref('')
const currentHour = ref<number>(new Date().getHours())
const isLoading = ref(true)
const isSubmitLoading = ref(false)

const specialStatus = ref<string | null>(null)
const cancelReason = ref('')

// 学生相关状态
const studentList = ref<StudentItem[]>([])
const addStudentModalVisible = ref(false)
const modalStudentName = ref('')
const modalSelectedStatus = ref<StudentStatus>('leave')
const modalLeaveReason = ref('')
const statusDesc = computed(() => {
  return modalSelectedStatus.value === 'leave'
    ? '学生已请假且不在校'
    : '学生未请假且不在校内'
})

// 更新日期显示
function updateDateTime() {
  const date = new Date()
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  const weekday = ['周日', '周一', '周二', '周三', '周四', '周五', '周六'][date.getDay()]

  today.value = `${year}年${month}月${day}日 ${weekday}`
  currentHour.value = date.getHours()
}

// 计算考勤数据
function calculateAttendanceData() {
  if (!fullAttendanceData.value)
    return

  // 请假人数
  const leaveCount = studentList.value.filter(student => student.status === 'leave').length
  // 缺勤人数
  const absentCount = studentList.value.filter(student => student.status === 'absent').length

  attendanceData.value.leave = leaveCount
  attendanceData.value.absent = absentCount
  // 实到人数 = 应到 - 请假 - 缺勤（最小为0）
  attendanceData.value.actualAttend = Math.max(0, attendanceData.value.shouldAttend - leaveCount - absentCount)
  // 同步备注和日期
  attendanceData.value.note = fullAttendanceData.value.notes
  attendanceData.value.attendanceDate = fullAttendanceData.value.attendanceDate
}

// 获取完整的考勤详情数据（适配拦截器直接返回data）
async function fetchAttendanceDetail() {
  if (!pageParams.value.scheduleId) {
    uni.showToast({ title: '排班ID不能为空', icon: 'none' })
    isLoading.value = false
    return
  }

  try {
    isLoading.value = true

    // 调用接口（拦截器已处理，直接返回data）
    const response = await appAttendanceAttendanceDetailUsingGet({
      params: {
        schedule_id: pageParams.value.scheduleId,
      },
    })

    // 类型断言处理返回数据
    const realData = response as FullAttendanceData

    // 直接使用返回的data数据
    fullAttendanceData.value = realData

    // 初始化考勤基础数据
    attendanceData.value.shouldAttend = realData.stats.shouldAttend
    attendanceData.value.note = realData.notes
    attendanceData.value.attendanceDate = realData.attendanceDate

    // 设置页面标题相关信息
    attendanceType.value = realData.timeSlotName || '考勤'

    // 转换请假学生列表
    const leaveStudents = realData.leaveStudentList.map((item: StudentException, index: number) => ({
      id: `leave_${index}_${item.studentName || Date.now()}`,
      studentName: item.studentName || '',
      status: 'leave' as const,
      reason: item.reason || '',
      statusText: '学生已请假且不在校',
    }))

    // 转换缺勤学生列表
    const absentStudents = realData.absentStudentList.map((item: StudentException, index: number) => ({
      id: `absent_${index}_${item.studentName || Date.now()}`,
      studentName: item.studentName || '',
      status: 'absent' as const,
      reason: item.reason || '',
      statusText: '学生未请假且不在校内',
    }))

    // 合并学生列表
    studentList.value = [...leaveStudents, ...absentStudents]

    // 保存停课状态
    specialStatus.value = realData.specialStatus || null
    cancelReason.value = realData.cancelReason || ''

    // 计算考勤数据
    calculateAttendanceData()

    console.log('考勤详情加载成功:', realData)
  }
  catch (error) {
    console.error('获取考勤详情失败:', error)
    uni.showToast({ title: '获取考勤数据失败，请重试', icon: 'none' })
    fullAttendanceData.value = null // 标记加载失败
  }
  finally {
    isLoading.value = false
  }
}

// 打开自定义模态框
function openAddStudentModal(editStudent?: StudentItem) {
  if (editStudent) {
    modalStudentName.value = editStudent.studentName
    modalSelectedStatus.value = editStudent.status
    modalLeaveReason.value = editStudent.reason || ''
  }
  else {
    modalStudentName.value = ''
    modalSelectedStatus.value = 'leave'
    modalLeaveReason.value = ''
  }
  addStudentModalVisible.value = true
}

// 关闭自定义模态框
function closeAddStudentModal() {
  addStudentModalVisible.value = false
}

// 添加/编辑学生
function saveStudent() {
  const studentName = modalStudentName.value.trim()
  if (!studentName) {
    uni.showToast({ title: '请输入学生姓名', icon: 'none' })
    return
  }

  // 请假状态必须填写原因
  if (modalSelectedStatus.value === 'leave' && !modalLeaveReason.value.trim()) {
    uni.showToast({ title: '请填写请假原因', icon: 'none' })
    return
  }

  const editIndex = studentList.value.findIndex(item => item.studentName === studentName)
  const studentId = Date.now().toString() + Math.random().toString(36).substr(2, 9)

  if (editIndex > -1) {
    // 编辑已有学生
    studentList.value[editIndex] = {
      ...studentList.value[editIndex],
      status: modalSelectedStatus.value,
      reason: modalLeaveReason.value || '',
      statusText: modalSelectedStatus.value === 'leave'
        ? '学生已请假且不在校'
        : '学生未请假且不在校内',
    }
  }
  else {
    // 新增学生
    studentList.value.push({
      id: studentId,
      studentName,
      status: modalSelectedStatus.value,
      reason: modalLeaveReason.value || '',
      statusText: modalSelectedStatus.value === 'leave'
        ? '学生已请假且不在校'
        : '学生未请假且不在校内',
    })
  }

  closeAddStudentModal()
  calculateAttendanceData()
  uni.showToast({ title: editIndex > -1 ? '学生信息修改成功' : '学生添加成功', icon: 'success' })
}

// 删除学生
function deleteStudent(id: string) {
  uni.showModal({
    title: '确认删除',
    content: '是否确认移除该学生？',
    confirmText: '删除',
    cancelText: '取消',
    success: (res) => {
      if (res.confirm) {
        studentList.value = studentList.value.filter(student => student.id !== id)
        calculateAttendanceData()
        uni.showToast({ title: '删除成功', icon: 'success' })
      }
    },
  })
}

// 数据验证
function validateData(): { valid: boolean, message: string } {
  // 1. 排班ID不能为空
  if (!pageParams.value.scheduleId) {
    return { valid: false, message: '排班ID不能为空，请返回重试' }
  }

  // 2. 应到人数校验
  if (attendanceData.value.shouldAttend <= 0) {
    return { valid: false, message: '应到人数必须大于0' }
  }

  // 3. 学生总数校验
  const totalAdded = studentList.value.length
  if (totalAdded > attendanceData.value.shouldAttend) {
    return { valid: false, message: `已添加学生(${totalAdded}人)超过应到人数(${attendanceData.value.shouldAttend}人)` }
  }

  // 4. 实到人数校验
  if (attendanceData.value.actualAttend < 0) {
    return { valid: false, message: '实到人数不能为负数' }
  }

  return { valid: true, message: '' }
}

// 构建接口请求参数
function buildRequestParams(): any {
  // 整理学生明细
  const studentDetails: StudentException[] = studentList.value.map(item => ({
    studentName: item.studentName,
    status: item.status,
    reason: item.reason || '',
  }))

  return {
    scheduleId: pageParams.value.scheduleId,
    attendanceDate: attendanceData.value.attendanceDate,
    shouldAttend: attendanceData.value.shouldAttend,
    notes: attendanceData.value.note || '',
    studentDetails,
  }
}

// 提交考勤（适配拦截器直接返回data）
async function submitAttendance() {
  if (isSubmitLoading.value)
    return

  // 检查是否停课
  if (specialStatus.value === 'cancelled') {
    uni.showModal({
      title: '无法提交考勤',
      content: `该时段已停课：${cancelReason.value || '临时停课'}`,
      showCancel: false,
      confirmText: '我知道了',
    })
    return
  }

  // 1. 基础数据验证
  const { valid, message } = validateData()
  if (!valid) {
    uni.showToast({ title: message, icon: 'none' })
    return
  }

  // 2. 确认提交
  const confirmRes = await uni.showModal({
    title: '确认提交',
    content: [
      `班级: ${fullAttendanceData.value?.className || '未知班级'}`,
      `年级: ${fullAttendanceData.value?.grade || '未知'}`,
      `时段: ${fullAttendanceData.value?.timeSlotName || '未设置'}`,
      `考勤日期: ${attendanceData.value.attendanceDate}`,
      `应到人数: ${attendanceData.value.shouldAttend}`,
      `实到人数: ${attendanceData.value.actualAttend}`,
      `请假人数: ${attendanceData.value.leave}`,
      `缺勤人数: ${attendanceData.value.absent}`,
      `异常学生: ${studentList.value.length ? studentList.value.map(s => `${s.studentName}（${s.status === 'leave' ? '请假' : '缺勤'}）`).join('、') : '无异常学生'}`,
      attendanceData.value.note ? `备注: ${attendanceData.value.note}` : '',
    ].filter(Boolean).join('\n'),
    confirmText: '确认提交',
    cancelText: '取消',
  })

  if (!confirmRes.confirm)
    return

  try {
    isSubmitLoading.value = true
    uni.showLoading({ title: '提交中...', mask: true })

    // 构建请求参数
    const requestParams = buildRequestParams()
    // 提交考勤数据（拦截器已处理，直接返回data）
    const submitResult: any = await attendanceRecordUsingPost({
      body: requestParams,
    })

    // 处理响应
    uni.hideLoading()
    uni.showToast({ title: '考勤提交成功', icon: 'success', duration: 1500 })

    // 存储返回数据 + 页面跳转
    if (submitResult && attendanceStore.setAttendanceAddData) {
      attendanceStore.setAttendanceAddData(submitResult)
    }
    setTimeout(() => {
      uni.navigateBack({ delta: 1 })
      uni.$emit('refreshClassList') // 通知上一页刷新
    }, 1500)
  }
  catch (err: any) {
    uni.hideLoading()
    uni.showModal({
      title: '提交失败',
      content: attendanceStore.errorMsg || err.data.msg || '服务器异常，请稍后重试',
      showCancel: false,
    })
    console.error('考勤提交失败:', err)
  }
  finally {
    isSubmitLoading.value = false
  }
}

// 解析传入的参数
function parsePageOptions(options: any): PageParams {
  return {
    scheduleId: (options.scheduleId as string) || '',
  }
}

// 初始化页面数据
async function initPageData(options: any) {
  try {
    isLoading.value = true
    updateDateTime()

    // 1. 解析页面参数
    const parsedParams = parsePageOptions(options)
    pageParams.value = parsedParams

    // 2. 获取完整考勤数据
    await fetchAttendanceDetail()

    console.log('页面初始化完成，排班ID:', pageParams.value.scheduleId)
  }
  catch (error) {
    console.error('初始化失败:', error)
    uni.showToast({ title: '数据初始化失败', icon: 'none' })
  }
  finally {
    isLoading.value = false
  }
}

// 页面生命周期
onLoad((options) => {
  initPageData(options)
  attendanceStore.resetAttendanceAddState?.()
})

onShow(() => {
  updateDateTime()
})

onUnload(() => {
  // 清理状态
  studentList.value = []
  addStudentModalVisible.value = false
  isSubmitLoading.value = false
  fullAttendanceData.value = null
})

// 监听学生列表变化，自动重新计算
watch(studentList, () => {
  calculateAttendanceData()
}, { deep: true, immediate: true })

// 监听应到人数变化
watch(() => attendanceData.value.shouldAttend, () => {
  calculateAttendanceData()
}, { immediate: true })
</script>

<template>
  <view class="min-h-screen bg-gray-50">
    <!-- 加载中 -->
    <view v-if="isLoading || isSubmitLoading" class="fixed inset-0 z-50 flex items-center justify-center bg-white/80">
      <view class="flex flex-col items-center">
        <view class="mb-3 h-10 w-10 animate-spin border-4 border-blue-500 border-t-transparent rounded-full" />
        <view class="text-sm text-gray-600">
          加载中...
        </view>
      </view>
    </view>

    <!-- 标题栏 -->
    <view v-if="fullAttendanceData" class="from-blue-500 to-blue-600 bg-gradient-to-r px-5 py-5 text-white">
      <view class="text-center">
        <view class="text-xl font-bold">
          {{ fullAttendanceData.className }} 考勤
        </view>
        <view class="mt-1 text-sm opacity-90">
          {{ today }} · {{ fullAttendanceData.timeSlotName || attendanceType }}
        </view>
      </view>
    </view>

    <!-- 停课提示 -->
    <view v-if="specialStatus === 'cancelled'" class="mx-4 mt-4 border border-red-200 rounded-lg bg-red-50 p-4">
      <view class="flex items-center">
        <text class="mr-2 text-2xl">🚫</text>
        <view>
          <view class="text-red-600 font-medium">
            该时段已停课
          </view>
          <view class="mt-1 text-sm text-red-500">
            {{ cancelReason || '临时停课' }}
          </view>
        </view>
      </view>
      <view class="mt-3 rounded bg-red-100 p-2 text-sm text-red-600">
        ⚠️ 停课时段无法提交考勤
      </view>
    </view>

    <!-- 考勤表单 -->
    <view v-if="!isLoading && fullAttendanceData" class="px-4 py-4 -mt-3">
      <view class="mb-6 transform rounded-xl bg-white p-6 shadow-md transition-all duration-300 hover:shadow-lg">
        <view class="mb-2 flex items-center border-b border-gray-100 pb-2 text-lg text-gray-800 font-semibold">
          <wd-icon name="list" size="16" class="mr-2" />
          填写考勤信息
        </view>

        <!-- 班级信息卡片 -->
        <view class="mb-6 rounded-lg bg-blue-50 p-4">
          <view class="flex flex-wrap gap-4">
            <view class="min-w-[120px] flex-1">
              <view class="mb-1 text-xs text-gray-500">
                应到人数
              </view>
              <view class="text-sm text-gray-800 font-medium">
                {{ fullAttendanceData.stats.shouldAttend }} 人
              </view>
            </view>
            <view class="min-w-[120px] flex-1">
              <view class="mb-1 text-xs text-gray-500">
                时段名称
              </view>
              <view class="text-sm text-gray-800 font-medium">
                {{ fullAttendanceData.timeSlotName || '未设置' }}
              </view>
            </view>
            <view class="min-w-[120px] flex-1">
              <view class="mb-1 text-xs text-gray-500">
                考勤日期
              </view>
              <view class="text-sm text-gray-800 font-medium">
                {{ fullAttendanceData.attendanceDate }}
              </view>
            </view>
          </view>
        </view>

        <!-- 应到人数 -->
        <view class="mb-6">
          <view class="mb-2 flex items-center text-sm text-gray-600">
            <wd-icon name="usergroup" size="16" class="mr-2" />
            应到人数
          </view>
          <view class="flex items-center">
            <input
              v-model.number="attendanceData.shouldAttend"
              type="number"
              class="flex-1 border border-gray-200 rounded-lg px-4 py-3.5 text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="请输入应到人数"
              min="1"
            >
            <view class="ml-3 text-sm text-gray-500">
              人
            </view>
          </view>
        </view>

        <!-- 实到人数 -->
        <view class="mb-6">
          <view class="mb-2 flex items-center text-sm text-gray-600">
            <wd-icon name="user" size="16" class="mr-2" />
            实到人数（自动计算）
          </view>
          <view class="flex items-center">
            <input
              v-model.number="attendanceData.actualAttend"
              type="number"
              class="flex-1 cursor-not-allowed border border-gray-200 rounded-lg bg-gray-50 px-4 py-3.5 text-gray-800"
              readonly
            >
            <view class="ml-3 text-sm text-gray-500">
              人
            </view>
          </view>
        </view>

        <!-- 请假/缺勤人数 -->
        <view class="grid grid-cols-2 mb-6 gap-4">
          <view>
            <view class="mb-2 flex items-center text-sm text-gray-600">
              <wd-icon name="clear" size="16" class="mr-2" />
              请假人数
            </view>
            <view class="flex items-center">
              <input
                v-model.number="attendanceData.leave"
                type="number"
                class="flex-1 cursor-not-allowed border border-gray-200 rounded-lg bg-gray-50 px-4 py-3.5 text-gray-800"
                readonly
              >
              <view class="ml-3 text-sm text-gray-500">
                人
              </view>
            </view>
          </view>
          <view>
            <view class="mb-2 flex items-center text-sm text-gray-600">
              <wd-icon name="close" size="16" class="mr-2" />
              缺勤人数
            </view>
            <view class="flex items-center">
              <input
                v-model.number="attendanceData.absent"
                type="number"
                class="flex-1 cursor-not-allowed border border-gray-200 rounded-lg bg-gray-50 px-4 py-3.5 text-gray-800"
                readonly
              >
              <view class="ml-3 text-sm text-gray-500">
                人
              </view>
            </view>
          </view>
        </view>

        <!-- 异常学生列表 -->
        <view class="mb-6">
          <view class="mb-2 flex items-center justify-between text-sm text-gray-600">
            <div class="flex items-center">
              <wd-icon name="calendar" size="16" class="mr-2" />
              异常学生列表
            </div>
            <button
              class="flex items-center items-center rounded bg-blue-50 px-2 py-1 text-xs text-blue-600"
              @click="openAddStudentModal()"
            >
              <wd-icon name="add" size="12" class="mr-1" />
              添加学生
            </button>
          </view>

          <!-- 空列表提示 -->
          <view v-if="studentList.length === 0" class="py-6 text-center text-sm text-gray-400">
            <wd-icon name="info-circle" size="20" class="mb-2" />
            暂无异常学生（在校学生无需添加）
          </view>

          <!-- 学生列表 -->
          <view v-else class="max-h-40 flex flex-wrap gap-2 overflow-y-auto pb-2">
            <view
              v-for="student in studentList"
              :key="student.id"
              class="w-full flex items-center rounded-lg bg-gray-50 px-3 py-2 text-sm md:w-auto"
            >
              <text class="mr-2 flex-shrink-0 font-medium">{{ student.studentName }}</text>
              <text
                class="flex-shrink-0 rounded px-1.5 py-0.5 text-xs"
                :class="student.status === 'leave' ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700'"
              >
                {{ student.status === 'leave' ? '请假' : '缺勤' }}
              </text>
              <text v-if="student.reason" class="ml-2 flex-shrink-0 text-xs text-gray-500">
                ({{ student.reason }})
              </text>
              <!-- 操作按钮组 -->
              <view class="ml-auto flex flex-shrink-0 items-center gap-2">
                <wd-icon
                  name="edit"
                  size="14"
                  class="cursor-pointer text-blue-500"
                  @click="openAddStudentModal(student)"
                />
                <wd-icon
                  name="close"
                  size="14"
                  class="delete-icon cursor-pointer text-red-500"
                  @click="deleteStudent(student.id)"
                />
              </view>
            </view>
          </view>
        </view>

        <!-- 备注信息 -->
        <view class="mb-2">
          <view class="mb-2 flex items-center text-sm text-gray-600">
            <wd-icon name="chat1" size="16" class="mr-2" />
            备注（可选）
          </view>
          <textarea
            v-model="attendanceData.note"
            placeholder="如有特殊情况请填写备注"
            class="min-h-[80px] w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
          />
        </view>
      </view>

      <!-- 提交按钮 -->
      <button
        class="w-full flex transform items-center justify-center rounded-xl py-3 font-medium shadow-md transition-all duration-300"
        :class="specialStatus === 'cancelled'
          ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
          : 'bg-blue-500 text-white hover:bg-blue-600 active:bg-blue-700 hover:scale-[1.02] active:scale-[0.98]'"
        :disabled="isSubmitLoading || specialStatus === 'cancelled'"
        @click="submitAttendance"
      >
        <uni-icons v-if="isSubmitLoading" type="spinner-cycle" size="16" class="mr-2 animate-spin" />
        <span>{{ specialStatus === 'cancelled' ? '停课中，无法提交' : '提交考勤' }}</span>
      </button>
    </view>

    <!-- 数据加载失败/无数据提示 -->
    <view v-if="!isLoading && !fullAttendanceData" class="py-10 text-center">
      <wd-icon name="warning-circle" size="30" class="mb-3 text-amber-500" />
      <view class="text-gray-600">
        无法获取考勤数据
      </view>
      <button
        class="mt-4 rounded-lg bg-blue-500 px-4 py-2 text-sm text-white"
        @click="fetchAttendanceDetail()"
      >
        重新加载
      </button>
    </view>

    <!-- 自定义模态框 -->
    <view v-if="addStudentModalVisible" class="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4" @click="closeAddStudentModal">
      <view class="max-w-[350px] w-full scale-100 transform overflow-hidden rounded-xl bg-white shadow-xl transition-all duration-300" @click.stop>
        <view class="border-b border-gray-100 px-5 py-4">
          <view class="text-lg text-gray-800 font-medium">
            {{ modalStudentName ? '编辑学生' : '添加异常学生' }}
          </view>
        </view>
        <view class="px-5 py-4">
          <!-- 状态选择 -->
          <view class="mb-4">
            <view class="mb-2 text-sm text-gray-600">
              学生状态
            </view>
            <view class="flex gap-4">
              <view
                class="radio-option flex flex-1 items-center border border-gray-200 rounded-lg p-2"
                :class="modalSelectedStatus === 'leave' ? 'border-blue-500 bg-blue-50' : ''"
                @click="modalSelectedStatus = 'leave'"
              >
                <view
                  class="mr-2 h-4 w-4 flex items-center justify-center border-2 rounded-full"
                  :class="modalSelectedStatus === 'leave' ? 'border-blue-500' : 'border-gray-300'"
                >
                  <view class="h-2 w-2 rounded-full" :class="modalSelectedStatus === 'leave' ? 'bg-blue-500' : 'bg-transparent'" />
                </view>
                <text class="text-sm">请假</text>
              </view>

              <view
                class="radio-option flex flex-1 items-center border border-gray-200 rounded-lg p-2"
                :class="modalSelectedStatus === 'absent' ? 'border-blue-500 bg-blue-50' : ''"
                @click="modalSelectedStatus = 'absent'"
              >
                <view
                  class="mr-2 h-4 w-4 flex items-center justify-center border-2 rounded-full"
                  :class="modalSelectedStatus === 'absent' ? 'border-blue-500' : 'border-gray-300'"
                >
                  <view class="h-2 w-2 rounded-full" :class="modalSelectedStatus === 'absent' ? 'bg-blue-500' : 'bg-transparent'" />
                </view>
                <text class="text-sm">缺勤</text>
              </view>
            </view>
          </view>

          <!-- 状态说明 -->
          <view class="mb-4">
            <view class="rounded-lg bg-gray-50 p-2 text-xs text-gray-500">
              {{ statusDesc }}
            </view>
            <view class="mt-2 text-xs text-green-600">
              💡 学生在校内即视为到位，无需添加！
            </view>
          </view>

          <!-- 学生姓名 -->
          <view class="mb-4">
            <view class="mb-2 text-sm text-gray-600">
              学生姓名
            </view>
            <input
              v-model="modalStudentName"
              type="text"
              class="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="请输入单个学生姓名"
            >
          </view>

          <!-- 请假原因（仅请假状态显示） -->
          <view v-if="modalSelectedStatus === 'leave'" class="mb-4">
            <view class="mb-2 text-sm text-gray-600">
              请假原因 <span class="text-red-500">*</span>
            </view>
            <input
              v-model="modalLeaveReason"
              type="text"
              class="w-full border border-gray-200 rounded-lg px-4 py-3 text-gray-800 outline-none transition-all focus:border-blue-400 focus:ring-2 focus:ring-blue-100"
              placeholder="请填写请假原因（如：生病、事假）"
            >
          </view>
        </view>

        <view class="flex gap-3 border-t border-gray-100 px-5 py-4">
          <button
            class="flex-1 rounded-lg bg-gray-100 py-2.5 text-gray-700 font-medium"
            @click="closeAddStudentModal"
          >
            取消
          </button>
          <button
            class="flex-1 rounded-lg bg-blue-500 py-2.5 text-white font-medium"
            @click="saveStudent"
          >
            {{ modalStudentName ? '保存修改' : '确认添加' }}
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style scoped>
/* 基础动画 */
.animate-spin {
  animation: spin 1s linear infinite;
}

@keyframes spin {
  from {
    transform: rotate(0deg);
  }
  to {
    transform: rotate(360deg);
  }
}

/* 按钮禁用样式 */
button:disabled {
  background-color: #94a3b8 !important;
  cursor: not-allowed;
  transform: none !important;
  opacity: 0.8;
}

/* 删除图标样式优化 */
.delete-icon {
  padding: 2px;
  box-sizing: content-box;
}

.delete-icon:active {
  opacity: 0.7;
}

/* 单选选项样式 */
.radio-option:active {
  opacity: 0.8;
}

/* 滚动列表样式 */
.max-h-40 {
  max-height: 160rpx;
}

/* 响应式适配 */
@media (min-width: 768px) {
  .md:w-auto {
    width: auto;
  }
}

/* 模态框动画 */
.scale-100 {
  transform: scale(1);
}

/* 输入框焦点样式 */
input:focus,
textarea:focus {
  outline: none;
}
</style>
