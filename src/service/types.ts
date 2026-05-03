/* eslint-disable */
// @ts-ignore

export type AddAttendanceData = {
  /** 考勤记录ID */
  recordId: string;
  /** 排班ID */
  scheduleId: string;
  /** 操作类型：INSERT-新增，UPDATE-更新 */
  operType: string;
  /** 考勤统计数据 */
  statistics?: AttendanceStatistics;
};

export type AddAttendanceRequest = {
  /** 排班ID（关联attendance_schedules表id） */
  scheduleId: string;
  /** 考勤日期（格式：YYYY-MM-DD） */
  attendanceDate: string;
  /** 应到总人数（该排班下的学生总数） */
  shouldAttend: number;
  /** 考勤备注（可选） */
  notes?: string;
  /** 请假/缺勤学生明细列表（无异常则传空数组） */
  studentDetails?: StudentAttendanceDetail[];
};

export type AddAttendanceResponse = {
  /** 状态码：200=成功，400=参数错误，401=未授权，403=角色不允许，500=服务器错误 */
  code: number;
  /** 接口提示信息（区分新增/更新） */
  msg: string;
  /** 操作结果（错误时为null） */
  data?: AddAttendanceData;
};

export type AppAttendanceAttendanceDetailUsingGetParams = {
  /** 排班ID */
  schedule_id: number;
};

export type AppAttendanceAttendanceDetailUsingGetResponses = {
  /**
   * 成功
   */
  200: FullAttendanceResponse;
  /**
   * 参数错误
   */
  400: unknown;
  /**
   * 未授权
   */
  401: unknown;
  /**
   * 服务器错误
   */
  500: unknown;
};

export type AppAttendanceClassesUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceDailyUsingGetParams = {
  /** 考勤日期（格式：YYYY-MM-DD） */
  attendanceDate: string;
};

export type AppAttendanceDailyUsingGetResponses = {
  /**
   * Success
   */
  200: QueryAttendanceResponse;
  /**
   * 参数错误
   */
  400: QueryAttendanceResponse;
  /**
   * 未授权
   */
  401: QueryAttendanceResponse;
  /**
   * 角色不允许
   */
  403: QueryAttendanceResponse;
  /**
   * 服务器错误
   */
  500: QueryAttendanceResponse;
};

export type AppAttendancePeriodicRulesRuleIdUsingDeleteParams = {
  rule_id: number;
};

export type AppAttendancePeriodicRulesRuleIdUsingDeleteResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendancePeriodicRulesRuleIdUsingPutParams = {
  rule_id: number;
};

export type AppAttendancePeriodicRulesRuleIdUsingPutResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendancePeriodicRulesUsingGetResponses = {
  /**
   * Success
   */
  200: PeriodicRulesResponse;
};

export type AppAttendancePeriodicRulesUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceRecordUsingPostResponses = {
  /**
   * Success
   */
  200: AddAttendanceResponse;
  /**
   * 参数错误
   */
  400: AddAttendanceResponse;
  /**
   * 未授权
   */
  401: AddAttendanceResponse;
  /**
   * 角色不允许
   */
  403: AddAttendanceResponse;
  /**
   * 服务器错误
   */
  500: AddAttendanceResponse;
};

export type AppAttendanceSchedulesBatchCreateUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceSchedulesCreateUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceSchedulesOpenApiImportUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceSchedulesTemplateUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceSchedulesUsingGetParams = {
  /** 开始日期 (YYYY-MM-DD) */
  startDate?: string;
  /** 结束日期 (YYYY-MM-DD) */
  endDate?: string;
  /** 查询天数 (默认30天) */
  days?: string;
};

export type AppAttendanceSchedulesUsingGetResponses = {
  /**
   * Success
   */
  200: SchedulesResponse;
};

export type AppAttendanceShiftSwapAvailableUsingGetParams = {
  /** 排班ID */
  scheduleId?: string;
};

export type AppAttendanceShiftSwapAvailableUsingGetResponses = {
  /**
   * Success
   */
  200: ShiftSwapAvailableResponse;
};

