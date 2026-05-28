# RDMS Frontend Documentation

> 数字口腔多模态数据管理系统 (Research Data Management System)

## 1. 角色与权限体系 (RBAC)

系统分为三种核心角色，对应不同的侧边栏和仪表盘视图。

| 角色             | 英文标识       | 职责描述                | 侧边栏 (Sidebar)                          | 仪表盘 (Dashboard)                              |
| :--------------- | :------------- | :---------------------- | :---------------------------------------- | :---------------------------------------------- |
| **管理员** | `admin`      | 系统运维、用户审计      | 首页,**用户管理**, 课题, 档案, 设置 | **审计日志**, 系统状态 (无图表)           |
| **医生**   | `doctor`     | 临床数据采集 (科研方向) | 首页, 课题, 档案, 设置                    | **课题趋势**, **患者统计** (图表化) |
| **研究员** | `researcher` | 数据分析、质量控制      | 首页, 课题, 档案, 设置                    | **课题趋势**, **患者统计**(图表化)       |

## 2. 仪表盘设计 (Dashboard Widgets)

### 🛡️ 管理员 (Admin)

不展示科研图表，专注于系统安全与管理。

1. **快捷指标**: 用户总数、今日活跃、系统存储用量。
2. **核心模块**: **审计日志 (Audit Log)** - 表格展示。
   * *字段*: 操作人, 操作对象, 动作(增删改), 时间, IP地址。

### 👨‍⚕️ 医生 / 🔬 研究员 (Doctor / Researcher)

专注于科研数据的积累与质量。

1. **核心指标**: 参与课题数、累计患者数、待上传数据。
2. **可视化图表**:
   * **患者入组趋势 (Area Chart)**: 展示每月新增入组的患者数量。
   * **课题分布 (Pie Chart)**: (例如: 牙周炎 vs 种植体 vs 黏膜病)。

## 3. 技术实现方案

### 审计日志 (Audit Logs)

* **后端实现**: 在 Django 中创建 `AuditLog` 模型。
  * 使用 **Django Signals** (post_save/post_delete) 或 **Middleware** 自动拦截关键操作 (Create Project, Update Patient)。
  * 记录: `user_id`, `action`, `model_name`, `object_id`, `timestamp`, `ip_address`。
* **前端**: 一个标准的 `DataTable` 组件，支持按时间、用户筛选。

### 系统状态 (System Status)

* **存储健康度**:
  * 后端计算 `media/` 文件夹的总大小，或者查询数据库大小。
* **服务运行**:
  * 后端简单的 `HealthCheck` API，返回数据库连接状态 (True/False)。

## 4. 目录结构

* `app/(admin)`: 管理后台路由
* `components/app-sidebar.tsx`: 侧边栏入口 (包含 NavMain, NavUser)
* `components/nav-*.tsx`: 拆分的侧边栏模块
* `components/dashboard/*`: 不同角色的仪表盘组件 (待开发)
