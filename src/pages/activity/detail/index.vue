<script setup lang="ts">
import type { StudentItem } from '@/api/activity'
import { onLoad, onShareAppMessage, onShow } from '@dcloudio/uni-app'
import { computed, onUnmounted, ref } from 'vue'
import {
  uploadAttachment as apiUploadAttachment,
  getActivityDetail,
  getClassStudents,
  getMyRegistration,
  getMyVoucher,
  getPrograms,
  interactProgram,
  programSignup,
  signupActivity,

} from '@/api/activity'
import { useUserStore } from '@/store/user'
import { useWebSocketStore } from '@/store/websocket'
import { wsManager } from '@/utils/websocket'

defineOptions({ name: 'ActivityDetail' })

definePage({
  type: 'page',
  style: {
    navigationBarTitleText: '活动详情',
    backgroundColor: '#F5F7FA',
  },
})

const userStore = useUserStore()
const wsStore = useWebSocketStore()
const isTeacher = computed(() => userStore.isTeacher)
const isAdmin = computed(() => userStore.isAdmin)
const canBatchSignup = computed(() => (isTeacher.value || isAdmin.value) && detail.value?.allowStudentSignup)

const activityId = ref(0)
const detail = ref<ActivityDetail | null>(null)
const myReg = ref<RegistrationInfo | null>(null)
const programs = ref<ProgramItem[]>([])
const loading = ref(false)
const showSignupDialog = ref(false)
const showProgramSignup = ref(false)
const showVoucher = ref(false)
const voucherInfo = ref<any>(null)
const signupType = ref<'participant' | 'volunteer'>('participant')
const signupRemark = ref('')
const submitting = ref(false)
const showCommentPopup = ref(false)
const currentProgram = ref<ProgramItem | null>(null)
const commentList = ref<any[]>([])
const commentContent = ref('')
const commentLoading = ref(false)

const programForm = reactive({
  name: '',
  programType: '',
  performers: '',
  performerIds: [] as number[],
  duration: undefined as number | undefined,
  remark: '',
})

const showPerformerSelect = ref(false)
const selectedPerformers = ref<StudentItem[]>([])
const performerSearchKeyword = ref('')
const performerLoading = ref(false)
const performerOptions = ref<StudentItem[]>([])
const performerPage = ref(1)
const performerTotal = ref(0)

onLoad((options) => {
  if (options?.id) {
    activityId.value = Number(options.id)
  }
})

onShow(() => {
  if (activityId.value)
    loadAll()
})

