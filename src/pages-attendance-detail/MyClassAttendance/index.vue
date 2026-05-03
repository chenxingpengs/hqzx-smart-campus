<template>
  <view class="min-h-screen bg-[#F5F7FA]">
    <!-- 调试面板（开发模式显示） -->
    <view v-if="showDebugPanel" class="fixed right-5 top-20 z-50 max-h-[50vh] w-[260px] overflow-y-auto rounded-lg bg-white p-3 text-xs shadow-lg">
      <view class="mb-2 text-red-500 font-bold">
        班级详情调试
      </view>
      <pre class="whitespace-pre-wrap break-all text-gray-700">{{ JSON.stringify(classDetail, null, 2) }}</pre>
    </view>

    <!-- 班级基础信息卡片 -->
    <view class="mx-5 mt-4 rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-3 flex items-start justify-between">
        <view>
          <view class="text-xl text-gray-800 font-bold">
            {{ className }}
          </view>
          <view class="mt-1 text-sm text-gray-500">
            年级: {{ grade }} | 最后更新: {{ lastUpdateTime }}
          </view>
        </view>
      </view>

      <!-- 核心配置区：应到人数 + 午休应到人数 -->
      <view class="grid grid-cols-2 mb-4 gap-4">
        <!-- 应到人数配置 -->
        <view class="rounded-lg bg-gray-50 p-3">
          <view class="mb-2 flex items-center justify-between">
            <text class="text-sm text-gray-700 font-medium">应到人数</text>
            <text v-if="need完善ShouldAttend" class="text-xs text-red-500">必填</text>
          </view>
          <input
            v-if="editingShouldAttend"
            v-model.number="form.shouldAttend"
            type="number"
            min="0"
            class="w-full border border-gray-200 rounded-lg bg-white px-3 py-2 text-center text-base"
            placeholder="请输入应到人数"
            @blur="handleShouldAttendBlur"
            @confirm="handleShouldAttendConfirm"
            @focus="editingShouldAttend = true"
          >
          <view v-else class="w-full cursor-pointer rounded-lg bg-gray-100 px-3 py-2 text-center text-base text-gray-500 transition-colors hover:bg-gray-200" @click="editingShouldAttend = true">
            {{ form.shouldAttend || '未配置' }}
          </view>
          <view v-if="form.shouldAttend <= 0 && form.shouldAttend !== ''" class="mt-1 text-xs text-red-500">
            应到人数不能为0或负数
          </view>
        </view>

        <!-- 午休应到人数配置 -->
        <view class="rounded-lg bg-gray-50 p-3">
          <view class="mb-2 flex items-center justify-between">
            <text class="text-sm text-gray-700 font-medium">午休应到人数</text>
            <text v-if="need完善NoonRest" class="text-xs text-red-500">必填</text>
          </view>
          <input
            v-if="editingNoonRestShouldAttend"
            v-model.number="form.noonRestShouldAttend"
            type="number"
            min="0"
            class="w-full border border-gray-200 rounded-lg bg-white px-3 py-2 text-center text-base"
            placeholder="请输入午休应到人数"
            @blur="handleNoonRestShouldAttendBlur"
            @confirm="handleNoonRestShouldAttendConfirm"
            @focus="editingNoonRestShouldAttend = true"
          >
          <view v-else class="w-full cursor-pointer rounded-lg bg-gray-100 px-3 py-2 text-center text-base text-gray-500 transition-colors hover:bg-gray-200" @click="editingNoonRestShouldAttend = true">
            {{ form.noonRestShouldAttend || '未配置' }}
          </view>
          <view v-if="form.noonRestShouldAttend <= 0 && form.noonRestShouldAttend !== ''" class="mt-1 text-xs text-red-500">
            午休应到人数不能为0或负数
          </view>
        </view>
      </view>

      <!-- 数据异常提醒 -->
      <view v-if="dataError" class="flex items-center border-l-4 border-yellow-500 rounded-r-lg bg-yellow-50 px-3 py-2">
        <view class="mr-2 text-yellow-500">
          ⚠️
        </view>
        <text class="text-xs text-yellow-700">{{ dataError }}</text>
      </view>
    </view>

    <!-- 请假申请审核 -->
    <view class="mx-5 mt-4 rounded-xl bg-white p-4 shadow-sm">
      <view class="mb-3 text-lg text-gray-800 font-medium">
        请假申请
      </view>
      <view class="mt-3 border-t pt-3">
        <view class="mb-2 flex items-center justify-between">
          <text class="text-sm text-gray-700 font-medium">待审核请假申请</text>
          <text class="rounded-full bg-purple-100 px-2 py-0.5 text-xs text-purple-700">
            {{ leaveRequestCount }} 条
          </text>
        </view>

        <button
          v-if="leaveRequestCount > 0"
          class="w-full rounded-lg bg-purple-500 py-2 text-sm text-white transition-colors hover:bg-purple-600"
          @click="goToLeaveApproval"
        >
          处理请假申请
        </button>
        <view v-else class="py-2 text-center text-xs text-gray-500">
          暂无待审核请假申请
        </view>
      </view>
    </view>

    <!-- 底部保存按钮 -->
    <view class="fixed bottom-0 left-0 right-0 border-t bg-white p-4">
      <button class="w-full rounded-lg bg-green-500 py-3 text-base text-white font-medium transition-colors hover:bg-green-600" @click="saveClassInfo">
        保存班级信息
      </button>
    </view>
  </view>
</template>

<script setup>
import { onLoad, onShow } from '@dcloudio/uni-app'
import { ref, watch } from 'vue'
import { appAttendanceUsingGet } from '@/service/attendance'