export type AppAttendanceShiftSwapMyRequestsUsingGetResponses = {
  /**
   * Success
   */
  200: ShiftSwapListResponse;
};

export type AppAttendanceShiftSwapPendingCountUsingGetResponses = {
  /**
   * Success
   */
  200: PendingSwapCountResponse;
};

export type AppAttendanceShiftSwapReceivedUsingGetResponses = {
  /**
   * Success
   */
  200: ShiftSwapListResponse;
};

export type AppAttendanceShiftSwapRequestIdCancelUsingPutParams = {
  request_id: number;
};

export type AppAttendanceShiftSwapRequestIdCancelUsingPutResponses = {
  /**
   * Success
   */
  200: ShiftSwapResponse;
};

export type AppAttendanceShiftSwapRequestIdRespondUsingPutParams = {
  request_id: number;
};

export type AppAttendanceShiftSwapRequestIdRespondUsingPutResponses = {
  /**
   * Success
   */
  200: ShiftSwapResponse;
};

export type AppAttendanceShiftSwapUsingPostResponses = {
  /**
   * Success
   */
  200: ShiftSwapResponse;
};

export type AppAttendanceTimeSlotsUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceTimeSlotsUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppAttendanceUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppBindConfirmUsingPostResponses = {
  /**
   * Success
   */
  200: BindConfirmResponse;
};

export type AppBindUserUsingPostResponses = {
  /**
   * Success
   */
  200: BindResponse;
};

export type AppBindVerifyUsingPostResponses = {
  /**
   * Success
   */
  200: BindVerifyResponse;
};

export type AppChangePasswordUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppLogoutUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppNotificationsIdReadUsingPutParams = {
  id: number;
};

export type AppNotificationsIdReadUsingPutResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppNotificationsIdUsingDeleteParams = {
  id: number;
};

export type AppNotificationsIdUsingDeleteResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppNotificationsReadAllUsingPutResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppNotificationsUnreadCountUsingGetResponses = {
  /**
   * Success
   */
  200: UnreadCountResponse;
};

export type AppNotificationsUsingGetParams = {
  /** 每页数量 */
  size?: number;
  /** 页码 */
  page?: number;
  /** 消息类型: swap/announcement/all */
  type?: string;
};

export type AppNotificationsUsingGetResponses = {
  /**
   * Success
   */
  200: NotificationListResponse;
};

export type AppRefreshTokenUsingPostResponses = {
  /**
   * Success
   */
  200: RefreshTokenResponse;
};

export type AppUserBindStatusUsingGetResponses = {
  /**
   * Success
   */
  200: BindStatusResponse;
};

export type AppUserInfoUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppUserProfileUsingPutResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppUserWechatUnbindUsingDeleteResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type AppWxLoginUsingPostResponses = {
  /**
   * Success
   */
  200: LoginResponse;
};

export type AttendanceStatistics = {
  /** 应到人数 */
  shouldAttend: number;
  /** 实到人数（应到-请假-缺勤） */
  actualAttend: number;
  /** 缺勤人数 */
  absentCount: number;
};

export type AttendanceStats = {
  /** 应到人数 */
  shouldAttend: number;
  /** 实到人数 */
  present: number;
  /** 请假人数 */
  leaveCount: number;
  /** 缺勤人数（应到-实到-请假） */
  absentCount: number;
  /** 无故缺勤人数 */
  absentWithoutLeave: number;
};

export type AvailableTeacher = {
  /** 教师ID */
  teacherId: number;
  /** 教师姓名 */
  teacherName: string;
};

export type BindConfirmData = {
  /** 设备ID */
  device_id: string;
  /** 设备名称 */
  device_name: string;
  /** 班级ID */
  class_id: number;
  /** 班级名称 */
  class_name: string;
  /** 绑定时间 */
  bind_time: string;
};

export type BindConfirmRequest = {
  /** 临时绑定token */
  token: string;
  /** 设备ID */
  device_id: string;
  /** 班级ID */
  class_id: number;
};

