<script setup lang="ts">
import type { AlertSubtypeConfig, ClassWithDevice, NotificationPriority, NotificationType, NotificationTypeConfig, PriorityConfig, TargetType, TargetTypeConfig } from '@/api/notification'
import { onPullDownRefresh } from '@dcloudio/uni-app'
import { computed, onMounted, ref, watch } from 'vue'
import { getClassesWithDevices, getNotificationTypes, sendNotification } from '@/api/notification'
import { useUserStore } from '@/store/user'
import { safeAreaInsets } from '@/utils/systemInfo'

defineOptions({ name: 'NotificationPage' })
definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '发送通知',
    backgroundColor: '#F5F7FA',
  },
})

const userStore = useUserStore()

const loading = ref(false)
const submitting = ref(false)
const notificationTypes = ref<NotificationTypeConfig[]>([])
const priorities = ref<PriorityConfig[]>([])
const targetTypes = ref<TargetTypeConfig[]>([])
const airRaidAlertSubtypes = ref<AlertSubtypeConfig[]>([])
const earthquakeWarningSubtypes = ref<AlertSubtypeConfig[]>([])
const classes = ref<ClassWithDevice[]>([])

const emergencyTypeValues = ['emergency', 'fire_alarm', 'air_raid_alert', 'earthquake_warning']

const normalNotificationTypes = computed(() => {
  return notificationTypes.value.filter(t => !emergencyTypeValues.includes(t.value))
})

const emergencyNotificationTypes = computed(() => {
  return notificationTypes.value.filter(t => emergencyTypeValues.includes(t.value))
})

const isAdmin = computed(() => {
  const role = userStore.userInfo?.role
  const permission = userStore.userInfo?.permission
  return role === 'admin' || (role === 'teacher' && permission === 1)
})

const form = ref({
  type: 'banner' as NotificationType,
  title: '',
  content: '',
  priority: 'normal' as NotificationPriority,
  target_type: 'classes' as TargetType,
  target_ids: [] as string[],
  alert_subtype: '' as string,
  magnitude: '',
  eta: 0 as number,
})

const selectedClassIds = ref<number[]>([])
const showClassModal = ref(false)

const typeIndex = ref(0)
const priorityIndex = ref(1)
const targetIndex = ref(2)

const isEmergencyMode = ref(false)
const emergencyTypeIndex = ref(0)

const isEmergencyType = computed(() => {
  return emergencyTypeValues.includes(form.value.type)
})

const isAirRaidAlert = computed(() => form.value.type === 'air_raid_alert')
const isEarthquakeWarning = computed(() => form.value.type === 'earthquake_warning')
const isEarthquakeEarlyWarning = computed(() => form.value.type === 'earthquake_warning' && form.value.alert_subtype === 'early_warning')

const currentTypeConfig = computed(() => {
  return notificationTypes.value.find(t => t.value === form.value.type)
})

const currentPriorityConfig = computed(() => {
  return priorities.value.find(p => p.value === form.value.priority)
})

const currentTargetConfig = computed(() => {
  return targetTypes.value.find(t => t.value === form.value.target_type)
})

const selectedClassesText = computed(() => {
  if (selectedClassIds.value.length === 0) {
    return '未选择班级'
  }
  const names = classes.value
    .filter(c => selectedClassIds.value.includes(c.id))
    .map(c => c.name)
  if (names.length <= 3) {
    return names.join('、')
  }
  return `${names.slice(0, 3).join('、')} 等 ${names.length} 个班级`
})

watch(() => form.value.type, (newType) => {
  if (newType === 'fire_alarm') {
    form.value.priority = 'urgent'
    form.value.alert_subtype = ''
    form.value.magnitude = ''
    form.value.eta = 0
  }
  else if (newType === 'air_raid_alert') {
    form.value.priority = 'urgent'
    form.value.alert_subtype = 'pre_warning'
    form.value.magnitude = ''
    form.value.eta = 0
  }
  else if (newType === 'earthquake_warning') {
    form.value.priority = 'urgent'
    form.value.alert_subtype = 'early_warning'
    form.value.magnitude = ''
    form.value.eta = 0
  }
})

function onTypeChange(e: any) {
  const index = e.detail.value
  typeIndex.value = index
  if (normalNotificationTypes.value[index]) {
    form.value.type = normalNotificationTypes.value[index].value as NotificationType
  }
}

function onEmergencyTypeChange(e: any) {
  const index = e.detail.value
  emergencyTypeIndex.value = index
  if (emergencyNotificationTypes.value[index]) {
    form.value.type = emergencyNotificationTypes.value[index].value as NotificationType
  }
}

