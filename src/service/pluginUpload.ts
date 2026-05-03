/* eslint-disable */
// @ts-ignore
import request from '@/http/vue-query';
import { CustomRequestOptions_ } from '@/http/types';

import * as API from './types';

/** 上传插件包 POST /web/plugins/upload */
export function webPluginsUploadUsingPost({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/upload', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 删除已上传的插件 DELETE /web/plugins/upload/${param0} */
export function webPluginsUploadPluginIdUsingDelete({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.WebPluginsUploadPluginIdUsingDeleteParams;
  options?: CustomRequestOptions_;
}) {
  const { plugin_id: param0, ...queryParams } = params;

  return request<unknown>(`/web/plugins/upload/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 获取已上传的插件列表 GET /web/plugins/upload/list */
export function webPluginsUploadListUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/web/plugins/upload/list', {
    method: 'GET',
    ...(options || {}),
  });
}