definePage({
  type: 'page',
  style: {
    navigationStyle: 'default',
    navigationBarTitleText: '班级管理',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const classId = ref('')
const className = ref('我的班级')
const grade = ref('未知')
const classNum = ref('未知')
const noonRestShouldAttend = ref('')
const need完善NoonRest = ref(false)
const need完善ShouldAttend = ref(false)

onLoad((options) => {
  classId.value = options.classId || ''
  className.value = decodeURIComponent(options.className || '我的班级')
  grade.value = options.grade || '未知'
  classNum.value = options.classNum || '未知'
  noonRestShouldAttend.value = options.noonRestShouldAttend || ''
  need完善NoonRest.value = options.need完善NoonRest === 'true'
  need完善ShouldAttend.value = options.need完善ShouldAttend === 'true'

  uni.setNavigationBarTitle({
    title: className.value,
  })

  if (classId.value) {
    loadClassDetail()
  }
  else {
    uni.showToast({
      title: '班级ID不能为空',
      icon: 'none',
    })
    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
})

// 核心状态
const isLoading = ref(false)
const showDebugPanel = ref(false)
const classDetail = ref(null)
const lastUpdateTime = ref(new Date().toLocaleTimeString())
const leaveRequestCount = ref(0)
const dataError = ref('')
// 编辑状态
const editingShouldAttend = ref(false)
const editingNoonRestShouldAttend = ref(false)

// 表单数据
const form = ref({
  shouldAttend: 0,
  noonRestShouldAttend: 0,
})

onShow(() => {
  // 刷新请假申请数量
  if (classDetail.value) {
    leaveRequestCount.value = classDetail.value.leaveRequest || 0
  }
})

// 加载班级详情
async function loadClassDetail() {
  isLoading.value = true
  try {
    const res = await appAttendanceUsingGet({
      params: {
        service_date: new Date().toISOString().split('T')[0], // 获取今天的日期
      },
      options: { timeout: 10000 },
    })

    if (res.data && res.data.myClassInfo) {
      classDetail.value = res.data.myClassInfo
      // 初始化表单数据
      form.value = {
        shouldAttend: res.data.myClassInfo.shouldAttend || 0,
        noonRestShouldAttend: res.data.myClassInfo.shouldAttend || 0, // 暂时用应到人数代替，需要根据实际API调整
      }
      // 基础信息赋值
      lastUpdateTime.value = new Date().toLocaleTimeString()
      leaveRequestCount.value = 0 // 暂时设为0，需要根据实际API调整
      // 检查数据异常
      dataError.value = checkDataError({
        shouldAttend: res.data.myClassInfo.shouldAttend,
      })
    }
  }
  catch (error) {
    console.error('加载班级详情失败:', error)
    uni.showToast({
      title: '加载失败，请重试',
      icon: 'none',
    })
  }
  finally {
    isLoading.value = false
  }
}

// 检查数据异常
function checkDataError(data) {
  if (!data)
    return ''

  if (data.shouldAttend <= 0) {
    return `应到人数异常（${data.shouldAttend}），请先配置`
  }

  return ''
}

// 保存班级基础信息（应到/午休应到）
async function saveClassInfo() {
  // 表单验证
  if (form.value.shouldAttend <= 0) {
    uni.showToast({
      title: '应到人数必须大于0',
      icon: 'none',
    })
    return
  }

  if (need完善NoonRest.value && form.value.noonRestShouldAttend <= 0) {
    uni.showToast({
      title: '午休应到人数必须大于0',
      icon: 'none',
    })
    return
  }

  // TODO: 这里需要调用实际的保存API，当前API文档中没有找到对应的保存接口
  uni.showToast({
    title: '保存功能待实现',
    icon: 'none',
  })
  // 更新本地缓存
  lastUpdateTime.value = new Date().toLocaleTimeString()
  // 关闭完善提醒
  need完善NoonRest.value = false
  need完善ShouldAttend.value = false
}

// 处理请假申请
function goToLeaveApproval() {
  uni.navigateTo({
    url: `/pages/leaveApproval/index?classId=${classId.value}&className=${encodeURIComponent(className.value)}&count=${leaveRequestCount.value}`,
  })
}

// 返回上一页
function goBack() {
  uni.navigateBack()
}

// 切换调试面板
function toggleDebugPanel() {
  showDebugPanel.value = !showDebugPanel.value
}

// 应到人数失焦处理
async function handleShouldAttendBlur() {
  editingShouldAttend.value = false
  if (form.value.shouldAttend > 0) {
    await saveClassInfo()
  }
}

// 应到人数确认处理
async function handleShouldAttendConfirm() {
  editingShouldAttend.value = false
  if (form.value.shouldAttend > 0) {
    await saveClassInfo()
  }
}

// 午休应到人数失焦处理
async function handleNoonRestShouldAttendBlur() {
  editingNoonRestShouldAttend.value = false
  if (form.value.noonRestShouldAttend > 0) {
    await saveClassInfo()
  }
}

// 午休应到人数确认处理
async function handleNoonRestShouldAttendConfirm() {
  editingNoonRestShouldAttend.value = false
  if (form.value.noonRestShouldAttend > 0) {
    await saveClassInfo()
  }
}

// 监听表单变化，实时检查数据异常
watch(form, (newVal) => {
  dataError.value = checkDataError({
    shouldAttend: newVal.shouldAttend,
  })
}, { deep: true })
</script>

<style scoped>
/* 自定义样式补充 */
input::-webkit-outer-spin-button,
input::-webkit-inner-spin-button {
  -webkit-appearance: none;
}
</style>
