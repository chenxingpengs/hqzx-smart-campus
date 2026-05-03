<template>
  <view class="min-h-screen bg-gray-50">
    <view class="flex items-center justify-between border-b bg-white px-4 py-3">
      <view class="text-lg text-gray-800 font-bold">
        周期排班规则
      </view>
      <view
        class="rounded-full bg-orange-500 px-3 py-1.5 text-sm text-white"
        @click="showAddPopup = true"
      >
        + 添加规则
      </view>
    </view>

    <view v-if="isLoading" class="flex justify-center py-12">
      <wd-loading />
    </view>

    <view v-else-if="rules.length === 0" class="py-12 text-center">
      <view class="text-sm text-gray-400">
        暂无周期排班规则
      </view>
      <view class="mt-2 text-xs text-gray-300">
        点击右上角添加新规则
      </view>
    </view>

    <view v-else class="p-3 space-y-3">
      <view
        v-for="group in groupedRules"
        :key="group.weekday"
        class="overflow-hidden rounded-xl bg-white shadow-sm"
      >
        <view class="border-b from-purple-50 to-blue-50 bg-gradient-to-r px-4 py-2">
          <text class="text-purple-700 font-medium">{{ group.weekdayText }}</text>
          <text class="ml-2 text-xs text-gray-400">共 {{ group.rules.length }} 条规则</text>
        </view>

        <view class="divide-y">
          <view
            v-for="rule in group.rules"
            :key="rule.id"
            class="flex items-center justify-between px-4 py-3"
          >
            <view class="flex flex-1 items-center">
              <view class="mr-3 h-10 w-1 rounded-full" :class="[getTimeSlotColor(rule.timeSlotName)]" />
              <view class="flex-1">
                <view class="text-gray-800 font-medium">
                  {{ rule.className }}
                </view>
                <view class="mt-0.5 text-xs text-gray-500">
                  {{ rule.timeSlotName }} · {{ rule.startTime }}-{{ rule.endTime }}
                </view>
                <view v-if="rule.serviceType" class="mt-0.5 text-xs text-orange-500">
                  {{ rule.serviceType }}
                </view>
              </view>
            </view>
            <view class="flex items-center gap-2">
              <view
                class="rounded bg-blue-50 px-2 py-1 text-xs text-blue-500"
                @click="editRule(rule)"
              >
                编辑
              </view>
              <view
                class="rounded bg-red-50 px-2 py-1 text-xs text-red-500"
                @click="confirmDelete(rule)"
              >
                删除
              </view>
            </view>
          </view>
        </view>
      </view>
    </view>

    <wd-popup v-model="showAddPopup" position="bottom" custom-style="border-radius: 16px 16px 0 0; padding: 20px;">
      <view class="mb-4 text-lg text-gray-800 font-bold">
        {{ editingRule ? '编辑规则' : '添加周期规则' }}
      </view>

      <view class="space-y-4">
        <view>
          <view class="mb-1 text-sm text-gray-600">
            班级
          </view>
          <picker
            :value="classPickerIndex"
            :range="classPickerOptions"
            range-key="name"
            @change="onClassChange"
          >
            <view class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
              <text :class="formData.classId ? 'text-gray-800' : 'text-gray-400'">
                {{ formData.classId ? getClassName(formData.classId) : '请选择班级' }}
              </text>
              <uni-icons type="bottom" size="14" color="#999" />
            </view>
          </picker>
        </view>

        <view>
          <view class="mb-1 text-sm text-gray-600">
            时段
          </view>
          <picker
            :value="timeSlotPickerIndex"
            :range="timeSlotPickerOptions"
            range-key="name"
            @change="onTimeSlotChange"
          >
            <view class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
              <text :class="formData.timeSlotId ? 'text-gray-800' : 'text-gray-400'">
                {{ formData.timeSlotId ? getTimeSlotName(formData.timeSlotId) : '请选择时段' }}
              </text>
              <uni-icons type="bottom" size="14" color="#999" />
            </view>
          </picker>
        </view>

        <view>
          <view class="mb-1 text-sm text-gray-600">
            星期
          </view>
          <picker
            :value="weekdayPickerIndex"
            :range="weekdayOptions"
            @change="onWeekdayChange"
          >
            <view class="flex items-center justify-between rounded-lg bg-gray-50 px-3 py-2.5">
              <text :class="formData.weekday ? 'text-gray-800' : 'text-gray-400'">
                {{ formData.weekday ? weekdayOptions[formData.weekday - 1] : '请选择星期' }}
              </text>
              <uni-icons type="bottom" size="14" color="#999" />
            </view>
          </picker>
        </view>

        <view>
          <view class="mb-1 text-sm text-gray-600">
            服务类型（选填）
          </view>
          <input
            v-model="formData.serviceType"
            class="rounded-lg bg-gray-50 px-3 py-2.5 text-gray-800"
            placeholder="如：午托、晚托等"
          >
        </view>
      </view>

      <view class="mt-6 flex gap-3">
        <view
          class="flex-1 rounded-lg bg-gray-100 py-2.5 text-center text-gray-600"
          @click="closePopup"
        >
          取消
        </view>
        <view
          class="flex-1 rounded-lg bg-orange-500 py-2.5 text-center text-white"
          @click="submitForm"
        >
          {{ editingRule ? '保存' : '添加' }}
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<script setup lang="ts">
import type { PeriodicRule } from '@/service/types'
import { onPullDownRefresh, onShow } from '@dcloudio/uni-app'
import { computed, onMounted, ref } from 'vue'
import { http } from '@/http/http'
import {
  appAttendancePeriodicRulesRuleIdUsingDelete,
  appAttendancePeriodicRulesRuleIdUsingPut,
  appAttendancePeriodicRulesUsingGet,
  appAttendancePeriodicRulesUsingPost,
} from '@/service/attendance'

