/**
 * 用户相关 API
 */
import { get, post, patch, del, upload } from './client';
import type { User } from './auth';

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
 * 创建用户请求
 */
export interface CreateUserRequest {
  username: string;
  email: string;
  role: 'admin' | 'doctor' | 'researcher';
}

/**
 * 创建用户响应
 */
export interface CreateUserResponse {
  user: User;
  message: string;
  activation_link: string;
}

/**
 * 更新用户请求
 */
export interface UpdateUserRequest {
  username?: string;
  email?: string;
  role?: 'admin' | 'doctor' | 'researcher';
  is_active?: boolean;
}

/**
 * 获取用户列表
 */
export function getUsersApi(params?: {
  search?: string;
  role?: string;
  page?: number;
}): Promise<PaginatedResponse<User>> {
  const searchParams = new URLSearchParams();
  if (params?.search) searchParams.append('search', params.search);
  if (params?.role) searchParams.append('role', params.role);
  if (params?.page) searchParams.append('page', params.page.toString());
  
  const query = searchParams.toString();
  return get<PaginatedResponse<User>>(`/users/${query ? `?${query}` : ''}`);
}

/**
 * 创建用户
 */
export function createUserApi(data: CreateUserRequest): Promise<CreateUserResponse> {
  return post<CreateUserResponse>('/users/', data);
}

/**
 * 更新用户
 */
export function updateUserApi(userId: number, data: UpdateUserRequest): Promise<User> {
  return patch<User>(`/users/${userId}/`, data);
}

export interface RequestUserEmailChangeRequest {
  new_email: string;
}

export function requestUserEmailChangeApi(userId: number, data: RequestUserEmailChangeRequest): Promise<{ message: string }> {
  return post<{ message: string }>(`/users/${userId}/request_email_change_for_user/`, data);
}

/**
 * 删除用户
 */
export function deleteUserApi(userId: number): Promise<void> {
  return del<void>(`/users/${userId}/`);
}

/**
 * 管理员发送用户重置密码链接
 */
export function resetUserPasswordApi(userId: number): Promise<{ message: string; reset_link: string }> {
  return post<{ message: string; reset_link: string }>(`/users/${userId}/send_password_reset_link/`);
}

/**
 * 修改密码请求
 */
export interface ChangePasswordRequest {
  old_password: string;
  new_password: string;
}

/**
 * 修改密码
 */
export function changePasswordApi(userId: number, data: ChangePasswordRequest): Promise<{ message: string }> {
  return post<{ message: string }>(`/users/${userId}/change_password/`, data);
}

/**
 * 请求修改邮箱（发送确认链接到新邮箱）
 */
export interface ChangeEmailRequest {
  new_email: string;
}

export function changeEmailApi(data: ChangeEmailRequest): Promise<{ message: string }> {
  return post<{ message: string }>('/users/request_email_change/', data);
}

/**
 * 确认邮箱变更（新邮箱点击确认链接）
 */
export function confirmEmailChangeApi(token: string): Promise<{ message: string }> {
  return post<{ message: string }>('/users/confirm_email_change/', { token });
}

/**
 * 撤销邮箱变更（旧邮箱点击回退链接）
 */
export function revertEmailChangeApi(token: string): Promise<{ message: string }> {
  return post<{ message: string }>('/users/revert_email_change/', { token });
}

/**
 * 上传头像
 */
export function uploadAvatarApi(file: File): Promise<{ message: string; avatar: string }> {
  const formData = new FormData();
  formData.append('avatar', file);
  return upload<{ message: string; avatar: string }>('/users/upload_avatar/', formData);
}

/**
 * 注销账户（删除账户）
 */
export function deactivateAccountApi(userId: number): Promise<void> {
  return del<void>(`/users/${userId}/`);
}
