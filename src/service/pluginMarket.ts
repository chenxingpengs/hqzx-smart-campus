/* eslint-disable */
// @ts-ignore
import request from '@/http/vue-query';
import { CustomRequestOptions_ } from '@/http/types';

import * as API from './types';

/** 获取插件详情 GET /web/plugins/market/${param0} */
export function webPluginsMarketPluginIdUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsMarketPluginIdUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/market/${param0}`, {
    method: 'GET',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 从市场安装插件 POST /web/plugins/market/${param0}/install */
export function webPluginsMarketPluginIdInstallUsingPost({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsMarketPluginIdInstallUsingPostParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/market/${param0}/install`, {
    method: 'POST',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 清除市场缓存 POST /web/plugins/market/cache/clear */
export function webPluginsMarketCacheClearUsingPost({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/market/cache/clear', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 获取在线插件列表 GET /web/plugins/market/list */
export function webPluginsMarketListUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/market/list', {
    method: 'GET',
    ...(options || {}),
  });
}
