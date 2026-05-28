/**
 * 就诊记录相关 API
 */
import { get, post, patch, del } from './client';

/**
 * 就诊记录数据结构
 */
export interface VisitRecord {
  id: string;
  patient: string;
  visit_date: string;
  visit_notes: string;
}

/**
 * 创建/更新就诊记录请求
 */
export interface VisitRecordRequest {
  patient: string;
  visit_date: string;
  visit_notes: string;
}

/**
 * 分页响应结构
 */
interface PaginatedResponse<T> {
  count: number;
  next: string | null;
  previous: string | null;
  results: T[];
}

/**
 * 获取患者的所有就诊记录
 */
export async function getVisitRecordsByPatientApi(patientId: string): Promise<VisitRecord[]> {
  const response = await get<PaginatedResponse<VisitRecord>>(`/visit-records/?patient=${patientId}`);
  return response.results || [];
}

/**
 * 创建就诊记录
 */
export function createVisitRecordApi(data: VisitRecordRequest): Promise<VisitRecord> {
  return post<VisitRecord>('/visit-records/', data);
}

/**
 * 更新就诊记录
 */
export function updateVisitRecordApi(id: string, data: Partial<VisitRecordRequest>): Promise<VisitRecord> {
  return patch<VisitRecord>(`/visit-records/${id}/`, data);
}

/**
 * 删除就诊记录
 */
export function deleteVisitRecordApi(id: string): Promise<void> {
  return del<void>(`/visit-records/${id}/`);
}

/**
 * 批量删除就诊记录
 */
export async function batchDeleteVisitRecordsApi(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => deleteVisitRecordApi(id)));
}
