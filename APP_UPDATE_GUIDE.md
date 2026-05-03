# APP热更新使用指南

## 功能概述

本项目已集成基于GitHub Releases的APP热更新功能，支持：

- **wgt热更新**：无需重新安装APP，直接更新前端资源
- **整包更新**：下载完整的APK安装包进行更新
- **自动检测**：APP启动时自动检查更新
- **手动检查**：用户可在设置页面手动检查更新
- **强制更新**：支持配置强制更新，用户必须更新才能继续使用

## 配置说明

### 1. 配置GitHub仓库地址

在 `env/.env` 文件中配置你的GitHub仓库地址：

```env
# APP热更新配置 - GitHub仓库地址 (格式: owner/repo)
VITE_GITHUB_REPO = 'your-github-username/your-repo-name'
```

### 2. 创建GitHub Release

#### 方式一：使用GitHub Actions自动构建（推荐）

1. 创建新的tag并推送：

```bash
git tag v1.0.1
git push origin v1.0.1
```

1. GitHub Actions会自动：
   - 构建H5、微信小程序、Android APP
   - 创建GitHub Release
   - 上传wgt和apk文件

#### 方式二：手动创建Release

1. 构建APP：

```bash
pnpm build:app-android
```

1. 在GitHub仓库页面创建新的Release：
   - 点击 "Releases" -> "Create a new release"
   - 输入tag版本号（如 v1.0.1）
   - 填写更新说明
   - 上传构建产物：
     - `dist/build/app-plus/__UNI__XXXXX.wgt` (wgt文件)
     - `dist/build/app-plus/__UNI__XXXXX.apk` (apk文件)

## 更新说明格式

### 普通更新

```
## 更新内容
- 修复登录页面bug
- 优化首页加载速度
- 新增消息推送功能
```

### 强制更新

在更新说明中添加 `[FORCE]` 标记：

```
## 更新内容
[FORCE]
- 修复严重安全漏洞
- 更新API接口
```

## 使用方法

### 1. 自动检查更新

APP启动时会自动检查更新，如果有新版本会弹出更新提示。

### 2. 手动检查更新

在设置页面点击"检查更新"按钮，或访问更新页面：

```
/pages/settings/update
```

### 3. 在代码中使用

#### 使用组合式函数

```typescript
import { useAppUpdate } from '@/hooks/useAppUpdate'

const {
  hasUpdate,
  updateInfo,
  checking,
  downloading,
  progress,
  error,
  checkUpdate,
  downloadAndInstall,
} = useAppUpdate({
  githubRepo: 'your-github-username/your-repo-name',
  autoCheckOnMount: false,
})

// 检查更新
await checkUpdate()

// 下载并安装更新
await downloadAndInstall()
```

#### 使用更新管理器

```typescript
import { createAppUpdateManager } from '@/utils/update/appUpdate'

const updateManager = createAppUpdateManager('your-github-username/your-repo-name')

// 检查更新
const result = await updateManager.checkUpdate()
if (result.hasUpdate) {
  console.log('发现新版本:', result.updateInfo)
}

// 下载并安装wgt更新
await updateManager.downloadAndInstallWgt(updateInfo.wgtUrl, (progress) => {
  console.log('下载进度:', progress.progress)
})

// 下载并安装APK更新
await updateManager.downloadAndInstallApk(updateInfo.pkgUrl, (progress) => {
  console.log('下载进度:', progress.progress)
})
```

#### 使用更新组件

```vue
<template>
  <AppUpdateDialog
    github-repo="your-github-username/your-repo-name"
    :auto-check="true"
  />
</template>
```

## 更新流程

### wgt热更新流程

1. APP检查GitHub Releases
2. 发现新版本的wgt文件
3. 下载wgt文件到本地
4. 安装wgt文件
5. 重启APP应用更新

### 整包更新流程

1. APP检查GitHub Releases
2. 发现新版本的apk文件
3. 下载apk文件到本地
4. 调用系统安装器安装APK

## 注意事项

1. **版本号规范**：使用语义化版本号（如 v1.0.0）
2. **wgt vs apk**：
   - wgt适用于前端资源更新，体积小，更新快
   - apk适用于原生模块更新或大版本更新
3. **强制更新**：谨慎使用强制更新，确保更新内容确实重要uuu
4. **网络环境**：确保用户能访问GitHub，或考虑使用国内镜像
5. **测试流程**：发布前务必测试更新流程是否正常

## 多端编译

项目已支持多端编译，相关命令：

```bash
# H5
pnpm dev          # 开发模式
pnpm build        # 生产构建

# 微信小程序
pnpm dev:mp       # 开发模式
pnpm build:mp     # 生产构建

# APP
pnpm dev:app      # 开发模式
pnpm build:app    # 生产构建

# 其他平台
pnpm dev:mp-alipay    # 支付宝小程序
pnpm dev:mp-baidu     # 百度小程序
pnpm dev:mp-toutiao   # 字节跳动小程序
```

## 故障排查

### 1. 检查更新失败

- 检查GitHub仓库地址配置是否正确
- 检查网络连接是否正常
- 检查GitHub API是否可访问

### 2. 下载失败

- 检查GitHub Releases中的文件是否正确上传
- 检查文件下载链接是否有效
- 检查存储权限是否授予

### 3. 安装失败

- wgt安装失败：检查wgt文件是否完整
- apk安装失败：检查apk签名是否正确

## 相关文件

- 更新管理器：`src/utils/update/appUpdate.ts`
- 更新类型：`src/utils/update/types.ts`
- 更新Hook：`src/hooks/useAppUpdate.ts`
- 更新组件：`src/components/AppUpdateDialog/AppUpdateDialog.vue`
- 更新页面：`src/pages/settings/update.vue`
- GitHub Actions：`.github/workflows/release.yml`

