/**
 * 影像文件相关 API
 */
import { get, del } from './client';

/**
 * 影像文件数据结构
 */
export interface ImagingFile {
  id: string;
  patient: string;
  patient_name: string;
  file_name: string;
  file_path: string;
  file_url: string | null;
  file_size: number;
  file_size_mb: number;
  series_name: string;
  uploaded_at: string;
}

/**
 * 获取患者的所有影像文件
 */
export async function getImagingFilesByPatientApi(patientId: string): Promise<ImagingFile[]> {
  // 后端已禁用分页，直接返回数组
  const response = await get<ImagingFile[]>(`/imaging-files/?patient=${patientId}`);
  return response;
}

/**
 * 从 cookie 中获取 CSRF Token
 */
function getCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  
  const cookies = document.cookie.split(';');
  for (const cookie of cookies) {
    const [name, value] = cookie.trim().split('=');
    if (name === 'csrftoken') {
      return value;
    }
  }
  return null;
}

/**
 * 上传影像文件
 */
export async function uploadImagingFileApi(
  patientId: string,
  file: File,
  seriesName?: string
): Promise<ImagingFile> {
  const formData = new FormData();
  formData.append('patient', patientId);
  formData.append('file_name', file.name);
  formData.append('file_path', file);
  if (seriesName) {
    formData.append('series_name', seriesName);
  }

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const csrfToken = getCsrfToken();
  
  const headers: Record<string, string> = {};
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }
  
  // 使用 fetch 发送 multipart/form-data 请求
  const response = await fetch(`${API_BASE_URL}/imaging-files/`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '上传失败' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}

/**
 * 删除影像文件
 */
export function deleteImagingFileApi(id: string): Promise<void> {
  return del<void>(`/imaging-files/${id}/`);
}

/**
 * 批量删除影像文件
 */
export async function batchDeleteImagingFilesApi(ids: string[]): Promise<void> {
  await Promise.all(ids.map(id => deleteImagingFileApi(id)));
}

/**
 * 上传压缩包（后端解压）
 */
export async function uploadZipApi(
  patientId: string,
  zipFile: File
): Promise<{ created: number; skipped: number; files: ImagingFile[] }> {
  const formData = new FormData();
  formData.append('patient_id', patientId);
  formData.append('file', zipFile);

  const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';
  const csrfToken = getCsrfToken();

  const headers: Record<string, string> = {};
  if (csrfToken) {
    headers['X-CSRFToken'] = csrfToken;
  }

  const response = await fetch(`${API_BASE_URL}/imaging-files/upload-zip/`, {
    method: 'POST',
    body: formData,
    credentials: 'include',
    headers,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ detail: '上传失败' }));
    throw new Error(error.detail || `HTTP ${response.status}`);
  }

  return response.json();
}