export type BindConfirmResponse = {
  code: number;
  msg: string;
  data?: BindConfirmData;
};

export type BindData = {
  /** 访问令牌 */
  token: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** 绑定后的用户信息 */
  user_info?: BoundUserInfo;
  /** 是否需要修改密码 */
  need_change_password?: boolean;
};

export type BindRequest = {
  /** 学工号 */
  user_code: string;
  /** 系统账号密码 */
  password: string;
};

export type BindResponse = {
  /** 状态码 */
  code?: number;
  /** 提示信息 */
  msg?: string;
  /** 成功时返回数据 */
  data?: BindData;
};

export type BindStatusData = {
  /** 微信是否已绑定 */
  wechatBinded?: boolean;
  /** 绑定时间 */
  bindTime?: string;
  /** 微信OpenID（脱敏） */
  openid?: string;
};

export type BindStatusResponse = {
  /** 状态码 */
  code?: number;
  /** 提示信息 */
  msg?: string;
  /** 绑定状态数据 */
  data?: BindStatusData;
};

export type BindVerifyData = {
  /** 设备信息 */
  device_info?: DeviceInfo;
  /** 班级信息 */
  class_info?: ClassInfo;
  /** 是否可以绑定 */
  can_bind: boolean;
};

export type BindVerifyRequest = {
  /** 临时绑定token */
  token: string;
};

export type BindVerifyResponse = {
  code: number;
  msg: string;
  data?: BindVerifyData;
};

export type BoundUserInfo = {
  /** 绑定的用户账号 */
  username?: string;
};

export type ChangePasswordRequest = {
  /** 旧密码 */
  old_password: string;
  /** 新密码 */
  new_password: string;
};

export type ClassInfo = {
  /** 班级ID */
  id: number;
  /** 班级名称 */
  name: string;
  /** 年级 */
  grade?: string;
};

export type CreateSwapRequest = {
  /** 我的排班ID */
  myScheduleId: number;
  /** 代班教师ID */
  targetTeacherId: number;
  /** 申请留言 */
  message?: string;
};

export type DailyAttendanceItem = {
  /** 时段ID */
  timeSlotId: number;
  /** 时段名称 */
  timeSlotName: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 是否固定时段 */
  isFixed: boolean;
  /** 状态 */
  status: string;
  /** 取消原因 */
  cancelReason?: string;
  /** 排班ID */
  scheduleId?: number;
  /** 应到人数 */
  shouldAttend: number;
  /** 实到人数 */
  actualAttend: number;
  /** 请假人数 */
  leaveCount: number;
  /** 缺勤人数 */
  absentCount: number;
  /** 是否已记录 */
  isRecorded: boolean;
  /** 班级ID */
  classId?: number;
  /** 班级名称 */
  className?: string;
};

export type DeviceInfo = {
  /** 设备ID */
  id: string;
  /** 设备名称 */
  name: string;
};

export type FullAttendanceData = {
  /** 考勤排班ID */
  scheduleId: string;
  /** 班级ID */
  classId: string;
  /** 班级名称 */
  className: string;
  /** 年级 */
  grade: string;
  /** 时段ID */
  timeSlotId: string;
  /** 时段名称 */
  timeSlotName: string;
  /** 时段开始时间 */
  startTime: string;
  /** 时段结束时间 */
  endTime: string;
  /** 考勤日期 */
  attendanceDate: string;
  /** 考勤备注 */
  notes: string;
  /** 考勤统计 */
  stats: AttendanceStats;
  /** 请假学生列表 */
  leaveStudentList: StudentException[];
  /** 缺勤学生列表 */
  absentStudentList: StudentException[];
  /** 请假学生总数 */
  totalLeaveCount: number;
  /** 缺勤学生总数 */
  totalAbsentCount: number;
  /** 特殊状态：cancelled=停课 */
  specialStatus?: string;
  /** 停课原因 */
  cancelReason?: string;
};