definePage({
  style: {
    navigationBarTitleText: '周期排班规则',
    backgroundColor: '#F5F7FA',
  },
})

type Rule = PeriodicRule

interface ClassInfo {
  id: number
  name: string
  grade: string
}

interface TimeSlotInfo {
  id: number
  name: string
  startTime: string
  endTime: string
}

const isLoading = ref(false)
const rules = ref<Rule[]>([])
const classes = ref<ClassInfo[]>([])
const timeSlots = ref<TimeSlotInfo[]>([])
const showAddPopup = ref(false)
const editingRule = ref<Rule | null>(null)

const formData = ref({
  classId: 0,
  timeSlotId: 0,
  weekday: 0,
  serviceType: '',
})

const weekdayOptions = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

const classPickerOptions = computed(() => classes.value)
const classPickerIndex = computed(() => {
  const idx = classes.value.findIndex(c => c.id === formData.value.classId)
  return idx >= 0 ? idx : 0
})

const timeSlotPickerOptions = computed(() => timeSlots.value)
const timeSlotPickerIndex = computed(() => {
  const idx = timeSlots.value.findIndex(t => t.id === formData.value.timeSlotId)
  return idx >= 0 ? idx : 0
})

const weekdayPickerIndex = computed(() => {
  return formData.value.weekday > 0 ? formData.value.weekday - 1 : 0
})

const groupedRules = computed(() => {
  const groups: { weekday: number, weekdayText: string, rules: Rule[] }[] = []
  for (let i = 1; i <= 7; i++) {
    const dayRules = rules.value.filter(r => r.weekday === i)
    if (dayRules.length > 0) {
      groups.push({
        weekday: i,
        weekdayText: weekdayOptions[i - 1],
        rules: dayRules,
      })
    }
  }
  return groups
})

function getTimeSlotColor(name: string) {
  if (name?.includes('午'))
    return 'bg-blue-400'
  if (name?.includes('晚') || name?.includes('九') || name?.includes('十'))
    return 'bg-purple-400'
  return 'bg-gray-400'
}

function getClassName(id: number) {
  const c = classes.value.find(c => c.id === id)
  return c ? `${c.grade}${c.name}` : ''
}

function getTimeSlotName(id: number) {
  const t = timeSlots.value.find(t => t.id === id)
  return t ? `${t.name} (${t.startTime}-${t.endTime})` : ''
}

