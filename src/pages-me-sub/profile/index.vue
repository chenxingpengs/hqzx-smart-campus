<script lang="ts" setup>
import type { UserProfileData } from '@/service/types'
import { onShow } from '@dcloudio/uni-app'
import { storeToRefs } from 'pinia'
import { computed, ref, watch } from 'vue'
import { httpUpload } from '@/http/http'
import { appUserProfileUsingGet, appUserProfileUsingPut } from '@/service/login'
import { useUserStore } from '@/store'
import { useTokenStore } from '@/store/token'
import { getStaticUrl } from '@/utils'
import { deleteCachedAvatar, getCachedAvatar } from '@/utils/avatarCache'

definePage({
  style: {
    navigationBarTitleText: '个人资料',
    backgroundColor: '#F5F7FA',
    backgroundTextStyle: 'dark',
  },
})

const userStore = useUserStore()
const tokenStore = useTokenStore()
const { userInfo } = storeToRefs(userStore)

const loading = ref(false)
const saving = ref(false)
const profileData = ref<UserProfileData | null>(null)

const cachedAvatarUrl = ref('')

async function loadCachedAvatar() {
  const avatarUrl = getStaticUrl(profileData.value?.avatar) || getStaticUrl(userInfo.value.avatar)
  if (avatarUrl) {
    cachedAvatarUrl.value = await getCachedAvatar(avatarUrl)
  }
  else {
    cachedAvatarUrl.value = ''
  }
}

watch([() => profileData.value?.avatar, () => userInfo.value.avatar], () => {
  loadCachedAvatar()
})

const editNickname = ref('')
const editPhone = ref('')
const editGender = ref(0)
const isEditing = ref(false)

const genderOptions = [
  { value: 0, label: '未设置' },
  { value: 1, label: '男' },
  { value: 2, label: '女' },
]

const genderText = computed(() => {
  const option = genderOptions.find(o => o.value === profileData.value?.gender)
  return option?.label || '未设置'
})

const roleText = computed(() => {
  const role = profileData.value?.role || userInfo.value.role
  if (role === 'admin')
    return '管理员'
  if (role === 'teacher')
    return '教师'
  return '用户'
})

const roleClass = computed(() => {
  const role = profileData.value?.role || userInfo.value.role
  if (role === 'admin')
    return 'bg-red-500'
  if (role === 'teacher')
    return 'bg-blue-500'
  return 'bg-gray-500'
})

async function fetchProfile() {
  if (!tokenStore.hasValidLogin)
    return
  loading.value = true
  try {
    const res = await appUserProfileUsingGet({})
    console.log('【获取用户资料】返回数据:', res)
    if (res) {
      profileData.value = res
      editNickname.value = res.nickname || ''
      editPhone.value = res.phone || ''
      editGender.value = res.gender ?? 0
      await loadCachedAvatar()
    }
  }
  catch (e) {
    console.error('获取用户资料失败:', e)
    uni.showToast({ title: '获取资料失败', icon: 'none' })
  }
  finally {
    loading.value = false
  }
}

function startEdit() {
  isEditing.value = true
  editNickname.value = profileData.value?.nickname || ''
  editPhone.value = profileData.value?.phone || ''
  editGender.value = profileData.value?.gender ?? 0
}

function cancelEdit() {
  isEditing.value = false
}

async function saveProfile() {
  saving.value = true
  try {
    const requestData = {
      nickname: editNickname.value,
      phone: editPhone.value,
      gender: editGender.value,
    }
    console.log('【保存用户资料】请求数据:', requestData)

    await appUserProfileUsingPut({
      body: requestData,
    })
    uni.showToast({ title: '保存成功', icon: 'success' })
    isEditing.value = false
    await fetchProfile()
    await userStore.fetchUserInfo()
  }
  catch (e) {
    console.error('保存用户资料失败:', e)
    uni.showToast({ title: '保存失败', icon: 'none' })
  }
  finally {
    saving.value = false
  }
}

const MAX_AVATAR_SIZE = 10 * 1024 * 1024

async function onChooseAvatar(e: any) {
  const avatarUrl = e.detail.avatarUrl
  if (!avatarUrl) {
    uni.showToast({ title: '获取头像失败', icon: 'none' })
    return
  }

  saving.value = true
  try {
    const fileInfo = await getFileInfo(avatarUrl)

    if (fileInfo.size > MAX_AVATAR_SIZE) {
      saving.value = false
      uni.showModal({
        title: '提示',
        content: '对不起，因服务器性能限制不支持上传10MB以上文件，详情请联系管理员',
        showCancel: false,
        confirmText: '我知道了',
      })
      return
    }
    else if (fileInfo.size > 500 * 1024) {
      const compressedPath = await compressImage(avatarUrl)
      await uploadAvatar(compressedPath)
    }
    else {
      await uploadAvatar(avatarUrl)
    }
  }
  catch (error) {
    console.error('处理头像失败:', error)
    uni.showToast({ title: '处理头像失败', icon: 'none' })
    saving.value = false
  }
}

