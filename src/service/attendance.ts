/* eslint-disable */
// @ts-ignore
import request from '@/http/vue-query';
import { CustomRequestOptions_ } from '@/http/types';

import * as API from './types';

/** 获取当前用户的考勤排班完整数据 GET /app/attendance */
export function appAttendanceUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 通过排班ID获取完整考勤数据 GET /app/attendance/attendance_detail */
export function appAttendanceAttendanceDetailUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendanceAttendanceDetailUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  return request<API.FullAttendanceResponse>(
    '/app/attendance/attendance_detail',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 获取班级列表 GET /app/attendance/classes */
export function appAttendanceClassesUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/classes', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取教师指定日期的考勤总览（班级信息嵌入时段数据） 获取指定日期的考勤时段列表及详情（仅教师角色） GET /app/attendance/daily */
export function appAttendanceDailyUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendanceDailyUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  return request<API.QueryAttendanceResponse>('/app/attendance/daily', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 获取当前用户的周期性排班规则列表 GET /app/attendance/periodic-rules */
export function appAttendancePeriodicRulesUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<API.PeriodicRulesResponse>('/app/attendance/periodic-rules', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 创建周期性排班规则 POST /app/attendance/periodic-rules */
export function appAttendancePeriodicRulesUsingPost({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/periodic-rules', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 更新周期性排班规则 PUT /app/attendance/periodic-rules/${param0} */
export function appAttendancePeriodicRulesRuleIdUsingPut({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendancePeriodicRulesRuleIdUsingPutParams;
  options?: CustomRequestOptions_;
}) {
  const { rule_id: param0, ...queryParams } = params;

  return request<unknown>(`/app/attendance/periodic-rules/${param0}`, {
    method: 'PUT',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 删除周期性排班规则 DELETE /app/attendance/periodic-rules/${param0} */
export function appAttendancePeriodicRulesRuleIdUsingDelete({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendancePeriodicRulesRuleIdUsingDeleteParams;
  options?: CustomRequestOptions_;
}) {
  const { rule_id: param0, ...queryParams } = params;

  return request<unknown>(`/app/attendance/periodic-rules/${param0}`, {
    method: 'DELETE',
    params: { ...queryParams },
    ...(options || {}),
  });
}

/** 添加/更新考勤记录（仅记录请假/缺勤学生，leaveReason选填） 添加/更新考勤记录（仅记录请假/缺勤学生，leaveReason选填） POST /app/attendance/record */
export function appAttendanceRecordUsingPost({
  body,
  options,
}: {
  body: API.AddAttendanceRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.AddAttendanceResponse>('/app/attendance/record', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取当前用户的排班记录列表 GET /app/attendance/schedules */
export function appAttendanceSchedulesUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendanceSchedulesUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  return request<API.SchedulesResponse>('/app/attendance/schedules', {
    method: 'GET',
    params: {
      ...params,
    },
    ...(options || {}),
  });
}

/** 批量创建排班记录 POST /app/attendance/schedules/batch-create */
export function appAttendanceSchedulesBatchCreateUsingPost({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/schedules/batch-create', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 创建单条排班记录 POST /app/attendance/schedules/create */
export function appAttendanceSchedulesCreateUsingPost({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/schedules/create', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 通过Excel文件导入排班记录 POST /app/attendance/schedules/import */
export function appAttendanceSchedulesOpenApiImportUsingPost({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/schedules/import', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 下载排班记录导入模板 GET /app/attendance/schedules/template */
export function appAttendanceSchedulesTemplateUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/schedules/template', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 发起代班申请 POST /app/attendance/shift-swap */
export function appAttendanceShiftSwapUsingPost({
  body,
  options,
}: {
  body: API.CreateSwapRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.ShiftSwapResponse>('/app/attendance/shift-swap', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 取消代班申请 PUT /app/attendance/shift-swap/${param0}/cancel */
export function appAttendanceShiftSwapRequestIdCancelUsingPut({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendanceShiftSwapRequestIdCancelUsingPutParams;
  options?: CustomRequestOptions_;
}) {
  const { request_id: param0, ...queryParams } = params;

  return request<API.ShiftSwapResponse>(
    `/app/attendance/shift-swap/${param0}/cancel`,
    {
      method: 'PUT',
      params: { ...queryParams },
      ...(options || {}),
    }
  );
}

/** 处理代班申请（同意/拒绝） PUT /app/attendance/shift-swap/${param0}/respond */
export function appAttendanceShiftSwapRequestIdRespondUsingPut({
  params,
  body,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendanceShiftSwapRequestIdRespondUsingPutParams;
  body: API.RespondSwapRequest;
  options?: CustomRequestOptions_;
}) {
  const { request_id: param0, ...queryParams } = params;

  return request<API.ShiftSwapResponse>(
    `/app/attendance/shift-swap/${param0}/respond`,
    {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
      },
      params: { ...queryParams },
      data: body,
      ...(options || {}),
    }
  );
}

/** 获取可代班的教师列表（当天该时段没有排班的教师） GET /app/attendance/shift-swap/available */
export function appAttendanceShiftSwapAvailableUsingGet({
  params,
  options,
}: {
  // 叠加生成的Param类型 (非body参数openapi默认没有生成对象)
  params: API.AppAttendanceShiftSwapAvailableUsingGetParams;
  options?: CustomRequestOptions_;
}) {
  return request<API.ShiftSwapAvailableResponse>(
    '/app/attendance/shift-swap/available',
    {
      method: 'GET',
      params: {
        ...params,
      },
      ...(options || {}),
    }
  );
}

/** 获取我发起的代班申请 GET /app/attendance/shift-swap/my-requests */
export function appAttendanceShiftSwapMyRequestsUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<API.ShiftSwapListResponse>(
    '/app/attendance/shift-swap/my-requests',
    {
      method: 'GET',
      ...(options || {}),
    }
  );
}

/** 获取待处理的代班申请数量 GET /app/attendance/shift-swap/pending-count */
export function appAttendanceShiftSwapPendingCountUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<API.PendingSwapCountResponse>(
    '/app/attendance/shift-swap/pending-count',
    {
      method: 'GET',
      ...(options || {}),
    }
  );
}

/** 获取收到的代班申请 GET /app/attendance/shift-swap/received */
export function appAttendanceShiftSwapReceivedUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<API.ShiftSwapListResponse>(
    '/app/attendance/shift-swap/received',
    {
      method: 'GET',
      ...(options || {}),
    }
  );
}

/** 获取时段列表 GET /app/attendance/time-slots */
export function appAttendanceTimeSlotsUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/time-slots', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 新增时段 POST /app/attendance/time-slots */
export function appAttendanceTimeSlotsUsingPost({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/attendance/time-slots', {
    method: 'POST',
    ...(options || {}),
  });
}

/** 确认绑定 POST /app/bind/confirm */
export function appBindConfirmUsingPost({
  body,
  options,
}: {
  body: API.BindConfirmRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.BindConfirmResponse>('/app/bind/confirm', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 验证绑定 token POST /app/bind/verify */
export function appBindVerifyUsingPost({
  body,
  options,
}: {
  body: API.BindVerifyRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.BindVerifyResponse>('/app/bind/verify', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