export type FullAttendanceResponse = {
  /** 状态码 */
  code: number;
  /** 接口提示信息 */
  msg: string;
  /** 业务核心数据 */
  data?: FullAttendanceData;
};

export type LoginData = {
  /** 访问令牌 */
  accessToken?: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** Access Token有效期（秒） */
  accessTokenExpire?: number;
  /** Refresh Token有效期（秒） */
  refreshTokenExpire?: number;
  /** 是否绑定系统账号 */
  is_bound?: boolean;
  /** 是否需要修改密码 */
  need_change_password?: boolean;
  /** 已绑定的用户信息 */
  user_info?: UserInfo;
};

export type LoginRequest = {
  /** 微信登录临时code（客户端获取） */
  code: string;
};

export type LoginResponse = {
  /** 状态码 */
  code?: number;
  /** 提示信息 */
  msg?: string;
  /** 成功时返回数据 */
  data?: LoginData;
};

export type AppLoginRequest = {
  /** 用户账号/学工号 */
  user_code: string;
  /** 密码 */
  password: string;
  /** 设备信息（可选） */
  device_info?: string;
};

export type AppLoginData = {
  /** 访问令牌 */
  accessToken: string;
  /** 刷新令牌 */
  refreshToken: string;
  /** Access Token有效期（秒） */
  accessTokenExpire: number;
  /** Refresh Token有效期（秒） */
  refreshTokenExpire: number;
  /** 是否需要修改密码 */
  need_change_password?: boolean;
  /** 用户信息 */
  user_info: AppLoginUserInfo;
};

export type AppLoginUserInfo = {
  /** 用户ID */
  userId?: number;
  /** 用户账号 */
  username: string;
  /** 学工号 */
  user_code?: string;
  /** 角色 */
  role?: string;
};

export type AppLoginResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 成功时返回数据 */
  data?: AppLoginData;
};

export type LogoutRequest = {
  /** 刷新令牌 */
  refreshToken: string;
};

export type MakeupInfo = {
  /** 原课程日期 */
  originalDate?: string;
  /** 时段ID */
  timeSlotId?: number;
  /** 是否全天补课 */
  isAllDay?: boolean;
  /** 描述 */
  description?: string;
};

export type MyScheduleInfo = {
  /** 排班ID */
  scheduleId: string;
  /** 服务日期 */
  serviceDate: string;
  /** 班级名称 */
  className: string;
  /** 时段名称 */
  timeSlotName: string;
};

export type Notification = {
  /** 消息ID */
  id?: number;
  /** 消息类型: swap/announcement */
  type?: string;
  /** 消息标题 */
  title?: string;
  /** 消息内容 */
  content?: string;
  /** 附加数据 */
  data?: Record<string, unknown>;
  /** 是否已读 */
  isRead?: boolean;
  /** 创建时间 */
  createdAt?: string;
};

export type NotificationListData = {
  list?: Notification[];
  /** 总数 */
  total?: number;
  /** 未读数量 */
  unreadCount?: number;
};

export type NotificationListResponse = {
  /** 状态码 */
  code?: number;
  /** 提示信息 */
  msg?: string;
  /** 消息列表数据 */
  data?: NotificationListData;
};

export type PendingSwapCountData = {
  /** 待处理数量 */
  count: number;
};

export type PendingSwapCountResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 业务数据 */
  data?: PendingSwapCountData;
};

export type PeriodicRule = {
  /** 规则ID */
  id: number;
  /** 班级ID */
  classId: number;
  /** 班级名称 */
  className: string;
  /** 年级 */
  grade: string;
  /** 教师ID */
  teacherId: number;
  /** 教师姓名 */
  teacherName: string;
  /** 时段ID */
  timeSlotId: number;
  /** 时段名称 */
  timeSlotName: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 星期几（1-7） */
  weekday: number;
  /** 星期几文本 */
  weekdayText: string;
  /** 服务类型 */
  serviceType?: string;
  /** 状态 */
  status: number;
  /** 创建时间 */
  createdAt?: string;
  /** 更新时间 */
  updatedAt?: string;
};

