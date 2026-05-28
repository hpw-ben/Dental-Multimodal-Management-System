/**
 * 患者相关 API
 */
import { get, post, del, patch } from './client';

/**
 * 患者列表项
 */
export interface PatientListItem {
  id: string;
  name: string;
  case_number: string;
  gender: 'Male' | 'Female';
  birth_date: string;
  created_at: string;
  status: '已确认' | '待确认';
  clinical_diagnosis: string;
  age: number;
  last_visit: string;
  completeness_score: number;  // 新增：完整度评分 0-100
}

/**
 * 就诊记录
 */
export interface VisitRecord {
  id: number;
  patient: string;
  visit_date: string;
  treatment_stage: string;
  clinical_diagnosis: string;
}

/**
 * 患者详情
 */
export interface Patient {
  id: string;
  name: string;
  case_number: string;
  gender: 'Male' | 'Female';
  birth_date: string;
  created_at: string;
  status: '已确认' | '待确认';
  clinical_diagnosis: string;
  age: number;
  visit_records: VisitRecord[];
}

/**
 * 创建/更新患者请求
 */
export interface PatientRequest {
  name: string;
  case_number: string;
  gender: 'Male' | 'Female';
  birth_date: string;
  status?: '已确认' | '待确认';
  clinical_diagnosis?: string;
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
 * 获取患者列表
 */
export function getPatientsApi(params?: {
  search?: string;
  status?: string;
  gender?: string;
  diagnosis?: string;
  min_age?: number;
  max_age?: number;
  page?: number;
}): Promise<PaginatedResponse<PatientListItem>> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.status) searchParams.append('status', params.status);
  if (params?.gender) searchParams.append('gender', params.gender);
  if (params?.diagnosis) searchParams.append('diagnosis', params.diagnosis);
  if (params?.min_age) searchParams.append('min_age', params.min_age.toString());
  if (params?.max_age) searchParams.append('max_age', params.max_age.toString());
  if (params?.page) searchParams.append('page', params.page.toString());
  
  const query = searchParams.toString();
  return get<PaginatedResponse<PatientListItem>>(`/patients/${query ? `?${query}` : ''}`);
}

/**
 * 获取患者详情
 */
export function getPatientApi(id: string): Promise<Patient> {
  return get<Patient>(`/patients/${id}/`);
}

/**
 * 创建患者
 */
export function createPatientApi(data: PatientRequest): Promise<Patient> {
  return post<Patient>('/patients/', data);
}

/**
 * 更新患者
 */
export function updatePatientApi(id: string, data: Partial<PatientRequest>): Promise<Patient> {
  return patch<Patient>(`/patients/${id}/`, data);
}

/**
 * 删除患者
 */
export function deletePatientApi(id: string): Promise<void> {
  return del<void>(`/patients/${id}/`);
}
