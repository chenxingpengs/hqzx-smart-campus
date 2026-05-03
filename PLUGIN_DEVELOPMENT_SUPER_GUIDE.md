# 超级详细的插件开发指南（Flask + 微信小程序）

## 目录

1. [系统架构总览](#1-系统架构总览)
2. [插件系统核心原理](#2-插件系统核心原理)
3. [Flask 后端插件开发](#3-flask-后端插件开发)
4. [微信小程序端集成](#4-微信小程序端集成)
5. [WebView 桥接机制](#5-webview-桥接机制)
6. [完整开发实战示例](#6-完整开发实战示例)
7. [高级特性与最佳实践](#7-高级特性与最佳实践)
8. [调试与排错指南](#8-调试与排错指南)

---

## 1. 系统架构总览

### 1.1 三端协同架构图

```
┌─────────────────────────────────────────────────────────────────┐
│                        用户交互层                                │
├─────────────────────┬───────────────────────┬───────────────────┤
│  Art-Design-Pro     │    WeChat MiniProgram │   Mobile H5/Web   │
│  (管理后台)          │    (微信小程序)        │   (移动端H5)      │
│                     │                       │                   │
│  • 动态路由加载      │  • 动态Tabbar菜单      │  • WebView容器    │
│  • 管理界面渲染      │  • 页面注册           │  • 桥接通信       │
│  • 权限控制         │  • API调用            │  • Token传递      │
└──────────┬──────────┴───────────┬───────────┴─────────┬─────────┘
           │                      │                     │
           ▼                      ▼                     ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Flask Backend (API层)                       │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐   │
│  │ PluginManager│  │  RouterReg   │  │ FrontendServer      │   │
│  │ (生命周期)    │  │  (路由注册)  │  │ (静态资源服务)       │   │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘   │
│         │                 │                      │              │
│         ▼                 ▼                      ▼              │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │              Plugin Base (插件实例)                      │    │
│  │  • register_backend()  → API路由注册                    │    │
│  │  • get_admin_config()  → 管理端配置                     │    │
│  │  • get_wechat_config() → 小程序配置                     │    │
│  │  • on_install/uninstall → 生命周期钩子                  │    │
│  └─────────────────────────────────────────────────────────┘    │
└────────────────────────────────┬────────────────────────────────┘
                                 │
                                 ▼
┌─────────────────────────────────────────────────────────────────┐
│                        Data Layer                               │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐                │
│  │ MySQL      │  │ Redis      │  │ File System│                │
│  │ (主数据)    │  │ (缓存)     │  │ (静态资源)  │                │
│  └────────────┘  └────────────┘  └────────────┘                │
└─────────────────────────────────────────────────────────────────┘
```

### 1.2 核心设计理念

#### 1.2.1 单一数据源原则 (Single Source of Truth)

**原理**：所有插件的配置、状态、能力声明都集中在 `manifest.json` 文件中，三端（后端、小程序、管理后台）都从这个文件派生配置。

**优势**：
- 避免配置不一致
- 减少维护成本
- 统一版本控制

**实现位置**：[base.py:23-35](file:///c:/Users/Administrator/Desktop/考勤/flask/plugins/base.py#L23-L35)

```python
@dataclass
class PluginManifest:
    """插件清单数据类 - 统一格式，单一数据源"""
    id: str                          # 插件唯一标识
    name: str                        # 显示名称
    version: str                     # 版本号
    description: str = ""            # 描述
    author: str = ""                 # 作者
    icon: str = ""                   # 图标
    entry_type: str = "webview"      # 入口类型
    tabbar_menu: Optional[...]       # Tabbar配置
    permissions: List[Dict] = ...    # 权限列表
    dependencies: List[str] = ...    # 依赖列表
    endpoints: Optional[PluginEndpoints]  # 能力端点配置 ★ 核心
```

#### 1.2.2 约定优于配置 (Convention over Configuration)

**原理**：通过目录结构和命名规范，减少显式配置。开发者只需遵循约定，系统自动完成大部分工作。

**约定示例**：
```
plugins/{plugin_id}/
├── manifest.json          # 必需：清单文件
├── backend/__init__.py    # 必需：插件主类（继承PluginBase）
├── backend/routes.py      # 可选：API路由
├── frontend/webview/      # 可选：WebView页面
└── static/               # 可选：静态资源
```

#### 1.2.3 插件热加载与生命周期管理

**原理**：插件支持运行时安装、卸载、启用、禁用、重载，无需重启服务器。

**状态机模型**：
```
UNLOADED → INSTALLED → ENABLED → DISABLED → UNINSTALLED
    ↑         ↓           ↓           ↓
    └─────────┴───────────┴───────────┘ (reload)
```

---

## 2. 插件系统核心原理

### 2.1 Flask 后端核心模块详解

#### 2.1.1 PluginBase - 插件基类

**文件位置**：[base.py](file:///c:/Users/Administrator/Desktop/考勤/flask/plugins/base.py)

**作用**：定义所有插件必须实现的接口和行为规范。

**核心方法解析**：

```python
class PluginBase(ABC):
    """插件基类 - 所有插件的父类"""
    
    manifest: PluginManifest  # 插件清单实例
    
    @abstractmethod
    def register_backend(self, app) -> None:
        """
        【必须实现】注册后端功能
        
        原理：
        1. Flask 应用启动时调用此方法
        2. 在此方法中创建 Namespace、Resource、Blueprint
        3. 将这些对象注册到 Flask 应用中
        
        参数：
        - app: Flask 应用实例（可通过它访问 config、extensions 等）
        
        示例实现：
        """
        ns = Namespace('example', path='/web/example')
        
        @ns.route('/list')
        class ExampleList(Resource):
            def get(self):
                return {'code': 200, 'data': [], 'msg': 'success'}
        
        api.add_namespace(ns)  # 注册到全局 api 对象
    
    def get_admin_config(self) -> Dict[str, Any]:
        """
        【可选重写】返回管理后台配置
        
        原理：
        - 默认从 manifest.endpoints.admin 自动推导
        - 管理后台根据此配置动态生成路由和菜单
        
        返回结构：
        {
            'routes': [...],      # Vue Router 路由配置
            'menus': [...],       # 侧边栏菜单配置
            'api_prefix': '/xxx'  # API前缀
        }
        """
    
    def get_wechat_config(self) -> Dict[str, Any]:
        """
        【可选重写】返回小程序配置
        
        原理：
        - 小程序启动时调用此接口获取配置
        - 配置包含页面路径、API前缀、入口类型等
        
        返回结构：
        {
            'plugin_id': 'xxx',
            'name': '公告通知',
            'icon': 'ri:notification-line',
            'entry_type': 'webview',  # 或 'native'
            'webview_url': '/plugins/xxx/webview',
            'api_prefix': '/web/announcement',
            'tabbar_menu': {...},
            'pages': [...]
        }
        """
    
    def get_tabbar_menu_config(self) -> Optional[Dict]:
        """
        【可选重写】返回Tabbar菜单配置
        
        原理：
        - 如果 enabled=true，小程序会动态添加此菜单到Tabbar
        - order 字段控制显示顺序
        
        触发时机：
        - 小程序调用 /web/plugins/configs/tabbar-menu 接口时
        - 插件启用/禁用时自动更新
        """
    
    # ========== 生命周期钩子 ==========
    
    def on_install(self) -> None:
        """
        安装时调用
        
        典型用途：
        - 创建数据表（CREATE TABLE）
        - 初始化默认数据（INSERT）
        - 创建必要的目录结构
        - 设置默认配置
        
        注意事项：
        - 此方法在数据库事务中执行
        - 失败会回滚整个安装过程
        - 应该是幂等的（多次执行结果相同）
        """
    
    def on_uninstall(self) -> None:
        """
        卸载时调用
        
        典型用途：
        - 删除数据表（DROP TABLE）
        - 清理缓存数据
        - 删除上传的文件
        - 移除定时任务
        
        ⚠️ 警告：
        - 此操作不可逆！
        - 建议提供数据保留选项
        - 先备份再删除
        """
    
    def on_enable(self) -> None:
        """
        启用时调用
        
        典型用途：
        - 启动后台服务线程
        - 注册定时任务（APScheduler）
        - 初始化连接池
        - 预热缓存数据
        """
    
    def on_disable(self) -> None:
        """
        禁用时调用
        
        典型用途：
        - 停止后台服务线程
        - 取消定时任务
        - 关闭连接池
        - 清理内存中的临时数据
        """
    
    def on_upgrade(self, old_version: str, new_version: str) -> None:
        """
        升级时调用
        
        参数：
        - old_version: 升级前的版本号
        - new_version: 升级后的版本号
        
        典型用途：
        - 执行数据库迁移（ALTER TABLE）
        - 数据格式转换
        - 兼容性处理
        """
```

#### 2.1.2 PluginManager - 插件管理器

**文件位置**：[manager.py](file:///c:/Users/Administrator/Desktop/考勤/flask/plugins/manager.py)

**作用**：插件系统的"大脑"，负责协调所有子系统完成插件的全生命周期管理。

**核心职责**：

```python
class PluginManager:
    """
    插件管理器 - 单例模式
    
    设计模式：
    - Singleton: 全局只有一个实例
    - Facade: 为复杂的子系统提供统一接口
    - Observer: 监听插件状态变化并通知相关组件
    """
    
    _instance = None  # 单例实例
    
    def __init__(self, app=None, plugin_dir='plugins'):
        # 初始化各子系统
        self._state_machine = PluginStateMachine()      # 状态机
        self._loader = PluginLoader(plugin_dir, ...)     # 加载器
        self._registry = PluginRegistry(...)             # 注册表
        self._dependency_resolver = DependencyResolver() # 依赖解析
        self._lifecycle = Lifecycle(...)                 # 生命周期
    
    def init_app(self, app):
        """
        初始化插件系统（应用启动时调用）
        
        执行流程：
        1. ensure_tables_exist()     → 创建必要的数据库表
        2. load_all_plugins()        → 扫描并加载所有插件目录
        3. build_graph()             → 构建依赖关系图
        4. load_from_database()      → 从DB恢复已安装插件状态
        5. _register_all_installed_plugins() → 注册资源
        
        时间复杂度：O(n) n=插件数量
        """
    
    def install_plugin(self, plugin_id, user_id=None):
        """
        安装插件流程：
        
        1. 状态检查
           └── 当前状态必须是 UNLOADED 或其他有效状态
           
        2. 加载插件（如果尚未加载）
           └── 调用 PluginLoader.load_plugin()
           └── 解析 manifest.json
           └── 实例化 Plugin 类
           
        3. 执行生命周期
           └── 调用 plugin.on_install()
           └── 更新数据库记录
           └── 状态转换: UNLOADED → INSTALLED
           
        4. 注册资源
           └── _register_plugin_resources()
           ├── 注册 Admin 路由
           ├── 注册 WeChat 页面
           ├── 注册 Tabbar 菜单
           ├── 注册 API 前缀
           ├── 注册 WebView 页面
           └── 注册前端静态资源服务
        """
    
    def _register_plugin_resources(self, plugin_id, plugin):
        """
        注册插件的所有资源（核心方法）
        
        原理详解：
        
        ① Admin 路由注册
        ────────────────────
        目的：让管理后台能够动态添加路由
        实现：将路由配置写入 plugin_router_registry
        影响：Art-Design-Pro 启动时从 /web/plugins/configs/routes 获取
        
        ② WeChat 页面注册  
        ────────────────────
        目的：让小程序知道有哪些原生页面可用
        实现：将页面配置写入 registry
        影响：小程序的 pages.json 动态更新
        
        ③ Tabbar 菜单注册
        ────────────────────
        目的：在小程序底部导航栏显示插件入口
        实现：将菜单配置写入 registry
        影响：小程序调用 /web/plugins/configs/tabbar-menu 获取
        
        ④ API 前缀注册
        ────────────────────
        目的：权限控制和请求拦截
        实现：记录 API 前缀，用于 before_request 钩子
        影响：未启用插件的 API 会返回 403
        
        ⑤ WebView 页面注册
        ────────────────────
        目的：记录可用的 WebView 页面列表
        实现：写入 registry
        影响：前端可以枚举所有 WebView 页面
        
        ⑥ 前端静态资源服务注册
        ────────────────────
        目的：让浏览器能访问插件的 HTML/CSS/JS 文件
        实现：plugin_frontend_server.register_plugin_frontend()
        技术：使用 Flask 的 send_from_directory
        影响：访问 /plugins/{id}/static/{path} 时返回文件
        
        ⑦ 依赖注入
        ────────────────────
        目的：让插件能访问 Flask 的 extensions
        实现：plugin_injector.inject_plugin()
        注入对象：db, api, cache, socketio 等
        """
```

**请求拦截机制**（[manager.py:97-118](file:///c:/Users/Administrator/Desktop/考勤/flask/plugins/manager.py#L97-L118)）：

```python
def _register_before_request_hook(self, app):
    """
    注册请求前钩子 - 权限控制的核心
    
    工作原理：
    1. 每个 HTTP 请求到达都会触发此函数
    2. 检查请求路径是否匹配某个插件的 API 前缀
    3. 如果匹配且插件未启用，返回 403 Forbidden
    
    性能优化：
    - 只检查已安装插件的 API 前缀
    - 使用字符串 startswith 匹配（O(1)复杂度）
    - 未匹配时立即放行
    
    安全意义：
    - 防止未授权访问已禁用插件的 API
    - 保护敏感接口不被绕过
    """
    @app.before_request
    def check_plugin_access():
        path = request.path
        
        for plugin_id, plugin in self._loader.plugins.items():
            if not self._registry.is_installed(plugin_id):
                continue
            
            admin_config = plugin.get_admin_config()
            api_prefix = admin_config.get('api_prefix', '')
            
            if api_prefix and path.startswith(api_prefix):
                if not self._registry.is_enabled(plugin_id):
                    return jsonify({
                        'code': 403,
                        'msg': f'插件 {plugin.manifest.name} 未启用'
                    }), 403
                break
```

### 2.2 微信小程序端核心模块详解

#### 2.2.1 WechatPluginEngine - 插件引擎

**文件位置**：[engine.ts](file:///c:/Users/Administrator/Desktop/考勤/wechat/src/plugin/engine.ts)

**作用**：小程序端的插件配置管理中心，负责从后端同步配置并提供查询接口。

**工作原理**：

```typescript
class WechatPluginEngine {
  private configs: WechatPluginConfig[] = []  // 缓存的配置数组
  private loaded = false                       // 是否已完成初始化
  private initPromise: Promise<void> | null = null  // 防止重复初始化
  
  async init(): Promise<void> {
    /**
     * 初始化流程（单例模式 + 双重检查锁定）
     * 
     * 为什么需要 initPromise？
     * ─────────────────────
     * 场景：多个页面同时调用 init()
     * 问题：会导致重复发送 HTTP 请求
     * 解决：共享同一个 Promise，所有调用者 await 同一个请求
     * 
     * 执行流程：
     * 1. 检查 loaded → 已加载直接返回
     * 2. 检查 initPromise → 有进行中的请求则复用
     * 3. 发起实际请求 fetchWechatPluginConfigs()
     * 4. 缓存结果到 this.configs
     * 5. 设置 loaded = true
     */
    if (this.loaded) return
    if (this.initPromise) return this.initPromise
    
    this.initPromise = this._doInit()
    return this.initPromise
  }
  
  getTabbarItems(): PluginTabbarItem[] {
    /**
     * 获取 Tabbar 菜单项
     * 
     * 过滤逻辑：
     * 1. 只选择 tabbar_menu.enabled === true 的插件
     * 2. 映射为小程序 Tabbar 所需的格式
     * 3. 按 order 字段排序
     * 
     * 返回值用途：
     * - 传给 DynamicTabbar 组件渲染底部导航
     * - 包含 pagePath 用于页面跳转
     * - 包含 webviewUrl 用于 WebView 加载
     */
    return this.configs
      .filter((c) => c.tabbar_menu?.enabled)
      .map((c) => ({
        pluginId: c.plugin_id,
        text: c.tabbar_menu!.title,
        pagePath: `/pages-plugin-webview/index?plugin=${c.plugin_id}`,
        iconType: 'unocss' as const,
        icon: (c.icon || 'i-carbon-plugin').replace('&#x', '\\').replace(';', ''),
        order: c.tabbar_menu!.order,
        webviewUrl: c.webview_url,
      }))
      .sort((a, b) => a.order - b.order)
  }
}
```

**配置数据流**：

```
Flask Backend                    WeChat MiniProgram
─────────────                    ──────────────────
                                    
GET /web/plugins/configs/wechat      
    │                              
    ▼                              
┌──────────────┐                  
│ PluginManager│                  
│ .get_wechat_ │                  
│  configs()   │                  
└──────┬───────┘                  
       │ JSON Response            
       │ [{                       
       │   plugin_id: "xxx",     
       │   name: "公告",         
       │   icon: "...",          
       │   entry_type: "webview",
       │   webview_url: "/...",  
       │   tabbar_menu: {...},   
       │   api_prefix: "/..."    
       │ }]                       
       ▼                          
┌──────────────┐   fetchWechatPluginConfigs()
│  HTTP 响应    │ ─────────────────────────────► │
│              │                                  │
└──────────────┘                                  │
                                                   ▼
                                           ┌──────────────┐
                                           │ wechatPlugin │
                                           │   Engine     │
                                           │              │
                                           │ configs = [] │ ◄── 缓存
                                           └──────┬───────┘
                                                  │
                                    ┌─────────────┼─────────────┐
                                    ▼             ▼             ▼
                              getTabbarItems()  getWebviewUrl() getConfigs()
                                    │             │             │
                                    ▼             ▼             ▼
                              DynamicTabbar   WebView页面    其他组件
```

#### 2.2.2 WebviewBridge - WebView 桥接通信

**文件位置**：[webview-bridge.ts](file:///c:/Users/Administrator/Desktop/考勤/wechat/src/plugin/webview-bridge.ts)

**作用**：实现小程序与 WebView 内 H5 页面的双向通信机制。

**为什么需要桥接？**

```
┌─────────────────────────────────────────────────────────────┐
│                    微信小程序原生层                           │
│                                                             │
│  ┌─────────────┐    postMessage()    ┌─────────────────┐   │
│  │  小程序页面   │ ─────────────────► │   WebView 容器   │   │
│  │  (Native)   │                    │                 │   │
│  │             │    @message 事件    │   H5 页面        │   │
│  │             │ ◄───────────────── │   (HTML/JS)     │   │
│  └─────────────┘                    └─────────────────┘   │
│                                                             │
│  问题：两套 JS 运行环境，无法直接共享变量和函数               │
│  解决：通过消息传递实现通信                                   │
└─────────────────────────────────────────────────────────────┘
```

**核心函数解析**：

```typescript
export function handleBridgeMessage(msg: BridgeMessage): void {
  /**
   * 处理来自 WebView 的消息
   * 
   * 支持的消息类型：
   * 
   * 1. navigate - 页面导航
   *    用途：H5页面请求跳转到小程序原生页面
   *    示例：{ type: 'navigate', payload: { url: '/pages/detail?id=123' } }
   *    实现：uni.navigateTo({ url })
   * 
   * 2. close - 关闭当前页面
   *    用途：H5页面请求关闭WebView返回上一页
   *    示例：{ type: 'close', payload: {} }
   *    实现：uni.navigateBack()
   * 
   * 3. toast - 显示提示
   *    用途：H5页面需要显示原生Toast
   *    示例：{ type: 'toast', payload: { text: '操作成功' } }
   *    实现：uni.showToast({ title, icon: 'none' })
   * 
   * 4. refresh_token - 刷新Token
   *    用途：H5页面检测到Token过期，请求刷新
   *    示例：{ type: 'refresh_token', payload: {} }
   *    实现：tokenStore.refreshToken()
   * 
   * 5. share - 分享
   *    用途：H5页面触发分享功能
   *    示例：{ type: 'share', payload: { title: '...', path: '...' } }
   *    实现：uni.shareAppMessage({ title, path })
   * 
   * 6. set_tabbar_badge - 设置角标
   *    用途：H5页面通知更新Tabbar角标数字
   *    示例：{ type: 'set_tabbar_badge', payload: { count: 5 } }
   *    实现：console.log（待实现 uni.setTabBarBadge）
   */
  switch (msg.type) {
    case 'navigate':
      const url = msg.payload.url
      if (url) uni.navigateTo({ url })
      break
    // ... 其他case
  }
}

export function buildWebviewInitParams(): URLSearchParams {
  /**
   * 构建 WebView 初始化参数
   * 
   * 为什么需要传参？
   * ───────────────
   * WebView 加载的 H5 页面是独立的页面，
   * 无法直接访问小程序的 Storage、GlobalData 等。
   * 通过 URL 参数传递必要信息。
   * 
   * 传递的参数：
   * - token: 用户认证令牌（用于API请求鉴权）
   * - platform: 平台标识（用于条件逻辑）
   * - timestamp: 时间戳（用于缓存控制）
   * 
   * 安全考虑：
   * - Token 会出现在 URL 中（浏览器历史记录可见）
   * - 建议：敏感操作应使用 postMessage 获取新token
   * - 或者：使用 HttpOnly Cookie 替代 URL Token
   */
  const params = new URLSearchParams()
  
  try {
    const tokenStore = useTokenStore()
    const token = tokenStore.tokenInfo?.token || tokenStore.token || ''
    if (token) params.set('token', token)
  } catch {
    console.warn('[Bridge] 获取token失败')
  }
  
  params.set('platform', 'wechat')
  params.set('timestamp', String(Date.now()))
  return params
}

export function buildWebviewUrl(baseUrl: string): string {
  /**
   * 构建完整的 WebView URL
   * 
   * 输入：baseUrl = "https://example.com/plugins/announcement/webview/list"
   * 输出："https://example.com/plugins/announcement/webview/list?token=xxx&platform=wechat&timestamp=1234567890"
   * 
   * 智能 separator 处理：
   * - baseUrl 包含 ? → 使用 & 连接
   * - baseUrl 不含 ? → 使用 ? 连接
   */
}
```

#### 2.2.3 WebviewCacheManager - 缓存管理器

**文件位置**：[cache-manager.ts](file:///c:/Users\Administrator/Desktop/考勤/wechat/src/plugin/cache-manager.ts)

**作用**：管理 WebView 页面的缓存策略，避免重复加载。

**缓存决策算法**：

```typescript
class WebviewCacheManager {
  shouldReload(pluginId: string, serverVersion: string): boolean {
    /**
     * 判断是否需要重新加载 WebView
     * 
     * 决策树：
     * 
     * 1. 无缓存？
     *    └── 是 → 必须重新加载（首次访问）
     *    
     * 2. 缓存过期？（超过 TTL 时间）
     *    └── 是 → 重新加载（缓存失效）
     *    TTL 默认值：5分钟（5 * 60 * 1000ms）
     *    
     * 3. 版本不匹配？
     *    └── 是 → 重新加载（内容更新）
     *    版本来源：后端 manifest.version 字段
     *    
     * 4. 以上都不满足
     *    └── 否 → 使用缓存（命中缓存）
     * 
     * 使用场景：
     * - 用户频繁切换 Tabbar 项时避免重复加载
     * - 插件更新后强制刷新
     * - 定期刷新保证数据新鲜度
     */
    const cached = this.cacheMap.get(pluginId)
    if (!cached) return true                    // 无缓存
    if (Date.now() > cached.expiresAt) return true  // 过期
    if (cached.version !== serverVersion) return true  // 版本变化
    return false                                 // 命中缓存
  }
}
```

### 2.3 Vite 构建插件详解

#### 2.3.1 copy-native-resources - 原生资源复制插件

**文件位置**：[copy-native-resources.ts](file:///c:/Users/Administrator/Desktop/考勤/wechat/vite-plugins/copy-native-resources.ts)

**作用**：解决 UniApp 打包 App 时原生插件资源丢失的问题。

**问题背景**：

```
UniApp 官方规范要求：
项目根目录/
└── nativeplugins/          ← 本地原生插件存放目录
    └── MyPlugin/
        ├── android/        ← Android 平台资源
        │   └── libs/
        │       └── lib.so  ← .so 库文件
        └── package.json

打包后期望：
dist/build/app/
└── nativeplugins/          ← 应该被复制过来
    └── MyPlugin/

实际情况（bug）：
dist/build/app/
└── nativeplugins/          ← ❌ 目录不存在！
    （文件缺失导致运行时报错："插件找不到"）
```

**解决方案原理**：

```typescript
export function copyNativeResources(options): Plugin {
  /**
   * Vite 插件钩子：writeBundle
   * 
   * 触发时机：
   * - Vite 完成代码打包后
   * - 所有 .js/.css/.wxml 文件已生成
   * - 但还未生成最终产物之前
   * 
   * 为什么选这个钩子？
   * - 保证 dist 目录已存在
   * - 不影响正常构建流程
   * - 可以追加额外文件
   * 
   * 执行流程：
   * 1. 检查 enable 开关（支持环境变量控制）
   * 2. 验证源目录 nativeplugins 是否存在
   * 3. 计算目标路径 dist/{mode}/{platform}/nativeplugins
   * 4. 使用 fs-extra.copy() 递归复制
   * 5. 输出日志（verbose 模式下）
   */
  return {
    name: 'copy-native-resources',
    apply: 'build',     // 仅在 build 命令时生效
    enforce: 'post',    // 在其他插件之后执行
    
    async writeBundle() {
      // 1. 条件判断
      if (!config.enable) return
      
      // 2. 路径计算
      const sourcePath = path.resolve(projectRoot, sourceDir)
      const targetPath = path.resolve(
        projectRoot, 'dist', buildMode, platform, targetDirName
      )
      
      // 3. 存在性检查
      if (!await fs.pathExists(sourcePath)) return
      
      // 4. 执行复制
      await fs.copy(sourcePath, targetPath, {
        overwrite: true,         // 覆盖旧文件
        errorOnExist: false,     // 存在不报错
        preserveTimestamps: true  // 保持时间戳
      })
    }
  }
}
```

#### 2.3.2 sync-manifest-plugins - Manifest 同步插件

**文件位置**：[sync-manifest-plugins.ts](file:///c:/Users/Administrator/Desktop/考勤/wechat/vite-plugins/sync-manifest-plugins.ts)

**作用**：确保 App 端的 manifest.json 包含正确的原生插件配置。

**为什么需要这个插件？**

```
UniApp App 端有两个 manifest.json：
1. src/manifest.json       ← 开发者编辑的源文件
2. dist/dev/app/manifest.json ← 构建生成的目标文件

问题：
- src/manifest.json 中配置了原生插件
- 但构建时可能没有正确同步到 dist
- 导致 App 运行时找不到原生插件配置

解决：
- 构建完成后，读取 src/manifest.json 的 plugins 配置
- 写入到 dist/dev/app/manifest.json 的 plus.distribute.plugins
```

---

## 3. Flask 后端插件开发

### 3.1 快速开始：创建一个新插件

#### 步骤 1：创建目录结构

```bash
# 进入 Flask 项目根目录
cd /path/to/flask

# 创建插件目录
mkdir -p plugins/my-awesome-plugin/{backend,frontend/webview,static/images}
```

#### 步骤 2：编写 manifest.json

```json
{
  "id": "my-awesome-plugin",
  "name": "我的超棒插件",
  "version": "1.0.0",
  "description": "这是一个示例插件，展示插件开发的完整流程",
  "author": "Your Name",
  "icon": "ri:star-line",
  "entry_type": "webview",
  "tabbar_menu": {
    "enabled": true,
    "icon": "ri:star-line",
    "title": "超棒功能",
    "order": 10
  },
  "endpoints": {
    "backend": {
      "api_prefix": "/web/my-awesome-plugin",
      "routes": ["list", "detail", "create", "update", "delete"]
    },
    "admin": {
      "routes": [
        {
          "path": "/my-awesome-plugin",
          "name": "MyAwesomePlugin",
          "component": "my-awesome-plugin/index",
          "meta": {
            "title": "超棒插件管理",
            "icon": "ri:star-line",
            "roles": ["R_ADMIN"]
          }
        }
      ]
    },
    "webview": {
      "enabled": true,
      "pages": ["list", "detail", "create"]
    }
  },
  "permissions": [
    {
      "key": "my-awesome-plugin:view",
      "name": "查看超棒数据",
      "description": "查看超棒插件的数据列表"
    },
    {
      "key": "my-awesome-plugin:manage",
      "name": "管理超棒数据",
      "description": "创建、编辑、删除超棒数据"
    }
  ],
  "dependencies": []
}
```

#### 步骤 3：编写插件主类

**文件**：`plugins/my-awesome-plugin/backend/__init__.py`

```python
import logging
from datetime import datetime
from typing import Dict, Any, List, Optional

from flask import request, jsonify
from flask_restx import Namespace, Resource, fields
from plugins.base import PluginBase, PluginManifest, TabbarMenuConfig, PluginEndpoints
from extensions import api
import utils.DB as DB

logger = logging.getLogger(__name__)


class Plugin(PluginBase):
    """
    我的超棒插件
    
    功能说明：
    - 提供 CRUD API 接口
    - 支持 WebView 前端展示
    - 集成到小程序 Tabbar 菜单
    """

    def __init__(self):
        super().__init__()
        # 从 manifest.json 加载配置
        self.manifest = PluginManifest(
            id="my-awesome-plugin",
            name="我的超棒插件",
            version="1.0.0",
            description="这是一个示例插件",
            author="Your Name",
            icon="ri:star-line",
            entry_type="webview",
            tabbar_menu=TabbarMenuConfig(
                enabled=True,
                icon="ri:star-line",
                title="超棒功能",
                order=10
            ),
            endpoints=PluginEndpoints(
                backend={
                    "api_prefix": "/web/my-awesome-plugin",
                    "routes": ["list", "detail", "create", "update", "delete"]
                },
                admin={
                    "routes": [
                        {
                            "path": "/my-awesome-plugin",
                            "name": "MyAwesomePlugin",
                            "component": "my-awesome-plugin/index",
                            "meta": {
                                "title": "超棒插件管理",
                                "icon": "ri:star-line",
                                "roles": ["R_ADMIN"]
                            }
                        }
                    ]
                },
                webview={
                    "enabled": True,
                    "pages": ["list", "detail", "create"]
                }
            )
        )

    def register_backend(self, app) -> None:
        """
        注册后端 API
        
        这是唯一必须实现的方法！
        所有 API 路由都在这里定义。
        """
        # 创建 API 命名空间
        ns = Namespace(
            'my-awesome-plugin',
            path='/web/my-awesome-plugin',
            description='我的超棒插件 API'
        )
        
        # 定义数据模型（用于 Swagger 文档）
        item_model = ns.model('AwesomeItem', {
            'id': fields.Integer(description='ID'),
            'title': fields.String(required=True, description='标题'),
            'content': fields.String(description='内容'),
            'created_at': fields.DateTime(description='创建时间'),
        })
        
        create_model = ns.model('CreateAwesomeItem', {
            'title': fields.String(required=True, description='标题'),
            'content': fields.String(description='内容'),
        })

        # ====== 路由：获取列表 ======
        @ns.route('/list')
        class AwesomeListResource(Resource):
            @ns.doc('get_awesome_list')
            @ns.param('page', '页码', type=int, default=1)
            @ns.param('page_size', '每页数量', type=int, default=10)
            def get(self):
                """获取超棒数据列表"""
                try:
                    page = int(request.args.get('page', 1))
                    page_size = int(request.args.get('page_size', 10))
                    
                    # 查询数据库
                    offset = (page - 1) * page_size
                    sql = """
                        SELECT id, title, content, created_at 
                        FROM plugin_awesome_items 
                        ORDER BY created_at DESC 
                        LIMIT %s OFFSET %s
                    """
                    results = DB.fetch_all(sql, (page_size, offset))
                    
                    # 查询总数
                    count_sql = "SELECT COUNT(*) as total FROM plugin_awesome_items"
                    total = DB.fetch_one(count_sql)['total']
                    
                    return {
                        'code': 200,
                        'data': {
                            'list': results,
                            'total': total,
                            'page': page,
                            'page_size': page_size
                        },
                        'msg': '获取成功'
                    }
                except Exception as e:
                    logger.error(f"获取列表失败: {e}")
                    return {'code': 500, 'msg': f'服务器错误: {str(e)}'}

        # ====== 路由：获取详情 ======
        @ns.route('/<int:item_id>')
        class AwesomeDetailResource(Resource):
            @ns.doc('get_awesome_detail')
            @ns.response(200, '成功', item_model)
            @ns.response(404, '未找到')
            def get(self, item_id):
                """获取超棒数据详情"""
                try:
                    sql = """
                        SELECT id, title, content, created_at 
                        FROM plugin_awesome_items 
                        WHERE id = %s
                    """
                    result = DB.fetch_one(sql, (item_id,))
                    
                    if not result:
                        return {'code': 404, 'msg': '数据不存在'}
                    
                    return {
                        'code': 200,
                        'data': result,
                        'msg': '获取成功'
                    }
                except Exception as e:
                    logger.error(f"获取详情失败: {e}")
                    return {'code': 500, 'msg': f'服务器错误: {str(e)}'}

            @ns.doc('delete_awesome')
            @ns.response(200, '删除成功')
            def delete(self, item_id):
                """删除超棒数据"""
                try:
                    sql = "DELETE FROM plugin_awesome_items WHERE id = %s"
                    DB.execute_sql(sql, (item_id,))
                    
                    return {'code': 200, 'msg': '删除成功'}
                except Exception as e:
                    logger.error(f"删除失败: {e}")
                    return {'code': 500, 'msg': f'服务器错误: {str(e)}'}

        # ====== 路由：创建数据 ======
        @ns.route('/create')
        class AwesomeCreateResource(Resource):
            @ns.doc('create_awesome')
            @ns.expect(create_model)
            @ns.response(201, '创建成功')
            def post(self):
                """创建超棒数据"""
                try:
                    data = request.get_json()
                    
                    sql = """
                        INSERT INTO plugin_awesome_items 
                        (title, content, created_at) 
                        VALUES (%s, %s, %s)
                    """
                    DB.execute_sql(sql, (
                        data.get('title'),
                        data.get('content', ''),
                        datetime.now()
                    ))
                    
                    return {'code': 200, 'msg': '创建成功'}
                except Exception as e:
                    logger.error(f"创建失败: {e}")
                    return {'code': 500, 'msg': f'服务器错误: {str(e)}'}

        # 将命名空间注册到全局 API
        api.add_namespace(ns)
        logger.info("[MyAwesomePlugin] 后端 API 注册成功")

    def on_install(self) -> None:
        """安装时创建数据表"""
        logger.info("[MyAwesomePlugin] 开始安装...")
        
        # 创建数据表
        sql = """
            CREATE TABLE IF NOT EXISTS plugin_awesome_items (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL COMMENT '标题',
                content TEXT COMMENT '内容',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间'
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='超棒插件数据表'
        """
        DB.execute_sql(sql)
        
        # 插入示例数据
        sample_sql = """
            INSERT IGNORE INTO plugin_awesome_items (title, content) 
            VALUES ('欢迎使用', '这是超棒插件的示例数据')
        """
        DB.execute_sql(sample_sql)
        
        logger.info("[MyAwesomePlugin] 安装完成")

    def on_uninstall(self) -> None:
        """卸载时清理数据表"""
        logger.warning("[MyAwesomePlugin] 开始卸载...")
        
        # ⚠️ 注意：生产环境应该先备份数据或提供保留选项
        sql = "DROP TABLE IF EXISTS plugin_awesome_items"
        DB.execute_sql(sql)
        
        logger.warning("[MyAwesomePlugin] 卸载完成，数据已清除")
```

### 3.2 数据库模型最佳实践

#### 3.2.1 表命名规范

```python
# ✅ 正确：使用 plugin_ 前缀
table_name = "plugin_announcements"
table_name = "plugin_awesome_items"
table_name = "plugin_survey_questions"

# ❌ 错误：可能与主系统冲突
table_name = "announcements"      # 可能与考勤系统的公告表冲突
table_name = "users"              # 绝对不能使用！
```

#### 3.2.2 字段设计规范

```sql
-- 推荐的字段结构
CREATE TABLE plugin_xxx (
    -- 主键
    id INT AUTO_INCREMENT PRIMARY KEY,
    
    -- 业务字段
    title VARCHAR(200) NOT NULL COMMENT '标题',
    content TEXT COMMENT '内容',
    status TINYINT DEFAULT 1 COMMENT '状态: 1-启用 0-禁用',
    
    -- 关联字段（如果需要关联用户）
    user_id INT DEFAULT NULL COMMENT '创建用户ID',
    
    -- 审计字段（强烈推荐）
    created_by VARCHAR(50) DEFAULT NULL COMMENT '创建人',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP COMMENT '创建时间',
    updated_by VARCHAR(50) DEFAULT NULL COMMENT '更新人',
    updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP COMMENT '更新时间',
    
    -- 软删除（推荐）
    deleted_at DATETIME DEFAULT NULL COMMENT '删除时间',
    
    -- 索引
    INDEX idx_status (status),
    INDEX idx_created_at (created_at),
    INDEX idx_user_id (user_id)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='插件数据表';
```

### 3.3 API 设计规范

#### 3.3.1 统一响应格式

```python
# 成功响应
{
    "code": 200,           # 状态码
    "msg": "操作成功",     # 消息
    "data": { ... }        # 数据（可为null）
}

# 列表响应
{
    "code": 200,
    "msg": "获取成功",
    "data": {
        "list": [...],     # 数据列表
        "total": 100,      # 总条数
        "page": 1,         # 当前页
        "page_size": 10    # 每页数量
    }
}

# 错误响应
{
    "code": 400,           # 客户端错误
    "msg": "参数错误: title不能为空",
    "data": null
}

{
    "code": 403,           # 无权限
    "msg": "您没有执行此操作的权限",
    "data": null
}

{
    "code": 500,           # 服务器错误
    "msg": "内部服务器错误",
    "data": null
}
```

#### 3.3.2 RESTful 路径设计

```python
# 资源命名使用复数形式
path = '/web/my-plugin/items'           # ✅ 正确
path = '/web/my-plugin/item'            # ❌ 错误

# 嵌套资源
path = '/web/my-plugin/items/{id}/comments'  # 获取某项的所有评论
path = '/web/my-plugin/items/{id}/comments/{comment_id}'  # 获取特定评论

# 特殊操作使用动词
path = '/web/my-plugin/items/{id}/publish'    # 发布
path = '/web/my-plugin/items/{id}/archive'    # 归档
path = '/web/my-plugin/items/batch-delete'    # 批量删除
```

---

## 4. 微信小程序端集成

### 4.1 插件配置获取时机

```typescript
// src/App.vue 或 main.ts
import { wechatPluginEngine } from '@/plugin'

export default {
  onLaunch() {
    // 应用启动时初始化插件引擎
    console.log('App Launch')
    
    // 初始化插件系统（异步，不阻塞启动）
    wechatPluginEngine.init().then(() => {
      console.log('插件引擎就绪')
      
      // 获取 Tabbar 配置并更新 UI
      const tabbarItems = wechatPluginEngine.getTabbarItems()
      console.log('Tabbar Items:', tabbarItems)
    }).catch((err) => {
      console.error('插件引擎初始化失败:', err)
    })
  }
}
```

### 4.2 动态 Tabbar 实现

#### 4.2.1 Tabbar 配置类型定义

**文件**：`src/tabbar/types.ts`（已有）

```typescript
export interface CustomTabBarItem {
  text: string           // 显示文字
  pagePath: string       // 页面路径
  iconPath?: string      // 普通图标（可选，使用UnoCSS时不需要）
  selectedIconPath?: string  // 选中图标
  iconType?: 'image' | 'unocss'  // 图标类型
  icon?: string          // UnoCSS 图标类名
  order: number          // 排序权重
}

export interface PluginTabbarItem extends CustomTabBarItem {
  pluginId: string       // 插件ID
  webviewUrl: string     // WebView URL
}
```

#### 4.2.2 动态 Tabbar 组件

```vue
<!-- src/tabbar/DynamicTabbar.vue -->
<script setup lang="ts">
import { ref, computed, watch, onMounted } from 'vue'
import { wechatPluginEngine } from '@/plugin'
import type { PluginTabbarItem } from '@/plugin/types'

const props = defineProps<{
  /** 固定的 Tabbar 项（首页、个人中心等） */
  fixedItems: CustomTabBarItem[]
}>()

const pluginItems = ref<PluginTabbarItem[]>([])
const currentPath = ref('')
const loaded = ref(false)

// 合并固定项和插件项
const allItems = computed(() => {
  const fixed = props.fixedItems.map(item => ({ ...item, pluginId: '' }))
  return [...fixed, ...pluginItems.value]
    .sort((a, b) => a.order - b.order)
})

onMounted(async () => {
  try {
    await wechatPluginEngine.init()
    pluginItems.value = wechatPluginEngine.getTabbarItems()
    loaded.value = true
    
    // 获取当前页面路径
    const pages = getCurrentPages()
    const currentPage = pages[pages.length - 1]
    currentPath.value = currentPage?.route || ''
  } catch (error) {
    console.error('[DynamicTabbar] 初始化失败:', error)
    loaded.value = true  // 即使失败也显示固定项
  }
})

function handleTabSwitch(item: PluginTabbarItem | CustomTabBarItem) {
  if ('pluginId' in item && item.pluginId) {
    // 插件页面 - 跳转到 WebView 容器
    uni.switchTab({
      url: item.pagePath
    })
  } else {
    // 固定页面
    uni.switchTab({
      url: item.pagePath
    })
  }
}
</script>

<template>
  <view class="dynamic-tabbar">
    <view 
      v-for="item in allItems" 
      :key="item.pagePath"
      class="tabbar-item"
      :class="{ active: currentPath.includes(item.pagePath.split('?')[0]) }"
      @tap="handleTabSwitch(item)"
    >
      <!-- UnoCSS 图标 -->
      <text v-if="item.iconType === 'unocss'" :class="item.icon" />
      
      <!-- 图片图标 -->
      <image 
        v-else-if="item.iconType === 'image'"
        :src="currentPath === item.pagePath ? item.selectedIconPath : item.iconPath"
        mode="aspectFit"
      />
      
      <text class="tabbar-text">{{ item.text }}</text>
    </view>
  </view>
</template>
```

### 4.3 WebView 页面容器

**文件**：`src/pages-plugin-webview/index.vue`（已有，以下为增强版说明）

```vue
<script setup lang="ts">
/**
 * WebView 容器页面
 * 
 * 作用：
 * - 作为所有 WebView 插件的统一入口
 * - 根据 URL 参数决定加载哪个插件
 * - 处理小程序与 H5 的双向通信
 * 
 * 访问方式：
 * /pages-plugin-webview/index?plugin={plugin_id}&page={page_name}
 * 
 * 生命周期：
 * onLoad → 获取参数 → 查找插件配置 → 构建 URL → 渲染 WebView
 */

import { ref } from 'vue'
import { onLoad, onUnload } from '@dcloudio/uni-app'
import { 
  wechatPluginEngine, 
  buildWebviewUrl, 
  handleBridgeMessage,
  webviewCacheManager 
} from '@/plugin'

const webviewSrc = ref('')
const pluginId = ref('')
const loading = ref(true)
const pluginName = ref('')
const webViewContext = ref<UniApp.WebViewContext | null>(null)

onLoad((query) => {
  // 1. 参数校验
  if (!query?.plugin) {
    uni.showToast({ title: '插件参数缺失', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  pluginId.value = query.plugin
  
  // 2. 获取插件配置
  const config = wechatPluginEngine.getPluginConfig(pluginId.value)
  if (!config) {
    uni.showToast({ title: '插件不存在或未启用', icon: 'none' })
    setTimeout(() => uni.navigateBack(), 1500)
    return
  }

  // 3. 缓存检查
  const shouldReload = webviewCacheManager.shouldReload(
    pluginId.value, 
    config.version || '1.0.0'
  )
  
  if (!shouldReload && webviewSrc.value) {
    // 使用缓存
    loading.value = false
    return
  }

  // 4. 构建 WebView URL
  pluginName.value = config.name
  webviewSrc.value = buildWebviewUrl(config.webview_url)
  loading.value = false

  // 5. 更新缓存
  webviewCacheManager.setCache(
    pluginId.value, 
    webviewSrc.value, 
    config.version || '1.0.0'
  )

  // 6. 设置导航栏标题
  uni.setNavigationBarTitle({ title: config.name })
})

function onWebviewMessage(e: any): void {
  /**
   * 处理 WebView 发送的消息
   * 
   * 消息格式（H5 端发送）：
   * wx.miniProgram.postMessage({
   *   data: [{
   *     type: 'navigate',
   *     payload: { url: '/pages/detail?id=123' }
   *   }]
   * })
   * 
   * 注意：
   * - 消息在特定时机触发（分享、返回、销毁等）
   * - 不是实时推送，有延迟
   * - data 必须是数组
   */
  try {
    const rawData = e.detail?.data
    if (!rawData) return

    const data = typeof rawData === 'string' ? JSON.parse(rawData) : rawData
    if (Array.isArray(data)) {
      data.forEach((msg) => handleBridgeMessage(msg))
    } else {
      handleBridgeMessage(data)
    }
  } catch (error) {
    console.error('[WebView] 消息解析失败:', error)
  }
}

// 向 WebView 发送消息
function sendMessageToWebView(msg: Record<string, any>): void {
  if (webViewContext.value) {
    webViewContext.value.postMessage({ data: msg })
  }
}

onUnload(() => {
  // 清理资源
  webViewContext.value = null
})
</script>

<template>
  <view class="webview-container">
    <!-- 加载状态 -->
    <view v-if="loading" class="loading-wrap flex flex-col items-center justify-center h-screen">
      <qiun-loading />
      <text class="mt-2 text-gray-400 text-sm">正在加载{{ pluginName }}...</text>
    </view>
    
    <!-- WebView 容器 -->
    <web-view
      v-else-if="webviewSrc"
      :src="webviewSrc"
      :update-title="true"
      @message="onWebviewMessage"
      @load="onWebViewLoad"
      @error="onWebViewError"
    />
  </view>
</template>
```

---

## 5. WebView 桥接机制

### 5.1 通信协议详解

#### 5.1.1 消息类型定义

**文件**：`src/plugin/types.ts`

```typescript
export interface BridgeMessage {
  /** 消息类型 */
  type: 'navigate' | 'refresh_token' | 'close' | 'share' | 'toast' | 'set_tabbar_badge'
  
  /** 消息载荷 */
  payload: Record<string, any>
}
```

#### 5.1.2 H5 端发送消息（WebView 内）

```javascript
// 在 WebView 的 H5 页面中使用

/**
 * 方式一：使用 wx.miniProgram.postMessage（官方推荐）
 * 
 * 特点：
 * - 在特定时机触发（用户点击右上角菜单、返回等）
 * - 不是实时通信
 * - data 必须是数组
 * 
 * 适用场景：
 * - 分享数据传递
 * - 页面返回时的数据回传
 */
wx.miniProgram.postMessage({ 
  data: [{
    type: 'navigate',
    payload: { 
      url: '/pages/index/index' 
    }
  }] 
})

/**
 * 方式二：使用 JSSDK（实时通信）
 * 
 * 特点：
 * - 可以实时发送消息
 * - 需要引入 JSSDK
 * 
 * 适用场景：
 * - 实时状态同步
 * - 即时操作触发
 */
document.addEventListener('WeixinJSSDKReady', function() {
  wx.invoke('postMessage', {
    msg: JSON.stringify({
      type: 'toast',
      payload: { text: 'Hello from WebView!' }
    })
  })
})
```

#### 5.1.3 封装 H5 端 Bridge SDK

```javascript
// bridge-sdk.js（放在 WebView 的 H5 项目中）

class MiniProgramBridge {
  constructor() {
    this.isMiniProgram = this.detectEnvironment()
  }
  
  detectEnvironment() {
    return /miniProgram/i.test(navigator.userAgent) || 
           window.__wxjs_environment === 'miniprogram'
  }
  
  /**
   * 导航到小程序原生页面
   */
  navigateTo(url) {
    if (!this.isMiniProgram) {
      window.location.href = url
      return
    }
    
    this.postMessage({
      type: 'navigate',
      payload: { url }
    })
  }
  
  /**
   * 显示原生 Toast
   */
  showToast(title, icon = 'none') {
    if (!this.isMiniProgram) {
      alert(title)
      return
    }
    
    this.postMessage({
      type: 'toast',
      payload: { text: title, icon }
    })
  }
  
  /**
   * 关闭当前页面（返回上一页）
   */
  close() {
    if (!this.isMiniProgram) {
      window.history.back()
      return
    }
    
    this.postMessage({ type: 'close', payload: {} })
  }
  
  /**
   * 请求刷新 Token
   */
  async refreshToken() {
    if (!this.isMiniProgram) return null
    
    return new Promise((resolve) => {
      // 存储回调，等待小程序返回新 token
      window.__tokenCallback = resolve
      
      this.postMessage({ type: 'refresh_token', payload: {} })
      
      // 超时处理
      setTimeout(() => resolve(null), 5000)
    })
  }
  
  /**
   * 触发分享
   */
  share(title, path) {
    if (!this.isMiniProgram) return
    
    this.postMessage({
      type: 'share',
      payload: { title, path }
    })
  }
  
  /**
   * 发送消息到小程序
   */
  postMessage(message) {
    if (typeof wx !== 'undefined' && wx.miniProgram) {
      wx.miniProgram.postMessage({ data: [message] })
    }
    
    // 同时尝试 JSSDK 方式（某些场景需要）
    if (typeof wx !== 'undefined' && wx.invoke) {
      wx.invoke('postMessage', { msg: JSON.stringify(message) })
    }
  }
  
  /**
   * 获取 URL 参数中的初始数据
   */
  getInitParams() {
    const params = new URLSearchParams(window.location.search)
    return {
      token: params.get('token'),
      platform: params.get('platform'),
      timestamp: params.get('timestamp')
    }
  }
}

// 导出全局实例
window.mpBridge = new MiniProgramBridge()
```

### 5.2 Token 传递与安全机制

#### 5.2.1 Token 传递流程

```
┌────────────────┐     1. 用户登录      ┌────────────────┐
│   小程序登录     │ ──────────────────► │   Flask 后端    │
│                │                      │                │
│  存储 Token    │ ◄────────────────── │  返回 Token    │
└───────┬────────┘                      └────────────────┘
        │
        │ 2. 打开插件 WebView
        ▼
┌────────────────┐     3. URL携带Token   ┌────────────────┐
│  WebView 容器   │ ──────────────────► │   H5 页面       │
│                │   ?token=xxx&...     │                │
│                │                      │  4. 解析Token   │
└────────────────┘                      └───────┬────────┘
                                                │
                                                │ 5. API请求携带Token
                                                ▼
                                        ┌────────────────┐
                                        │   Flask 后端    │
                                        │  验证Token有效性 │
                                        └────────────────┘
```

#### 5.2.2 H5 端 Token 管理

```javascript
// auth.js（H5 项目中）

class AuthManager {
  constructor() {
    this.token = null
    this.tokenExpiresAt = 0
    this.bridge = window.mpBridge
    this.init()
  }
  
  init() {
    // 从 URL 参数获取初始 Token
    const params = this.bridge.getInitParams()
    if (params.token) {
      this.setToken(params.token)
    }
    
    // 监听 Token 刷新事件
    window.addEventListener('message', (event) => {
      if (event.data?.type === 'token_refreshed') {
        this.setToken(event.data.token)
      }
    })
  }
  
  setToken(token) {
    this.token = token
    this.tokenExpiresAt = Date.now() + 2 * 60 * 60 * 1000  // 2小时过期
    
    // 存储到 sessionStorage（不使用 localStorage，更安全）
    sessionStorage.setItem('mp_token', token)
  }
  
  getToken() {
    // 检查是否过期
    if (Date.now() > this.tokenExpiresAt) {
      // 尝试刷新
      this.refreshToken()
      return this.token  // 返回旧token，同时异步刷新
    }
    
    return this.token || sessionStorage.getItem('mp_token')
  }
  
  async refreshToken() {
    try {
      const newToken = await this.bridge.refreshToken()
      if (newToken) {
        this.setToken(newToken)
      }
    } catch (error) {
      console.error('Token 刷新失败:', error)
    }
  }
  
  /**
   * 封装 fetch，自动附加 Token
   */
  async request(url, options = {}) {
    const token = this.getToken()
    
    const headers = {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
      ...(token ? { 'Authorization': `Bearer ${token}` } : {})
    }
    
    const response = await fetch(url, {
      ...options,
      headers
    })
    
    // 处理 401 未授权
    if (response.status === 401) {
      await this.refreshToken()
      // 重试一次
      return this.request(url, options)
    }
    
    return response
  }
}

window.authManager = new AuthManager()
```

---

## 6. 完整开发实战示例

### 6.1 示例：公告通知插件

让我们完整实现一个"公告通知"插件，涵盖三端开发。

#### 6.1.1 Flask 后端实现

**目录结构**：
```
plugins/announcement/
├── manifest.json
├── backend/
│   ├── __init__.py
│   ├── routes.py
│   └── models.py
└── frontend/
    └── webview/
        ├── list.html
        └── detail.html
```

**manifest.json**：
```json
{
  "id": "announcement",
  "name": "公告通知",
  "version": "1.0.0",
  "description": "校园公告通知管理系统",
  "author": "System",
  "icon": "ri:notification-line",
  "entry_type": "webview",
  "tabbar_menu": {
    "enabled": true,
    "icon": "ri:notification-line",
    "title": "公告通知",
    "order": 5
  },
  "endpoints": {
    "backend": {
      "api_prefix": "/web/announcement",
      "routes": ["list", "detail", "create", "update", "delete", "toggle-top"]
    },
    "admin": {
      "routes": [
        {
          "path": "/announcement/manage",
          "name": "AnnouncementManage",
          "component": "announcement/manage/index",
          "meta": {
            "title": "公告管理",
            "icon": "ri:notification-line",
            "roles": ["R_ADMIN"]
          }
        }
      ]
    },
    "webview": {
      "enabled": true,
      "pages": ["list", "detail"]
    }
  },
  "permissions": [
    {"key": "announcement:view", "name": "查看公告"},
    {"key": "announcement:manage", "name": "管理公告"}
  ],
  "dependencies": []
}
```

**backend/__init__.py**：
```python
import logging
from datetime import datetime
from plugins.base import PluginBase, PluginManifest, TabbarMenuConfig, PluginEndpoints
from flask_restx import Namespace, Resource, fields
from extensions import api
import utils.DB as DB

logger = logging.getLogger(__name__)


class Plugin(PluginBase):
    def __init__(self):
        super().__init__()
        self.manifest = PluginManifest(
            id="announcement",
            name="公告通知",
            version="1.0.0",
            description="校园公告通知管理系统",
            author="System",
            icon="ri:notification-line",
            entry_type="webview",
            tabbar_menu=TabbarMenuConfig(
                enabled=True,
                icon="ri:notification-line",
                title="公告通知",
                order=5
            ),
            endpoints=PluginEndpoints(
                backend={"api_prefix": "/web/announcement"},
                admin={"routes": [...]},
                webview={"enabled": True, "pages": ["list", "detail"]}
            )
        )

    def register_backend(self, app):
        ns = Namespace('announcement', path='/web/announcement', description='公告API')
        
        announcement_model = ns.model('Announcement', {
            'id': fields.Integer(),
            'title': fields.String(required=True),
            'content': fields.String(),
            'is_top': fields.Boolean(default=False),
            'is_published': fields.Boolean(default=False),
            'created_at': fields.DateTime(),
            'author_name': fields.String()
        })

        @ns.route('/list')
        class AnnouncementList(Resource):
            def get(self):
                """获取公告列表（分页）"""
                page = int(request.args.get('page', 1))
                page_size = int(request.args.get('page_size', 10))
                
                offset = (page - 1) * page_size
                sql = """
                    SELECT a.*, u.nickname as author_name 
                    FROM plugin_announcements a
                    LEFT JOIN users u ON a.created_by = u.id
                    WHERE a.deleted_at IS NULL
                    AND a.is_published = 1
                    ORDER BY a.is_top DESC, a.created_at DESC
                    LIMIT %s OFFSET %s
                """
                items = DB.fetch_all(sql, (page_size, offset))
                
                count_sql = """
                    SELECT COUNT(*) as total 
                    FROM plugin_announcements 
                    WHERE deleted_at IS NULL AND is_published = 1
                """
                total = DB.fetch_one(count_sql)['total']
                
                return {'code': 200, 'data': {'list': items, 'total': total}, 'msg': 'success'}

        @ns.route('/<int:id>')
        class AnnouncementDetail(Resource):
            def get(self, id):
                """获取公告详情"""
                sql = """
                    SELECT a.*, u.nickname as author_name 
                    FROM plugin_announcements a
                    LEFT JOIN users u ON a.created_by = u.id
                    WHERE a.id = %s AND a.deleted_at IS NULL
                """
                item = DB.fetch_one(sql, (id,))
                
                if not item:
                    return {'code': 404, 'msg': '公告不存在'}
                
                # 阅读量+1
                DB.execute_sql(
                    "UPDATE plugin_announcements SET view_count = view_count + 1 WHERE id = %s",
                    (id,)
                )
                
                return {'code': 200, 'data': item, 'msg': 'success'}
        
        api.add_namespace(ns)

    def on_install(self):
        sql = """
            CREATE TABLE IF NOT EXISTS plugin_announcements (
                id INT AUTO_INCREMENT PRIMARY KEY,
                title VARCHAR(200) NOT NULL COMMENT '标题',
                content LONGTEXT COMMENT '内容（支持HTML）',
                summary VARCHAR(500) COMMENT '摘要',
                cover_image VARCHAR(500) COMMENT '封面图片URL',
                is_top TINYINT DEFAULT 0 COMMENT '是否置顶: 0-否 1-是',
                is_published TINYINT DEFAULT 0 COMMENT '是否发布: 0-草稿 1-发布',
                view_count INT DEFAULT 0 COMMENT '阅读量',
                created_by INT COMMENT '创建人ID',
                created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
                updated_at DATETIME DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
                deleted_at DATETIME DEFAULT NULL COMMENT '软删除时间',
                INDEX idx_published_is_top (is_published, is_top),
                INDEX idx_created_at (created_at)
            ) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COMMENT='公告表'
        """
        DB.execute_sql(sql)
        logger.info("[Announcement] 数据表创建成功")

    def on_uninstall(self):
        DB.execute_sql("DROP TABLE IF EXISTS plugin_announcements")
        logger.warning("[Announcement] 数据表已删除")
```

#### 6.1.2 WebView H5 页面实现

**frontend/webview/list.html**：
```html
<!DOCTYPE html>
<html lang="zh-CN">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0, maximum-scale=1.0, user-scalable=no">
    <title>公告通知</title>
    <script src="https://cdn.tailwindcss.com"></script>
    <style>
        body { 
            background-color: #f5f5f5; 
            padding-bottom: env(safe-area-inset-bottom);
        }
        .announcement-item {
            transition: all 0.2s ease;
        }
        .announcement-item:active {
            transform: scale(0.98);
            background-color: #f0f0f0;
        }
        .top-badge {
            background: linear-gradient(135deg, #ff6b6b, #ee5a24);
        }
        .loading-spinner {
            border: 3px solid #f3f3f3;
            border-top: 3px solid #3498db;
            border-radius: 50%;
            width: 30px;
            height: 30px;
            animation: spin 1s linear infinite;
        }
        @keyframes spin {
            0% { transform: rotate(0deg); }
            100% { transform: rotate(360deg); }
        }
    </style>
</head>
<body class="bg-gray-50 min-h-screen">
    <!-- 顶部标题栏 -->
    <header class="bg-white sticky top-0 z-10 shadow-sm">
        <div class="flex items-center justify-between px-4 py-3">
            <h1 class="text-lg font-bold text-gray-800">📢 公告通知</h1>
            <button onclick="mpBridge.close()" class="text-gray-500 text-sm">
                ✕ 关闭
            </button>
        </div>
    </header>

    <!-- 主内容区 -->
    <main id="app" class="p-4">
        <!-- 加载状态 -->
        <div id="loading" class="flex flex-col items-center py-12">
            <div class="loading-spinner"></div>
            <p class="mt-3 text-gray-400 text-sm">加载中...</p>
        </div>

        <!-- 公告列表 -->
        <div id="list" class="space-y-3 hidden"></div>

        <!-- 空状态 -->
        <div id="empty" class="hidden flex-col items-center py-12">
            <div class="text-6xl mb-4">📭</div>
            <p class="text-gray-400">暂无公告</p>
        </div>

        <!-- 加载更多 -->
        <button id="loadMore" onclick="loadMore()" 
                class="hidden w-full py-3 mt-4 bg-white rounded-lg text-gray-600 text-sm">
            加载更多
        </button>
    </main>

    <script src="./bridge-sdk.js"></script>
    <script>
        // ====== 配置 ======
        const CONFIG = {
            apiUrl: '/web/announcement',
            pageSize: 10
        };

        let currentPage = 1;
        let hasMore = true;

        // ====== 初始化 ======
        document.addEventListener('DOMContentLoaded', async () => {
            await loadAnnouncements();
        });

        // ====== API 请求封装 ======
        async function apiRequest(path, options = {}) {
            const url = CONFIG.apiUrl + path;
            const token = authManager.getToken();
            
            try {
                const response = await authManager.request(url, {
                    method: options.method || 'GET',
                    headers: {
                        'Content-Type': 'application/json'
                    },
                    body: options.body ? JSON.stringify(options.body) : undefined
                });
                
                const result = await response.json();
                
                if (result.code !== 200) {
                    mpBridge.showToast(result.msg || '请求失败');
                    return null;
                }
                
                return result.data;
            } catch (error) {
                console.error('API Error:', error);
                mpBridge.showToast('网络异常');
                return null;
            }
        }

        // ====== 加载公告列表 ======
        async function loadAnnouncements(append = false) {
            showLoading(true);
            
            const data = await apiRequest('/list', {
                method: 'GET'
            } + `?page=${currentPage}&page_size=${CONFIG.pageSize}`);
            
            showLoading(false);
            
            if (!data) return;
            
            renderList(data.list, append);
            
            hasMore = data.total > currentPage * CONFIG.pageSize;
            document.getElementById('loadMore').classList.toggle('hidden', !hasMore);
            
            if (!append && data.list.length === 0) {
                document.getElementById('empty').classList.remove('hidden');
                document.getElementById('empty').classList.add('flex');
            }
        }

        // ====== 渲染列表 ======
        function renderList(items, append = false) {
            const container = document.getElementById('list');
            container.classList.remove('hidden');
            
            if (!append) container.innerHTML = '';
            
            items.forEach(item => {
                const div = document.createElement('div');
                div.className = 'announcement-item bg-white rounded-xl p-4 shadow-sm cursor-pointer';
                div.onclick = () => goToDetail(item.id);
                
                div.innerHTML = `
                    <div class="flex items-start gap-3">
                        ${item.is_top ? '<span class="top-badge text-white text-xs px-2 py-0.5 rounded-full shrink-0">置顶</span>' : ''}
                        <div class="flex-1 min-w-0">
                            <h3 class="font-medium text-gray-800 line-clamp-2">${escapeHtml(item.title)}</h3>
                            ${item.summary ? `<p class="mt-1 text-sm text-gray-500 line-clamp-2">${escapeHtml(item.summary)}</p>` : ''}
                            <div class="mt-2 flex items-center gap-3 text-xs text-gray-400">
                                <span>${item.author_name || '系统'}</span>
                                <span>${formatTime(item.created_at)}</span>
                                ${item.view_count > 0 ? `<span>👁 ${item.view_count}</span>` : ''}
                            </div>
                        </div>
                    </div>
                `;
                
                container.appendChild(div);
            });
        }

        // ====== 跳转详情 ======
        function goToDetail(id) {
            // 方案一：在同一 WebView 中打开详情页
            window.location.href = `${window.location.pathname.replace(/\/[^/]*$/, '')}/detail.html?id=${id}&${window.location.search.slice(1)}`;
            
            // 方案二：使用 Bridge 通知小程序跳转（如果详情也是原生页面）
            // mpBridge.navigateTo(`/pages-plugin-webview/index?plugin=announcement&page=detail&id=${id}`);
        }

        // ====== 加载更多 ======
        function loadMore() {
            currentPage++;
            loadAnnouncements(true);
        }

        // ====== 工具函数 ======
        function showLoading(show) {
            document.getElementById('loading').classList.toggle('hidden', !show);
        }

        function escapeHtml(text) {
            const div = document.createElement('div');
            div.textContent = text;
            return div.innerHTML;
        }

        function formatTime(dateStr) {
            const date = new Date(dateStr);
            const now = new Date();
            const diff = now - date;
            
            if (diff < 60000) return '刚刚';
            if (diff < 3600000) return `${Math.floor(diff / 60000)}分钟前`;
            if (diff < 86400000) return `${Math.floor(diff / 3600000)}小时前`;
            if (diff < 604800000) return `${Math.floor(diff / 86400000)}天前`;
            
            return date.toLocaleDateString('zh-CN');
        }

        // 下拉刷新（WebView 内模拟）
        let startY = 0;
        document.addEventListener('touchstart', e => startY = e.touches[0].clientY);
        document.addEventListener('touchend', e => {
            if (e.changedTouches[0].clientY - startY > 100 && window.scrollY === 0) {
                currentPage = 1;
                loadAnnouncements();
            }
        });
    </script>
</body>
</html>
```

---

## 7. 高级特性与最佳实践

### 7.1 插件依赖管理

```json
// manifest.json
{
  "dependencies": ["user-center", "notification"]
}
```

**依赖解析原理**（[dependency.py](file:///c:/Users/Administrator/Desktop/考勤/flask/plugins/dependency.py)）：

```python
class PluginDependencyResolver:
    """
    依赖解析器 - 基于 DAG（有向无环图）
    
    算法：拓扑排序（Kahn's Algorithm）
    
    依赖规则：
    1. 循环依赖 → 报错拒绝安装
    2. 缺失依赖 → 提示安装依赖插件
    3. 版本冲突 → 提示升级/降级
    """
    
    def build_graph(self, manifests):
        """构建依赖关系图"""
        # ...
    
    def resolve_install_order(self, plugin_id):
        """解析安装顺序"""
        # 返回拓扑排序结果
```

### 7.2 WebSocket 集成

**文件**：[websocket_helper.py](file:///c:/Users/Administrator/Desktop/考勤/flask/plugins/websocket_helper.py)

```python
class PluginWebSocketHelper:
    """
    WebSocket 帮助类 - 让插件轻松使用 WebSocket
    """
    
    def emit_to_room(self, room, event, data):
        """向房间广播消息"""
        socketio.emit(event, data, room=room)
    
    def emit_to_user(self, user_id, event, data):
        """向特定用户发送消息"""
        socketio.emit(event, data, room=f'user_{user_id}')
    
    def on_event(self, event_name, handler):
        """注册事件处理器"""
        socketio.on_event(event_name, handler)

# 在插件中使用
class MyPlugin(PluginBase):
    def register_backend(self, app):
        # 发送实时通知
        self.ws.emit_to_room('announcement', 'new_announcement', {
            'id': 123,
            'title': '新公告'
        })
```

### 7.3 缓存策略

```python
from utils.cache import cache_manager

class MyPlugin(PluginBase):
    def register_backend(self, app):
        @ns.route('/list')
        class ListResource(Resource):
            def get(self):
                # 尝试从缓存获取
                cache_key = 'plugin:announcement:list:page1'
                cached = cache_manager.get(cache_key)
                
                if cached:
                    return {'code': 200, 'data': cached}
                
                # 缓存未命中，查询数据库
                data = query_from_db()
                
                # 写入缓存（5分钟过期）
                cache_manager.set(cache_key, data, ttl=300)
                
                return {'code': 200, 'data': data}
```

### 7.4 权限控制

```python
from utils.permission_utils import require_permission

class MyPlugin(PluginBase):
    def register_backend(self, app):
        @ns.route('/create')
        @require_permission('announcement:manage')  # 装饰器验证权限
        class CreateResource(Resource):
            def post(self):
                # 只有具备 announcement:manage 权限的用户才能访问
                pass
```

### 7.5 日志与审计

```python
from plugins.logger import plugin_logger, audit_logger

class MyPlugin(PluginBase):
    def on_install(self):
        plugin_logger.info("插件安装开始")
        audit_logger.log_action(
            action='install',
            plugin_id=self.manifest.id,
            user_id=current_user.id,
            details='安装公告插件'
        )
```

---

## 8. 调试与排错指南

### 8.1 常见问题排查

#### 问题 1：插件安装后不显示

**排查步骤**：

```bash
# 1. 检查插件是否已安装
curl http://localhost:5000/web/plugins

# 2. 检查插件是否已启用
curl http://localhost:5000/web/plugins/announcement

# 3. 查看 Flask 日志
tail -f logs/flask.log | grep -i "plugin"

# 4. 检查 manifest.json 格式
cat plugins/announcement/manifest.json | python -m json.tool

# 5. 测试 API 是否可达
curl http://localhost:5000/web/announcement/list
```

**常见原因**：
- ❌ `tabbar_menu.enabled` 未设置为 `true`
- ❌ 插件未启用（状态为 installed 而非 enabled）
- ❌ manifest.json JSON 格式错误
- ❌ `register_backend()` 方法抛出异常

#### 问题 2：WebView 页面空白

**排查步骤**：

```bash
# 1. 检查 WebView URL 是否正确
curl -I "http://localhost:5000/plugins/announcement/webview/list.html"

# 2. 检查静态资源服务是否注册
curl http://localhost:5000/plugins/announcement/static/test.txt

# 3. 查看小程序控制台是否有报错
# 在微信开发者工具中查看 Console 面板

# 4. 检查网络请求
# 在 Network 面板查看 WebView 加载的资源
```

**常见原因**：
- ❌ `frontend_server` 未正确注册
- ❌ HTML 文件路径错误
- ❌ CORS 跨域问题（H5 和小程序域名不同）
- ❌ Token 参数缺失导致 API 请求失败

#### 问题 3：Tabbar 菜单不显示

**排查步骤**：

```javascript
// 在小程序控制台执行
console.log(wechatPluginEngine.isLoaded())  // 应该返回 true
console.log(wechatPluginEngine.getTabbarItems())  // 应该返回数组

// 手动调用接口测试
uni.request({
  url: 'http://your-api.com/web/plugins/configs/tabbar-menu',
  success: (res) => console.log(res.data)
})
```

**常见原因**：
- ❌ `wechatPluginEngine.init()` 未完成
- ❌ 后端接口返回空数组
- ❌ 插件的 `tabbar_menu.enabled` 为 false
- ❌ 小程序端未正确接收配置

### 8.2 调试技巧

#### Flask Shell 调试

```bash
# 进入 Flask Shell
flask shell

# 查看插件管理器状态
>>> from plugins.manager import plugin_manager
>>> plugin_manager.get_plugin_list()

# 手动安装/卸载插件
>>> plugin_manager.install_plugin('announcement')

# 查看路由注册情况
>>> from plugins.router_registry import plugin_router_registry
>>> plugin_router_registry.get_all_routes()

# 查看状态机状态
>>> plugin_manager.get_plugin_state('announcement')
```

#### 小程序调试

```javascript
// 在 App.vue 中添加调试代码
onLaunch() {
  wechatPluginEngine.init().then(() => {
    // 调试输出
    console.group('🔧 Plugin Engine Debug')
    console.log('Loaded:', wechatPluginEngine.isLoaded())
    console.log('Configs:', wechatPluginEngine.getAllConfigs())
    console.log('Tabbar Items:', wechatPluginEngine.getTabbarItems())
    console.groupEnd()
  })
}
```

#### WebView H5 调试

```html
<!-- 在 H5 页面中添加调试面板 -->
<div id="debug-panel" style="position:fixed;bottom:0;left:0;right:0;background:#000;color:#0f0;padding:10px;font-size:12px;z-index:9999;">
  <pre id="debug-log"></pre>
</div>

<script>
function debugLog(msg) {
  const log = document.getElementById('debug-log')
  log.textContent += new Date().toLocaleTimeString() + ': ' + msg + '\n'
}
debugLog('Page loaded')
debugLog('Token: ' + (authManager.getToken() ? '✓' : '✗'))
debugLog('Platform: ' + (window.mpBridge?.isMiniProgram ? 'MiniProgram' : 'Browser'))
</script>
```

### 8.3 性能监控

```python
# 在插件中添加性能埋点
import time

class MyPlugin(PluginBase):
    def register_backend(self, app):
        @ns.route('/list')
        class ListResource(Resource):
            def get(self):
                start_time = time.time()
                
                # 业务逻辑...
                data = query_data()
                
                duration = time.time() - start_time
                
                # 记录慢查询
                if duration > 1.0:
                    plugin_logger.warning(f"慢查询警告: {duration:.2f}s")
                
                # 返回响应头（可选）
                # return Response(..., headers={'X-Response-Time': str(duration)})
                
                return {'code': 200, 'data': data}
```

---

## 附录 A：快速参考卡片

### 插件开发 Checklist

- [ ] 创建插件目录 `plugins/{id}/`
- [ ] 编写 `manifest.json`
- [ ] 实现 `backend/__init__.py` 继承 `PluginBase`
- [ ] 实现 `register_backend()` 方法
- [ ] 实现 `on_install()` 创建数据表
- [ ] 实现 `on_uninstall()` 清理数据
- [ ] 创建 `frontend/webview/` 页面（如需）
- [ ] 配置 `tabbar_menu`（如需显示在Tabbar）
- [ ] 测试安装/卸载/启用/禁用流程
- [ ] 测试三端联动（后端API + 小程序 + 管理后台）

### 常用命令速查

```bash
# Flask 操作
flask run                          # 启动开发服务器
flask shell                        # 进入交互式Shell

# 插件管理 API
GET  /web/plugins                  # 获取插件列表
POST /web/plugins/{id}/install     # 安装插件
POST /web/plugins/{id}/uninstall   # 卸载插件
POST /web/plugins/{id}/enable      # 启用插件
POST /web/plugins/{id}/disable     # 禁用插件
POST /web/plugins/{id}/reload      # 重载插件

# 配置获取 API
GET  /web/plugins/configs/admin    # 管理后台配置
GET  /web/plugins/configs/wechat   # 小程序配置
GET  /web/plugins/configs/tabbar-menu  # Tabbar配置
GET  /web/plugins/configs/routes   # 路由配置
```

### 核心文件索引

| 文件 | 作用 |
|------|------|
| `plugins/base.py` | 插件基类定义 |
| `plugins/manager.py` | 插件管理器（核心） |
| `plugins/loader.py` | 插件加载器 |
| `plugins/registry.py` | 插件注册表 |
| `plugins/lifecycle.py` | 生命周期管理 |
| `plugins/state_machine.py` | 状态机 |
| `plugins/dependency.py` | 依赖解析 |
| `plugins/router_registry.py` | 路由注册 |
| `plugins/frontend_server.py` | 前端静态资源服务 |
| `src/plugin/engine.ts` | 小程序插件引擎 |
| `src/plugin/webview-bridge.ts` | WebView桥接 |
| `src/plugin/cache-manager.ts` | 缓存管理 |
| `src/plugin/types.ts` | 类型定义 |

---

**文档版本**：v2.0.0  
**最后更新**：2026-01-10  
**适用范围**：Flask 后端 + 微信小程序 + Art-Design-Pro 管理后台
