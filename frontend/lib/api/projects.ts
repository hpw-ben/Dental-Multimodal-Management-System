/**
 * 课题（项目）相关 API
 */
import { get, post, del, patch } from './client';
import type { User } from './auth';

/**
 * 负责人/成员信息
 */
export interface ProjectMember {
  id: number;
  name: string;
  email: string;
  avatar: string | null;
}

/**
 * 项目列表项
 */
export interface ProjectListItem {
  id: string;
  title: string;
  description: string;
  created_at: string;
  patient_count: number;
  member_count: number;
  principal: ProjectMember | null;
}

/**
 * 项目成员详情
 */
export interface ProjectMemberDetail {
  id: number;
  project: string;
  user: number;
  user_detail: User;
  joined_at: string;
}

/**
 * 项目患者详情
 */
export interface ProjectPatientDetail {
  id: number;
  project: string;
  patient: string;
  patient_detail: {
    id: string;
    name: string;
    case_number: string;
    gender: string;
    birth_date: string;
    status: string;
    created_at: string;
    clinical_diagnosis: string;
    age: number;
    last_visit: string;
    completeness_score: number;  // 新增：完整度评分
  };
  added_at: string;
}

/**
 * 项目详情
 */
export interface Project {
  id: string;
  title: string;
  description: string;
  created_at: string;
  updated_at: string;
  projectmember_set: ProjectMemberDetail[];
  projectpatient_set: ProjectPatientDetail[];
  patient_count: number;
  member_count: number;
  principal: User | null;
}

/**
 * 创建项目请求
 */
export interface CreateProjectRequest {
  title: string;
  description: string;
  member_ids?: number[];
}

/**
 * 分页响应
 */
export interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * 获取项目列表
 */
export function getProjectsApi(params?: {
  search?: string;
  status?: string;
  page?: number;
}): Promise<PaginatedResponse<ProjectListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.page) searchParams.append('page', params.page.toString());
  
  const query = searchParams.toString();
  return get<PaginatedResponse<ProjectListItem>>(`/projects/${query ? `?${query}` : ''}`);
}

/**
 * 获取项目详情
 */
export function getProjectApi(id: string): Promise<Project> {
  return get<Project>(`/projects/${id}/`);
}

/**
 * 创建项目
 */
export function createProjectApi(data: CreateProjectRequest): Promise<Project> {
  return post<Project>('/projects/', data);
}

/**
 * 更新项目
 */
export function updateProjectApi(id: string, data: Partial<CreateProjectRequest>): Promise<Project> {
  return patch<Project>(`/projects/${id}/`, data);
}

/**
 * 删除项目
 */
export function deleteProjectApi(id: string): Promise<void> {
  return del<void>(`/projects/${id}/`);
}

/**
 * 添加项目成员
 */
export function addProjectMemberApi(projectId: string, userId: number): Promise<ProjectMemberDetail> {
  return post<ProjectMemberDetail>(`/projects/${projectId}/add_member/`, { user_id: userId });
}

/**
 * 移除项目成员
 */
export function removeProjectMemberApi(projectId: string, userId: number): Promise<{ message: string }> {
  return post<{ message: string }>(`/projects/${projectId}/remove_member/`, { user_id: userId });
}

/**
 * 添加项目患者
 */
export function addProjectPatientApi(projectId: string, patientId: string): Promise<ProjectPatientDetail> {
  return post<ProjectPatientDetail>(`/projects/${projectId}/add_patient/`, { patient_id: patientId });
}

/**
 * 移除项目患者
 */
export function removeProjectPatientApi(projectId: string, patientId: string): Promise<{ message: string }> {
  return post<{ message: string }>(`/projects/${projectId}/remove_patient/`, { patient_id: patientId });
}

/**
 * 批量添加患者到课题
 */
export function batchAddPatientsApi(projectId: string, patientIds: string[]): Promise<{ message: string; added: number; skipped: number }> {
  return post<{ message: string; added: number; skipped: number }>(`/projects/${projectId}/batch_add_patients/`, { patient_ids: patientIds });
}