function handleChooseAvatar() {
  // #ifdef MP-WEIXIN
  uni.showToast({ title: '请点击头像区域选择', icon: 'none' })
  // #endif
  // #ifndef MP-WEIXIN
  uni.chooseMedia({
    count: 1,
    mediaType: ['image'],
    sourceType: ['album', 'camera'],
    sizeType: ['compressed'],
    success: (res) => {
      const tempFilePath = res.tempFiles[0].tempFilePath
      const tempFileSize = res.tempFiles[0].size

      if (tempFileSize > MAX_AVATAR_SIZE) {
        uni.showModal({
          title: '提示',
          content: '对不起，因服务器性能限制不支持上传10MB以上文件，详情请联系管理员',
          showCancel: false,
          confirmText: '我知道了',
        })
        return
      }

      compressAndUploadAvatar(tempFilePath)
    },
    fail: (err) => {
      console.error('选择图片失败:', err)
      uni.showToast({ title: '选择图片失败', icon: 'none' })
    },
  })
  // #endif
}

async function compressAndUploadAvatar(filePath) {
  saving.value = true
  try {
    const fileInfo = await getFileInfo(filePath)

    if (fileInfo.size > MAX_AVATAR_SIZE) {
      saving.value = false
      uni.showModal({
        title: '提示',
        content: '对不起，因服务器性能限制不支持上传10MB以上文件，详情请联系管理员',
        showCancel: false,
        confirmText: '我知道了',
      })
      return
    }

    if (fileInfo.size > 500 * 1024) {
      const compressedPath = await compressImage(filePath)
      await uploadAvatar(compressedPath)
    }
    else {
      await uploadAvatar(filePath)
    }
  }
  catch (error) {
    console.error('处理图片失败:', error)
    uni.showToast({ title: '处理图片失败', icon: 'none' })
    saving.value = false
  }
}

function getFileInfo(filePath) {
  return new Promise((resolve, reject) => {
    uni.getFileSystemManager().getFileInfo({
      filePath,
      success: (res) => {
        resolve({
          size: res.size,
          type: res.type || '',
        })
      },
      fail: (err) => {
        reject(err)
      },
    })
  })
}

function compressImage(filePath) {
  return new Promise((resolve) => {
    uni.compressImage({
      src: filePath,
      quality: 80,
      success: (res) => {
        resolve(res.tempFilePath)
      },
      fail: () => {
        resolve(filePath)
      },
    })
  })
}

async function uploadAvatar(filePath) {
  saving.value = true
  try {
    const oldAvatarUrl = getStaticUrl(userInfo.value.avatar)
    if (oldAvatarUrl && (oldAvatarUrl.startsWith('http://') || oldAvatarUrl.startsWith('https://'))) {
      await deleteCachedAvatar(oldAvatarUrl)
    }

    await httpUpload<{ avatar: string }>('/app/user/avatar', filePath, 'file')
    uni.showToast({ title: '头像上传成功', icon: 'success' })
    fetchProfile()
    userStore.fetchUserInfo()
  }
  catch (error) {
    console.error('上传头像失败:', error)
    uni.showToast({ title: '上传失败', icon: 'none' })
  }
  finally {
    saving.value = false
  }
}

function handleGenderSelect() {
  uni.showActionSheet({
    itemList: genderOptions.map(o => o.label),
    success: (res) => {
      editGender.value = genderOptions[res.tapIndex].value
    },
  })
}

onShow(() => {
  fetchProfile()
})
</script>

