# REST API 文档

## 基础 URL

```
http://127.0.0.1:8000/api/
```

## 认证

使用 Django Session 认证。需要先登录才能访问大部分 API。

## API 端点

### 用户相关 (Users)

#### 登录
```
POST /api/users/login/
```
**请求体:**
```json
{
  "email": "admin@rdms.com",
  "password": "your_password"
}
```

#### 登出
```
POST /api/users/logout/
```

#### 获取当前用户信息
```
GET /api/users/me/
```

#### 用户列表
```
GET /api/users/
```

#### 创建用户
```
POST /api/users/
```
**请求体:**
```json
{
  "username": "zhangsan",
  "email": "zhangsan@example.com",
  "password": "secure123",
  "password_confirm": "secure123",
  "role": "doctor"
}
```

#### 修改密码
```
POST /api/users/{id}/change_password/
```
**请求体:**
```json
{
  "old_password": "old123",
  "new_password": "new456",
  "new_password_confirm": "new456"
}
```

---

### 患者相关 (Patients)

#### 患者列表
```
GET /api/patients/
```
**查询参数:**
- `search`: 搜索姓名或病案号
- `gender`: 过滤性别 (Male/Female)
- `status`: 过滤状态 (已确认/待确认)
- `ordering`: 排序字段 (created_at, birth_date, name)

示例:
```
GET /api/patients/?search=李&status=已确认&ordering=-created_at
```

#### 获取单个患者
```
GET /api/patients/{id}/
```

#### 创建患者
```
POST /api/patients/
```
**请求体:**
```json
{
  "name": "李明",
  "case_number": "20240101",
  "gender": "Male",
  "birth_date": "1990-05-20",
  "status": "待确认"
}
```

#### 更新患者
```
PUT /api/patients/{id}/
PATCH /api/patients/{id}/
```

#### 删除患者
```
DELETE /api/patients/{id}/
```

---

### 就诊记录 (Visit Records)

#### 就诊记录列表
```
GET /api/visit-records/
```
**查询参数:**
- `patient`: 过滤患者ID

#### 创建就诊记录
```
POST /api/visit-records/
```
**请求体:**
```json
{
  "patient": "患者UUID",
  "visit_date": "2024-10-20",
  "treatment_stage": "初诊",
  "visit_notes": "患者主诉牙龈出血，检查发现牙周袋深度3-5mm，建议牙周洁治"
}
```

---

### 科研项目 (Projects)

#### 项目列表
```
GET /api/projects/
```
**查询参数:**
- `search`: 搜索标题或描述
- `status`: 过滤状态 (Active/Completed/Planning)

#### 获取单个项目
```
GET /api/projects/{id}/
```

#### 创建项目
```
POST /api/projects/
```
**请求体:**
```json
{
  "title": "口腔微生物研究",
  "description": "研究牙周炎与微生物的关系",
  "status": "Active",
  "member_ids": [1, 2, 3]
}
```

#### 添加项目成员
```
POST /api/projects/{id}/add_member/
```
**请求体:**
```json
{
  "user_id": 1
}
```

#### 移除项目成员
```
POST /api/projects/{id}/remove_member/
```
**请求体:**
```json
{
  "user_id": 1
}
```

#### 添加项目患者
```
POST /api/projects/{id}/add_patient/
```
**请求体:**
```json
{
  "patient_id": "患者UUID"
}
```

#### 移除项目患者
```
POST /api/projects/{id}/remove_patient/
```
**请求体:**
```json
{
  "patient_id": "患者UUID"
}
```

---

### 牙位图 (Dental Charts)

#### 获取患者牙位图
```
GET /api/dental-charts/by_patient/?patient_id={患者UUID}
```

#### 创建/更新牙位图
```
POST /api/dental-charts/
PUT /api/dental-charts/{id}/
```
**请求体:**
```json
{
  "patient": "患者UUID",
  "chart_data": {
    "11": {
      "O": {"color": "#ef4444", "symbol": ""},
      "M": {"color": "", "symbol": "C"}
    }
  }
}
```

---

### 影像文件 (Imaging Files)

#### 影像文件列表
```
GET /api/imaging-files/
```
**查询参数:**
- `patient`: 过滤患者ID

