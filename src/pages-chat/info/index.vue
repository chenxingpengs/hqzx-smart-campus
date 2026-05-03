<script setup lang="ts">
import type { ConversationDetail, Device, Participant, SearchResultClass, SearchResultUser } from '@/api/chat'
import { onLoad } from '@dcloudio/uni-app'
import { computed, ref } from 'vue'
import {
  addParticipants,

  dissolveConversation,
  getConversationDetail,
  getDevices,
  leaveConversation,

  searchClasses,

  searchUsers,
} from '@/api/chat'
import { useChatCacheStore } from '@/store/chatCache'
import { useUserStore } from '@/store/user'

definePage({
  style: {
    navigationBarTitleText: '聊天信息',
    navigationStyle: 'custom',
    backgroundColor: '#ededed',
  },
})

const userStore = useUserStore()
const chatCacheStore = useChatCacheStore()

const conversationId = ref('')
const conversationName = ref('')
const conversationType = ref<'private' | 'group' | 'broadcast'>('group')
const detail = ref<ConversationDetail | null>(null)
const loading = ref(false)

const isPinned = ref(false)
const isMuted = ref(false)
const showMemberList = ref(false)
const showAddMemberPopup = ref(false)
const participants = ref<Participant[]>([])

const searchKeyword = ref('')
const activeTab = ref<'user' | 'class' | 'device'>('user')
const searchResults = ref<(SearchResultUser | SearchResultClass | Device)[]>([])
const selectedUsers = ref<number[]>([])
const selectedClasses = ref<number[]>([])
const selectedDevices = ref<string[]>([])
const searching = ref(false)
const deviceList = ref<Device[]>([])
const devicesLoading = ref(false)

const canManageMembers = computed(() => {
  const role = userStore.userInfo?.role
  return role === 'admin' || role === 'teacher'
})

const isOwner = computed(() => {
  if (!detail.value?.participants)
    return false
  const currentUserId = userStore.userInfo?.userId
  return detail.value.participants.some(
    p => p.user_id === currentUserId && p.role === 'owner',
  )
})

onLoad((options) => {
  conversationId.value = options.id as string
  conversationName.value = decodeURIComponent(options.name as string || '')
  conversationType.value = options.type as 'private' | 'group' | 'broadcast' || 'group'
  loadDetail()
})