function toggleEmergencyMode(val: boolean) {
  isEmergencyMode.value = val
  if (val && emergencyNotificationTypes.value.length > 0) {
    form.value.type = emergencyNotificationTypes.value[0].value as NotificationType
    emergencyTypeIndex.value = 0
  }
  else if (normalNotificationTypes.value.length > 0) {
    form.value.type = normalNotificationTypes.value[0].value as NotificationType
    typeIndex.value = 0
  }
}

function onPriorityChange(e: any) {
  const index = e.detail.value
  priorityIndex.value = index
  if (priorities.value[index]) {
    form.value.priority = priorities.value[index].value as NotificationPriority
  }
}

function onTargetChange(e: any) {
  const index = e.detail.value
  targetIndex.value = index
  if (targetTypes.value[index]) {
    form.value.target_type = targetTypes.value[index].value as TargetType
  }
}

function openClassModal() {
  showClassModal.value = true
}

function closeClassModal() {
  showClassModal.value = false
}

function toggleClassSelection(classId: number) {
  const index = selectedClassIds.value.indexOf(classId)
  if (index > -1) {
    selectedClassIds.value.splice(index, 1)
  }
  else {
    selectedClassIds.value.push(classId)
  }
}

function confirmClassSelection() {
  if (selectedClassIds.value.length === 0) {
    uni.showToast({ title: '请至少选择一个班级', icon: 'none' })
    return
  }
  showClassModal.value = false
}

