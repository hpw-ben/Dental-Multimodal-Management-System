/**
 * 认证相关 API
 */
import { get, patch, post } from './client';

export type DashboardWidgetId =
  | 'metric_total_projects'
  | 'metric_total_patients'
  | 'metric_pending_patients'
  | 'metric_new_patients_month'
  | 'trend_chart'
  | 'distribution_chart'
  | 'quick_actions'
  | 'recent_activity';

export interface DashboardWidgetLayoutItem {
  id: DashboardWidgetId;
  x: number;
  y: number;
  w: number;
  h: number;
}

export interface DashboardLayout {
  version: 1;
  home: {
    widgets: DashboardWidgetLayoutItem[];
  };
}

export interface DashboardLayoutResponse {
  dashboard_layout: DashboardLayout;
}

export interface UpdateDashboardLayoutRequest {
  dashboard_layout: DashboardLayout;
}

export interface UpdateDashboardLayoutResponse {
  message: string;
  dashboard_layout: DashboardLayout;
}

export interface ResetDashboardLayoutResponse {
  message: string;
  dashboard_layout: DashboardLayout;
}

/**
 * 用户信息类型
 */
export interface User {
  id: number;
  username: string;
  email: string;
  role: 'admin' | 'doctor' | 'researcher';
  avatar: string | null;
  dashboard_layout?: DashboardLayout;
  is_active: boolean;
  date_joined: string;
}

/**
 * 登录请求参数
 */
export interface LoginRequest {
  email: string;
  password: string;
}

/**
 * 登录响应
 */
export interface LoginResponse {
  user: User;
  message: string;
}

/**
 * 登出响应
 */
export interface LogoutResponse {
  message: string;
}

/**
 * 用户登录
 */
export function loginApi(data: LoginRequest): Promise<LoginResponse> {
  return post<LoginResponse>('/users/login/', data);
}

/**
 * 用户登出
 */
export function logoutApi(): Promise<LogoutResponse> {
  return post<LogoutResponse>('/users/logout/');
}

/**
 * 获取当前用户信息
 */
export function getMeApi(): Promise<User> {
  return get<User>('/users/me/');
}

/**
 * 获取当前用户首页布局
 */
export function getDashboardLayoutApi(): Promise<DashboardLayoutResponse> {
  return get<DashboardLayoutResponse>('/users/dashboard_layout/');
}

/**
 * 保存当前用户首页布局
 */
export function updateDashboardLayoutApi(
  data: UpdateDashboardLayoutRequest
): Promise<UpdateDashboardLayoutResponse> {
  return patch<UpdateDashboardLayoutResponse>('/users/update_dashboard_layout/', data);
}

/**
 * 恢复当前用户推荐布局
 */
export function resetDashboardLayoutApi(): Promise<ResetDashboardLayoutResponse> {
  return post<ResetDashboardLayoutResponse>('/users/reset_dashboard_layout/');
}

/**
 * 发送找回密码验证码
 */
export interface SendResetCodeRequest {
  email: string;
}

export interface SendResetCodeResponse {
  message: string;
  expires_in: number;
}

export function sendResetCodeApi(data: SendResetCodeRequest): Promise<SendResetCodeResponse> {
  return post<SendResetCodeResponse>('/users/send_reset_code/', data);
}

/**
 * 通过验证码重置密码
 */
export interface ResetPasswordRequest {
  email: string;
  code: string;
  new_password: string;
  new_password_confirm: string;
}

export interface ResetPasswordResponse {
  message: string;
}

export function resetPasswordApi(data: ResetPasswordRequest): Promise<ResetPasswordResponse> {
  return post<ResetPasswordResponse>('/users/reset_password/', data);
}

/**
 * 新用户通过令牌设置密码
 */
export interface SetPasswordRequest {
  token: string;
  password: string;
  password_confirm: string;
}

export interface SetPasswordResponse {
  message: string;
  user: User;
}

export function setPasswordApi(data: SetPasswordRequest): Promise<SetPasswordResponse> {
  return post<SetPasswordResponse>('/users/set_password/', data);
}
