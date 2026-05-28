/**
 * API 客户端
 * 封装 fetch 请求，统一处理跨域 Cookie、CSRF Token、错误响应等
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000/api';

/**
 * API 错误类
 */
export class ApiError extends Error {
  status: number;
  data: unknown;

  constructor(message: string, status: number, data?: unknown) {
    super(message);
    this.name = 'ApiError';
    this.status = status;
    this.data = data;
  }
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
 * 获取 CSRF Token（如果本地没有则从服务器获取）
 */
async function ensureCsrfToken(): Promise<string | null> {
  let token = getCsrfToken();
  
  if (!token) {
    // 从服务器获取 CSRF token
    try {
      const response = await fetch(`${API_BASE_URL}/users/csrf_token/`, {
        method: 'GET',
        credentials: 'include',
      });
      if (response.ok) {
        token = getCsrfToken();
      }
    } catch {
      // 忽略错误，继续请求
    }
  }
  
  return token;
}

type RequestOptions = {
  method?: 'GET' | 'POST' | 'PUT' | 'PATCH' | 'DELETE';
  body?: unknown;
  headers?: Record<string, string>;
};

/**
 * 通用 API 请求函数
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { method = 'GET', body, headers = {} } = options;

  // 获取 CSRF Token（用于非 GET 请求）
  let csrfToken: string | null = null;
  if (method !== 'GET') {
    csrfToken = await ensureCsrfToken();
  }

  const config: RequestInit = {
    method,
    credentials: 'include', // 携带 Cookie (Django Session)
    headers: {
      'Content-Type': 'application/json',
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
      ...headers,
    },
  };

  if (body) {
    config.body = JSON.stringify(body);
  }

  const url = `${API_BASE_URL}${endpoint}`;
  const response = await fetch(url, config);

  // 处理非 JSON 响应（如 204 No Content）
  if (response.status === 204) {
    return {} as T;
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let errorMessage = '请求失败';
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.detail === 'string') {
        errorMessage = obj.detail;
      } else if (typeof obj.message === 'string') {
        errorMessage = obj.message;
      } else {
        // DRF 字段级别验证错误，如 {"password":["这个密码太常见了。"]}
        const fieldErrors: string[] = [];
        for (const [, value] of Object.entries(obj)) {
          if (Array.isArray(value)) {
            fieldErrors.push(...value.map(String));
          } else if (typeof value === 'string') {
            fieldErrors.push(value);
          }
        }
        if (fieldErrors.length > 0) {
          errorMessage = fieldErrors.join('；');
        }
      }
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}

/**
 * GET 请求
 */
export function get<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'GET', headers });
}

/**
 * POST 请求
 */
export function post<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'POST', body, headers });
}

/**
 * PUT 请求
 */
export function put<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'PUT', body, headers });
}

/**
 * PATCH 请求
 */
export function patch<T>(endpoint: string, body?: unknown, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'PATCH', body, headers });
}

/**
 * DELETE 请求
 */
export function del<T>(endpoint: string, headers?: Record<string, string>): Promise<T> {
  return apiRequest<T>(endpoint, { method: 'DELETE', headers });
}

/**
 * 文件上传请求（使用 FormData）
 */
export async function upload<T>(endpoint: string, formData: FormData): Promise<T> {
  const csrfToken = await ensureCsrfToken();

  const response = await fetch(`${API_BASE_URL}${endpoint}`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      ...(csrfToken ? { 'X-CSRFToken': csrfToken } : {}),
    },
    body: formData,
  });

  let data: unknown;
  try {
    data = await response.json();
  } catch {
    data = null;
  }

  if (!response.ok) {
    let errorMessage = '上传失败';
    if (data && typeof data === 'object') {
      const obj = data as Record<string, unknown>;
      if (typeof obj.detail === 'string') {
        errorMessage = obj.detail;
      } else if (typeof obj.message === 'string') {
        errorMessage = obj.message;
      }
    }
    throw new ApiError(errorMessage, response.status, data);
  }

  return data as T;
}