<template>
  <view class="profile-page min-h-screen bg-gray-50">
    <view v-if="loading" class="flex items-center justify-center py-20">
      <wd-icon name="refresh" size="24" color="#3b82f6" class="animate-spin" />
      <text class="ml-2 text-gray-400">加载中...</text>
    </view>

    <template v-else>
      <view class="px-4 pb-4 pt-6">
        <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
          <view class="flex items-center px-5 py-6">
            <button
              class="relative h-20 w-20 border-0 bg-transparent p-0"
              open-type="chooseAvatar"
              :disabled="saving"
              @chooseavatar="onChooseAvatar"
            >
              <image
                class="h-20 w-20 border-4 border-gray-100 rounded-full bg-gray-100"
                :src="cachedAvatarUrl || '/static/images/default-avatar.png'"
                mode="aspectFill"
              />
              <view class="absolute bottom-0 right-0 h-7 w-7 flex items-center justify-center border-2 border-white rounded-full bg-blue-500">
                <wd-icon name="camera" size="12" color="#fff" />
              </view>
            </button>
            <view class="ml-5 flex-1">
              <view class="text-lg text-gray-800 font-bold">
                {{ profileData?.nickname || userInfo.nickname || '未设置昵称' }}
              </view>
              <view class="mt-1 text-sm text-gray-400">
                点击头像更换
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="px-4">
        <view class="overflow-hidden rounded-2xl bg-white shadow-sm">
          <view class="flex items-center border-b border-gray-50 px-5 py-4">
            <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-blue-50">
              <wd-icon name="user" size="20" color="#3b82f6" />
            </view>
            <view class="flex-1">
              <view class="text-xs text-gray-400">
                用户名
              </view>
              <view class="mt-0.5 text-base text-gray-800">
                {{ profileData?.username || userInfo.username || '-' }}
              </view>
            </view>
          </view>

          <view class="flex items-center border-b border-gray-50 px-5 py-4">
            <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-green-50">
              <wd-icon name="edit" size="20" color="#10b981" />
            </view>
            <view class="flex-1">
              <view class="text-xs text-gray-400">
                昵称
              </view>
              <view v-if="!isEditing" class="mt-0.5 text-base text-gray-800">
                {{ profileData?.nickname || '未设置' }}
              </view>
              <input
                v-else
                v-model="editNickname"
                class="mt-0.5 border-b border-blue-300 pb-1 text-base text-gray-800"
                placeholder="请输入昵称"
                maxlength="20"
              >
            </view>
          </view>

          <view class="flex items-center border-b border-gray-50 px-5 py-4" @click="isEditing && handleGenderSelect()">
            <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-purple-50">
              <wd-icon name="usergroup" size="20" color="#8b5cf6" />
            </view>
            <view class="flex-1">
              <view class="text-xs text-gray-400">
                性别
              </view>
              <view v-if="!isEditing" class="mt-0.5 text-base text-gray-800">
                {{ genderText }}
              </view>
              <view v-else class="mt-0.5 text-base text-blue-500">
                {{ genderOptions.find(o => o.value === editGender)?.label }}
                <text class="ml-1 text-xs text-gray-400">点击修改</text>
              </view>
            </view>
            <wd-icon v-if="isEditing" name="arrow-right" size="16" color="#c0c4cc" />
          </view>

          <view class="flex items-center border-b border-gray-50 px-5 py-4">
            <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-orange-50">
              <wd-icon name="phone" size="20" color="#f59e0b" />
            </view>
            <view class="flex-1">
              <view class="text-xs text-gray-400">
                手机号
              </view>
              <view v-if="!isEditing" class="mt-0.5 text-base text-gray-800">
                {{ profileData?.phone || '未绑定' }}
              </view>
              <input
                v-else
                v-model="editPhone"
                class="mt-0.5 border-b border-blue-300 pb-1 text-base text-gray-800"
                placeholder="请输入手机号"
                type="number"
                maxlength="11"
              >
            </view>
          </view>

          <view class="flex items-center border-b border-gray-50 px-5 py-4">
            <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-cyan-50">
              <wd-icon name="shield" size="20" color="#06b6d4" />
            </view>
            <view class="flex-1">
              <view class="text-xs text-gray-400">
                角色
              </view>
              <view class="mt-0.5 flex items-center">
                <view class="rounded-full px-2.5 py-0.5 text-xs text-white font-medium" :class="[roleClass]">
                  {{ roleText }}
                </view>
              </view>
            </view>
          </view>

          <view class="flex items-center px-5 py-4">
            <view class="mr-4 h-10 w-10 flex items-center justify-center rounded-xl bg-emerald-50">
              <wd-icon name="check-circle" size="20" color="#10b981" />
            </view>
            <view class="flex-1">
              <view class="text-xs text-gray-400">
                微信绑定
              </view>
              <view class="mt-0.5 flex items-center">
                <view v-if="profileData?.wechatBinded" class="rounded-full bg-green-500 px-2.5 py-0.5 text-xs text-white font-medium">
                  已绑定
                </view>
                <view v-else class="rounded-full bg-gray-400 px-2.5 py-0.5 text-xs text-white font-medium">
                  未绑定
                </view>
              </view>
            </view>
          </view>
        </view>
      </view>

      <view class="mt-6 px-4">
        <view v-if="!isEditing" class="rounded-2xl from-blue-500 to-blue-600 bg-gradient-to-r py-4 text-center text-white font-medium active:opacity-80" @click="startEdit">
          编辑资料
        </view>
        <view v-else class="flex gap-3">
          <view class="flex-1 rounded-2xl bg-gray-100 py-4 text-center text-gray-600 font-medium active:bg-gray-200" @click="cancelEdit">
            取消
          </view>
          <view class="flex-1 rounded-2xl from-blue-500 to-blue-600 bg-gradient-to-r py-4 text-center text-white font-medium active:opacity-80" @click="saveProfile">
            {{ saving ? '保存中...' : '保存' }}
          </view>
        </view>
      </view>

      <view class="pb-[calc(2rem+env(safe-area-inset-bottom))]" />
    </template>
  </view>
</template>
