# 数字口腔多模态数据管理系统 - 后端

Django + DRF 后端服务

## 快速开始

### 1. 激活虚拟环境

```powershell
.venv\Scripts\activate.ps1
```

### 2. 安装依赖

```bash
pip install -r requirements.txt
```

### 3. 运行迁移

```bash
python manage.py migrate
```

### 4. 创建超级用户

```bash
python manage.py createsuperuser
```

### 5. 启动开发服务器

```bash
python manage.py runserver
```

访问：
- API 根路径: http://127.0.0.1:8000/api/
- Django Admin: http://127.0.0.1:8000/admin/

## 数据库模型

### 用户 (users.User)
- username: 用户名
- email: 邮箱（唯一，用于登录）
- role: 角色 (admin/doctor/researcher)
- avatar: 头像 URL

### 患者 (patients.Patient)
- name: 患者姓名
- case_number: 病案号（唯一）
- gender: 性别
- birth_date: 出生日期
- status: 状态（已确认/待确认）

### 就诊记录 (patients.VisitRecord)
- patient: 关联患者
- visit_date: 就诊日期
- treatment_stage: 治疗阶段
- clinical_diagnosis: 临床诊断

### 科研项目 (projects.Project)
- title: 项目名称
- description: 项目描述
- status: 状态 (Active/Completed/Planning)
- members: 项目成员（多对多）
- patients: 项目患者（多对多）

### 项目成员 (projects.ProjectMember)
- project: 关联项目
- user: 关联用户
- joined_at: 加入时间

### 项目患者 (projects.ProjectPatient)
- project: 关联项目
- patient: 关联患者
- added_at: 添加时间

### 牙位图 (imaging.DentalChart)
- patient: 关联患者（一对一）
- chart_data: JSON 数据
- created_at/updated_at: 时间戳

### 影像资料 (imaging.ImagingFile)
- patient: 关联患者
- file_name: 文件名
- file_path: 存储路径
- file_size: 文件大小
- uploaded_at: 上传日期

## 技术栈

- Django 6.0
- Django REST Framework
- django-cors-headers
- SQLite (开发) / PostgreSQL (生产)

## 目录结构

```
backend/
├── manage.py
├── requirements.txt
├── backend/           # 项目配置
├── users/             # 用户管理
├── projects/          # 科研项目
├── patients/          # 患者管理
└── imaging/           # 影像资料
```
