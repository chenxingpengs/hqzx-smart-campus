/* eslint-disable */
// @ts-ignore
import request from '@/http/vue-query';
import { CustomRequestOptions_ } from '@/http/types';

import * as API from './types';

/** 获取所有插件列表 GET /web/plugins */
export function webPluginsUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取插件详情 GET /web/plugins/${param0} */
export function webPluginsPluginIdUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取插件配置 GET /web/plugins/${param0}/config */
export function webPluginsPluginIdConfigUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdConfigUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/config`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 更新插件配置 PUT /web/plugins/${param0}/config */
export function webPluginsPluginIdConfigUsingPut({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdConfigUsingPutParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/config`, {
    method: 'PUT',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 重置插件配置为默认值 POST /web/plugins/${param0}/config/reset */
export function webPluginsPluginIdConfigResetUsingPost({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdConfigResetUsingPostParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/config/reset`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 禁用插件 POST /web/plugins/${param0}/disable */
export function webPluginsPluginIdDisableUsingPost({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdDisableUsingPostParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/disable`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 启用插件 POST /web/plugins/${param0}/enable */
export function webPluginsPluginIdEnableUsingPost({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdEnableUsingPostParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/enable`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 安装插件 POST /web/plugins/${param0}/install */
export function webPluginsPluginIdInstallUsingPost({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdInstallUsingPostParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/install`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取插件README md内容 GET /web/plugins/${param0}/readme */
export function webPluginsPluginIdReadmeUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdReadmeUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/readme`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 重新加载插件 POST /web/plugins/${param0}/reload */
export function webPluginsPluginIdReloadUsingPost({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdReloadUsingPostParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/reload`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 卸载插件 POST /web/plugins/${param0}/uninstall */
export function webPluginsPluginIdUninstallUsingPost({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsPluginIdUninstallUsingPostParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/${param0}/uninstall`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取管理端插件配置 GET /web/plugins/configs/admin */
export function webPluginsConfigsAdminUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/configs/admin', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取所有插件路由配置 GET /web/plugins/configs/routes */
export function webPluginsConfigsRoutesUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/configs/routes', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取小程序 Tabbar 菜单配置 GET /web/plugins/configs/tabbar-menu */
export function webPluginsConfigsTabbarMenuUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/configs/tabbar-menu', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取小程序插件配置 GET /web/plugins/configs/wechat */
export function webPluginsConfigsWechatUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/configs/wechat', {
    method: 'GET',
    ...(options || {}),
  });
}