export type PeriodicRulesData = {
  /** 规则列表 */
  rules: PeriodicRule[];
  /** 规则总数 */
  total: number;
};

export type PeriodicRulesResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 业务数据 */
  data?: PeriodicRulesData;
};

export type QueryAttendanceResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 考勤时段列表 */
  data?: DailyAttendanceItem[];
};

export type RefreshTokenData = {
  /** 新的访问令牌 */
  accessToken?: string;
  /** 刷新令牌 */
  refreshToken?: string;
  /** Access Token有效期（秒） */
  accessTokenExpire?: number;
};

export type RefreshTokenRequest = {
  /** 刷新令牌 */
  refreshToken: string;
};

export type RefreshTokenResponse = {
  /** 状态码 */
  code?: number;
  /** 提示信息 */
  msg?: string;
  /** 成功时返回数据 */
  data?: RefreshTokenData;
};

export type ReplaceInfo = {
  /** 调课目标日期 */
  targetDate?: string;
  /** 时段ID */
  timeSlotId?: number;
  /** 是否全天调课 */
  isAllDay?: boolean;
  /** 描述 */
  description?: string;
};

export type RespondSwapRequest = {
  /** 是否同意 */
  accept: boolean;
  /** 回复留言 */
  message?: string;
};

export type ScheduleItem = {
  /** 排班ID */
  id: string;
  /** 班级ID */
  classId?: number;
  /** 班级名称 */
  className: string;
  /** 年级 */
  grade: string;
  /** 时段ID */
  timeSlotId: number;
  /** 时段名称 */
  timeSlotName: string;
  /** 开始时间 */
  startTime: string;
  /** 结束时间 */
  endTime: string;
  /** 时间段 */
  scheduleTime: string;
  /** 服务日期 */
  serviceDate: string;
  /** 服务类型 */
  serviceType?: string;
  /** 状态 */
  status: number;
  /** 关联的周期规则ID */
  ruleId?: number;
  /** 是否周期性排班 */
  isPeriodic: boolean;
  /** 是否今日 */
  isToday: boolean;
  /** 是否即将到来 */
  isUpcoming: boolean;
  /** 是否已停课 */
  isCancelled: boolean;
  /** 是否已调课 */
  isReplaced: boolean;
  /** 调课信息 */
  replaceInfo?: ReplaceInfo;
  /** 是否为补课 */
  isMakeupClass: boolean;
  /** 补课信息 */
  makeupInfo?: MakeupInfo;
  /** 停课原因 */
  cancelDescription?: string;
  /** 是否已完成考勤 */
  attendanceCompleted: boolean;
};

export type SchedulesData = {
  /** 排班列表 */
  schedules: ScheduleItem[];
  /** 排班总数 */
  total: number;
};

export type SchedulesResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 业务数据 */
  data?: SchedulesData;
};

export type ShiftSwapAvailableData = {
  /** 我的排班信息 */
  mySchedule: MyScheduleInfo;
  /** 可代班教师列表 */
  availableTeachers: AvailableTeacher[];
};

export type ShiftSwapAvailableResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 业务数据 */
  data?: ShiftSwapAvailableData;
};

export type ShiftSwapListData = {
  /** 换班申请列表 */
  requests: ShiftSwapRequest[];
  /** 总数 */
  total: number;
};

export type ShiftSwapListResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 业务数据 */
  data?: ShiftSwapListData;
};

export type ShiftSwapRequest = {
  /** 申请ID */
  id: number;
  /** 申请人ID */
  requesterId: number;
  /** 申请人姓名 */
  requesterName: string;
  /** 申请人排班ID */
  requesterScheduleId: number;
  /** 申请人排班日期 */
  requesterScheduleDate: string;
  /** 申请人时段 */
  requesterTimeSlotName: string;
  /** 申请人班级 */
  requesterClassName: string;
  /** 代班人ID */
  responderId: number;
  /** 代班人姓名 */
  responderName: string;
  /** 状态 */
  status: string;
  /** 状态文本 */
  statusText: string;
  /** 申请留言 */
  requestMessage?: string;
  /** 回复留言 */
  responseMessage?: string;
  /** 响应时间 */
  respondedAt?: string;
  /** 创建时间 */
  createdAt: string;
};

