/* eslint-disable */
// @ts-ignore
import request from '@/http/vue-query';
import { CustomRequestOptions_ } from '@/http/types';

import * as API from './types';

/** 获取消息列表 GET /app/notifications */
export function appNotificationsUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppNotificationsUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  return request<API.NotificationListResponse>('/app/notifications', {
    method: 'GET',
    params: {
      // size has a default value: 20
      size: '20',
      // page has a default value: 1
      page: '1',
      // type has a default value: all
      type: 'all',
      ...params,
    },
    ...(options || {}),
  });
}

/** 删除消息 DELETE /app/notifications/${param0} */
export function appNotificationsIdUsingDelete({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppNotificationsIdUsingDeleteParams;
  options?: CustomRequestOptions_;
}) {
  const { id: param0, ...queryParams } = params;

  return request<unknown>(`/app/notifications/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 标记消息已读 PUT /app/notifications/${param0}/read */
export function appNotificationsIdReadUsingPut({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppNotificationsIdReadUsingPutParams;
  options?: CustomRequestOptions_;
}) {
  const { id: param0, ...queryParams } = params;

  return request<unknown>(`/app/notifications/${param0}/read`, {
    method: 'PUT',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 全部标记已读 PUT /app/notifications/read-all */
export function appNotificationsReadAllUsingPut({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/notifications/read-all', {
    method: 'PUT',
    ...(options || {}),
  });
}

/** 获取未读消息数量 GET /app/notifications/unread-count */
export function appNotificationsUnreadCountUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<API.UnreadCountResponse>('/app/notifications/unread-count', {
    method: 'GET',
    ...(options || {}),
  });
}
