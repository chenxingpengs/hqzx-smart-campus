/* eslint-disable style/indent */
import type { PageMetaDatum, SubPackages } from '@uni-helper/vite-plugin-uni-pages'
/** 如果是运行抖音小程序，就不引入 @uni-helper/uni-env，否则运行报错（找不到process) */

import { pages, subPackages } from '@/pages.json'

export type PageInstance = Page.PageInstance<AnyObject, object> & { $page: Page.PageInstance<AnyObject, object> & { fullPath: string } }

export function getLastPage() {
  // getCurrentPages() 至少有1个元素，所以不再额外判断
  // const lastPage = getCurrentPages().at(-1)
  // 上面那个在低版本安卓中打包会报错，所以改用下面这个【虽然我加了 src/interceptions/prototype.ts，但依然报错】
  const pages = getCurrentPages()
  return pages[pages.length - 1] as PageInstance
}

/**
 * 获取当前页面路由的 path 路径和 redirectPath 路径
 * path 如 '/pages/login/login'
 * redirectPath 如 '/pages/demo/base/route-interceptor'
 */
export function currRoute() {
  const lastPage = getLastPage() as PageInstance
  if (!lastPage) {
    return {
      path: '',
      query: {},
    }
  }
  const currRoute = lastPage.$page
  // console.log('lastPage.$page:', currRoute)
  // console.log('lastPage.$page.fullpath:', currRoute.fullPath)
  // console.log('lastPage.$page.options:', currRoute.options)
  // console.log('lastPage.options:', (lastPage as any).options)
  // 经过多端测试，只有 fullPath 靠谱，其他都不靠谱
  const { fullPath } = currRoute
  // console.log(fullPath)
  // eg: /pages/login/login?redirect=%2Fpages%2Fdemo%2Fbase%2Froute-interceptor (小程序)
  // eg: /pages/login/login?redirect=%2Fpages%2Froute-interceptor%2Findex%3Fname%3Dfeige%26age%3D30(h5)
  return parseUrlToObj(fullPath)
}

export function ensureDecodeURIComponent(url: string) {
  if (url.startsWith('%')) {
    return ensureDecodeURIComponent(decodeURIComponent(url))
  }
  return url
}
/**
 * 解析 url 得到 path 和 query
 * 比如输入url: /pages/login/login?redirect=%2Fpages%2Fdemo%2Fbase%2Froute-interceptor
 * 输出: {path: /pages/login/login, query: {redirect: /pages/demo/base/route-interceptor}}
 */
export function parseUrlToObj(url: string) {
  const [path, queryStr] = url.split('?')
  // console.log(path, queryStr)

  if (!queryStr) {
    return {
      path,
      query: {},
    }
  }
  const query: Record<string, string> = {}
  queryStr.split('&').forEach((item) => {
    const [key, value] = item.split('=')
    // console.log(key, value)
    query[key] = ensureDecodeURIComponent(value) // 这里需要统一 decodeURIComponent 一下，可以兼容h5和微信y
  })
  return { path, query }
}
/**
 * 得到所有的需要登录的 pages，包括主包和分包的
 * 这里设计得通用一点，可以传递 key 作为判断依据，默认是 excludeLoginPath, 与 route-block 配对使用
 * 如果没有传 key，则表示所有的 pages，如果传递了 key, 则表示通过 key 过滤
 */
export function getAllPages(key?: string) {
  // 这里处理主包
  const mainPages = (pages as PageMetaDatum[])
    .filter(page => !key || page[key])
    .map(page => ({
      ...page,
      path: `/${page.path}`,
    }))

  // 这里处理分包
  const subPages: PageMetaDatum[] = []
    ; (subPackages as SubPackages).forEach((subPageObj) => {
      // console.log(subPageObj)
      const { root } = subPageObj
      subPageObj.pages
        .filter(page => !key || page[key])
        .forEach((page) => {
          subPages.push({
            ...page,
            path: `/${root}/${page.path}`,
          })
        })
    })
  const result = [...mainPages, ...subPages]
  // console.log(`getAllPages by ${key} result: `, result)
  return result
}

