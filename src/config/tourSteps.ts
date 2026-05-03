import type { TourStep } from '@/components/TourGuide/types'

export const TOUR_VERSION = '2.0.0'

const homeSteps: TourStep[] = [
  {
    id: 'welcome',
    target: '.school-name',
    title: '欢迎使用智慧校园',
    content: '欢迎来到珠海市红旗中学智慧校园系统！这里为您提供便捷的校园服务，包括考勤管理、消息通知、设备管理等功能。让我们开始了解如何使用吧！',
    position: 'bottom',
    pagePath: '/pages/index/index',
    highlightPadding: 12,
    highlightBorderRadius: 8,
  },
  {
    id: 'scan-button',
    target: '.scan-button',
    title: '扫码绑定设备',
    content: '点击右上角的扫码按钮，可以扫描设备二维码进行快速绑定。绑定后，您可以接收设备推送的通知消息，及时了解学生的考勤状态。',
    position: 'left',
    pagePath: '/pages/index/index',
    highlightPadding: 10,
    highlightBorderRadius: 50,
  },
  {
    id: 'quick-actions',
    target: '.quick-actions',
    title: '快捷功能入口',
    content: '这里展示了最常用的功能入口，包括考勤管理、设备管理、发送通知、寻人传呼、寻物启事、应用中心、校园活动和消息中心。点击对应图标即可快速进入功能页面。',
    position: 'bottom',
    pagePath: '/pages/index/index',
    highlightPadding: 12,
    highlightBorderRadius: 12,
  },
  {
    id: 'common-functions',
    target: '.common-functions',
    title: '常用功能模块',
    content: '这里展示了详细的功能卡片，每个卡片包含功能图标、名称和简要说明。教师和管理员可以看到考勤管理、发送通知、寻人传呼等功能；学生和家长可以查看相关服务。',
    position: 'top',
    pagePath: '/pages/index/index',
    highlightPadding: 12,
    highlightBorderRadius: 12,
  },
  {
    id: 'tabbar-me',
    target: '.tabbar-item-me',
    title: '个人中心',
    content: '点击"我的"进入个人中心，您可以查看和编辑个人资料、管理班级信息、查看考勤统计、换班记录、系统设置等。这是您的专属管理空间。',
    position: 'top',
    pagePath: '/pages/index/index',
    highlightPadding: 8,
    highlightBorderRadius: 8,
  },
  {
    id: 'tabbar-message',
    target: '.tabbar-item-message',
    title: '消息中心',
    content: '点击"消息"进入消息中心，您可以查看系统通知、班级消息、好友申请等。这里汇集了所有与您相关的重要信息，确保您不会错过任何重要消息。',
    position: 'top',
    pagePath: '/pages/index/index',
    highlightPadding: 8,
    highlightBorderRadius: 8,
  },
]

const attendanceSteps: TourStep[] = [
  {
    id: 'attendance-nav',
    target: '.tour-attendance-nav',
    title: '考勤导航',
    content: '这里可以切换不同的考勤功能模块：我的考勤、考勤查询和排班管理。点击相应标签即可快速切换。',
    position: 'bottom',
    pagePath: '/pages/attendance/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'attendance-my',
    target: '.tour-attendance-my',
    title: '我的考勤',
    content: '查看您的个人考勤记录，包括签到签退时间、考勤状态等。支持按日期筛选和导出考勤数据。',
    position: 'top',
    pagePath: '/pages/attendance/index',
    highlightPadding: 12,
    highlightBorderRadius: 12,
  },
  {
    id: 'attendance-query',
    target: '.tour-attendance-query',
    title: '考勤查询',
    content: '教师和管理员可以查询班级学生的考勤情况，支持按班级、日期、学生姓名等条件筛选。',
    position: 'top',
    pagePath: '/pages/attendance/index',
    highlightPadding: 12,
    highlightBorderRadius: 12,
  },
  {
    id: 'attendance-schedule',
    target: '.tour-attendance-schedule',
    title: '排班管理',
    content: '查看和管理您的排班信息，支持申请换班、查看排班表等功能。排班信息会实时同步更新。',
    position: 'top',
    pagePath: '/pages/attendance/index',
    highlightPadding: 12,
    highlightBorderRadius: 12,
  },
]

const chatSteps: TourStep[] = [
  {
    id: 'chat-list',
    target: '.tour-chat-list',
    title: '消息列表',
    content: '这里显示您的所有会话，包括私聊、群聊和班级群。点击会话即可进入聊天界面，未读消息会显示红色标记。',
    position: 'right',
    pagePath: '/pages/chat/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'chat-request',
    target: '.tour-chat-request',
    title: '好友请求',
    content: '当有新的好友请求或入群邀请时，这里会显示提示条。点击可以查看详情并进行处理。',
    position: 'bottom',
    pagePath: '/pages/chat/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'chat-more',
    target: '.tour-chat-more',
    title: '更多功能',
    content: '点击右上角的更多按钮，可以创建群聊、添加联系人、添加班级等。教师和管理员还可以管理班级群。',
    position: 'left',
    pagePath: '/pages/chat/index',
    highlightPadding: 8,
    highlightBorderRadius: 50,
  },
]