#### 上传影像文件
```
POST /api/imaging-files/
```
**请求体 (multipart/form-data):**
- `patient`: 患者UUID
- `file_name`: 文件名
- `file_path`: 文件 (File)

---

## 响应格式

### 成功响应
```json
{
  "id": "uuid",
  "name": "张三",
  ...
}
```

### 列表响应 (带分页)
```json
{
  "count": 100,
  "next": "http://...",
  "previous": null,
  "results": [...]
}
```

### 错误响应
```json
{
  "detail": "错误信息"
}
```

## 状态码

- `200 OK`: 成功
- `201 Created`: 创建成功
- `204 No Content`: 删除成功
- `400 Bad Request`: 请求参数错误
- `401 Unauthorized`: 未认证
- `403 Forbidden`: 无权限
- `404 Not Found`: 资源不存在
- `500 Internal Server Error`: 服务器错误

## 测试工具

推荐使用以下工具测试 API：

1. **DRF Browsable API**: http://127.0.0.1:8000/api/
2. **Postman**
3. **curl**

### curl 示例

```bash
# 登录
curl -X POST http://127.0.0.1:8000/api/users/login/ \
  -H "Content-Type: application/json" \
  -d '{"email":"admin@rdms.com","password":"admin123"}' \
  -c cookies.txt

# 获取患者列表
curl -X GET http://127.0.0.1:8000/api/patients/ \
  -b cookies.txt

# 创建患者
curl -X POST http://127.0.0.1:8000/api/patients/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"name":"张三","case_number":"20240201","gender":"Male","birth_date":"1985-03-15","status":"待确认"}'
```

---

### 患者标注相关 (Annotations)

#### 获取患者的所有标记
```
GET /api/annotations/?patient=<patient_id>
```
**查询参数:**
- `patient` (必填): 患者ID

**响应示例:**
```json
[
  {
    "id": "uuid",
    "patient": "patient_uuid",
    "patient_name": "张三",
    "content": "患者影像显示异常，疑似根尖周炎",
    "created_by": 1,
    "created_by_name": "李医生",
    "created_by_role": "doctor",
    "created_at": "2024-02-01T10:30:00Z",
    "replies": [
      {
        "id": "reply_uuid",
        "content": "建议进一步拍摄CBCT确认",
        "created_by": 2,
        "created_by_name": "王研究员",
        "created_by_role": "researcher",
        "created_at": "2024-02-01T14:20:00Z"
      }
    ],
    "reply_count": 1
  }
]
```

#### 创建患者标记
```
POST /api/annotations/
```
**请求体:**
```json
{
  "patient": "patient_uuid",
  "content": "发现异常情况..."
}
```
**注意:** `created_by` 字段会自动设置为当前登录用户

#### 删除患者标记
```
DELETE /api/annotations/<annotation_id>/
```
**说明:** 删除标记时会级联删除该标记下的所有回复

#### 为标记添加回复
```
POST /api/annotations/<annotation_id>/add-reply/
```
**请求体:**
```json
{
  "content": "这是我的回复内容"
}
```
**响应示例:**
```json
{
  "id": "reply_uuid",
  "annotation": "annotation_uuid",
  "content": "这是我的回复内容",
  "created_by": 2,
  "created_by_name": "王研究员",
  "created_by_role": "researcher",
  "created_at": "2024-02-01T14:20:00Z"
}
```

**测试示例:**
```bash
# 创建标记
curl -X POST http://127.0.0.1:8000/api/annotations/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"patient":"patient_uuid","content":"发现异常情况"}'

# 获取某患者的所有标记
curl -X GET "http://127.0.0.1:8000/api/annotations/?patient=patient_uuid" \
  -b cookies.txt

# 添加回复
curl -X POST http://127.0.0.1:8000/api/annotations/annotation_uuid/add-reply/ \
  -H "Content-Type: application/json" \
  -b cookies.txt \
  -d '{"content":"这是回复内容"}'

# 删除标记（会级联删除所有回复）
curl -X DELETE http://127.0.0.1:8000/api/annotations/annotation_uuid/ \
  -b cookies.txt
```

