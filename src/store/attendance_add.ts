import type {
  AddAttendanceData,
  AddAttendanceRequest,
} from '@/service/types'
import { defineStore } from 'pinia'
import { ref } from 'vue'
import { appAttendanceRecordUsingPost } from '@/service/attendance'

export const useAttendanceAddStore = defineStore('attendanceAdd', () => {
  // 考勤提交返回的业务数据（拦截器已直接返回AddAttendanceData）
  const attendanceAddData = ref<AddAttendanceData | null>(null)
  const loading = ref<boolean>(false)
  const errorMsg = ref<string | null>(null)

  /** 设置考勤数据（直接接收AddAttendanceData） */
  const setAttendanceAddData = (data: AddAttendanceData | null) => {
    attendanceAddData.value = data
    errorMsg.value = null
  }

  /**
   * 提交考勤记录（适配拦截器：接口直接返回AddAttendanceData）
   * @param params 提交参数
   * @returns Promise<AddAttendanceData>
   */
  const submitAttendance = async (params: AddAttendanceRequest): Promise<AddAttendanceData> => {
    try {
      loading.value = true
      errorMsg.value = null

      // 核心修正：拦截器已返回AddAttendanceData，无需再取.data
      const response = await appAttendanceRecordUsingPost({
        body: params,
        options: { timeout: 10000 },
      })

      // 直接赋值（response本身就是AddAttendanceData）
      setAttendanceAddData(response)
      // 直接返回（满足Promise<AddAttendanceData>类型要求）
      return response
    }
    catch (err) {
      const error = err as Error & { data?: { msg?: string } }
      errorMsg.value = error.data?.msg || error.message || '网络异常，请稍后重试'
      throw err
    }
    finally {
      loading.value = false
    }
  }

  /** 重置状态（修正方法名语义） */
  const resetAttendanceAddState = () => {
    attendanceAddData.value = null
    loading.value = false
    errorMsg.value = null
  }

  return {
    attendanceAddData,
    loading,
    errorMsg,
    setAttendanceAddData,
    submitAttendance,
    resetAttendanceAddState, // 修正方法名，与功能匹配
  }
})
