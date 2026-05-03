/* eslint-disable */
// @ts-ignore
import request from '@/http/vue-query';
import { CustomRequestOptions_ } from '@/http/types';

import * as API from './types';

/** 绑定微信与系统账号 POST /app/bind-user */
export function appBindUserUsingPost({
  body,
  options,
}: {
  body: API.BindRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.BindResponse>('/app/bind-user', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 修改密码 POST /app/change-password */
export function appChangePasswordUsingPost({
  body,
  options,
}: {
  body: API.ChangePasswordRequest;
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/change-password', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 退出登录（只删除当前会话，不影响其他设备） POST /app/logout */
export function appLogoutUsingPost({
  body,
  options,
}: {
  body: API.LogoutRequest;
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/logout', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 刷新Access Token（支持多端登录，不影响其他会话） POST /app/refresh-token */
export function appRefreshTokenUsingPost({
  body,
  options,
}: {
  body: API.RefreshTokenRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.RefreshTokenResponse>('/app/refresh-token', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 获取微信绑定状态 GET /app/user/bind-status */
export function appUserBindStatusUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<API.BindStatusResponse>('/app/user/bind-status', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取当前登录用户信息 GET /app/user/info */
export function appUserInfoUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/user/info', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 获取用户详细资料 GET /app/user/profile */
export function appUserProfileUsingGet({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<API.UserProfileResponse>('/app/user/profile', {
    method: 'GET',
    ...(options || {}),
  });
}

/** 更新用户资料 PUT /app/user/profile */
export function appUserProfileUsingPut({
  body,
  options,
}: {
  body: API.UpdateProfileRequest;
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/user/profile', {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** 上传用户头像 POST /app/user/avatar */
export function appUserAvatarUploadPost({
  body,
  options,
}: {
  body: API.UploadAvatarRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.UploadAvatarResponse>('/app/user/avatar', {
    method: 'POST',
    headers: {
      'Content-Type': 'multipart/form-data',
    },
    data: body,
    ...(options || {}),
  });
}

/** 解绑微信（谨慎操作） DELETE /app/user/wechat-unbind */
export function appUserWechatUnbindUsingDelete({
  options,
}: {
  options?: CustomRequestOptions_;
}) {
  return request<unknown>('/app/user/wechat-unbind', {
    method: 'DELETE',
    ...(options || {}),
  });
}

/** 微信小程序登录（支持多端登录） POST /app/wx-login */
export function appWxLoginUsingPost({
  body,
  options,
}: {
  body: API.LoginRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.LoginResponse>('/app/wx-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}

/** APP账号密码登录（长期Token） POST /app/app-login */
export function appLoginUsingPost({
  body,
  options,
}: {
  body: API.AppLoginRequest;
  options?: CustomRequestOptions_;
}) {
  return request<API.AppLoginResponse>('/app/app-login', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
    },
    data: body,
    ...(options || {}),
  });
}
