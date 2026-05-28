/**
 * 数据导出相关 API
 */

const API_BASE = process.env.NEXT_PUBLIC_API_BASE || 'http://localhost:8000/api';

/**
 * 从响应中提取文件名
 */
function getFilenameFromResponse(response: Response, fallback: string): string {
  const disposition = response.headers.get('Content-Disposition');
  if (disposition) {
    // 尝试解析 filename*=UTF-8''xxx
    const utf8Match = disposition.match(/filename\*=UTF-8''(.+)/i);
    if (utf8Match) {
      return decodeURIComponent(utf8Match[1]);
    }
    // 尝试解析 filename="xxx"
    const match = disposition.match(/filename="?(.+?)"?$/i);
    if (match) {
      return decodeURIComponent(match[1]);
    }
  }
  return fallback;
}

/**
 * 下载文件辅助函数
 */
function downloadFile(blob: Blob, filename: string): void {
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  window.URL.revokeObjectURL(url);
  document.body.removeChild(a);
}

/**
 * 获取 CSRF Token
 */
function getCsrfToken(): string {
  const match = document.cookie.match(/csrftoken=([^;]+)/);
  return match ? match[1] : '';
}

// ─────────────────── 患者列表 Excel 导出 ───────────────────

/**
 * 导出患者列表为 Excel
 * @param patientIds 可选，选中的患者ID列表。如果为空则导出全部
 */
export async function exportPatientsExcel(patientIds?: string[]): Promise<void> {
  const response = await fetch(`${API_BASE}/patients/export_excel/`, {
    method: 'POST',
    credentials: 'include',
    headers: {
      'Content-Type': 'application/json',
      'X-CSRFToken': getCsrfToken(),
    },
    body: JSON.stringify({
      patient_ids: patientIds || [],
    }),
  });

  if (!response.ok) {
    throw new Error(`导出失败: ${response.status}`);
  }

  const blob = await response.blob();
  const filename = getFilenameFromResponse(response, '患者列表.xlsx');
  downloadFile(blob, filename);
}

// ─────────────────── 课题数据集 ZIP 导出 ───────────────────

/**
 * 导出模式
 */
export type ExportMode = 'cases_only' | 'with_charts' | 'full';

/**
 * 导出参数
 */
export interface ExportDatasetParams {
  anonymize: boolean;
  exportMode: ExportMode;
  confirmedOnly: boolean;
  patientIds?: string[];  // 新增：选中的患者ID列表
}

/**
 * 导出课题数据集为 ZIP
 */
export async function exportProjectDataset(
  projectId: string,
  params: ExportDatasetParams,
): Promise<void> {
  const response = await fetch(
    `${API_BASE}/projects/${projectId}/export_dataset/`,
    {
      method: 'POST',
      credentials: 'include',
      headers: {
        'Content-Type': 'application/json',
        'X-CSRFToken': getCsrfToken(),
      },
      body: JSON.stringify({
        anonymize: params.anonymize,
        export_mode: params.exportMode,
        confirmed_only: params.confirmedOnly,
        patient_ids: params.patientIds || [],  // 新增：传递患者ID列表
      }),
    },
  );

  if (!response.ok) {
    const err = await response.json().catch(() => ({}));
    throw new Error(err.detail || `导出失败: ${response.status}`);
  }

  const blob = await response.blob();
  const filename = getFilenameFromResponse(response, '数据集.zip');
  downloadFile(blob, filename);
}