export function getCurrentPageI18nKey() {
  const routeObj = currRoute()
  const currPage = (pages as PageMetaDatum[]).find(page => `/${page.path}` === routeObj.path)
  if (!currPage) {
    console.warn('路由不正确')
    return ''
  }
  console.log(currPage)
  console.log(currPage.style.navigationBarTitleText)
  return currPage.style?.navigationBarTitleText || ''
}

/**
 * 根据当前运行平台，判断应该获取的 baseUrl
 */
export function getEnvBaseUrl() {
  let baseUrl = import.meta.env.VITE_SERVER_BASEURL

  const isProduction = import.meta.env.MODE === 'production'

  // #ifdef APP-PLUS
  baseUrl = 'http://117.72.166.182:5000/'
  // #endif

  // #ifdef MP-WEIXIN
  if (!isProduction) {
    const VITE_SERVER_BASEURL__WEIXIN_DEVELOP = 'http://localhost:5000'
    const VITE_SERVER_BASEURL__WEIXIN_TRIAL = 'https://api.hqzx.me'
    const VITE_SERVER_BASEURL__WEIXIN_RELEASE = 'https://api.hqzx.me'

    try {
      const accountInfo = uni.getAccountInfoSync()
      const envVersion = accountInfo?.miniProgram?.envVersion

      switch (envVersion) {
        case 'develop':
          baseUrl = VITE_SERVER_BASEURL__WEIXIN_DEVELOP || baseUrl
          break
        case 'trial':
          baseUrl = VITE_SERVER_BASEURL__WEIXIN_TRIAL || baseUrl
          break
        case 'release':
          baseUrl = VITE_SERVER_BASEURL__WEIXIN_RELEASE || baseUrl
          break
        default:
          baseUrl = VITE_SERVER_BASEURL__WEIXIN_DEVELOP
      }
    }
    catch (e) {
      console.warn('[getEnvBaseUrl] 获取小程序环境失败，使用开发环境地址:', e)
      baseUrl = VITE_SERVER_BASEURL__WEIXIN_DEVELOP
    }
  }
  // #endif

  return baseUrl
}

/**
 * 是否是双token模式
 */
export const isDoubleTokenMode = import.meta.env.VITE_AUTH_MODE === 'double'

/**
 * 是否运行在微信小程序环境
 */
export const isMpWeixin = (() => {
  // #ifdef MP-WEIXIN
  return true
  // #endif
  // #ifndef MP-WEIXIN
  return false
  // #endif
})()

/**
 * 是否运行在APP环境
 */
export const isAppPlus = (() => {
  // #ifdef APP-PLUS
  return true
  // #endif
  // #ifndef APP-PLUS
  return false
  // #endif
})()

/**
 * 获取静态资源完整URL（处理相对路径）
 * @param url 资源路径（可能是相对路径或完整URL）
 * @returns 完整的资源URL
 */
export function getStaticUrl(url: string | undefined | null): string {
  if (!url) {
    return ''
  }

  // 如果已经是完整URL，直接返回
  if (url.startsWith('http://') || url.startsWith('https://')) {
    return url
  }

  // 如果是相对路径，拼接服务器地址
  const baseUrl = getEnvBaseUrl()
  // 移除 baseUrl 末尾的 /app，因为后端返回的路径已经包含了正确的路由
  const apiBase = baseUrl.replace(/\/app$/, '')

  // 确保路径以 / 开头
  const path = url.startsWith('/') ? url : `/${url}`

  return `${apiBase}${path}`
}

/**
 * 首页路径，通过 page.json 里面的 type 为 home 的页面获取，如果没有，则默认是第一个页面
 * 通常为 /pages/index/index
 */
export const HOME_PAGE = `/${(pages as PageMetaDatum[]).find(page => page.type === 'home')?.path || (pages as PageMetaDatum[])[0].path}`