async function loadAll() {
  loading.value = true
  try {
    const [detailRes, regRes] = await Promise.all([
      getActivityDetail(activityId.value),
      getMyRegistration(activityId.value).catch(() => null),
    ])
    detail.value = detailRes as any
    myReg.value = regRes as any

    if (detail.value?.enableProgram) {
      const progRes = await getPrograms(activityId.value)
      programs.value = (progRes as any) || []
      setupWebSocketListener()
    }
  }
  catch (e) {
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function openSignup(type: 'participant' | 'volunteer') {
  if (!detail.value)
    return
  if (type === 'volunteer' && !detail.value.allowVolunteer)
    return
  if (type === 'participant' && !detail.value.allowStudentSignup) {
    uni.showToast({ title: '该活动不支持自行报名', icon: 'none' })
    return
  }

  if (myReg.value?.registered) {
    uni.showToast({ title: '您已报名该活动', icon: 'none' })
    return
  }

  signupType.value = type
  signupRemark.value = ''
  showSignupDialog.value = true
}

function closeSignup() {
  showSignupDialog.value = false
}

async function confirmSignup() {
  if (submitting.value)
    return
  submitting.value = true

  try {
    const res = await signupActivity(activityId.value, {
      type: signupType.value,
      remark: signupRemark.value || undefined,
    })

    uni.showModal({
      title: '报名成功',
      content: '如需取消请联系班主任或管理员',
      showCancel: false,
      success: () => {
        showSignupDialog.value = false
        loadAll()
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

function openProgramSignup() {
  if (!detail.value || detail.value.activityType !== 'performance')
    return
  Object.assign(programForm, { name: '', programType: '', performers: '', performerIds: [], duration: undefined, remark: '' })
  selectedPerformers.value = []
  showProgramSignup.value = true
}

async function submitProgramSignup() {
  if (!programForm.name.trim()) {
    uni.showToast({ title: '请输入节目名称', icon: 'none' })
    return
  }
  if (!programForm.programType.trim()) {
    uni.showToast({ title: '请选择节目类型', icon: 'none' })
    return
  }

  try {
    await programSignup(activityId.value, {
      name: programForm.name,
      programType: programForm.programType,
      performerIds: programForm.performerIds,
      duration: programForm.duration,
      remark: programForm.remark || undefined,
    })
    uni.showToast({ title: '节目报名成功，等待审核', icon: 'success' })
    showProgramSignup.value = false
  }
  catch (e: any) {
    uni.showToast({ title: e?.msg || '报名失败', icon: 'none' })
  }
}

function openPerformerSelect() {
  performerSearchKeyword.value = ''
  performerPage.value = 1
  loadPerformerOptions()
  showPerformerSelect.value = true
}

function onPerformersSelected(students: StudentItem[]) {
  selectedPerformers.value = students
  programForm.performerIds = students.map(s => s.id)
  programForm.performers = students.map(s => s.username).join('、')
  showPerformerSelect.value = false
}

function removePerformer(id: number) {
  selectedPerformers.value = selectedPerformers.value.filter(s => s.id !== id)
  programForm.performerIds = selectedPerformers.value.map(s => s.id)
  programForm.performers = selectedPerformers.value.map(s => s.username).join('、')
}

async function searchPerformers() {
  performerPage.value = 1
  await loadPerformerOptions()
}

async function loadPerformerOptions() {
  performerLoading.value = true
  try {
    const classId = userStore.userInfo.classId || 0
    const res = await getClassStudents({
      classId,
      keyword: performerSearchKeyword.value || undefined,
      current: performerPage.value,
      size: 20,
    })
    const data = res as any
    performerOptions.value = (data.records || []).map((item: any) => ({
      id: item.id,
      username: item.username,
      userCode: item.userCode,
    }))
    performerTotal.value = data.total || 0
  }
  catch (e) {
    performerOptions.value = []
  }
  finally {
    performerLoading.value = false
  }
}

function togglePerformer(student: StudentItem) {
  const index = programForm.performerIds.indexOf(student.id)
  if (index > -1) {
    programForm.performerIds.splice(index, 1)
    selectedPerformers.value = selectedPerformers.value.filter(s => s.id !== student.id)
  }
  else {
    programForm.performerIds.push(student.id)
    selectedPerformers.value.push(student)
  }
  programForm.performers = selectedPerformers.value.map(s => s.username).join('、')
}

function handleUploadAttachment() {
  if (!myReg.value?.registrationId)
    return
  uni.chooseImage({
    count: 9,
    success: async (res) => {
      const filePath = res.tempFilePaths[0]
      try {
        await apiUploadAttachment(myReg.value.registrationId!, filePath)
        uni.showToast({ title: '上传成功', icon: 'success' })
        loadAll()
      }
      catch (e) {
        uni.showToast({ title: '上传失败', icon: 'none' })
      }
    },
  })
}

async function viewVoucher() {
  try {
    const res = await getMyVoucher(activityId.value)
    voucherInfo.value = res as any
    showVoucher.value = true
  }
  catch (e) {
    uni.showToast({ title: '获取凭证失败', icon: 'none' })
  }
}

onShareAppMessage(() => {
  return {
    title: detail.value ? `${detail.value.title}` : '校园活动',
    path: `/pages/activity/detail/index?id=${activityId.value}`,
    imageUrl: detail.value?.coverImage || '',
  }
})

async function handleLike(program: ProgramItem) {
  try {
    await interactProgram(program.id, { type: 'like' })
    program.likeCount += 1
  }
  catch (e) {}
}

function formatTime(timeStr?: string): string {
  if (!timeStr)
    return ''
  return timeStr.replace('T', ' ').substring(0, 16)
}

function goToStudentSelect() {
  const classId = userStore.userInfo.classId || 0
  if (!classId && !isAdmin.value) {
    uni.showToast({ title: '未绑定班级', icon: 'none' })
    return
  }
  uni.navigateTo({
    url: `/pages/activity/student-select/index?activityId=${activityId.value}&classId=${classId}`,
  })
}

function setupWebSocketListener() {
  wsManager.on('program_update', handleProgramUpdate)
}

function teardownWebSocketListener() {
  wsManager.off('program_update', handleProgramUpdate)
}

function handleProgramUpdate(data: any) {
  if (!data || data.activityId !== activityId.value)
    return

  const { action, data: eventData } = data

  if (action === 'status_change' && eventData?.programId && eventData?.newStatus) {
    const prog = programs.value.find(p => p.id === eventData.programId)
    if (prog) {
      prog.status = eventData.newStatus
    }
  }
  else if (action === 'create' || action === 'update' || action === 'delete') {
    loadPrograms()
  }
}

onUnmounted(() => {
  teardownWebSocketListener()
})

function openComment(prog: ProgramItem) {
  currentProgram.value = prog
  commentList.value = []
  commentContent.value = ''
  showCommentPopup.value = true
  loadComments(prog.id)
}

async function loadComments(programId: number) {
  commentLoading.value = true
  try {
    const res = await interactProgram(programId, { type: 'get_comments' })
    commentList.value = (res as any)?.comments || []
  }
  catch (e) {
    commentList.value = []
  }
  finally {
    commentLoading.value = false
  }
}

async function submitComment() {
  if (!currentProgram.value)
    return
  if (!commentContent.value.trim()) {
    uni.showToast({ title: '请输入评论内容', icon: 'none' })
    return
  }

  try {
    await interactProgram(currentProgram.value.id, {
      type: 'comment',
      content: commentContent.value.trim(),
    })
    commentContent.value = ''
    currentProgram.value.commentCount += 1
    loadComments(currentProgram.value.id)
    uni.showToast({ title: '评论成功', icon: 'success' })
  }
  catch (e: any) {
    uni.showToast({ title: e?.msg || '评论失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="activity-detail-page">
    <scroll-view scroll-y class="detail-scroll">
      <view v-if="loading" class="loading-overlay">
        <wd-loading size="48rpx" />
      </view>
      <template v-if="!loading && detail">
        <image
          v-if="detail.coverImage"
          :src="detail.coverImage"
          mode="widthFix"
          class="detail-cover"
        />
        <view v-else class="detail-cover default">
          <wd-icon name="calendar" size="60" color="#fff" />
        </view>

        <view class="detail-body">
          <view class="title-section">
            <text class="title">{{ detail.title }}</text>
            <view class="status-badge" :class="`status-${detail.status}`">
              {{ detail.status === 'upcoming' ? '未开始' : detail.status === 'ongoing' ? '进行中' : '已结束' }}
            </view>
          </view>

          <view class="info-grid">
            <view class="info-item">
              <text class="label">活动时间</text>
              <text class="value">{{ formatTime(detail.startTime) }} ~ {{ formatTime(detail.endTime) }}</text>
            </view>
            <view class="info-item">
              <text class="label">报名时间</text>
              <text class="value">{{ formatTime(detail.signupStart) }} ~ {{ formatTime(detail.signupEnd) }}</text>
            </view>
            <view class="info-item">
              <text class="label">举办地点</text>
              <text class="value">{{ detail.location || '待定' }}</text>
            </view>
            <view class="info-item">
              <text class="label">主办方</text>
              <text class="value">{{ detail.organizer || '-' }}</text>
            </view>
            <view class="info-item">
              <text class="label">人数上限</text>
              <text class="value">{{ detail.maxParticipants ? `${detail.maxParticipants}人` : '无限制' }}</text>
            </view>
            <view class="info-item">
              <text class="label">已报名</text>
              <text class="value highlight">{{ detail.registrationCount }}人</text>
            </view>
          </view>

          <view v-if="detail.description" class="section">
            <text class="section-title">活动简介</text>
            <view class="description" v-html="detail.description" />
          </view>

          <view class="action-section">
            <view v-if="!myReg?.registered" class="btn-group">
              <button
                v-if="detail.allowStudentSignup && detail.activityType !== 'performance'"
                class="btn-primary"
                @click="openSignup('participant')"
              >
                立即报名
              </button>
              <button
                v-if="detail.allowVolunteer && detail.activityType !== 'performance'"
                class="btn-secondary"
                @click="openSignup('volunteer')"
              >
                报名志愿者
              </button>
            </view>

            <view v-else class="my-registration">
              <view class="reg-info-card">
                <view class="reg-header">
                  <wd-icon name="check-circle" size="20" color="#67c23a" />
                  <text>已报名 · {{ myReg.registrationType === 'volunteer' ? '志愿者' : '普通报名' }}</text>
                  <button class="btn-small" @click="viewVoucher()">
                    查看凭证
                  </button>
                </view>

                <view v-if="detail.collectAttachment && myReg.attachments?.length !== undefined" class="attachment-area">
                  <text class="sub-label">我的附件 ({{ myReg.attachments.length }})</text>
                  <view v-for="att in myReg.attachments" :key="att.id" class="att-item">
                    <wd-icon name="file" size="16" color="#999" />
                    <text>{{ att.fileName }}</text>
                  </view>
                  <button class="btn-upload" @click="handleUploadAttachment()">
                    上传/修改附件
                  </button>
                </view>
              </view>
            </view>

            <view v-if="canBatchSignup && detail.activityType !== 'performance'" class="btn-group" style="margin-top: 12px">
              <button class="btn-batch" @click="goToStudentSelect">
                代本班学生报名
              </button>
            </view>

            <button class="btn-share" open-type="share">
              分享给好友
            </button>
          </view>

          <view v-if="detail.enableProgram && detail.activityType === 'performance'" class="program-section">
            <view class="section-header">
              <text class="section-title">节目单</text>
              <button class="btn-text" @click="openProgramSignup()">
                节目报名
              </button>
            </view>

            <view v-if="programs.length > 0" class="program-list">
              <view v-for="prog in programs" :key="prog.id" class="program-card">
                <view class="prog-header">
                  <view class="prog-order">
                    #{{ prog.sortOrder + 1 }}
                  </view>
                  <view class="prog-name">
                    {{ prog.name }}
                  </view>
                  <view class="prog-status" :class="`prog-${prog.status}`">
                    {{ prog.status === 'pending' ? '待上场' : prog.status === 'performing' ? '表演中' : '已结束' }}
                  </view>
                </view>
                <view class="prog-meta">
                  <text>{{ prog.performers || '未知' }}</text>
                  <text v-if="prog.duration">· {{ prog.duration }}分钟</text>
                </view>
                <view class="prog-actions">
                  <view class="interaction-btn" @click="handleLike(prog)">
                    <text>👍 {{ prog.likeCount }}</text>
                  </view>
                  <view class="interaction-btn" @click="openComment(prog)">
                    <text>💬 {{ prog.commentCount }}</text>
                  </view>
                </view>
              </view>
            </view>
            <view v-else class="empty-programs">
              <text>暂无节目安排</text>
            </view>
          </view>
        </view>
      </template>
    </scroll-view>

    <wd-popup v-model="showSignupDialog" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="signup-dialog">
        <view class="dialog-header">
          <text class="dialog-title">{{ signupType === 'volunteer' ? '志愿者报名' : '活动报名' }}</text>
          <wd-icon name="close" size="20" @click="closeSignup()" />
        </view>
        <view class="dialog-content">
          <view class="confirm-msg">
            <text>确认报名【{{ detail?.title }}】？</text>
            <text class="sub-hint">报名后不可自行取消，需联系班主任或管理员</text>
          </view>
          <view class="form-field">
            <text class="field-label">备注（可选）</text>
            <textarea
              v-model="signupRemark"
              placeholder="填写备注信息"
              maxlength="200"
              class="remark-input"
            />
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="closeSignup()">
            取消
          </button>
          <button class="btn-confirm" :disabled="submitting" @click="confirmSignup()">
            {{ submitting ? '提交中...' : '确认报名' }}
          </button>
        </view>
      </view>
    </wd-popup>

    <wd-popup v-model="showProgramSignup" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0;">
      <view class="signup-dialog">
        <view class="dialog-header">
          <text class="dialog-title">节目报名</text>
          <wd-icon name="close" size="20" @click="showProgramSignup = false" />
        </view>
        <view class="dialog-content">
          <view class="form-field">
            <text class="field-label required">节目名称</text>
            <input v-model="programForm.name" placeholder="请输入节目名称" class="field-input">
          </view>
          <view class="form-field">
            <text class="field-label required">节目类型</text>
            <input v-model="programForm.programType" placeholder="如：歌舞、小品、朗诵" class="field-input">
          </view>
          <view class="form-field">
            <text class="field-label">参演人员</text>
            <view class="performer-select-area">
              <view v-if="selectedPerformers.length > 0" class="selected-performers">
                <view v-for="p in selectedPerformers" :key="p.id" class="performer-tag">
                  <text>{{ p.username }}</text>
                  <wd-icon name="close" size="12" @click="removePerformer(p.id)" />
                </view>
              </view>
              <button class="btn-add-performer" @click="openPerformerSelect">
                <wd-icon name="add" size="14" />
                <text>添加参演人员</text>
              </button>
            </view>
          </view>
          <view class="form-field">
            <text class="field-label">时长(分钟)</text>
            <input v-model.number="programForm.duration" type="number" placeholder="节目时长" class="field-input">
          </view>
          <view class="form-field">
            <text class="field-label">备注</text>
            <textarea v-model="programForm.remark" placeholder="其他说明" class="remark-input" />
          </view>
        </view>
        <view class="dialog-footer">
          <button class="btn-cancel" @click="showProgramSignup = false">
            取消
          </button>
          <button class="btn-confirm" @click="submitProgramSignup()">
            提交报名
          </button>
        </view>
      </view>
    </wd-popup>

    <wd-popup v-model="showVoucher" position="center" custom-style="border-radius: 16rpx; width: 600rpx;">
      <view v-if="voucherInfo" class="voucher-content">
        <view class="voucher-header">
          <text class="voucher-title">{{ voucherInfo.activityTitle }}</text>
        </view>
        <view class="voucher-card">
          <text class="voucher-label">报名凭证</text>
          <text class="voucher-code">{{ voucherInfo.voucherCode }}</text>
          <view class="voucher-divider" />
          <view class="voucher-meta">
            <text>姓名：{{ voucherInfo.userName }}</text>
            <text>类型：{{ voucherInfo.typeLabel }}</text>
          </view>
        </view>
        <view class="voucher-time">
          <text>报名时间：{{ voucherInfo.createdAt }}</text>
        </view>
      </view>
    </wd-popup>

    <wd-popup v-model="showCommentPopup" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 70vh;">
      <view class="comment-popup">
        <view class="dialog-header">
          <text class="dialog-title">评论 - {{ currentProgram?.name }}</text>
          <wd-icon name="close" size="20" @click="showCommentPopup = false" />
        </view>
        <scroll-view scroll-y class="comment-list">
          <view v-if="commentLoading" class="comment-loading">
            <wd-loading size="32rpx" />
          </view>
          <view v-else-if="commentList.length === 0" class="empty-comments">
            <text>暂无评论，快来抢沙发吧~</text>
          </view>
          <view v-else>
            <view v-for="c in commentList" :key="c.id" class="comment-item">
              <view class="comment-user">
                {{ c.userName || '匿名用户' }}
              </view>
              <view class="comment-content">
                {{ c.content }}
              </view>
              <view class="comment-time">
                {{ c.createdAt }}
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="comment-input-area">
          <input
            v-model="commentContent"
            placeholder="说点什么..."
            class="comment-input"
            maxlength="200"
          >
          <button class="btn-send" @click="submitComment">
            发送
          </button>
        </view>
      </view>
    </wd-popup>

    <wd-popup v-model="showPerformerSelect" position="bottom" custom-style="border-radius: 24rpx 24rpx 0 0; max-height: 80vh;">
      <view class="performer-select-popup">
        <view class="dialog-header">
          <text class="dialog-title">选择参演人员</text>
          <wd-icon name="close" size="20" @click="showPerformerSelect = false" />
        </view>
        <view class="search-area">
          <wd-search v-model="performerSearchKeyword" placeholder="搜索学生姓名" @search="searchPerformers" @clear="searchPerformers" />
        </view>
        <scroll-view scroll-y class="performer-list">
          <view v-if="performerLoading" class="loading-wrap">
            <wd-loading />
          </view>
          <view v-else-if="performerOptions.length === 0" class="empty-wrap">
            <text>暂无可选学生</text>
          </view>
          <view v-else>
            <view
              v-for="s in performerOptions"
              :key="s.id"
              class="performer-option"
              :class="{ selected: programForm.performerIds.includes(s.id) }"
              @click="togglePerformer(s)"
            >
              <view class="checkbox">
                <wd-icon v-if="programForm.performerIds.includes(s.id)" name="check" size="16" color="#fff" />
              </view>
              <view class="option-info">
                <text class="option-name">{{ s.username }}</text>
                <text class="option-code">{{ s.userCode }}</text>
              </view>
            </view>
          </view>
        </scroll-view>
        <view class="popup-footer">
          <text class="selected-count">已选 {{ programForm.performerIds.length }} 人</text>
          <button class="btn-confirm-select" @click="showPerformerSelect = false">
            确定
          </button>
        </view>
      </view>
    </wd-popup>
  </view>
</template>

<style scoped>
.activity-detail-page {
  min-height: 100vh;
  background: #f5f7fa;
}

.loading-overlay {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 400px;
}

.detail-scroll {
  height: 100vh;
}

.detail-cover {
  width: 100%;
}
.detail-cover.default {
  width: 100%;
  height: 240px;
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  display: flex;
  align-items: center;
  justify-content: center;
}

.detail-body {
  padding: 0 16px 32px;
  margin-top: -30px;
  position: relative;
  z-index: 1;
}

.title-section {
  display: flex;
  align-items: center;
  gap: 10px;
  margin-bottom: 16px;
}

.title {
  font-size: 20px;
  font-weight: bold;
  color: #303133;
  flex: 1;
}

.status-badge {
  padding: 3px 10px;
  border-radius: 12px;
  font-size: 11px;
  white-space: nowrap;
}

.status-upcoming {
  background: #f0f2f5;
  color: #909399;
}
.status-ongoing {
  background: #e8f5e9;
  color: #67c23a;
}
.status-ended {
  background: #f5f5f5;
  color: #c0c4cc;
}

.info-grid {
  display: grid;
  grid-template-columns: 1fr 1fr;
  gap: 10px;
  margin-bottom: 20px;
}

.info-item {
  padding: 10px 12px;
  background: white;
  border-radius: 8px;
}

.label {
  font-size: 11px;
  color: #909399;
  display: block;
  margin-bottom: 4px;
}

.value {
  font-size: 13px;
  color: #303133;
}

.highlight {
  color: #409eff;
  font-weight: 500;
}

.section {
  margin-bottom: 20px;
}

.section-title {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  display: block;
  margin-bottom: 10px;
}

.description {
  padding: 14px;
  background: white;
  border-radius: 8px;
  font-size: 13px;
  line-height: 1.6;
  color: #606266;
}

.action-section {
  margin-bottom: 20px;
}

.btn-group {
  display: flex;
  gap: 12px;
}

.btn-primary {
  flex: 1;
  height: 44px;
  line-height: 44px;
  border-radius: 22px;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  text-align: center;
  border: none;
}

.btn-secondary {
  flex: 1;
  height: 44px;
  line-height: 44px;
  border-radius: 22px;
  background: #f0f9ff;
  color: #1677ff;
  font-size: 15px;
  font-weight: 500;
  text-align: center;
  border: 1px solid #bce0ff;
}

.btn-batch {
  width: 100%;
  height: 40px;
  line-height: 40px;
  border-radius: 20px;
  background: linear-gradient(135deg, #ff9500 0%, #ff6b00 100%);
  color: white;
  font-size: 14px;
  font-weight: 500;
  border: none;
}

.my-registration {
  margin-bottom: 12px;
}

.reg-info-card {
  background: linear-gradient(135deg, #f0faf5 0%, #e8ffef 100%);
  border-radius: 12px;
  padding: 16px;
  border-left: 4px solid #07c160;
}

.reg-header {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 14px;
  color: #07c160;
  font-weight: 600;
  margin-bottom: 10px;
}

.btn-small {
  margin-left: auto;
  padding: 4px 12px;
  font-size: 12px;
  background: #07c160;
  color: white;
  border-radius: 20px;
  border: none;
}

.attachment-area {
  margin-top: 10px;
}

.sub-label {
  font-size: 12px;
  color: #999;
  display: block;
  margin-bottom: 6px;
}

.att-item {
  display: flex;
  align-items: center;
  gap: 6px;
  font-size: 13px;
  color: #606266;
  padding: 4px 0;
}

.btn-upload {
  margin-top: 8px;
  padding: 6px 16px;
  font-size: 12px;
  background: #f0f9ff;
  color: #1677ff;
  border: 1px solid #bce0ff;
  border-radius: 4px;
}

.btn-share {
  width: 100%;
  height: 40px;
  line-height: 40px;
  background: linear-gradient(135deg, #f7f8fa 0%, #eef0f2 100%);
  color: #86909c;
  font-size: 13px;
  border: 1px solid #e5e6eb;
  border-radius: 20px;
}

.program-section {
  margin-top: 8px;
}

.section-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 12px;
}

.btn-text {
  padding: 4px 12px;
  font-size: 12px;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  border-radius: 20px;
  border: none;
}

.program-list {
  display: flex;
  flex-direction: column;
  gap: 10px;
}

.program-card {
  background: white;
  border-radius: 10px;
  padding: 14px;
  box-shadow: 0 1px 6px rgba(0, 0, 0, 0.04);
}

.prog-header {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-bottom: 6px;
}

.prog-order {
  font-size: 13px;
  font-weight: bold;
  color: #667eea;
}

.prog-name {
  font-size: 15px;
  font-weight: 600;
  color: #303133;
  flex: 1;
}

.prog-status {
  font-size: 11px;
  padding: 2px 8px;
  border-radius: 8px;
}

.prog-pending {
  background: #fef0f0;
  color: #f56c6c;
}
.prog-performing {
  background: #ecf5ff;
  color: #409eff;
}
.prog-completed {
  background: #f0f2f5;
  color: #909399;
}

.prog-meta {
  font-size: 12px;
  color: #909399;
  margin-bottom: 8px;
}

.prog-actions {
  display: flex;
  gap: 16px;
}

.interaction-btn {
  font-size: 12px;
  color: #909399;
}

.empty-programs {
  text-align: center;
  padding: 32px;
  color: #c0c4cc;
  font-size: 13px;
}

.signup-dialog {
  padding: 24px 20px;
}

.dialog-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  margin-bottom: 20px;
}

.dialog-title {
  font-size: 18px;
  font-weight: bold;
  color: #303133;
}

.confirm-msg {
  margin-bottom: 16px;
  font-size: 15px;
  color: #303133;
}

.sub-hint {
  display: block;
  font-size: 12px;
  color: #e6a23c;
  margin-top: 6px;
}

.form-field {
  margin-bottom: 14px;
}

.field-label {
  font-size: 13px;
  color: #606266;
  display: block;
  margin-bottom: 6px;
}

.field-label.required::before {
  content: '*';
  color: #f56c6c;
  margin-right: 4px;
}

.field-input {
  height: 42px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
}

.remark-input {
  min-height: 80px;
  padding: 10px 12px;
  border: 1px solid #dcdfe6;
  border-radius: 8px;
  font-size: 14px;
}

.dialog-footer {
  display: flex;
  gap: 12px;
  margin-top: 20px;
}

.btn-cancel {
  flex: 1;
  height: 44px;
  line-height: 44px;
  background: #f5f7fa;
  color: #606266;
  font-size: 15px;
  border-radius: 22px;
  border: none;
}

.btn-confirm {
  flex: 1;
  height: 44px;
  line-height: 44px;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  font-size: 15px;
  font-weight: 600;
  border-radius: 22px;
  border: none;
}

.voucher-content {
  padding: 24px;
  text-align: center;
}

.voucher-title {
  font-size: 17px;
  font-weight: bold;
  color: #303133;
  display: block;
  margin-bottom: 16px;
}

.voucher-card {
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  border-radius: 12px;
  padding: 20px;
  color: white;
}

.voucher-label {
  font-size: 12px;
  opacity: 0.85;
  display: block;
  margin-bottom: 6px;
}

.voucher-code {
  font-size: 20px;
  font-weight: bold;
  letter-spacing: 2px;
  display: block;
}

.voucher-divider {
  height: 1px;
  background: rgba(255, 255, 255, 0.25);
  margin: 12px 0;
}

.voucher-meta {
  display: flex;
  justify-content: space-between;
  font-size: 13px;
}

.voucher-time {
  margin-top: 12px;
  font-size: 12px;
  color: #909399;
}

.comment-popup {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  max-height: 70vh;
}

.comment-list {
  flex: 1;
  min-height: 200px;
  max-height: 400px;
}

.comment-loading {
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 40px 0;
}

.empty-comments {
  text-align: center;
  padding: 40px 0;
  color: #c0c4cc;
  font-size: 14px;
}

.comment-item {
  padding: 12px 0;
  border-bottom: 1px solid #f0f0f0;
}

.comment-user {
  font-size: 14px;
  font-weight: 500;
  color: #303133;
  margin-bottom: 4px;
}

.comment-content {
  font-size: 14px;
  color: #606266;
  line-height: 1.5;
}

.comment-time {
  font-size: 12px;
  color: #c0c4cc;
  margin-top: 4px;
}

.comment-input-area {
  display: flex;
  gap: 12px;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.comment-input {
  flex: 1;
  height: 40px;
  padding: 0 12px;
  border: 1px solid #dcdfe6;
  border-radius: 20px;
  font-size: 14px;
}

.btn-send {
  width: 80px;
  height: 40px;
  line-height: 40px;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  font-size: 14px;
  border-radius: 20px;
  border: none;
}

.performer-select-area {
  width: 100%;
}

.selected-performers {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
  margin-bottom: 10px;
}

.performer-tag {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 6px 10px;
  background: #f0f9ff;
  border-radius: 14px;
  font-size: 13px;
  color: #1677ff;
}

.btn-add-performer {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  width: 100%;
  height: 40px;
  background: #f5f7fa;
  border: 1px dashed #dcdfe6;
  border-radius: 8px;
  color: #909399;
  font-size: 13px;
}

.performer-select-popup {
  padding: 24px 20px;
  display: flex;
  flex-direction: column;
  max-height: 80vh;
}

.search-area {
  margin-bottom: 12px;
}

.performer-list {
  flex: 1;
  min-height: 200px;
  max-height: 400px;
}

.performer-option {
  display: flex;
  align-items: center;
  padding: 12px;
  background: white;
  border-radius: 8px;
  margin-bottom: 8px;
  border: 2px solid transparent;
}

.performer-option.selected {
  border-color: #07c160;
  background: #f0faf5;
}

.performer-option .checkbox {
  width: 20px;
  height: 20px;
  border-radius: 50%;
  border: 2px solid #dcdfe6;
  display: flex;
  align-items: center;
  justify-content: center;
  margin-right: 12px;
}

.performer-option.selected .checkbox {
  background: #07c160;
  border-color: #07c160;
}

.option-info {
  flex: 1;
}

.option-name {
  font-size: 14px;
  color: #303133;
  font-weight: 500;
}

.option-code {
  font-size: 12px;
  color: #909399;
  margin-left: 8px;
}

.popup-footer {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-top: 16px;
  padding-top: 16px;
  border-top: 1px solid #f0f0f0;
}

.selected-count {
  font-size: 14px;
  color: #07c160;
  font-weight: 500;
}

.btn-confirm-select {
  width: 100px;
  height: 36px;
  line-height: 36px;
  background: linear-gradient(135deg, #07c160 0%, #06ad56 100%);
  color: white;
  font-size: 14px;
  border-radius: 18px;
  border: none;
}
</style>
