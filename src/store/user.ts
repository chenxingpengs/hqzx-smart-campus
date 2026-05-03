import type { IUserInfoRes } from '@/api/types/login'
import { defineStore } from 'pinia'
import { computed, ref } from 'vue'
import {
  appUserInfoUsingGet,
} from '@/service/login'

const userInfoState: IUserInfoRes = {
  userId: -1,
  username: '',
  nickname: '',
  role: '',
  avatar: '/static/images/default-avatar.png',
}

export const useUserStore = defineStore(
  'user',
  () => {
    const userInfo = ref<IUserInfoRes>({ ...userInfoState })

    const isAdmin = computed(() => {
      const role = userInfo.value.role
      const permission = userInfo.value.permission
      return role === 'admin' || (role === 'teacher' && permission === 1)
    })

    const isTeacher = computed(() => {
      const role = userInfo.value.role
      return role === 'teacher' || role === 'admin'
    })

    const isStudent = computed(() => {
      return userInfo.value.role === 'student'
    })

    const roleCode = computed(() => {
      const role = userInfo.value.role
      const permission = userInfo.value.permission
      if (role === 'admin' || (role === 'teacher' && permission === 1)) {
        return 'R_ADMIN'
      }
      else if (role === 'teacher') {
        return 'R_TEACHER'
      }
      else {
        return 'R_STUDENT'
      }
    })

    const setUserInfo = (val: IUserInfoRes) => {
      console.log('设置用户信息', val)
      if (!val.avatar) {
        val.avatar = userInfoState.avatar
      }
      userInfo.value = val
    }

    const setUserAvatar = (avatar: string) => {
      userInfo.value.avatar = avatar
      console.log('设置用户头像', avatar)
      console.log('userInfo', userInfo.value)
    }

    const clearUserInfo = () => {
      userInfo.value = { ...userInfoState }
      uni.removeStorageSync('user')
    }

    const fetchUserInfo = async () => {
      const res = await appUserInfoUsingGet({})
      setUserInfo(res as IUserInfoRes)
      return res
    }

    return {
      userInfo,
      isAdmin,
      isTeacher,
      isStudent,
      roleCode,
      clearUserInfo,
      fetchUserInfo,
      setUserInfo,
      setUserAvatar,
    }
  },
  {
    persist: true,
  },
)
