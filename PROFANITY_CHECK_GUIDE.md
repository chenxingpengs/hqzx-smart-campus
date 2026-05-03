# 违禁词检测功能使用指南

## 功能概述

为微信小程序添加了前端违禁词检查功能，通过调用第三方API快速检测文本中的敏感词。

## 已创建的文件

### 1. 类型定义
- [profanity.ts](src/api/types/profanity.ts) - 违禁词检测相关的TypeScript类型定义

### 2. API接口
- [profanity.ts](src/api/profanity.ts) - 封装了违禁词检测的HTTP请求

### 3. 工具函数
- [profanity.ts](src/utils/profanity.ts) - 提供了组合式函数和工具方法

### 4. 组件
- [ProfanityCheckInput.vue](src/components/ProfanityCheckInput/ProfanityCheckInput.vue) - 带违禁词检测功能的输入框组件

## 使用方式

### 方式一：使用组合式函数（推荐用于Vue组件）

```vue
<script setup lang="ts">
import { useProfanityCheck } from '@/utils/profanity'

const { result, loading, error, checkText, reset } = useProfanityCheck()

async function handleSubmit() {
  const text = '需要检测的文本内容'
  
  try {
    const checkResult = await checkText(text)
    
    if (checkResult.isForbidden) {
      console.log('发现违禁词:', checkResult.forbiddenWords)
      uni.showToast({
        title: `包含违禁词: ${checkResult.forbiddenWords.join(', ')}`,
        icon: 'none',
      })
      return
    }
    
    // 文本安全，继续提交
    console.log('文本安全，可以提交')
  } catch (err) {
    console.error('检测失败:', err)
  }
}
</script>
```

### 方式二：使用快速检测函数（适用于非响应式场景）

```typescript
import { quickProfanityCheck } from '@/utils/profanity'

async function validateContent(text: string): Promise<boolean> {
  try {
    const result = await quickProfanityCheck(text)
    
    if (result.isForbidden) {
      uni.showToast({
        title: `包含违禁词: ${result.forbiddenWords.join(', ')}`,
        icon: 'none',
        duration: 3000,
      })
      return false
    }
    
    return true
  } catch (error) {
    console.error('检测失败:', error)
    return false
  }
}
```

### 方式三：使用表单验证器（适用于uni-app表单验证）

```typescript
import { profanityValidator } from '@/utils/profanity'

const rules = {
  content: [
    { required: true, message: '请输入内容' },
    { validator: profanityValidator }
  ]
}
```

### 方式四：使用封装好的组件

```vue
<template>
  <ProfanityCheckInput
    v-model="content"
    placeholder="请输入内容"
    :max-length="500"
    :auto-check="true"
    @check-result="handleCheckResult"
    @forbidden="handleForbidden"
    @safe="handleSafe"
  />
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { ProfanityCheckInput } from '@/components/ProfanityCheckInput'

const content = ref('')

function handleCheckResult(result: any) {
  console.log('检测结果:', result)
}

function handleForbidden(words: string[]) {
  console.log('发现违禁词:', words)
}

function handleSafe() {
  console.log('内容安全')
}
</script>
```

## API响应说明

### 成功响应
```json
{
  "status": "forbidden",
  "original_text": "原始文本",
  "masked_text": "屏蔽后文本",
  "forbidden_words": ["违禁词1", "违禁词2"]
}
```

### 字段说明
- `status`: 检测状态 (`forbidden` - 包含违禁词 / `safe` - 安全)
- `original_text`: 原始输入文本
- `masked_text`: 屏蔽后的文本（违禁词被替换为*）
- `forbidden_words`: 命中的违禁词列表

## 实际应用场景

### 1. 评论发布前检测
```typescript
async function publishComment() {
  const result = await quickProfanityCheck(commentText.value)
  
  if (result.isForbidden) {
    uni.showToast({
      title: '评论包含不合适的内容',
      icon: 'none',
    })
    return
  }
  
  // 提交评论...
}
```

### 2. 聊天消息发送前检测
```typescript
async function sendMessage() {
  const result = await quickProfanityCheck(messageText.value)
  
  if (result.isForbidden) {
    uni.showToast({
      title: '消息包含敏感词汇',
      icon: 'none',
    })
    return
  }
  
  // 发送消息...
}
```

### 3. 用户昵称/签名修改时检测
```typescript
async function updateProfile() {
  const nicknameResult = await quickProfanityCheck(nickname.value)
  if (nicknameResult.isForbidden) {
    uni.showToast({ title: '昵称包含不当内容', icon: 'none' })
    return
  }
  
  const bioResult = await quickProfanityCheck(bio.value)
  if (bioResult.isForbidden) {
    uni.showToast({ title: '个人简介包含不当内容', icon: 'none' })
    return
  }
  
  // 更新用户信息...
}
```

## 注意事项

1. **网络依赖**: 该功能需要网络请求，请在有网络的场景下使用
2. **性能考虑**: 避免频繁调用，建议使用防抖（debounce）或节流（throttle）
3. **错误处理**: 务必处理网络错误和API异常情况
4. **用户体验**: 检测过程中应显示加载状态，避免用户重复操作
5. **隐私保护**: API会发送文本到外部服务，请注意隐私合规性

## 配置选项

### ProfanityCheckInput 组件属性

| 属性 | 类型 | 默认值 | 说明 |
|------|------|--------|------|
| modelValue | string | '' | v-model绑定的值 |
| placeholder | string | '请输入内容' | 输入框占位符 |
| maxLength | number | 500 | 最大字符数 |
| autoHeight | boolean | true | 是否自动增高 |
| autoCheck | boolean | false | 是否自动检测（输入时） |
| checkDebounce | number | 1000 | 自动检测防抖时间(ms) |

### ProfanityCheckInput 组件事件

| 事件名 | 参数 | 说明 |
|--------|------|------|
| checkResult | result | 检测结果回调 |
| forbidden | words[] | 发现违禁词时触发 |
| safe | 内容安全时触发 |

## 扩展建议

1. **本地缓存**: 可以将常用检测结果缓存，减少重复请求
2. **批量检测**: 支持批量检测多个文本字段
3. **自定义规则**: 结合业务需求，添加额外的过滤规则
4. **日志记录**: 记录违规尝试，用于后续分析