async function loadData() {
  loading.value = true
  try {
    const [typesRes, classesRes] = await Promise.all([
      getNotificationTypes(),
      getClassesWithDevices(),
    ])

    notificationTypes.value = typesRes.notificationTypes || []
    priorities.value = typesRes.priorities || []
    targetTypes.value = typesRes.targetTypes || []
    airRaidAlertSubtypes.value = typesRes.airRaidAlertSubtypes || []
    earthquakeWarningSubtypes.value = typesRes.earthquakeWarningSubtypes || []
    classes.value = classesRes || []

    typeIndex.value = normalNotificationTypes.value.findIndex(t => t.value === form.value.type)
    if (typeIndex.value < 0)
      typeIndex.value = 0
    priorityIndex.value = priorities.value.findIndex(p => p.value === form.value.priority)
    targetIndex.value = targetTypes.value.findIndex(t => t.value === form.value.target_type)
  }
  catch (e) {
    console.error('加载数据失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function handleSubmit() {
  if (!isEmergencyType.value) {
    if (!form.value.title.trim()) {
      uni.showToast({ title: '请输入通知标题', icon: 'none' })
      return
    }
    if (!form.value.content.trim()) {
      uni.showToast({ title: '请输入通知内容', icon: 'none' })
      return
    }
  }

  if (isAirRaidAlert.value && !form.value.alert_subtype) {
    uni.showToast({ title: '请选择警报类型', icon: 'none' })
    return
  }

  if (isEarthquakeWarning.value) {
    if (!form.value.alert_subtype) {
      uni.showToast({ title: '请选择预警类型', icon: 'none' })
      return
    }
    if (!form.value.magnitude.trim()) {
      uni.showToast({ title: '请输入震级', icon: 'none' })
      return
    }
    if (isEarthquakeEarlyWarning.value && form.value.eta <= 0) {
      uni.showToast({ title: '请输入有效的预计到达时间', icon: 'none' })
      return
    }
  }

  if (!isEmergencyType.value && selectedClassIds.value.length === 0) {
    uni.showToast({ title: '请选择目标班级', icon: 'none' })
    return
  }

  if (isEmergencyType.value) {
    const typeNames: Record<string, string> = {
      fire_alarm: '火灾警报',
      air_raid_alert: '防空警报',
      earthquake_warning: '地震预警',
      emergency: '紧急通知',
    }

    uni.showModal({
      title: '确认发送应急通知',
      content: `即将向所有设备发送${typeNames[form.value.type] || '应急通知'}，此操作不可撤销。是否继续？`,
      confirmText: '立即发送',
      confirmColor: '#ef4444',
      cancelText: '取消',
      success: (res) => {
        if (res.confirm) {
          doSendNotification()
        }
      },
    })
  }
  else {
    doSendNotification()
  }
}

async function doSendNotification() {
  submitting.value = true
  try {
    const params: any = {
      type: form.value.type,
      priority: form.value.priority,
      target_type: isEmergencyType.value ? 'all' : 'classes',
    }

    if (!isEmergencyType.value) {
      params.title = form.value.title.trim()
      params.content = form.value.content.trim()
      params.target_ids = selectedClassIds.value.map(String)
    }

    if (isAirRaidAlert.value) {
      params.alert_subtype = form.value.alert_subtype
    }

    if (isEarthquakeWarning.value) {
      params.alert_subtype = form.value.alert_subtype
      params.magnitude = form.value.magnitude.trim()
      if (isEarthquakeEarlyWarning.value && form.value.eta > 0) {
        params.eta = form.value.eta
      }
    }

    const result = await sendNotification(params)
    uni.showToast({
      title: `发送成功，已发送 ${result.sent_count} 台设备`,
      icon: 'success',
    })

    setTimeout(() => {
      uni.navigateBack()
    }, 1500)
  }
  catch (e) {
    console.error('发送失败:', e)
    uni.showToast({ title: '发送失败', icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}

onMounted(() => {
  loadData()
})

onPullDownRefresh(() => {
  loadData().finally(() => {
    uni.stopPullDownRefresh()
  })
})
</script>

<template>
  <view class="min-h-screen bg-gray-50" :style="{ marginTop: `${safeAreaInsets?.top}px` }">
    <view v-if="loading" class="flex flex-col items-center justify-center py-20">
      <qiun-loading />
      <text class="mt-3 text-sm text-gray-400">正在加载...</text>
    </view>

    <view v-else class="p-4">
      <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
        <picker
          mode="selector"
          :range="normalNotificationTypes"
          range-key="label"
          :value="typeIndex"
          :disabled="isEmergencyMode"
          @change="onTypeChange"
        >
          <view class="flex items-center justify-between border-b border-gray-100 p-4">
            <text class="text-base text-gray-800">通知类型</text>
            <view class="flex items-center">
              <text :class="isEmergencyMode ? 'text-gray-400' : 'text-blue-500'" class="mr-2">{{ currentTypeConfig?.label || '请选择' }}</text>
              <text class="i-carbon-chevron-right text-gray-400" />
            </view>
          </view>
        </picker>

        <view v-if="currentTypeConfig && !isEmergencyMode" class="bg-gray-50 p-4">
          <text class="text-sm text-gray-500">{{ currentTypeConfig.description }}</text>
        </view>
      </view>

      <view v-if="isAdmin" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <view class="p-4">
          <view class="flex items-center justify-between">
            <view class="flex items-center">
              <view class="mr-3 h-8 w-8 flex items-center justify-center rounded-full bg-red-100">
                <text class="i-carbon-warning-alt text-lg text-red-500" />
              </view>
              <view>
                <text class="text-base text-gray-800 font-medium">应急通知</text>
                <view class="text-xs text-gray-400">
                  紧急情况快速发布
                </view>
              </view>
            </view>
            <switch
              :checked="isEmergencyMode"
              color="#ef4444"
              @change="(e: any) => toggleEmergencyMode(e.detail.value)"
            />
          </view>
        </view>

        <view v-if="isEmergencyMode" class="border-t border-gray-100">
          <picker
            mode="selector"
            :range="emergencyNotificationTypes"
            range-key="label"
            :value="emergencyTypeIndex"
            @change="onEmergencyTypeChange"
          >
            <view class="flex items-center justify-between bg-red-50 p-4">
              <text class="text-base text-red-600 font-medium">选择应急类型</text>
              <view class="flex items-center">
                <text class="mr-2 text-red-500 font-medium">{{ emergencyNotificationTypes[emergencyTypeIndex]?.label || '请选择' }}</text>
                <text class="i-carbon-chevron-right text-red-400" />
              </view>
            </view>
          </picker>

          <view v-if="currentTypeConfig" class="border-t border-red-100 bg-red-50 p-3">
            <text class="text-sm text-red-500">{{ currentTypeConfig.description }}</text>
          </view>
        </view>
      </view>

      <view v-if="!isEmergencyType" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <view class="p-4">
          <view class="mb-2 text-sm text-gray-500">
            通知标题
          </view>
          <input
            v-model="form.title"
            class="w-full border border-gray-200 rounded-lg p-3 text-base"
            placeholder="请输入通知标题"
            maxlength="200"
          >
        </view>

        <view class="border-t border-gray-100 p-4">
          <view class="mb-2 text-sm text-gray-500">
            通知内容
          </view>
          <textarea
            v-model="form.content"
            class="h-24 w-full border border-gray-200 rounded-lg p-3 text-base"
            placeholder="请输入通知内容"
            maxlength="500"
          />
        </view>
      </view>

      <view v-if="isAirRaidAlert" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <view class="p-4">
          <view class="mb-3 text-sm text-gray-500 font-medium">
            警报类型
          </view>
          <radio-group @change="(e: any) => form.alert_subtype = e.detail.value">
            <label
              v-for="item in airRaidAlertSubtypes"
              :key="item.value"
              class="flex items-center py-2"
            >
              <radio :value="item.value" :checked="form.alert_subtype === item.value" />
              <view class="ml-2">
                <view class="text-base">{{ item.label }}</view>
                <view class="text-xs text-gray-400">{{ item.description }}</view>
              </view>
            </label>
          </radio-group>
        </view>
      </view>

      <view v-if="isEarthquakeWarning" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <view class="p-4">
          <view class="mb-3 text-sm text-gray-500 font-medium">
            预警类型
          </view>
          <radio-group @change="(e: any) => form.alert_subtype = e.detail.value">
            <label
              v-for="item in earthquakeWarningSubtypes"
              :key="item.value"
              class="flex items-center py-2"
            >
              <radio :value="item.value" :checked="form.alert_subtype === item.value" />
              <view class="ml-2">
                <view class="text-base">{{ item.label }}</view>
                <view class="text-xs text-gray-400">{{ item.description }}</view>
              </view>
            </label>
          </radio-group>
        </view>

        <view class="border-t border-gray-100 p-4">
          <view class="mb-2 text-sm text-gray-500">
            震级
          </view>
          <input
            v-model="form.magnitude"
            class="w-full border border-gray-200 rounded-lg p-3 text-base"
            placeholder="请输入震级，如：6.5级"
          >
        </view>

        <view v-if="isEarthquakeEarlyWarning" class="border-t border-gray-100 p-4">
          <view class="mb-2 text-sm text-gray-500">
            预计到达时间（秒）
          </view>
          <input
            v-model.number="form.eta"
            type="number"
            class="w-full border border-gray-200 rounded-lg p-3 text-base"
            placeholder="请输入预计到达秒数，如：60"
          >
        </view>
      </view>

      <view v-if="!isEmergencyType" class="mt-4 overflow-hidden rounded-2xl bg-white shadow-sm">
        <picker
          mode="selector"
          :range="priorities"
          range-key="label"
          :value="priorityIndex"
          @change="onPriorityChange"
        >
          <view class="flex items-center justify-between border-b border-gray-100 p-4">
            <text class="text-base text-gray-800">优先级</text>
            <view class="flex items-center">
              <text class="mr-2 text-blue-500">{{ currentPriorityConfig?.label || '普通' }}</text>
              <text class="i-carbon-chevron-right text-gray-400" />
            </view>
          </view>
        </picker>

        <view class="flex items-center justify-between p-4" @click="openClassModal">
          <text class="text-base text-gray-800">目标班级</text>
          <view class="flex items-center">
            <text class="mr-2 text-blue-500">{{ selectedClassesText }}</text>
            <text class="i-carbon-chevron-right text-gray-400" />
          </view>
        </view>
      </view>

      <view v-if="showClassModal" class="fixed inset-0 z-50">
        <view class="absolute inset-0 bg-black/50" @click="closeClassModal" />
        <view class="absolute bottom-0 left-0 right-0 max-h-[70vh] flex flex-col rounded-t-2xl bg-white">
          <view class="flex items-center justify-between border-b border-gray-100 p-4">
            <text class="text-lg font-medium">选择班级</text>
            <text class="i-carbon-close text-xl text-gray-400" @click="closeClassModal" />
          </view>
          <scroll-view scroll-y class="max-h-[50vh] flex-1 p-4">
            <view class="grid grid-cols-2 gap-3">
              <view
                v-for="cls in classes.filter(c => c.has_device)"
                :key="cls.id"
                class="flex items-center border-2 rounded-xl px-4 py-3 transition-all"
                :class="selectedClassIds.includes(cls.id) ? 'bg-blue-50 border-blue-500' : 'border-gray-200'"
                @click="toggleClassSelection(cls.id)"
              >
                <view
                  class="mr-3 h-5 w-5 flex items-center justify-center border-2 rounded"
                  :class="selectedClassIds.includes(cls.id) ? 'bg-blue-500 border-blue-500' : 'border-gray-300'"
                >
                  <text v-if="selectedClassIds.includes(cls.id)" class="i-carbon-checkmark text-sm text-white" />
                </view>
                <text class="text-sm" :class="selectedClassIds.includes(cls.id) ? 'text-blue-600 font-medium' : 'text-gray-700'">{{ cls.name }}</text>
              </view>
            </view>
          </scroll-view>
          <view class="border-t border-gray-100 p-4">
            <view class="flex gap-3">
              <button class="flex-1 border border-gray-300 rounded-xl py-3 text-gray-600" @click="closeClassModal">
                取消
              </button>
              <button class="flex-1 rounded-xl bg-blue-500 py-3 text-white" @click="confirmClassSelection">
                确认选择
              </button>
            </view>
          </view>
        </view>
      </view>

      <view class="mb-8 mt-6">
        <button
          class="w-full rounded-xl py-4 text-base text-white font-medium"
          :class="submitting ? 'bg-gray-300' : 'bg-blue-500'"
          :disabled="submitting"
          @click="handleSubmit"
        >
          {{ submitting ? '发送中...' : (isEmergencyType ? '立即发布' : '发送通知') }}
        </button>
      </view>
    </view>
  </view>
</template>