function onClassChange(e: any) {
  const idx = e.detail.value
  formData.value.classId = classes.value[idx]?.id || 0
}

function onTimeSlotChange(e: any) {
  const idx = e.detail.value
  formData.value.timeSlotId = timeSlots.value[idx]?.id || 0
}

function onWeekdayChange(e: any) {
  formData.value.weekday = e.detail.value + 1
}

function editRule(rule: Rule) {
  editingRule.value = rule
  formData.value = {
    classId: rule.classId,
    timeSlotId: rule.timeSlotId,
    weekday: rule.weekday,
    serviceType: rule.serviceType || '',
  }
  showAddPopup.value = true
}

function closePopup() {
  showAddPopup.value = false
  editingRule.value = null
  formData.value = { classId: 0, timeSlotId: 0, weekday: 0, serviceType: '' }
}

async function submitForm() {
  if (!formData.value.classId) {
    uni.showToast({ title: '请选择班级', icon: 'none' })
    return
  }
  if (!formData.value.timeSlotId) {
    uni.showToast({ title: '请选择时段', icon: 'none' })
    return
  }
  if (!formData.value.weekday) {
    uni.showToast({ title: '请选择星期', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '提交中...' })

    if (editingRule.value) {
      await appAttendancePeriodicRulesRuleIdUsingPut({
        params: { rule_id: editingRule.value.id },
        options: {
          data: {
            classId: formData.value.classId,
            timeSlotId: formData.value.timeSlotId,
            weekday: formData.value.weekday,
            serviceType: formData.value.serviceType,
          },
        },
      })
      uni.showToast({ title: '更新成功', icon: 'success' })
    }
    else {
      await appAttendancePeriodicRulesUsingPost({
        options: {
          data: {
            classId: formData.value.classId,
            timeSlotId: formData.value.timeSlotId,
            weekday: formData.value.weekday,
            serviceType: formData.value.serviceType,
          },
        },
      })
      uni.showToast({ title: '添加成功', icon: 'success' })
    }

    closePopup()
    loadRules()
  }
  catch (e: any) {
    console.error('提交失败:', e)
    uni.showToast({ title: e.message || '操作失败', icon: 'none' })
  }
  finally {
    uni.hideLoading()
  }
}

function confirmDelete(rule: Rule) {
  uni.showModal({
    title: '确认删除',
    content: `确定要删除 ${rule.weekdayText} 的 ${rule.className} - ${rule.timeSlotName} 规则吗？\n这将同时删除未来30天内的相关排班。`,
    confirmColor: '#ff4d4f',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '删除中...' })
          await appAttendancePeriodicRulesRuleIdUsingDelete({
            params: { rule_id: rule.id },
          })
          uni.showToast({ title: '删除成功', icon: 'success' })
          loadRules()
        }
        catch (e: any) {
          console.error('删除失败:', e)
          uni.showToast({ title: e.message || '删除失败', icon: 'none' })
        }
        finally {
          uni.hideLoading()
        }
      }
    },
  })
}

async function loadRules() {
  isLoading.value = true
  try {
    const res = await appAttendancePeriodicRulesUsingGet({})
    if (res?.rules) {
      rules.value = res.rules
    }
  }
  catch (e) {
    console.error('加载规则失败:', e)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    isLoading.value = false
  }
}

async function loadClassesAndTimeSlots() {
  try {
    const [classesRes, slotsRes] = await Promise.all([
      http<any[]>({ url: '/app/attendance/classes', method: 'GET' }),
      http<any[]>({ url: '/app/attendance/time-slots', method: 'GET' }),
    ])

    if (classesRes)
      classes.value = classesRes
    if (slotsRes)
      timeSlots.value = slotsRes
  }
  catch (e) {
    console.error('加载基础数据失败:', e)
  }
}

onMounted(() => {
  loadRules()
  loadClassesAndTimeSlots()
})

onShow(() => {
  if (rules.value.length === 0)
    loadRules()
})

onPullDownRefresh(() => {
  loadRules().then(() => uni.stopPullDownRefresh())
})
</script>