const meSteps: TourStep[] = [
  {
    id: 'me-header',
    target: '.tour-me-header',
    title: '个人信息',
    content: '这里显示您的头像、姓名和角色信息。点击编辑按钮可以修改个人资料和头像。',
    position: 'bottom',
    pagePath: '/pages/me/me',
    highlightPadding: 12,
    highlightBorderRadius: 12,
  },
  {
    id: 'me-menu',
    target: '.tour-me-menu',
    title: '功能菜单',
    content: '这里提供了个人中心的所有功能入口，包括个人资料、我的班级、考勤统计、换班记录等。点击即可进入相应页面。',
    position: 'top',
    pagePath: '/pages/me/me',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
]

const moreSteps: TourStep[] = [
  {
    id: 'more-apps',
    target: '.tour-more-apps',
    title: '应用中心',
    content: '这里汇集了学校的各类应用和工具，包括教学辅助、学生管理、校园服务等多个分类。点击应用图标即可使用。',
    position: 'top',
    pagePath: '/pages/more/index',
    highlightPadding: 12,
    highlightBorderRadius: 12,
  },
  {
    id: 'more-categories',
    target: '.tour-more-categories',
    title: '应用分类',
    content: '应用按功能分类展示，您可以通过顶部分类标签快速筛选需要的应用类型。',
    position: 'bottom',
    pagePath: '/pages/more/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
]

const deviceSteps: TourStep[] = [
  {
    id: 'device-list',
    target: '.tour-device-list',
    title: '设备列表',
    content: '这里显示您绑定的所有设备，包括设备名称、状态、位置等信息。点击设备可以查看详情和控制。',
    position: 'right',
    pagePath: '/pages-device/list/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'device-add',
    target: '.tour-device-add',
    title: '添加设备',
    content: '点击右上角的添加按钮，可以通过扫码或手动输入的方式绑定新设备。',
    position: 'left',
    pagePath: '/pages-device/list/index',
    highlightPadding: 8,
    highlightBorderRadius: 50,
  },
]

const notificationSteps: TourStep[] = [
  {
    id: 'notification-editor',
    target: '.tour-notification-editor',
    title: '通知编辑',
    content: '在这里编写通知内容，支持富文本编辑。可以设置通知标题、正文、附件等。',
    position: 'right',
    pagePath: '/pages-notification/notification/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'notification-receivers',
    target: '.tour-notification-receivers',
    title: '选择接收对象',
    content: '点击选择接收通知的对象，支持按班级、年级、角色等多种方式筛选。可以预览接收人数。',
    position: 'top',
    pagePath: '/pages-notification/notification/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'notification-send',
    target: '.tour-notification-send',
    title: '发送通知',
    content: '编辑完成后，点击发送按钮即可推送通知。系统会记录发送历史，方便后续查看。',
    position: 'top',
    pagePath: '/pages-notification/notification/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
]

const pageCallSteps: TourStep[] = [
  {
    id: 'pagecall-select',
    target: '.tour-pagecall-select',
    title: '选择学生',
    content: '通过搜索或列表选择需要传呼的学生。支持按班级、姓名等条件快速筛选。',
    position: 'right',
    pagePath: '/pages-notification/page-call/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'pagecall-message',
    target: '.tour-pagecall-message',
    title: '传呼信息',
    content: '填写传呼原因和备注信息，系统会通过设备推送消息给学生，提醒其前往指定地点。',
    position: 'top',
    pagePath: '/pages-notification/page-call/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
]

const lostfoundSteps: TourStep[] = [
  {
    id: 'lostfound-list',
    target: '.tour-lostfound-list',
    title: '物品列表',
    content: '这里显示所有的寻物启事和失物招领信息。可以通过分类标签筛选查看丢失或拾到的物品。',
    position: 'right',
    pagePath: '/pages-lostfound/list/index',
    highlightPadding: 10,
    highlightBorderRadius: 8,
  },
  {
    id: 'lostfound-publish',
    target: '.tour-lostfound-publish',
    title: '发布信息',
    content: '点击右下角的发布按钮，可以发布寻物启事或失物招领信息。填写物品描述、丢失/拾到地点等信息。',
    position: 'left',
    pagePath: '/pages-lostfound/list/index',
    highlightPadding: 8,
    highlightBorderRadius: 50,
  },
]

export function getTourSteps(pagePath: string, userRole?: string): TourStep[] {
  switch (pagePath) {
    case '/pages/index/index':
      return homeSteps
    case '/pages/attendance/index':
      return attendanceSteps
    case '/pages/chat/index':
      return chatSteps
    case '/pages/me/me':
      return meSteps
    case '/pages/more/index':
      return moreSteps
    case '/pages-device/list/index':
      return deviceSteps
    case '/pages-notification/notification/index':
      return notificationSteps
    case '/pages-notification/page-call/index':
      return pageCallSteps
    case '/pages-lostfound/list/index':
      return lostfoundSteps
    default:
      return []
  }
}

export function getAllTourSteps(): TourStep[] {
  return [
    ...homeSteps,
    ...attendanceSteps,
    ...chatSteps,
    ...meSteps,
    ...moreSteps,
    ...deviceSteps,
    ...notificationSteps,
    ...pageCallSteps,
    ...lostfoundSteps,
  ]
}

export const tourSteps: TourStep[] = homeSteps

export const TOTAL_STEPS = homeSteps.length

export const PAGE_STEPS = {
  home: homeSteps,
  attendance: attendanceSteps,
  chat: chatSteps,
  me: meSteps,
  more: moreSteps,
  device: deviceSteps,
  notification: notificationSteps,
  pageCall: pageCallSteps,
  lostfound: lostfoundSteps,
}

export const PAGE_PATHS = {
  home: '/pages/index/index',
  attendance: '/pages/attendance/index',
  chat: '/pages/chat/index',
  me: '/pages/me/me',
  more: '/pages/more/index',
  device: '/pages-device/list/index',
  notification: '/pages-notification/notification/index',
  pageCall: '/pages-notification/page-call/index',
  lostfound: '/pages-lostfound/list/index',
}
