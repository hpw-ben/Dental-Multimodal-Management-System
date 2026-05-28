/**
 * 仪表盘相关 API
 */
import { get } from './client';

export interface TrendItem {
  month: string;
  count: number;
}

export interface DistributionItem {
  name: string;
  count: number;
}

export interface RecentActivity {
  action: string;
  model_name: string;
  description: string;
  created_at: string;
}

export interface DashboardData {
  metrics: {
    total_projects: number;
    total_patients: number;
    pending_patients: number;
    new_projects_this_month: number;
    new_patients_this_month: number;
    new_patients_today: number;
  };
  trend_data: TrendItem[];
  distribution_data: DistributionItem[];
  recent_activities: RecentActivity[];
}

/**
 * 获取仪表盘统计数据
 */
export function getDashboardApi(): Promise<DashboardData> {
  return get<DashboardData>('/dashboard/');
}