export type ShiftSwapResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 业务数据 */
  data?: Record<string, unknown>;
};

export enum StatusEnum {
  'leave' = 'leave',
  'absent' = 'absent',
}

export type IStatusEnum = keyof typeof StatusEnum;

export type StudentAttendanceDetail = {
  /** 学生ID（无则传空） */
  studentId?: string;
  /** 学生姓名（必填） */
  studentName: string;
  /** 状态：leave-请假，absent-缺勤 */
  status: 'leave' | 'absent';
  /** 请假原因（选填，建议请假时填写） */
  leaveReason?: string;
};

export type StudentException = {
  /** 学生唯一ID */
  studentId: string;
  /** 学生姓名 */
  studentName: string;
  /** 请假/缺勤原因（无则返回空字符串） */
  reason: string;
  /** 学生所属班级ID */
  classId: string;
  /** 学生所属班级名称 */
  className: string;
  /** 记录创建时间 */
  createdAt: string;
  /** 记录更新时间 */
  updatedAt: string;
  /** 类型：leave=请假，absent=缺勤 */
  type: string;
};

export type UnreadCountData = {
  /** 未读数量 */
  count?: number;
};

export type UnreadCountResponse = {
  /** 状态码 */
  code?: number;
  /** 提示信息 */
  msg?: string;
  /** 未读数量数据 */
  data?: UnreadCountData;
};

export type UpdateProfileRequest = {
  /** 昵称 */
  nickname?: string;
  /** 手机号 */
  phone?: string;
  /** 性别: 0未知 1男 2女 */
  gender?: number;
};

export type UserProfileData = {
  /** 用户ID */
  userId: number;
  /** 用户名 */
  username: string;
  /** 昵称 */
  nickname: string;
  /** 手机号 */
  phone?: string;
  /** 性别: 0未知 1男 2女 */
  gender: number;
  /** 头像URL */
  avatar?: string;
  /** 角色 */
  role: string;
  /** 微信是否已绑定 */
  wechatBinded: boolean;
};

export type UserProfileResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 用户资料数据 */
  data?: UserProfileData;
};

export type UserInfo = {
  /** 用户账号 */
  username?: string;
};

export type WebPluginsConfigsAdminUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsConfigsRoutesUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsConfigsTabbarMenuUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsConfigsWechatUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsMarketCacheClearUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsMarketListUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsMarketPluginIdInstallUsingPostParams = {
  plugin_id: string;
};

export type WebPluginsMarketPluginIdInstallUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsMarketPluginIdUsingGetParams = {
  plugin_id: string;
};

export type WebPluginsMarketPluginIdUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdConfigResetUsingPostParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdConfigResetUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdConfigUsingGetParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdConfigUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdConfigUsingPutParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdConfigUsingPutResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdDisableUsingPostParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdDisableUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdEnableUsingPostParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdEnableUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdInstallUsingPostParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdInstallUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdReadmeUsingGetParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdReadmeUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdReloadUsingPostParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdReloadUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdUninstallUsingPostParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdUninstallUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsPluginIdUsingGetParams = {
  plugin_id: string;
};

export type WebPluginsPluginIdUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsUploadListUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsUploadPluginIdUsingDeleteParams = {
  plugin_id: string;
};

export type WebPluginsUploadPluginIdUsingDeleteResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsUploadUsingPostResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type WebPluginsUsingGetResponses = {
  /**
   * Success
   */
  200: unknown;
};

export type UploadAvatarRequest = {
  /** 文件数据（base64或 File 对象） */
  file: File | string;
};

export type UploadAvatarResponse = {
  /** 状态码 */
  code: number;
  /** 提示信息 */
  msg: string;
  /** 头像URL */
  data?: string;
};
