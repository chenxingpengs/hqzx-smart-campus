<script setup lang="ts">
import type { StudentItem } from '@/api/activity'
import { onLoad, onReachBottom } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import { getClassStudents, teacherBatchSignup } from '@/api/activity'

defineOptions({ name: 'StudentSelect' })

definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '选择学生',
    backgroundColor: '#F5F7FA',
  },
})

const activityId = ref(0)
const classId = ref(0)
const keyword = ref('')
const loading = ref(false)
const studentList = ref<StudentItem[]>([])
const selectedIds = ref<number[]>([])
const current = ref(1)
const size = ref(20)
const total = ref(0)
const submitting = ref(false)

const selectedCount = computed(() => selectedIds.value.length)

onLoad((options) => {
  if (options?.activityId) {
    activityId.value = Number(options.activityId)
  }
  if (options?.classId) {
    classId.value = Number(options.classId)
  }
  loadStudents()
})

onReachBottom(() => {
  if (studentList.value.length < total.value) {
    current.value++
    loadStudents(true)
  }
})

async function loadStudents(append = false) {
  if (!classId.value)
    return

  loading.value = true
  try {
    const res = await getClassStudents({
      classId: classId.value,
      keyword: keyword.value || undefined,
      current: current.value,
      size: size.value,
    })
    const data = res as any
    if (append) {
      studentList.value = [...studentList.value, ...(data.records || [])]
    }
    else {
      studentList.value = data.records || []
    }
    total.value = data.total || 0
  }
  catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function handleSearch() {
  current.value = 1
  loadStudents()
}

function toggleSelect(student: StudentItem) {
  const index = selectedIds.value.indexOf(student.id)
  if (index > -1) {
    selectedIds.value.splice(index, 1)
  }
  else {
    selectedIds.value.push(student.id)
  }
}

function isSelected(id: number): boolean {
  return selectedIds.value.includes(id)
}

async function handleSubmit() {
  if (selectedIds.value.length === 0) {
    uni.showToast({ title: '请选择学生', icon: 'none' })
    return
  }

  submitting.value = true
  try {
    const res = await teacherBatchSignup(activityId.value, selectedIds.value)
    const data = res as any
    uni.showModal({
      title: '报名成功',
      content: `成功为 ${data.successCount || selectedIds.value.length} 名学生报名`,
      showCancel: false,
      success: () => {
        uni.navigateBack()
      },
    })
  }
  catch (e: any) {
    uni.showToast({ title: e?.msg || '报名失败', icon: 'none' })
  }
  finally {
    submitting.value = false
  }
}
</script>

<template>
  <view class="page">
    <view class="search-bar">
      <wd-search
        v-model="keyword"
        placeholder="搜索学生姓名"
        @search="handleSearch"
        @clear="handleSearch"
      />
    </view>

    <view class="selected-info">
      <text>已选择 {{ selectedCount }} 名学生</text>
    </view>

    <scroll-view scroll-y class="student-list">
      <view v-if="loading && studentList.length === 0" class="loading-wrap">
        <wd-loading />
      </view>

      <view v-else-if="studentList.length === 0" class="empty-wrap">
        <text>暂无学生</text>
      </view>

      <view v-else class="list">
        <view
          v-for="student in studentList"
          :key="student.id"
          class="student-item"
          :class="{ selected: isSelected(student.id) }"
          @click="toggleSelect(student)"
        >
          <view class="checkbox">
            <wd-icon v-if="isSelected(student.id)" name="check" size="16" color="#fff" />
          </view>
          <view class="info">
            <text class="name">{{ student.username }}</text>
            <text class="code">{{ student.userCode }}</text>
          </view>
        </view>
      </view>

      <view v-if="loading && studentList.length > 0" class="loading-more">
        <wd-loading size="24rpx" />
        <text>加载中...</text>
      </view>
    </scroll-view>

    <view class="footer">
      <button class="btn-submit" :disabled="selectedCount === 0 || submitting" @click="handleSubmit">
        {{ submitting ? '提交中...' : `确认报名 (${selectedCount}人)` }}
      </button>
    </view>
  </view>
</template>

<style scoped>
.page {
  min-height: 100vh;
  background: #f5f7fa;
  display: flex;
  flex-direction: column;
}

.search-bar {
  padding: 12px;
  background: #fff;
}

.selected-info {
  padding: 8px 16px;
  background: #e8f4ff;
  color: #1677ff;
  font-size: 13px;
}

.student-list {
  flex: 1;
  padding: 12px;
}

.loading-wrap,
.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 60px 0;
  color: #999;
  font-size: 14px;
}

.list {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.student-item {
  display: flex;
  align-items: center;
  padding: 14px 16px;
  background: #fff;
  border-radius: 10px;
  border: 2px solid transparent;
}

.student-item.selected {
  border-color: #07c160;
  background: #f0faf5;
}

.checkbox {
  width: 22px;
  height: 22px;
  border-radius: 50%;
  border: 2px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.student-item.selected .checkbox {
  background: #07c160;
  border-color: #07c160;
}

.info {
  flex: 1;
}

.name {
  font-size: 15px;
  color: #303133;
  font-weight: 500;
}

.code {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.loading-more {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 16px;
  color: #999;
  font-size: 12px;
  gap: 6px;
}

.footer {
  padding: 12px 16px;
  background: #fff;
  border-top: 1px solid #eee;
}

.btn-submit {
  width: 100%;
  height: 44px;
  line-height: 44px;
  border-radius: 22px;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border: none;
}

.btn-submit[disabled] {
  background: #c0c4cc;
}
</style>
