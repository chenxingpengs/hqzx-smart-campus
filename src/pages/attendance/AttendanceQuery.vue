<template>
  <view class="px-5 py-3 pb-8">
    <view class="mb-3 text-lg text-gray-800 font-semibold">
      考勤查询
    </view>

    <view class="mb-3 rounded-xl bg-white p-3 shadow-sm">
      <view class="grid grid-cols-2 mb-3 gap-3">
        <view>
          <text class="mb-1 block text-xs text-gray-600">查询日期</text>
          <picker
            mode="date"
            :value="queryParams.date"
            @change="(e) => $emit('updateParams', 'date', e.detail.value)"
          >
            <view class="border border-gray-200 rounded-lg px-2 py-2 text-sm">
              {{ queryParams.date }}
            </view>
          </picker>
        </view>
        <view>
          <text class="mb-1 block text-xs text-gray-600">年级筛选</text>
          <picker
            mode="selector"
            :range="['', '初一', '初二', '初三']"
            @change="(e) => {
              const range = ['', '初一', '初二', '初三'];
              $emit('updateParams', 'grade', range[e.detail.value])
            }"
          >
            <view class="border border-gray-200 rounded-lg px-2 py-2 text-sm">
              {{ queryParams.grade || '全部年级' }}
            </view>
          </picker>
        </view>
      </view>
      <view class="mb-3">
        <text class="mb-1 block text-xs text-gray-600">班级名称</text>
        <input
          :value="queryParams.className"
          placeholder="输入班级名称搜索（如：初一(1)班）"
          class="w-full border border-gray-200 rounded-lg px-2 py-2 text-sm"
          @input="emit('updateParams', 'className', $event.target.value)"
        >
      </view>
      <button
        class="w-full rounded-lg bg-orange-500 py-2 text-sm text-white transition-all duration-200 hover:bg-orange-600"
        :loading="isQueryLoading"
        @click="emit('doQuery')"
      >
        执行查询
      </button>
    </view>

    <view>
      <view class="mb-2 flex justify-between text-sm text-gray-700 font-medium">
        <text>查询结果</text>
        <text class="text-gray-500">{{ queryResult.length }} 个班级</text>
      </view>

      <view v-if="isQueryLoading" class="flex justify-center py-8">
        <view class="loading-spinner" />
      </view>

      <view v-else-if="queryResult.length === 0" class="rounded-xl bg-white py-8 text-center text-sm text-gray-500 shadow-sm">
        暂无符合条件的考勤数据
      </view>

      <view v-else class="space-y-3">
        <view
          v-for="item in queryResult"
          :key="item.id"
          class="rounded-xl bg-white p-3 shadow-sm transition-all duration-200 hover:shadow-md"
        >
          <view class="mb-2 flex items-center justify-between">
            <view class="text-base text-gray-800 font-bold">
              {{ item.name }}
            </view>
            <view :class="`text-xs px-2 py-0.5 rounded-full ${getScheduleTypeClass(item.scheduleType)}`">
              {{ getScheduleTypeText(item.scheduleType) }}
            </view>
          </view>
          <view class="mb-2 text-xs text-gray-500">
            时段: {{ item.scheduleTime }} | 年级: {{ item.grade }} | 应到: {{ item.shouldAttend }} 人
          </view>
          <view v-if="item.todayAttendance" class="text-xs">
            <text class="text-green-600">已到: {{ item.todayAttendance.present }} 人</text>
            <text class="mx-1 text-gray-300">|</text>
            <text class="text-red-600">请假: {{ item.todayAttendance.absent }} 人</text>
          </view>
          <view v-else class="text-xs text-gray-500">
            尚未考勤
          </view>
        </view>
      </view>
    </view>
  </view>
</template>

<script setup>
const props = defineProps({
  queryParams: {
    type: Object,
    default: () => ({
      date: '',
      grade: '',
      className: '',
    }),
  },
  queryResult: {
    type: Array,
    default: () => [],
  },
  isQueryLoading: {
    type: Boolean,
    default: false,
  },
})

const emit = defineEmits(['updateParams', 'doQuery'])

definePage({
  style: {
    navigationStyle: 'custom',
    navigationBarTitleText: '考勤查询',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

function getScheduleTypeText(type) {
  switch (type) {
    case 'noon': return '午托'
    case 'evening': return '晚托'
    default: return '未知'
  }
}

function getScheduleTypeClass(type) {
  switch (type) {
    case 'noon': return 'bg-blue-100 text-blue-700'
    case 'evening': return 'bg-purple-100 text-purple-700'
    default: return 'bg-gray-100 text-gray-700'
  }
}
</script>

<style scoped>
.loading-spinner {
  width: 24px;
  height: 24px;
  border: 3px solid rgba(255, 125, 0, 0.2);
  border-radius: 50%;
  border-top-color: #ff7d00;
  animation: spin 1s ease-in-out infinite;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}
</style>
