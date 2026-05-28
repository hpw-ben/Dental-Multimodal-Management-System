/**
 * 牙位图相关 API
 */
import { get, post, patch } from './client';

/**
 * 牙齿表面治疗数据
 */
export interface TreatmentData {
  color?: string;
  symbol?: string;
}

/**
 * 牙齿状态数据（各个表面的治疗数据）
 */
export type ToothState = Record<string, TreatmentData>;

/**
 * 牙位图 JSON 数据：键是牙位编号（如 "16", "22"），值是该牙齿的状态
 */
export type ChartData = Record<string, ToothState>;

/**
 * 牙位图数据结构
 */
export interface DentalChartData {
  id: string;
  patient: string;
  patient_name: string;
  chart_data: ChartData;
  created_at: string;
  updated_at: string;
}

/**
 * 创建/更新牙位图请求
 */
export interface DentalChartRequest {
  patient: string;
  chart_data: ChartData;
}

/**
 * 根据患者ID获取牙位图
 */
export function getDentalChartByPatientApi(patientId: string): Promise<DentalChartData> {
  return get<DentalChartData>(`/dental-charts/by_patient/?patient_id=${patientId}`);
}

/**
 * 创建牙位图
 */
export function createDentalChartApi(data: DentalChartRequest): Promise<DentalChartData> {
  return post<DentalChartData>('/dental-charts/', data);
}

/**
 * 更新牙位图
 */
export function updateDentalChartApi(id: string, data: Partial<DentalChartRequest>): Promise<DentalChartData> {
  return patch<DentalChartData>(`/dental-charts/${id}/`, data);
}

/**
 * 保存牙位图（自动判断创建或更新）
 */
export async function saveDentalChartApi(
  patientId: string,
  chartData: ChartData
): Promise<DentalChartData> {
  try {
    // 先尝试获取现有牙位图
    const existingChart = await getDentalChartByPatientApi(patientId);
    // 存在则更新
    return await updateDentalChartApi(existingChart.id, { chart_data: chartData });
  } catch (error: unknown) {
    // 检查是否是 ApiError 且状态码为 404
    if (error && typeof error === 'object' && 'status' in error) {
      const apiError = error as { status: number };
      if (apiError.status === 404) {
        // 不存在则创建
        return await createDentalChartApi({
          patient: patientId,
          chart_data: chartData,
        });
      }
    }
    // 其他错误继续抛出
    throw error;
  }
}
