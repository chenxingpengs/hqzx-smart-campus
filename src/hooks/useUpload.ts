import { ref } from 'vue'
import { getEnvBaseUrl } from '@/utils/index'

type TfileType = 'image' | 'file'
type TImage = 'png' | 'jpg' | 'jpeg' | 'webp' | '*'
type TFile = 'doc' | 'docx' | 'ppt' | 'zip' | 'xls' | 'xlsx' | 'txt' | TImage

interface UploadSuccessResult {
  url: string
  name?: string
  size?: number
  [key: string]: unknown
}

interface TOptions<T extends TfileType> {
  formData?: Record<string, unknown>
  maxSize?: number
  accept?: T extends 'image' ? TImage[] : TFile[]
  fileType?: T
  success?: (params: UploadSuccessResult) => void
  error?: (err: Error) => void
}

export default function useUpload<T extends TfileType>(options: TOptions<T> = {} as TOptions<T>) {
  const {
    formData = {},
    maxSize = 5 * 1024 * 1024,
    accept = ['*'],
    fileType = 'image',
    success,
    error: onError,
  } = options

  const loading = ref(false)
  const error = ref<Error | null>(null)
  const data = ref<UploadSuccessResult | null>(null)

  const handleFileChoose = ({ tempFilePath, size }: { tempFilePath: string, size: number }) => {
    if (size > maxSize) {
      uni.showToast({
        title: `文件大小不能超过 ${maxSize / 1024 / 1024}MB`,
        icon: 'none',
      })
      return
    }

    // const fileExtension = file?.tempFiles?.name?.split('.').pop()?.toLowerCase()
    // const isTypeValid = accept.some((type) => type === '*' || type.toLowerCase() === fileExtension)

    // if (!isTypeValid) {
    //   uni.showToast({
    //     title: `仅支持 ${accept.join(', ')} 格式的文件`,
    //     icon: 'none',
    //   })
    //   return
    // }

    loading.value = true
    uploadFile({
      tempFilePath,
      formData,
      onSuccess: (res) => {
        // 修改这里的解析逻辑，适应不同平台的返回格式
        let parsedData = res
        try {
          // 尝试解析为JSON
          const jsonData = JSON.parse(res)
          // 检查是否包含data字段
          parsedData = jsonData.data || jsonData
        }
        catch (e) {
          // 如果解析失败，使用原始数据
          console.log('Response is not JSON, using raw data:', res)
        }
        data.value = parsedData
        // console.log('上传成功', res)
        success?.(parsedData)
      },
      onError: (err) => {
        error.value = err
        onError?.(err)
      },
      onComplete: () => {
        loading.value = false
      },
    })
  }

  const run = () => {
    const chooseFileOptions = {
      count: 1,
      success: (res: ChooseFileSuccessResult) => {
        console.log('File selected successfully:', res)
        let tempFilePath = ''
        let size = 0
        // #ifdef MP-WEIXIN
        const mediaRes = res as ChooseMediaSuccessResult
        tempFilePath = mediaRes.tempFiles[0].tempFilePath
        size = mediaRes.tempFiles[0].size
        // #endif
        // #ifndef MP-WEIXIN
        const imageRes = res as ChooseImageSuccessResult
        tempFilePath = imageRes.tempFilePaths[0]
        size = imageRes.tempFiles[0].size
        // #endif
        handleFileChoose({ tempFilePath, size })
      },
      fail: (err: { errMsg: string }) => {
        console.error('File selection failed:', err)
        error.value = new Error(err.errMsg)
        onError?.(new Error(err.errMsg))
      },
    }

    if (fileType === 'image') {
      // #ifdef MP-WEIXIN
      uni.chooseMedia({
        ...chooseFileOptions,
        mediaType: ['image'],
      })
      // #endif

      // #ifndef MP-WEIXIN
      uni.chooseImage(chooseFileOptions)
      // #endif
    }
    else {
      uni.chooseFile({
        ...chooseFileOptions,
        type: 'all',
      })
    }
  }

  return { loading, error, data, run }
}

interface ChooseImageSuccessResult {
  errMsg: string
  tempFilePaths: string[]
  tempFiles: Array<{ path?: string, tempFilePath?: string, size: number, fileType?: string }>
}

interface ChooseMediaSuccessResult {
  errMsg: string
  tempFiles: Array<{ tempFilePath: string, size: number, fileType?: string }>
}

type ChooseFileSuccessResult = ChooseImageSuccessResult | ChooseMediaSuccessResult

async function uploadFile({
  tempFilePath,
  formData,
  onSuccess,
  onError,
  onComplete,
}: {
  tempFilePath: string
  formData: Record<string, unknown>
  onSuccess: (data: string) => void
  onError: (err: Error) => void
  onComplete: () => void
}) {
  uni.uploadFile({
    url: `${getEnvBaseUrl()}/upload`,
    filePath: tempFilePath,
    name: 'file',
    formData,
    success: (uploadFileRes) => {
      try {
        const data = uploadFileRes.data
        onSuccess(data)
      }
      catch (err) {
        onError(err as Error)
      }
    },
    fail: (err) => {
      console.error('Upload failed:', err)
      onError(new Error(err.errMsg))
    },
    complete: onComplete,
  })
}