async function loadDetail() {
  loading.value = true
  try {
    const res = await getConversationDetail(conversationId.value)
    console.log('[聊天信息] 会话详情:', res)
    if (res) {
      detail.value = res
      participants.value = res.participants || []
      if (!conversationName.value && res.name) {
        conversationName.value = res.name
      }
      if (res.type) {
        conversationType.value = res.type
      }
      console.log('[聊天信息] conversationType:', conversationType.value)
      console.log('[聊天信息] participants:', participants.value)
      console.log('[聊天信息] currentUserId:', userStore.userInfo?.userId)
      console.log('[聊天信息] isOwner:', isOwner.value)

      const cachedConv = chatCacheStore.getConversations()?.find(c => c.id === conversationId.value)
      if (cachedConv) {
        isPinned.value = cachedConv.is_pinned
        isMuted.value = cachedConv.is_muted
      }
    }
  }
  catch (error) {
    console.error('[聊天信息] 获取会话详情失败', error)
    uni.showToast({ title: '加载失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

async function togglePin() {
  try {
    isPinned.value = !isPinned.value
    chatCacheStore.updateConversationPin(conversationId.value, isPinned.value)
    uni.showToast({ title: isPinned.value ? '已置顶' : '已取消置顶', icon: 'success' })
  }
  catch (error) {
    console.error('[聊天信息] 置顶操作失败', error)
    isPinned.value = !isPinned.value
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

async function toggleMute() {
  try {
    isMuted.value = !isMuted.value
    chatCacheStore.updateConversationMute(conversationId.value, isMuted.value)
    uni.showToast({ title: isMuted.value ? '已开启免打扰' : '已关闭免打扰', icon: 'success' })
  }
  catch (error) {
    console.error('[聊天信息] 免打扰操作失败', error)
    isMuted.value = !isMuted.value
    uni.showToast({ title: '操作失败', icon: 'none' })
  }
}

function clearMessages() {
  uni.showModal({
    title: '确认清空',
    content: '确定要清空所有聊天记录吗？此操作不可恢复',
    confirmColor: '#F44336',
    success: async (res) => {
      if (res.confirm) {
        try {
          chatCacheStore.clearMessages(conversationId.value)
          uni.showToast({ title: '已清空', icon: 'success' })
          setTimeout(() => {
            uni.navigateBack()
          }, 1500)
        }
        catch (error) {
          console.error('[聊天信息] 清空消息失败', error)
          uni.showToast({ title: '清空失败', icon: 'none' })
        }
      }
    },
  })
}

async function leaveOrDissolveGroup() {
  const action = isOwner.value ? '解散群聊' : '退出群聊'
  const content = isOwner.value
    ? '解散后群聊将被删除，所有成员将被移除。确定要解散吗？'
    : '退出后将无法查看群聊消息和接收新消息。确定要退出吗？'

  uni.showModal({
    title: `确认${action}`,
    content,
    confirmColor: '#F44336',
    success: async (res) => {
      if (res.confirm) {
        try {
          uni.showLoading({ title: '处理中...' })

          if (isOwner.value) {
            await dissolveConversation(conversationId.value)
          }
          else {
            await leaveConversation(conversationId.value)
          }

          uni.hideLoading()
          uni.showToast({ title: `${action}成功`, icon: 'success' })

          chatCacheStore.removeConversation(conversationId.value)

          setTimeout(() => {
            uni.navigateBack({ delta: 2 })
          }, 1500)
        }
        catch (error: any) {
          uni.hideLoading()
          console.error(`[聊天信息] ${action}失败:`, error)
          const errorMsg = error?.data?.msg || error?.msg || `${action}失败`
          uni.showToast({
            title: errorMsg,
            icon: 'none',
          })
        }
      }
    },
  })
}

function openMemberList() {
  showMemberList.value = true
}

async function openAddMemberPopup() {
  showAddMemberPopup.value = true
  searchKeyword.value = ''
  selectedUsers.value = []
  selectedClasses.value = []
  selectedDevices.value = []
  searchResults.value = []
  activeTab.value = 'user'
  devicesLoading.value = true

  try {
    console.log('[聊天信息] 开始获取设备列表...')
    const devices = await getDevices()
    console.log('[聊天信息] API返回设备:', JSON.stringify(devices))
    deviceList.value = devices || []
    console.log('[聊天信息] deviceList已设置, 长度:', deviceList.value.length)
    console.log('[聊天信息] 设备列表详情:', JSON.stringify(deviceList.value))
    if (activeTab.value === 'device') {
      searchResults.value = deviceList.value
      console.log('[聊天信息] searchResults已设置为deviceList')
    }
  }
  catch (error) {
    console.error('[聊天信息] 获取设备列表失败:', error)
    deviceList.value = []
  }
  finally {
    devicesLoading.value = false
  }
}

async function handleSearch() {
  if (activeTab.value === 'device') {
    if (!searchKeyword.value.trim()) {
      searchResults.value = deviceList.value
    }
    else {
      const keyword = searchKeyword.value.toLowerCase()
      searchResults.value = deviceList.value.filter(device =>
        device.device_id?.toLowerCase().includes(keyword)
        || device.device_name?.toLowerCase().includes(keyword)
        || device.class_name?.toLowerCase().includes(keyword),
      )
    }
    return
  }

  if (!searchKeyword.value.trim()) {
    searchResults.value = []
    return
  }

  searching.value = true
  try {
    if (activeTab.value === 'user') {
      const res = await searchUsers({ keyword: searchKeyword.value, size: 20 })
      searchResults.value = res?.list || []
    }
    else {
      const res = await searchClasses({ keyword: searchKeyword.value, size: 20 })
      searchResults.value = res?.list || []
    }
  }
  catch (error) {
    console.error('搜索失败:', error)
    uni.showToast({ title: '搜索失败', icon: 'none' })
  }
  finally {
    searching.value = false
  }
}

let searchTimer: ReturnType<typeof setTimeout> | null = null
function onSearchInput() {
  if (searchTimer)
    clearTimeout(searchTimer)
  searchTimer = setTimeout(() => {
    handleSearch()
  }, 500)
}

function switchTab(tab: 'user' | 'class' | 'device') {
  console.log('[聊天信息] 切换tab到:', tab)
  activeTab.value = tab
  searchResults.value = []
  if (tab === 'device') {
    console.log('[聊天信息] 设备tab - devicesLoading:', devicesLoading.value, ', deviceList长度:', deviceList.value.length)
    if (devicesLoading.value) {
      searchResults.value = []
      console.log('[聊天信息] 设备正在加载，显示空列表')
    }
    else {
      searchResults.value = deviceList.value
      console.log('[聊天信息] 设置searchResults为deviceList, 长度:', searchResults.value.length)
      console.log('[聊天信息] searchResults内容:', JSON.stringify(searchResults.value))
    }
  }
  else if (searchKeyword.value.trim()) {
    handleSearch()
  }
}

function toggleDeviceSelection(deviceId: string) {
  const index = selectedDevices.value.indexOf(deviceId)
  if (index > -1) {
    selectedDevices.value.splice(index, 1)
  }
  else {
    selectedDevices.value.push(deviceId)
  }
}

const isDeviceSelected = (deviceId: string) => selectedDevices.value.includes(deviceId)

function toggleUserSelection(userId: number) {
  const index = selectedUsers.value.indexOf(userId)
  if (index > -1) {
    selectedUsers.value.splice(index, 1)
  }
  else {
    selectedUsers.value.push(userId)
  }
}

function toggleClassSelection(classId: number) {
  const index = selectedClasses.value.indexOf(classId)
  if (index > -1) {
    selectedClasses.value.splice(index, 1)
  }
  else {
    selectedClasses.value.push(classId)
  }
}

const isUserSelected = (userId: number) => selectedUsers.value.includes(userId)
const isClassSelected = (classId: number) => selectedClasses.value.includes(classId)

const totalSelected = computed(() => selectedUsers.value.length + selectedClasses.value.length + selectedDevices.value.length)

async function handleAddMembers() {
  if (totalSelected.value === 0) {
    uni.showToast({ title: '请至少选择一个用户、班级或设备', icon: 'none' })
    return
  }

  try {
    uni.showLoading({ title: '添加中...' })

    let addedCount = 0

    if (selectedUsers.value.length > 0) {
      const res = await addParticipants(conversationId.value, {
        participant_user_ids: selectedUsers.value,
      })
      if (res?.added_count) {
        addedCount += res.added_count
      }
    }

    if (selectedClasses.value.length > 0) {
      const res = await addParticipants(conversationId.value, {
        participant_class_ids: selectedClasses.value,
      })
      if (res?.added_count) {
        addedCount += res.added_count
      }
    }

    if (selectedDevices.value.length > 0) {
      const res = await addParticipants(conversationId.value, {
        participant_device_ids: selectedDevices.value,
      })
      if (res?.added_count) {
        addedCount += res.added_count
      }
    }

    uni.hideLoading()
    const successMsg = addedCount > 0 ? `成功添加 ${addedCount} 项` : '添加完成'
    uni.showToast({ title: successMsg, icon: 'success' })

    showAddMemberPopup.value = false
    loadDetail()
  }
  catch (error) {
    uni.hideLoading()
    console.error('添加成员失败:', error)
    uni.showToast({ title: '添加失败', icon: 'none' })
  }
}
</script>

<template>
  <view class="chat-info">
    <!-- 自定义导航栏 -->
    <view class="custom-nav">
      <view class="nav-content">
        <view class="nav-left" @click="uni.navigateBack()">
          <text class="back-btn">‹</text>
        </view>
        <view class="nav-center">
          <text class="nav-title">聊天信息</text>
        </view>
        <view class="nav-right" />
      </view>
    </view>

    <scroll-view v-if="!loading" scroll-y class="info-scroll">
      <!-- 个人聊天模式 -->
      <template v-if="conversationType === 'private'">
        <view class="info-card user-info-card">
          <view class="user-avatar-section">
            <view class="avatar-large">
              <text class="avatar-char">{{ conversationName?.charAt(0) || '?' }}</text>
            </view>
            <view class="user-name">
              <text class="name-text">{{ conversationName || '未知用户' }}</text>
            </view>
            <text class="user-desc">个人聊天</text>
          </view>
        </view>
      </template>

      <!-- 群聊/广播模式 -->
      <template v-else>
        <view class="info-card group-info-card" @click="openMemberList">
          <view class="group-header">
            <view class="avatar-large group-avatar">
              <text class="avatar-char">{{ conversationName?.charAt(0) || '群' }}</text>
            </view>
            <view class="group-name">
              <text class="name-text">{{ conversationName || '未命名群聊' }}</text>
              <text class="member-count">群成员: {{ participants.length }}人</text>
            </view>
            <text class="arrow">›</text>
          </view>

          <view v-if="participants.length > 0" class="member-preview">
            <view
              v-for="(participant, index) in participants.slice(0, 8)"
              :key="index"
              class="preview-avatar"
            >
              <text class="avatar-char-small">{{ participant.name?.charAt(0) || '?' }}</text>
            </view>
            <view v-if="participants.length > 8" class="more-members">
              <text>+{{ participants.length - 8 }}</text>
            </view>
          </view>
        </view>
      </template>

      <!-- 功能菜单 -->
      <view class="menu-group">
        <view class="menu-item" @click="togglePin">
          <view class="menu-icon-wrap pin-icon">
            <wd-icon name="pin" size="36rpx" color="#FF9800" />
          </view>
          <text class="menu-label">{{ isPinned ? '取消置顶' : '置顶聊天' }}</text>
          <view v-if="isPinned" class="status-indicator on">
            <text class="indicator-text">已开启</text>
          </view>
        </view>

        <view class="menu-item" @click="toggleMute">
          <view class="menu-icon-wrap mute-icon">
            <wd-icon :name="isMuted ? 'notification-filled' : 'notification'" size="36rpx" color="#1976D2" />
          </view>
          <text class="menu-label">{{ isMuted ? '关闭免打扰' : '消息免打扰' }}</text>
          <view v-if="isMuted" class="status-indicator on">
            <text class="indicator-text">已开启</text>
          </view>
        </view>
      </view>

      <view class="menu-group danger-group">
        <view class="menu-item danger" @click="clearMessages">
          <view class="menu-icon-wrap clear-icon">
            <wd-icon name="delete" size="36rpx" color="#F44336" />
          </view>
          <text class="menu-label">清空聊天记录</text>
        </view>

        <view v-if="conversationType !== 'private'" class="menu-item danger" @click="leaveOrDissolveGroup">
          <view class="menu-icon-wrap leave-icon">
            <wd-icon :name="isOwner ? 'warning' : 'logout'" size="36rpx" color="#F44336" />
          </view>
          <text class="menu-label">{{ isOwner ? '解散群聊' : '退出群聊' }}</text>
        </view>
      </view>
    </scroll-view>

    <!-- 加载状态 -->
    <view v-else class="loading-container">
      <view class="loading-spinner" />
      <text class="loading-text">加载中...</text>
    </view>

    <!-- 成员列表弹窗 -->
    <view v-if="showMemberList" class="popup-mask" @click="showMemberList = false">
      <view class="popup-content member-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">群成员 ({{ participants.length }})</text>
          <text class="close-btn" @click="showMemberList = false">×</text>
        </view>

        <scroll-view scroll-y class="popup-body">
          <view class="member-grid">
            <view
              v-for="(participant, index) in participants"
              :key="index"
              class="member-item"
            >
              <view class="member-avatar">
                <text class="avatar-char">{{ participant.name?.charAt(0) || '?' }}</text>
              </view>
              <text class="member-name">{{ participant.name || '未知' }}</text>
              <text v-if="participant.role === 'owner'" class="role-tag owner">群主</text>
              <text v-else-if="participant.role === 'admin'" class="role-tag admin">管理员</text>
            </view>
          </view>
        </scroll-view>

        <view v-if="canManageMembers && conversationType !== 'private'" class="popup-footer">
          <button class="btn add-member-btn" @click="showMemberList = false; openAddMemberPopup()">
            <text class="btn-icon">+</text>
            <text>添加成员</text>
          </button>
        </view>
      </view>
    </view>

    <!-- 添加成员弹窗 -->
    <view v-if="showAddMemberPopup" class="popup-mask" @click="showAddMemberPopup = false">
      <view class="popup-content add-popup" @click.stop>
        <view class="popup-header">
          <text class="popup-title">添加成员</text>
          <text class="close-btn" @click="showAddMemberPopup = false">×</text>
        </view>

        <view class="search-section">
          <view class="search-box">
            <wd-icon name="search" size="28rpx" color="#999" />
            <input
              v-model="searchKeyword"
              class="search-input"
              :placeholder="activeTab === 'device' ? '搜索设备ID、名称或班级' : '搜索用户姓名、学号或班级名称'"
              confirm-type="search"
              @confirm="handleSearch"
              @input="onSearchInput"
            >
          </view>

          <view class="tab-bar">
            <view
              class="tab-item"
              :class="{ active: activeTab === 'user' }"
              @click="switchTab('user')"
            >
              <text>用户</text>
            </view>
            <view
              class="tab-item"
              :class="{ active: activeTab === 'class' }"
              @click="switchTab('class')"
            >
              <text>班级</text>
            </view>
            <view
              class="tab-item"
              :class="{ active: activeTab === 'device' }"
              @click="switchTab('device')"
            >
              <text>设备</text>
            </view>
          </view>
        </view>

        <scroll-view scroll-y class="popup-body">
          <view v-if="searching || (activeTab === 'device' && devicesLoading)" class="searching-hint">
            <text>加载中...</text>
          </view>

          <view v-else-if="searchResults.length === 0 && searchKeyword && activeTab !== 'device'" class="empty-search">
            <text>未找到相关结果</text>
          </view>

          <view v-else-if="searchResults.length === 0 && !searchKeyword && activeTab !== 'device'" class="empty-search">
            <text>请输入关键词搜索</text>
          </view>

          <view v-else-if="searchResults.length === 0 && activeTab === 'device'" class="empty-search">
            <text>暂无可用设备</text>
          </view>

          <view v-else class="result-list">
            <view
              v-for="(item, index) in searchResults"
              :key="activeTab === 'device' ? (item as any).device_id || index : index"
              class="result-item"
              :class="{
                selected: activeTab === 'user' ? isUserSelected((item as SearchResultUser).id)
                  : activeTab === 'class' ? isClassSelected((item as SearchResultClass).id)
                    : isDeviceSelected((item as any).device_id),
              }"
              @click="activeTab === 'user' ? toggleUserSelection((item as SearchResultUser).id)
                : activeTab === 'class' ? toggleClassSelection((item as SearchResultClass).id)
                  : toggleDeviceSelection((item as any).device_id)"
            >
              <view class="checkbox">
                <text
                  v-if="activeTab === 'user' ? isUserSelected((item as SearchResultUser).id)
                    : activeTab === 'class' ? isClassSelected((item as SearchResultClass).id)
                      : isDeviceSelected((item as any).device_id)" class="check-icon"
                >
                  ✓
                </text>
              </view>

              <view class="result-info">
                <template v-if="activeTab === 'user'">
                  <text class="result-name">{{ (item as SearchResultUser).username }}</text>
                  <text class="result-desc">
                    {{ (item as SearchResultUser).user_code || '' }}
                    <text v-if="(item as SearchResultUser).class_name"> · {{ (item as SearchResultUser).class_name }}</text>
                  </text>
                </template>
                <template v-else-if="activeTab === 'class'">
                  <text class="result-name">{{ (item as SearchResultClass).name }}</text>
                  <text class="result-desc">
                    {{ (item as SearchResultClass).grade }} · {{ (item as SearchResultClass).student_count }}人
                    <text v-if="(item as SearchResultClass).head_teacher_name"> · 班主任: {{ (item as SearchResultClass).head_teacher_name }}</text>
                  </text>
                </template>
                <template v-else>
                  <text class="result-name">{{ (item as any).device_name || (item as any).device_id || '未知设备' }}</text>
                  <text class="result-desc">
                    ID: {{ (item as any)?.device_id || 'N/A' }}
                    <text v-if="(item as any).class_name"> · {{ (item as any).class_name }}</text>
                  </text>
                </template>
              </view>
            </view>
          </view>
        </scroll-view>

        <view class="add-footer">
          <view class="selected-info">
            <text class="selected-text">已选 {{ totalSelected }} 项</text>
          </view>
          <button
            class="btn confirm-add-btn"
            :class="{ disabled: totalSelected === 0 }"
            @click="handleAddMembers"
          >
            确定添加
          </button>
        </view>
      </view>
    </view>
  </view>
</template>

<style lang="scss" scoped>
.chat-info {
  min-height: 100vh;
  background: #ededed;
  display: flex;
  flex-direction: column;
}

.custom-nav {
  background: #ededed;
  border-bottom: 1rpx solid #d9d9d9;
  padding-top: var(--status-bar-height);

  .nav-content {
    display: flex;
    align-items: center;
    justify-content: space-between;
    height: 88rpx;
    padding: 0 24rpx;
  }

  .nav-left {
    width: 80rpx;

    .back-btn {
      font-size: 48rpx;
      color: #191919;
      line-height: 1;
    }
  }

  .nav-center {
    flex: 1;
    display: flex;
    align-items: center;
    justify-content: center;

    .nav-title {
      font-size: 34rpx;
      font-weight: bold;
      color: #191919;
    }
  }

  .nav-right {
    width: 80rpx;
  }
}

.info-scroll {
  flex: 1;
  padding: 20rpx;
}

.info-card {
  background: #fff;
  border-radius: 16rpx;
  padding: 32rpx;
  margin-bottom: 20rpx;

  &.user-info-card,
  &.group-info-card {
    cursor: pointer;

    &:active {
      opacity: 0.9;
    }
  }
}

.user-avatar-section,
.group-header {
  display: flex;
  align-items: center;
  gap: 24rpx;
}

.avatar-large {
  width: 120rpx;
  height: 120rpx;
  border-radius: 24rpx;
  background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;

  &.group-avatar {
    background: linear-gradient(135deg, #ff9800 0%, #f57c00 100%);
  }

  .avatar-char {
    color: #fff;
    font-size: 48rpx;
    font-weight: bold;
  }
}

.user-name,
.group-name {
  flex: 1;
  display: flex;
  flex-direction: column;
  gap: 8rpx;

  .name-text {
    font-size: 34rpx;
    font-weight: bold;
    color: #191919;
  }

  .member-count {
    font-size: 26rpx;
    color: #999;
  }
}

.user-desc {
  font-size: 26rpx;
  color: #999;
}

.arrow {
  font-size: 40rpx;
  color: #ccc;
}

.member-preview {
  display: flex;
  gap: 16rpx;
  margin-top: 24rpx;
  padding-top: 24rpx;
  border-top: 1rpx solid #f5f5f5;

  .preview-avatar {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
    display: flex;
    align-items: center;
    justify-content: center;

    .avatar-char-small {
      color: #fff;
      font-size: 28rpx;
      font-weight: 500;
    }
  }

  .more-members {
    width: 80rpx;
    height: 80rpx;
    border-radius: 50%;
    background: #f5f5f5;
    display: flex;
    align-items: center;
    justify-content: center;

    text {
      font-size: 24rpx;
      color: #666;
    }
  }
}

.menu-group {
  background: #fff;
  border-radius: 16rpx;
  overflow: hidden;
  margin-bottom: 20rpx;

  &.danger-group {
    .menu-item.danger {
      .menu-label {
        color: #f44336;
      }
    }
  }
}

.menu-item {
  display: flex;
  align-items: center;
  padding: 28rpx 32rpx;
  border-bottom: 1rpx solid #f5f5f5;

  &:last-child {
    border-bottom: none;
  }

  &:active {
    background: #f9f9f9;
  }

  .menu-icon-wrap {
    width: 72rpx;
    height: 72rpx;
    border-radius: 16rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    margin-right: 24rpx;

    &.pin-icon {
      background: #fff3e0;
    }

    &.mute-icon {
      background: #e3f2fd;
    }

    &.clear-icon {
      background: #ffebee;
    }

    &.leave-icon {
      background: #fff3e0;
    }

    .menu-icon {
      font-size: 36rpx;
    }

    .menu-icon-text {
      font-size: 32rpx;
      font-weight: bold;
      color: #ff9800;

      &.danger-text {
        color: #f44336;
      }
    }
  }

  .menu-label {
    flex: 1;
    font-size: 30rpx;
    color: #191919;
  }

  .status-indicator {
    padding: 6rpx 16rpx;
    border-radius: 8rpx;
    background: #f5f5f5;

    &.on {
      background: #e8f5e9;

      .indicator-text {
        color: #4caf50;
        font-size: 24rpx;
      }
    }

    .indicator-text {
      font-size: 24rpx;
      color: #999;
    }
  }
}

.loading-container {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 200rpx;

  .loading-spinner {
    width: 60rpx;
    height: 60rpx;
    border: 4rpx solid #e0e0e0;
    border-top-color: #07c160;
    border-radius: 50%;
    animation: spin 0.8s linear infinite;
  }

  .loading-text {
    margin-top: 20rpx;
    font-size: 28rpx;
    color: #999;
  }
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

.popup-mask {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 1000;
}

.popup-content {
  width: 600rpx;
  max-height: 80vh;
  background: #fff;
  border-radius: 24rpx;
  overflow: hidden;
}

.popup-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 30rpx;
  border-bottom: 1rpx solid #eee;

  .popup-title {
    font-size: 32rpx;
    font-weight: bold;
  }

  .close-btn {
    font-size: 48rpx;
    color: #999;
    line-height: 1;
  }
}

.popup-body {
  padding: 20rpx 30rpx;
  max-height: 50vh;
  overflow-y: auto;
}

.popup-footer {
  border-top: 1rpx solid #eee;
  padding: 20rpx 30rpx;

  .btn {
    width: 100%;
    height: 88rpx;
    display: flex;
    align-items: center;
    justify-content: center;
    gap: 12rpx;
    background: #07c160;
    color: #fff;
    border-radius: 16rpx;
    font-size: 30rpx;
    border: none;

    .btn-icon {
      font-size: 36rpx;
    }
  }
}

.member-popup {
  .member-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 24rpx;
    padding: 10rpx 0;
  }

  .member-item {
    width: 120rpx;
    display: flex;
    flex-direction: column;
    align-items: center;

    .member-avatar {
      width: 96rpx;
      height: 96rpx;
      border-radius: 50%;
      background: linear-gradient(135deg, #1976d2 0%, #1565c0 100%);
      display: flex;
      align-items: center;
      justify-content: center;

      .avatar-char {
        color: #fff;
        font-size: 36rpx;
        font-weight: bold;
      }
    }

    .member-name {
      font-size: 22rpx;
      color: #333;
      text-align: center;
      margin-top: 8rpx;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
      width: 100%;
    }

    .role-tag {
      font-size: 18rpx;
      padding: 2rpx 6rpx;
      border-radius: 4rpx;
      margin-top: 4rpx;

      &.owner {
        background: #fff3e0;
        color: #ff9800;
      }

      &.admin {
        background: #e3f2fd;
        color: #1976d2;
      }
    }
  }
}

.add-popup {
  .search-section {
    padding: 0 30rpx 20rpx;
    border-bottom: 1rpx solid #eee;
    flex-shrink: 0;
  }

  .search-box {
    display: flex;
    align-items: center;
    background: #f5f5f5;
    border-radius: 40rpx;
    padding: 16rpx 24rpx;
    margin-bottom: 20rpx;

    .search-icon {
      font-size: 28rpx;
      margin-right: 12rpx;
    }

    .search-icon-text {
      font-size: 26rpx;
      color: #999;
      margin-right: 12rpx;
      font-weight: 500;
    }

    .search-input {
      flex: 1;
      font-size: 28rpx;
      color: #333;
    }
  }

  .tab-bar {
    display: flex;
    gap: 12rpx;

    .tab-item {
      flex: 1;
      height: 72rpx;
      display: flex;
      align-items: center;
      justify-content: center;
      background: #f5f5f5;
      border-radius: 16rpx;
      font-size: 26rpx;
      color: #666;
      border: 2rpx solid transparent;

      &.active {
        background: #e3f2fd;
        color: #07c160;
        border-color: #07c160;
      }
    }
  }

  .searching-hint,
  .empty-search {
    display: flex;
    align-items: center;
    justify-content: center;
    padding: 80rpx 0;
    color: #999;
    font-size: 28rpx;
  }

  .result-list {
    .result-item {
      display: flex;
      align-items: center;
      padding: 24rpx;
      background: #f5f5f5;
      border-radius: 16rpx;
      margin-bottom: 16rpx;

      &.selected {
        background: #e3f2fd;
      }

      .checkbox {
        width: 44rpx;
        height: 44rpx;
        border: 2rpx solid #ddd;
        border-radius: 10rpx;
        display: flex;
        align-items: center;
        justify-content: center;
        margin-right: 20rpx;
        flex-shrink: 0;

        .check-icon {
          color: #07c160;
          font-size: 28rpx;
          font-weight: bold;
        }
      }

      .result-info {
        flex: 1;

        .result-name {
          font-size: 30rpx;
          color: #333;
          font-weight: 500;
          display: block;
        }

        .result-desc {
          font-size: 24rpx;
          color: #999;
          display: block;
          margin-top: 6rpx;
        }
      }
    }
  }

  .add-footer {
    display: flex;
    align-items: center;
    gap: 20rpx;
    padding: 20rpx 30rpx;
    border-top: 1rpx solid #eee;
    flex-shrink: 0;

    .selected-info {
      flex: 1;

      .selected-text {
        font-size: 26rpx;
        color: #666;
      }
    }

    .confirm-add-btn {
      width: auto;
      min-width: 200rpx;
      padding: 0 32rpx;
      height: 76rpx;
      line-height: 76rpx;
      background: #07c160;
      color: #fff;
      border-radius: 38rpx;
      font-size: 28rpx;
      border: none;

      &.disabled {
        background: #e0e0e0;
      }
    }
  }
}
</style>
